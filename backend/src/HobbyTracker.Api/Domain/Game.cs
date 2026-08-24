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
    /// The year this came out, from IGDB. Only ever read by the HowLongToBeat matcher, which
    /// needs it because IGDB and HLTB both list "Resident Evil 4" twice under exactly that
    /// title — 2005 and 2023 — and nothing in the strings themselves can tell them apart.
    /// </summary>
    public int? ReleaseYear { get; set; }

    /// <summary>
    /// HowLongToBeat's three completion times, in hours.
    ///
    /// All three because they answer different questions, and the one worth reading changes
    /// with the game: a story you want to see through, a story plus the side content that is
    /// half the point of it, or everything. HLTB's own labels are Main Story, Main + Extra and
    /// Completionist, and the UI keeps them.
    ///
    /// Null means "no number", never nought: HLTB answers 0 for a game nobody has submitted a
    /// time for, and a check constraint refuses that value outright so the distinction cannot
    /// be lost on the way in. A tier can be null while its siblings are not — an obscure game
    /// often has a main-story time and nothing else.
    /// </summary>
    public decimal? HltbMainStoryHours { get; set; }

    /// <summary>
    /// The headline number HowLongToBeat prints at the top of a game page, and what a card
    /// shows — 42 hours for Hollow Knight, whose main story is 27 and completionist 65.6.
    ///
    /// Fetched rather than worked out, because it is not derivable from the three above it. It
    /// is HLTB own statistic over every submission of every play style: the mean of the three
    /// is 44.6 and the median is 39, and both of those are separate fields on the same payload.
    /// Verified against the live page before this column existed.
    ///
    /// Null on the same terms as the others, and null for every row logged before this column
    /// did — POST /api/games/hltb/refresh is what fills those in.
    /// </summary>
    public decimal? HltbAllStylesHours { get; set; }

    /// <inheritdoc cref="HltbMainStoryHours"/>
    public decimal? HltbMainExtraHours { get; set; }

    /// <inheritdoc cref="HltbMainStoryHours"/>
    public decimal? HltbCompletionistHours { get; set; }

    /// <summary>
    /// HowLongToBeat's id for this game, once something has matched it confidently — or once
    /// it was pinned by hand through the drawer, which is how a bad match is corrected.
    ///
    /// It is what makes an outage cost new games only: a stored id is fetched directly and
    /// never matched again, so a match made today survives both HLTB going down and the
    /// matching rules changing underneath it. Typed int (unlike <see cref="Media.ExternalId"/>)
    /// because it only ever refers to one source, and that source's ids are numeric.
    /// </summary>
    public int? HltbId { get; set; }

    /// <summary>
    /// When HowLongToBeat was last asked about this title, whatever the answer.
    ///
    /// Stamped on a miss as well as a hit, which is the whole point: it separates "never asked"
    /// from "asked, and nothing matched confidently enough to write down". Without it the
    /// backfill would re-ask about every unmatchable title on every run, for ever.
    /// </summary>
    public DateTimeOffset? HltbCheckedAt { get; set; }
}
