using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using Microsoft.Extensions.DependencyInjection;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Base for tests that need a database and an HTTP client. Each test starts from a clean slate
/// except for the seeded lookup tables, which Respawn preserves.
/// </summary>
[Collection(DatabaseCollection.Name)]
public abstract class DatabaseTestBase(PostgresFixture postgres) : IAsyncLifetime
{
    protected static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    protected PostgresFixture Postgres { get; } = postgres;
    protected FakeIgdbClient Igdb { get; } = new();

    /// <summary>
    /// The running test's cancellation token. Threading it through every await is what lets
    /// xUnit actually cancel a hung test instead of waiting out the timeout.
    /// </summary>
    protected static CancellationToken Ct => TestContext.Current.CancellationToken;

    private ApiFactory? _factory;
    private HttpClient? _client;

    protected ApiFactory Factory => _factory ??= new ApiFactory(Postgres, Igdb);
    protected HttpClient Client => _client ??= Factory.CreateClient();

    public virtual async ValueTask InitializeAsync() => await Postgres.ResetAsync();

    public virtual async ValueTask DisposeAsync()
    {
        _client?.Dispose();

        if (_factory is not null)
        {
            await _factory.DisposeAsync();
        }

        GC.SuppressFinalize(this);
    }

    /// <summary>Runs work against the test database, for arranging state or asserting on it.</summary>
    protected async Task<T> WithDbAsync<T>(Func<HobbyTrackerDbContext, Task<T>> work)
    {
        await using var db = Postgres.CreateDbContext();
        return await work(db);
    }

    protected async Task WithDbAsync(Func<HobbyTrackerDbContext, Task> work)
    {
        await using var db = Postgres.CreateDbContext();
        await work(db);
    }

    /// <summary>Resolves a scoped service from the running host, e.g. to test a service directly.</summary>
    protected async Task<T> WithScopeAsync<T>(Func<IServiceProvider, Task<T>> work)
    {
        using var scope = Factory.Services.CreateScope();
        return await work(scope.ServiceProvider);
    }

    protected static async Task<T> ReadAsync<T>(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<T>(Json)
        ?? throw new InvalidOperationException($"Response body was null: {typeof(T).Name}");

    // ---------------------------------------------------------------- arrange

    /// <summary>Inserts a game straight into the catalog, bypassing IGDB.</summary>
    protected Task<int> GivenGameAsync(
        string title = "Test Game",
        string externalId = "1",
        string? coverUrl = null,
        string[]? platforms = null) => WithDbAsync(async db =>
        {
            var game = new Game
            {
                HobbyId = SeedData.Hobbies.Games,
                SourceId = SeedData.Sources.Igdb,
                ExternalId = externalId,
                Title = title,
                CoverUrl = coverUrl,
                Platforms = [.. platforms ?? []],
            };

            db.Games.Add(game);
            await db.SaveChangesAsync(Ct);
            return game.Id;
        });

    /// <summary>
    /// Inserts a media row with no detail table behind it — what a movie looks like before
    /// Phase 4 adds its sibling table. Only expressible because the mapping is TPT.
    /// </summary>
    protected Task<int> GivenNonGameMediaAsync(
        int hobbyId, string title = "Some Film") => WithDbAsync(async db =>
        {
            var media = new Media
            {
                HobbyId = hobbyId,
                SourceId = SeedData.Sources.Manual,
                Title = title,
            };

            db.Media.Add(media);
            await db.SaveChangesAsync(Ct);
            return media.Id;
        });

    protected Task<int> GivenLogEntryAsync(
        int mediaId,
        LogStatus status = LogStatus.Backlog,
        decimal? rating = null,
        DateOnly? dateStarted = null,
        DateOnly? dateCompleted = null,
        string? notes = null) => WithDbAsync(async db =>
        {
            var entry = new LogEntry
            {
                MediaId = mediaId,
                Status = status,
                Rating = rating,
                Notes = notes,
                DateStarted = dateStarted,
                DateCompleted = dateCompleted,
            };

            db.LogEntries.Add(entry);
            await db.SaveChangesAsync(Ct);
            return entry.Id;
        });
}
