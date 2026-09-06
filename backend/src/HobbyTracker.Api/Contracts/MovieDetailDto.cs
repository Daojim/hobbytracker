using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// One film and everything you have logged against it, in a single response — what the journal
/// drawer opens on. <see cref="GameDetailDto"/>'s counterpart.
/// </summary>
public sealed record MovieDetailDto(
    int Id,
    string Title,
    string? CoverUrl,
    int? ReleaseYear,
    int? RuntimeMinutes,
    IReadOnlyList<string> Genres,
    string? PrimaryGenre,
    IReadOnlyList<string> Directors,
    string? ExternalId,
    string Source,

    /// <summary>
    /// Newest first, ordered <c>logged_at DESC, id DESC</c> — the same rule the board decides
    /// which pass is current by, so <c>logEntries[0]</c> is the pass the card is showing. Four
    /// other places order this and all of them must agree; see **Library is not the catalog**
    /// in docs/board.md.
    /// </summary>
    IReadOnlyList<LogEntryDto> LogEntries)
{
    public static MovieDetailDto From(Movie movie, IReadOnlyList<LogEntry> entries) => new(
        movie.Id,
        movie.Title,
        movie.CoverUrl,
        movie.ReleaseYear,
        movie.RuntimeMinutes,
        movie.Genres,
        movie.PrimaryGenre,
        movie.Directors,
        movie.ExternalId,
        SeedData.Sources.NameFor(movie.SourceId),
        [.. entries.Select(LogEntryDto.From)]);
}
