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
    decimal? HltbAllStylesHours,
    decimal? HltbMainStoryHours,
    decimal? HltbMainExtraHours,
    decimal? HltbCompletionistHours,

    /// <summary>
    /// The release window, so a title does not change shape when you open it. <c>GameDetail</c>
    /// extends <c>Game</c> on the client, and a field present on the search response and absent
    /// here would be a contract that narrows on the way to the drawer.
    /// </summary>
    bool Released,
    DateOnly? ReleaseDate,
    ReleasePrecision? ReleasePrecision,

    /// <summary>
    /// HowLongToBeat's id, once matched or pinned. The drawer offers it for correction and
    /// links out to it, which is how you check that it matched the game you meant.
    /// </summary>
    int? HltbId,
    IReadOnlyList<LogEntryDto> LogEntries)
{
    public static GameDetailDto From(
        Game game, IReadOnlyList<LogEntry> entries, DateOnly today) => new(
        game.Id,
        game.Title,
        game.CoverUrl,
        game.Platforms,
        game.Developers,
        game.Genres,
        game.PrimaryGenre,
        game.ExternalId,
        SeedData.Sources.NameFor(game.SourceId),
        game.HltbAllStylesHours,
        game.HltbMainStoryHours,
        game.HltbMainExtraHours,
        game.HltbCompletionistHours,

        // The same expression the board filters with. See GameDto.
        ReleaseWindow.IsOut(game, today),
        game.ReleaseDate,
        game.ReleasePrecision,

        game.HltbId,
        [.. entries.Select(LogEntryDto.From)]);
}
