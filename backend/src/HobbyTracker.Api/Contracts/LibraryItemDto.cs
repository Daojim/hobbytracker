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
    string? PrimaryGenre,

    /// <summary>
    /// HowLongToBeat's main-story estimate, and only that one — the card has room for a number,
    /// not a table, and the other two tiers are a drawer reading where they can be named.
    ///
    /// Null for a row that is not a game, for the same reason as <see cref="Genres"/>, and null
    /// for a game nothing has matched to HowLongToBeat yet.
    /// </summary>
    decimal? HltbMainStoryHours,

    /// <summary>
    /// The opening of the most recent thing you wrote about this title, or null if you have
    /// written nothing. The whole of it lives in the drawer; this is a preview and is named so,
    /// because a field called <c>LatestNote</c> that is not the note would be a lie.
    ///
    /// Cut at <c>LibraryService.NotePreviewLength</c> characters. A note may be 4000, and
    /// a board is up to four columns of a hundred rows — uncapped, this field would make the
    /// board response scale with how much somebody writes. The cap is comfortably more than two
    /// lines can show at the widest card, so what a reader sees cut is always the client's
    /// line-clamp and never this.
    ///
    /// The most recent across *every* pass of yours, deliberately unlike everything else on the
    /// row. See the projection in <c>LibraryService</c>.
    /// </summary>
    string? LatestNotePreview);
