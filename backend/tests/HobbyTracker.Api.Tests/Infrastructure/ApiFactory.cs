using HobbyTracker.Api.Integrations.Igdb;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Boots the real API pipeline in-process against the test container.
///
/// Everything below the HTTP boundary is production code — real controllers, real DI, real EF,
/// real migrations. Only two things are swapped: where the database is, and IGDB.
/// </summary>
public sealed class ApiFactory(PostgresFixture postgres, FakeIgdbClient igdb)
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
            }));

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IIgdbClient>();
            services.AddSingleton<IIgdbClient>(igdb);
        });
    }
}
