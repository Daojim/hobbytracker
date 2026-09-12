using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Integrations.Igdb.Models;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Stands in for IGDB so tests never touch the network.
///
/// That this is a two-line swap is a payoff from the IGDB work keeping IIgdbClient an interface:
/// the catalog service and the endpoint are exercised exactly as they run in production, with
/// only the outermost HTTP boundary replaced.
/// </summary>
public sealed class FakeIgdbClient : IIgdbClient
{
    private readonly List<(string Search, int Limit)> _calls = [];

    /// <summary>Every search this client was asked for, in order.</summary>
    public IReadOnlyList<(string Search, int Limit)> Calls => _calls;

    /// <summary>Canned results per search term. Falls back to <see cref="DefaultResults"/>.</summary>
    public Dictionary<string, List<IgdbGame>> Results { get; } = new(StringComparer.OrdinalIgnoreCase);

    public List<IgdbGame> DefaultResults { get; set; } = [];

    /// <summary>Set to make the next call throw, for exercising the 502 path.</summary>
    public Exception? ThrowOnNextCall { get; set; }

    public Task<IReadOnlyList<IgdbGame>> SearchGamesAsync(
        string search, int limit, CancellationToken cancellationToken)
    {
        _calls.Add((search, limit));

        if (ThrowOnNextCall is { } exception)
        {
            ThrowOnNextCall = null;
            throw exception;
        }

        var results = Results.TryGetValue(search, out var found) ? found : DefaultResults;

        // Honour limit the way IGDB would, so tests can assert on it meaningfully.
        return Task.FromResult<IReadOnlyList<IgdbGame>>([.. results.Take(limit)]);
    }


    /// <summary>Every set of ids the backfill asked for, in order.</summary>
    public List<int[]> IdLookups { get; } = [];

    /// <summary>Canned results per IGDB id, for the backfill path.</summary>
    public Dictionary<int, IgdbGame> ById { get; } = [];

    public Task<IReadOnlyList<IgdbGame>> GetGamesAsync(
        IEnumerable<int> ids, CancellationToken cancellationToken)
    {
        var wanted = ids.ToArray();
        IdLookups.Add(wanted);

        if (ThrowOnNextCall is { } exception)
        {
            ThrowOnNextCall = null;
            throw exception;
        }

        return Task.FromResult<IReadOnlyList<IgdbGame>>(
            [.. wanted.Where(ById.ContainsKey).Select(id => ById[id])]);
    }

    public void SetResults(string search, params IgdbGame[] games) =>
        Results[search] = [.. games];

    /// <summary>
    /// What a lookup by id will find, replacing whatever was there. Passing nothing is a real
    /// case rather than a degenerate one: IGDB stops answering for entries that get merged or
    /// withdrawn, and a refresh has to leave those rows as they were.
    /// </summary>
    public void SetGames(params IgdbGame[] games)
    {
        ById.Clear();

        foreach (var game in games)
        {
            ById[game.Id] = game;
        }
    }

    /// <summary>Builds an IGDB game the way the real API shapes one.</summary>
    /// <param name="releaseDate">
    /// Taken as a day and sent as midnight UTC of it, which is how IGDB sends one. For a vague
    /// <paramref name="dateFormat"/> give the day IGDB would give — the <i>last</i> of the
    /// window, so "Q3 2026" is 30 September — since reproducing that is most of the point.
    /// </param>
    /// <param name="dateFormat">
    /// One of IGDB's eight: YYYYMMDD, YYYYMM, YYYY, YYYYQ1-Q4, TBD. Null alongside a date means
    /// a game whose release_dates rows IGDB has pruned, which is a real shape and its own test.
    /// </param>
    public static IgdbGame Game(
        int id,
        string name,
        string? coverImageId = null,
        string[]? platforms = null,
        string[]? developers = null,
        string[]? genres = null,
        DateOnly? releaseDate = null,
        string? dateFormat = null,
        string? gameStatus = null) => new()
        {
            Id = id,
            Name = name,
            FirstReleaseDate = releaseDate is { } day
                ? new DateTimeOffset(day.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero).ToUnixTimeSeconds()
                : null,
            ReleaseDates = dateFormat is null
                ? null
                :
                [
                    new IgdbReleaseDate
                    {
                        // A TBD row carries no date at all, which is what IGDB actually sends
                        // and what the matching has to walk over.
                        Date = releaseDate is { } announced
                            ? new DateTimeOffset(announced.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero).ToUnixTimeSeconds()
                            : null,
                        DateFormat = new IgdbDateFormat { Format = dateFormat },
                    },
                ],
            GameStatus = gameStatus is null ? null : new IgdbGameStatus { Status = gameStatus },
            Cover = coverImageId is null ? null : new IgdbCover { ImageId = coverImageId },
            Platforms = [.. (platforms ?? []).Select(p => new IgdbPlatform { Name = p })],
            Genres = [.. (genres ?? []).Select(g => new IgdbGenre { Name = g })],
            InvolvedCompanies =
            [
                .. (developers ?? []).Select(d => new IgdbInvolvedCompany
                {
                    Developer = true,
                    Company = new IgdbCompany { Name = d },
                }),
            ],
        };
}
