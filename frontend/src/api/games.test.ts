import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { getGame, refreshGameHltb, searchGames, setGameHltbId } from './games';
import type { Game } from './types';

const celeste: Game = {
  id: 14,
  title: 'Celeste',
  coverUrl: 'https://images.igdb.com/x.jpg',
  platforms: ['PC', 'Switch'],
  developers: ['Extremely OK Games'],
  externalId: '7793',
  source: 'igdb',
  genres: [],
  primaryGenre: null,
  hltbAllStylesHours: null,
  hltbMainStoryHours: null,
  hltbMainExtraHours: null,
  hltbCompletionistHours: null,
  released: true,
  releaseDate: null,
  releasePrecision: null,
};

describe('searchGames', () => {
  it('returns a bare array, in the order IGDB ranked it', async () => {
    // Search is the one endpoint that does not return a PagedResult. The order is IGDB's
    // relevance, which the database has no way to reproduce, so it must not be re-sorted here.
    server.use(http.get('/api/games', () => HttpResponse.json([celeste, { ...celeste, id: 15 }])));

    const results = await searchGames('celeste');

    expect(results.map((game) => game.id)).toEqual([14, 15]);
  });

  it('sends the search term and an optional limit', async () => {
    let search = '';
    server.use(
      http.get('/api/games', ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );

    await searchGames('hollow knight', 5);

    const query = new URLSearchParams(search);
    expect(query.get('search')).toBe('hollow knight');
    expect(query.get('limit')).toBe('5');
  });

  it('omits the limit when there is none', async () => {
    let search = '';
    server.use(
      http.get('/api/games', ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );

    await searchGames('celeste');

    expect(new URLSearchParams(search).has('limit')).toBe(false);
  });
});

describe('getGame', () => {
  it('returns the game with its log entries', async () => {
    server.use(
      http.get('/api/games/14', () => HttpResponse.json({ ...celeste, hltbId: null, logEntries: [] })),
    );

    const game = await getGame(14);

    expect(game.title).toBe('Celeste');
    expect(game.logEntries).toEqual([]);
  });
});

describe('setGameHltbId', () => {
  it('pins the id against the title, and answers with what that id turned out to hold', async () => {
    let body: unknown;
    server.use(
      http.put('/api/games/14/hltb', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          ...celeste,
          hltbId: 9134,
          hltbMainStoryHours: 8,
          logEntries: [],
        });
      }),
    );

    const game = await setGameHltbId(14, 9134);

    expect(body).toEqual({ hltbId: 9134 });
    // The endpoint fetches there and then, so the numbers come back with the pin rather than
    // arriving later from the queue. That is the whole reason it is worth waiting on.
    expect(game.hltbMainStoryHours).toBe(8);
  });

  it('sends a null to take the pin back, rather than omitting it', async () => {
    // Omitting the field would be indistinguishable from not asking. Null is the request to
    // forget the id — which puts the title back to never-having-been-asked, not to asked-and-
    // found-nothing, so the next backfill looks again.
    let body: unknown;
    server.use(
      http.put('/api/games/14/hltb', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...celeste, hltbId: null, logEntries: [] });
      }),
    );

    await setGameHltbId(14, null);

    expect(body).toEqual({ hltbId: null });
  });

  it('carries the reason HowLongToBeat refused an id, not just that it did', async () => {
    server.use(
      http.put('/api/games/14/hltb', () =>
        HttpResponse.json(
          {
            title: 'One or more validation errors occurred.',
            status: 400,
            errors: { hltbId: ['HowLongToBeat has no game 999999.'] },
          },
          { status: 400 },
        ),
      ),
    );

    await expect(setGameHltbId(14, 999999)).rejects.toThrow('HowLongToBeat has no game 999999.');
  });
});

describe('refreshGameHltb', () => {
  it('asks HowLongToBeat about the title again, and answers with what it holds now', async () => {
    // No body: what to ask about is the title's own business — its stored id, or its name when
    // it has none — and the server already knows both.
    let asked = 0;
    server.use(
      http.post('/api/games/14/hltb/refresh', () => {
        asked += 1;
        return HttpResponse.json({
          ...celeste,
          hltbId: 9134,
          hltbAllStylesHours: 20,
          hltbCheckedAt: '2026-11-03T16:00:00+00:00',
          logEntries: [],
        });
      }),
    );

    const game = await refreshGameHltb(14);

    expect(asked).toBe(1);
    expect(game.hltbAllStylesHours).toBe(20);
    expect(game.hltbCheckedAt).toBe('2026-11-03T16:00:00+00:00');
  });

  it('carries the sentence naming an id HowLongToBeat no longer has', async () => {
    server.use(
      http.post('/api/games/14/hltb/refresh', () =>
        HttpResponse.json(
          {
            title: 'No longer on HowLongToBeat',
            status: 409,
            detail: 'HowLongToBeat no longer has game 555.',
          },
          { status: 409 },
        ),
      ),
    );

    await expect(refreshGameHltb(14)).rejects.toThrow('HowLongToBeat no longer has game 555.');
  });
});
