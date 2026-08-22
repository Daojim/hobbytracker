using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// A single stored game with everything logged against it — the shape a detail page wants in
/// one request rather than two.
/// </summary>
public sealed record GameDetailDto(
    int Id,
    string Title,
    string? CoverUrl,
    IReadOnlyList<string> Platforms,
    IReadOnlyList<string> Developers,
    IReadOnlyList<string> Genres,

    /// <summary>The chosen primary genre, or null to use the automatic pick.</summary>
    string? PrimaryGenre,
    string? ExternalId,
    string Source,
    decimal? HltbMainStoryHours,
    int? HltbId,
    IReadOnlyList<LogEntryDto> LogEntries)
{
    public static GameDetailDto From(Game game, IReadOnlyList<LogEntry> entries) => new(
        game.Id,
        game.Title,
        game.CoverUrl,
        game.Platforms,
        game.Developers,
        game.Genres,
        game.PrimaryGenre,
        game.ExternalId,
        SeedData.Sources.NameFor(game.SourceId),
        game.HltbMainStoryHours,
        game.HltbId,
        [.. entries.Select(LogEntryDto.From)]);
}
