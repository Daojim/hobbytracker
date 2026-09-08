import { http, HttpResponse } from 'msw';
import { server } from './server';
import { logEntry, passServer, type PassCalls, type PassFixture } from './passes';
import type { Anime, AnimeDetail } from '../api/types';

/**
 * Anime, as `tv.ts` is shows and `movies.ts` is films.
 *
 * Registers the anime routes and **only** those, for the reason the films fixture states: MSW
 * is configured to error on a request no test stated, so a drawer that still reached
 * `/api/tv/:id` whatever hobby it was opened on fails loudly here rather than serving Severance
 * under an anime's title.
 *
 * **There is no lossy search shape here, unlike every other hobby.** MAL's search and detail
 * endpoints take the same `fields` and answer with the same node, so a fixture that made a
 * search thinner would be inventing a distinction the provider does not have — and would let a
 * bug that read the wrong one pass. {@link animeDetail} is {@link anime} plus its passes.
 */
export function anime(overrides: Partial<Anime> = {}): Anime {
  return {
    id: 52991,
    title: 'Sousou no Frieren',
    englishTitle: "Frieren: Beyond Journey's End",
    coverUrl: null,
    mediaType: 'tv',
    episodeCount: 28,
    episodeRuntimeSeconds: 1470,
    startSeason: 'fall',
    startYear: 2023,
    airStatus: 'finished_airing',
    sourceMaterial: 'manga',
    genres: ['Adventure', 'Award Winning', 'Drama', 'Fantasy', 'Shounen'],
    primaryGenre: null,
    studios: ['Madhouse'],
    meanScore: 9.25,
    externalId: '52991',
    source: 'mal',
    ...overrides,
  };
}

export function animeDetail(overrides: Partial<AnimeDetail> = {}): AnimeDetail {
  return {
    ...anime(),
    logEntries: [logEntry({ mediaId: 52991, mediaTitle: 'Sousou no Frieren' })],
    ...overrides,
  };
}

export interface AnimeJournalFixture extends PassFixture {
  detail?: AnimeDetail;
}

export function animeJournalServer({
  detail,
  ...passes
}: AnimeJournalFixture = {}): PassCalls & {
  genresSet: { mediaId: number; genre: string | null }[];
} {
  const genresSet: { mediaId: number; genre: string | null }[] = [];

  const calls = passServer(passes);

  server.use(
    http.get('/api/anime/:id', () => HttpResponse.json(detail ?? animeDetail())),

    http.put('/api/anime/:mediaId/genre', async ({ params, request }) => {
      const { genre } = (await request.json()) as { genre: string | null };
      genresSet.push({ mediaId: Number(params['mediaId']), genre });

      return HttpResponse.json({ ...(detail ?? animeDetail()), primaryGenre: genre });
    }),
  );

  return { ...calls, genresSet };
}
