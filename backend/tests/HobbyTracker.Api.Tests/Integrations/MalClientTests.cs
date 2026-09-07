using System.Net.Http;
using HobbyTracker.Api.Integrations.Mal;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;

namespace HobbyTracker.Api.Tests.Integrations;

/// <summary>
/// The MAL boundary, with no network and no container.
///
/// <see cref="TmdbClientTests"/>'s shape, because MAL is TMDB's shape: an ordinary GET with a
/// query string and a credential that never expires. The credential is a header rather than a
/// bearer and it is absent from these tests for TMDB's reason — it is set once on the typed
/// client in Program.cs, so a unit test here could only assert that a client it configured
/// itself did what it was told. The e2e stub refuses a request without it instead, which is a
/// claim about the real wiring.
///
/// <b>What is genuinely different is the envelope.</b> MAL wraps a search in `data[].node`
/// rather than in a flat `results`, and asking for anything beyond an id, a title and a picture
/// means naming it in `fields`. Both are asserted here, because both are silent when wrong: a
/// missing `fields` entry deserialises to null and looks exactly like a title MAL knows nothing
/// about.
/// </summary>
public sealed class MalClientTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Asks_for_a_title_by_query_string()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, """{"data":[]}""");

        await CreateClient(stub).SearchAsync("frieren", 5, Ct);

        var request = stub.Requests.ShouldHaveSingleItem();
        request.Method.ShouldBe(HttpMethod.Get);
        request.Uri!.AbsolutePath.ShouldBe("/v2/anime");
        request.Uri.Query.ShouldContain("q=frieren");

        // The limit is asked for rather than applied afterwards, which is the one place this
        // differs from TMDB: MAL takes a `limit` and TMDB pages at a fixed twenty.
        request.Uri.Query.ShouldContain("limit=5");
    }

    [Fact]
    public async Task Names_every_field_it_intends_to_read()
    {
        // The silent one. A node carries `id`, `title` and `main_picture` whatever `fields`
        // asks for, and nothing else — so a field left out of this list deserialises to null
        // and is indistinguishable from a title MAL has nothing to say about. Asserting the
        // list here is what makes adding a column to `anime` fail loudly rather than quietly
        // fill it with nulls for ever.
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, """{"data":[]}""");

        await CreateClient(stub).SearchAsync("frieren", 5, Ct);

        var query = Uri.UnescapeDataString(stub.Requests.ShouldHaveSingleItem().Uri!.Query);

        foreach (var field in new[]
                 {
                     "alternative_titles",
                     "media_type",
                     "num_episodes",
                     "average_episode_duration",
                     "start_season",
                     "status",
                     "source",
                     "mean",
                     "genres",
                     "studios",
                 })
        {
            query.ShouldContain(field);
        }
    }

    [Fact]
    public async Task Reads_a_search_out_of_the_node_each_result_is_wrapped_in()
    {
        // MAL's envelope, and the thing a TMDB-shaped reader gets wrong: every result sits
        // inside `data[].node` rather than in a flat array. A client that read `data[]`
        // directly would deserialise a list of objects whose only property is `node` — every
        // id nought, every title null — and the upsert would skip all of them without erroring.
        const string body = """
            {
              "data": [
                {
                  "node": {
                    "id": 52991,
                    "title": "Sousou no Frieren",
                    "main_picture": {"medium": "https://cdn.myanimelist.net/images/anime/1015/138006.jpg"},
                    "alternative_titles": {"en": "Frieren: Beyond Journey's End", "ja": "葬送のフリーレン"},
                    "media_type": "tv",
                    "num_episodes": 28,
                    "average_episode_duration": 1470,
                    "start_season": {"year": 2023, "season": "fall"},
                    "status": "finished_airing",
                    "source": "manga",
                    "mean": 9.25,
                    "genres": [{"id": 2, "name": "Adventure"}, {"id": 8, "name": "Drama"}],
                    "studios": [{"id": 11, "name": "Madhouse"}]
                  }
                }
              ],
              "paging": {}
            }
            """;

        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .SearchAsync("frieren", 10, Ct);

        var anime = found.ShouldHaveSingleItem();
        anime.Id.ShouldBe(52991);
        anime.Title.ShouldBe("Sousou no Frieren");
        anime.AlternativeTitles!.En.ShouldBe("Frieren: Beyond Journey's End");
        anime.MainPicture!.Medium.ShouldBe("https://cdn.myanimelist.net/images/anime/1015/138006.jpg");
        anime.MediaType.ShouldBe("tv");
        anime.NumEpisodes.ShouldBe(28);
        anime.AverageEpisodeDuration.ShouldBe(1470);
        anime.StartSeason!.Year.ShouldBe(2023);
        anime.StartSeason.Season.ShouldBe("fall");
        anime.Status.ShouldBe("finished_airing");
        anime.Source.ShouldBe("manga");
        anime.Mean.ShouldBe(9.25);
        anime.Genres!.Select(genre => genre.Name).ShouldBe(["Adventure", "Drama"]);
        anime.Studios!.Select(studio => studio.Name).ShouldBe(["Madhouse"]);
    }

    [Fact]
    public async Task Reads_an_entry_with_no_english_title_without_complaining()
    {
        // Null is the ordinary case for `alternative_titles.en`, not an error — MAL leaves it
        // absent on a great many entries, and the card renders one line rather than two.
        const string body = """
            {"data": [{"node": {"id": 22135, "title": "Ping Pong the Animation",
             "alternative_titles": {"ja": "ピンポン THE ANIMATION"}}}]}
            """;

        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .SearchAsync("ping pong", 10, Ct);

        found.ShouldHaveSingleItem().AlternativeTitles!.En.ShouldBeNull();
    }

    [Fact]
    public async Task Asks_for_one_title_by_id_with_the_same_fields()
    {
        var stub = StubHttpMessageHandler.Always(
            HttpStatusCode.OK, """{"id":52991,"title":"Sousou no Frieren"}""");

        await CreateClient(stub).GetAsync(52991, Ct);

        var request = stub.Requests.ShouldHaveSingleItem();
        request.Uri!.AbsolutePath.ShouldBe("/v2/anime/52991");

        // The same list as a search, because it is the same shape being read into the same
        // columns. Two lists that had to agree is the drift this avoids.
        Uri.UnescapeDataString(request.Uri.Query).ShouldContain("num_episodes");
    }

    [Fact]
    public async Task Answers_null_for_a_title_mal_does_not_know()
    {
        // An answer rather than a failure, exactly as for TMDB: an id MAL has never heard of
        // has to be distinguishable from MAL being down, or a withdrawn entry looks like an
        // outage and the backfill blanks a card over it.
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.NotFound));

        (await client.GetAsync(999_999, Ct)).ShouldBeNull();
    }

    [Fact]
    public async Task Names_the_rate_limit_explicitly()
    {
        // MAL advertises no rate-limit headers at all, so there is nothing to back off
        // *towards* — a 429 here means something is wrong rather than merely busy, and saying
        // so out loud is more use than a retry against a limit nobody has published.
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.TooManyRequests));

        var exception = await Should.ThrowAsync<MalException>(
            () => client.SearchAsync("frieren", 10, Ct));

        exception.Message.ShouldContain("rate limit");
    }

    [Fact]
    public async Task Wraps_unparseable_responses()
    {
        // A raw JsonException escaping here would surface as a 500; MalException makes it a 502.
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, "not json at all"));

        await Should.ThrowAsync<MalException>(() => client.SearchAsync("frieren", 10, Ct));
    }

    [Fact]
    public async Task Wraps_a_provider_that_cannot_be_reached()
    {
        var client = CreateClient(
            new StubHttpMessageHandler((_, _) => throw new HttpRequestException("unreachable")));

        await Should.ThrowAsync<MalException>(() => client.SearchAsync("frieren", 10, Ct));
    }

    private static MalClient CreateClient(StubHttpMessageHandler stub) =>
        new(new HttpClient(stub) { BaseAddress = new Uri("https://api.myanimelist.net/v2/") },
            NullLogger<MalClient>.Instance);
}
