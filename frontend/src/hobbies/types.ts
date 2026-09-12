import type { LogEntry, LogStatus, ReleasePrecision } from '../api/types';
import type { HltbEstimates } from '../journal/fields';
import type { Hobby } from '../shell/hobbies';

/**
 * What one hobby is, everywhere the app has to say something a person reads.
 *
 * The axis this splits on is the one `docs/` already splits on: the board, the journal and the
 * auth stack are the platform and know nothing about games or films; this directory is the
 * hobby. `docs/games-igdb.md` is the shape `docs/movies-tmdb.md` took, and `games.ts` is the
 * shape `movies.ts` took.
 *
 * It arrived with two implementations rather than one. A registry written while there was only
 * games would have been a guess about what varies; written now, every field below is something
 * that demonstrably does.
 */
export interface HobbyDefinition {
  slug: Hobby;

  /**
   * What a person calls each column. `InProgress` is the protocol and "Playing" is a label, and
   * the two are not the same string — a film in a column called Playing is the first thing
   * anybody would notice. There is exactly one of these per hobby now, where the board and the
   * drawer used to keep a copy each.
   */
  columnLabel: Record<LogStatus, string>;

  /** The sort control's word for `sort=length`. */
  lengthLabel: string;

  /**
   * A card's length badge, built from `LibraryItem.lengthHours`.
   *
   * The field is shared and the reading is not: a game's is an estimate of how long it takes
   * anyone, written `~41.82 h` with the tilde doing real work, and a film's is an exact runtime
   * written `1 h 52 m`.
   */
  formatLength(hours: number): string;

  /** How that badge reads aloud, which a bare number cannot do. */
  describeLength(hours: number): string;

  /** How a card counts more than one pass: playthroughs, viewings. */
  countPasses(count: number): string;

  /** How the remove confirmation names what it would take with it. */
  describeRemoval(title: string, entryCount: number): string;

  /**
   * Which genre stands for a title, and what colour that is. One ordered list doing both jobs —
   * see {@link Genre}.
   */
  genres: readonly Genre[];

  search: {
    /** The box's accessible name. */
    label: string;
    placeholder: string;
    run(term: string): Promise<SearchHit[]>;
  };

  journal: JournalSection;

  /**
   * How this hobby says where you are *inside* a title, or null for one with no such idea.
   *
   * One nullable block carrying both halves, exactly as {@link TitleDetail.hltb} carries its
   * four figures and its id: they are one fact, and a hobby that wired the badge without the
   * spoken form would give a screen reader "S3 E7" to read out letter by letter.
   *
   * Paired with {@link PassFields.progress}, which is true if and only if this is not null —
   * the `setHltbId` and `hltb` rule, and `journal.test.ts` pins it. Wiring the control without
   * this puts a value on a pass nothing can display; wiring this without the control promises
   * a badge no pass can reach.
   */
  progress: {
    /** What a card prints beside the rating: `S3 E7`. Null when there is nothing to say. */
    format(season: number | null, episode: number | null): string | null;

    /** How that reads aloud, which `S3 E7` cannot do on its own. */
    describe(season: number | null, episode: number | null): string;
  } | null;

  /**
   * Whether this hobby's board carries a calendar of what has not come out yet, and the words on
   * it. Null for a hobby with no such idea.
   *
   * **Only games sets it, and that is a fact about providers rather than about hobbies.** Films
   * and shows have release dates too; TMDB simply is not asked for them yet. So this says what
   * the board *renders*, and nothing more — the server decides which titles are on the calendar
   * by whether anything has filled their release columns, which for every other hobby is never.
   * There is no branch on the slug here or anywhere, and turning a hobby on is one entry in this
   * block plus the provider work that fills the columns.
   *
   * **Those two halves are one commit.** Filling a hobby's release columns without this set
   * would take its unreleased titles out of Backlog with nowhere to show them; setting this
   * without filling them renders a section that is always empty.
   */
  releases: {
    /** The section's heading, under the grid. */
    heading: string;

    /** What the search strip's add button says for a title that is not out yet. */
    addAction: string;

    /** How that button reads aloud, which two words on their own cannot. */
    describeAdd(title: string): string;

    /** The heading over the titles nobody has announced a date for. */
    noDateHeading: string;

    /** What the section says when there is nothing waiting. */
    empty: string;

    /** The badge a card wears for a title that came out in the last few weeks. */
    newBadge: string;
  } | null;
}

/**
 * What the drawer over the board reads and writes, for one hobby.
 *
 * The two halves are not the same kind of thing and that is deliberate. {@link load} and
 * {@link setGenre} are dispatch — the same request against a different route. {@link fields} is
 * a *shape*: a film's pass has three of the six things a game's pass has, and the two missing
 * ones are absent rather than blank. That is why it is stated here rather than inferred from
 * whatever came back, which would make an unenriched film look like a hobby without platforms.
 */
