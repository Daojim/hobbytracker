using HobbyTracker.Api.Integrations.Mal;
using HobbyTracker.Api.Integrations.Mal.Models;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Stands in for MyAnimeList so tests never touch the network.
///
/// <see cref="FakeTmdbClient"/>'s shape, because the payoff is the same one: IMalClient being an
/// interface means the catalog service and the endpoint are exercised exactly as they run in
/// production, with only the outermost HTTP boundary replaced.
///
/// <b>One thing is genuinely simpler here, and it is worth not "fixing".</b> A film is two
/// answers — a thin search result and a fat detail — so FakeTmdbClient keeps two dictionaries.
/// MAL answers the same node at both endpoints, so this keeps one canned anime per id and hands
/// it back to whichever call asks. A fake with two shapes would be inventing a distinction the
/// real provider does not have, and would let a bug that read the wrong one pass.
/// </summary>
public sealed class FakeMalClient : IMalClient
{
    private readonly List<(string Search, int Limit)> _calls = [];

    /// <summary>Every search this client was asked for, in order.</summary>
    public IReadOnlyList<(string Search, int Limit)> Calls => _calls;

    /// <summary>Canned results per search term. Falls back to <see cref="DefaultResults"/>.</summary>
    public Dictionary<string, List<MalAnime>> Results { get; } = new(StringComparer.OrdinalIgnoreCase);

    public List<MalAnime> DefaultResults { get; set; } = [];

    /// <summary>Every id anybody asked for, in order.</summary>
    public List<int> IdLookups { get; } = [];

    /// <summary>Canned entries per id. An id absent from here is one MAL does not know.</summary>
    public Dictionary<int, MalAnime> ById { get; } = [];

    /// <summary>Set to make the next call throw, for exercising the 502 path.</summary>
    public Exception? ThrowOnNextCall { get; set; }

    public Task<IReadOnlyList<MalAnime>> SearchAsync(
        string search, int limit, CancellationToken cancellationToken)
    {
        _calls.Add((search, limit));
        ThrowIfAsked();

        var results = Results.TryGetValue(search, out var found) ? found : DefaultResults;

        // Honour the limit the way the real client does — MAL takes one and applies it — so a
        // test can assert on it meaningfully.
        return Task.FromResult<IReadOnlyList<MalAnime>>([.. results.Take(limit)]);
    }

    public Task<MalAnime?> GetAsync(int id, CancellationToken cancellationToken)
    {
        IdLookups.Add(id);
        ThrowIfAsked();

        return Task.FromResult(ById.GetValueOrDefault(id));
    }

    private void ThrowIfAsked()
    {
        if (ThrowOnNextCall is { } exception)
        {
            ThrowOnNextCall = null;
            throw exception;
        }
    }

    public void SetResults(string search, params MalAnime[] anime) => Results[search] = [.. anime];

    /// <summary>
    /// One anime, shaped the way a MAL node is.
    ///
    /// <paramref name="episodes"/> and <paramref name="episodeSeconds"/> default to null rather
    /// than to nought, and a test about the unaired case says <c>0</c> explicitly — which is
    /// what MAL actually answers there, and the distinction the catalog service exists to keep.
    /// </summary>
    public static MalAnime Anime(
        int id,
        string title,
        string? englishTitle = null,
        string? picture = null,
        string? mediaType = null,
        int? episodes = null,
        int? episodeSeconds = null,
        string? season = null,
        int? year = null,
        string? status = null,
        string? source = null,
        double? mean = null,
        int? users = null,
        string[]? genres = null,
        string[]? studios = null,
        string[]? synonyms = null) => new()
        {
            Id = id,
            Title = title,
            MainPicture = picture is null ? null : new MalPicture { Medium = picture },
            AlternativeTitles = new MalAlternativeTitles
            {
                En = englishTitle,
                Synonyms = [.. synonyms ?? []],
            },
            MediaType = mediaType,
            NumEpisodes = episodes,
            AverageEpisodeDuration = episodeSeconds,
            StartSeason = season is null && year is null
                ? null
                : new MalStartSeason { Season = season, Year = year },
            Status = status,
            Source = source,
            Mean = mean,
            NumListUsers = users,
            Genres = [.. (genres ?? []).Select((name, index) => new MalNamed { Id = index, Name = name })],
            Studios = [.. (studios ?? []).Select((name, index) => new MalNamed { Id = index, Name = name })],
        };
}
