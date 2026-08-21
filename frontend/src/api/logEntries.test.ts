import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { addToBacklog, createLogEntry, deleteLogEntry, listLogEntries, updateLogEntry } from './logEntries';
import type { LogEntry } from './types';

const entry: LogEntry = {
  id: 1,
  mediaId: 14,
  mediaTitle: 'Celeste',
  status: 'InProgress',
  rating: null,
  notes: null,
  startedAt: '2026-08-21T01:30:00+00:00',
  completedAt: null,
  loggedAt: '2026-08-21T01:30:00+00:00',
};

describe('listLogEntries', () => {
  it('filters by title and status when asked', async () => {
    let search = '';
    server.use(
      http.get('/api/log-entries', ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({ items: [entry], total: 1, page: 1, pageSize: 25 });
      }),
    );

    const result = await listLogEntries({ mediaId: 14, status: 'InProgress' });

    expect(result.items).toEqual([entry]);
    const query = new URLSearchParams(search);
    expect(query.get('mediaId')).toBe('14');
    expect(query.get('status')).toBe('InProgress');
  });
});

describe('createLogEntry', () => {
  it('posts the entry and returns what was stored', async () => {
    let body: unknown;
    server.use(
      http.post('/api/log-entries', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(entry, { status: 201 });
      }),
    );

    await expect(createLogEntry({ mediaId: 14, status: 'InProgress' })).resolves.toEqual(entry);
    expect(body).toEqual({ mediaId: 14, status: 'InProgress' });
  });

  it('never sends loggedAt, even if a caller tries', async () => {
    // It records that the entry was written, which is the server's to know. The type forbids it;
    // this checks the request does too, since a cast would slip past the type.
    let body: Record<string, unknown> = {};
    server.use(
      http.post('/api/log-entries', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(entry, { status: 201 });
      }),
    );

    await createLogEntry({
      mediaId: 14,
      status: 'Backlog',
      loggedAt: '2001-01-01T00:00:00Z',
    } as Parameters<typeof createLogEntry>[0]);

    expect(body).not.toHaveProperty('loggedAt');
  });
});

describe('addToBacklog', () => {
  it('is a plain Backlog entry, needing no endpoint of its own', async () => {
    // Search already upserts a result into the catalog, so putting a game on the board is just
    // the first entry logged against the id it came back with.
    let body: unknown;
    server.use(
      http.post('/api/log-entries', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...entry, status: 'Backlog' }, { status: 201 });
      }),
    );

    await addToBacklog(14);

    expect(body).toEqual({ mediaId: 14, status: 'Backlog' });
  });
});

describe('updateLogEntry', () => {
  it('replaces the entry wholesale', async () => {
    // PUT, not PATCH: a field left out is cleared. Sending a partial body here would silently
    // wipe the rating, which is exactly why the type has no optional-means-untouched escape.
    let body: unknown;
    server.use(
      http.put('/api/log-entries/1', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...entry, status: 'Completed' });
      }),
    );

    await updateLogEntry(1, { status: 'Completed', rating: 9.5, notes: null });

    expect(body).toEqual({ status: 'Completed', rating: 9.5, notes: null });
  });
});

describe('deleteLogEntry', () => {
  it('accepts the 204', async () => {
    server.use(http.delete('/api/log-entries/1', () => new HttpResponse(null, { status: 204 })));

    await expect(deleteLogEntry(1)).resolves.toBeUndefined();
  });
});