export interface JournalSection {
  /** The title and every pass logged against it, in one request. */
  load(mediaId: number): Promise<TitleDetail>;

  /** Which genre stands for it on the board, or null for the automatic pick. */
  setGenre(mediaId: number, genre: string | null): Promise<unknown>;

  /**
   * Names the HowLongToBeat entry for a title by hand.
   *
   * Null for a hobby with nothing of the kind to correct — the same hobbies whose
   * {@link TitleDetail.hltb} is null, which is what the pin actually renders off. Two halves of
   * one fact, and a hobby that wired only one of them fails loudly at the mutation rather than
   * posting a film to `/api/games`.
   */
  setHltbId: ((mediaId: number, hltbId: number | null) => Promise<unknown>) | null;

  /** Which of a pass's fields this hobby keeps at all. */
  fields: PassFields;
}

/**
 * Which controls a pass's form has.
 *
 * Absent, not relabelled, and not disabled: "your time" on a film is the runtime, which is a
 * fact about the film rather than about the evening, and what a film was watched on is not
 * worth a control. A form that renders neither submits `platform: null, hoursPlayed: null` —
 * correct rather than lossy, because PUT clears an absent field and a film's pass never holds
 * either.
 */
export interface PassFields {
  hoursPlayed: boolean;
  platform: boolean;

  /**
   * Where you are inside a title, and **which halves of it this hobby has**.
   *
   * Not hours by another name: nobody records how long an evening of television took, and the
   * show already says how long one episode runs. It is where you are, and it is the reason a
   * TV board is worth having at all.
   *
   * Three-valued rather than a boolean, because anime needs the episode half alone. A cour is
   * its own MAL entry — `Sousou no Frieren` and `Sousou no Frieren 2nd Season` are two ids and
   * two cards — so the cour *is* the title and "episode 7" says everything there is to say.
   * `ck_log_entries_episode_needs_season` forbade exactly that and was dropped for it; the rule
   * it held now lives here, in the shape of the form each hobby gets.
   *
   * - `false` — no such idea. A game, a film.
   * - `'season-episode'` — both dropdowns, the episode list sized from the chosen season.
   * - `'episode'` — the episode alone, sized from {@link TitleDetail.episodeCount}.
   *
   * Paired with {@link HobbyDefinition.progress}, which is non-null if and only if this is not
   * `false`; `journal.test.ts` pins the pairing.
   */
  progress: false | 'episode' | 'season-episode';
}

/**
 * What the drawer is handed about a title, whichever hobby it belongs to.
 *
 * Each hobby maps its own API shape into this in its own file, so a film's `directors` and a
 * game's `developers` arrive as one byline and the drawer has no branch in it. Nothing here is
 * a wire type: `GameDetail` and `MovieDetail` are siblings for the reason the schema chose
 * Table-Per-Type, and a shape carrying both hobbies' columns is the thing that decision refused.
 */
export interface TitleDetail {
  title: string;

  /**
   * The title's other name, under the heading, for a hobby whose titles have two.
   *
   * `LibraryItem.subtitle`'s counterpart, and the drawer opens off a card — a heading that
   * disagreed with the thing just clicked would read as the wrong title having been opened. For
   * anime that pair is MAL's English name leading and the romaji one under it.
   *
   * Null where the hobby has no such idea, and null for a title with only one name — the
   * {@link platforms} rule, stated per hobby rather than inferred.
   */
  subtitle: string | null;

  /** Who made it: a game's developers, a film's directors. */
  byline: readonly string[];

  genres: readonly string[];
  primaryGenre: string | null;

  /**
   * Every pass, newest first — `logged_at DESC, id DESC`, which is the same rule the board
   * decides "current" by. The API's order, taken as given rather than re-derived here.
   */
  logEntries: LogEntry[];

  /** What a pass may say it was played on. Empty where the hobby has no such idea. */
  platforms: readonly string[];

  /**
   * Every season of it, lowest number first. Empty where the hobby has no such idea — the
   * {@link platforms} precedent, and stated rather than inferred for the same reason.
   *
   * The form's two dropdowns are built from this: the season list is these, and the episode
   * list is however many episodes the chosen one has.
   */
  seasons: readonly TitleSeason[];

