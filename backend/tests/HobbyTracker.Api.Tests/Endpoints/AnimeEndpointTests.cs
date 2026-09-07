using System.Net;
using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Mal;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// <c>/api/anime</c>, the fourth sibling of <c>/api/games</c>, <c>/api/movies</c> and
/// <c>/api/tv</c>.
///
/// The four 404s are now the set worth reading together: each service queries its own derived
/// DbSet, and TPT turns that into an INNER JOIN, so none of them needs a hobby predicate to say
/// a title of another kind is not theirs.
///
/// <b>What is genuinely new here is what is absent.</b> A search fills every column, because
/// MAL's search and detail endpoints answer with the same node — so unlike films and shows,
/// nothing is completed later and there is no <c>IMediaAdded</c> handler at all.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class AnimeEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Searches_mal_and_hands_back_everything_it_stored()
    {
        // Every column in one request, which is the difference from the other three hobbies:
        // TMDB's `/search/*` carries no runtime and names no genre, so a film reaches the board
        // half-known. This asserts the whole row because the whole row genuinely arrives.
        Mal.SetResults(
            "frieren",
            FakeMalClient.Anime(
                52991,
                "Sousou no Frieren",
                englishTitle: "Frieren: Beyond Journey's End",
                picture: "https://cdn.myanimelist.net/images/anime/1015/138006.jpg",
                mediaType: "tv",
                episodes: 28,
                episodeSeconds: 1470,
                season: "fall",
                year: 2023,
                status: "finished_airing",
                source: "manga",
                mean: 9.25,
                genres: ["Adventure", "Drama", "Fantasy"],
                studios: ["Madhouse"]));

        var response = await Client.GetAsync("/api/anime?search=frieren", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var found = (await ReadAsync<List<AnimeDto>>(response)).ShouldHaveSingleItem();

        found.Title.ShouldBe("Sousou no Frieren");
        found.EnglishTitle.ShouldBe("Frieren: Beyond Journey's End");
        found.CoverUrl.ShouldBe("https://cdn.myanimelist.net/images/anime/1015/138006.jpg");
        found.MediaType.ShouldBe("tv");
        found.EpisodeCount.ShouldBe(28);
        found.EpisodeRuntimeSeconds.ShouldBe(1470);
        found.StartSeason.ShouldBe("fall");
        found.StartYear.ShouldBe(2023);
        found.AirStatus.ShouldBe("finished_airing");
        found.SourceMaterial.ShouldBe("manga");
        found.Genres.ShouldBe(["Adventure", "Drama", "Fantasy"]);
        found.Studios.ShouldBe(["Madhouse"]);
        found.MeanScore.ShouldBe(9.25m);
        found.ExternalId.ShouldBe("52991");

        // Guards SeedData.Sources.NameFor: a source row without a matching arm answers "unknown"
        // on every DTO that names it, and nothing errors.
        found.Source.ShouldBe("mal");
    }

    [Fact]
    public async Task Stores_an_unaired_cour_as_unknown_rather_than_as_nothing()
    {
        // MAL answers 0 for an entry that has not aired — Frieren's announced 2027 cour does —
        // and 0 means unknown rather than none. Stored as nought it would claim a cour with no
        // episodes in it, which ck_anime_counts_positive refuses outright: an ordinary search
        // would become a 500 rather than a card with a blank badge.
        Mal.SetResults(
            "ougonkyou",
            FakeMalClient.Anime(
                60815, "Sousou no Frieren: Ougonkyou-hen", episodes: 0, episodeSeconds: 0));

        var response = await Client.GetAsync("/api/anime?search=ougonkyou", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var found = (await ReadAsync<List<AnimeDto>>(response)).ShouldHaveSingleItem();
        found.EpisodeCount.ShouldBeNull();
        found.EpisodeRuntimeSeconds.ShouldBeNull();
    }

    [Fact]
    public async Task Stores_no_mean_score_for_an_entry_nobody_has_rated()
    {
        // The same nought, on the other column MAL uses it for.
        Mal.SetResults("unrated", FakeMalClient.Anime(1, "Nobody Has Rated This", mean: 0));

        var response = await Client.GetAsync("/api/anime?search=unrated", Ct);

        (await ReadAsync<List<AnimeDto>>(response)).ShouldHaveSingleItem().MeanScore.ShouldBeNull();
    }

    [Fact]
    public async Task Puts_the_cour_you_meant_first()
    {
        // MAL's own order, measured live: `frier` returns 2nd Season above season one. The
        // ordering is decided on what MAL said rather than on what happens to be stored, which
        // is why the assertion is about the response and not about the table.
        Mal.SetResults(
            "frier",
            FakeMalClient.Anime(59978, "Sousou no Frieren 2nd Season", users: 607_257),
            FakeMalClient.Anime(52991, "Sousou no Frieren", users: 1_511_281));

        var found = await ReadAsync<List<AnimeDto>>(await Client.GetAsync("/api/anime?search=frier", Ct));

        found.Select(anime => anime.Title).ShouldBe(
            ["Sousou no Frieren", "Sousou no Frieren 2nd Season"]);
    }

    [Fact]
    public async Task Refuses_a_blank_search_without_spending_a_request()
    {
        var response = await Client.GetAsync("/api/anime?search=%20%20", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        Mal.Calls.ShouldBeEmpty();
    }

    [Fact]
    public async Task Turns_a_mal_failure_into_a_502_without_leaking_the_client_id()
    {
        Mal.ThrowOnNextCall = new MalException("MAL anime returned 401: invalid client id abc123");

        var response = await Client.GetAsync("/api/anime?search=frieren", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadGateway);

        var body = await response.Content.ReadAsStringAsync(Ct);
        body.ShouldContain("Upstream metadata provider failed");
        body.ShouldNotContain("abc123");
    }

    [Fact]
    public async Task A_show_is_not_found_under_the_anime_route()
    {
        // TPT's INNER JOIN doing the work: `db.Anime` cannot see a row with no anime table
        // behind it, so this needs no hobby predicate to be correct.
        var mediaId = await GivenShowAsync("Severance", externalId: "95396");

        (await Client.GetAsync($"/api/anime/{mediaId}", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Reads_one_anime_with_every_pass_of_yours_against_it()
    {
        var mediaId = await GivenAnimeAsync(
            "Sousou no Frieren", englishTitle: "Frieren: Beyond Journey's End", studios: ["Madhouse"]);

        await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        var detail = await ReadAsync<AnimeDetailDto>(
            await Client.GetAsync($"/api/anime/{mediaId}", Ct));

        detail.Title.ShouldBe("Sousou no Frieren");
        detail.EnglishTitle.ShouldBe("Frieren: Beyond Journey's End");
        detail.Studios.ShouldBe(["Madhouse"]);
        detail.LogEntries.Count.ShouldBe(2);

        // Newest first, the same rule the board decides which pass is current by.
        detail.LogEntries[0].Status.ShouldBe(LogStatus.InProgress);
    }

    [Fact]
    public async Task Sees_only_your_own_passes()
    {
        var mediaId = await GivenAnimeAsync();
        var stranger = await GivenUserAsync("Somebody Else");

        await GivenLogEntryAsync(mediaId, LogStatus.Completed, userId: stranger);

        var detail = await ReadAsync<AnimeDetailDto>(
            await Client.GetAsync($"/api/anime/{mediaId}", Ct));

        detail.LogEntries.ShouldBeEmpty();
    }

    [Fact]
    public async Task Chooses_which_genre_stands_for_a_title()
    {
        var mediaId = await GivenAnimeAsync(genres: ["Adventure", "Fantasy"]);

        var updated = await ReadAsync<AnimeDetailDto>(await Client.PutAsJsonAsync(
            $"/api/anime/{mediaId}/genre", new SetAnimeGenreRequest("Fantasy"), Json, Ct));

        updated.PrimaryGenre.ShouldBe("Fantasy");

        // Blank clears it back to the automatic pick, which is what null means in the column.
        var cleared = await ReadAsync<AnimeDetailDto>(await Client.PutAsJsonAsync(
            $"/api/anime/{mediaId}/genre", new SetAnimeGenreRequest("   "), Json, Ct));

        cleared.PrimaryGenre.ShouldBeNull();
    }

    [Fact]
    public async Task Refreshes_only_the_titles_somebody_has_logged()
    {
        // `media` accumulates everything ever typed into a search box, so a refresh that touched
        // all of it would spend a request per stranger's half-typed guess. The join to
        // log_entries is what makes this the library rather than the catalogue.
        var logged = await GivenAnimeAsync("Sousou no Frieren", externalId: "52991");
        await GivenAnimeAsync("Merely Searched For", externalId: "1");
        await GivenLogEntryAsync(logged, LogStatus.InProgress);

        Mal.ById[52991] = FakeMalClient.Anime(52991, "Sousou no Frieren", episodes: 28);

        var refreshed = await ReadAsync<RefreshResult>(
            await Client.PostAsync("/api/anime/refresh", null, Ct));

        refreshed.Refreshed.ShouldBe(1);
        Mal.IdLookups.ShouldBe([52991]);

        (await WithDbAsync(db => db.Anime.SingleAsync(one => one.Id == logged, Ct)))
            .EpisodeCount.ShouldBe(28);
    }

    [Fact]
    public async Task A_refresh_leaves_the_genre_you_chose_alone()
    {
        // The one field on a title that is yours rather than MAL's, exactly as on a game, a film
        // and a show. A maintenance route nobody ran deliberately should not undo a decision
        // somebody made.
        var mediaId = await GivenAnimeAsync(externalId: "52991", genres: ["Adventure", "Fantasy"]);
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        await Client.PutAsJsonAsync(
            $"/api/anime/{mediaId}/genre", new SetAnimeGenreRequest("Fantasy"), Json, Ct);

        Mal.ById[52991] = FakeMalClient.Anime(
            52991, "Sousou no Frieren", genres: ["Adventure", "Drama", "Fantasy"]);

        await Client.PostAsync("/api/anime/refresh", null, Ct);

        var after = await WithDbAsync(db => db.Anime.SingleAsync(one => one.Id == mediaId, Ct));
        after.PrimaryGenre.ShouldBe("Fantasy");
        after.Genres.ShouldBe(["Adventure", "Drama", "Fantasy"]);
    }

    [Fact]
    public async Task A_refresh_keeps_a_title_mal_has_forgotten()
    {
        // A withdrawn entry is an answer rather than an outage, so the row stays as it was
        // rather than being blanked over somebody else's record going away.
        var mediaId = await GivenAnimeAsync("Sousou no Frieren", externalId: "52991", episodeCount: 28);
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        var refreshed = await ReadAsync<RefreshResult>(
            await Client.PostAsync("/api/anime/refresh", null, Ct));

        refreshed.Refreshed.ShouldBe(0);

        var after = await WithDbAsync(db => db.Anime.SingleAsync(one => one.Id == mediaId, Ct));
        after.Title.ShouldBe("Sousou no Frieren");
        after.EpisodeCount.ShouldBe(28);
    }

    [Fact]
    public async Task Every_route_needs_somebody_signed_in()
    {
        var mediaId = await GivenAnimeAsync();

        (await AnonymousClient.GetAsync("/api/anime?search=frieren", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        (await AnonymousClient.GetAsync($"/api/anime/{mediaId}", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        (await AnonymousClient.PostAsync("/api/anime/refresh", null, Ct))
            .StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }
}
