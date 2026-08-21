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
}