  /**
   * How many episodes the title has, for a hobby that counts them without seasons.
   *
   * What {@link PassFields.progress} `'episode'` sizes its one dropdown from, where
   * `'season-episode'` sizes its second from whichever {@link seasons} entry was chosen. Null
   * where the hobby has no such idea *and* where it has one nobody has counted — MAL answers
   * nought for a cour that has not aired, and nought there means unknown.
   *
   * **Deliberately not solved with a synthetic one-season list.** That would look tidier and
   * would be the same mistake as writing `season_number = 1` on every anime pass: it puts a
   * fact in the column that nobody claimed, and every later reader — the card, the drawer, a
   * year in review — then has to know to ignore it.
   *
   * Stated per hobby rather than inferred from whatever came back, on {@link platforms}' rule.
   */
  episodeCount: number | null;

  /**
   * Facts about the title itself, for the header band beside the genre — a film's runtime.
   *
   * Facts and not controls: everything else in that band is something you set. HowLongToBeat's
   * four figures are deliberately not here, because they sit beside your own hours where
   * comparing them is the entire point, and a film has nothing to compare against.
   */
  facts: readonly TitleFact[];

  /**
   * What a pass's hours are read against, and the id that can correct them. Null for a hobby
   * HowLongToBeat says nothing about — which is not the same as a game nothing has matched,
   * where this is present with four nulls inside it.
   */
  hltb: TitleHltb | null;
}

export interface TitleFact {
  label: string;
  value: string;

  /**
   * Where the value goes, for a fact that is a way *out of* the app rather than a statement
   * about the title. Absent on all but one: anime's MAL row, which opens the entry the card was
   * built from.
   *
   * Optional rather than nullable, so a hobby that has no such fact writes nothing. The drawer
   * renders a plain span without it — a band where every row had become an anchor would promise
   * a destination for a runtime and a genre.
   */
  href?: string;
}

/**
 * One season, as the pass form's dropdowns need it.
 *
 * `label` rather than a nullable name, because the form has to print *something* in the option
 * and the fallback is the hobby's business rather than the form's: TMDB leaves a season unnamed
 * often enough, and season 0 is called Specials by everyone who watches it and 0 by nobody.
 */
export interface TitleSeason {
  number: number;
  label: string;
  episodeCount: number;
}

/** HowLongToBeat's four figures and the stored id, which arrive together or not at all. */
export interface TitleHltb extends HltbEstimates {
  /** The pinned id, or null for a title nothing has matched. */
  id: number | null;
}

/**
 * One entry in a hobby's genre list.
 *
 * The order decides the automatic pick — the first entry a title has wins — and each entry
 * carries its own colour, so adding a genre is one line in a hobby file and one token in
 * index.css.
 *
 * Deliberately on the client rather than the server. A priority order there plus a palette here
 * would be two orderings that have to agree, which is the failure this codebase has already paid
 * for once over which pass the board calls current. Here they are the same array.
 */
export interface Genre {
  /**
   * The source's own name, matched case-insensitively. IGDB writes "Role-playing (RPG)" and TMDB
   * writes "Science Fiction"; both are exact strings from the provider rather than anything this
   * app invented, so a rename upstream unpaints a genre rather than silently mispainting one.
   */
  name: string;

  /**
   * A whole class name, or null for a genre that is named but not painted.
   *
   * Whole because Tailwind scans source text: an interpolated `bg-genre-${x}` generates nothing
   * and the stripe renders transparent, which is a failure with no symptom. Null is the honest
   * way to say "no colour has been chosen for this yet" — the card still prints the name, and
   * the stripe stays the transparent placeholder it already renders for an ungenred title, so
   * nothing shifts left of its neighbours.
   */
  stripe: string | null;
}

/**
 * What the search strip needs, whichever hobby found it.
 *
 * A film and a game answer with genuinely different things — platforms and developers against a
 * year and a director — so the strip is handed lines to print rather than a shape to interpret.
 * That keeps `SearchResult` from growing a branch per hobby for the sake of two lines of text.
 */
export interface SearchHit {
  /** The media id, which is what `POST /api/log-entries` points at. */
  id: number;
  title: string;
  coverUrl: string | null;

  /** Up to two lines under the title. Empty entries are not rendered. */
  byline: readonly string[];

  /**
   * Whether the provider says this is out, and when — so the tile can offer to put an unreleased
   * title on the calendar rather than into a Backlog it would not appear in.
   *
   * **`released` is the server's answer and is never re-derived here.** It is the same rule the
   * board partitions on, and a second copy of it on the client is free to disagree — which would
   * show *Add to calendar* on a title that then landed in Backlog, or the reverse.
   *
   * Null for a hobby whose provider is not asked about release dates, which is every hobby but
   * games. A tile with none simply says *Add*.
   */
  release: {
    released: boolean;
    day: string | null;
    precision: ReleasePrecision | null;
  } | null;
}
