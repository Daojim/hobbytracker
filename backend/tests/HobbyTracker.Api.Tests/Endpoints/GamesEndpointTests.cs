using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>The Phase 1 endpoint, pinned by tests rather than by me remembering to run curl.</summary>
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
}
