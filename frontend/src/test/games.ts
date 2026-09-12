import { http, HttpResponse } from 'msw';
import { server } from './server';
import { libraryItem } from './library';
import { logEntry, passServer, type PassCalls, type PassFixture } from './passes';
import type { Game, GameDetail, LogEntry, PagedResult } from '../api/types';

// Re-exported because a pass is a pass whichever hobby it is through, and the specs that were
// written when games were the only hobby import them from here. See `passes.ts`.
export { logEntry, note } from './passes';

/** A game as search returns it — the catalogue's shape, not the board's. */
export function game(overrides: Partial<Game> = {}): Game {
  return {
    id: 3003,
    title: 'Hollow Knight',
    coverUrl: null,
    platforms: ['PC', 'Switch'],
    developers: ['Team Cherry'],
    genres: [],
    primaryGenre: null,
    externalId: '3003',
    source: 'igdb',
    hltbAllStylesHours: null,
    hltbMainStoryHours: null,
    hltbMainExtraHours: null,
    hltbCompletionistHours: null,

    // Out, and nobody has asked IGDB exactly when. A tile for this offers a plain *Add*.
    released: true,
    releaseDate: null,
    releasePrecision: null,

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
        notes: [],
        platform: null,
        hoursPlayed: null,
        startedAt: null,
        completedAt: null,
        seasonNumber: null,
        episodeNumber: null,
        loggedAt: '2026-08-21T15:00:00+00:00',
      } satisfies LogEntry);
    }),
  );

  return { searches, added };
}

export function gameDetail(overrides: Partial<GameDetail> = {}): GameDetail {
  return {
    ...game(),
    hltbId: null,
    // Ordered logged_at DESC, id DESC by the API, so the first entry is the pass the board is
    // showing. The drawer takes it as given rather than re-deriving the rule a third time.
    logEntries: [logEntry()],
    ...overrides,
  };
}

export interface JournalFixture extends PassFixture {
  detail?: GameDetail;
  /**
   * Answers the pin with a field error instead — an id HowLongToBeat does not know.
   *
   * That is the refusal worth stubbing: the pin fetches upstream while the caller waits,
   * precisely so a wrong id comes back as a refusal rather than as a stored pin that quietly
   * answers nothing.
   */
  pinErrors?: Record<string, string[]>;
}

export function journalServer({ detail, pinErrors, ...passes }: JournalFixture = {}): PassCalls & {
  genresSet: { mediaId: number; genre: string | null }[];
  pinned: { mediaId: number; hltbId: number | null }[];
} {
  const genresSet: { mediaId: number; genre: string | null }[] = [];
  const pinned: { mediaId: number; hltbId: number | null }[] = [];

  const calls = passServer(passes);

  server.use(
    http.get('/api/games/:id', () => HttpResponse.json(detail ?? gameDetail())),

    http.put('/api/games/:mediaId/genre', async ({ params, request }) => {
      const { genre } = (await request.json()) as { genre: string | null };
      genresSet.push({ mediaId: Number(params['mediaId']), genre });

      return HttpResponse.json({ ...(detail ?? gameDetail()), primaryGenre: genre });
    }),

    http.put('/api/games/:mediaId/hltb', async ({ params, request }) => {
      const { hltbId } = (await request.json()) as { hltbId: number | null };

      if (pinErrors !== undefined) {
        return HttpResponse.json(
          { title: 'One or more validation errors occurred.', status: 400, errors: pinErrors },
          { status: 400 },
        );
      }

      pinned.push({ mediaId: Number(params['mediaId']), hltbId });

      // The real endpoint answers with the game it has just re-fetched under the new id, so
      // what comes back is the numbers that id actually carries.
      return HttpResponse.json({ ...(detail ?? gameDetail()), hltbId });
    }),
  );

  return { ...calls, genresSet, pinned };
}
