using HobbyTracker.Api.Infrastructure;
using HobbyTracker.Api.Integrations.Hltb;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Integrations.Mal;
using HobbyTracker.Api.Integrations.Tmdb;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Boots the real API pipeline in-process against the test container.
///
/// Everything below the HTTP boundary is production code — real controllers, real DI, real EF,
/// real migrations. Only three things are swapped: where the database is, IGDB, and the clock.
/// </summary>
public sealed class ApiFactory(
    PostgresFixture postgres,
    FakeIgdbClient igdb,
    FakeTmdbClient tmdb,
    FakeMalClient mal,
    FakeHltbClient hltb,
    FakeHltbQueue hltbQueue,
    TimeProvider clock,
    string timeZone = "America/New_York",
    string googleClientId = "test-google-client",
    string? publicOrigin = null)
    : WebApplicationFactory<Program>
{
    /// <summary>
    /// Where a challenge is sent. A test asserting on the redirect needs to know it, and
    /// nothing here ever follows it — the real dance is the end-to-end suite's.
    /// </summary>
    public const string GoogleAuthorizationEndpoint = "https://stub.invalid/authorize";
    public const string DiscordAuthorizationEndpoint = "https://stub.invalid/discord/authorize";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Not "Development": that would load appsettings.Development.json and user-secrets,
        // meaning a developer's real IGDB credentials and dev connection string leak into the
        // test host. "Testing" loads neither, so the configuration below is the whole story.
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["ConnectionStrings:HobbyTracker"] = postgres.ConnectionString,

                // IgdbOptions is validated at startup, so the host will not boot without these.
                // They are never used for anything: FakeIgdbClient replaces the only component
                // that would read them.
                ["Igdb:ClientId"] = "test-client-id",
                ["Igdb:ClientSecret"] = "test-client-secret",

                // TmdbOptions is validated at startup for the same reason, so the host will not
                // boot without this. It is never used for anything: FakeTmdbClient replaces the
                // only component that would read it.
                ["Tmdb:AccessToken"] = "test-tmdb-token",

                // MalOptions is validated at startup too. A missing required option refuses to
                // boot the *whole suite* rather than the one hobby that needed it, which is the
                // loud failure and the good one — but it is loud a long way from its cause, so
                // it is worth knowing that a new provider without a line here fails every
                // endpoint test at once.
                ["Mal:ClientId"] = "test-mal-client",

                // AuthOptions is validated at startup too, so the host will not boot without these.
                // The endpoints are never reached: nothing in the backend suite signs in through
                // OAuth, which is what the Google stub and the end-to-end specs are for.
                ["Auth:Google:ClientId"] = googleClientId,
                ["Auth:Google:ClientSecret"] = "test-google-secret",
                ["Auth:Google:AuthorizationEndpoint"] = GoogleAuthorizationEndpoint,
                ["Auth:Google:TokenEndpoint"] = "https://stub.invalid/token",
                ["Auth:Google:UserInfoEndpoint"] = "https://stub.invalid/userinfo",
                ["Auth:Discord:ClientId"] = "test-discord-client",
                ["Auth:Discord:ClientSecret"] = "test-discord-secret",
                ["Auth:Discord:AuthorizationEndpoint"] = DiscordAuthorizationEndpoint,
                ["Auth:Discord:TokenEndpoint"] = "https://stub.invalid/discord/token",
                ["Auth:Discord:UserInfoEndpoint"] = "https://stub.invalid/discord/userinfo",

                // Pinned rather than inherited from appsettings.json, so the dates these tests
                // assert on cannot be moved by an edit to a file they never mention.
                ["Journal:TimeZone"] = timeZone,

                // Absent unless a test names one, and that is the whole point of it being nullable:
                // the pin is what a deployment behind a TLS-terminating proxy needs and what every
                // other test must not have. Null reads as unconfigured, which is what lets one fact
                // assert the pinned callback and its neighbour assert that without it nothing moved.
                ["PublicOrigin:Url"] = publicOrigin,
            }));

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IIgdbClient>();
            services.AddSingleton<IIgdbClient>(igdb);

            services.RemoveAll<ITmdbClient>();
            services.AddSingleton<ITmdbClient>(tmdb);

            services.RemoveAll<IMalClient>();
            services.AddSingleton<IMalClient>(mal);

            services.RemoveAll<IHltbClient>();
            services.AddSingleton<IHltbClient>(hltb);

            // The queue is faked and the worker that drains it is taken out entirely. Left in,
            // it would look up titles on a background thread while tests assert about the rows
            // it is writing — every one of them racing something it never mentioned.
            services.RemoveAll<IHltbQueue>();
            services.AddSingleton<IHltbQueue>(hltbQueue);

            var worker = services.FirstOrDefault(service =>
                service.ServiceType == typeof(IHostedService)
                && service.ImplementationType == typeof(HltbWorker));

            if (worker is not null)
            {
                services.Remove(worker);
            }

            // Stopped, so "today" is whatever the test says it is. Without this, every
            // assertion about a stamped date is really an assertion about the wall clock.
            services.RemoveAll<TimeProvider>();
            services.AddSingleton(clock);

            // Signed in by header rather than by cookie. The cookie and OAuth schemes stay
            // registered underneath, so a challenge still behaves as it does in production —
            // only what counts as already-signed-in changes. See TestAuthHandler.
            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });
        });
    }
}
