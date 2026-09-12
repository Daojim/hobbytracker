/**
 * The wire shapes, mirroring `backend/src/HobbyTracker.Api/Contracts/` one for one.
 *
 * Names are camelCase because ASP.NET Core serialises them that way; `LogStatus` travels as its
 * exact enum name because `JsonStringEnumConverter` is registered with no naming policy. Keep
 * both halves in step — nothing here is checked against the server at build time.
 */

/**
 * Shared by every hobby on purpose, so cross-hobby views are writable at all.
 *
 * `InProgress` is the wire value. The board column is labelled "Playing"; that is a label and
 * this is the protocol, and the two are not the same string.
 */
export type LogStatus = 'Backlog' | 'InProgress' | 'Completed' | 'Dropped';

/** `manual` is the default, and the only mode in which dragging to reorder means anything. */
export type LibrarySort = 'manual' | 'added' | 'title' | 'rating' | 'length';

/**
 * How precisely a title's release day is known.
 *
 * **Three states, not two, and the third is `null`.** `Unknown` means a provider was asked and
 * had no date to give; `null` on {@link LibraryItem.releasePrecision} means nobody has asked at
 * all, which reads as *released* and keeps such a title in Backlog. Anything reading a release
 * date must branch on this rather than on the dates being absent — they are absent for both.
 */
export type ReleasePrecision = 'Day' | 'Month' | 'Quarter' | 'Year' | 'Unknown';

/**
 * What the provider says about a title's life, which outranks its date.
 *
 * Mostly null, and mostly invisible: a title the provider calls released is not on the calendar
 * to be labelled. `Cancelled` is the one worth printing — see `releaseNote` in `lib/release.ts`.
 */
export type ReleaseStatus =
  | 'Released'
  | 'Alpha'
  | 'Beta'
  | 'EarlyAccess'
  | 'Offline'
  | 'Cancelled'
  | 'Rumored'
  | 'Delisted';

/** Every list endpoint returns this envelope. Search does not — see `searchGames`. */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * One title in the collection — a title something has been logged against, which is not the same
 * as a title in the catalog. Searching IGDB stores every result, so most of `media` is metadata
 * for games nobody ever recorded anything about.
 */
export interface LibraryItem {
  mediaId: number;
  /**
   * The name on the card's heading, which is **not always `media.title`**.
   *
   * For three hobbies it is exactly that. For anime it is MAL's English title where there is
   * one and the romaji title where there is not — the name a person here calls the thing leads,
   * and the one MAL matched on goes to {@link subtitle}. The server decides it, in the two
   * projections and the title sort; nothing on the client picks between the two names for a
   * board row.
   */
  title: string;
  /**
   * A second line under the title on a card, for a hobby whose titles have two names.
   *
   * Anime is why it exists: MAL states a romaji title and, often but not always, an English
   * one. The English one is the heading and this is the romaji — which is what a MAL search
   * matches on, and so what you would type to find the thing again.
   *
   * Named for what it is on the row rather than for what anime means by it — the next hobby to
   * want one may not mean romaji by it. Null for every other hobby and null for an anime MAL
   * has only one name for, which land in the same place for different reasons: the card renders
   * nothing rather than an empty line for both.
   */
  subtitle: string | null;
  coverUrl: string | null;
  hobby: string;
  /** From the most recent entry: a replay under way beats an old completion. */
  currentStatus: LogStatus;
  /** More than one means replays. */
  entryCount: number;
  latestRating: number | null;
  /** An instant, or null. Render it through `lib/time`, never `new Date(...).getFullYear()`. */
  lastActivity: string | null;
  /** The title's genres, from whichever source its hobby uses. Null when the hobby has none. */
  genres: string[] | null;
  /** The chosen genre, or null to use the automatic pick. See src/hobbies/. */
  primaryGenre: string | null;
  /**
   * How long this title takes, in hours — the one number a card has room for.
   *
   * What that means is the hobby's: HowLongToBeat's headline figure for a game, the runtime for
   * a film. `sort=length` orders on this same field, so a column always agrees with its cards.
   * Formatting is per hobby — `~41.82 h` for a game, `1 h 52 m` for a film, recovered with
   * `Math.round(hours * 60)`.
   *
   * Null for a row whose hobby has nothing to say, for a game nothing has matched, and for one
   * matched before the number was fetched at all.
   */
  lengthHours: number | null;
  /**
   * Whether HowLongToBeat has yet to be asked about this title at all.
   *
   * Adding a title replies before the lookup has even begun — nothing a person does waits on
   * HowLongToBeat — so this is what lets the board tell "no estimate, and one may still arrive"
   * from "no estimate, and none is coming", and look again only while the first is true.
   *
   * The server reads it off `hltb_checked_at`, which is stamped on a refusal as well as on a
   * match. That is the whole of what makes waiting on it safe: a title HowLongToBeat has never
   * heard of stops being pending with nothing to show, where waiting on the hours would wait
   * for ever. Always false for a row that is not a game.
   */
  hltbPending: boolean;
  /**
   * Where you are, straight off the current pass like every other field on this row except the
   * note preview.
   *
   * Null for games and films, and the card does not decide that from the nulls — it asks the
   * hobby whether it formats progress at all. A game whose pass somehow carried a season still
   * prints nothing, which is the right way round: the hobby says what it has.
   */
  seasonNumber: number | null;
  episodeNumber: number | null;

