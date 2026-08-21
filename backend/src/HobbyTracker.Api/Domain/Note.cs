namespace HobbyTracker.Api.Domain;

/// <summary>
/// One thing written down during a pass. Several notes per pass is the point — this replaced a
/// single text column on <see cref="LogEntry"/>, where writing a second thought destroyed the
/// first.
/// </summary>
public class Note
{
    public int Id { get; set; }

    public int LogEntryId { get; set; }
    public LogEntry? LogEntry { get; set; }

    public required string Body { get; set; }

    /// <summary>
    /// When it was written. Server-stamped and deliberately not settable by a caller, for the
    /// same reason as <see cref="LogEntry.LoggedAt"/>: it records what happened rather than what
    /// someone says happened.
    ///
    /// **Editing a note does not move it.** The date is when you wrote the note, not when you
    /// last fixed a typo in it.
    /// </summary>
    public DateTimeOffset WrittenAt { get; set; }
}
