import { http, HttpResponse } from 'msw';
import { server } from './server';
import { NO_HOURS, libraryPage } from './library';
import { stats as emptyStats } from './stats';
import type {
  ColumnHours,
  LibraryItem,
  LogStatus,
  Share,
  SharedBoard,
  SharePart,
  Stats,
} from '../api/types';

/** A token of the shape the API hands out: sixteen bytes in base64url. */
export const TOKEN = 'Xk3fQ9dLm2RtVb7wYp4sHa';

export interface SharedFixture {
  token?: string;

  /** What the share says it is. Games, everything but Dropped, and no name, unless a test says. */
  board?: Partial<SharedBoard>;

  columns?: Partial<Record<LogStatus, LibraryItem[]>>;
  hours?: Partial<Record<LogStatus, ColumnHours>>;
  years?: number[];
  upcoming?: LibraryItem[];

  /** A year's stats by the year asked for, `all` for none. A year not named has nothing in it. */
  stats?: Record<string, Stats>;
  statsYears?: number[];
}

/** What a share shows when a test does not say: every column but Dropped, the calendar and Stats. */
export const SHOWN: SharePart[] = ['InProgress', 'OnHold', 'Completed', 'Upcoming', 'Stats'];

/**
 * Serves one share's routes, and nothing of anybody's own board.
 *
 * **Deliberately no `/api/library` and no `/api/auth/me`.** A share is read by nobody, so a page
 * that asked the signed-in board for its columns — or asked who is signed in at all — is a page
 * reading the wrong thing, and MSW's unhandled-request error is what says so. A part the share
 * does not show answers 404, as the API's does, so a page that asked for it anyway fails rather
 * than rendering what it should never have had.
 */
export function sharedServer({
  token = TOKEN,
  board = {},
  columns = {},
  hours = {},
  years = [],
  upcoming = [],
  stats = {},
  statsYears = [],
}: SharedFixture = {}) {
  const shown: SharedBoard = { hobby: 'games', parts: SHOWN, name: null, ...board };
  const shows = (part: SharePart) => shown.parts.includes(part);
  const showsColumn = (status: LogStatus) => status === 'Backlog' || shows(status as SharePart);
  const notFound = () => new HttpResponse(null, { status: 404 });

  const asked: URL[] = [];
  const base = `/api/shared/${token}`;

  server.use(
    http.get(base, () => HttpResponse.json(shown)),

    http.get(`${base}/library`, ({ request }) => {
      const url = new URL(request.url);
      asked.push(url);

      const status = url.searchParams.get('status') as LogStatus | null;
      if (status === null || !showsColumn(status)) {
        return notFound();
      }

      return HttpResponse.json(
        libraryPage(columns[status] ?? [], { hours: hours[status] ?? NO_HOURS }),
      );
    }),

    http.get(`${base}/years`, ({ request }) => {
      asked.push(new URL(request.url));
      return HttpResponse.json(years);
    }),

    http.get(`${base}/upcoming`, ({ request }) => {
      asked.push(new URL(request.url));
      return shows('Upcoming') ? HttpResponse.json(upcoming) : notFound();
    }),

    http.get(`${base}/stats/years`, ({ request }) => {
      asked.push(new URL(request.url));
      return shows('Stats') ? HttpResponse.json(statsYears) : notFound();
    }),

    http.get(`${base}/stats`, ({ request }) => {
      const url = new URL(request.url);
      asked.push(url);

      if (!shows('Stats')) {
        return notFound();
      }

      return HttpResponse.json(stats[url.searchParams.get('year') ?? 'all'] ?? emptyStats());
    }),
  );

  return {
    asked,
    /** Every request made for one column, in order, as query strings. */
    queriesFor: (status: LogStatus) =>
      asked
        .filter((url) => url.pathname.endsWith('/library') && url.searchParams.get('status') === status)
        .map((url) => url.searchParams),
  };
}

/** A link nobody holds, or one that was stopped: every route is the same 404. */
export function deadShareServer(token = TOKEN) {
  server.use(
    http.get(`/api/shared/${token}`, () => new HttpResponse(null, { status: 404 })),
    http.get(`/api/shared/${token}/*`, () => new HttpResponse(null, { status: 404 })),
  );
}

/**
 * Serves the owner's half: this board's share, which starts as `initial`, and what each write
 * did to it. A write answers as the API does, so the dialog's next read agrees with it.
 *
 * `delayMs` holds every write that long, for a test about what happens while one is on its way;
 * `inFlightAtOnce` is the most writes that were ever on their way together.
 */
export function shareServer(
  initial: Share | null = null,
  { hobby = 'games', delayMs = 0 }: { hobby?: string; delayMs?: number } = {},
) {
  let current = initial;
  const made: { parts: SharePart[]; showsName: boolean }[] = [];
  const changed: { parts: SharePart[]; showsName: boolean }[] = [];
  let stopped = 0;
  let inFlight = 0;
  let inFlightAtOnce = 0;

  const forThisBoard = (request: Request) =>
    new URL(request.url).searchParams.get('hobby') === hobby;

  /** A write, held for `delayMs` and counted while it is. */
  async function writing<T>(work: () => T | Promise<T>): Promise<T> {
    inFlight += 1;
    inFlightAtOnce = Math.max(inFlightAtOnce, inFlight);

    try {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return await work();
    } finally {
      inFlight -= 1;
    }
  }

  server.use(
    http.get('/api/share', ({ request }) =>
      HttpResponse.json(forThisBoard(request) ? current : null),
    ),

    http.post('/api/share', ({ request }) =>
      writing(async () => {
        const body = (await request.json()) as { parts: SharePart[]; showsName: boolean };
        made.push(body);

        if (current !== null) {
          return HttpResponse.json({ title: 'Already shared' }, { status: 409 });
        }

        current = { token: TOKEN, parts: body.parts, showsName: body.showsName };
        return HttpResponse.json(current, { status: 201 });
      }),
    ),

    http.put('/api/share', ({ request }) =>
      writing(async () => {
        const body = (await request.json()) as { parts: SharePart[]; showsName: boolean };
        changed.push(body);

        if (current === null) {
          return new HttpResponse(null, { status: 404 });
        }

        current = { ...current, parts: body.parts, showsName: body.showsName };
        return HttpResponse.json(current);
      }),
    ),

    http.delete('/api/share', () =>
      writing(() => {
        stopped += 1;
        current = null;
        return new HttpResponse(null, { status: 204 });
      }),
    ),
  );

  return {
    made,
    changed,
    get stopped() {
      return stopped;
    },
    get inFlightAtOnce() {
      return inFlightAtOnce;
    },

    /** Another tab made the link while this one's dialog was open on "No link yet". */
    madeElsewhere(share: Share) {
      current = share;
    },
  };
}
