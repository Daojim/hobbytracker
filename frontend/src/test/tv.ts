import { http, HttpResponse } from 'msw';
import { server } from './server';
import { logEntry, passServer, type PassCalls, type PassFixture } from './passes';
import type { TvShow, TvShowDetail } from '../api/types';

/**
 * Shows, as `movies.ts` is films and `games.ts` is games.
 *
 * Registers the TV routes and **only** those, for the reason the films fixture states: MSW is
 * configured to error on a request no test stated, so a drawer that still reached
 * `/api/movies/:id` whatever hobby it was opened on fails loudly here rather than serving
 * Arrival under a show's title.
 */

/**
 * A show as search returns one: a first air year and a poster, and none of the rest.
 *
 * TMDB's `/search/tv` carries genre *ids* rather than names and no creators, seasons, counts or
 * runtime at all — so a show arrives on the board half-known and the detail call is what
 * completes it. Keeping the fixture that lossy is what makes an enrichment assertion mean
 * something.
 */
export function tvShow(overrides: Partial<TvShow> = {}): TvShow {
  return {
    id: 5005,
    title: 'Severance',
    coverUrl: null,
    firstAirYear: 2022,
    lastAirYear: null,
    airStatus: null,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    episodeRuntimeMinutes: null,
    genres: [],
    primaryGenre: null,
    creators: [],
    externalId: '95396',
    source: 'tmdb-tv',
    ...overrides,
  };
}

/**
 * A show as the detail route answers one: enriched, and carrying the seasons the journal's two
 * dropdowns are built from.
 *
 * Uneven seasons on purpose — 9 against 10, with a Specials at 0 — so a test that changes the
 * season and counts the episodes is measuring the dropdown rather than agreeing with a constant.
 */
export function tvShowDetail(overrides: Partial<TvShowDetail> = {}): TvShowDetail {
  return {
    ...tvShow(),
    lastAirYear: null,
    airStatus: 'Returning Series',
    numberOfSeasons: 2,
    numberOfEpisodes: 19,
    episodeRuntimeMinutes: 47,
    genres: ['Drama', 'Mystery', 'Sci-Fi & Fantasy'],
    creators: ['Dan Erickson'],
    seasons: [
      { seasonNumber: 0, name: 'Specials', episodeCount: 3 },
      { seasonNumber: 1, name: 'Season 1', episodeCount: 9 },
      { seasonNumber: 2, name: 'Season 2', episodeCount: 10 },
    ],
    logEntries: [logEntry({ mediaId: 5005, mediaTitle: 'Severance' })],
    ...overrides,
  };
}

export interface TvJournalFixture extends PassFixture {
  detail?: TvShowDetail;
}

export function tvJournalServer({
  detail,
  ...passes
}: TvJournalFixture = {}): PassCalls & {
  genresSet: { mediaId: number; genre: string | null }[];
} {
  const genresSet: { mediaId: number; genre: string | null }[] = [];

  const calls = passServer(passes);

  server.use(
    http.get('/api/tv/:id', () => HttpResponse.json(detail ?? tvShowDetail())),

    http.put('/api/tv/:mediaId/genre', async ({ params, request }) => {
      const { genre } = (await request.json()) as { genre: string | null };
      genresSet.push({ mediaId: Number(params['mediaId']), genre });

      return HttpResponse.json({ ...(detail ?? tvShowDetail()), primaryGenre: genre });
    }),
  );

  return { ...calls, genresSet };
}
