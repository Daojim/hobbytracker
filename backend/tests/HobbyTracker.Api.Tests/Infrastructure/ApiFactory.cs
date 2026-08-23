using HobbyTracker.Api.Infrastructure;
using HobbyTracker.Api.Integrations.Hltb;
using HobbyTracker.Api.Integrations.Igdb;
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
    FakeHltbClient hltb,
    FakeHltbQueue hltbQueue,
    TimeProvider clock,
    string timeZone = "America/New_York")
    : WebApplicationFactory<Program>
{
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

                // Pinned rather than inherited from appsettings.json, so the dates these tests
                // assert on cannot be moved by an edit to a file they never mention.
                ["Journal:TimeZone"] = timeZone,
            }));

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IIgdbClient>();
            services.AddSingleton<IIgdbClient>(igdb);

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
        });
    }
}
