import { http, HttpResponse } from 'msw';
import { server } from './server';
import type { NoteMatch } from '../api/types';

/** A note a search found, on Hollow Knight: Silksong unless a test says otherwise. */
export function noteMatch(overrides: Partial<NoteMatch> = {}): NoteMatch {
  return {
    id: 11,
    logEntryId: 3201,
    mediaId: 32,
    title: 'Hollow Knight: Silksong',
    subtitle: null,
    coverUrl: null,
    body: 'Moss Mother took twelve tries. First boss and already humbled.',
    // 10:15 PM here on the 19th, which is the 20th in UTC.
    writtenAt: '2026-09-20T02:15:00+00:00',
    ...overrides,
  };
}

export interface NoteSearchFixture {
  notes?: NoteMatch[];
  /** Whether the server had more than it sent, as it says past fifty. */
  more?: boolean;
  /** Answers with this status instead, for the unhappy path. */
  status?: number;
}

/** The note search, recording what each request asked for. */
export function noteSearchServer({ notes = [], more = false, status }: NoteSearchFixture = {}) {
  const searches: { q: string; hobby: string }[] = [];

  server.use(
    http.get('/api/notes/search', ({ request }) => {
      const params = new URL(request.url).searchParams;
      searches.push({ q: params.get('q') ?? '', hobby: params.get('hobby') ?? '' });

      if (status !== undefined) {
        return HttpResponse.json(
          { title: 'Something went wrong', detail: 'The notes could not be searched.', status },
          { status },
        );
      }

      return HttpResponse.json({ notes, more });
    }),
  );

  return { searches };
}
