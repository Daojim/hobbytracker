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

    /// <summary>
    /// The first day the title could come out, and the last — the window a publisher actually
    /// announced, read through <see cref="ReleasePrecision"/>.
    ///
    /// <para>
    /// <b>Here rather than on the detail tables, and that is deliberate.</b> A release date is
    /// not hobby-specific — films, shows and cours all have one — and more to the point the
    /// board <i>filters</i> on it: the Backlog column answers without the titles that are not
    /// out yet. A Table-Per-Type downcast in a filter position stops translating silently and
    /// empties the whole board, so the one place this can safely live is the shared table.
    /// <c>hobby_id</c> is redundant under TPT for this same reason. See <b>A second thing that
    /// narrows a column</b> in <c>docs/board.md</c>.
    /// </para>
    ///
    /// <para>
    /// <b>A day, never an instant.</b> A publisher announces a calendar day belonging to no
    /// timezone, so this is <c>date</c> and not <c>timestamptz</c>. The journal zone is applied
    /// only to learn what day it is <i>here</i>, never to these — converting 2026-09-26 into
    /// Eastern would move it to the 25th, which is a fact nobody announced. See <b>Time</b> in
    /// <c>docs/data-model.md</c>.
    /// </para>
    ///
    /// Both ends are truncated to the announced unit, so <see cref="ReleaseDate"/> is genuinely
    /// the first possible day and the agenda can order on it without inventing one. Null on
    /// both when the precision is null or <see cref="ReleasePrecision.Unknown"/>, and
    /// <c>ck_media_release_window</c> makes every other combination unreachable.
    /// </summary>
    public DateOnly? ReleaseDate { get; set; }

    /// <inheritdoc cref="ReleaseDate"/>
    public DateOnly? ReleaseEnd { get; set; }

    /// <summary>
    /// How exactly the window above is known, and — when null — whether anybody has asked at
    /// all. <b>Null means never asked and reads as released.</b> See
    /// <see cref="Domain.ReleasePrecision"/>, which holds the whole of that rule.
    /// </summary>
    public ReleasePrecision? ReleasePrecision { get; set; }

    /// <summary>
    /// What the provider says about the title's life, which outranks the window when it says
    /// anything at all. Null is ordinary: most released games carry no status.
    /// </summary>
    public ReleaseStatus? ReleaseStatus { get; set; }

    public ICollection<LogEntry> LogEntries { get; set; } = [];
}
