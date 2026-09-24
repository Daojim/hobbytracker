import { http, HttpResponse } from 'msw';
import { server } from './server';
import { libraryItem } from './library';
import { logEntry, passServer, type PassCalls, type PassFixture } from './passes';
import type { OnBoard } from '../api/library';
import type { Game, GameDetail, LogStatus, PagedResult } from '../api/types';

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
  /** Titles already logged, which is what makes a result say where it is instead of offering to add it. */
  library?: OnBoard[];
  /** Answers the search with this status instead, for the unhappy paths. */
  searchStatus?: number;
}

/**
 * The search, the library the strip reads, and the add — as the API behaves, adds included.
 *
 * An add joins the library, so a refetch after it finds the title where the add put it. A stub
 * that forgot would have the tile go back to offering an add the moment the refetch landed,
 * which is a bug the real board does not have; and a second add of the same title is refused
 * with the API's 409 rather than recorded twice.
 */
export function searchServer({ results = [], library = [], searchStatus }: SearchFixture = {}) {
  const searches: string[] = [];
  const added: OnBoard[] = [];
  const onBoard = [...library];

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
        items: onBoard.map(({ mediaId, status }) => libraryItem({ mediaId, currentStatus: status })),
        total: onBoard.length,
        page: 1,
        pageSize: 100,
      } satisfies PagedResult<ReturnType<typeof libraryItem>>),
    ),

    http.post('/api/library/:mediaId', async ({ params, request }) => {
      const mediaId = Number(params['mediaId']);
      const { status } = (await request.json()) as { status: LogStatus };

      if (onBoard.some((title) => title.mediaId === mediaId)) {
        return HttpResponse.json(
          {
            title: 'Already on your board',
            detail: 'That title is already on your board.',
            status: 409,
          },
          { status: 409 },
        );
      }

      added.push({ mediaId, status });
      onBoard.push({ mediaId, status });

      return HttpResponse.json(libraryItem({ mediaId, currentStatus: status }), { status: 201 });
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
