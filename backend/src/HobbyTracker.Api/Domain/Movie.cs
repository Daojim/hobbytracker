namespace HobbyTracker.Api.Domain;

/// <summary>
/// Film-specific detail for a <see cref="Media"/> row. Mapped Table-Per-Type: a separate
/// `movies` table whose primary key (`media_id`) is simultaneously its foreign key to `media`,
/// exactly as <see cref="Game"/> is.
///
/// The second detail table, and the one that spends the choice made when there was only one:
/// under Table-Per-Hierarchy every column below would sit on `media` alongside every game's,
/// null on every row that is not a film.
/// </summary>
public class Movie : Media
{
    /// <summary>
    /// The year this came out, from TMDB's `release_date`.
    ///
    /// Read as the year in the string TMDB sends and nothing more. It is a fact about the film
    /// rather than a moment, so it is not run through the journal clock — the same reasoning
    /// that keeps <see cref="Game.ReleaseYear"/> in UTC, where localising would invent a
    /// distinction the other side cannot carry.
    /// </summary>
    public int? ReleaseYear { get; set; }

    /// <summary>
    /// How long the film runs, in whole minutes.
    ///
    /// The card and <c>sort=length</c> both read this, through
    /// <c>LibraryItemDto.LengthHours</c> — a game's HowLongToBeat estimate answers the same
    /// question and lands in the same field, so neither the board row nor the sort has to know
    /// which hobby it is looking at.
    ///
    /// **Null, never nought.** TMDB answers `0` for a film whose runtime nobody has filled in,
    /// which is a different claim from "takes no time"; `ck_movies_runtime_positive` is what
    /// makes forgetting to map that fail loudly rather than store a lie. It is the same
    /// distinction the `hltb_*` columns draw and for the same reason.
    ///
    /// Not on `/search/movie`, which is why it arrives when a title is added rather than when
    /// it is found. See <c>docs/movies-tmdb.md</c>.
    /// </summary>
    public int? RuntimeMinutes { get; set; }

    /// <summary>
    /// TMDB's genres for this film, as a Postgres text[].
    ///
    /// Names rather than the ids `/search/movie` returns, because the detail call spells them
    /// out and a stored id would need a second lookup — and TMDB's names are language-dependent,
    /// so an id would also be a promise to remember which language it was read in.
    /// </summary>
    public List<string> Genres { get; set; } = [];

    /// <summary>
    /// The genre chosen to stand for this film, overriding the automatic pick. Null means "use
    /// the automatic one", not "no genre" — <see cref="Game.PrimaryGenre"/>'s rule exactly,
    /// including that a TMDB refresh leaves it alone.
    /// </summary>
    public string? PrimaryGenre { get; set; }

    /// <summary>
    /// Whoever directed it, from `credits.crew` where the job is Director.
    ///
    /// An array because films are co-directed often enough to matter — and because the byline
    /// under the drawer's title is the one place a name appears, so dropping the second one
    /// would be dropping half the answer.
    /// </summary>
    public List<string> Directors { get; set; } = [];
}
