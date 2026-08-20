using HobbyTracker.Api.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Respawn;
using Respawn.Graph;
using Testcontainers.PostgreSql;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// A throwaway Postgres for the whole test assembly.
///
/// Real Postgres rather than the in-memory or SQLite providers, because the behaviour under
/// test is Postgres-specific: the partial unique index that makes the IGDB upsert idempotent,
/// the 23505 the upsert recovers from, text[] columns, and check constraints. A fake provider
/// would happily pass tests that production fails.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    // Same major version as docker-compose.yml, so the tests exercise the DDL that
    // development actually runs against.
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:17")
        .WithDatabase("hobbytracker_test")
        .WithUsername("test")
        .WithPassword("test")
        .Build();

    private Respawner? _respawner;

    public string ConnectionString => _container.GetConnectionString();

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();

        // Migrate rather than EnsureCreated: EnsureCreated builds DDL from the model and skips
        // migrations entirely, which would quietly drop anything expressed only in a migration.
        // Tests should run against the schema production gets.
        await using (var db = new HobbyTrackerDbContext(CreateOptions()))
        {
            await db.Database.MigrateAsync();
        }

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        _respawner = await Respawner.CreateAsync(connection, new RespawnerOptions
        {
            DbAdapter = DbAdapter.Postgres,
            SchemasToInclude = ["public"],
            // hobby_lu and source_lu are migration-managed reference data whose ids SeedData
            // exposes as compile-time constants. Wiping them between tests would break every
            // insert that references SeedData.Sources.Igdb, and the failure would look like a
            // foreign-key bug rather than a test-harness one.
            TablesToIgnore =
            [
                new Table("__EFMigrationsHistory"),
                new Table("hobby_lu"),
                new Table("source_lu"),
            ],
        });
    }

    /// <summary>Truncates everything except the seeded lookups. Call between tests.</summary>
    public async Task ResetAsync()
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await _respawner!.ResetAsync(connection);
    }

    public DbContextOptions<HobbyTrackerDbContext> CreateOptions() =>
        new DbContextOptionsBuilder<HobbyTrackerDbContext>()
            .UseNpgsql(ConnectionString)
            .UseSnakeCaseNamingConvention()
            .Options;

    /// <summary>A context bound to the test database, for arranging and asserting directly.</summary>
    public HobbyTrackerDbContext CreateDbContext() => new(CreateOptions());

    public async ValueTask DisposeAsync() => await _container.DisposeAsync();
}
