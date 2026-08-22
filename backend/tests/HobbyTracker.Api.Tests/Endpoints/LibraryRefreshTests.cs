using System.Net;
using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Bringing the library you already have up to date with IGDB.
///
/// media and games rows are only ever written by a search, so a field added to the schema is
/// null on every title until something goes and asks for it. This is that something — a
/// maintenance action, not a feature, and the rail HowLongToBeat's backfill will ride too.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class LibraryRefreshTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Brings_a_logged_title_up_to_date_and_says_how_many()
    {
        var mediaId = await GivenGameAsync("Hollow Knight", externalId: "740");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        Igdb.ById[740] = FakeIgdbClient.Game(
            740, "Hollow Knight", genres: ["Platform", "Adventure"]);

        var result = await ReadAsync<RefreshResult>(await RefreshAsync());

        result.Refreshed.ShouldBe(1);
        (await GenresOfAsync(mediaId)).ShouldBe(["Adventure", "Platform"]);
    }

    [Fact]
    public async Task Leaves_the_catalog_alone_and_only_refreshes_what_is_on_the_board()
    {
        // media accumulates every result of every search ever typed. Refreshing all of it would
        // mean asking IGDB about hundreds of titles nobody ever logged anything against.
        var logged = await GivenGameAsync("Hollow Knight", externalId: "740");
        await GivenLogEntryAsync(logged, LogStatus.Backlog);
        await GivenGameAsync("Some Other Game", externalId: "999");

        await RefreshAsync();

        Igdb.IdLookups.ShouldHaveSingleItem().ShouldBe([740]);
    }

    [Fact]
    public async Task Keeps_a_chosen_genre_through_a_refresh()
    {
        var mediaId = await GivenGameAsync("Hollow Knight", externalId: "740");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(g => g.Id == mediaId, Ct);
            game.PrimaryGenre = "Adventure";
            game.HltbMainStoryHours = 24.5m;
            await db.SaveChangesAsync(Ct);
        });
        Igdb.ById[740] = FakeIgdbClient.Game(740, "Hollow Knight", genres: ["Platform"]);

        await RefreshAsync();

        var refreshed = await WithDbAsync(db => db.Games.SingleAsync(g => g.Id == mediaId, Ct));
        refreshed.Genres.ShouldBe(["Platform"]);
        refreshed.PrimaryGenre.ShouldBe("Adventure");
        refreshed.HltbMainStoryHours.ShouldBe(24.5m);
    }

    [Fact]
    public async Task Asks_igdb_nothing_when_the_board_is_empty()
    {
        (await ReadAsync<RefreshResult>(await RefreshAsync())).Refreshed.ShouldBe(0);

        Igdb.IdLookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task Skips_a_title_igdb_no_longer_knows_about()
    {
        // A delisted game still deserves to sit on your board with whatever we last knew.
        var mediaId = await GivenGameAsync("Gone Forever", externalId: "740");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        (await RefreshAsync()).StatusCode.ShouldBe(HttpStatusCode.OK);

        var kept = await WithDbAsync(db => db.Games.SingleAsync(g => g.Id == mediaId, Ct));
        kept.Title.ShouldBe("Gone Forever");
    }

    private Task<HttpResponseMessage> RefreshAsync() =>
        Client.PostAsync("/api/games/refresh", content: null, Ct);

    private Task<List<string>> GenresOfAsync(int mediaId) => WithDbAsync(db => db.Games
        .Where(game => game.Id == mediaId)
        .Select(game => game.Genres)
        .SingleAsync(Ct));
}
