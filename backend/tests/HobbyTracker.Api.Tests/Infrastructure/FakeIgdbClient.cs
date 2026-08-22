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

    /// <summary>Builds an IGDB game the way the real API shapes one.</summary>
    public static IgdbGame Game(
        int id,
        string name,
        string? coverImageId = null,
        string[]? platforms = null,
        string[]? developers = null,
        string[]? genres = null) => new()
        {
            Id = id,
            Name = name,
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
