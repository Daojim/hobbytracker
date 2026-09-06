using System.Net;
using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Hltb;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The two ways HowLongToBeat is reached from outside: a backfill nobody watches, and a pin
/// somebody is standing there having typed.
///
/// They are shaped differently on purpose. The backfill queues and answers at once, because at a
/// two-second floor between requests a library of fifty titles is a hundred seconds and no HTTP
/// request should be held open for that. The pin fetches there and then, because the whole point
/// of typing an id is to find out whether it was the right one.
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

    // ----------------------------------------------------------------- helpers

    private Task<HttpResponseMessage> BackfillAsync() =>
        Client.PostAsync("/api/games/hltb/refresh", content: null, Ct);

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
