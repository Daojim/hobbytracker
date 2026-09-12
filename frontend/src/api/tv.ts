import { apiJson } from './client';
import type { TvShow, TvShowDetail } from './types';

/**
 * Shows, as `api/movies.ts` is films.
 *
 * The same provider behind both, and one difference that matters here: `tmdb-tv` is a source
 * row of its own rather than a second use of `tmdb`. TMDB numbers films and shows separately,
 * so film 1396 and show 1396 both exist — sharing a source would collide on
 * `ix_media_source_id_external_id`, and the upsert's own recovery from that collision would
 * hand back the film. A show that is silently Breaking Bad's namesake is worse than an error.
 *
 * `/api/tv` and not `/api/tv-shows`: the route is the hobby's slug, because the e2e helper
 * reaches a catalogue as `/api/${hobby}`.
 */

/**
 * Searching hits TMDB on every call, with the debounce in the client as for the other two.
 * Every result is upserted into the catalog as a side effect, which is how a show gets an id
 * that `POST /api/log-entries` can point at.
 */
export function searchShows(search: string, limit?: number): Promise<TvShow[]> {
  // A bare array, not a PagedResult: the order is TMDB's own relevance ranking, which the
  // database cannot reproduce. Do not sort what comes back.
  return apiJson<TvShow[]>('/api/tv', { query: { search, limit } });
}

/**
 * One stored show, its seasons, and everything logged against it, in a single request.
 *
 * The seasons are why this call exists rather than the drawer reading the board row: the
 * journal's season dropdown is built from them, and the episode dropdown's length comes from
 * whichever one is chosen.
 */
export function getShow(id: number): Promise<TvShowDetail> {
  return apiJson<TvShowDetail>(`/api/tv/${id}`);
}

/**
 * Chooses which genre stands for a show on the board, or clears the choice with a null.
 *
 * Its own route, and not part of the pass the drawer writes: it belongs to the title rather
 * than to one pass through it, and the form submits one PUT to the log-entry endpoint. Saved on
 * the change itself, with none of the pass's half-second pause — a select is one decision.
 */
export function setShowGenre(mediaId: number, genre: string | null): Promise<TvShowDetail> {
  return apiJson<TvShowDetail>(`/api/tv/${mediaId}/genre`, { method: 'PUT', body: { genre } });
}