  /**
   * The window a publisher announced, as `YYYY-MM-DD` days rather than instants — and that is
   * the distinction to hold on to.
   *
   * A release date belongs to no timezone, so it must never be run through `lib/time.ts`:
   * `new Date('2026-09-26')` parses as midnight **UTC** and renders here as the 25th. Everything
   * that reads these lives in `lib/release.ts`, which reads the parts out of the string.
   *
   * **Read `releasePrecision`, never the dates, to decide what to show.** It is three-valued:
   * `null` is a title nobody has asked a provider about, `'Unknown'` is one the provider had no
   * date for, and the two mean different things while looking identical from the dates alone.
   * The first reads as *released* and is why a board that predates this feature is untouched.
   */
  releaseDate: string | null;
  releaseEnd: string | null;
  releasePrecision: ReleasePrecision | null;

  /**
   * What the provider says about the title's life, which outranks its date.
   *
   * Almost always null and almost always invisible — a title the provider calls released is not
   * on the calendar to be labelled. `'Cancelled'` is the one worth printing.
   */
  releaseStatus: ReleaseStatus | null;

  /**
   * The opening of the most recent thing you wrote about this title, cut by the server. The
   * whole of it lives in the drawer; this is a preview and is named so.
   *
   * The latest across *every* pass of yours, unlike everything else on this row — a replay you
   * have not written on yet still carries forward what you said the first time round.
   */
  latestNotePreview: string | null;
}

export interface Game {
  id: number;
  title: string;
  coverUrl: string | null;
  platforms: string[];
  developers: string[];
  genres: string[];
  /** The chosen genre, or null to use the automatic pick. See src/hobbies/. */
  primaryGenre: string | null;
  externalId: string | null;
  source: string;
  /**
   * HowLongToBeat's headline figure and its three tiers, in hours. Any can be null on its own —
   * an obscure title often has a main-story time and nothing else — and all four are null for a
   * title nothing has matched confidently.
   *
   * The headline is fetched, not averaged: on the real site it is a separate statistic over
   * every submission, and the mean of the three tiers is a different number HLTB also publishes.
   */
  hltbAllStylesHours: number | null;
  hltbMainStoryHours: number | null;
  hltbMainExtraHours: number | null;
  hltbCompletionistHours: number | null;

  /**
   * The window IGDB announced, and whether it says the game is out.
   *
   * `released` is the server's answer to the same question the board partitions Backlog on, sent
   * rather than derived here: a second copy of that rule on the client is free to disagree, and
   * the visible symptom would be a search tile offering to add a title to the calendar that then
   * lands in Backlog.
   *
   * `releasePrecision` is three-valued — see {@link ReleasePrecision}. Read it, never the dates:
   * both are null for a title nobody has asked IGDB about and for one IGDB calls TBD, and those
   * are different claims.
   */
  released: boolean;
  releaseDate: string | null;
  releasePrecision: ReleasePrecision | null;
}

export interface GameDetail extends Game {
  hltbId: number | null;
  logEntries: LogEntry[];
}

