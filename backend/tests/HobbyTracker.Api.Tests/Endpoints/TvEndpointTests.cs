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
/// <c>/api/tv</c>, the third sibling of <c>/api/games</c> and <c>/api/movies</c>.
///
/// The three 404s are now the set worth reading together: each service queries its own derived
/// DbSet, and TPT turns that into an INNER JOIN, so none of them needs a hobby predicate to say
/// a title of another kind is not theirs.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class TvEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Searches_tmdb_and_hands_back_what_it_stored()
    {
        Tmdb.SetTvResults(
            "breaking bad",
            FakeTmdbClient.Show(1396, "Breaking Bad", "2008-01-20", "/poster.jpg"));

        var response = await Client.GetAsync("/api/tv?search=breaking%20bad", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var found = (await ReadAsync<List<TvShowDto>>(response)).ShouldHaveSingleItem();

        found.Title.ShouldBe("Breaking Bad");
        found.FirstAirYear.ShouldBe(2008);
        found.ExternalId.ShouldBe("1396");

        // Guards SeedData.Sources.NameFor: a source row without a matching arm answers "unknown"
        // on every DTO that names it, and nothing errors.
        found.Source.ShouldBe("tmdb-tv");
    }

    [Fact]
    public async Task Refuses_a_blank_search_without_spending_a_request()
    {
        var response = await Client.GetAsync("/api/tv?search=%20%20", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        Tmdb.TvCalls.ShouldBeEmpty();
    }

    [Fact]
    public async Task Turns_a_tmdb_failure_into_a_502_without_leaking_the_token()
    {
        Tmdb.ThrowOnNextCall = new TmdbException("TMDB /search/tv returned 401: bad token");

        var response = await Client.GetAsync("/api/tv?search=breaking%20bad", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadGateway);

        var body = await response.Content.ReadAsStringAsync(Ct);
        body.ShouldContain("Upstream metadata provider failed");
        body.ShouldNotContain("bad token");
    }

    [Fact]
    public async Task A_film_is_not_found_under_the_tv_route()
    {
        var mediaId = await GivenMovieAsync("Arrival", externalId: "329865");

        (await Client.GetAsync($"/api/tv/{mediaId}", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Adding_a_show_to_the_board_fills_in_what_a_search_could_not()
    {
        // The whole reason enrichment exists, proved through the wiring rather than against the
        // service. It matters more for a show than for a film: the seasons arrive on this call,
        // and the journal's episode dropdown is built from them.
        Tmdb.SetTvResults("breaking bad", FakeTmdbClient.Show(1396, "Breaking Bad", "2008-01-20"));
        Tmdb.TvById[1396] = FakeTmdbClient.ShowDetail(
            1396,
            "Breaking Bad",
            lastAirDate: "2013-09-29",
            status: "Ended",
            seasons: 5,
            episodes: 62,
            episodeRunTime: [45],
            genres: ["Crime", "Drama"],
            creators: ["Vince Gilligan"],
            seasonList: [(1, 7, "Season 1"), (2, 13, "Season 2")]);

        var found = await ReadAsync<List<TvShowDto>>(
            await Client.GetAsync("/api/tv?search=breaking%20bad", Ct));

        var mediaId = found.ShouldHaveSingleItem().Id;

        var created = await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, LogStatus.Backlog, null, null, null, null, null),
            Json,
            Ct);

        created.StatusCode.ShouldBe(HttpStatusCode.Created);

        var show = await WithDbAsync(db => db.TvShows
            .Include(candidate => candidate.Seasons)
            .SingleAsync(candidate => candidate.Id == mediaId, Ct));

        show.NumberOfEpisodes.ShouldBe(62);
        show.EpisodeRuntimeMinutes.ShouldBe(45);
        show.AirStatus.ShouldBe("Ended");
        show.LastAirYear.ShouldBe(2013);
        show.Creators.ShouldBe(["Vince Gilligan"]);
        show.Seasons.Count.ShouldBe(2);
    }

    [Fact]
    public async Task Adding_a_film_asks_the_tv_endpoint_nothing()
    {
        var mediaId = await GivenMovieAsync("Arrival", externalId: "329865");

        await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, LogStatus.Backlog, null, null, null, null, null),
            Json,
            Ct);

        // Every handler hears about every title and declines what is not its own.
        Tmdb.TvIdLookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task A_show_from_another_source_is_left_alone()
    {
        // The clause that keeps a second provider additive. A show whose ids come from somewhere
        // other than TMDB must not be handed to TMDB's enricher, which would answer about
        // whichever show happens to hold that id there and overwrite the row with it.
        var mediaId = await WithDbAsync(async db =>
        {
            var show = new TvShow
            {
                HobbyId = SeedData.Hobbies.Tv,
                SourceId = SeedData.Sources.Manual,
                ExternalId = "1396",
                Title = "Something Entered By Hand",
            };

            db.TvShows.Add(show);
            await db.SaveChangesAsync(Ct);
            return show.Id;
        });

        await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, LogStatus.Backlog, null, null, null, null, null),
            Json,
            Ct);

        Tmdb.TvIdLookups.ShouldBeEmpty();
        (await WithDbAsync(db => db.TvShows.SingleAsync(Ct))).Title.ShouldBe("Something Entered By Hand");
    }

    [Fact]
    public async Task The_detail_route_carries_the_seasons_in_order()
    {
        Tmdb.SetTvResults("breaking bad", FakeTmdbClient.Show(1396, "Breaking Bad"));
        Tmdb.TvById[1396] = FakeTmdbClient.ShowDetail(
            1396,
            "Breaking Bad",
            seasonList: [(2, 13, "Season 2"), (0, 8, "Specials"), (1, 7, "Season 1")]);

        var found = await ReadAsync<List<TvShowDto>>(
            await Client.GetAsync("/api/tv?search=breaking%20bad", Ct));

        var mediaId = found.ShouldHaveSingleItem().Id;

        await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, LogStatus.Backlog, null, null, null, null, null),
            Json,
            Ct);

        var detail = await ReadAsync<TvShowDetailDto>(await Client.GetAsync($"/api/tv/{mediaId}", Ct));

        // Lowest first, so Specials leads and the journal's dropdown reads in the order a person
        // expects rather than in whatever order TMDB happened to send.
        detail.Seasons.Select(season => season.SeasonNumber).ShouldBe([0, 1, 2]);
        detail.Seasons.Select(season => season.EpisodeCount).ShouldBe([8, 7, 13]);
        detail.Seasons[0].Name.ShouldBe("Specials");
    }

    [Fact]
    public async Task Setting_and_clearing_the_genre_a_show_is_painted_as()
    {
        var mediaId = await GivenShowAsync("Breaking Bad", genres: ["Crime", "Drama"]);

        var set = await Client.PutAsJsonAsync(
            $"/api/tv/{mediaId}/genre", new SetTvGenreRequest("Drama"), Json, Ct);

        set.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await ReadAsync<TvShowDetailDto>(set)).PrimaryGenre.ShouldBe("Drama");

        var cleared = await Client.PutAsJsonAsync(
            $"/api/tv/{mediaId}/genre", new SetTvGenreRequest(null), Json, Ct);

        (await ReadAsync<TvShowDetailDto>(cleared)).PrimaryGenre.ShouldBeNull();
    }

    [Fact]
    public async Task Refreshing_only_touches_shows_somebody_logged()
    {
        var logged = await GivenShowAsync("Breaking Bad", externalId: "1396");
        await GivenShowAsync("Severance", externalId: "95396");

        await GivenLogEntryAsync(logged, LogStatus.InProgress);

        Tmdb.TvById[1396] = FakeTmdbClient.ShowDetail(1396, "Breaking Bad", episodes: 62);

        var response = await Client.PostAsync("/api/tv/refresh", null, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await ReadAsync<RefreshResult>(response)).Refreshed.ShouldBe(1);
        Tmdb.TvIdLookups.ShouldBe([1396]);
    }
}
