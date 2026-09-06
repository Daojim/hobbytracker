import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { activityYears, libraryMediaIds, listColumn, reorderColumn, transition } from './library';
import type { LibraryItem, PagedResult } from './types';

const item: LibraryItem = {
  mediaId: 14,
  title: 'Celeste',
  coverUrl: null,
  hobby: 'games',
  currentStatus: 'InProgress',
  entryCount: 2,
  latestRating: null,
  lastActivity: '2026-08-21T01:30:00+00:00',
  genres: [],
  primaryGenre: null,
  lengthHours: null,
  hltbPending: false,
  latestNotePreview: null,
};

const page: PagedResult<LibraryItem> = { items: [item], total: 1, page: 1, pageSize: 25 };

/** Captures the URL the client actually asked for. */
function capture(
  method: 'get' | 'post' | 'put',
  path: string,
  body: Parameters<typeof HttpResponse.json>[0],
  status = 200,
) {
  const seen: { url?: string; body?: unknown } = {};
  server.use(
    http[method](path, async ({ request }) => {
      seen.url = new URL(request.url).search;
      if (method !== 'get') {
        seen.body = await request.json();
      }
      return status === 204 ? new HttpResponse(null, { status }) : HttpResponse.json(body);
    }),
  );
  return seen;
}

describe('listColumn', () => {
  it('asks for one column of one hobby', async () => {
    const seen = capture('get', '/api/library', page);

    await expect(listColumn({ hobby: 'games', status: 'InProgress' })).resolves.toEqual(page);

    const query = new URLSearchParams(seen.url);
    expect(query.get('hobby')).toBe('games');
    expect(query.get('status')).toBe('InProgress');
  });

  it('sends a year only when one is given', async () => {
    // The year picker sits above the Completed column alone; Backlog and Playing ignore it, and
    // they do that by simply not asking.
    const withoutYear = capture('get', '/api/library', page);
    await listColumn({ hobby: 'games', status: 'Backlog' });
    expect(new URLSearchParams(withoutYear.url).has('year')).toBe(false);

    const withYear = capture('get', '/api/library', page);
    await listColumn({ hobby: 'games', status: 'Completed', year: 2026 });
    expect(new URLSearchParams(withYear.url).get('year')).toBe('2026');
  });

  it('passes the sort through', async () => {
    const seen = capture('get', '/api/library', page);

    await listColumn({ hobby: 'games', status: 'Backlog', sort: 'title' });

    expect(new URLSearchParams(seen.url).get('sort')).toBe('title');
  });
});

describe('activityYears', () => {
  it('returns the years, newest first, as the API ordered them', async () => {
    const seen = capture('get', '/api/library/years', [2026, 2024]);

    await expect(activityYears('games')).resolves.toEqual([2026, 2024]);
    expect(new URLSearchParams(seen.url).get('hobby')).toBe('games');
  });
});

describe('transition', () => {
  it('names the target column and nothing else', async () => {
    // Which entry moves, and which timestamps get set, is the server's decision. A client that
    // sent dates would be guessing at rules it does not own.
    const seen = capture('post', '/api/library/14/status', item);

    await expect(transition(14, 'Completed')).resolves.toEqual(item);
    expect(seen.body).toEqual({ status: 'Completed' });
  });
});

describe('reorderColumn', () => {
  it('sends the whole column, top first', async () => {
    // Not a move-and-index: sending the full order is idempotent and has no off-by-one to get
    // wrong, and ids that have since left the column are ignored rather than rejected.
    const seen = capture('put', '/api/library/order', null, 204);

    await expect(
      reorderColumn({ hobby: 'games', status: 'Backlog', mediaIds: [3, 1, 2] }),
    ).resolves.toBeUndefined();

    expect(seen.body).toEqual({ hobby: 'games', status: 'Backlog', mediaIds: [3, 1, 2] });
  });
});

describe('libraryMediaIds', () => {
  it('walks every page, because a capped answer would offer to add a title twice', async () => {
    const pages: URLSearchParams[] = [];
    server.use(
      http.get('/api/library', ({ request }) => {
        const query = new URL(request.url).searchParams;
        pages.push(query);

        const items =
          query.get('page') === '1'
            ? Array.from({ length: 100 }, (_, index) => ({ ...item, mediaId: index + 1 }))
            : [{ ...item, mediaId: 101 }];

        return HttpResponse.json({ items, total: 101, page: 1, pageSize: 100 });
      }),
    );

    await expect(libraryMediaIds('games')).resolves.toHaveLength(101);
    expect(pages.map((query) => query.get('page'))).toEqual(['1', '2']);
  });

  it('stops as soon as it has them all', async () => {
    const seen = capture('get', '/api/library', page);

    await expect(libraryMediaIds('games')).resolves.toEqual([14]);
    expect(new URLSearchParams(seen.url).get('hobby')).toBe('games');
  });
});
