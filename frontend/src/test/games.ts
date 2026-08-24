import { http, HttpResponse } from 'msw';
import { server } from './server';
import { libraryItem } from './library';
import type { Game, GameDetail, LogEntry, Note, PagedResult } from '../api/types';

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
        loggedAt: '2026-08-21T15:00:00+00:00',
      } satisfies LogEntry);
    }),
  );

  return { searches, added };
}

/** One thing written during a pass. Dated in the evening here, which is the next day in UTC. */
export function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 5,
    logEntryId: 1,
    body: 'finally beat radiance',
    writtenAt: '2026-08-21T01:30:00+00:00',
    ...overrides,
  };
}

export function logEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 1,
    mediaId: 3003,
    mediaTitle: 'Hollow Knight',
    status: 'InProgress',
    rating: null,
    notes: [],
    platform: null,
    hoursPlayed: null,
    startedAt: null,
    completedAt: null,
    loggedAt: '2026-08-21T15:00:00+00:00',
    ...overrides,
  };
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

export interface JournalFixture {
  detail?: GameDetail;
  /** Answers the save with a field error instead, for the unhappy path. */
  saveErrors?: Record<string, string[]>;
  /** Answers the delete with this status instead, for the unhappy path. */
  deleteStatus?: number;
  /**
   * Answers the pin with a field error instead — an id HowLongToBeat does not know.
   *
   * That is the refusal worth stubbing: the pin fetches upstream while the caller waits,
   * precisely so a wrong id comes back as a refusal rather than as a stored pin that quietly
   * answers nothing.
   */
  pinErrors?: Record<string, string[]>;
}

export function journalServer({
  detail,
  saveErrors,
  deleteStatus,
  pinErrors,
}: JournalFixture = {}) {
  const saved: { id: number; body: Record<string, unknown> }[] = [];
  const deleted: number[] = [];
  const written: { entryId: number; body: string }[] = [];
  const rewritten: { id: number; body: string }[] = [];
  const dropped: number[] = [];
  const genresSet: { mediaId: number; genre: string | null }[] = [];
  const pinned: { mediaId: number; hltbId: number | null }[] = [];

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

    http.put('/api/log-entries/:id', async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;

      if (saveErrors !== undefined) {
        return HttpResponse.json(
          { title: 'One or more validation errors occurred.', status: 400, errors: saveErrors },
          { status: 400 },
        );
      }

      saved.push({ id: Number(params['id']), body });
      return HttpResponse.json(logEntry({ id: Number(params['id']) }));
    }),

    http.delete('/api/log-entries/:id', ({ params }) => {
      if (deleteStatus !== undefined) {
        return HttpResponse.json(
          { title: 'Not Found', detail: 'That pass is already gone.', status: deleteStatus },
          { status: deleteStatus },
        );
      }

      deleted.push(Number(params['id']));
      return new HttpResponse(null, { status: 204 });
    }),

    http.post('/api/log-entries/:entryId/notes', async ({ params, request }) => {
      const { body } = (await request.json()) as { body: string };
      written.push({ entryId: Number(params['entryId']), body });

      return HttpResponse.json(note({ body }), { status: 201 });
    }),

    http.put('/api/notes/:id', async ({ params, request }) => {
      const { body } = (await request.json()) as { body: string };
      rewritten.push({ id: Number(params['id']), body });

      return HttpResponse.json(note({ id: Number(params['id']), body }));
    }),

    http.delete('/api/notes/:id', ({ params }) => {
      dropped.push(Number(params['id']));
      return new HttpResponse(null, { status: 204 });
    }),
  );

  return { saved, deleted, written, rewritten, dropped, genresSet, pinned };
}
