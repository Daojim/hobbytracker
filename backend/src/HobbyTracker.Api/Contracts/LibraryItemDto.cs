using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// One title in your collection.
///
/// "Collection" means logged, not cached. Searching IGDB writes every result into `media` as a
/// side effect, so that table is a metadata cache holding everything ever typed into a search
/// box. The library is the subset you actually recorded something about.
/// </summary>
public sealed record LibraryItemDto(
    int MediaId,
    string Title,
    string? CoverUrl,
    string Hobby,
    /// <summary>Status of the most recent entry — a replay in progress beats an old completion.</summary>
    LogStatus CurrentStatus,
    /// <summary>How many times this has been logged. Greater than one means replays.</summary>
    int EntryCount,
    decimal? LatestRating,
    /// <summary>Completion date of the latest entry, or its start date if unfinished.</summary>
    DateOnly? LastActivity);
