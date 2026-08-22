namespace HobbyTracker.Api.Domain;

/// <summary>
/// Game-specific detail for a <see cref="Media"/> row. Mapped Table-Per-Type: a separate
/// `games` table whose primary key (`media_id`) is simultaneously its foreign key to `media`.
/// </summary>
public class Game : Media
{
    /// <summary>
    /// Platforms the game released on, as a Postgres text[]. IGDB returns an array here —
    /// Halo: The Master Chief Collection alone spans five — so a single column would
    /// silently drop data.
    /// </summary>
    public List<string> Platforms { get; set; } = [];

    /// <summary>Developer studios. An array for the same reason as <see cref="Platforms"/>.</summary>
    public List<string> Developers { get; set; } = [];

    /// <summary>
    /// IGDB's genres for this game, as a Postgres text[]. Stored alphabetically like
    /// <see cref="Platforms"/>; which one is the primary is decided by the client's own
    /// ordering, not by IGDB's.
    /// </summary>
    public List<string> Genres { get; set; } = [];

    /// <summary>
    /// The genre chosen to stand for this game, overriding the automatic pick. Null means "use
    /// the automatic one", not "no genre".
    ///
    /// Free text rather than a value constrained to <see cref="Genres"/>, for the same reason
    /// as <see cref="LogEntry.Platform"/>: IGDB's list is theirs to change, and a value that was
    /// true when it was chosen has to outlive the list it was chosen from. Left alone by an IGDB
    /// refresh, exactly as the hltb columns are.
    /// </summary>
    public string? PrimaryGenre { get; set; }

    /// <summary>
    /// Main-story completion time from HowLongToBeat. Not populated yet — the column
    /// exists so the later HLTB pass is a backfill rather than a migration.
    /// </summary>
    public decimal? HltbMainStoryHours { get; set; }

    /// <summary>
    /// HowLongToBeat's id for this game. HLTB has no official API, so this is a manual
    /// override: filled in by hand to pin a match that automatic title matching gets wrong.
    /// Typed int (unlike <see cref="Media.ExternalId"/>) because it only ever refers to one
    /// source, and that source's ids are numeric.
    /// </summary>
    public int? HltbId { get; set; }
}
