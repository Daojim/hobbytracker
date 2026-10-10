namespace HobbyTracker.Api.Contracts;

/// <summary>
/// The notes on one board that have every word of a search in them, newest first.
///
/// <para>
/// <b>Flat, not grouped by title.</b> The board shows them under their titles, and does the
/// grouping itself from this order: a title comes where its newest match does. Grouping here
/// would put a second answer to "which title comes first" on the server for the board to agree
/// with.
/// </para>
/// </summary>
/// <param name="Notes">At most fifty, the most recent.</param>
/// <param name="More">
/// Whether there were more than fifty, so the board can say these are only the most recent and
/// that another word narrows them. Asked for by taking one more than it keeps, rather than
/// counting every match.
/// </param>
public sealed record NoteSearchResult(IReadOnlyList<NoteMatchDto> Notes, bool More);

/// <summary>
/// One note a search found, with what the board needs to show it under its title and to open
/// that title's journal at it.
/// </summary>
public sealed record NoteMatchDto(
    int Id,
    int LogEntryId,
    int MediaId,

    /// <summary>The name a card leads with, which for anime is MAL's English one where there is one.</summary>
    string Title,

    /// <summary>The card's second name, the romaji under an English anime title. Null for every other title.</summary>
    string? Subtitle,

    string? CoverUrl,

    /// <summary>The whole note. Which part of it the board shows is the board's to decide.</summary>
    string Body,

    /// <summary>When it was written. Server-stamped; see <see cref="Domain.Note.WrittenAt"/>.</summary>
    DateTimeOffset WrittenAt);
