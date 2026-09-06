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
  title: string;
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
  /** The chosen genre, or null to use the automatic pick. See board/genres.ts. */
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
  /** The chosen genre, or null to use the automatic pick. See board/genres.ts. */
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
}

export interface GameDetail extends Game {
  hltbId: number | null;
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
