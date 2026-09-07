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

    [Fact]
    public async Task Asks_for_a_show_by_query_string()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, """{"results":[]}""");

        await CreateClient(stub).SearchTvAsync("breaking bad", 5, Ct);

        var request = stub.Requests.ShouldHaveSingleItem();
        request.Method.ShouldBe(HttpMethod.Get);
        request.Uri!.AbsolutePath.ShouldBe("/3/search/tv");
        request.Uri.Query.ShouldContain("query=breaking%20bad");
        request.Uri.Query.ShouldContain("include_adult=false");
    }

    [Fact]
    public async Task Cuts_the_shows_it_finds_for_the_same_reason_it_cuts_films()
    {
        var results = string.Join(",", Enumerable.Range(1, 20).Select(id =>
            $$"""{"id":{{id}},"name":"Show {{id}}"}"""));

        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, $$"""{"results":[{{results}}]}""");

        (await CreateClient(stub).SearchTvAsync("show", 5, Ct)).Count.ShouldBe(5);
    }

    [Fact]
    public async Task Reads_a_shows_name_and_first_air_date_rather_than_a_films_fields()
    {
        // The one thing about the TV endpoints that is not a copy: a show has `name` and
        // `first_air_date` where a film has `title` and `release_date`. A model that reused the
        // film's property names would deserialise to nulls and say nothing about why.
        const string body = """
            {
              "results": [
                {
                  "id": 1396,
                  "name": "Breaking Bad",
                  "first_air_date": "2008-01-20",
                  "poster_path": "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
                  "genre_ids": [80, 18],
                  "vote_count": 14000
                }
              ]
            }
            """;

        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .SearchTvAsync("breaking bad", 10, Ct);

        var show = found.ShouldHaveSingleItem();
        show.Id.ShouldBe(1396);
        show.Name.ShouldBe("Breaking Bad");
        show.FirstAirDate.ShouldBe("2008-01-20");
        show.PosterPath.ShouldBe("/ggFHVNu6YYI5L9pCfOacjizRGt.jpg");
    }

    [Fact]
    public async Task Asks_for_one_show_without_appending_anything()
    {
        // A film's detail call appends `credits`, because that is where a director hides in a
        // crew list hundreds long. A show's creators and its seasons are on the base response,
        // so appending here would suggest a dependency that does not exist.
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, """{"id":1396,"name":"x"}""");

        await CreateClient(stub).GetTvAsync(1396, Ct);

        var request = stub.Requests.ShouldHaveSingleItem();
        request.Uri!.AbsolutePath.ShouldBe("/3/tv/1396");
        request.Uri.Query.ShouldNotContain("append_to_response");
        request.Uri.Query.ShouldContain("language=en-US");
    }

    [Fact]
    public async Task Reads_everything_one_show_request_answers_with()
    {
        const string body = """
            {
              "id": 1396,
              "name": "Breaking Bad",
              "first_air_date": "2008-01-20",
              "last_air_date": "2013-09-29",
              "status": "Ended",
              "number_of_seasons": 5,
              "number_of_episodes": 62,
              "episode_run_time": [45, 47],
              "genres": [{"id": 80, "name": "Crime"}, {"id": 18, "name": "Drama"}],
              "created_by": [{"id": 66633, "name": "Vince Gilligan"}],
              "seasons": [
                {"season_number": 0, "name": "Specials", "episode_count": 8},
                {"season_number": 1, "name": "Season 1", "episode_count": 7},
                {"season_number": 2, "name": "Season 2", "episode_count": 13}
              ],
              "last_episode_to_air": {"runtime": 55}
            }
            """;

        var show = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .GetTvAsync(1396, Ct);

        show.ShouldNotBeNull();
        show.Name.ShouldBe("Breaking Bad");
        show.LastAirDate.ShouldBe("2013-09-29");
        show.Status.ShouldBe("Ended");
        show.NumberOfSeasons.ShouldBe(5);
        show.NumberOfEpisodes.ShouldBe(62);
        show.EpisodeRunTime.ShouldBe([45, 47]);
        show.Genres!.Select(genre => genre.Name).ShouldBe(["Crime", "Drama"]);
        show.CreatedBy!.Select(creator => creator.Name).ShouldBe(["Vince Gilligan"]);
        show.Seasons!.Select(season => season.SeasonNumber).ShouldBe([0, 1, 2]);
        show.Seasons!.Select(season => season.EpisodeCount).ShouldBe([8, 7, 13]);
        show.LastEpisodeToAir!.Runtime.ShouldBe(55);
    }

    [Fact]
    public async Task Reads_a_show_with_no_episode_run_time_at_all()
    {
        // TMDB has been dropping episode_run_time on newer entries, and an empty array is what
        // that looks like. The client's job is to report it faithfully; the catalog service is
        // what falls back to last_episode_to_air.
        const string body = """
            {
              "id": 95396,
              "name": "Severance",
              "episode_run_time": [],
              "last_episode_to_air": {"runtime": 47}
            }
            """;

        var show = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .GetTvAsync(95396, Ct);

        show!.EpisodeRunTime.ShouldBeEmpty();
        show.LastEpisodeToAir!.Runtime.ShouldBe(47);
    }

    [Fact]
    public async Task Answers_null_for_a_show_tmdb_does_not_know()
    {
        // An answer rather than a failure, exactly as for a film: an id TMDB has never heard of
        // has to be distinguishable from TMDB being down.
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.NotFound));

        (await client.GetTvAsync(999_999, Ct)).ShouldBeNull();
    }

    [Fact]
    public async Task Leaves_anime_off_the_television_board()
    {
        // Anime is its own hobby here, from MAL, one card per cour — so a show that is anime
        // has a board of its own and must not also be findable on this one. The rule is both
        // halves together: Japanese *and* animated. Japanese live-action is not animation and
        // stays; Western animation is not Japanese and stays.
        //
        // Applied to the response rather than to the query, which is the opposite of the rule
        // `docs/games-igdb.md` states for IGDB — and it is not a choice. TMDB's /search/tv
        // accepts only query, first_air_date_year, include_adult, language, page and year:
        // there is no genre, keyword or original-language parameter to ask with.
        const string body = """
            {
              "results": [
                {"id": 1, "name": "Frieren", "original_language": "ja", "genre_ids": [16, 10765]},
                {"id": 2, "name": "Shogun", "original_language": "ja", "genre_ids": [18]},
                {"id": 3, "name": "Bojack Horseman", "original_language": "en", "genre_ids": [16]}
              ]
            }
            """;

        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .SearchTvAsync("anything", 10, Ct);

        found.Select(show => show.Name).ShouldBe(["Shogun", "Bojack Horseman"]);
    }

    [Fact]
    public async Task Drops_anime_before_it_counts_towards_the_limit()
    {
        // Over-fetch and cut, rather than cut and then filter. TMDB pages at twenty and the
        // exclusion is applied to what came back, so filtering *after* Take(limit) would ask
        // for five and show none — a strip that empties itself the closer the search term is to
        // something anime. Filtering first spends the page TMDB already sent.
        var results = string.Join(",", Enumerable.Range(1, 20).Select(id =>
            $$"""{"id":{{id}},"name":"Show {{id}}","original_language":"{{(id <= 10 ? "ja" : "en")}}","genre_ids":[16]}"""));

        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, $$"""{"results":[{{results}}]}""");

        var found = await CreateClient(stub).SearchTvAsync("show", 5, Ct);

        found.Select(show => show.Name)
            .ShouldBe(["Show 11", "Show 12", "Show 13", "Show 14", "Show 15"]);
    }

    private static TmdbClient CreateClient(StubHttpMessageHandler stub) =>
        new(new HttpClient(stub) { BaseAddress = new Uri("https://api.themoviedb.org/3/") },
            NullLogger<TmdbClient>.Instance);
}
