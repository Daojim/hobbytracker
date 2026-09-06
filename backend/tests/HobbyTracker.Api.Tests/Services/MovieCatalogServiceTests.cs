using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Tmdb;
using HobbyTracker.Api.Services;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// TMDB into the database: the same upsert GameCatalogService does, against the same partial
/// unique index, and the enrichment that has no counterpart there because IGDB answers
/// everything in one request and TMDB does not.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class MovieCatalogServiceTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Stores_what_a_search_returns()
    {
        Tmdb.SetResults("arrival",
            FakeTmdbClient.Movie(329865, "Arrival", "2016-11-10", "/poster.jpg"));

        await SearchAsync("arrival");

        var movie = await WithDbAsync(db => db.Movies.SingleAsync(Ct));

        movie.Title.ShouldBe("Arrival");
        movie.ExternalId.ShouldBe("329865");
        movie.HobbyId.ShouldBe(SeedData.Hobbies.Movies);
        movie.SourceId.ShouldBe(SeedData.Sources.Tmdb);
        movie.ReleaseYear.ShouldBe(2016);

        // Composed from poster_path, not echoed: TMDB serves one asset at many widths and the
        // width is in the path, so a stored URL would bake today's choice into the database.
        movie.CoverUrl.ShouldBe("https://image.tmdb.org/t/p/w342/poster.jpg");
    }

    [Fact]
    public async Task Leaves_runtime_and_genres_for_the_detail_call()
    {
        // Not an omission — /search/movie carries neither. Saying so out loud, because a card
        // with no stripe and no length looks like a bug until you know it is the endpoint.
        Tmdb.SetResults("arrival", FakeTmdbClient.Movie(329865, "Arrival", "2016-11-10"));

        await SearchAsync("arrival");

        var movie = await WithDbAsync(db => db.Movies.SingleAsync(Ct));
        movie.RuntimeMinutes.ShouldBeNull();
        movie.Genres.ShouldBeEmpty();
        movie.Directors.ShouldBeEmpty();
    }

    [Fact]
    public async Task Fills_a_film_in_when_it_reaches_the_board()
    {
        var mediaId = await GivenMovieAsync("Arrival", externalId: "329865");
        Tmdb.ById[329865] = FakeTmdbClient.Detail(
            329865, "Arrival", runtime: 116, genres: ["Science Fiction", "Drama"],
            directors: ["Denis Villeneuve"]);

        (await EnrichAsync(mediaId)).ShouldBeTrue();

        var movie = await MovieAsync(mediaId);
        movie.RuntimeMinutes.ShouldBe(116);
        movie.Genres.ShouldBe(["Science Fiction", "Drama"]);

        // Filtered on the job rather than taken off the front: a real crew list is dozens long
        // and the director is nowhere near the top of it.
        movie.Directors.ShouldBe(["Denis Villeneuve"]);
    }

    [Fact]
    public async Task Refuses_a_runtime_of_nought_rather_than_storing_it()
    {
        // TMDB says 0 for a film nobody has filled the runtime in for. The column would refuse
        // it, so mapping it through would be a 500 on an add — and the honest reading is that
        // there is no runtime, which is what null already means.
        var mediaId = await GivenMovieAsync("Some Short", externalId: "1");
        Tmdb.ById[1] = FakeTmdbClient.Detail(1, "Some Short", runtime: 0);

        await EnrichAsync(mediaId);

        (await MovieAsync(mediaId)).RuntimeMinutes.ShouldBeNull();
    }

    [Fact]
    public async Task Says_nothing_happened_for_a_media_id_that_is_not_a_film()
    {
        // What keeps IMediaAdded safe: every handler is told about every title, and each one
        // declines what is not its own. HltbOnMediaAdded declines by hobby; this declines by
        // finding no row, which is the same answer one step later.
        var gameId = await GivenGameAsync("Hollow Knight");

        (await EnrichAsync(gameId)).ShouldBeFalse();
        Tmdb.IdLookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task Concurrent_identical_searches_do_not_create_duplicates()
    {
        Tmdb.SetResults("arrival",
            FakeTmdbClient.Movie(329865, "Arrival"),
            FakeTmdbClient.Movie(9999, "Arrival of a Train"));

        // Each task needs its own DbContext; a shared one is not thread-safe. Whichever loses
        // the race hits the partial unique index on (source_id, external_id), gets a 23505, and
        // re-reads rather than writing a duplicate or surfacing a 500. The index has been there
        // since the first migration — this is the day it starts covering two sources.
        var searches = Enumerable.Range(0, 5).Select(async _ =>
        {
            await using var db = Postgres.CreateDbContext();
            return await CreateService(db).SearchAsync("arrival", null, Ct);
        });

        var results = await Task.WhenAll(searches);

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(2);
        results.ShouldAllBe(r => r.Count == 2);
    }

    [Fact]
    public async Task Searching_twice_updates_rather_than_inserting()
    {
        Tmdb.SetResults("arrival", FakeTmdbClient.Movie(329865, "Arrival", "2016-11-10"));
        await SearchAsync("arrival");

        Tmdb.SetResults("arrival", FakeTmdbClient.Movie(329865, "Arrival (2016)", "2016-11-10"));
        await SearchAsync("arrival");

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(1);
        (await WithDbAsync(db => db.Movies.SingleAsync(Ct))).Title.ShouldBe("Arrival (2016)");
    }

    [Fact]
    public async Task A_refresh_leaves_the_genre_you_chose_alone()
    {
        // The chosen genre is the one field on a film that is the user's rather than TMDB's,
        // exactly as it is on a game. A refresh that overwrote it would undo a decision with a
        // maintenance route nobody ran deliberately.
        var mediaId = await GivenMovieAsync("Arrival", externalId: "329865");
        await WithDbAsync(async db =>
        {
            var movie = await db.Movies.SingleAsync(m => m.Id == mediaId, Ct);
            movie.PrimaryGenre = "Drama";
            await db.SaveChangesAsync(Ct);
        });

        Tmdb.ById[329865] = FakeTmdbClient.Detail(
            329865, "Arrival", runtime: 116, genres: ["Science Fiction"]);

        await EnrichAsync(mediaId);

        var after = await MovieAsync(mediaId);
        after.PrimaryGenre.ShouldBe("Drama");
        after.Genres.ShouldBe(["Science Fiction"]);
    }

    private async Task<IReadOnlyList<Api.Contracts.MovieDto>> SearchAsync(
        string search, int? limit = null)
    {
        await using var db = Postgres.CreateDbContext();
        return await CreateService(db).SearchAsync(search, limit, Ct);
    }

    private async Task<bool> EnrichAsync(int mediaId)
    {
        await using var db = Postgres.CreateDbContext();
        return await CreateService(db).EnrichAsync(mediaId, Ct);
    }

    private Task<Movie> MovieAsync(int mediaId) =>
        WithDbAsync(db => db.Movies.SingleAsync(movie => movie.Id == mediaId, Ct));

    private MovieCatalogService CreateService(HobbyTrackerDbContext db) => new(
        db,
        Tmdb,
        Options.Create(new TmdbOptions { AccessToken = "token" }),
        NullLogger<MovieCatalogService>.Instance,
        new FakeCurrentUser(UserId));
}
