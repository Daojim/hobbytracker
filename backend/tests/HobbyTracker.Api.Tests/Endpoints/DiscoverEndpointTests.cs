using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Integrations.Igdb.Models;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The Discover page's lists: what IGDB would show somebody who has not typed anything.
///
/// A list is a search nobody typed. It upserts exactly as a search does, so a tile carries a
/// media id a log entry can point at, and adding from the wall is the same request as adding from
/// the strip. Two differences are worth their tests: IGDB is asked once a day for each page rather
/// than on every view, and what is kept between views is IGDB's answer, never the rows.
///
/// A list comes a page at a time, and each page says where the next one starts — a place in IGDB's
/// ordering, because two of the lists drop titles after IGDB has answered and a page number could
/// only multiply. The tests under <i>load more</i> are about that.
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

    [Fact]
    public async Task Most_anticipated_leaves_off_what_was_cancelled()
    {
        Igdb.Anticipated =
        [
            FakeIgdbClient.Game(1, "Silksong II", releaseDate: new DateOnly(2027, 3, 12), dateFormat: "YYYYMMDD"),

            // Announced, hyped, and dead. The calendar keeps a cancelled title somebody already
            // tracks, because that is where they find out; a list of what people are waiting for
            // has no business offering one. The live list carried one or two a page from page two
            // on — Perfect Dark, Everwild, Scalebound — and none on page one.
            FakeIgdbClient.Game(2, "Scalebound", gameStatus: "Cancelled"),
        ];

        var games = await DiscoverAsync("most-anticipated");

        games.Select(game => game.Title).ShouldBe(["Silksong II"]);
        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(1);
    }

    [Theory]
    [InlineData("new-releases", 49)]
    [InlineData("most-played", 49)]
    [InlineData("popular-now", 96)]
    [InlineData("most-anticipated", 96)]
    public async Task Asks_for_enough_to_fill_the_wall_and_know_whether_there_is_more(
        string list, int asked)
    {
        await DiscoverAsync(list);

        // Popular now is filtered after PopScore has ranked it and Most anticipated after IGDB has
        // answered, so both ask for twice the wall and trim. The other two are filtered inside the
        // query, where IGDB applies the filter before the limit — so one place past the wall is all
        // it takes to know whether there is a next page, rather than offering one that brings nothing.
        var call = Igdb.DiscoverCalls.ShouldHaveSingleItem();
        call.Offset.ShouldBe(0);
        call.Limit.ShouldBe(asked);
    }

    // ------------------------------------------------------------------------------ load more

    [Fact]
    public async Task A_page_says_where_the_next_one_starts()
    {
        Igdb.NewReleases = [.. Numbered(60)];

        var page = await PageAsync("new-releases");

        page.Titles.Count.ShouldBe(48);
        page.Titles[0].Title.ShouldBe("Game 1");

        // The 49th place is there, so there is a next page, and it starts at it.
        page.Next.ShouldBe(48);
    }

    [Fact]
    public async Task The_next_page_starts_where_the_last_one_said()
    {
        Igdb.NewReleases = [.. Numbered(60)];

        var page = await PageAsync("new-releases", from: 48);

        Igdb.DiscoverCalls.ShouldHaveSingleItem().Offset.ShouldBe(48);
        page.Titles.Select(game => game.Title).ShouldBe(
            [.. Enumerable.Range(49, 12).Select(number => $"Game {number}")]);

        // Twelve places were left, fewer than a page asks about, so IGDB has nothing past them.
        page.Next.ShouldBeNull();
    }

    [Fact]
    public async Task A_list_that_fills_its_last_page_exactly_offers_no_next_one()
    {
        Igdb.NewReleases = [.. Numbered(48)];

        var page = await PageAsync("new-releases");

        // Asked about one place more than a page holds and found nothing there, so there is no
        // next page — rather than a Load more whose only effect is to find that out.
        page.Titles.Count.ShouldBe(48);
        page.Next.ShouldBeNull();
    }

    [Fact]
    public async Task A_filtered_list_carries_on_from_the_first_title_it_did_not_show()
    {
        // Three of the first 51 places are playable already, so the calendar's rule keeps them off
        // and page one reaches place 50 to fill itself. A page two starting at 48 — a page's worth
        // of places on, which is what a page number would say — would show two titles again.
        Igdb.Anticipated =
        [
            .. Enumerable.Range(0, 60).Select(place => place is 10 or 20 or 30
                ? FakeIgdbClient.Game(place + 1, $"Game {place + 1}", gameStatus: "Early Access")
                : Upcoming(place + 1)),
        ];

        var first = await PageAsync("most-anticipated");
        first.Next.ShouldBe(51);

        var second = await PageAsync("most-anticipated", from: first.Next!.Value);
        second.Next.ShouldBeNull();

        first.Titles.Concat(second.Titles).Select(game => game.Title).ShouldBe(
        [
            .. Enumerable.Range(0, 60)
                .Where(place => place is not (10 or 20 or 30))
                .Select(place => $"Game {place + 1}"),
        ]);
    }

    [Fact]
    public async Task Popular_now_carries_on_from_a_place_in_popscore_rather_than_a_count_of_titles()
    {
        // PopScore ranks two games its second question will not describe, so the slice IGDB hands
        // back has holes at places 5 and 7. Page one's 48th title stands at place 49. Counting
        // titles rather than places would start page two at 48, and show 48 and 49 twice.
        Igdb.PlayingNow =
        [
            .. Enumerable.Range(0, 60).Select(place =>
                place is 5 or 7 ? null : FakeIgdbClient.Game(place + 1, $"Game {place + 1}")),
        ];

        var first = await PageAsync("popular-now");
        first.Next.ShouldBe(50);

        var second = await PageAsync("popular-now", from: 50);
        second.Next.ShouldBeNull();

        first.Titles.Concat(second.Titles).Select(game => game.Title).ShouldBe(
        [
            .. Enumerable.Range(0, 60)
                .Where(place => place is not (5 or 7))
                .Select(place => $"Game {place + 1}"),
        ]);
    }

    [Fact]
    public async Task Keeps_each_page_of_a_list_apart()
    {
        Igdb.NewReleases = [.. Numbered(60)];

        var first = await PageAsync("new-releases");
        var second = await PageAsync("new-releases", from: 48);
        await PageAsync("new-releases", from: 48);

        // Once a day for each page. A cache keyed on the list alone would answer page two with
        // page one — and the wall drops a title it already has, so on screen that is a Load more
        // that does nothing, with no error anywhere.
        Igdb.DiscoverCalls.Select(call => call.Offset).ShouldBe([0, 48]);
        second.Titles.ShouldNotContain(game => first.Titles.Any(seen => seen.Id == game.Id));
    }

    [Fact]
    public async Task A_page_before_the_first_is_refused()
    {
        var response = await Client.GetAsync("/api/games/discover/new-releases?from=-1", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        Igdb.DiscoverCalls.ShouldBeEmpty();
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

    /// <summary>The first page's titles, for the tests that are about what a list holds.</summary>
    private async Task<List<GameDto>> DiscoverAsync(string list) => [.. (await PageAsync(list)).Titles];

    private async Task<DiscoverListPage<GameDto>> PageAsync(string list, int? from = null)
    {
        var response = await Client.GetAsync(
            from is null ? $"/api/games/discover/{list}" : $"/api/games/discover/{list}?from={from}", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return await ReadAsync<DiscoverListPage<GameDto>>(response);
    }

    /// <summary>Games 1 to <paramref name="count"/>, in that order, each out already.</summary>
    private static IEnumerable<IgdbGame> Numbered(int count) =>
        Enumerable.Range(1, count).Select(number => FakeIgdbClient.Game(number, $"Game {number}"));

    /// <summary>A game dated to a day after the stopped clock, so the calendar calls it upcoming.</summary>
    private static IgdbGame Upcoming(int number) =>
        FakeIgdbClient.Game(number, $"Game {number}", releaseDate: new DateOnly(2027, 3, 12), dateFormat: "YYYYMMDD");
}
