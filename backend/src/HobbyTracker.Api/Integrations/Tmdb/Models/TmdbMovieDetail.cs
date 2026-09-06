namespace HobbyTracker.Api.Integrations.Tmdb.Models;

/// <summary>
/// A film as `/movie/{id}?append_to_response=credits` describes one — everything a card and a
/// drawer need, in one request.
/// </summary>
public sealed class TmdbMovieDetail
{
    public int Id { get; init; }
    public string? Title { get; init; }
    public string? ReleaseDate { get; init; }
    public string? PosterPath { get; init; }

    /// <summary>
    /// Minutes. **Null or 0 for a film nobody has filled it in for**, and those are the same
    /// claim as far as this app is concerned — neither is a runtime. `ck_movies_runtime_positive`
    /// is what stops a 0 reaching the column and being printed on a card as a fact.
    /// </summary>
    public int? Runtime { get; init; }

    /// <summary>Named, unlike the ids a search answers with.</summary>
    public List<TmdbGenre>? Genres { get; init; }

    /// <summary>Present only because the request asked for it by name.</summary>
    public TmdbCredits? Credits { get; init; }
}

public sealed class TmdbGenre
{
    public int Id { get; init; }
    public string? Name { get; init; }
}

public sealed class TmdbCredits
{
    public List<TmdbCrewMember>? Crew { get; init; }
}

public sealed class TmdbCrewMember
{
    public string? Name { get; init; }

    /// <summary>"Director" is the one this app reads. The crew list carries dozens.</summary>
    public string? Job { get; init; }
}
