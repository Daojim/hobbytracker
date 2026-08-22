using System.Net;
using HobbyTracker.Api.Integrations.Hltb;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Integrations;

/// <summary>
/// Finding the search endpoint, and holding on to the handshake behind it.
///
/// HowLongToBeat has no API to point at: the endpoint's name is a word in a JavaScript bundle
/// that has changed at least twice (s, then seek, then bleed), and reaching it needs a token
/// that a separate call hands out. Both are discovered rather than configured, which is the
/// whole reason this class exists and the whole reason it is worth testing hard.
/// </summary>
public sealed class HltbSessionTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private const string Home =
        """<html><body><script src="/_next/static/chunks/app.js"></script></body></html>""";

    /// <summary>
    /// A bundle shaped like the real one: the search endpoint sits among decoys, and one of the
    /// decoys is a POST that appears first.
    /// </summary>
    private const string Bundle = """
        let a=await fetch("/api/game/",{method:"POST"});
        let b=await fetch("/api/error",{method:"POST"});
        let c=await fetch("/api/bleed/init?"+Date.now());
        let d=await fetch("/api/bleed",{method:"POST",headers:{"x-hp-key":k}});
        """;

    private const string Init =
        """{"token":"tok-1","hpKey":"ign_abc123","hpVal":"deadbeef"}""";

    [Fact]
    public async Task Finds_the_search_endpoint_by_the_one_that_also_has_an_init()
    {
        // The rule that matters. Taking the first POST fetch in the bundle finds /api/game/,
        // which answers 404 — and a 404 reads as "wrong URL" rather than "wrong rule", so it
        // sends you hunting for a path suffix that does not exist.
        var session = CreateSession(out _);

        var credentials = await session.GetAsync(Ct);

        credentials.SearchPath.ShouldBe("bleed");
        credentials.Token.ShouldBe("tok-1");
        credentials.HpKey.ShouldBe("ign_abc123");
        credentials.HpVal.ShouldBe("deadbeef");
    }

    [Fact]
    public async Task Introduces_itself_the_way_the_site_insists_on()
    {
        // Not decoration, and measured rather than guessed: the handshake answers
        // 403 {"error":"Access Denied"} unless the request carries both a User-Agent and a
        // Referer, and 200 as soon as it carries them. Accept and Origin make no difference.
        //
        // Worth pinning because of how it failed. The client's search set both from the start,
        // so every test here passed and only the real site objected — and it objected at the
        // handshake, before anything this class does had a chance to look wrong.
        var session = CreateSession(out var stub);

        await session.GetAsync(Ct);

        stub.Requests.ShouldNotBeEmpty();
        foreach (var request in stub.Requests)
        {
            request.Header("User-Agent").ShouldNotBeNullOrEmpty();
            request.Header("Referer").ShouldBe("https://howlongtobeat.com/");
        }
    }

    [Fact]
    public async Task Asks_the_site_once_however_many_callers_arrive_together()
    {
        // A backfill starting cold fires several titles at once. Without the lock that is one
        // bundle scrape and one handshake each, against a site that never agreed to serve us.
        var session = CreateSession(out var stub);

        await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => session.GetAsync(Ct)));

        stub.Requests.Count(request => request.Uri!.AbsolutePath.Contains("init")).ShouldBe(1);
    }

    [Fact]
    public async Task Keeps_the_handshake_until_something_says_it_is_stale()
    {
        // No expiry is guessed at. The token carries a timestamp we do not own the rules for,
        // so the only honest signal that it has gone off is the 403 the client replays on —
        // which is exactly what the site's own JavaScript does.
        var session = CreateSession(out var stub);

        await session.GetAsync(Ct);
        await session.GetAsync(Ct);

        stub.Requests.Count(request => request.Uri!.AbsolutePath.Contains("init")).ShouldBe(1);
    }

    [Fact]
    public async Task Goes_back_to_the_site_after_being_invalidated()
    {
        var session = CreateSession(out var stub);
        await session.GetAsync(Ct);

        session.Invalidate();
        await session.GetAsync(Ct);

        stub.Requests.Count(request => request.Uri!.AbsolutePath.Contains("init")).ShouldBe(2);
    }

    [Fact]
    public async Task Falls_back_to_the_configured_name_when_the_bundle_stops_saying_it()
    {
        // The endpoint has been renamed twice already. When the next rename breaks the scrape,
        // this is what lets the name be corrected in configuration rather than in a deploy.
        var session = CreateSession(out _, bundle: "let x=1;", fallback: "seek");

        (await session.GetAsync(Ct)).SearchPath.ShouldBe("seek");
    }

    [Fact]
    public async Task Says_so_plainly_when_the_site_will_not_answer_at_all()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.ServiceUnavailable, "nope");
        var session = new HltbSession(
            new StubHttpClientFactory(stub, new Uri("https://howlongtobeat.com/")),
            Options.Create(new HltbOptions()),
            NullLogger<HltbSession>.Instance);

        await Should.ThrowAsync<HltbException>(session.GetAsync(Ct));
    }

    private static HltbSession CreateSession(
        out StubHttpMessageHandler stub, string bundle = Bundle, string? fallback = null)
    {
        stub = new StubHttpMessageHandler((request, _) =>
        {
            var path = request.Uri!.AbsolutePath;

            return path switch
            {
                "/" => Respond(Home, "text/html"),
                "/_next/static/chunks/app.js" => Respond(bundle, "application/javascript"),
                _ when path.EndsWith("/init") => Respond(Init, "application/json"),
                _ => new HttpResponseMessage(HttpStatusCode.NotFound),
            };
        });

        var options = new HltbOptions();
        if (fallback is not null)
        {
            options.FallbackSearchPath = fallback;
        }

        return new HltbSession(
            new StubHttpClientFactory(stub, new Uri("https://howlongtobeat.com/")),
            Options.Create(options),
            NullLogger<HltbSession>.Instance);
    }

    private static HttpResponseMessage Respond(string body, string contentType) =>
        new(HttpStatusCode.OK) { Content = new StringContent(body, Encoding.UTF8, contentType) };
}