/**
 * A film, as `/api/movies` answers one. `Game`'s sibling rather than its generalisation: what a
 * film is and what a game is genuinely differ, and one shape carrying both would be the
 * mostly-null swamp the schema refused when it chose Table-Per-Type.
 */
export interface Movie {
  id: number;
  title: string;
  coverUrl: string | null;
  releaseYear: number | null;
  /**
   * Minutes. Null for a film TMDB has no runtime for — and null on a title only ever searched
   * for, because TMDB's search endpoint does not carry it. It arrives when the film is added.
   */
  runtimeMinutes: number | null;
  genres: string[];
  /** The chosen genre, or null to use the automatic pick. See src/hobbies/. */
  primaryGenre: string | null;
  /** The byline under the drawer's title. Plural because films are co-directed. */
  directors: string[];
  externalId: string | null;
  source: string;
}

export interface MovieDetail extends Movie {
  logEntries: LogEntry[];
}

export interface TvShow {
  id: number;
  title: string;
  coverUrl: string | null;
  /** The year it first aired. The one thing here that search does carry. */
  firstAirYear: number | null;
  /**
   * The year it last aired, or null for a show still running.
   *
   * Null is meaningful and is not missing data: the drawer reads the pair as `2022–` rather
   * than inventing an end, and a run inside one year reads as that year once.
   */
  lastAirYear: number | null;
  /**
   * TMDB's own word for where the show stands — Returning Series, Ended, Canceled, In
   * Production, Planned, Pilot. Theirs to change, so it is carried verbatim and made readable
   * here, exactly as a runtime in minutes is.
   *
   * `airStatus` and never `status`: `LogEntry.status` is where *you* are on a title, and two
   * fields of that name a few lines apart is a mistake waiting for whoever types the shorter
   * one out of habit. The column is named the same way for the same reason.
   */
  airStatus: string | null;
  numberOfSeasons: number | null;
  /** Across the whole run. `TvSeason.episodeCount` is a different number about one season. */
  numberOfEpisodes: number | null;
  /**
   * How long one episode runs, in minutes. Null for a show nobody has timed — never nought,
   * which is what a check constraint on the column is there to keep true.
   */
  episodeRuntimeMinutes: number | null;
  genres: string[];
  /** The chosen genre, or null to use the automatic pick. See src/hobbies/. */
  primaryGenre: string | null;
  /** The byline under the drawer's title. Plural because shows are co-created, and routinely
   * empty: TMDB carries no creator for most documentaries and most non-US productions. */
  creators: string[];
  externalId: string | null;
  source: string;
}

/** One season, as the journal's two dropdowns need it. Season 0 is Specials and is real. */
export interface TvSeason {
  seasonNumber: number;
  /** TMDB's name for it, or null — in which case the client names it from the number. */
  name: string | null;
  episodeCount: number;
}

export interface TvShowDetail extends TvShow {
  /**
   * Every season, lowest number first so Specials leads.
   *
   * The addition a film has no counterpart for, and the reason the drawer reaches this endpoint
   * rather than reading the board row: the season dropdown is built from this list, and the
   * episode dropdown's length comes from whichever entry is chosen.
   */
  seasons: TvSeason[];
  logEntries: LogEntry[];
}

/**
 * One anime, from MAL.
 *
 * The one shape here that is complete straight out of a search: MAL's search and detail
 * endpoints take the same `fields` and answer with the same node, where TMDB's `/search/*`
 * carries neither runtimes nor genre names. So there is nothing filled in later, and nothing
 * on this type that only the detail call knows.
 */
