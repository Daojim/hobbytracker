namespace HobbyTracker.Api.Domain;

/// <summary>
/// One row per title, whatever the hobby. Hobby-specific columns live in a Table-Per-Type
/// detail table that derives from this one — see <see cref="Game"/>.
/// </summary>
public class Media
{
    public int Id { get; set; }

    /// <summary>
    /// Redundant with the CLR type under TPT (a row in `games` is always hobby=games), and
    /// kept deliberately: it lets "everything in hobby X" filter on one table instead of
    /// LEFT JOINing every detail table that will exist once the other hobbies do.
    /// </summary>
    public int HobbyId { get; set; }
    public Hobby? Hobby { get; set; }

    public int SourceId { get; set; }
    public Source? Source { get; set; }

    public required string Title { get; set; }

    /// <summary>
    /// The source's own id for this record — IGDB's game id, TMDB's movie id, and so on.
    /// Null when <see cref="Source"/> is "manual". Stored as text rather than int because
    /// Media is source-agnostic and not every future source uses numeric ids.
    /// </summary>
    public string? ExternalId { get; set; }

    public string? CoverUrl { get; set; }

    public ICollection<LogEntry> LogEntries { get; set; } = [];
}
