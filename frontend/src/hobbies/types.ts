import type { LogEntry, LogStatus } from '../api/types';
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
}
