import { http, HttpResponse } from 'msw';
import { server } from './server';
import { authServer } from './auth';
import { NO_HOURS } from './library';
import type { BacklogTitle, Finish, Stats } from '../api/types';

/**
 * The Stats page's fixtures, and the handlers that serve them.
 *
 * Every fixture says nothing by default: a finish with no rating, no hours and no estimate, and a
 * year with nothing in it. A test about one section says what that section is about and leaves the
 * others empty, so it cannot pass on another section's numbers.
 */

let nextMediaId = 1;

/** One finished pass, finished on a spring afternoon here. */
export function finish(overrides: Partial<Finish> = {}): Finish {
  return {
    mediaId: nextMediaId++,
    title: 'Celeste',
    coverUrl: null,
    completedAt: '2026-04-12T16:00:00Z',
    rating: null,
    hoursPlayed: null,
    lengthHours: null,
    ...overrides,
  };
}

/** A title in the Backlog column, added an afternoon this year and with no history behind it. */
export function backlogTitle(overrides: Partial<BacklogTitle> = {}): BacklogTitle {
  return {
    mediaId: nextMediaId++,
    title: 'Red Dead Redemption 2',
    coverUrl: null,
    loggedAt: '2026-03-02T17:00:00Z',
    inBacklogSince: null,
    ...overrides,
  };
}

/** A year with nothing in it. */
export function stats(overrides: Partial<Stats> = {}): Stats {
  return {
    finished: [],
    hours: NO_HOURS,
    completion: { finished: 0, going: 0, dropped: 0 },
    backlog: [],
    ...overrides,
  };
}

/**
 * Serves the Stats page: its years, and a year's stats by the year asked for — `all` for a
 * request with none. A year the test did not mention answers with nothing in it, rather than with
 * another year's numbers, so a page asking for the wrong year shows an empty page instead of
 * passing on somebody else's.
 *
 * Returns what was asked for, so a test can say which years the page fetched.
 */
export function statsServer({
  years = [],
  byYear = {},
  hobby = 'games',
}: {
  years?: number[];
  byYear?: Record<string, Stats>;
  hobby?: string;
} = {}) {
  authServer();
  const asked: (string | null)[] = [];

  server.use(
    http.get('/api/stats/years', ({ request }) => {
      const theirs = new URL(request.url).searchParams.get('hobby') !== hobby;
      return HttpResponse.json(theirs ? [] : years);
    }),

    http.get('/api/stats', ({ request }) => {
      const url = new URL(request.url);
      const year = url.searchParams.get('year');
      asked.push(year);

      const theirs = url.searchParams.get('hobby') !== hobby;
      return HttpResponse.json(theirs ? stats() : (byYear[year ?? 'all'] ?? stats()));
    }),
  );

  return { asked };
}
