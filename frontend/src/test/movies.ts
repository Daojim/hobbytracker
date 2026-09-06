import { http, HttpResponse } from 'msw';
import { server } from './server';
import { logEntry, passServer, type PassCalls, type PassFixture } from './passes';
import type { Movie, MovieDetail } from '../api/types';

/**
 * Films, as `games.ts` is games.
 *
 * Deliberately does **not** register `/api/games/:id`. The drawer used to fetch a game whatever
 * it was opened on, and the whole point of a films fixture is that the old call is now an
 * unhandled request — which MSW is configured to fail on rather than pass through.
 */

/** A film as search returns it: no runtime and no directors, because TMDB's search has neither. */
export function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 4004,
    title: 'Arrival',
    coverUrl: null,
    releaseYear: 2016,
    runtimeMinutes: null,
    genres: [],
    primaryGenre: null,
    directors: [],
    externalId: '329865',
    source: 'tmdb',
    ...overrides,
  };
}

/** A film as the detail route answers one: enriched, so the runtime and the director are there. */
export function movieDetail(overrides: Partial<MovieDetail> = {}): MovieDetail {
  return {
    ...movie(),
    runtimeMinutes: 116,
    genres: ['Drama', 'Science Fiction'],
    directors: ['Denis Villeneuve'],
    logEntries: [logEntry({ mediaId: 4004, mediaTitle: 'Arrival' })],
    ...overrides,
  };
}

export interface MovieJournalFixture extends PassFixture {
  detail?: MovieDetail;
}

export function movieJournalServer({
  detail,
  ...passes
}: MovieJournalFixture = {}): PassCalls & {
  genresSet: { mediaId: number; genre: string | null }[];
} {
  const genresSet: { mediaId: number; genre: string | null }[] = [];

  const calls = passServer(passes);

  server.use(
    http.get('/api/movies/:id', () => HttpResponse.json(detail ?? movieDetail())),

    http.put('/api/movies/:mediaId/genre', async ({ params, request }) => {
      const { genre } = (await request.json()) as { genre: string | null };
      genresSet.push({ mediaId: Number(params['mediaId']), genre });

      return HttpResponse.json({ ...(detail ?? movieDetail()), primaryGenre: genre });
    }),
  );

  return { ...calls, genresSet };
}
