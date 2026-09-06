using HobbyTracker.Api.Integrations.Tmdb;
using HobbyTracker.Api.Integrations.Tmdb.Models;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Stands in for TMDB so tests never touch the network.
///
/// FakeIgdbClient's shape, line for line, because the payoff is the same one: ITmdbClient being
/// an interface means the catalog service and the endpoint are exercised exactly as they run in
/// production, with only the outermost HTTP boundary replaced.
///
/// The one difference is that a film is two answers rather than one — a search result and a
/// detail — because that is what TMDB is. <see cref="ById"/> is what an add and the backfill
/// both read, and leaving an id out of it is how a test says "TMDB has never heard of this".
/// </summary>
public sealed class FakeTmdbClient : ITmdbClient
{
    private readonly List<(string Search, int Limit)> _calls = [];

    /// <summary>Every search this client was asked for, in order.</summary>
    public IReadOnlyList<(string Search, int Limit)> Calls => _calls;

    /// <summary>Canned results per search term. Falls back to <see cref="DefaultResults"/>.</summary>
    public Dictionary<string, List<TmdbMovie>> Results { get; } = new(StringComparer.OrdinalIgnoreCase);

    public List<TmdbMovie> DefaultResults { get; set; } = [];

    /// <summary>Every id anybody asked for the detail of, in order.</summary>
    public List<int> IdLookups { get; } = [];

    /// <summary>Canned details per id. An id absent from here is one TMDB does not know.</summary>
    public Dictionary<int, TmdbMovieDetail> ById { get; } = [];

    /// <summary>Set to make the next call throw, for exercising the 502 path.</summary>
    public Exception? ThrowOnNextCall { get; set; }

    public Task<IReadOnlyList<TmdbMovie>> SearchMoviesAsync(
        string search, int limit, CancellationToken cancellationToken)
    {
        _calls.Add((search, limit));
        ThrowIfAsked();

        var results = Results.TryGetValue(search, out var found) ? found : DefaultResults;

        // Honour the limit the way the real client does, so a test can assert on it meaningfully.
        return Task.FromResult<IReadOnlyList<TmdbMovie>>([.. results.Take(limit)]);
    }

    public Task<TmdbMovieDetail?> GetMovieAsync(int id, CancellationToken cancellationToken)
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

    public void SetResults(string search, params TmdbMovie[] movies) => Results[search] = [.. movies];

    /// <summary>A search result, shaped the way /search/movie shapes one.</summary>
    public static TmdbMovie Movie(
        int id,
        string title,
        string? releaseDate = null,
        string? posterPath = null,
        int? voteCount = null) => new()
        {
            Id = id,
            Title = title,
            ReleaseDate = releaseDate,
            PosterPath = posterPath,
            VoteCount = voteCount,
        };

    /// <summary>A detail, shaped the way /movie/{id}?append_to_response=credits shapes one.</summary>
    public static TmdbMovieDetail Detail(
        int id,
        string title,
        int? runtime = null,
        string? releaseDate = null,
        string? posterPath = null,
        string[]? genres = null,
        string[]? directors = null) => new()
        {
            Id = id,
            Title = title,
            Runtime = runtime,
            ReleaseDate = releaseDate,
            PosterPath = posterPath,
            Genres = [.. (genres ?? []).Select((name, index) => new TmdbGenre { Id = index, Name = name })],
            Credits = new TmdbCredits
            {
                Crew =
                [
                    // A real crew list is dozens long and mostly not directors, which is the
                    // point of filtering on the job rather than taking the first name.
                    new TmdbCrewMember { Job = "Editor", Name = "Somebody Else" },
                    .. (directors ?? []).Select(name => new TmdbCrewMember { Job = "Director", Name = name }),
                ],
            },
        };
}
