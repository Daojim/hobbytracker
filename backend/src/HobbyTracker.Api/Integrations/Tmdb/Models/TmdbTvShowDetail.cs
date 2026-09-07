namespace HobbyTracker.Api.Integrations.Tmdb.Models;

/// <summary>
/// Everything `/tv/{id}` answers with that this app has a use for.
///
/// **No `append_to_response`, unlike a film's detail call.** `/movie/{id}` has to append
/// `credits` and filter a crew list hundreds of entries long to find a director;
/// <see cref="CreatedBy"/> and <see cref="Seasons"/> are both on the base TV response. This is
/// the one place television is simpler than film.
/// </summary>
public sealed class TmdbTvShowDetail
{
    public int Id { get; init; }
    public string? Name { get; init; }
    public string? FirstAirDate { get; init; }

    /// <summary>Absent while a show is still running, which is a fact rather than a gap.</summary>
    public string? LastAirDate { get; init; }

    /// <summary>Returning Series, Ended, Canceled, In Production, Planned, Pilot.</summary>
    public string? Status { get; init; }

    public int? NumberOfSeasons { get; init; }
    public int? NumberOfEpisodes { get; init; }
    public string? PosterPath { get; init; }

    /// <summary>
    /// How long an episode runs — an array, because a show can have several usual lengths, and
    /// **frequently empty on newer entries**. The first value is taken and
    /// <see cref="LastEpisodeToAir"/> is the fallback; that fallback is load-bearing rather than
    /// defensive, which is why the e2e stub carries a show that only has the second.
    /// </summary>
    public List<int>? EpisodeRunTime { get; init; }

    /// <summary>Reuses the film models' genre shape — TMDB spells both the same way.</summary>
    public List<TmdbGenre>? Genres { get; init; }

    public List<TmdbCreatedBy>? CreatedBy { get; init; }

    /// <summary>
    /// Every season and how many episodes are in it. This is what the journal's two dropdowns
    /// are ultimately built on, and the reason a show's detail call is worth making at all.
    /// </summary>
    public List<TmdbTvSeason>? Seasons { get; init; }

    /// <summary>Where the episode runtime comes from when the array above is empty.</summary>
    public TmdbEpisode? LastEpisodeToAir { get; init; }
}

/// <summary>Whoever created the show — a game's developer and a film's director's counterpart.</summary>
public sealed class TmdbCreatedBy
{
    public int Id { get; init; }
    public string? Name { get; init; }
}

/// <summary>One season, as TMDB describes it on the show's own response.</summary>
public sealed class TmdbTvSeason
{
    /// <summary>0 is Specials, and TMDB lists it alongside the rest.</summary>
    public int SeasonNumber { get; init; }

    public string? Name { get; init; }
    public int EpisodeCount { get; init; }
    public string? AirDate { get; init; }
}

/// <summary>
/// The last episode that aired. Only its runtime is read — this exists as the fallback for an
/// empty `episode_run_time`, not as a step towards a per-episode catalogue.
/// </summary>
public sealed class TmdbEpisode
{
    public int? Runtime { get; init; }
}
