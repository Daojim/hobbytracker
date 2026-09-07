namespace HobbyTracker.Api.Domain;

/// <summary>
/// Television-specific detail for a <see cref="Media"/> row. Mapped Table-Per-Type into a
/// `tv_shows` table whose primary key (`media_id`) doubles as its foreign key to `media`,
/// exactly as <see cref="Game"/> and <see cref="Movie"/> are.
///
/// The third detail table, and the one that settles the argument: half the columns below mean
/// nothing whatever to a film, and under Table-Per-Hierarchy every one of them would sit on
/// `media`, null on every row that is not a show.
///
/// A show is the one thing this app tracks that you are *partway through*, which is why a TV
/// pass carries a season and an episode where a film's carries neither. See
/// <c>docs/tv-tmdb.md</c>.
/// </summary>
public class TvShow : Media
{
    /// <summary>
    /// The year it first aired, from TMDB's `first_air_date`.
    ///
    /// Read as the year in the string TMDB sends and nothing more — a fact about the show rather
    /// than a moment, so it never goes through the journal clock. <see cref="Movie.ReleaseYear"/>
    /// and <see cref="Game.ReleaseYear"/> are read the same way and for the same reason.
    /// </summary>
    public int? FirstAirYear { get; set; }

    /// <summary>
    /// The year it last aired, from `last_air_date`.
    ///
    /// **Null is meaningful here and is not missing data**: a show still running has no last year
    /// yet, and the drawer renders the pair as "2022–" rather than inventing an end. A show that
    /// began and ended in one year carries the same value in both, and reads as "2016".
    /// </summary>
    public int? LastAirYear { get; set; }

    /// <summary>
    /// Where the show itself stands, from TMDB's `status`: Returning Series, Ended, Canceled,
    /// In Production, Planned, Pilot.
    ///
    /// **Named `air_status` rather than `status`, one word away from a column that already
    /// exists.** <c>log_entries.status</c> is where *you* are on a title, and it is a closed
    /// four-value vocabulary shared by every hobby; this is where the *show* is, it is TMDB's
    /// vocabulary rather than ours, and it is free text because it is theirs to change. Two
    /// columns called `status` on tables joined in every board query is a mistake waiting for
    /// the first person who types the shorter name out of habit.
    ///
    /// TMDB's string is stored verbatim and made readable on the client, which is where
    /// `runtime_minutes` becomes "1 h 52 m" too.
    /// </summary>
    public string? AirStatus { get; set; }

    /// <summary>How many seasons TMDB counts.</summary>
    public int? NumberOfSeasons { get; set; }

    /// <summary>
    /// How many episodes TMDB counts across the whole run.
    ///
    /// Named for TMDB's own field rather than `episode_count`, which is deliberately left free:
    /// `tv_seasons.episode_count` is a different number about a different thing, and two columns
    /// of that name on two joined tables is the confusion `air_status` avoids above.
    /// </summary>
    public int? NumberOfEpisodes { get; set; }

    /// <summary>
    /// How long one episode runs, in whole minutes.
    ///
    /// TMDB's `episode_run_time` is an array and is **frequently empty** on newer entries, so
    /// this is read as its first value falling back to `last_episode_to_air.runtime`, which
    /// arrives on the same response. After both, null is the honest answer. The fallback is
    /// load-bearing rather than defensive, which is why the e2e stub has a show that only has
    /// the second one.
    ///
    /// **Null, never nought**, for the reason <see cref="Movie.RuntimeMinutes"/> is:
    /// `ck_tv_shows_episode_runtime_positive` makes forgetting to map TMDB's 0 fail loudly
    /// rather than let a card claim a sixty-two episode show takes no time at all.
    /// </summary>
    public int? EpisodeRuntimeMinutes { get; set; }

