using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// An anime as the API hands one back — <see cref="TvShowDto"/>'s counterpart, and deliberately
/// its shape rather than a generalisation of the four. What an anime is and what a show is
/// genuinely differ, and a single "media" DTO carrying every hobby's columns would be the
/// mostly-null swamp the schema already refused once.
///
/// <b>Unlike the other three, this is complete straight out of a search.</b> MAL's search and
/// detail endpoints take the same `fields` and answer with the same node, so nothing here is
/// filled in later — which is why anime has no <c>IMediaAdded</c> handler where films and shows
/// both need one.
/// </summary>
public sealed record AnimeDto(
    int Id,

    /// <summary>The romaji title, which is MAL's own `title` and what its search matches on.</summary>
    string Title,

    /// <summary>
    /// The English title, or null — which is the ordinary case rather than a gap. It is the
    /// second line under a card's heading, and reaches the board row as
    /// <see cref="LibraryItemDto.Subtitle"/>.
    /// </summary>
    string? EnglishTitle,

    string? CoverUrl,

    /// <summary>MAL's own word for the shape of it: `tv`, `movie`, `ova`, `ona`, `special`.</summary>
    string? MediaType,

    /// <summary>Null for a cour nobody has counted — MAL's own 0 does not survive to here.</summary>
    int? EpisodeCount,

    /// <summary>
    /// One episode in <b>seconds</b>, MAL's own unit, carried through untouched. The client
    /// divides it for display, exactly as it recovers a film's runtime from hours.
    /// </summary>
    int? EpisodeRuntimeSeconds,

    /// <summary>Which cour it began in — `fall`, with <see cref="StartYear"/> beside it.</summary>
    string? StartSeason,
    int? StartYear,

    /// <summary>`finished_airing`, `currently_airing`, `not_yet_aired`. Made readable on the client.</summary>
    string? AirStatus,

    /// <summary>What it was adapted from: `manga`, `light_novel`, `original`.</summary>
    string? SourceMaterial,

    IReadOnlyList<string> Genres,
    string? PrimaryGenre,

    /// <summary>Who animated it. The byline under the drawer's title.</summary>
    IReadOnlyList<string> Studios,

    /// <summary>MAL's mean user score, out of ten — the same scale a pass's own rating uses.</summary>
    decimal? MeanScore,

    string? ExternalId,
    string Source)
{
    public static AnimeDto From(Anime anime) => new(
        anime.Id,
        anime.Title,
        anime.EnglishTitle,
        anime.CoverUrl,
        anime.MediaType,
        anime.EpisodeCount,
        anime.EpisodeRuntimeSeconds,
        anime.StartSeason,
        anime.StartYear,
        anime.AirStatus,
        anime.SourceMaterial,
        anime.Genres,
        anime.PrimaryGenre,
        anime.Studios,
        anime.MeanScore,
        anime.ExternalId,
        SeedData.Sources.NameFor(anime.SourceId));
}

/// <summary>
/// One anime and everything you have logged against it, in a single response — what the journal
/// drawer opens on.
///
/// <b>No seasons list, and that absence is the decision rather than an omission.</b> A cour is
/// its own MAL entry, so the drawer's episode control is sized from
/// <see cref="AnimeDto.EpisodeCount"/> directly and there is nothing to choose a season from.
/// </summary>
public sealed record AnimeDetailDto(
    int Id,
    string Title,
    string? EnglishTitle,
    string? CoverUrl,
    string? MediaType,
    int? EpisodeCount,
    int? EpisodeRuntimeSeconds,
    string? StartSeason,
    int? StartYear,
    string? AirStatus,
    string? SourceMaterial,
    IReadOnlyList<string> Genres,
    string? PrimaryGenre,
    IReadOnlyList<string> Studios,
    decimal? MeanScore,
    string? ExternalId,
    string Source,

    /// <summary>
    /// Newest first, ordered <c>logged_at DESC, id DESC</c> — the same rule the board decides
    /// which pass is current by, so <c>logEntries[0]</c> is the pass the card is showing. This
    /// is the sixth place that ordering is stated and all of them must agree; see
    /// <b>Library is not the catalog</b> in docs/board.md.
    /// </summary>
    IReadOnlyList<LogEntryDto> LogEntries)
{
    public static AnimeDetailDto From(Anime anime, IReadOnlyList<LogEntry> entries) => new(
        anime.Id,
        anime.Title,
        anime.EnglishTitle,
        anime.CoverUrl,
        anime.MediaType,
        anime.EpisodeCount,
        anime.EpisodeRuntimeSeconds,
        anime.StartSeason,
        anime.StartYear,
        anime.AirStatus,
        anime.SourceMaterial,
        anime.Genres,
        anime.PrimaryGenre,
        anime.Studios,
        anime.MeanScore,
        anime.ExternalId,
        SeedData.Sources.NameFor(anime.SourceId),
        [.. entries.Select(LogEntryDto.From)]);
}

/// <summary>
/// Chooses which genre stands for an anime on the board, or clears the choice with a null.
///
/// The attribute sits on the primary-constructor parameter rather than behind a [property:]
/// target, which MVC refuses outright rather than quietly skipping.
/// </summary>
public sealed record SetAnimeGenreRequest([MaxLength(50)] string? Genre);
