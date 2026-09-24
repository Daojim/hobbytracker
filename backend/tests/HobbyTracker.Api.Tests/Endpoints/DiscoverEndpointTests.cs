using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The Discover page's lists: what IGDB would show somebody who has not typed anything.
///
/// A list is a search nobody typed. It upserts exactly as a search does, so a tile carries a
/// media id a log entry can point at, and adding from the wall is the same request as adding from
/// the strip. Two differences are worth their tests: IGDB is asked once a day for each list rather
/// than on every view, and what is kept between views is IGDB's answer, never the rows.
///
/// The stopped clock reads 15 September 2026.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class DiscoverEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task A_list_needs_a_session()
    {
        var response = await AnonymousClient.GetAsync("/api/games/discover/new-releases", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("trending")]
    [InlineData("NewReleases")]
    public async Task A_list_that_does_not_exist_is_not_found(string list)
    {
        var response = await Client.GetAsync($"/api/games/discover/{list}", Ct);

        // A path naming nothing, so a 404 rather than the 400 a bad query parameter gets — and
        // IGDB is not asked about it.
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        Igdb.DiscoverCalls.ShouldBeEmpty();
    }

    [Theory]
    [InlineData("new-releases", nameof(FakeIgdbClient.NewReleases))]
    [InlineData("popular-now", nameof(FakeIgdbClient.PlayingNow))]
    [InlineData("most-anticipated", nameof(FakeIgdbClient.Anticipated))]
    [InlineData("most-played", nameof(FakeIgdbClient.MostRated))]
    public async Task Each_list_asks_igdb_its_own_question(string list, string question)
    {
        await DiscoverAsync(list);

        Igdb.DiscoverCalls.ShouldHaveSingleItem().List.ShouldBe(question);
    }

    [Fact]
    public async Task Returns_a_list_in_igdbs_order()
    {
        Igdb.NewReleases =
        [
            FakeIgdbClient.Game(3, "Third"),
            FakeIgdbClient.Game(1, "First"),
            FakeIgdbClient.Game(2, "Second"),
        ];

        var games = await DiscoverAsync("new-releases");

        // The database has no idea this order exists, so reading the rows back in id order would
        // put whichever title happened to be stored first at the top of the wall.
        games.Select(game => game.Title).ShouldBe(["Third", "First", "Second"]);
    }

    [Fact]
    public async Task A_tile_carries_the_media_id_a_log_entry_points_at()
    {
        Igdb.NewReleases = [FakeIgdbClient.Game(740, "Halo: Combat Evolved")];

        var tile = (await DiscoverAsync("new-releases")).ShouldHaveSingleItem();

        // The same request adding from search sends. It only works because the list upserted the
        // title first, exactly as a search does.
        var added = await Client.PostAsJsonAsync(
            "/api/log-entries", new { mediaId = tile.Id, status = "Backlog" }, Ct);

        added.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Looking_at_a_list_twice_leaves_the_row_count_alone()
    {
        Igdb.NewReleases =
        [
            FakeIgdbClient.Game(740, "Halo: Combat Evolved"),
            FakeIgdbClient.Game(2640, "Halo: Anniversary"),
        ];

        await DiscoverAsync("new-releases");
        await DiscoverAsync("new-releases");

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(2);
    }

    [Fact]
    public async Task Asks_igdb_once_a_day_for_each_list()
    {
        await DiscoverAsync("new-releases");
        await DiscoverAsync("new-releases");
        await DiscoverAsync("most-played");

        // PopScore is recalculated once a day and the rest moves about as fast, so asking on every
        // view would spend IGDB's four requests a second on an answer already in hand.
        Igdb.DiscoverCalls.Select(call => call.List).ShouldBe(
            [nameof(FakeIgdbClient.NewReleases), nameof(FakeIgdbClient.MostRated)]);
    }

    [Fact]
    public async Task Asks_igdb_again_the_next_day()
    {
        await DiscoverAsync("new-releases");

        Clock.UtcNow = Clock.UtcNow.AddDays(1);
        await DiscoverAsync("new-releases");

        // New releases is a window that moves with the date, and whether a title is out changes
        // at midnight. Yesterday's answer is the wrong one today.
        Igdb.DiscoverCalls.Count.ShouldBe(2);
    }

    [Fact]
    public async Task New_releases_are_the_last_sixty_days()
    {
        await DiscoverAsync("new-releases");

        var call = Igdb.DiscoverCalls.ShouldHaveSingleItem();
        call.Until.ShouldBe(Clock.UtcNow);
        call.Since.ShouldBe(Clock.UtcNow.AddDays(-60));
    }

    [Fact]
    public async Task A_cached_list_still_hands_out_media_ids_that_exist()
    {
        Igdb.NewReleases = [FakeIgdbClient.Game(740, "Halo: Combat Evolved")];
        await DiscoverAsync("new-releases");

        // What the end-to-end suite does between specs while the API process lives on: every row
        // gone and the id sequence restarted. A cache that held the rows rather than IGDB's answer
        // would go on handing out media ids that name nothing — or, once the sequence came round
        // again, a different title.
        await WithDbAsync(db => db.Database.ExecuteSqlRawAsync(
            "TRUNCATE media RESTART IDENTITY CASCADE;", Ct));

        var tile = (await DiscoverAsync("new-releases")).ShouldHaveSingleItem();

        Igdb.DiscoverCalls.Count.ShouldBe(1);
        (await WithDbAsync(db => db.Media.SingleAsync(media => media.Id == tile.Id, Ct)))
            .Title.ShouldBe("Halo: Combat Evolved");
    }

    [Fact]
    public async Task Most_anticipated_holds_only_what_the_calendar_would_call_upcoming()
    {
        Igdb.Anticipated =
        [
            FakeIgdbClient.Game(1, "Silksong II", releaseDate: new DateOnly(2027, 3, 12), dateFormat: "YYYYMMDD"),

            // Playable already, so the board calls it out and adding it lands in Backlog rather than
            // on the calendar. Eight of the live list's top 60 were in alpha, beta or early access.
            FakeIgdbClient.Game(2, "Deadlock", gameStatus: "Beta"),

            // Never announced by anybody who would know. It was 32nd.
            FakeIgdbClient.Game(3, "Half-Life 3", gameStatus: "Rumored"),

            FakeIgdbClient.Game(4, "The Elder Scrolls VI"),
        ];

        var games = await DiscoverAsync("most-anticipated");

        // One expression owns "released", so every tile here offers the calendar and lands on it.
        games.Select(game => game.Title).ShouldBe(["Silksong II", "The Elder Scrolls VI"]);
        games.ShouldAllBe(game => !game.Released);

        // And what nobody could have seen was not written: search's rule, one row per result a
        // person could have seen.
        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(2);
    }

    [Theory]
    [InlineData("new-releases", 48)]
    [InlineData("most-played", 48)]
    [InlineData("popular-now", 96)]
    [InlineData("most-anticipated", 96)]
    public async Task Asks_for_twice_the_wall_only_where_titles_are_dropped_afterwards(
        string list, int asked)
    {
        await DiscoverAsync(list);

        // Popular now is filtered after PopScore has ranked it and Most anticipated after IGDB has
        // answered, so both ask for more than the wall holds and trim. The other two are filtered
        // inside the query, where IGDB applies the filter before the limit.
        Igdb.DiscoverCalls.ShouldHaveSingleItem().Limit.ShouldBe(asked);
    }

    [Fact]
    public async Task Trims_a_list_to_the_wall()
    {
        Igdb.PlayingNow = [.. Enumerable.Range(1, 96).Select(id => FakeIgdbClient.Game(id, $"Game {id}"))];

        (await DiscoverAsync("popular-now")).Count.ShouldBe(48);

        // Trimmed before the upsert, so the other 48 are not written anywhere.
        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(48);
    }

    [Fact]
    public async Task Reports_igdb_failure_as_502()
    {
        Igdb.ThrowOnNextCall = new IgdbException("IGDB /popularity_primitives returned 400: bad field");

        var response = await Client.GetAsync("/api/games/discover/popular-now", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadGateway);
    }

    [Fact]
    public async Task A_failure_is_not_remembered()
    {
        Igdb.ThrowOnNextCall = new IgdbException("IGDB did not respond within the configured timeout.");
        await Client.GetAsync("/api/games/discover/new-releases", Ct);

        Igdb.NewReleases = [FakeIgdbClient.Game(740, "Halo: Combat Evolved")];

        // Otherwise a bad afternoon at IGDB is an empty wall until tomorrow.
        (await DiscoverAsync("new-releases")).ShouldHaveSingleItem().Title.ShouldBe("Halo: Combat Evolved");
    }

    private async Task<List<GameDto>> DiscoverAsync(string list)
    {
        var response = await Client.GetAsync($"/api/games/discover/{list}", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return await ReadAsync<List<GameDto>>(response);
    }
}
