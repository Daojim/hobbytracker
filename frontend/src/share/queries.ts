import { getShare } from '../api/share';
import {
  sharedBoard,
  sharedColumn,
  sharedStats,
  sharedStatsYears,
  sharedUpcoming,
  sharedYears,
} from '../api/shared';
import type { ColumnRequest } from '../board/Column';
import type { UpcomingRequest } from '../board/ComingSoon';
import { COLUMN_PAGE_SIZE } from '../board/keys';
import {
  shareKey,
  sharedColumnKey,
  sharedKey,
  sharedStatsKey,
  sharedStatsYearsKey,
  sharedUpcomingKey,
  sharedYearsKey,
} from '../board/keys';
import type { LibrarySort, LogStatus } from '../api/types';

/**
 * Your board's link, as Settings shows it: the row's line under it, and the dialog. One request
 * for both, so the row says "Shared" exactly when the dialog shows an address.
 */
export const shareQuery = (hobby: string) => ({
  queryKey: shareKey(hobby),
  queryFn: () => getShare(hobby),
});

/**
 * A share's requests, each the counterpart of one on your own board: the same shape, handed to
 * the same components, asking the share's routes under the share's keys.
 */

/** Which board the share is, and what it shows. */
export const sharedBoardQuery = (token: string) => ({
  queryKey: sharedKey(token),
  queryFn: () => sharedBoard(token),
});

/** One of the share's columns — `columnQuery`'s counterpart, which the switcher counts from too. */
export const sharedColumnQuery = (
  token: string,
  status: LogStatus,
  sort: LibrarySort,
  year: number | undefined,
): ColumnRequest => ({
  queryKey: sharedColumnKey(token, status, sort, year),
  queryFn: () => sharedColumn(token, { status, sort, year, pageSize: COLUMN_PAGE_SIZE }),
});

/** The share's calendar — `upcomingQuery`'s counterpart. */
export const sharedUpcomingQuery = (token: string): UpcomingRequest => ({
  queryKey: sharedUpcomingKey(token),
  queryFn: () => sharedUpcoming(token),
});

/** The share's years, from the columns it shows. */
export const sharedYearsQuery = (token: string) => ({
  queryKey: sharedYearsKey(token),
  queryFn: () => sharedYears(token),
});

/** A year of the share's Stats page, or every year. */
export const sharedStatsQuery = (token: string, year: number | undefined) => ({
  queryKey: sharedStatsKey(token, year),
  queryFn: () => sharedStats(token, year),
});

/** The share's Stats page's own years. */
export const sharedStatsYearsQuery = (token: string) => ({
  queryKey: sharedStatsYearsKey(token),
  queryFn: () => sharedStatsYears(token),
});
