using System.Text.Json;
using HobbyTracker.Api.Integrations.Hltb;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Integrations;

/// <summary>
/// Talking to HowLongToBeat, which has no API and does not want to be talked to by a program.
///
/// Two routes with almost nothing in common. A search goes through the endpoint whose name the
/// session had to find, and has to carry the handshake in the headers *and* in the body. Fetching
/// a title already pinned to an id is an ordinary GET of an ordinary page, with the answer parsed
/// out of the JSON Next.js leaves embedded in it — no handshake at all, which is what keeps a
/// pinned title refreshable even while the search endpoint is renamed out from under us.
/// </summary>
public sealed class HltbClientTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>Hollow Knight's real numbers: 27 h, 41.59 h and 65.6 h once divided out.</summary>
    private const string HollowKnight = """
        {"count":1,"data":[{
          "game_id":26286,
          "game_name":"Hollow Knight",
          "game_alias":"Hollow Knight: Voidheart Edition, HK",
          "game_type":"game",
          "release_world":2017,
          "comp_all":150549,
          "comp_main":97203,"comp_plus":149717,"comp_100":236159,
          "comp_main_count":2740,"comp_plus_count":4662,"comp_100_count":2021
        }]}
        """;

    // ------------------------------------------------------------------ search

    [Fact]
    public async Task Carries_the_anti_bot_value_as_a_property_named_by_its_own_key()
    {
        // The trap, and the one worth a test of its own. The check is not only in the headers:
        // the body has to gain a property whose *name* is the hpKey. Without it the endpoint
        // answers 404 rather than 403 — so a failed anti-bot check reads as a wrong URL, and
        // sends you hunting for a path suffix that was never there.
        var client = CreateClient(out var stub, Responses(Ok(HollowKnight)));

        await client.SearchAsync("Hollow Knight", Ct);

        var body = JsonDocument.Parse(stub.Requests[0].Body!).RootElement;
        body.GetProperty("ign_abc123").GetString().ShouldBe("deadbeef");
    }

    [Fact]
    public async Task Carries_the_handshake_in_the_headers_too()
    {
        var client = CreateClient(out var stub, Responses(Ok(HollowKnight)));

        await client.SearchAsync("Hollow Knight", Ct);

        var request = stub.Requests[0];
        request.Header("x-auth-token").ShouldBe("tok-1");
        request.Header("x-hp-key").ShouldBe("ign_abc123");
        request.Header("x-hp-val").ShouldBe("deadbeef");
        request.Uri!.AbsolutePath.ShouldBe("/api/bleed");
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Says_who_is_calling_on_both_routes(bool searching)
    {
        // The User-Agent is not decoration. HltbSession sends it at the handshake and the token
        // that comes back has it baked in, so a search under a different one is refused — which
        // is exactly what happened while this lived in the typed client's DI configuration and
        // the two halves of the agreement sat in different files. The Referer is required
        // outright: without it the site answers 403 "Access Denied".
        var client = CreateClient(
            out var stub,
            Responses(searching ? Ok(HollowKnight) : Ok(GamePage, "text/html")));

        if (searching)
        {
            await client.SearchAsync("Hollow Knight", Ct);
        }
        else
        {
            await client.GetAsync(104683, Ct);
        }

        var request = stub.Requests.ShouldHaveSingleItem();
        request.Header("User-Agent").ShouldBe(AsSent(new HltbOptions().UserAgent));
        request.Header("Referer").ShouldBe("https://howlongtobeat.com/");
    }

    /// <summary>
    /// A User-Agent as it reads back off a request rather than as it was written.
    ///
    /// .NET parses the header into product tokens, so RecordedRequest.Header — which joins the
    /// values it finds with commas — hands back "Mozilla/5.0,(Windows NT 10.0; …),…" rather than
    /// the single string that went in. That is a fact about reading the header, not about what
    /// crosses the wire, so the expectation is put through the same mill instead of being
    /// loosened into a ShouldContain that would no longer catch the header going missing.
    /// </summary>
    private static string AsSent(string userAgent)
    {
        using var probe = new HttpRequestMessage();
        probe.Headers.TryAddWithoutValidation("User-Agent", userAgent);

        return string.Join(",", probe.Headers.GetValues("User-Agent"));
    }

    [Fact]
    public async Task Splits_the_title_into_terms_the_way_the_site_does()
    {
        var client = CreateClient(out var stub, Responses(Ok(HollowKnight)));

        await client.SearchAsync("  Hollow   Knight ", Ct);

        TermsOf(stub).ShouldBe(["Hollow", "Knight"]);
    }

    [Fact]
    public async Task Drops_punctuation_from_the_terms_it_searches_on()
    {
        // Measured against the live site rather than reasoned about. HowLongToBeat matches each
        // term against its own title literally, so a colon IGDB writes and HowLongToBeat does
        // not takes the entire search to nothing: "Dragon Quest III: HD-2D Remake" answers with
        // zero candidates where "Dragon Quest III HD-2D Remake" answers with the game. Nothing
        // downstream can recover from that — the matcher is handed an empty list and correctly
        // refuses, so the title is stamped as checked and never asked about again.
        //
        // Cleaning is never worse: ten real titles were tried both ways and nine were identical,
        // because a term carrying no punctuation is unchanged by this.
        var client = CreateClient(out var stub, Responses(Ok(HollowKnight)));

        await client.SearchAsync("Dragon Quest III: HD-2D Remake", Ct);

        TermsOf(stub).ShouldBe(["Dragon", "Quest", "III", "HD", "2D", "Remake"]);
    }

    [Fact]
    public async Task Folds_the_accents_but_leaves_the_numerals_alone()
    {
        // Two halves of one rule, and the second is why this cannot call HltbMatcher.Normalise.
        // The accent has to go, because the two sites disagree about it. The roman numeral must
        // *not* be folded to a digit the way the matcher folds it: the matcher is comparing two
        // strings already in hand, where this is a query against a site that writes "III" and
        // would match nothing at all for "3".
        var client = CreateClient(out var stub, Responses(Ok(HollowKnight)));

        await client.SearchAsync("Pokémon Version VII", Ct);

        TermsOf(stub).ShouldBe(["Pokemon", "Version", "VII"]);
    }

    [Fact]
    public async Task Reads_the_seconds_it_is_given_as_hours()
    {
        // HowLongToBeat answers in seconds, and nothing outside this folder should have to know
        // that. 97203 seconds is 27 hours and three seconds, which is 27 hours.
        var client = CreateClient(out _, Responses(Ok(HollowKnight)));

        var game = (await client.SearchAsync("Hollow Knight", Ct)).ShouldHaveSingleItem();

        game.Id.ShouldBe(26286);
        game.Name.ShouldBe("Hollow Knight");
        game.Aliases.ShouldBe(["Hollow Knight: Voidheart Edition", "HK"]);
        game.ReleaseYear.ShouldBe(2017);
        // The headline number the site prints, and its own statistic rather than any function
        // of the three below it: the mean of them is 44.6 and the median 39, both of which
        // HowLongToBeat also publishes, under comp_all_avg and comp_all_med. These are the real
        // values off game 26286, where the page says 42 Hours.
        game.AllStylesHours.ShouldBe(41.82m);
        game.MainStoryHours.ShouldBe(27.0m);
        game.MainExtraHours.ShouldBe(41.59m);
        game.CompletionistHours.ShouldBe(65.6m);
    }

    [Fact]
    public async Task Reads_a_nought_as_nobody_having_said_rather_than_as_no_time_at_all()
    {
        // An unreleased game comes back with every time set to 0. Storing that would claim it
        // takes no time to finish; the column has a check constraint refusing it for that reason.
        var client = CreateClient(out _, Responses(Ok("""
            {"count":1,"data":[{"game_id":174355,"game_name":"Fire Emblem: Fortune's Weave",
             "release_world":2026,"comp_all":0,"comp_main":0,"comp_plus":0,"comp_100":0}]}
            """)));

        var game = (await client.SearchAsync("Fire Emblem", Ct)).ShouldHaveSingleItem();

        game.AllStylesHours.ShouldBeNull();
        game.MainStoryHours.ShouldBeNull();
        game.MainExtraHours.ShouldBeNull();
        game.CompletionistHours.ShouldBeNull();
    }

    [Fact]
    public async Task Drops_only_the_tier_too_long_for_the_column_to_hold()
    {
        // numeric(5,2) throws past 999.99 rather than rounding, so an over-long completionist
        // time has to be dropped before the insert. Its siblings are still perfectly good
        // numbers and there is no reason to lose them with it.
        var client = CreateClient(out _, Responses(Ok("""
            {"count":1,"data":[{"game_id":1,"game_name":"Endless",
             "comp_main":97203,"comp_plus":149717,"comp_100":4000000}]}
            """)));

        var game = (await client.SearchAsync("Endless", Ct)).ShouldHaveSingleItem();

        game.MainStoryHours.ShouldBe(27.0m);
        game.CompletionistHours.ShouldBeNull();
    }

    [Fact]
    public async Task Refreshes_the_handshake_and_tries_once_more_on_a_refusal()
    {
        // What the site's own JavaScript does, for the same reason: the token goes off and the
        // only way to find out is to be told no.
        var client = CreateClient(
            out var stub, Responses(Refused(), Ok(HollowKnight)), out var session);

        (await client.SearchAsync("Hollow Knight", Ct)).ShouldHaveSingleItem();

        stub.Requests.Count.ShouldBe(2);
        session.InvalidateCount.ShouldBe(1);
    }

    [Fact]
    public async Task Gives_up_rather_than_hammering_after_the_second_refusal()
    {
        var client = CreateClient(out var stub, Responses(Refused(), Refused()));

        await Should.ThrowAsync<HltbException>(client.SearchAsync("Hollow Knight", Ct));

        stub.Requests.Count.ShouldBe(2);
    }

    [Fact]
    public async Task Surfaces_a_response_it_cannot_read_rather_than_an_empty_result()
    {
        // An empty list would read as "HowLongToBeat has never heard of this", which is a fact
        // about the game. This is a fact about the request, and the two must not look alike.
        var client = CreateClient(out _, Responses(Ok("<html>not json</html>")));

        await Should.ThrowAsync<HltbException>(client.SearchAsync("Hollow Knight", Ct));
    }

    // ----------------------------------------------------------- by pinned id

    /// <summary>
    /// The page's own shape, copied from a real response rather than imagined.
    ///
    /// Two things differ from the search endpoint and both have bitten: the record is nested a
    /// level deeper, under data.game rather than data — data here is an object whose siblings
    /// are relationships, userReviews and the rest — and release_world is a date string where
    /// the search sends a bare integer year.
    /// </summary>
    private const string GamePage = """
        <html><body>
        <script id="__NEXT_DATA__" type="application/json">
        {"props":{"pageProps":{"game":{"count":1,"data":{"game":[{
          "game_id":104683,
          "game_name":"Pokemon Scarlet and Violet",
          "game_alias":"Pokémon Scarlet and Violet",
          "release_world":"2022-11-18",
          "comp_main":115446,"comp_plus":185658,"comp_100":331999
        }],"relationships":[],"userReviews":[]}}}}}
        </script></body></html>
        """;

    [Fact]
    public async Task Reads_a_pinned_title_off_the_page_that_has_no_api_behind_it()
    {
        var client = CreateClient(out _, Responses(Ok(GamePage, "text/html")));

        var game = (await client.GetAsync(104683, Ct)).ShouldNotBeNull();

        game.Id.ShouldBe(104683);
        game.Name.ShouldBe("Pokemon Scarlet and Violet");
        game.MainStoryHours.ShouldBe(32.07m);
        game.CompletionistHours.ShouldBe(92.22m);
    }

    [Fact]
    public async Task Asks_for_a_pinned_title_without_a_handshake_at_all()
    {
        // The whole value of this route. It is an ordinary page fetch, so a title already
        // matched can still be refreshed on a day the search endpoint has been renamed.
        var client = CreateClient(
            out var stub, Responses(Ok(GamePage, "text/html")), out var session);

        await client.GetAsync(104683, Ct);

        session.Asked.ShouldBeFalse();
        stub.Requests.ShouldHaveSingleItem().Uri!.AbsolutePath.ShouldBe("/game/104683");
        stub.Requests[0].Header("x-auth-token").ShouldBeNull();
    }

    [Fact]
    public async Task Answers_nothing_for_an_id_the_site_does_not_know()
    {
        // A 404 here is an answer, not a failure: the id was wrong, or the entry has been
        // merged away. Either way the title keeps whatever was last known about it.
        var client = CreateClient(
            out _, Responses((HttpStatusCode.NotFound, "<html>404</html>", "text/html")));

        (await client.GetAsync(999999, Ct)).ShouldBeNull();
    }

    [Fact]
    public async Task Says_so_when_a_pinned_title_comes_back_as_a_page_it_cannot_read()
    {
        var client = CreateClient(out _, Responses(Ok("<html>no next data</html>", "text/html")));

        await Should.ThrowAsync<HltbException>(client.GetAsync(104683, Ct));
    }

    // --------------------------------------------------------------- fixtures

    private static (HttpStatusCode, string, string) Ok(
        string body, string contentType = "application/json") =>
        (HttpStatusCode.OK, body, contentType);

    /// <summary>How HowLongToBeat says a token has gone off.</summary>
    private static (HttpStatusCode, string, string) Refused() =>
        (HttpStatusCode.Forbidden, """{"error":"Session expired"}""", "application/json");

    private static (HttpStatusCode, string, string)[] Responses(
        params (HttpStatusCode, string, string)[] responses) => responses;

    /// <summary>The terms a search actually went out with.</summary>
    private static IEnumerable<string?> TermsOf(StubHttpMessageHandler stub) =>
        JsonDocument.Parse(stub.Requests[0].Body!).RootElement
            .GetProperty("searchTerms").EnumerateArray().Select(term => term.GetString());

    private static HltbClient CreateClient(
        out StubHttpMessageHandler stub, (HttpStatusCode, string, string)[] responses) =>
        CreateClient(out stub, responses, out _);

    private static HltbClient CreateClient(
        out StubHttpMessageHandler stub,
        (HttpStatusCode, string, string)[] responses,
        out FakeHltbSession session)
    {
        stub = new StubHttpMessageHandler((_, index) =>
        {
            var (status, body, contentType) = index < responses.Length
                ? responses[index]
                : (HttpStatusCode.InternalServerError, "stub ran out of responses", "text/plain");

            return new HttpResponseMessage(status)
            {
                Content = new StringContent(body, Encoding.UTF8, contentType),
            };
        });

        session = new FakeHltbSession();

        return new HltbClient(
            new HttpClient(stub) { BaseAddress = new Uri("https://howlongtobeat.com/") },
            session,
            Options.Create(new HltbOptions()),
            NullLogger<HltbClient>.Instance);
    }

    /// <summary>Records whether it was consulted, so the pinned route can prove it was not.</summary>
    private sealed class FakeHltbSession : IHltbSession
    {
        public bool Asked { get; private set; }
        public int InvalidateCount { get; private set; }

        public Task<HltbCredentials> GetAsync(CancellationToken cancellationToken)
        {
            Asked = true;
            return Task.FromResult(new HltbCredentials("bleed", "tok-1", "ign_abc123", "deadbeef"));
        }

        public void Invalidate() => InvalidateCount++;
    }
}
