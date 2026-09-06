using System.Net;
using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Tmdb;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// <c>/api/movies</c>, which is <c>/api/games</c>'s sibling rather than its generalisation.
///
/// The pair worth reading together is the two 404s: a film is not found under
/// <c>/api/games/{id}</c> and a game is not found under <c>/api/movies/{id}</c>, both because
/// each service queries its own derived DbSet and TPT turns that into an INNER JOIN. Neither
/// needs a hobby predicate to say so.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class MoviesEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Searches_tmdb_and_hands_back_what_it_stored()
    {
        Tmdb.SetResults("arrival",
            FakeTmdbClient.Movie(329865, "Arrival", "2016-11-10", "/poster.jpg"));

        var response = await Client.GetAsync("/api/movies?search=arrival", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var movie = (await ReadAsync<List<MovieDto>>(response)).ShouldHaveSingleItem();
        movie.Title.ShouldBe("Arrival");
        movie.ReleaseYear.ShouldBe(2016);

        // Not "unknown", which is what SeedData.Sources.NameFor answers for a source it has no
        // arm for — a row seeded without the arm would say that and nothing would error.
        movie.Source.ShouldBe("tmdb");
    }

    [Fact]
    public async Task Refuses_an_empty_search_without_asking_tmdb()
    {
        // The guard is here rather than in the service for GamesController's reason: a blank
        // term is the caller's mistake, and asking upstream about nothing spends a request to
        // find that out.
        var response = await Client.GetAsync("/api/movies?search=%20%20", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        Tmdb.Calls.ShouldBeEmpty();
    }

    [Fact]
    public async Task Reports_tmdb_failure_as_502_without_leaking_the_cause()
    {
        Tmdb.ThrowOnNextCall = new TmdbException(
            """TMDB search/movie returned 401: {"status_message":"Invalid API key: abcd1234"}""");

        var response = await Client.GetAsync("/api/movies?search=arrival", Ct);

        // 502 rather than 500: the upstream provider is unhappy, this API is fine.
        response.StatusCode.ShouldBe(HttpStatusCode.BadGateway);

        var body = await response.Content.ReadAsStringAsync(Ct);
        body.ShouldContain("Upstream metadata provider failed");

        // TMDB's raw error text belongs in the log, not in a client response — and this one has
        // a token in it.
        body.ShouldNotContain("abcd1234");
    }

    [Fact]
    public async Task Detail_404s_for_media_that_is_not_a_movie()
    {
        var gameId = await GivenGameAsync("Hollow Knight");

        var response = await Client.GetAsync($"/api/movies/{gameId}", Ct);

        // The row exists in media but has no movies detail. Querying the derived DbSet under TPT
        // is what filters it out; querying Media would wrongly return it with everything blank.
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Detail_carries_the_film_and_every_pass_of_yours()
    {
        var mediaId = await GivenMovieAsync(
            "Arrival", externalId: "329865", runtimeMinutes: 116,
            genres: ["Science Fiction"], directors: ["Denis Villeneuve"]);

        await GivenLogEntryAsync(mediaId, LogStatus.Completed, rating: 9m);

        var detail = await ReadAsync<MovieDetailDto>(
            await Client.GetAsync($"/api/movies/{mediaId}", Ct));

        detail.RuntimeMinutes.ShouldBe(116);
        detail.Directors.ShouldBe(["Denis Villeneuve"]);
        detail.LogEntries.ShouldHaveSingleItem().Rating.ShouldBe(9m);
    }

    [Fact]
    public async Task Adding_a_film_to_the_board_fills_in_what_a_search_could_not()
    {
        // The whole reason enrichment exists, proved through the wiring rather than against the
        // service: /search/movie carries no runtime and names no genre, so a card added from a
        // search would have neither until something asked. IMediaAdded is what asks.
        Tmdb.SetResults("arrival", FakeTmdbClient.Movie(329865, "Arrival", "2016-11-10"));
        Tmdb.ById[329865] = FakeTmdbClient.Detail(
            329865, "Arrival", runtime: 116, genres: ["Science Fiction"],
            directors: ["Denis Villeneuve"]);

        var found = await ReadAsync<List<MovieDto>>(
            await Client.GetAsync("/api/movies?search=arrival", Ct));

        var mediaId = found.ShouldHaveSingleItem().Id;

        var created = await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, LogStatus.Backlog, null, null, null, null, null),
            Json,
            Ct);

        created.StatusCode.ShouldBe(HttpStatusCode.Created);

        // Synchronously, unlike HowLongToBeat's queue: TMDB answers in one fast request, so the
        // card is complete the moment it lands and nothing has to poll for it.
        var movie = await WithDbAsync(db => db.Movies.SingleAsync(m => m.Id == mediaId, Ct));
        movie.RuntimeMinutes.ShouldBe(116);
        movie.Genres.ShouldBe(["Science Fiction"]);
        movie.Directors.ShouldBe(["Denis Villeneuve"]);
    }

    [Fact]
    public async Task Adding_a_game_asks_tmdb_nothing()
    {
        var mediaId = await GivenGameAsync("Hollow Knight");

        await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, LogStatus.Backlog, null, null, null, null, null),
            Json,
            Ct);

        // Every handler hears about every title; declining is each one's own business. This is
        // the half of that rule facing the other way from the HowLongToBeat one.
        Tmdb.IdLookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task Choosing_the_genre_that_colours_a_card()
    {
        var mediaId = await GivenMovieAsync(
            "Arrival", externalId: "329865", genres: ["Science Fiction", "Drama"]);

        var response = await Client.PutAsJsonAsync(
            $"/api/movies/{mediaId}/genre", new SetMovieGenreRequest("Drama"), Json, Ct);

        (await ReadAsync<MovieDetailDto>(response)).PrimaryGenre.ShouldBe("Drama");

        // And blank takes the choice back rather than storing an empty string, which would be a
        // third state nothing understands.
        var cleared = await Client.PutAsJsonAsync(
            $"/api/movies/{mediaId}/genre", new SetMovieGenreRequest(null), Json, Ct);

        (await ReadAsync<MovieDetailDto>(cleared)).PrimaryGenre.ShouldBeNull();
    }

    [Fact]
    public async Task The_refresh_only_touches_films_somebody_has_logged()
    {
        // The catalogue accumulates whatever anybody typed into a search box; the library is
        // what people actually recorded something about. Re-fetching the former would spend
        // TMDB requests on films nobody kept.
        var logged = await GivenMovieAsync("Arrival", externalId: "329865");
        await GivenMovieAsync("Never Logged", externalId: "111");
        await GivenLogEntryAsync(logged, LogStatus.Backlog);

        Tmdb.ById[329865] = FakeTmdbClient.Detail(329865, "Arrival", runtime: 116);
        Tmdb.ById[111] = FakeTmdbClient.Detail(111, "Never Logged", runtime: 90);

        var result = await ReadAsync<RefreshResult>(
            await Client.PostAsync("/api/movies/refresh", null, Ct));

        result.Refreshed.ShouldBe(1);
        Tmdb.IdLookups.ShouldBe([329865]);
    }
}
