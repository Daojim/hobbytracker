using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// A film as the API hands one back — <see cref="GameDto"/>'s counterpart, and deliberately its
/// shape rather than a generalisation of it. What a film is and what a game is genuinely differ,
/// and a single "media" DTO carrying both would be the mostly-null swamp the schema already
/// refused once.
/// </summary>
public sealed record MovieDto(
    int Id,
    string Title,
    string? CoverUrl,
    int? ReleaseYear,

    /// <summary>
    /// Minutes, or null for a film TMDB has no runtime for. Absent until the title is added —
    /// TMDB's search endpoint does not carry it.
    /// </summary>
    int? RuntimeMinutes,

    IReadOnlyList<string> Genres,
    string? PrimaryGenre,

    /// <summary>The byline under the drawer's title. Plural because films are co-directed.</summary>
    IReadOnlyList<string> Directors,

    string? ExternalId,
    string Source)
{
    public static MovieDto From(Movie movie) => new(
        movie.Id,
        movie.Title,
        movie.CoverUrl,
        movie.ReleaseYear,
        movie.RuntimeMinutes,
        movie.Genres,
        movie.PrimaryGenre,
        movie.Directors,
        movie.ExternalId,
        SeedData.Sources.NameFor(movie.SourceId));
}

/// <summary>
/// Chooses which genre stands for a film on the board, or clears the choice with a null.
///
/// The attribute sits on the primary-constructor parameter rather than behind a [property:]
/// target, which MVC refuses outright rather than quietly skipping.
/// </summary>
public sealed record SetMovieGenreRequest([MaxLength(50)] string? Genre);
