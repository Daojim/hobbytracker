namespace HobbyTracker.Api.Domain;

/// <summary>
/// Progress of a single log entry. Deliberately the same four values for every hobby — a
/// book, a game and an album are each either queued, underway, finished, or abandoned, and
/// per-hobby status vocabularies would make cross-hobby views impossible to write.
///
/// Persisted as text (see LogEntryConfiguration), so `select status from log_entries` reads
/// plainly and reordering this enum can never silently rewrite existing history.
/// </summary>
public enum LogStatus
{
    Backlog,
    InProgress,
    Completed,
    Dropped,
}
