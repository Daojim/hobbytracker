namespace HobbyTracker.Api.Domain;

/// <summary>
/// One pass through a title. Several entries per media item are expected, not an edge case —
/// that is what makes replays and rereads first-class instead of an overwrite.
/// </summary>
public class LogEntry
{
    public int Id { get; set; }

    /// <summary>Nullable until auth arrives; every row is the single local user for now.</summary>
    public int? UserId { get; set; }
    public User? User { get; set; }

    public int MediaId { get; set; }
    public Media? Media { get; set; }

    public LogStatus Status { get; set; } = LogStatus.Backlog;

    /// <summary>
    /// Manual rank within its board column. Lower sorts first, ties break on id descending.
    /// New entries take <c>min(position) - 1</c> for their column, so a freshly added title
    /// appears at the top without renumbering anything already there.
    /// </summary>
    public int Position { get; set; }

    /// <summary>1.0–10.0 to one decimal place (numeric(3,1)). Null until rated.</summary>
    public decimal? Rating { get; set; }

    public string? Notes { get; set; }

    /// <summary>
    /// When this pass began. An instant rather than a date — this was a DateOnly, and the
    /// argument for that was "started on the 3rd" having no meaningful time of day. True of a
    /// start you half-remember; false of the moment you finally beat something at 11:47pm, which
    /// is the part of a journal worth reading back. A bare date also cannot say which day 11pm
    /// belongs to without someone, somewhere, assuming a timezone.
    ///
    /// Null until started. Stored as timestamptz: an absolute moment, rendered in whatever zone
    /// is being asked.
    /// </summary>
    public DateTimeOffset? StartedAt { get; set; }

    /// <summary>When this pass finished. Null until it does. See <see cref="StartedAt"/>.</summary>
    public DateTimeOffset? CompletedAt { get; set; }

    /// <summary>
    /// When this entry was written down. Server-stamped and deliberately not settable by a
    /// caller: it records what happened rather than what someone says happened, which is the
    /// same reasoning that keeps MediaId off the update contract.
    ///
    /// The one timestamp every entry has — a dropped entry carries neither of the other two.
    /// </summary>
    public DateTimeOffset LoggedAt { get; set; }
}
