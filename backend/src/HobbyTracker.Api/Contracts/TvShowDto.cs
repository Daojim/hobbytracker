using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// A show as the API hands one back — <see cref="MovieDto"/>'s and <see cref="GameDto"/>'s
/// counterpart, and deliberately their shape rather than a generalisation of the three. What a
/// show is and what a film is genuinely differ, and a single "media" DTO carrying every hobby's
/// columns would be the mostly-null swamp the schema already refused once.
/// </summary>
public sealed record TvShowDto(
    int Id,
    string Title,
    string? CoverUrl,

    /// <summary>The year it first aired. Absent from search results until the show is added.</summary>
    int? FirstAirYear,

    /// <summary>Null while a show is still running, which is a fact rather than a gap.</summary>
    int? LastAirYear,

    /// <summary>
    /// TMDB's own word — Returning Series, Ended, Canceled, In Production, Planned, Pilot.
    /// Sent raw and made readable on the client, exactly as a runtime in minutes is.
    /// </summary>
    string? AirStatus,

    int? NumberOfSeasons,
    int? NumberOfEpisodes,

    /// <summary>Minutes for one episode, or null for a show nobody has timed.</summary>
    int? EpisodeRuntimeMinutes,

    IReadOnlyList<string> Genres,
    string? PrimaryGenre,

    /// <summary>
    /// The byline under the drawer's title. Plural because shows are co-created, and
    /// **routinely empty** — documentaries and most non-US productions carry no creator at all.
    /// </summary>
    IReadOnlyList<string> Creators,

    string? ExternalId,
    string Source)
{
    public static TvShowDto From(TvShow show) => new(
        show.Id,
        show.Title,
        show.CoverUrl,
        show.FirstAirYear,
        show.LastAirYear,
        show.AirStatus,
        show.NumberOfSeasons,
        show.NumberOfEpisodes,
        show.EpisodeRuntimeMinutes,
        show.Genres,
        show.PrimaryGenre,
        show.Creators,
        show.ExternalId,
        SeedData.Sources.NameFor(show.SourceId));
}

/// <summary>
/// One season, as the journal's two dropdowns need it: which one, what it is called, and how
/// many episodes are in it.
/// </summary>
public sealed record TvSeasonDto(int SeasonNumber, string? Name, int EpisodeCount)
{
    public static TvSeasonDto From(TvSeason season) =>
        new(season.SeasonNumber, season.Name, season.EpisodeCount);
}

/// <summary>
/// Chooses which genre stands for a show on the board, or clears the choice with a null.
///
/// The attribute sits on the primary-constructor parameter rather than behind a [property:]
/// target, which MVC refuses outright rather than quietly skipping.
/// </summary>
public sealed record SetTvGenreRequest([MaxLength(50)] string? Genre);
