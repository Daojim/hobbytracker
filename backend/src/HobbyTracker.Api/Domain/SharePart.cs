namespace HobbyTracker.Api.Domain;

/// <summary>
/// One thing a share link can show besides the Backlog column, which every share shows.
///
/// <para>
/// <b>A share stores the parts it shows, not the ones it hides</b>, which is the opposite of the
/// hidden columns' rule, for the opposite reason. A column taken off in Settings is the owner's
/// own view, so a new column belongs on it the day it ships. A share is somebody else's view of
/// the owner's board, and a list of what is hidden would publish a part added later on every
/// existing share without its owner having said so. Stored as shown, it stays off until ticked.
/// </para>
///
/// <para>
/// The four columns wear their <see cref="LogStatus"/> names, so a column and the part that shows
/// it read alike on the wire. Backlog is not one: search adds to it, the calendar is a view of
/// it, and it is what guarantees a share always has a column to show. Persisted as text, for
/// <see cref="LogStatus"/>'s reasons.
/// </para>
/// </summary>
public enum SharePart
{
    InProgress,
    OnHold,
    Completed,
    Dropped,

    /// <summary>The release calendar under the board: the Backlog titles not out yet.</summary>
    Upcoming,

    /// <summary>
    /// The Stats page, and the whole of it: every finish, and what was dropped as a number with
    /// no titles, whichever columns are shown.
    /// </summary>
    Stats,
}
