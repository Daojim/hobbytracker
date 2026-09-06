namespace HobbyTracker.Api.Contracts;

/// <summary>
/// How a board column is ordered.
///
/// <see cref="Manual"/> is the only mode in which dragging to reorder is meaningful — the
/// others are read-only views that leave the stored ranking untouched, so switching to
/// <see cref="Title"/> and back returns the column exactly as it was.
/// </summary>
public enum LibrarySort
{
    /// <summary>The user's own ranking: `position ASC, id DESC`.</summary>
    Manual,

    /// <summary>Most recently added first.</summary>
    Added,

    Title,

    /// <summary>Highest rating first; unrated titles last.</summary>
    Rating,

    /// <summary>
    /// How long the title takes, shortest first; titles with no figure last.
    ///
    /// Whichever number the card prints, so the column and its cards agree — HowLongToBeat's
    /// headline figure for a game, the runtime for a film. See <c>LibraryItemDto.LengthHours</c>,
    /// which is the single field both of them read.
    ///
    /// Deliberately not log_entries.hours_played, which is how long *you* took on one pass: that
    /// is a fact about a playthrough, where this is a property of the title.
    /// </summary>
    Length,
}
