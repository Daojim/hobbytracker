namespace HobbyTracker.Api.Domain;

/// <summary>
/// Anime-specific detail for a <see cref="Media"/> row. Mapped Table-Per-Type into an `anime`
/// table whose primary key (`media_id`) doubles as its foreign key to `media`, exactly as
/// <see cref="Game"/>, <see cref="Movie"/> and <see cref="TvShow"/> are.
///
/// The fourth detail table, and the one that most resembles the third without being it. An
/// anime and a show are both episodic — and this carries a second title, a source material, a
/// studio and a mean score that no show has any use for, while having **no seasons table at
/// all**. That absence is the decision: MAL numbers each cour as its own entry, so
/// <c>Sousou no Frieren</c> and <c>Sousou no Frieren 2nd Season</c> are two ids and therefore
/// two cards. <c>tv_seasons</c> exists because TMDB models a series as one title with many
/// seasons; there is nothing here to hang a child table off.
///
/// See <c>docs/anime-mal.md</c>.
/// </summary>
public class Anime : Media
{
    /// <summary>
    /// What it is called in English, from MAL's `alternative_titles.en`.
    ///
    /// <see cref="Media.Title"/> holds the romaji — <c>Sousou no Frieren</c> — because that is
    /// what MAL's own `title` is and what its search matches on, so everything the platform
    /// already does with a title needs no special case. This is the second line under a card's
    /// heading, and <b>null is the ordinary case rather than an error</b>: MAL leaves `en` absent
    /// on a great many entries, and the card then renders nothing rather than an empty line.
    ///
    /// Not `english_title` on the board row it reaches — see <c>LibraryItemDto.Subtitle</c>.
    /// The column can be specific because the column is this hobby's; the row's field is the
    /// platform's, and the next hobby to want one may not mean English by it.
    /// </summary>
    public string? EnglishTitle { get; set; }

    /// <summary>
    /// What MAL calls the shape of it: `tv`, `movie`, `ova`, `ona`, `special`, `music`.
    ///
    /// Everything MAL calls anime is on the anime board, which is what the catalogue hands you
    /// anyway — so this is a fact to print rather than a filter to apply. MAL's own word, stored
    /// verbatim and made readable on the client, exactly as <see cref="TvShow.AirStatus"/> is.
    /// </summary>
    public string? MediaType { get; set; }

    /// <summary>
    /// How many episodes the cour has.
    ///
    /// <b>MAL answers 0 for an entry that has not aired, and 0 means unknown rather than none</b>
    /// — a cour announced for 2027 is the ordinary case for it. Null is what says that
    /// truthfully here, and `ck_anime_counts_positive` is what makes forgetting the mapping fail
    /// loudly rather than let a card claim a season with no episodes in it.
    /// </summary>
    public int? EpisodeCount { get; set; }

    /// <summary>
    /// How long one episode runs, in <b>seconds</b> — MAL's own unit, from
    /// `average_episode_duration`.
    ///
    /// Kept in the unit it arrives in rather than converted on the way in. <c>tv_shows</c> stores
    /// minutes because TMDB states minutes; this states seconds because MAL states seconds, and
    /// a column that silently held a different unit from its provider is the kind of thing only
    /// ever noticed as a runtime sixty times out. The conversion happens once, in the generated
    /// column below, where Postgres does it.
    /// </summary>
    public int? EpisodeRuntimeSeconds { get; set; }

    /// <summary>
    /// The whole cour in minutes, and what a card's badge and <c>sort=length</c> both read
    /// through <c>LibraryItemDto.LengthHours</c>.
    ///
    /// <b>A Postgres generated column — the database multiplies and converts it, and nothing
    /// here ever writes it.</b> <see cref="TvShow.TotalRuntimeMinutes"/>'s argument exactly, with
    /// one more reason on top of it: this sum carries a unit conversion, so the factor of sixty
    /// lives in one place rather than in each of the three <c>LibraryService</c> readers.
    ///
    /// Null propagates for free: either factor missing makes the product null, and a null length
    /// already sorts last rather than as though nobody having timed a cour meant it took no time.
    /// </summary>
    public int? TotalRuntimeMinutes { get; private set; }

