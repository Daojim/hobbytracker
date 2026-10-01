namespace HobbyTracker.Api.Domain;

/// <summary>
/// A pass arriving in a board column, and when. The history a pass's own
/// <see cref="LogEntry.Status"/> cannot keep, because a move edits the pass in place and the
/// moment of it was lost until this existed.
///
/// Written by <c>StatusHistoryRecorder</c> as part of whatever save changed the status, and by
/// nothing else. Recorded before anything reads it on purpose: history that was never written
/// down cannot be recovered afterwards, and stats and the year in review are what will read it.
/// </summary>
public class StatusChange
{
    public int Id { get; set; }

    /// <summary>
    /// Whose history this is, through the pass. No user column of its own, exactly as a
    /// <see cref="Note"/> has none: a reader scopes through <c>LogEntry.UserId</c>.
    /// </summary>
    public int LogEntryId { get; set; }
    public LogEntry? LogEntry { get; set; }

    /// <summary>
    /// The column the pass left, and **null when the pass was made** — by an add, by logging
    /// one, or by the replay a move out of Completed starts. Every pass made since recording
    /// began has exactly one such row, and nothing ever deletes it.
    ///
    /// That is what lets a reader tell a quiet pass from an old one without knowing the date
    /// this shipped: a pass with no null row was made before anything was recorded, so what
    /// happened to it before its first row is unknown rather than nothing.
    /// </summary>
    public LogStatus? FromStatus { get; set; }

    /// <summary>The column the pass arrived in.</summary>
    public LogStatus ToStatus { get; set; }

    /// <summary>
    /// When it arrived. An instant from the journal clock, like <see cref="LogEntry.LoggedAt"/>,
    /// and turned into a day only where it is read — so this is not another place the journal
    /// zone is applied.
    ///
    /// A move made within <c>StatusHistoryRecorder.SettleWindow</c> of this one moves it
    /// forward rather than adding a row. See the recorder.
    /// </summary>
    public DateTimeOffset ChangedAt { get; set; }
}
