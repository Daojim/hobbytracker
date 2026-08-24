import { http, HttpResponse } from 'msw';
import { server } from './server';
import { authServer } from './auth';
import type { LibraryItem, LogStatus, PagedResult } from '../api/types';

/**
 * A board's worth of fixtures, and the handlers that serve them.
 *
 * The MSW server registers nothing by default and errors on an unhandled request, so a board
 * test would otherwise have to stub four column requests plus the year list before it could
 * assert anything at all. This puts that in one call and hands back what the board asked for,
 * so a test can say "Backlog was fetched once, and without a year".
 */

let nextMediaId = 1;

/** Ids auto-increment so two cards in a column cannot collide; pass one when the test cares. */
export function libraryItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    mediaId: nextMediaId++,
    title: 'Celeste',
    coverUrl: null,
    hobby: 'games',
    currentStatus: 'Backlog',
    entryCount: 1,
    latestRating: null,
    lastActivity: null,
    genres: [],
    primaryGenre: null,
    hltbMainStoryHours: null,
    latestNotePreview: null,
    ...overrides,
  };
}

export interface BoardFixture {
  columns?: Partial<Record<LogStatus, LibraryItem[]>>;
  years?: number[];
}

export function boardServer({ columns = {}, years = [] }: BoardFixture = {}) {
  // The shell asks who is signed in the moment it mounts, and MSW refuses a request no test
  // stated. Answered here so every board test does not have to say so; call authServer(...)
  // afterwards to override it, since a later server.use wins.
  authServer();

  const listed: URL[] = [];
  const transitions: { mediaId: number; status: LogStatus }[] = [];
  const reorders: { hobby: string; status: LogStatus; mediaIds: number[] }[] = [];

  server.use(
    http.get('/api/library/years', () => HttpResponse.json(years)),

    http.get('/api/library', ({ request }) => {
      const url = new URL(request.url);
      listed.push(url);

      const status = url.searchParams.get('status') as LogStatus | null;
      const items = (status === null ? undefined : columns[status]) ?? [];

      return HttpResponse.json({
        items,
        total: items.length,
        page: 1,
        pageSize: 100,
      } satisfies PagedResult<LibraryItem>);
    }),

    http.post('/api/library/:mediaId/status', async ({ params, request }) => {
      const { status } = (await request.json()) as { status: LogStatus };
      const mediaId = Number(params['mediaId']);
      transitions.push({ mediaId, status });

      return HttpResponse.json(libraryItem({ mediaId, currentStatus: status }));
    }),

    http.put('/api/library/order', async ({ request }) => {
      reorders.push((await request.json()) as (typeof reorders)[number]);
      return new HttpResponse(null, { status: 204 });
    }),
  );

  return {
    listed,
    transitions,
    reorders,
    /** Every request made for one column, in order, as query strings. */
    queriesFor: (status: LogStatus) =>
      listed.filter((url) => url.searchParams.get('status') === status).map((url) => url.searchParams),
  };
}
