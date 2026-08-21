import type { LibrarySort, LogStatus } from '../api/types';

/** The API caps a page at 100. A column asks for that so it is not silently cut off at 25. */
export const COLUMN_PAGE_SIZE = 100;

/**
 * One cache entry per column *view*.
 *
 * The sort and the year are part of the key, not just of the request. Leaving them out was fine
 * while nothing varied, but with a per-column sort it would serve the previous ordering from
 * cache and only correct itself on the next refetch — a board that shows one order and claims
 * another.
 */
export const columnKey = (
  hobby: string,
  status: LogStatus,
  sort: LibrarySort,
  year: number | undefined,
) => ['library', hobby, status, { sort, year }] as const;

/** Left to right, the order a title moves through. */
export const BOARD_STATUSES: readonly LogStatus[] = [
  'Backlog',
  'InProgress',
  'Completed',
  'Dropped',
];

/**
 * The year applies to Completed and to nothing else.
 *
 * Kept in one place because the column's request and the drag's cache key must agree about it:
 * if they drift, a drag writes into a cache entry the column is not reading.
 */
export const yearFor = (status: LogStatus, year: number | undefined) =>
  status === 'Completed' ? year : undefined;

/**
 * One title's journal: the game and every pass logged against it, as `getGame` answers it.
 *
 * Here rather than in `journal/` because the board writes to it as well as reads it — a drag
 * stamps `started_at` and can insert a whole new entry, so the drawer's copy has to be dropped
 * when one lands. Spelled in one place for the same reason `columnKey` is: two hooks holding
 * the same key by hand is how one of them quietly stops matching.
 */
export const gameKey = (mediaId: number) => ['games', mediaId] as const;
