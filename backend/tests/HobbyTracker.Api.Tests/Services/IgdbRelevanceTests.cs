using HobbyTracker.Api.Integrations.Igdb.Models;
using HobbyTracker.Api.Services;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// Ordering search results so the game you meant is the one at the top.
///
/// Every case here is real, taken off the live API while the rule was being written — the
/// numbers are IGDB's own. See <see cref="IgdbRelevance"/> for why this exists at all: IGDB
/// ranks a Game Boy Color fan game called "Hollow Knight Silksong" above Team Cherry's
/// "Hollow Knight: Silksong", because the fan game's title is the exact string and the real
/// one has a colon in it.
/// </summary>
public sealed class IgdbRelevanceTests
{
    private static IgdbGame Game(int id, string name, int? ratings = null, int? hypes = null) =>
        new() { Id = id, Name = name, TotalRatingCount = ratings, Hypes = hypes };

    private static IReadOnlyList<string> Rank(string search, params IgdbGame[] results) =>
        [.. IgdbRelevance.Rank(search, results).Select(game => game.Name!)];

    [Fact]
    public void Puts_the_game_people_have_actually_played_above_the_one_named_after_it()
    {
        // IGDB returns these in this order. The fan game wins its relevance because its title
        // is the exact string typed; nothing about the title can separate them.
        var order = Rank(
            "Hollow Knight Silksong",
            Game(372563, "Hollow Knight Silksong"),
            Game(115289, "Hollow Knight: Silksong", ratings: 502, hypes: 220));

        order.ShouldBe(["Hollow Knight: Silksong", "Hollow Knight Silksong"]);
    }

    [Fact]
    public void Reads_a_colon_and_a_space_as_the_same_title()
    {
        // This is the mechanism, not a detail. The two titles only become comparable — and so
        // only reach the tie-break that separates them — because punctuation is flattened
        // before they are compared. Leave it in and the fan game is the better match, for ever.
        var order = Rank(
            "hollow knight silksong",
            Game(1, "Hollow Knight - Silksong!", ratings: 0),
            Game(2, "Hollow Knight: Silksong", ratings: 502));

        order.ShouldBe(["Hollow Knight: Silksong", "Hollow Knight - Silksong!"]);
    }

    [Fact]
    public void Does_not_let_a_famous_game_bury_the_obscure_one_you_asked_for()
    {
        // The floor, and the failure mode of ranking on popularity alone. Celeste has 1465
        // ratings and Lani's Trek has none, but nobody typing "Celeste Classic 2" wanted
        // Celeste — and "celeste" does not contain "celeste classic 2", so it never competes.
        var order = Rank(
            "Celeste Classic 2",
            Game(26226, "Celeste", ratings: 1465),
            Game(142841, "Celeste Classic 2: Lani's Trek"));

        order.ShouldBe(["Celeste Classic 2: Lani's Trek", "Celeste"]);
    }

    [Fact]
    public void Prefers_the_whole_title_then_the_start_of_it_then_a_mention_of_it()
    {
        var order = Rank(
            "Celeste",
            Game(206229, "The Mystery of the Mary Celeste"),
            Game(76427, "Celeste Witch"),
            Game(26226, "Celeste", ratings: 1465));

        order.ShouldBe(["Celeste", "Celeste Witch", "The Mystery of the Mary Celeste"]);
    }

    [Fact]
    public void Does_not_let_an_exact_title_nobody_has_rated_come_first_either()
    {
        // The other half of the same bug, and the reason popularity is not merely a tie-break.
        // There really is a game called just "Zelda", with no ratings at all; ordering on title
        // first put it above The Legend of Zelda, which is the fan-game problem wearing a hat.
        var order = Rank(
            "Zelda",
            Game(1, "Zelda"),
            Game(2, "The Legend of Zelda", ratings: 734));

        order.ShouldBe(["The Legend of Zelda", "Zelda"]);
    }

    [Fact]
    public void Leaves_igdbs_order_alone_when_nothing_separates_two_results()
    {
        // The sort is stable on purpose. Relevance ordering is the entire value of an
        // APIcalypse search, so where this rule has nothing to say it says nothing — including
        // for the fuzzy matches that carry none of the typed words at all.
        var order = Rank(
            "second",
            Game(200, "Beta"),
            Game(100, "Alpha"));

        order.ShouldBe(["Beta", "Alpha"]);
    }

    [Fact]
    public void Counts_wanting_to_play_something_as_evidence_it_is_real()
    {
        // An unreleased game has no ratings by definition. Silksong sat at 220 hypes and zero
        // ratings for years, which is exactly the window in which it was most searched for.
        var order = Rank(
            "Silksong",
            Game(1, "Silksong"),
            Game(2, "Silksong", hypes: 220));

        order.ShouldBe(["Silksong", "Silksong"]);
        IgdbRelevance.Rank("Silksong", [Game(1, "Silksong"), Game(2, "Silksong", hypes: 220)])
            .Select(game => game.Id)
            .ShouldBe([2, 1]);
    }

    [Fact]
    public void Ranks_nothing_when_there_is_nothing_to_rank()
    {
        IgdbRelevance.Rank("anything", []).ShouldBeEmpty();
    }
}
