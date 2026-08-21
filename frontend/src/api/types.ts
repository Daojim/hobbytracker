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
export type LibrarySort = 'manual' | 'added' | 'title' | 'rating';

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
}

export interface Game {
  id: number;
  title: string;
  coverUrl: string | null;
  platforms: string[];
  developers: string[];
  externalId: string | null;
  source: string;
  hltbMainStoryHours: number | null;
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
