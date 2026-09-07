using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
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

    /// <summary>TMDB, for the films half of the catalogue. See FakeTmdbClient.</summary>
    protected FakeTmdbClient Tmdb { get; } = new();

    /// <summary>HowLongToBeat, and the queue that would have asked it. See FakeHltbQueue.</summary>
    protected FakeHltbClient Hltb { get; } = new();

    protected FakeHltbQueue HltbQueue { get; } = new();

    /// <summary>
    /// The host's clock, stopped. xUnit builds a fresh instance of the test class per fact, so
    /// each test owns its own and moving it cannot disturb anything running alongside.
    /// </summary>
    protected FrozenTimeProvider Clock { get; } = new();

    /// <summary>
    /// The host's own journal clock, for asking which day here a stored instant falls on.
    /// </summary>
    protected IJournalClock Journal => Factory.Services.GetRequiredService<IJournalClock>();

    private static readonly TimeZoneInfo EasternZone =
        TimeZoneInfo.FindSystemTimeZoneById("America/New_York");

    /// <summary>
    /// A moment in the journal's zone, for arranging fixtures. Midday by default, so a fixture
    /// never lands on a date boundary by accident — a test that cares about one says so.
    /// </summary>
    protected static DateTimeOffset Eastern(
        int year, int month, int day, int hour = 12, int minute = 0)
    {
        var local = new DateTime(year, month, day, hour, minute, 0, DateTimeKind.Unspecified);
        // Normalised to UTC: Npgsql will only write offset 0 to a timestamptz, and the offset
        // is not stored anyway — the column holds an instant, not a local time plus a zone.
        return new DateTimeOffset(local, EasternZone.GetUtcOffset(local)).ToUniversalTime();
    }

    /// <summary>
    /// The running test's cancellation token. Threading it through every await is what lets
    /// xUnit actually cancel a hung test instead of waiting out the timeout.
    /// </summary>
    protected static CancellationToken Ct => TestContext.Current.CancellationToken;

    private ApiFactory? _factory;
    private HttpClient? _client;
    private HttpClient? _anonymousClient;
    private readonly List<HttpClient> _extraClients = [];

    protected ApiFactory Factory => _factory ??= new ApiFactory(Postgres, Igdb, Tmdb, Hltb, HltbQueue, Clock);
    /// <summary>
    /// Whose journal this is. Created fresh per test, because Respawn truncates users between
    /// them; every fixture below and every request through <see cref="Client"/> belongs to it.
    /// </summary>
    protected int UserId { get; private set; }

    /// <summary>Signed in as <see cref="UserId"/>, which is what almost every test wants.</summary>
    protected HttpClient Client => _client ??= ClientFor(UserId);

    /// <summary>Nobody signed in at all, for asserting that a route says so.</summary>
    protected HttpClient AnonymousClient => _anonymousClient ??= Factory.CreateClient();

    /// <summary>
    /// A client signed in as one particular user. Two of these is how a test says "and the
    /// other person sees none of it", which is the only shape that can catch a leak.
    /// </summary>
    protected HttpClient ClientFor(int userId)
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add(
            TestAuthHandler.UserHeader, userId.ToString(CultureInfo.InvariantCulture));

        _extraClients.Add(client);
        return client;
    }

    public virtual async ValueTask InitializeAsync()
    {
        await Postgres.ResetAsync();

        // After the reset, not before: the truncate would take it straight back out again.
        UserId = await GivenUserAsync();
    }

    public virtual async ValueTask DisposeAsync()
    {
        _client?.Dispose();
        _anonymousClient?.Dispose();

        foreach (var client in _extraClients)
        {
            client.Dispose();
        }

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

    /// <summary>Inserts a film straight into the catalog, bypassing TMDB.</summary>
    protected Task<int> GivenMovieAsync(
        string title = "Test Film",
        string externalId = "1",
        string? coverUrl = null,
        int? runtimeMinutes = null,
        string[]? genres = null,
        string[]? directors = null) => WithDbAsync(async db =>
        {
            var movie = new Movie
            {
                HobbyId = SeedData.Hobbies.Movies,
                SourceId = SeedData.Sources.Tmdb,
                ExternalId = externalId,
                Title = title,
                CoverUrl = coverUrl,
                RuntimeMinutes = runtimeMinutes,
                Genres = [.. genres ?? []],
                Directors = [.. directors ?? []],
            };

            db.Movies.Add(movie);
            await db.SaveChangesAsync(Ct);
            return movie.Id;
        });

    /// <summary>
    /// Inserts a show straight into the catalog, bypassing TMDB.
    ///
    /// <paramref name="seasons"/> is what the journal's two dropdowns are built from, so a test
    /// about the episode list wants uneven ones — equal seasons would let a control that ignored
    /// the chosen season pass.
    /// </summary>
    protected Task<int> GivenShowAsync(
        string title = "Test Show",
        string externalId = "1",
        string? coverUrl = null,
        int? numberOfSeasons = null,
        int? numberOfEpisodes = null,
        int? episodeRuntimeMinutes = null,
        string? airStatus = null,
        int? firstAirYear = null,
        int? lastAirYear = null,
        string[]? genres = null,
        string[]? creators = null,
        (int Number, int Episodes, string? Name)[]? seasons = null) => WithDbAsync(async db =>
        {
            var show = new TvShow
            {
                HobbyId = SeedData.Hobbies.Tv,

                // The source that keeps TMDB's film 1396 and its show 1396 apart. A test seeding
                // Sources.Tmdb here would collide with a film of the same id, which is the whole
                // thing the fourth row exists to prevent.
                SourceId = SeedData.Sources.TmdbTv,

                ExternalId = externalId,
                Title = title,
                CoverUrl = coverUrl,
                NumberOfSeasons = numberOfSeasons,
                NumberOfEpisodes = numberOfEpisodes,
                EpisodeRuntimeMinutes = episodeRuntimeMinutes,
                AirStatus = airStatus,
                FirstAirYear = firstAirYear,
                LastAirYear = lastAirYear,
                Genres = [.. genres ?? []],
                Creators = [.. creators ?? []],
                Seasons =
                [
                    .. (seasons ?? []).Select(season => new TvSeason
                    {
                        SeasonNumber = season.Number,
                        EpisodeCount = season.Episodes,
                        Name = season.Name,
                    }),
                ],
            };

            db.TvShows.Add(show);
            await db.SaveChangesAsync(Ct);
            return show.Id;
        });

    /// <summary>
    /// Inserts an anime straight into the catalog, bypassing MAL.
    ///
    /// No seasons parameter, and that absence is the decision rather than an omission: MAL
    /// numbers each cour as its own entry, so a second cour is a second call to this.
    /// <paramref name="episodeRuntimeSeconds"/> is in MAL's own unit, which is what the
    /// generated `total_runtime_minutes` converts.
    /// </summary>
    protected Task<int> GivenAnimeAsync(
        string title = "Test Anime",
        string externalId = "1",
        string? englishTitle = null,
        string? coverUrl = null,
        int? episodeCount = null,
        int? episodeRuntimeSeconds = null,
        string? mediaType = null,
        string? airStatus = null,
        string? startSeason = null,
        int? startYear = null,
        string? sourceMaterial = null,
        decimal? meanScore = null,
        string[]? genres = null,
        string[]? studios = null) => WithDbAsync(async db =>
        {
            var anime = new Anime
            {
                HobbyId = SeedData.Hobbies.Anime,

                // The fifth source row. MAL numbers its catalogue independently of both TMDB
                // sequences, so a test seeding Sources.Tmdb here would collide with a film of
                // the same id — the thing the row exists to prevent.
                SourceId = SeedData.Sources.Mal,

                ExternalId = externalId,
                Title = title,
                EnglishTitle = englishTitle,
                CoverUrl = coverUrl,
                EpisodeCount = episodeCount,
                EpisodeRuntimeSeconds = episodeRuntimeSeconds,
                MediaType = mediaType,
                AirStatus = airStatus,
                StartSeason = startSeason,
                StartYear = startYear,
                SourceMaterial = sourceMaterial,
                MeanScore = meanScore,
                Genres = [.. genres ?? []],
                Studios = [.. studios ?? []],
            };

            db.Anime.Add(anime);
            await db.SaveChangesAsync(Ct);
            return anime.Id;
        });

    /// <summary>
    /// Inserts a media row with no detail table behind it. Only expressible because the mapping
    /// is TPT.
    ///
    /// It used to say "what a movie looks like before movies get their sibling table", and
    /// movies have one now — so this means books, or tv, or anything else whose phase has not
    /// come. Still worth keeping: a board has to survive a hobby that has nothing behind it.
    /// </summary>
    protected Task<int> GivenNonGameMediaAsync(
        int hobbyId, string title = "Some Book") => WithDbAsync(async db =>
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

    /// <param name="userId">
    /// Whose pass this is. Defaults to <see cref="UserId"/>, so a test that does not care about
    /// ownership reads exactly as it did before there was any.
    /// </param>
    protected Task<int> GivenLogEntryAsync(
        int mediaId,
        LogStatus status = LogStatus.Backlog,
        decimal? rating = null,
        DateTimeOffset? startedAt = null,
        DateTimeOffset? completedAt = null,
        string? platform = null,
        int? userId = null) => WithDbAsync(async db =>
        {
            var entry = new LogEntry
            {
                MediaId = mediaId,
                UserId = userId ?? UserId,
                Status = status,
                Rating = rating,
                Platform = platform,
                StartedAt = startedAt,
                CompletedAt = completedAt,

                // Not null-able in the schema, and these rows bypass the service that would
                // otherwise stamp it. Pinned to the stopped clock so it is deterministic.
                LoggedAt = Clock.UtcNow,
            };

            db.LogEntries.Add(entry);
            await db.SaveChangesAsync(Ct);
            return entry.Id;
        });

    /// <summary>
    /// One thing written down during a pass. A note has no owner of its own — it belongs to
    /// whoever owns the entry it hangs off — so the <paramref name="entryId"/> decides that.
    /// </summary>
    /// <param name="writtenAt">
    /// Defaults to the stopped clock, which every note seeded in one test then shares. A test
    /// about which note is newest has to say so rather than leaning on the insertion order the
    /// id tie-break would otherwise settle it by.
    /// </param>
    protected Task<int> GivenNoteAsync(
        int entryId,
        string body = "A note",
        DateTimeOffset? writtenAt = null) => WithDbAsync(async db =>
        {
            var note = new Note
            {
                LogEntryId = entryId,
                Body = body,
                WrittenAt = writtenAt ?? Clock.UtcNow,
            };

            db.Notes.Add(note);
            await db.SaveChangesAsync(Ct);
            return note.Id;
        });

    /// <summary>
    /// Somebody to own rows. Respawn truncates <c>users</c> between tests, so each one makes its
    /// own rather than sharing a fixture — which is also what lets a test make two.
    /// </summary>
    protected Task<int> GivenUserAsync(string displayName = "Test User") => WithDbAsync(async db =>
        {
            var user = new User
            {
                DisplayName = displayName,

                // Not nullable, and these rows bypass the service that would stamp it. Pinned to
                // the stopped clock so it is deterministic, exactly as LoggedAt is.
                CreatedAt = Clock.UtcNow,
            };

            db.Users.Add(user);
            await db.SaveChangesAsync(Ct);
            return user.Id;
        });
}
