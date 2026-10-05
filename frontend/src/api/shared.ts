import { apiJson } from './client';
import type { LibraryItem, LibraryPage, LibrarySort, LogStatus, SharedBoard, Stats } from './types';

/**
 * A share, read by whoever holds its link: `/api/shared/{token}`, with nobody signed in.
 *
 * The board's own routes are never asked from a share's pages — they are `/api/library` and act
 * as whoever is signed in — and the token is the whole of how a share is found. It is encoded
 * because it arrives from an address bar, where a visitor can type anything into it.
 */
const base = (token: string) => `/api/shared/${encodeURIComponent(token)}`;

/** Which board this is, what it shows, and the owner's name only when they ticked it. */
export function sharedBoard(token: string): Promise<SharedBoard> {
  return apiJson<SharedBoard>(base(token));
}

/** One column of the share, as its owner's board draws it, less the note. */
export function sharedColumn(
  token: string,
  query: { status: LogStatus; sort?: LibrarySort; year?: number; pageSize?: number },
): Promise<LibraryPage> {
  return apiJson<LibraryPage>(`${base(token)}/library`, { query: { ...query } });
}

/** The share's years, counted from the columns it shows and no others. */
export function sharedYears(token: string): Promise<number[]> {
  return apiJson<number[]>(`${base(token)}/years`);
}

/** The release calendar under the share's board. */
export function sharedUpcoming(token: string): Promise<LibraryItem[]> {
  return apiJson<LibraryItem[]>(`${base(token)}/upcoming`);
}

/** A year of the share's Stats page — the owner's, whole — or every year when `year` is undefined. */
export function sharedStats(token: string, year?: number): Promise<Stats> {
  return apiJson<Stats>(`${base(token)}/stats`, { query: { year } });
}

/** The years the share's Stats page can show: the Stats page's own, not the board's. */
export function sharedStatsYears(token: string): Promise<number[]> {
  return apiJson<number[]>(`${base(token)}/stats/years`);
}
