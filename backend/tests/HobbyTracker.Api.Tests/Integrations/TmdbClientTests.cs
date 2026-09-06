using System.Net.Http;
using HobbyTracker.Api.Integrations.Tmdb;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;

namespace HobbyTracker.Api.Tests.Integrations;

/// <summary>
/// The TMDB boundary, with no network and no container.
///
/// Where IgdbClient posts APIcalypse in a body, this is an ordinary GET with a query string —
/// so what these assert on is <c>request.Uri.Query</c> rather than <c>request.Body</c>. The
/// bearer is deliberately absent from them: it is a static token set once on the typed client
/// in Program.cs rather than something this class attaches per request, so a unit test here
/// could only assert that a handler it constructed itself did what it was told. The e2e stub
/// refuses a request without it instead, which is a claim about the real wiring.
/// </summary>
public sealed class TmdbClientTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Asks_for_a_title_by_query_string()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, """{"results":[]}""");

        await CreateClient(stub).SearchMoviesAsync("arrival", 5, Ct);

        var request = stub.Requests.ShouldHaveSingleItem();
        request.Method.ShouldBe(HttpMethod.Get);
        request.Uri!.AbsolutePath.ShouldBe("/3/search/movie");
        request.Uri.Query.ShouldContain("query=arrival");

        // Stated rather than left to the default, which TMDB is free to change and which is
        // not the sort of thing to discover from a search result on somebody's board.
        request.Uri.Query.ShouldContain("include_adult=false");
    }

    [Fact]
    public async Task Cuts_the_results_itself_because_tmdb_has_no_limit()
    {
        // TMDB pages at twenty and takes no count. The cut has to happen here, or every caller
        // has to remember to do it and one of them will not.
        var results = string.Join(",", Enumerable.Range(1, 20).Select(id =>
            $$"""{"id":{{id}},"title":"Film {{id}}"}"""));

        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, $$"""{"results":[{{results}}]}""");

        (await CreateClient(stub).SearchMoviesAsync("film", 5, Ct)).Count.ShouldBe(5);
    }

    [Fact]
    public async Task Parses_tmdbs_snake_case_json()
    {
        const string body = """
            {
              "results": [
                {
                  "id": 329865,
                  "title": "Arrival",
                  "release_date": "2016-11-10",
                  "poster_path": "/hLudzvGfpi6JlwUnsNhXwKKg4j.jpg",
                  "genre_ids": [878, 18],
                  "vote_count": 15000
                }
              ]
            }
            """;

        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .SearchMoviesAsync("arrival", 10, Ct);

        var movie = found.ShouldHaveSingleItem();
        movie.Id.ShouldBe(329865);
        movie.Title.ShouldBe("Arrival");

        // The naming policy is what turns release_date into ReleaseDate and poster_path into
        // PosterPath. Without it these deserialize as null and say nothing about it.
        movie.ReleaseDate.ShouldBe("2016-11-10");
        movie.PosterPath.ShouldBe("/hLudzvGfpi6JlwUnsNhXwKKg4j.jpg");
    }

    [Fact]
    public async Task Reads_a_films_runtime_genres_and_director_from_one_request()
    {
        // Everything a card and a drawer need, in the one call that has them: /search/movie
        // carries no runtime and names no genre, only ids. Asking for credits alongside is what
        // keeps this from being two round trips per title.
        const string body = """
            {
              "id": 329865,
              "title": "Arrival",
              "release_date": "2016-11-10",
              "runtime": 116,
              "genres": [ { "id": 878, "name": "Science Fiction" }, { "id": 18, "name": "Drama" } ],
              "credits": {
                "crew": [
                  { "job": "Director", "name": "Denis Villeneuve" },
                  { "job": "Editor", "name": "Joe Walker" }
                ]
              }
            }
            """;

        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, body);
        var movie = await CreateClient(stub).GetMovieAsync(329865, Ct);

        stub.Requests.ShouldHaveSingleItem().Uri!.Query.ShouldContain("append_to_response=credits");

        movie.ShouldNotBeNull();
        movie.Runtime.ShouldBe(116);
        movie.Genres!.Select(genre => genre.Name).ShouldBe(["Science Fiction", "Drama"]);
        movie.Credits!.Crew!.Single(member => member.Job == "Director").Name
            .ShouldBe("Denis Villeneuve");
    }

    [Fact]
    public async Task Answers_nothing_for_a_film_tmdb_does_not_know()
    {
        // A 404 here is an answer, not a failure: it means the id is wrong, which is a thing
        // the caller can act on. Wrapping it as an exception would make a stale id look like an
        // outage.
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.NotFound, "{}"));

        (await client.GetMovieAsync(1, Ct)).ShouldBeNull();
    }

    [Fact]
    public async Task Surfaces_tmdb_errors_with_their_body()
    {
        var client = CreateClient(StubHttpMessageHandler.Always(
            HttpStatusCode.Unauthorized, """{"status_message":"Invalid API key"}"""));

        var exception = await Should.ThrowAsync<TmdbException>(
            () => client.SearchMoviesAsync("arrival", 10, Ct));

        exception.Message.ShouldContain("401");
        exception.Message.ShouldContain("Invalid API key");
    }

    [Fact]
    public async Task Names_the_rate_limit_explicitly()
    {
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.TooManyRequests));

        var exception = await Should.ThrowAsync<TmdbException>(
            () => client.SearchMoviesAsync("arrival", 10, Ct));

        exception.Message.ShouldContain("rate limit");
    }

    [Fact]
    public async Task Wraps_unparseable_responses()
    {
        // A raw JsonException escaping here would surface as a 500; TmdbException makes it a 502.
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, "not json at all"));

        await Should.ThrowAsync<TmdbException>(() => client.SearchMoviesAsync("arrival", 10, Ct));
    }

    private static TmdbClient CreateClient(StubHttpMessageHandler stub) =>
        new(new HttpClient(stub) { BaseAddress = new Uri("https://api.themoviedb.org/3/") },
            NullLogger<TmdbClient>.Instance);
}
