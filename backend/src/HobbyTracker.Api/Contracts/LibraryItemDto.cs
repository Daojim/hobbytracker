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
    /// <summary>When the latest entry finished, or when it started if it has not.</summary>
    DateTimeOffset? LastActivity,

    /// <summary>
    /// The game's genres, and which of them was chosen to stand for it — the card's colour.
    ///
    /// Null rather than empty for a row that is not a game: genres live on the games table, so
    /// this is reached through a TPT downcast, and the LEFT JOIN behind it answers null for a
    /// media row with no detail table. Which genre wins when none was chosen is settled on the
    /// client, where the ordering and the palette are the same list.
    /// </summary>
    IReadOnlyList<string>? Genres,
    string? PrimaryGenre);
