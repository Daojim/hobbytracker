import { apiJson } from './client';
import type { Stats } from './types';

/**
 * A year of one hobby for the Stats page, or every year when `year` is undefined — which sends no
 * `year` at all, the API's word for every year.
 */
export function stats(hobby: string, year?: number): Promise<Stats> {
  return apiJson<Stats>('/api/stats', { query: { hobby, year } });
}

/**
 * The years the Stats page can show, newest first.
 *
 * Not the board's list. That one is its current passes', and a year whose only finish has since
 * been replayed is not on it — though it is still a year with a finish in it.
 */
export function statsYears(hobby: string): Promise<number[]> {
  return apiJson<number[]>('/api/stats/years', { query: { hobby } });
}
