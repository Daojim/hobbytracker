using System.Net;
using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Hltb;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The three ways HowLongToBeat is reached from outside: a backfill nobody watches, and a pin and
/// a refresh somebody is standing there waiting on.
///
/// They are shaped differently on purpose. The backfill queues and answers at once, because at a
/// two-second floor between requests a library of fifty titles is a hundred seconds and no HTTP
/// request should be held open for that. The pin fetches there and then, because the whole point
/// of typing an id is to find out whether it was the right one, and the refresh does the same for
/// one title somebody has asked about again.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class HltbEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    // ---------------------------------------------------------------- backfill

    [Fact]
    public async Task Queues_the_library_and_says_how_many_without_waiting()
    {
        var first = await GivenLibraryTitleAsync("Hollow Knight", "1");
        var second = await GivenLibraryTitleAsync("Celeste", "2");

        var response = await BackfillAsync();

        response.StatusCode.ShouldBe(HttpStatusCode.Accepted);
        (await ReadAsync<QueuedResult>(response)).Queued.ShouldBe(2);
        HltbQueue.Enqueued.ShouldBe([first, second], ignoreOrder: true);

        // Nothing was asked of HowLongToBeat inside the request. That is the whole shape.
        Hltb.Searches.ShouldBeEmpty();
        Hltb.Lookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task Leaves_the_catalog_alone_and_queues_only_what_is_on_the_board()
    {
        // media accumulates every result of every search ever typed. Asking HowLongToBeat about
        // all of it would be slow, and rude to a site that never agreed to serve us.
        var logged = await GivenLibraryTitleAsync("Hollow Knight", "1");
        await GivenGameAsync("Some Game Nobody Logged", "2");

        await BackfillAsync();

        HltbQueue.Enqueued.ShouldHaveSingleItem().ShouldBe(logged);
    }

    [Fact]
    public async Task Skips_a_title_asked_about_recently()
    {
        var mediaId = await GivenLibraryTitleAsync("Hollow Knight", "1");
        await StampCheckedAsync(mediaId, Journal.Now.AddDays(-1));

        await BackfillAsync();

        HltbQueue.Enqueued.ShouldBeEmpty();
    }

    [Fact]
    public async Task Asks_again_about_a_title_left_long_enough()
    {
        // RecheckAfterDays defaults to thirty. Numbers move as people submit more of them.
        var mediaId = await GivenLibraryTitleAsync("Hollow Knight", "1");
        await StampCheckedAsync(mediaId, Journal.Now.AddDays(-31));

        await BackfillAsync();

        HltbQueue.Enqueued.ShouldHaveSingleItem().ShouldBe(mediaId);
    }

    [Fact]
    public async Task Asks_about_a_title_the_moment_it_reaches_the_board()
    {
        // Adding a game is the one gesture that should produce numbers without anybody running
        // maintenance. It queues rather than fetches, so the reply is not held up by HLTB.
        var mediaId = await GivenGameAsync("Hollow Knight");

        await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, LogStatus.Backlog, null, null, null, null, null),
            Json,
            Ct);

        HltbQueue.Enqueued.ShouldHaveSingleItem().ShouldBe(mediaId);
        Hltb.Searches.ShouldBeEmpty();
    }

    [Fact]
    public async Task Says_nothing_to_HowLongToBeat_about_a_title_that_is_not_a_game()
    {
        // The queue is a game's, and it used to be told about every hobby: adding was a bare
        // Enqueue in the middle of the generic layer, harmless only because HltbService queries
        // db.Games and a film finds no row — after spending a queue slot and a worker scope
        // discovering it. HltbOnMediaAdded declines by hobby before any of that.
        var filmId = await GivenMovieAsync("Arrival", externalId: "329865");

        var response = await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(filmId, LogStatus.Backlog, null, null, null, null, null),
            Json,
            Ct);

        // The pass is written all the same. Nothing about journalling a film depends on a site
        // that has never heard of one.
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        HltbQueue.Enqueued.ShouldBeEmpty();
    }

    // --------------------------------------------------------------------- pin

    [Fact]
    public async Task Pinning_an_id_fetches_that_game_at_once_and_stores_its_times()
    {
        var mediaId = await GivenGameAsync("Pokémon Scarlet");
        Hltb.ById[104683] = FakeHltbClient.Game(
            104683, "Pokémon Scarlet and Violet", 2022, 32.07m, 51.57m, 92.22m);

        var detail = await ReadAsync<GameDetailDto>(await PinAsync(mediaId, 104683));

        detail.HltbId.ShouldBe(104683);
        detail.HltbMainStoryHours.ShouldBe(32.07m);
        detail.HltbMainExtraHours.ShouldBe(51.57m);
        detail.HltbCompletionistHours.ShouldBe(92.22m);

        // Pinned, so it is fetched by id rather than searched for. Searching is exactly what
        // failed to find it, which is why somebody was typing an id in the first place.
        Hltb.Searches.ShouldBeEmpty();
    }

    [Fact]
    public async Task Clearing_the_pin_puts_the_title_back_to_never_having_been_asked()
    {
        // Not to "asked and found nothing". The numbers were wrong, so leaving a stamp behind
        // would stop the backfill ever looking again and the card would stay blank for good.
        var mediaId = await GivenGameAsync("Pokémon Scarlet");
        Hltb.ById[104683] = FakeHltbClient.Game(104683, "Pokémon Scarlet and Violet", 2022, 32.07m);
        await PinAsync(mediaId, 104683);

        var detail = await ReadAsync<GameDetailDto>(await PinAsync(mediaId, null));

        detail.HltbId.ShouldBeNull();
        detail.HltbMainStoryHours.ShouldBeNull();
        (await WithDbAsync(db => db.Games.SingleAsync(g => g.Id == mediaId, Ct)))
            .HltbCheckedAt.ShouldBeNull();
    }

    [Fact]
    public async Task Clearing_the_pin_asks_howlongtobeat_again_by_name()
    {
        // Back to never-asked was only half of it. Nothing then asked, so the card polled for its
        // ninety seconds with nobody coming, and the title waited for the next backfill. Queued,
        // it is matched by name as on the day it was added — queued rather than fetched, so the
        // reply is not held up by a search.
        var mediaId = await GivenGameAsync("Pokémon Scarlet");
        Hltb.ById[104683] = FakeHltbClient.Game(104683, "Pokémon Scarlet and Violet", 2022, 32.07m);
        await PinAsync(mediaId, 104683);

        await PinAsync(mediaId, null);

        HltbQueue.Enqueued.ShouldHaveSingleItem().ShouldBe(mediaId);
        Hltb.Searches.ShouldBeEmpty();
    }

    [Fact]
    public async Task Refuses_an_id_howlongtobeat_does_not_know()
    {
        // A typo, or an entry since merged away. Storing the pin anyway would look like it
        // worked, and the card would sit empty with no way to tell why.
        var mediaId = await GivenGameAsync("Hollow Knight");

        var response = await PinAsync(mediaId, 999999);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await WithDbAsync(db => db.Games.SingleAsync(g => g.Id == mediaId, Ct)))
            .HltbId.ShouldBeNull();
    }

    [Fact]
    public async Task Answers_404_for_a_media_id_that_is_not_a_game()
    {
        (await PinAsync(mediaId: 9999, 26286)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Answers_502_when_howlongtobeat_cannot_be_reached()
    {
        // The one route anybody waits on, and so the only one this can happen to. "The site we
        // read is unhappy" is a different message from "this API is broken".
        var mediaId = await GivenGameAsync("Hollow Knight");
        Hltb.ThrowOnNextCall = new HltbException("down");

        (await PinAsync(mediaId, 26286)).StatusCode.ShouldBe(HttpStatusCode.BadGateway);
    }

    // ------------------------------------------------------- when it was asked

    [Fact]
    public async Task The_journal_is_told_when_howlongtobeat_was_last_asked()
    {
        // A game matched before it came out has an id and no figures, and the day it was asked
        // is the reason to ask again: "Last checked Sep 11" on a game out on Oct 29. It was on no
        // read at all, because nothing a person looked at needed it until now.
        var mediaId = await GivenGameAsync("Phantom Blade Zero");
        await StampCheckedAsync(mediaId, Eastern(2026, 9, 11, 14, 30));

        var detail = await ReadAsync<GameDetailDto>(
            await Client.GetAsync($"/api/games/{mediaId}", Ct));

        detail.HltbCheckedAt.ShouldBe(Eastern(2026, 9, 11, 14, 30));
    }

    [Fact]
    public async Task A_title_nobody_has_asked_about_has_no_date_to_give()
    {
        // Null, and not a stand-in day: never asked is a state of its own, the one the board
        // polls on while a lookup is on its way.
        var mediaId = await GivenGameAsync("Hollow Knight");

        var detail = await ReadAsync<GameDetailDto>(
            await Client.GetAsync($"/api/games/{mediaId}", Ct));

        detail.HltbCheckedAt.ShouldBeNull();
    }

    // ----------------------------------------------------------------- refresh

    [Fact]
    public async Task Refreshing_a_title_fetches_its_id_again_and_brings_the_times_that_have_arrived()
    {
        // The case the journal's arrow is for. HowLongToBeat can list a game before it is out,
        // with no times on it, and the matcher compares names and never times, so the id is kept
        // and the figures stay empty. Nothing asked again: the way round it was to pin another id
        // and then this one. The same id, asked again, is the whole of the fix.
        var mediaId = await GivenGameAsync("Phantom Blade Zero");
        Hltb.ById[129235] = FakeHltbClient.Game(129235, "Phantom Blade Zero", 2026);
        await PinAsync(mediaId, 129235);

        // Out now, and people have finished it since.
        Hltb.ById[129235] = FakeHltbClient.Game(
            129235, "Phantom Blade Zero", 2026, 22.5m, 30m, 45m, allStyles: 28m);
        Hltb.Lookups.Clear();

        var response = await RefreshAsync(mediaId);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var detail = await ReadAsync<GameDetailDto>(response);
        detail.HltbId.ShouldBe(129235);
        detail.HltbAllStylesHours.ShouldBe(28m);
        detail.HltbMainStoryHours.ShouldBe(22.5m);
        detail.HltbCompletionistHours.ShouldBe(45m);

        // By the id it holds and never searched for, as the worker would: a match is a decision
        // made once, and a search is what failed to find it right in the first place.
        Hltb.Lookups.ShouldBe([129235]);
        Hltb.Searches.ShouldBeEmpty();
    }

    [Fact]
    public async Task Refreshing_a_title_nothing_has_matched_searches_for_it_again()
    {
        // No id, so there is nothing to fetch: the title is searched for and put through the
        // matcher, exactly as on the day it was added, and a match confident now is kept.
        var mediaId = await GivenGameAsync("Hollow Knight");
        await StampCheckedAsync(mediaId, Journal.Now.AddDays(-3));
        Hltb.SetResults(
            "Hollow Knight",
            FakeHltbClient.Game(26286, "Hollow Knight", 2017, 27m, 41.59m, 65.6m, allStyles: 41.82m));

        var response = await RefreshAsync(mediaId);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var detail = await ReadAsync<GameDetailDto>(response);
        detail.HltbId.ShouldBe(26286);
        detail.HltbAllStylesHours.ShouldBe(41.82m);
        Hltb.Searches.ShouldBe(["Hollow Knight"]);
    }

    [Fact]
    public async Task Says_so_when_howlongtobeat_no_longer_has_the_id_a_title_holds()
    {
        // The one outcome with words of its own. An entry can be merged away or deleted, and the
        // lookup keeps the figures that were true when they were written — so a 200 here would
        // put "Checked just now" over numbers nobody has checked. A conflict instead, naming the
        // id as the pin's refusal does, because pinning another one is how it is resolved.
        var mediaId = await GivenGameAsync("Some Game");
        await HoldIdAsync(mediaId, 555, mainStory: 12.5m);

        var response = await RefreshAsync(mediaId);

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await ReadAsync<ProblemDetails>(response)).Detail
            .ShouldBe("HowLongToBeat no longer has game 555.");

        var game = await WithDbAsync(db => db.Games.SingleAsync(g => g.Id == mediaId, Ct));
        game.HltbId.ShouldBe(555);
        game.HltbMainStoryHours.ShouldBe(12.5m);
    }

    [Fact]
    public async Task A_check_that_finds_no_times_yet_answers_with_when_it_asked()
    {
        // Nobody has finished it yet, so HowLongToBeat has the entry and nothing on it, and the
        // figures stay empty. Alone, that is a 200 that looks exactly like nothing happening — so
        // the answer carries the moment it asked, which is what the journal's line reads.
        var mediaId = await GivenGameAsync("Phantom Blade Zero");
        await HoldIdAsync(mediaId, 129235);
        await StampCheckedAsync(mediaId, Eastern(2026, 9, 11));
        Hltb.ById[129235] = FakeHltbClient.Game(129235, "Phantom Blade Zero", 2026);

        var detail = await ReadAsync<GameDetailDto>(await RefreshAsync(mediaId));

        detail.HltbCheckedAt.ShouldBe(Journal.Now);
        detail.HltbAllStylesHours.ShouldBeNull();
        detail.HltbMainStoryHours.ShouldBeNull();
    }

    [Fact]
    public async Task Answers_404_when_asked_to_refresh_a_title_that_is_not_a_game()
    {
        var filmId = await GivenMovieAsync("Arrival", externalId: "329865");

        (await RefreshAsync(filmId)).StatusCode.ShouldBe(HttpStatusCode.NotFound);

        Hltb.Searches.ShouldBeEmpty();
        Hltb.Lookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task Answers_502_and_writes_nothing_when_a_refresh_cannot_reach_howlongtobeat()
    {
        // The second route anybody waits on, after the pin. Nothing is stamped: the column says
        // when HowLongToBeat last answered, and it did not.
        var mediaId = await GivenGameAsync("Hollow Knight");
        await HoldIdAsync(mediaId, 26286, mainStory: 27m);
        var asked = Journal.Now.AddDays(-3);
        await StampCheckedAsync(mediaId, asked);
        Hltb.ThrowOnNextCall = new HltbException("down");

        (await RefreshAsync(mediaId)).StatusCode.ShouldBe(HttpStatusCode.BadGateway);

        (await WithDbAsync(db => db.Games.SingleAsync(g => g.Id == mediaId, Ct)))
            .HltbCheckedAt.ShouldBe(asked);
    }

    // ----------------------------------------------------------------- helpers

    private Task<HttpResponseMessage> BackfillAsync() =>
        Client.PostAsync("/api/games/hltb/refresh", content: null, Ct);

    private Task<HttpResponseMessage> RefreshAsync(int mediaId) =>
        Client.PostAsync($"/api/games/{mediaId}/hltb/refresh", content: null, Ct);

    /// <summary>
    /// An id already stored against a title, as a match from long ago left it — written straight
    /// to the row, so HowLongToBeat is not asked about it while the test is being arranged.
    /// </summary>
    private Task HoldIdAsync(int mediaId, int hltbId, decimal? mainStory = null) =>
        WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            game.HltbId = hltbId;
            game.HltbMainStoryHours = mainStory;
            await db.SaveChangesAsync(Ct);
        });

    private Task<HttpResponseMessage> PinAsync(int mediaId, int? hltbId) =>
        Client.PutAsJsonAsync(
            $"/api/games/{mediaId}/hltb", new SetHltbIdRequest(hltbId), Json, Ct);

    private async Task<int> GivenLibraryTitleAsync(string title, string externalId)
    {
        var mediaId = await GivenGameAsync(title, externalId);
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        // The fixture inserts straight into the database rather than posting, so nothing has
        // been queued — cleared anyway so these tests assert about their own action and not
        // about how the arrangement happened to be built.
        HltbQueue.Enqueued.Clear();

        return mediaId;
    }

    private Task StampCheckedAsync(int mediaId, DateTimeOffset when) =>
        WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            game.HltbCheckedAt = when;
            await db.SaveChangesAsync(Ct);
        });
}
