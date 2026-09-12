import { apiJson } from './client';
import type { Anime, AnimeDetail } from './types';

/**
 * Anime, as `api/tv.ts` is shows.
 *
 * A different provider from the other three, and `mal` is a source row of its own for the same
 * reason `tmdb-tv` is: MAL numbers its catalogue independently of both TMDB sequences, so anime
 * 1 and film 1 both exist. Sharing a source would collide on
 * `ix_media_source_id_external_id`, and the upsert's own recovery from that collision would
 * hand back the film — an anime that is silently something else is worse than an error.
 *
 * `/api/anime` and not `/api/mal`: the route is the hobby's slug, because the e2e helper reaches
 * a catalogue as `/api/${hobby}`.
 */

/**
 * Searching hits MAL on every call, with the debounce in the client as for the other three.
 * Every result is upserted into the catalog as a side effect, which is how a title gets an id
 * that `POST /api/log-entries` can point at.
 */
export function searchAnime(search: string, limit?: number): Promise<Anime[]> {
  // A bare array, not a PagedResult — and the order is the server's re-rank rather than MAL's
  // own, which puts a second cour above its first. Do not sort what comes back.
  return apiJson<Anime[]>('/api/anime', { query: { search, limit } });
}

/**
 * One stored anime and everything logged against it, in a single request.
 *
 * **Unlike a show, nothing here is unavailable from a search**: MAL answers the same node at
 * both endpoints. The drawer still uses this rather than the board row, because a board row
 * carries a title, a length and a genre and none of the facts a drawer prints.
 */
export function getAnime(id: number): Promise<AnimeDetail> {
  return apiJson<AnimeDetail>(`/api/anime/${id}`);
}

/**
 * Chooses which genre stands for an anime on the board, or clears the choice with a null.
 *
 * Its own route, and not part of the pass the drawer writes: it belongs to the title rather
 * than to one pass through it, and the form submits one PUT to the log-entry endpoint. Saved on
 * the change itself, with none of the pass's half-second pause — a select is one decision.
 */
export function setAnimeGenre(mediaId: number, genre: string | null): Promise<AnimeDetail> {
  return apiJson<AnimeDetail>(`/api/anime/${mediaId}/genre`, { method: 'PUT', body: { genre } });
}