    /// <summary>
    /// Which of the four broadcast seasons it began in — `winter`, `spring`, `summer`, `fall`.
    ///
    /// MAL's own word, and worth storing beside the year rather than folded into it: anime is
    /// talked about by cour, and "Fall 2023" is how anybody would say when Frieren started.
    /// </summary>
    public string? StartSeason { get; set; }

    /// <summary>
    /// The year it began airing, from `start_season.year`.
    ///
    /// Read as the year MAL states and nothing more — a fact about the title rather than a
    /// moment, so it never goes through the journal clock, exactly as
    /// <see cref="TvShow.FirstAirYear"/> and <see cref="Movie.ReleaseYear"/> are.
    /// </summary>
    public int? StartYear { get; set; }

    /// <summary>
    /// Where the title itself stands, from MAL's `status`: `finished_airing`,
    /// `currently_airing`, `not_yet_aired`.
    ///
    /// <b>Named `air_status` rather than `status`</b>, for <see cref="TvShow.AirStatus"/>'s
    /// reason: <c>log_entries.status</c> is where *you* are and is a closed four-value
    /// vocabulary shared by every hobby, and two columns called `status` on tables joined in
    /// every board query is a mistake waiting for the first person who types the shorter name.
    /// </summary>
    public string? AirStatus { get; set; }

    /// <summary>
    /// What it was adapted from, from MAL's `source`: `manga`, `light_novel`, `original`,
    /// `visual_novel`, `game`, and a dozen more.
    ///
    /// <b>Named `source_material` rather than `source`, and that is the same collision again.</b>
    /// <see cref="Media.SourceId"/> is which provider a row came from and is a foreign key into
    /// a lookup table; this is what the story was adapted from and is MAL's free text. One of
    /// them is a fact about the record and the other is a fact about the work.
    ///
    /// A genuinely good fact for the drawer: whether a thing is an original or an adaptation is
    /// most of what anybody wants to know about it before starting.
    /// </summary>
    public string? SourceMaterial { get; set; }

    /// <summary>
    /// MAL's genres for this title, as a Postgres text[].
    ///
    /// <b>MAL flattens three taxonomies into one array</b> — genres, themes and demographics all
    /// arrive in `genres`. Frieren comes back as Adventure, Award Winning, Drama, Fantasy,
    /// Shounen: two genres, a MAL tag and a demographic in one list. So the ordered
    /// specific-before-generic list this codebase already uses works on it directly, with no
    /// merging step — <c>frontend/src/hobbies/anime.ts</c> puts Isekai and Iyashikei above
    /// Action and Drama exactly as Visual Novel sits above Role-playing (RPG).
    /// </summary>
    public List<string> Genres { get; set; } = [];

    /// <summary>
    /// The genre chosen to stand for this title, overriding the automatic pick. Null means "use
    /// the automatic one", not "no genre" — and a MAL refresh leaves it alone, exactly as it
    /// leaves the other three hobbies' alone.
    /// </summary>
    public string? PrimaryGenre { get; set; }

    /// <summary>
    /// Who animated it, from MAL's `studios`.
    ///
    /// The byline under the drawer's title — a game's developers, a film's directors and a
    /// show's creators all answer the same question, and for anime the answer anybody gives is
    /// the studio. An array because co-productions are common.
    /// </summary>
    public List<string> Studios { get; set; } = [];

    /// <summary>
    /// What MAL's own users score it, out of ten.
    ///
    /// The same scale this app's ratings use, which is the whole reason it is worth carrying:
    /// the drawer can print it beside your own without either number needing a footnote.
    /// `ck_anime_mean_score_range` holds the scale, so a figure outside it fails as the mapping
    /// fault it would be rather than sitting next to a rating it cannot be compared with.
    /// </summary>
    public decimal? MeanScore { get; set; }
}
