namespace HobbyTracker.Api.Domain;

/// <summary>
/// Progress of a single log entry. Deliberately the same five values for every hobby — a
/// book, a game and an album are each either queued, underway, paused, finished, or abandoned,
/// and per-hobby status vocabularies would make cross-hobby views impossible to write.
///
/// Persisted as text (see LogEntryConfiguration), so `select status from log_entries` reads
/// plainly and reordering this enum can never silently rewrite existing history. That is also
/// why adding a value needs no migration: the column is varchar(20) with no check constraint on
/// what it holds.
///
/// A new value does need an arm in LibraryService.ApplyTransitionTimestamps, which is a switch
/// statement with no default — a status without one compiles and silently stamps nothing — and
/// a decision in LibraryService.InYear, whose default arm would otherwise answer for it.
/// </summary>
public enum LogStatus
{
    Backlog,
    InProgress,

    /// <summary>
    /// Started, not finished, and coming back to. Playing's rule for the dates; exempt from the
    /// year like Backlog, because a paused title is a list you return to rather than a record of
    /// the year you began it in.
    /// </summary>
    OnHold,

    Completed,
    Dropped,
}
