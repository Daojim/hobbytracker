import { http, HttpResponse } from 'msw';
import { server } from './server';
import { libraryItem } from './library';
import type { Game, LogEntry, PagedResult } from '../api/types';

/** A game as search returns it — the catalogue's shape, not the board's. */
export function game(overrides: Partial<Game> = {}): Game {
  return {
    id: 3003,
    title: 'Hollow Knight',
    coverUrl: null,
    platforms: ['PC', 'Switch'],
    developers: ['Team Cherry'],
    externalId: '3003',
    source: 'igdb',
    hltbMainStoryHours: null,
    ...overrides,
  };
}

export interface SearchFixture {
  results?: Game[];
  /** Media ids already logged, which is what makes a result show as already on the board. */
  library?: number[];
  /** Answers the search with this status instead, for the unhappy paths. */
  searchStatus?: number;
}

export function searchServer({ results = [], library = [], searchStatus }: SearchFixture = {}) {
  const searches: string[] = [];
  const added: number[] = [];

  server.use(
    http.get('/api/games', ({ request }) => {
      searches.push(new URL(request.url).searchParams.get('search') ?? '');

      if (searchStatus !== undefined) {
        return HttpResponse.json(
          { title: 'Bad Gateway', detail: 'IGDB is unhappy.', status: searchStatus },
          { status: searchStatus },
        );
      }

      return HttpResponse.json(results);
    }),

    http.get('/api/library', () =>
      HttpResponse.json({
        items: library.map((mediaId) => libraryItem({ mediaId })),
        total: library.length,
        page: 1,
        pageSize: 100,
      } satisfies PagedResult<ReturnType<typeof libraryItem>>),
    ),

    http.post('/api/log-entries', async ({ request }) => {
      const body = (await request.json()) as { mediaId: number };
      added.push(body.mediaId);

      return HttpResponse.json({
        id: 1,
        mediaId: body.mediaId,
        mediaTitle: 'Hollow Knight',
        status: 'Backlog',
        rating: null,
        notes: null,
        startedAt: null,
        completedAt: null,
        loggedAt: '2026-08-21T15:00:00+00:00',
      } satisfies LogEntry);
    }),
  );

  return { searches, added };
}