    /// <summary>
    /// The whole run in minutes, and what a card's badge and <c>sort=length</c> both read
    /// through <c>LibraryItemDto.LengthHours</c>.
    ///
    /// **A Postgres generated column — the database multiplies it, and nothing here ever writes
    /// it.** The arithmetic is otherwise needed in three places that must agree:
    /// <c>LibraryService</c>'s two terminal projections and its <c>LibrarySort.Length</c> arm,
    /// the last of which is the one place in this codebase where an expression that stops
    /// translating breaks a sort mode rather than erroring. Three copies of one sum is exactly
    /// the shape things drift apart in — and a column that only Postgres can write cannot drift
    /// from its inputs at all, where a value recomputed on each refresh could.
    ///
    /// Null propagates for free: either factor missing makes the product null, and a null length
    /// already sorts last rather than as though nobody having timed a show meant it took no time.
    ///
    /// It is an estimate where a film's runtime is exact — episode lengths vary and TMDB's
    /// figure is an average — which is why a card writes it with a tilde and a film's without.
    /// </summary>
    public int? TotalRuntimeMinutes { get; private set; }

    /// <summary>
    /// TMDB's genres for this show, as a Postgres text[].
    ///
    /// **TMDB's television genres are not its film genres** — sixteen rather than nineteen, with
    /// no Horror, no Thriller, no Romance and no Science Fiction, and carrying Action and
    /// Adventure, Sci-Fi and Fantasy, War and Politics, Reality, Soap, Talk, News and Kids that
    /// the film list has nothing of. So TV names its own list in
    /// <c>frontend/src/hobbies/tv.ts</c> rather than reusing the film one.
    ///
    /// Names rather than the ids `/search/tv` returns, for <see cref="Movie.Genres"/>'s reasons:
    /// the detail call spells them out, and a stored id would be a promise to remember which
    /// language it was read in.
    /// </summary>
    public List<string> Genres { get; set; } = [];

    /// <summary>
    /// The genre chosen to stand for this show, overriding the automatic pick. Null means "use
    /// the automatic one", not "no genre" — and a TMDB refresh leaves it alone, exactly as it
    /// leaves <see cref="Movie.PrimaryGenre"/> and <see cref="Game.PrimaryGenre"/> alone.
    /// </summary>
    public string? PrimaryGenre { get; set; }

    /// <summary>
    /// Whoever created it, from TMDB's `created_by`.
    ///
    /// The byline under the drawer's title — a game's developers and a film's directors answer
    /// the same question. An array because shows are co-created often enough to matter.
    ///
    /// **This costs no second request**, which a film's director did: `/movie/{id}` needed
    /// `append_to_response=credits` and a filter over a crew list hundreds of entries long,
    /// where `created_by` is on the base `/tv/{id}` response. It is, however, **empty for a
    /// great many shows** — documentaries and most non-US productions carry no creator at all —
    /// so a blank byline here is data rather than a fault.
    /// </summary>
    public List<string> Creators { get; set; } = [];

    /// <summary>
    /// Every season and how many episodes are in it, which is what lets the journal offer a
    /// season to pick and then the right number of episodes inside it.
    ///
    /// **A child table rather than a JSON column, and the reason is worth keeping.** One jsonb
    /// column was the first choice — seasons are read whole, written whole, and never queried
    /// alone, so there is nothing for a join to buy. Two things stopped it. EF Core 10 refuses
    /// JSON-mapped owned types on a TPT entity outright (*"Only TPH inheritance is supported for
    /// those entities"* — it lands as a boot failure, and EF 11 is the release that lifts it).
    /// And a jsonb blob can carry no check constraint and no unique key, which in a codebase
    /// whose <c>SchemaTests</c> exists to prove the database enforces what the schema claims is
    /// the wrong trade: a table gets `season_number >= 0` and one row per season for free.
    ///
    /// Season **0 is TMDB's Specials** and is a real season here rather than a special case,
    /// which is why both `ck_tv_seasons_season_number` and `ck_log_entries_season_range` allow
    /// nought.
    /// </summary>
    public ICollection<TvSeason> Seasons { get; set; } = [];
}
