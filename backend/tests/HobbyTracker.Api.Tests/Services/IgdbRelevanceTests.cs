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
        // IGDB returns these in this order. The fan game wins its relevance because its title is
        // the exact string typed; nothing about the title can separate them.
        var order = Rank(
            "Hollow Knight Silksong",
            Game(372563, "Hollow Knight Silksong"),
            Game(115289, "Hollow Knight: Silksong", ratings: 502, hypes: 220));

        order.ShouldBe(["Hollow Knight: Silksong", "Hollow Knight Silksong"]);
    }

    [Fact]
    public void Counts_wanting_to_play_something_as_evidence_it_is_real()
    {
        // An unreleased game has no ratings by definition. Silksong sat at 220 hypes and zero
        // ratings for years, which is exactly the window in which it was most searched for.
        IgdbRelevance
            .Rank("Silksong", [Game(1, "Silksong"), Game(2, "Silksong", hypes: 220)])
            .Select(game => game.Id)
            .ShouldBe([2, 1]);
    }

    [Fact]
    public void Does_not_let_an_exact_title_nobody_has_rated_come_first()
    {
        // Why popularity leads rather than breaks ties. There really is a game called just
        // "Zelda", with no ratings at all; ordering on title first put it above The Legend of
        // Zelda, which is the fan-game problem wearing a hat.
        var order = Rank(
            "Zelda",
            Game(1, "Zelda"),
            Game(2, "The Legend of Zelda", ratings: 734));

        order.ShouldBe(["The Legend of Zelda", "Zelda"]);
    }

    [Fact]
    public void Finds_a_game_whose_title_holds_none_of_what_was_typed()
    {
        // "botw" is in none of these titles. IGDB matched Breath of the Wild on an alternative
        // name, which is knowledge the title cannot show and this rule cannot reconstruct — so
        // nothing here may demote a result for failing a string test. An earlier version had
        // exactly that floor, and buried this behind Botworld Odyssey.
        var order = Rank(
            "botw",
            Game(1, "The Legend of Zelda: Breath of the Wild", ratings: 3118),
            Game(2, "Botworld Odyssey", ratings: 1),
            Game(3, "Botworld Adventure"));

        order.ShouldBe(
            ["The Legend of Zelda: Breath of the Wild", "Botworld Odyssey", "Botworld Adventure"]);
    }

    [Fact]
    public void Does_not_promote_igdbs_first_pick_over_a_far_more_played_sibling()
    {
        // The other half of the same lesson. Exempting IGDB's top result from that floor was
        // tried, and put the Special Edition above the game itself — sixty times the ratings,
        // and neither title contains "gta v".
        var order = Rank(
            "gta v",
            Game(1, "Grand Theft Auto V: Special Edition", ratings: 85),
            Game(2, "Grand Theft Auto V", ratings: 5916));

        order.ShouldBe(["Grand Theft Auto V", "Grand Theft Auto V: Special Edition"]);
    }

    [Fact]
    public void Orders_the_long_tail_by_title_because_none_of_it_has_ratings()
    {
        // What the tie-break is actually for. Nearly every result past the first few has no
        // ratings at all, so this is what stops the rest of a search reading as random.
        var order = Rank(
            "Celeste",
            Game(206229, "The Mystery of the Mary Celeste"),
            Game(76427, "Celeste Witch"),
            Game(383293, "Celeste"));

        order.ShouldBe(["Celeste", "Celeste Witch", "The Mystery of the Mary Celeste"]);
    }

    [Fact]
    public void Reads_a_colon_and_a_space_as_the_same_title()
    {
        // Punctuation is flattened before titles are compared, so an exact match still reads as
        // one when it is punctuated differently. Without it "Celeste!" is merely a title starting
        // with "celeste", ties with Celeste Witch, and loses that tie to IGDB's order.
        var order = Rank(
            "celeste",
            Game(1, "Celeste Witch"),
            Game(2, "Celeste!"));

        order.ShouldBe(["Celeste!", "Celeste Witch"]);
    }

    [Fact]
    public void Leaves_igdbs_order_alone_when_nothing_separates_two_results()
    {
        // The sort is stable on purpose. Relevance ordering is the entire value of an APIcalypse
        // search, so where this rule has nothing to say it says nothing.
        var order = Rank(
            "second",
            Game(200, "Beta"),
            Game(100, "Alpha"));

        order.ShouldBe(["Beta", "Alpha"]);
    }

    [Fact]
    public void Ranks_nothing_when_there_is_nothing_to_rank()
    {
        IgdbRelevance.Rank("anything", []).ShouldBeEmpty();
    }
}