export interface Anime {
  id: number;
  /**
   * The romaji title — `Sousou no Frieren`. What MAL's own search matches on, and therefore
   * what `media.title` holds and what a catalogue endpoint answers with.
   *
   * It is **not** what leads a card or the drawer's heading; {@link englishTitle} is, where
   * there is one. This is the line under it.
   */
  title: string;
  /**
   * The English title, and **null is the ordinary case rather than a gap**: plenty of anime
   * have no official English title at all.
   *
   * It leads wherever a person reads a title — the card's heading, the drawer's, the search
   * tile — with {@link title} underneath, and reaches the board row as `LibraryItem.title`
   * already chosen. Null falls back to {@link title}, so nothing anywhere renders empty.
   */
  englishTitle: string | null;
  coverUrl: string | null;
  /** MAL's own word for the shape of it: `tv`, `movie`, `ova`, `ona`, `special`. */
  mediaType: string | null;
  /**
   * How many episodes the cour has, or null for one nobody has counted — never nought, which
   * is what MAL answers for an entry that has not aired and what a check constraint on the
   * column keeps out.
   *
   * It is also what the journal's episode control is sized from, where a show reads a chosen
   * season's count. A cour is its own MAL entry, so there is no season to choose.
   */
  episodeCount: number | null;
  /**
   * One episode in **seconds**, which is MAL's own unit carried through untouched — the client
   * divides it for display, exactly as it recovers a film's runtime from hours.
   */
  episodeRuntimeSeconds: number | null;
  /** Which cour it began in — `fall`, with {@link startYear} beside it. */
  startSeason: string | null;
  startYear: number | null;
  /**
   * `finished_airing`, `currently_airing`, `not_yet_aired`. MAL's vocabulary, made readable
   * here — and `airStatus` rather than `status` for `TvShow.airStatus`'s reason exactly.
   */
  airStatus: string | null;
  /** What it was adapted from: `manga`, `light_novel`, `original`. */
  sourceMaterial: string | null;
  genres: string[];
  /** The chosen genre, or null to use the automatic pick. See src/hobbies/. */
  primaryGenre: string | null;
  /** Who animated it. The byline under the drawer's title. */
  studios: string[];
  /** MAL's mean user score, out of ten — the same scale a pass's own rating uses. */
  meanScore: number | null;
  externalId: string | null;
  source: string;
}

/**
 * One anime and every pass against it.
 *
 * **No seasons list, and that absence is the decision.** A cour is its own MAL entry, so the
 * drawer's episode control is sized from {@link Anime.episodeCount} directly and there is
 * nothing to choose a season from.
 */
export interface AnimeDetail extends Anime {
  logEntries: LogEntry[];
}

/**
 * One thing written down during a pass. Several per pass is the point: this replaced a single
 * text field, where writing a second thought destroyed the first.
 */
export interface Note {
  id: number;
  logEntryId: number;
  body: string;
  /** An instant. Stamped when you wrote it, and rewriting the body does not move it. */
  writtenAt: string;
}

export interface LogEntry {
  id: number;
  mediaId: number;
  mediaTitle: string;
  status: LogStatus;
  rating: number | null;
  /** Everything written during this pass, newest first. */
  notes: Note[];
  /** What it was played on. Free text: IGDB names the platforms, but its list is not the record. */
  platform: string | null;
  /** How long this pass took you, in hours. Null until recorded. */
  hoursPlayed: number | null;
  /** Instants. A value sent without an offset is read as Eastern by the server. */
  startedAt: string | null;
  completedAt: string | null;
  /**
   * Where you are in a show, on the pass rather than on the title — so a rewatch begins again,
   * as a replay does. Null for the hobbies with no such idea, and an episode never travels
   * without its season: the API refuses that pair, and so does the form.
   */
  seasonNumber: number | null;
  episodeNumber: number | null;
  /** When the entry was written. Server-stamped, and not accepted on the way in. */
  loggedAt: string;
}

/** Note the absence of `loggedAt`: it is the server's to decide, not a caller's to claim. */
export interface CreateLogEntry {
  mediaId: number;
  status: LogStatus;
  rating?: number | null;
  platform?: string | null;
  hoursPlayed?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

/** PUT, so anything left out is *cleared* rather than left alone. */
export type UpdateLogEntry = Omit<CreateLogEntry, 'mediaId'>;

export interface ReorderColumn {
  hobby: string;
  status: LogStatus;
  /** The whole column, top first. Ids that have since moved out are ignored, not rejected. */
  mediaIds: number[];
}

/**
 * Who is signed in.
 *
 * A name for the header and an id to tell one session from another, and deliberately not the
 * email or the provider: nothing displays either yet, and a contract carrying a field nothing
 * reads is a promise somebody has to keep later for no reason.
 */
export interface Me {
  id: number;
  displayName: string;
}
