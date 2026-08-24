using System.Net;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.WebUtilities;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The sign-in rail as a caller meets it.
///
/// What the OAuth handler does between the redirect and the callback is the framework's and is
/// proved end to end against the Google stub. What is asserted here is the part that is ours:
/// that the redirect is built from the options we bound, that it carries PKCE, and that
/// <c>/api/auth/me</c> answers without a session rather than refusing to.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class AuthEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Says_nobody_is_signed_in_rather_than_refusing_to_answer()
    {
        // 200 with a null body, not a 401, and the reason is not politeness. This is the
        // frontend's "am I signed in" probe, so a 401 here would trip the very handler that
        // sends you to sign-in — the query would redirect on its own answer. It is also the
        // e2e harness's readiness URL, which has to stay reachable without a session.
        var response = await AnonymousClient.GetAsync("/api/auth/me", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync(Ct)).Trim().ShouldBe("null");
    }

    [Fact]
    public async Task Names_the_person_who_is_signed_in()
    {
        var userId = await GivenUserAsync("Jimmy Dao");

        var me = await ReadAsync<MeDto>(await ClientFor(userId).GetAsync("/api/auth/me", Ct));

        me.Id.ShouldBe(userId);
        me.DisplayName.ShouldBe("Jimmy Dao");
    }

    [Fact]
    public async Task Sends_you_to_the_provider_with_everything_it_needs()
    {
        var response = await Redirecting().GetAsync("/api/auth/google/start", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Found);

        var location = response.Headers.Location.ShouldNotBeNull().ToString();
        location.ShouldStartWith(ApiFactory.GoogleAuthorizationEndpoint);

        var query = QueryHelpers.ParseQuery(new Uri(location).Query);
        query["client_id"].ToString().ShouldBe("test-google-client");
        query["response_type"].ToString().ShouldBe("code");
        query["state"].ToString().ShouldNotBeNullOrWhiteSpace();

        // PKCE is a one-line option and a silent one: without it the flow still works, and the
        // authorization code is still interceptable. Asserted here so turning it off fails.
        query["code_challenge"].ToString().ShouldNotBeNullOrWhiteSpace();
        query["code_challenge_method"].ToString().ShouldBe("S256");
    }

    [Fact]
    public async Task Sends_you_to_discord_the_same_way()
    {
        // A second provider is a config block and nothing else -- same handler, same options
        // shape, same PKCE. This asserts that rather than asserting Discord in particular.
        var response = await Redirecting().GetAsync("/api/auth/discord/start", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Found);

        var location = response.Headers.Location.ShouldNotBeNull().ToString();
        location.ShouldStartWith(ApiFactory.DiscordAuthorizationEndpoint);

        var query = QueryHelpers.ParseQuery(new Uri(location).Query);
        query["client_id"].ToString().ShouldBe("test-discord-client");
        query["code_challenge_method"].ToString().ShouldBe("S256");
    }

    [Fact]
    public async Task Refuses_to_start_a_sign_in_with_a_provider_it_does_not_have()
    {
        // A 400 naming the provider rather than the 500 an unregistered scheme would otherwise
        // throw, and rather than a 404 — the route exists, the provider is the bad argument.
        var response = await Redirecting().GetAsync("/api/auth/myspace/start", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Refuses_to_be_talked_into_bouncing_you_off_site_afterwards()
    {
        // returnUrl is attacker-controlled and decides where the callback drops you, which is
        // an open redirect unless somebody checks. Refused outright rather than quietly
        // ignored: a link carrying one is either an attack or a bug, and both are worth
        // hearing about. Asserting the drop instead would be untestable here anyway — the
        // state parameter is an encrypted blob, so it never contains the url either way.
        var response = await Redirecting()
            .GetAsync("/api/auth/google/start?returnUrl=https://evil.example/steal", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Refuses_a_protocol_relative_return_url_too()
    {
        // The one that slips past a naive "does it start with a slash" check and still leaves
        // the site: //evil.example is a URL with no scheme, not a path.
        var response = await Redirecting()
            .GetAsync("/api/auth/google/start?returnUrl=//evil.example/steal", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Keeps_a_local_return_url()
    {
        var response = await Redirecting()
            .GetAsync("/api/auth/google/start?returnUrl=/board", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Found);
    }

    // ----------------------------------------------------------------- helpers

    /// <summary>
    /// A client that stops at the 302 instead of chasing it. The default follows redirects,
    /// which here means walking straight out to the configured provider.
    /// </summary>
    private HttpClient Redirecting() =>
        Factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
}
