using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// One show and everything you have logged against it, in a single response — what the journal
/// drawer opens on. <see cref="MovieDetailDto"/>'s counterpart, with one addition that is the
/// whole reason TV needed its own detail call.
/// </summary>
public sealed record TvShowDetailDto(
    int Id,
    string Title,
    string? CoverUrl,
    int? FirstAirYear,
    int? LastAirYear,
    string? AirStatus,
    int? NumberOfSeasons,
    int? NumberOfEpisodes,
    int? EpisodeRuntimeMinutes,
    IReadOnlyList<string> Genres,
    string? PrimaryGenre,
    IReadOnlyList<string> Creators,
    string? ExternalId,
    string Source,

    /// <summary>
    /// Every season, lowest number first so Specials leads.
    ///
    /// The addition a film has no counterpart for: the journal's season dropdown is built from
    /// this, and the episode dropdown's length comes from whichever entry is chosen. It is why
    /// the drawer's load reaches the detail endpoint rather than reading the board row.
    /// </summary>
    IReadOnlyList<TvSeasonDto> Seasons,

    /// <summary>
    /// Newest first, ordered <c>logged_at DESC, id DESC</c> — the same rule the board decides
    /// which pass is current by, so <c>logEntries[0]</c> is the pass the card is showing. This
    /// is the fifth place that ordering is stated and all of them must agree; see
    /// **Library is not the catalog** in docs/board.md.
    /// </summary>
    IReadOnlyList<LogEntryDto> LogEntries)
{
    public static TvShowDetailDto From(
        TvShow show, IReadOnlyList<TvSeason> seasons, IReadOnlyList<LogEntry> entries) => new(
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
        SeedData.Sources.NameFor(show.SourceId),
        [.. seasons.OrderBy(season => season.SeasonNumber).Select(TvSeasonDto.From)],
        [.. entries.Select(LogEntryDto.From)]);
}
