using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Hltb;
using HobbyTracker.Api.Services;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// Looking one title up on HowLongToBeat and writing down what came back.
///
/// The two routes are the point. A title nothing has matched yet is searched for and put through
/// the matcher; a title carrying an id is fetched by that id and never matched again, which is
/// what makes a match survive both an outage and a change to the matching rules.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class HltbServiceTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Writes_the_headline_and_all_three_tiers_and_the_id_it_matched()
    {
        var mediaId = await GivenGameAsync("Hollow Knight");
        Hltb.SetResults(
            "Hollow Knight",
            FakeHltbClient.Game(26286, "Hollow Knight", 2017, 27m, 41.59m, 65.6m, allStyles: 41.82m));

        (await UpdateAsync(mediaId)).ShouldBeTrue();

        var game = await GameAsync(mediaId);
        game.HltbId.ShouldBe(26286);
        // The card's number, and the sort's. Fetched rather than averaged from the three below.
        game.HltbAllStylesHours.ShouldBe(41.82m);
        game.HltbMainStoryHours.ShouldBe(27m);
        game.HltbMainExtraHours.ShouldBe(41.59m);
        game.HltbCompletionistHours.ShouldBe(65.6m);
        game.HltbCheckedAt.ShouldBe(Journal.Now);
    }

    [Fact]
    public async Task Records_that_it_asked_even_when_nothing_matched()
    {
        // The distinction the column exists for. Without a stamp on a miss, the backfill re-asks
        // about every unmatchable title on every run — and HowLongToBeat gets the traffic.
        var mediaId = await GivenGameAsync("Pokémon Scarlet");
        Hltb.SetResults(
            "Pokémon Scarlet",
            FakeHltbClient.Game(104683, "Pokémon Scarlet and Violet", 2022, 32.07m, 51.57m, 92.22m));

        (await UpdateAsync(mediaId)).ShouldBeFalse();

        var game = await GameAsync(mediaId);
        game.HltbCheckedAt.ShouldBe(Journal.Now);
        game.HltbId.ShouldBeNull();
        game.HltbMainStoryHours.ShouldBeNull();
    }

    [Fact]
    public async Task Fetches_a_pinned_title_by_its_id_and_never_searches()
    {
        // A stored match is not re-derived. It survives the matching rules changing underneath
        // it, and — since the by-id route needs no handshake — HowLongToBeat renaming its
        // search endpoint too.
        var mediaId = await GivenGameAsync("Pokémon Scarlet");
        await PinIdAsync(mediaId, 104683);
        Hltb.ById[104683] = FakeHltbClient.Game(
            104683, "Pokémon Scarlet and Violet", 2022, 32.07m, 51.57m, 92.22m);

        (await UpdateAsync(mediaId)).ShouldBeTrue();

        Hltb.Searches.ShouldBeEmpty();
        Hltb.Lookups.ShouldHaveSingleItem().ShouldBe(104683);
        (await GameAsync(mediaId)).HltbMainStoryHours.ShouldBe(32.07m);
    }

    [Fact]
    public async Task Keeps_what_it_had_when_howlongtobeat_forgets_a_pinned_id()
    {
        // An entry can be merged away or deleted. That is not a reason to throw away numbers
        // that were true when they were written.
        var mediaId = await GivenGameAsync("Some Game");
        await PinIdAsync(mediaId, 555, mainStory: 12.5m);

        (await UpdateAsync(mediaId)).ShouldBeFalse();

        var game = await GameAsync(mediaId);
        game.HltbMainStoryHours.ShouldBe(12.5m);
        game.HltbId.ShouldBe(555);
        game.HltbCheckedAt.ShouldBe(Journal.Now);
    }

    [Fact]
    public async Task Uses_the_release_year_to_tell_two_identical_titles_apart()
    {
        // The reason games.release_year exists. HowLongToBeat lists "Resident Evil 4" twice
        // under exactly that title; without a year both are refused rather than guessed at.
        var mediaId = await GivenGameAsync("Resident Evil 4");
        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            game.ReleaseYear = 2005;
            await db.SaveChangesAsync(Ct);
        });

        Hltb.SetResults(
            "Resident Evil 4",
            FakeHltbClient.Game(7720, "Resident Evil 4", 2005, 15.6m, 19.54m, 32.25m),
            FakeHltbClient.Game(108881, "Resident Evil 4", 2023, 16.18m, 21.65m, 64.63m));

        await UpdateAsync(mediaId);

        (await GameAsync(mediaId)).HltbId.ShouldBe(7720);
    }

    [Fact]
    public async Task Leaves_everything_igdb_owns_exactly_as_it_found_it()
    {
        var mediaId = await GivenGameAsync("Hollow Knight");
        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            game.Genres = ["Adventure", "Platform"];
            game.PrimaryGenre = "Platform";
            await db.SaveChangesAsync(Ct);
        });

        // A different title, so a service that wrote it back would be visibly caught.
        Hltb.SetResults(
            "Hollow Knight",
            FakeHltbClient.Game(26286, "Hollow Knight: Voidheart Edition", 2017, 27m, null, null,
                aliases: ["Hollow Knight"]));

        await UpdateAsync(mediaId);

        var game = await GameAsync(mediaId);
        game.Title.ShouldBe("Hollow Knight");
        game.Genres.ShouldBe(["Adventure", "Platform"]);
        game.PrimaryGenre.ShouldBe("Platform");
    }

    [Fact]
    public async Task Writes_the_tiers_it_was_given_and_leaves_the_rest_null()
    {
        // An obscure or unreleased title often has one number and no others. That is ordinary.
        var mediaId = await GivenGameAsync("Fire Emblem");
        Hltb.SetResults("Fire Emblem", FakeHltbClient.Game(174355, "Fire Emblem", 2026, 22m));

        await UpdateAsync(mediaId);

        var game = await GameAsync(mediaId);
        game.HltbMainStoryHours.ShouldBe(22m);
        game.HltbMainExtraHours.ShouldBeNull();
        game.HltbCompletionistHours.ShouldBeNull();
    }

    [Fact]
    public async Task Says_nothing_happened_for_a_media_id_that_is_not_a_game()
    {
        (await UpdateAsync(mediaId: 9999)).ShouldBeFalse();
        Hltb.Searches.ShouldBeEmpty();
    }

    // ----------------------------------------------------------------- helpers

    private async Task<bool> UpdateAsync(int mediaId) =>
        await WithScopeAsync(services =>
            services.GetRequiredService<IHltbService>().UpdateAsync(mediaId, Ct));

    private Task<Game> GameAsync(int mediaId) =>
        WithDbAsync(db => db.Games.AsNoTracking().SingleAsync(game => game.Id == mediaId, Ct));

    private Task PinIdAsync(int mediaId, int hltbId, decimal? mainStory = null) =>
        WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            game.HltbId = hltbId;
            game.HltbMainStoryHours = mainStory;
            await db.SaveChangesAsync(Ct);
        });
}
