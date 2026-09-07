import { http, HttpResponse } from 'msw';
import { server } from './server';
import type { LogEntry, Note } from '../api/types';

/**
 * A pass, a note, and the five routes that write them — none of which knows what hobby it is on.
 *
 * Here rather than in `games.ts` because a movies drawer needs exactly these handlers and must
 * **not** get `/api/games/:id` along with them. MSW errors on a request no test stated, so a
 * films fixture that quietly carried the games detail route would turn "the drawer still calls
 * getGame" from a loud failure into a passing test. Splitting them is what keeps that failure.
 *
 * The defaults name a game because they were written when there was one hobby, and a pass has
 * to be a pass through something. Any test that cares overrides them.
 */

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
    seasonNumber: null,
    episodeNumber: null,
    loggedAt: '2026-08-21T15:00:00+00:00',
    ...overrides,
  };
}

export interface PassFixture {
  /** Answers the save with a field error instead, for the unhappy path. */
  saveErrors?: Record<string, string[]>;
  /** Answers the delete with this status instead, for the unhappy path. */
  deleteStatus?: number;
}

/** What each of the five writes was asked to do, for a test to assert on afterwards. */
export interface PassCalls {
  saved: { id: number; body: Record<string, unknown> }[];
  deleted: number[];
  written: { entryId: number; body: string }[];
  rewritten: { id: number; body: string }[];
  dropped: number[];
}

export function passServer({ saveErrors, deleteStatus }: PassFixture = {}): PassCalls {
  const calls: PassCalls = {
    saved: [],
    deleted: [],
    written: [],
    rewritten: [],
    dropped: [],
  };

  server.use(
    http.put('/api/log-entries/:id', async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;

      if (saveErrors !== undefined) {
        return HttpResponse.json(
          { title: 'One or more validation errors occurred.', status: 400, errors: saveErrors },
          { status: 400 },
        );
      }

      calls.saved.push({ id: Number(params['id']), body });
      return HttpResponse.json(logEntry({ id: Number(params['id']) }));
    }),

    http.delete('/api/log-entries/:id', ({ params }) => {
      if (deleteStatus !== undefined) {
        return HttpResponse.json(
          { title: 'Not Found', detail: 'That pass is already gone.', status: deleteStatus },
          { status: deleteStatus },
        );
      }

      calls.deleted.push(Number(params['id']));
      return new HttpResponse(null, { status: 204 });
    }),

    http.post('/api/log-entries/:entryId/notes', async ({ params, request }) => {
      const { body } = (await request.json()) as { body: string };
      calls.written.push({ entryId: Number(params['entryId']), body });

      return HttpResponse.json(note({ body }), { status: 201 });
    }),

    http.put('/api/notes/:id', async ({ params, request }) => {
      const { body } = (await request.json()) as { body: string };
      calls.rewritten.push({ id: Number(params['id']), body });

      return HttpResponse.json(note({ id: Number(params['id']), body }));
    }),

    http.delete('/api/notes/:id', ({ params }) => {
      calls.dropped.push(Number(params['id']));
      return new HttpResponse(null, { status: 204 });
    }),
  );

  return calls;
}
