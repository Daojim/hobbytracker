import { http, HttpResponse } from 'msw';
import { server } from './server';
import { libraryItem, libraryPage } from './library';
import { logEntry, passServer, type PassCalls, type PassFixture } from './passes';
import type { OnBoard } from '../api/library';
import type { Game, GameDetail, GameReviews, LogStatus } from '../api/types';

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
      HttpResponse.json(
        libraryPage(
          onBoard.map(({ mediaId, status }) => libraryItem({ mediaId, currentStatus: status })),
        ),
      ),
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
    // Nobody has asked HowLongToBeat about it, which is also what a title just added says until
    // the queue gets to it.
    hltbCheckedAt: null,
    // Neither page found yet, which is also what a game nobody has opened a journal on says.
    openCriticId: null,
    steamAppId: null,
    // Ordered logged_at DESC, id DESC by the API, so the first entry is the pass the board is
    // showing. The drawer takes it as given rather than re-deriving the rule a third time.
    logEntries: [logEntry()],
    ...overrides,
  };
}

/**
 * What the reviews route answers for a game as the journal holds it: the pages it already has,
 * and nothing said about either. The server's answer agrees with the read it sits beside unless a
 * test says otherwise, which is how a first look is told apart from every other open.
 */
export const nothingSaid = (current: GameDetail): GameReviews => ({
  openCriticId: current.openCriticId,
  steamAppId: current.steamAppId,
  openCritic: null,
  steam: null,
});

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

  /**
   * What the title holds once HowLongToBeat has been asked about it again, from the journal's
   * arrow. The read answers with it from then on, as the real one would. Or a refusal, with its
   * status and the sentence the server puts in it: an id HowLongToBeat no longer has is a 409.
   *
   * Unset, a check finds what was already there.
   */
  refreshed?: GameDetail | { status: number; detail: string };

  /** Holds every check until this settles, so a test can look at the drawer while one runs. */
  refreshHeldUntil?: Promise<void>;

  /**
   * What OpenCritic and Steam say, for the game as the read holds it at the moment of asking —
   * so a pin that changes the read changes what is said. Unset, nothing is said about either.
   * Or a status, for a route that could not answer at all.
   */
  reviews?: ((current: GameDetail) => GameReviews) | { status: number };

  /** Holds every ask of the reviews route until this settles, for looking at the rows mid-ask. */
  reviewsHeldUntil?: Promise<void>;

  /** Answers OpenCritic's pin with a field error instead — a number OpenCritic does not know. */
  openCriticPinErrors?: Record<string, string[]>;
}

export function journalServer({
  detail,
  pinErrors,
  refreshed,
  refreshHeldUntil,
  reviews = nothingSaid,
  reviewsHeldUntil,
  openCriticPinErrors,
  ...passes
}: JournalFixture = {}): PassCalls & {
  genresSet: { mediaId: number; genre: string | null }[];
  pinned: { mediaId: number; hltbId: number | null }[];
  /** The media id of every check the arrow asked for, in order. */
  refreshes: number[];
  /** The media id of every ask of the reviews route, in order. */
  reviewAsks: number[];
  /** Every OpenCritic number pinned, in order. */
  openCriticPins: { mediaId: number; openCriticId: number | null }[];
} {
  const genresSet: { mediaId: number; genre: string | null }[] = [];
  const pinned: { mediaId: number; hltbId: number | null }[] = [];
  const refreshes: number[] = [];
  const reviewAsks: number[] = [];
  const openCriticPins: { mediaId: number; openCriticId: number | null }[] = [];

  // What the read answers with, which a check can change. A drawer refetches after one, so a
  // read that went on answering with the title as it was would undo the check on screen.
  let current = detail ?? gameDetail();

  const calls = passServer(passes);

  server.use(
    http.get('/api/games/:id', () => HttpResponse.json(current)),

    http.post('/api/games/:mediaId/hltb/refresh', async ({ params }) => {
      refreshes.push(Number(params['mediaId']));
      await refreshHeldUntil;

      if (refreshed !== undefined && 'status' in refreshed) {
        return HttpResponse.json(
          { title: 'Refused', status: refreshed.status, detail: refreshed.detail },
          { status: refreshed.status },
        );
      }

      current = refreshed ?? current;
      return HttpResponse.json(current);
    }),

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

    http.get('/api/games/:mediaId/reviews', async ({ params }) => {
      reviewAsks.push(Number(params['mediaId']));
      await reviewsHeldUntil;

      if ('status' in reviews) {
        return HttpResponse.json(
          { title: 'Failed', status: reviews.status },
          { status: reviews.status },
        );
      }

      return HttpResponse.json(reviews(current));
    }),

    http.put('/api/games/:mediaId/opencritic', async ({ params, request }) => {
      const { openCriticId } = (await request.json()) as { openCriticId: number | null };

      if (openCriticPinErrors !== undefined) {
        return HttpResponse.json(
          { title: 'One or more validation errors occurred.', status: 400, errors: openCriticPinErrors },
          { status: 400 },
        );
      }

      openCriticPins.push({ mediaId: Number(params['mediaId']), openCriticId });

      // Kept, as the server keeps it: the read answers with the pin from now on, so the drawer's
      // refetch finds it and asks what OpenCritic says about the new number.
      current = { ...current, openCriticId };
      return HttpResponse.json(current);
    }),
  );

  return { ...calls, genresSet, pinned, refreshes, reviewAsks, openCriticPins };
}
