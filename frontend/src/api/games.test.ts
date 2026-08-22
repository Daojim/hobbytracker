import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { getGame, searchGames } from './games';
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
  hltbMainStoryHours: null,
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
