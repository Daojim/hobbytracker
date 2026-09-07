using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.WebUtilities;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The redirect URI the app hands a provider, when it is not the app deciding what its own
/// address is.
///
/// Behind a proxy that terminates TLS — which is every way this is deployed — the request
/// arrives at Kestrel as plain HTTP, on whatever host the proxy used to reach it. One omission
/// then breaks three things at once: the OAuth handler builds an <c>http://</c> redirect URI,
/// which Google refuses outright for any host but localhost; <c>CookieSecurePolicy.SameAsRequest</c>
/// sees HTTP and issues the session cookie without <c>Secure</c>; and <c>UseHttpsRedirection</c>
/// thinks every request needs redirecting and loops.
///
/// Only the first of those is visible from here, and it is the one that decides whether anybody
/// can sign in at all. The cookie flag and the redirect loop are both properties of a real
/// server on a real port, so they are checked by deploying rather than pretended at here.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class PublicOriginTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    /// <summary>
    /// Deliberately not the hostname this is actually deployed at. What is being asserted is the
    /// mechanism; the address is deployment configuration and belongs in an environment variable,
    /// which is also what keeps it out of a public repository.
    /// </summary>
    private const string PinnedOrigin = "https://hobbytracker.example";

    [Fact]
    public async Task Hands_the_provider_the_public_callback_even_though_the_request_arrived_as_http()
    {
        await using var factory = new ApiFactory(
            Postgres, Igdb, Tmdb, Mal, Hltb, HltbQueue, Clock, publicOrigin: PinnedOrigin);

        var query = await ChallengeQueryAsync(factory);

        // The whole point. The request went to http://localhost, and the provider is told to
        // come back to the public origin regardless — because the provider is the one party in
        // this exchange that cannot see the proxy in front of us.
        query["redirect_uri"].ToString()
            .ShouldBe(PinnedOrigin + "/api/auth/google/callback");
    }

    [Fact]
    public async Task Pins_the_second_provider_from_the_same_setting()
    {
        // A provider is a config block and nothing else, and the pin has to be the same kind of
        // thing — one value covering every scheme, rather than a per-provider address that could
        // be right for Google and quietly stale for Discord.
        await using var factory = new ApiFactory(
            Postgres, Igdb, Tmdb, Mal, Hltb, HltbQueue, Clock, publicOrigin: PinnedOrigin);

        var query = await ChallengeQueryAsync(factory, provider: "discord");

        query["redirect_uri"].ToString()
            .ShouldBe(PinnedOrigin + "/api/auth/discord/callback");
    }

    [Fact]
    public async Task Builds_the_callback_from_the_request_when_nothing_is_pinned()
    {
        // The other half, and the reason the setting is nullable rather than defaulted. Running
        // on localhost is the ordinary case — development, both test harnesses — and the pin has
        // to be inert there or every one of the other tests is quietly running against an origin
        // it never mentioned. This is what says the change costs nothing when unconfigured.
        var query = await ChallengeQueryAsync(Factory);

        query["redirect_uri"].ToString()
            .ShouldBe("http://localhost/api/auth/google/callback");
    }


    [Fact]
    public async Task Stops_a_proxied_request_being_redirected_to_the_scheme_it_already_arrived_on()
    {
        // The second of the three failures, and the one that decides where in the pipeline the
        // pin has to sit. UseHttpsRedirection reads Request.IsHttps, which is derived from the
        // scheme -- so behind a proxy that terminates TLS it sees "http", redirects, and the
        // browser comes straight back through the proxy over http again. A loop, not a warning.
        //
        // Asserting it here is also what protects the ordering. The pin has to run before
        // UseHttpsRedirection, and UseHttpsRedirection already runs before UseAuthentication --
        // where the callback's token exchange has to send the same redirect_uri the challenge
        // sent. One inequality holds both.
        await using var factory = new ApiFactory(
            Postgres, Igdb, Tmdb, Mal, Hltb, HltbQueue, Clock, publicOrigin: PinnedOrigin);

        var response = await KnowsAboutHttps(factory).GetAsync("/api/auth/me", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Redirects_that_same_request_when_nothing_is_pinned()
    {
        // The control, and without it the test above proves nothing: UseHttpsRedirection is a
        // silent no-op unless it can work out a port to redirect to, so a green neighbour could
        // just as easily mean the middleware never ran at all. This is what says it did.
        var response = await KnowsAboutHttps(Factory).GetAsync("/api/auth/me", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.TemporaryRedirect);
    }
    // ----------------------------------------------------------------- helpers

    /// <summary>
    /// Starts a sign-in and reads the query off the 302, without chasing it out to the provider.
    /// </summary>
    private static async Task<Dictionary<string, Microsoft.Extensions.Primitives.StringValues>>
        ChallengeQueryAsync(ApiFactory factory, string provider = "google")
    {
        using var client = factory.CreateClient(
            new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var response = await client.GetAsync("/api/auth/" + provider + "/start", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.Found);

        var location = response.Headers.Location.ShouldNotBeNull().ToString();
        return QueryHelpers.ParseQuery(new Uri(location).Query);
    }

    /// <summary>
    /// A client against a host that has been told which port HTTPS is on.
    ///
    /// UseHttpsRedirection does nothing at all without one -- it cannot build a URL to redirect
    /// to, so it logs and gives up, which is why the rest of the suite never meets it. Supplied
    /// here rather than in <see cref="ApiFactory"/> because supplying it there would turn every
    /// other test in the project into a 307.
    /// </summary>
    private static HttpClient KnowsAboutHttps(ApiFactory factory) => factory
        .WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["https_port"] = "443" })))
        .CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
}
