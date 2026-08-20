using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Services;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// The riskiest code in the repo, and until now the least covered: collapsing duplicates,
/// surviving a concurrent insert, and preserving IGDB's relevance order through a round trip
/// to a database that knows nothing about relevance.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class GameCatalogServiceTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Stores_what_igdb_returns()
    {
        Igdb.SetResults("halo",
            FakeIgdbClient.Game(740, "Halo: Combat Evolved", "co2r2r",
                platforms: ["Xbox", "PC (Microsoft Windows)"],
                developers: ["Bungie"]));

        await SearchAsync("halo");

        var game = await WithDbAsync(db => db.Games.SingleAsync(Ct));

        game.Title.ShouldBe("Halo: Combat Evolved");
        game.ExternalId.ShouldBe("740");
        game.HobbyId.ShouldBe(SeedData.Hobbies.Games);
        game.SourceId.ShouldBe(SeedData.Sources.Igdb);

        // The stored URL is composed from image_id, not echoed from IGDB.
        game.CoverUrl.ShouldBe("https://images.igdb.com/igdb/image/upload/t_cover_big/co2r2r.jpg");

        game.Platforms.ShouldBe(["PC (Microsoft Windows)", "Xbox"]);
        game.Developers.ShouldBe(["Bungie"]);
    }

    [Fact]
    public async Task Keeps_only_companies_flagged_as_developer()
    {
        Igdb.SetResults("halo", new Api.Integrations.Igdb.Models.IgdbGame
        {
            Id = 740,
            Name = "Halo: Combat Evolved",
            InvolvedCompanies =
            [
                new() { Developer = true, Company = new() { Name = "Bungie" } },
                new() { Developer = false, Publisher = true, Company = new() { Name = "Microsoft Game Studios" } },
            ],
        });

        await SearchAsync("halo");

        var game = await WithDbAsync(db => db.Games.SingleAsync(Ct));
        game.Developers.ShouldBe(["Bungie"]);
    }

    [Fact]
    public async Task Searching_twice_does_not_duplicate_rows()
    {
        // The Phase 1 invariant, previously only ever checked by hand with curl.
        Igdb.SetResults("halo",
            FakeIgdbClient.Game(740, "Halo: Combat Evolved"),
            FakeIgdbClient.Game(2640, "Halo: Combat Evolved Anniversary"));

        await SearchAsync("halo");
        await SearchAsync("halo");

        (await CountMediaAsync()).ShouldBe(2);
        (await WithDbAsync(db => db.Games.CountAsync(Ct))).ShouldBe(2);
    }

    [Fact]
    public async Task Refreshing_updates_metadata_in_place()
    {
        Igdb.SetResults("halo", FakeIgdbClient.Game(740, "Halo", platforms: ["Xbox"]));
        await SearchAsync("halo");

        var originalId = await WithDbAsync(db => db.Games.Select(g => g.Id).SingleAsync(Ct));

        Igdb.SetResults("halo",
            FakeIgdbClient.Game(740, "Halo: Combat Evolved", "co2r2r", platforms: ["Xbox", "PC"]));
        await SearchAsync("halo");

        var game = await WithDbAsync(db => db.Games.SingleAsync(Ct));

        // Same row, updated -- not a second row, and not a new id that log entries would lose.
        game.Id.ShouldBe(originalId);
        game.Title.ShouldBe("Halo: Combat Evolved");
        game.Platforms.ShouldBe(["PC", "Xbox"]);
    }

    [Fact]
    public async Task Refreshing_leaves_hand_entered_hltb_data_alone()
    {
        Igdb.SetResults("halo", FakeIgdbClient.Game(740, "Halo"));
        await SearchAsync("halo");

        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(Ct);
            game.HltbMainStoryHours = 10.5m;
            game.HltbId = 2127;
            await db.SaveChangesAsync(Ct);
        });

        await SearchAsync("halo");

        var refreshed = await WithDbAsync(db => db.Games.SingleAsync(Ct));

        // HowLongToBeat has no official API, so these are typed in by hand. An IGDB refresh
        // wiping them would quietly destroy the only data the user actually authored.
        refreshed.HltbMainStoryHours.ShouldBe(10.5m);
        refreshed.HltbId.ShouldBe(2127);
    }

    [Fact]
    public async Task Collapses_ids_igdb_repeats_within_one_response()
    {
        // IGDB can repeat an id across relevance tiers. Two tracked entities sharing a key
        // throw on save, so this must be collapsed before it reaches the change tracker.
        Igdb.SetResults("halo",
            FakeIgdbClient.Game(740, "Halo: Combat Evolved"),
            FakeIgdbClient.Game(740, "Halo: Combat Evolved"),
            FakeIgdbClient.Game(2640, "Halo: Anniversary"));

        var results = await SearchAsync("halo");

        (await CountMediaAsync()).ShouldBe(2);
        results.Select(r => r.ExternalId).Distinct().Count().ShouldBe(2);
    }

    [Fact]
    public async Task Ignores_results_with_no_title()
    {
        Igdb.SetResults("halo",
            FakeIgdbClient.Game(740, "Halo"),
            new Api.Integrations.Igdb.Models.IgdbGame { Id = 999, Name = null });

        await SearchAsync("halo");

        // title is NOT NULL; letting a nameless result through would be a 500 on save.
        (await CountMediaAsync()).ShouldBe(1);
    }

    [Fact]
    public async Task Returns_results_in_igdb_relevance_order_not_database_order()
    {
        // Seed so that database ids run A=1, B=2.
        Igdb.SetResults("first",
            FakeIgdbClient.Game(100, "Alpha"),
            FakeIgdbClient.Game(200, "Beta"));
        await SearchAsync("first");

        // Now IGDB ranks them the other way round.
        Igdb.SetResults("second",
            FakeIgdbClient.Game(200, "Beta"),
            FakeIgdbClient.Game(100, "Alpha"));
        var results = await SearchAsync("second");

        // Reading rows back by id would put Alpha first and silently throw away the ranking,
        // which is the entire value of an APIcalypse search.
        results.Select(r => r.Title).ShouldBe(["Beta", "Alpha"]);
    }

    [Fact]
    public async Task Concurrent_identical_searches_do_not_create_duplicates()
    {
        Igdb.SetResults("halo",
            FakeIgdbClient.Game(740, "Halo: Combat Evolved"),
            FakeIgdbClient.Game(2640, "Halo: Anniversary"));

        // Each task needs its own DbContext; a shared one is not thread-safe. Whichever loses
        // the race hits the partial unique index, gets a 23505, and re-reads rather than
        // writing a duplicate or surfacing a 500.
        var searches = Enumerable.Range(0, 5).Select(async _ =>
        {
            await using var db = Postgres.CreateDbContext();
            return await CreateService(db).SearchAsync("halo", null, Ct);
        });

        var results = await Task.WhenAll(searches);

        (await CountMediaAsync()).ShouldBe(2);
        results.ShouldAllBe(r => r.Count == 2);
    }

    [Fact]
    public async Task Honours_the_configured_default_limit()
    {
        Igdb.DefaultResults =
        [
            .. Enumerable.Range(1, 50).Select(i => FakeIgdbClient.Game(i, $"Game {i}")),
        ];

        await SearchAsync("anything");

        Igdb.Calls.ShouldHaveSingleItem().Limit.ShouldBe(20);
        (await CountMediaAsync()).ShouldBe(20);
    }

    private async Task<IReadOnlyList<Api.Contracts.GameDto>> SearchAsync(string search, int? limit = null)
    {
        await using var db = Postgres.CreateDbContext();
        return await CreateService(db).SearchAsync(search, limit, Ct);
    }

    private GameCatalogService CreateService(HobbyTrackerDbContext db) => new(
        db,
        Igdb,
        Options.Create(new IgdbOptions { ClientId = "id", ClientSecret = "secret" }),
        NullLogger<GameCatalogService>.Instance);

    private Task<int> CountMediaAsync() => WithDbAsync(db => db.Media.CountAsync(Ct));
}
