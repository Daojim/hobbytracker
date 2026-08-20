namespace HobbyTracker.Api.Domain;

/// <summary>
/// One pass through a title. Several entries per media item are expected, not an edge case —
/// that is what makes replays and rereads first-class instead of an overwrite.
/// </summary>
public class LogEntry
{
    public int Id { get; set; }

    /// <summary>Nullable until auth arrives in Phase 2; every row is the single local user for now.</summary>
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

    /// <summary>DateOnly, not DateTime: "started on the 3rd" has no meaningful time of day.</summary>
    public DateOnly? DateStarted { get; set; }

    public DateOnly? DateCompleted { get; set; }
}
