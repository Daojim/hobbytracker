import { apiJson } from './client';
import type { Game, GameDetail } from './types';

/**
 * Searching hits IGDB on every call by design — the debounce lives here, in the client, not in a
 * cache on the server. Every result is upserted into the catalog as a side effect, which is how a
 * game gets an id that `POST /api/log-entries` can point at.
 */
export function searchGames(search: string, limit?: number): Promise<Game[]> {
  // A bare array, not a PagedResult: the order is IGDB's relevance ranking, which the database
  // cannot reproduce. Do not sort what comes back.
  return apiJson<Game[]>('/api/games', { query: { search, limit } });
}

/** One stored game plus everything logged against it, in a single request. */
export function getGame(id: number): Promise<GameDetail> {
  return apiJson<GameDetail>(`/api/games/${id}`);
}
