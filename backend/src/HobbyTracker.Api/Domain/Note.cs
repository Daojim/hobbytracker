namespace HobbyTracker.Api.Domain;

/// <summary>
/// One thing written down during a pass. Several notes per pass is the point — this replaced a
/// single text column on <see cref="LogEntry"/>, where writing a second thought destroyed the
/// first.
///
/// Usually the pass it hangs off is the one it was written during. Deleting a pass of a title that
/// has another moves its notes to the current one, so a note can sit on a pass its date does not
/// fall in, earlier or later. <see cref="WrittenAt"/> is still when it was written, which is why
/// the move never touches it.
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
