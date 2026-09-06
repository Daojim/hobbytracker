import { apiJson } from './client';
import type { Movie, MovieDetail } from './types';

/**
 * Films, as `api/games.ts` is games.
 *
 * Two things differ, and both are TMDB rather than this module. There is no `setMovieHltbId`,
 * because a film's runtime comes back from TMDB by id and there is nothing to correct. And a
 * search here answers with less than a game's does — no runtime, no genre names — because
 * TMDB's search endpoint carries neither. That half arrives when the title is added.
 */

/**
 * Searching hits TMDB on every call by design — the debounce lives in the client, as it does for
 * games. Every result is upserted into the catalog as a side effect, which is how a film gets an
 * id that `POST /api/log-entries` can point at.
 */
export function searchMovies(search: string, limit?: number): Promise<Movie[]> {
  // A bare array, not a PagedResult: the order is TMDB's own relevance ranking, which the
  // database cannot reproduce. Do not sort what comes back.
  return apiJson<Movie[]>('/api/movies', { query: { search, limit } });
}

/** One stored film plus everything logged against it, in a single request. */
export function getMovie(id: number): Promise<MovieDetail> {
  return apiJson<MovieDetail>(`/api/movies/${id}`);
}

/**
 * Chooses which genre stands for a film on the board, or clears the choice with a null.
 *
 * Saved on change rather than on a Save button: it belongs to the title rather than to the pass,
 * and the drawer's form submits one PUT to the log-entry endpoint.
 */
export function setMovieGenre(mediaId: number, genre: string | null): Promise<MovieDetail> {
  return apiJson<MovieDetail>(`/api/movies/${mediaId}/genre`, { method: 'PUT', body: { genre } });
}
