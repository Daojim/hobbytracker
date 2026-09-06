using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>The original search endpoint, pinned by tests rather than by me remembering to run curl.</summary>
[Collection(DatabaseCollection.Name)]
public sealed class GamesEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Returns_games_for_a_search()
    {
        Igdb.SetResults("halo",
            FakeIgdbClient.Game(740, "Halo: Combat Evolved", "co2r2r",
                platforms: ["Xbox"], developers: ["Bungie"]));

        var response = await Client.GetAsync("/api/games?search=halo", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var games = await ReadAsync<List<GameDto>>(response);
        var game = games.ShouldHaveSingleItem();

        game.Title.ShouldBe("Halo: Combat Evolved");
        game.ExternalId.ShouldBe("740");
        game.Source.ShouldBe("igdb");
        game.Platforms.ShouldBe(["Xbox"]);
        game.Developers.ShouldBe(["Bungie"]);
        game.CoverUrl.ShouldNotBeNull().ShouldContain("t_cover_big/co2r2r.jpg");
        game.HltbMainStoryHours.ShouldBeNull();
    }

    [Theory]
    [InlineData("/api/games")]
    [InlineData("/api/games?search=")]
    [InlineData("/api/games?search=%20%20")]
    public async Task Rejects_a_missing_or_blank_search_term(string url)
    {
        var response = await Client.GetAsync(url, Ct);

        // APIcalypse accepts search "" and answers with an unrelated slice of the catalogue,
        // which would then be written to the database as though it had been asked for.
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        Igdb.Calls.ShouldBeEmpty();
    }

    [Fact]
    public async Task Rejects_a_limit_outside_igdbs_range()
    {
        var response = await Client.GetAsync("/api/games?search=halo&limit=9999", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        Igdb.Calls.ShouldBeEmpty();
    }

    [Fact]
    public async Task Passes_the_limit_through_to_igdb()
    {
        Igdb.DefaultResults = [.. Enumerable.Range(1, 10).Select(i => FakeIgdbClient.Game(i, $"Game {i}"))];

        await Client.GetAsync("/api/games?search=halo&limit=3", Ct);

        Igdb.Calls.ShouldHaveSingleItem().Limit.ShouldBe(3);
    }

    [Fact]
    public async Task Returns_an_empty_array_when_igdb_finds_nothing()
    {
        var response = await Client.GetAsync("/api/games?search=zzzznotarealgame", Ct);

        // Empty is a valid answer to a search, not a missing resource.
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await ReadAsync<List<GameDto>>(response)).ShouldBeEmpty();
    }

    [Fact]
    public async Task Reports_igdb_failure_as_502_without_leaking_the_cause()
    {
        Igdb.ThrowOnNextCall = new IgdbException(
            "Twitch token request failed with 403: {\"message\":\"invalid client secret\"}");

        var response = await Client.GetAsync("/api/games?search=halo", Ct);

        // 502 rather than 500: the upstream provider is unhappy, this API is fine.
        response.StatusCode.ShouldBe(HttpStatusCode.BadGateway);

        var body = await response.Content.ReadAsStringAsync(Ct);
        body.ShouldContain("Upstream metadata provider failed");

        // IGDB's raw error text belongs in the log, not in a client response.
        body.ShouldNotContain("invalid client secret");
    }

    [Fact]
    public async Task Searching_the_same_term_twice_leaves_the_row_count_alone()
    {
        Igdb.SetResults("halo",
            FakeIgdbClient.Game(740, "Halo: Combat Evolved"),
            FakeIgdbClient.Game(2640, "Halo: Anniversary"));

        await Client.GetAsync("/api/games?search=halo", Ct);
        await Client.GetAsync("/api/games?search=halo", Ct);

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(2);
    }

    [Fact]
    public async Task Serialises_search_results_as_a_bare_array()
    {
        Igdb.SetResults("halo", FakeIgdbClient.Game(740, "Halo"));

        var response = await Client.GetAsync("/api/games?search=halo", Ct);
        var body = await response.Content.ReadAsStringAsync(Ct);

        // Search is not paged: it returns whatever IGDB ranked, capped by limit. Pinning the
        // shape here so adding pagination elsewhere does not silently change this endpoint.
        body.TrimStart().ShouldStartWith("[");
    }

    // ------------------------------------------------------------------ detail

    [Fact]
    public async Task Returns_one_stored_game_with_everything_logged_against_it()
    {
        var mediaId = await GivenGameAsync("Hollow Knight", externalId: "14593",
            platforms: ["Nintendo Switch", "PC"]);

        await GivenLogEntryAsync(mediaId, LogStatus.Completed, rating: 9.5m,
            completedAt: Eastern(2025, 6, 1));
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress,
            startedAt: Eastern(2026, 8, 1));

        var response = await Client.GetAsync($"/api/games/{mediaId}", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var game = await ReadAsync<GameDetailDto>(response);
        game.Id.ShouldBe(mediaId);
        game.Title.ShouldBe("Hollow Knight");
        game.ExternalId.ShouldBe("14593");
        game.Platforms.ShouldBe(["Nintendo Switch", "PC"]);

        // One request, not one per entry — the point of a detail endpoint.
        game.LogEntries.Count.ShouldBe(2);
        game.LogEntries.Select(e => e.Status)
            .ShouldContain(LogStatus.Completed);
    }

    [Fact]
    public async Task Carries_each_pass_notes_so_the_drawer_needs_one_request()
    {
        // The trap this guards: an entry loaded without .Include(e => e.Notes) maps to a DTO
        // reporting no notes at all — silently, with nothing failing to compile. This is the
        // path the journal drawer actually loads.
        var mediaId = await GivenGameAsync("Hollow Knight");
        var entryId = await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        await Client.PostAsJsonAsync(
            $"/api/log-entries/{entryId}/notes", new NoteRequest("hard but fair"), Json, Ct);

        var game = await ReadAsync<GameDetailDto>(
            await Client.GetAsync($"/api/games/{mediaId}", Ct));

        game.LogEntries.Single().Notes.Single().Body.ShouldBe("hard but fair");
    }

    [Fact]
    public async Task Returns_a_game_with_no_entries_as_an_empty_list()
    {
        var mediaId = await GivenGameAsync("Never Played");

        var response = await Client.GetAsync($"/api/games/{mediaId}", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await ReadAsync<GameDetailDto>(response)).LogEntries.ShouldBeEmpty();
    }

    [Fact]
    public async Task Detail_404s_for_an_unknown_id()
    {
        (await Client.GetAsync("/api/games/999999", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Detail_404s_for_media_that_is_not_a_game()
    {
        var filmId = await GivenMovieAsync("Arrival", externalId: "329865");

        var response = await Client.GetAsync($"/api/games/{filmId}", Ct);

        // The row exists in media but has no games detail. Querying the derived DbSet under
        // TPT is what filters it out; querying Media would wrongly return it.
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }
}
