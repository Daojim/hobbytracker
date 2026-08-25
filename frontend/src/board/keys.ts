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

/**
 * The year applies to every column except Backlog.
 *
 * Kept in one place because the column's request and the drag's cache key must agree about it:
 * if they drift, a drag writes into a cache entry the column is not reading.
 *
 * Backlog is exempt rather than filtered. Both of its timestamps are cleared by the rule that
 * puts a title there, so it belongs to no year and a year would empty it on every choice — and
 * the queue is what you drag out of while reading a past year. The server holds the other half
 * of this rule, deciding which date each column answers with; see `LibraryService.InYear`.
 */
export const yearFor = (status: LogStatus, year: number | undefined) =>
  status === 'Backlog' ? undefined : year;

/**
 * The years the picker offers.
 *
 * Spelled here with the others because it is written to as well as read: a transition stamps
 * started_at or completed_at, which is what this list is derived from, so a drag can bring a
 * year into existence that the picker does not yet know about.
 */
export const yearsKey = (hobby: string) => ['library', hobby, 'years'] as const;

/**
 * One title's journal: the game and every pass logged against it, as `getGame` answers it.
 *
 * Here rather than in `journal/` because the board writes to it as well as reads it — a drag
 * stamps `started_at` and can insert a whole new entry, so the drawer's copy has to be dropped
 * when one lands. Spelled in one place for the same reason `columnKey` is: two hooks holding
 * the same key by hand is how one of them quietly stops matching.
 */
export const gameKey = (mediaId: number) => ['games', mediaId] as const;
