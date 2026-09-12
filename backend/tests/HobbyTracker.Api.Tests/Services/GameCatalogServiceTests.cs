using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
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
                developers: ["Bungie"],
                genres: ["Shooter", "Adventure"]));

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

        // Alphabetical, like the other two arrays. IGDB's ordering is not meaningfulness
        // ordering, and which genre colours the card is decided by our own list, not theirs.
        game.Genres.ShouldBe(["Adventure", "Shooter"]);
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
        // The upsert invariant, previously only ever checked by hand with curl.
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
    public async Task Refreshing_leaves_a_chosen_primary_genre_alone()
    {
        // The same reasoning as the hltb columns above: IGDB owns the genre list, but which of
        // them colours the card is a choice the user made, and a re-search must not undo it.
        Igdb.SetResults("halo", FakeIgdbClient.Game(740, "Halo", genres: ["Shooter", "Adventure"]));
        await SearchAsync("halo");

        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(Ct);
            game.PrimaryGenre = "Adventure";
            await db.SaveChangesAsync(Ct);
        });

        Igdb.SetResults("halo", FakeIgdbClient.Game(740, "Halo", genres: ["Shooter", "Indie"]));
        await SearchAsync("halo");

        var refreshed = await WithDbAsync(db => db.Games.SingleAsync(Ct));

        refreshed.Genres.ShouldBe(["Indie", "Shooter"]);
        refreshed.PrimaryGenre.ShouldBe("Adventure");
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
    public async Task Hands_back_no_more_than_was_asked_for()
    {
        // The client asks IGDB two questions — relevance and slug prefix — so it can answer
        // with up to twice the limit. Ranking happens over all of it and the cut comes after,
        // which is the entire point: the prefix half is usually where the good matches are,
        // and trimming first would throw them away before anything had looked at them.
        Igdb.SetResults("many",
            FakeIgdbClient.Game(1, "Alpha"),
            FakeIgdbClient.Game(2, "Beta"),
            FakeIgdbClient.Game(3, "Gamma"),
            FakeIgdbClient.Game(4, "Delta"),
            FakeIgdbClient.Game(5, "Epsilon"));

        var results = await SearchAsync("many", 3);

        results.Count.ShouldBe(3);

        // And the catalogue grew by what a person could actually have seen, not by what was
        // fetched to decide it.
        (await CountMediaAsync()).ShouldBe(3);
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

    [Fact]
    public async Task A_searched_game_stores_the_window_at_the_precision_IGDB_announced()
    {
        Igdb.SetResults("witcher", FakeIgdbClient.Game(
            194662, "The Witcher IV",
            releaseDate: new DateOnly(2028, 12, 31),
            dateFormat: "YYYY",
            gameStatus: "Rumored"));

        await SearchAsync("witcher");

        var game = await WithDbAsync(db => db.Games.SingleAsync(Ct));

        // IGDB sends "2028" as its last day. Stored as that day it would sit in the calendar's
        // December, eleven months after the game is actually due.
        game.ReleaseDate.ShouldBe(new DateOnly(2028, 1, 1));
        game.ReleaseEnd.ShouldBe(new DateOnly(2028, 12, 31));
        game.ReleasePrecision.ShouldBe(ReleasePrecision.Year);
        game.ReleaseStatus.ShouldBe(ReleaseStatus.Rumored);
    }

    [Fact]
    public async Task A_game_IGDB_has_no_date_for_is_stored_as_asked_rather_than_as_unasked()
    {
        // The three-state null, at the layer that creates it. "Asked, and IGDB said TBD" has to
        // be distinguishable from "nobody has asked", because the second reads as released and
        // the first does not.
        Igdb.SetResults("elder", FakeIgdbClient.Game(81249, "The Elder Scrolls VI", dateFormat: "TBD"));

        await SearchAsync("elder");

        var game = await WithDbAsync(db => db.Games.SingleAsync(Ct));

        game.ReleasePrecision.ShouldBe(ReleasePrecision.Unknown);
        game.ReleaseDate.ShouldBeNull();
        game.ReleaseEnd.ShouldBeNull();
    }

    [Fact]
    public async Task A_refresh_re_derives_the_precision_rather_than_only_the_date()
    {
        // A slipping date is the whole reason the daily refresh exists, and this is how it goes
        // wrong quietly: write the date and leave the precision, and the card goes on reading
        // "Q1 2027" while the calendar sorts it under 12 March, with nothing to say the two
        // disagree.
        Igdb.SetResults("silksong", FakeIgdbClient.Game(
            1, "Silksong", releaseDate: new DateOnly(2027, 3, 31), dateFormat: "YYYYQ1"));
        await SearchAsync("silksong");

        var vague = await WithDbAsync(db => db.Games.SingleAsync(Ct));
        vague.ReleasePrecision.ShouldBe(ReleasePrecision.Quarter);
        vague.ReleaseDate.ShouldBe(new DateOnly(2027, 1, 1));

        Igdb.SetResults("silksong", FakeIgdbClient.Game(
            1, "Silksong", releaseDate: new DateOnly(2027, 3, 12), dateFormat: "YYYYMMDD"));
        await SearchAsync("silksong");

        var sharpened = await WithDbAsync(db => db.Games.SingleAsync(Ct));

        sharpened.ReleasePrecision.ShouldBe(ReleasePrecision.Day);
        sharpened.ReleaseDate.ShouldBe(new DateOnly(2027, 3, 12));
        sharpened.ReleaseEnd.ShouldBe(new DateOnly(2027, 3, 12));
    }

    [Fact]
    public async Task A_release_window_can_go_back_to_being_a_date_nobody_has_announced()
    {
        // Delays run the other way too: a dated game is pulled back to TBD often enough that
        // leaving the old window standing would show a date the publisher has withdrawn.
        Igdb.SetResults("game", FakeIgdbClient.Game(
            1, "Game", releaseDate: new DateOnly(2027, 3, 12), dateFormat: "YYYYMMDD"));
        await SearchAsync("game");

        Igdb.SetResults("game", FakeIgdbClient.Game(1, "Game", dateFormat: "TBD"));
        await SearchAsync("game");

        var game = await WithDbAsync(db => db.Games.SingleAsync(Ct));

        game.ReleasePrecision.ShouldBe(ReleasePrecision.Unknown);
        game.ReleaseDate.ShouldBeNull();
        game.ReleaseEnd.ShouldBeNull();
    }

    [Fact]
    public async Task A_refresh_does_not_move_the_year_the_matcher_reads()
    {
        // games.release_year and media.release_date look like the same fact and are not. The
        // year is read in UTC because it is compared against HowLongToBeat's release_world, a
        // bare year belonging to no timezone — so repointing it at the window, which is the
        // obvious tidying edit once both exist, silently re-breaks the matcher on exactly the
        // December releases it was added to disambiguate.
        Igdb.SetResults("game", FakeIgdbClient.Game(
            1, "Game", releaseDate: new DateOnly(2026, 12, 31), dateFormat: "YYYYMMDD"));

        await SearchAsync("game");

        var game = await WithDbAsync(db => db.Games.SingleAsync(Ct));

        game.ReleaseYear.ShouldBe(2026);
        game.ReleaseDate.ShouldBe(new DateOnly(2026, 12, 31));
    }

    [Fact]
    public async Task A_game_nobody_has_asked_about_keeps_a_null_precision_until_something_does()
    {
        // The deploy-day contract, one layer up from SchemaTests. A title inserted by anything
        // other than a provider read carries no window, and that has to keep meaning "never
        // asked" rather than "TBD".
        var mediaId = await GivenGameAsync(title: "Already Here", externalId: "900");

        var stored = await WithDbAsync(db =>
            db.Media.SingleAsync(candidate => candidate.Id == mediaId, Ct));

        stored.ReleasePrecision.ShouldBeNull();
    }

    [Fact]
    public async Task A_search_says_whether_each_result_is_out_rather_than_leaving_it_to_be_worked_out()
    {
        // Caught by the end-to-end suite rather than by anything here, which is the finding: the
        // client had a `released` field and the server never sent one, so every tile read
        // `undefined` as "not out" and offered the calendar for games from 2018.
        //
        // It is the same question the Backlog column is partitioned on, so it is answered once,
        // on the server, from ReleaseWindow.NotOutOn. A second copy of that rule on the client
        // would be free to disagree — and the visible failure is a tile offering the calendar
        // for a title that then lands in the column.
        Igdb.SetResults("mixed",
            FakeIgdbClient.Game(1, "Long Ago", releaseDate: new DateOnly(2018, 1, 25), dateFormat: "YYYYMMDD"),
            FakeIgdbClient.Game(2, "Years Off", releaseDate: new DateOnly(2028, 1, 25), dateFormat: "YYYYMMDD"),
            FakeIgdbClient.Game(3, "No Date", dateFormat: "TBD"));

        var results = await SearchAsync("mixed");

        results.Single(game => game.Title == "Long Ago").Released.ShouldBeTrue();
        results.Single(game => game.Title == "Years Off").Released.ShouldBeFalse();
        results.Single(game => game.Title == "No Date").Released.ShouldBeFalse();
    }

    [Fact]
    public async Task A_search_result_IGDB_has_no_date_for_reads_as_out()
    {
        // The tile end of the measured distinction. IGDB carries a great many obscure titles
        // with no date and no release_dates rows at all, and those are games that exist — so
        // they get no window, offer a plain Add, and land in Backlog where they belong.
        //
        // A game IGDB models as announced-and-undated carries explicit TBD rows instead, and the
        // case below is that one.
        Igdb.SetResults("obscure", FakeIgdbClient.Game(94975, "Wubble Bubbles"));

        var results = await SearchAsync("obscure");

        var found = results.ShouldHaveSingleItem();
        found.Released.ShouldBeTrue();
        found.ReleasePrecision.ShouldBeNull();
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
        NullLogger<GameCatalogService>.Instance,
        new FakeCurrentUser(UserId),
        new JournalClock(Clock, Options.Create(new JournalOptions())));

    private Task<int> CountMediaAsync() => WithDbAsync(db => db.Media.CountAsync(Ct));
}
