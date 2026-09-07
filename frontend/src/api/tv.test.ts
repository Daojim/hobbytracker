import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { getShow, searchShows, setShowGenre } from './tv';
import type { TvShow } from './types';

/** As search answers: a first air year and a poster, and nothing else TMDB knows about it. */
const severance: TvShow = {
  id: 14,
  title: 'Severance',
  coverUrl: 'https://image.tmdb.org/t/p/w342/x.jpg',
  firstAirYear: 2022,
  lastAirYear: null,
  airStatus: null,
  numberOfSeasons: null,
  numberOfEpisodes: null,
  episodeRuntimeMinutes: null,
  genres: [],
  primaryGenre: null,
  creators: [],
  externalId: '95396',
  source: 'tmdb-tv',
};

describe('searchShows', () => {
  it('returns a bare array, in the order TMDB ranked it', async () => {
    // The third endpoint to answer this way, for the reason the other two do: the order is the
    // provider's own relevance ranking, which the database has no way to reproduce.
    server.use(http.get('/api/tv', () => HttpResponse.json([severance, { ...severance, id: 15 }])));

    const results = await searchShows('severance');

    expect(results.map((show) => show.id)).toEqual([14, 15]);
  });

  it('sends the search term and an optional limit', async () => {
    let search = '';
    server.use(
      http.get('/api/tv', ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );

    await searchShows('the bear', 5);

    const query = new URLSearchParams(search);
    expect(query.get('search')).toBe('the bear');
    expect(query.get('limit')).toBe('5');
  });

  it('omits the limit when there is none', async () => {
    let search = '';
    server.use(
      http.get('/api/tv', ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );

    await searchShows('severance');

    expect(new URLSearchParams(search).has('limit')).toBe(false);
  });
});

describe('getShow', () => {
  it('answers with the half search could not, the seasons included', async () => {
    // The seasons are why TV needed a detail call of its own rather than reading the board row:
    // the journal's season dropdown is built from this list, and the episode dropdown's length
    // comes from whichever entry is chosen.
    server.use(
      http.get('/api/tv/14', () =>
        HttpResponse.json({
          ...severance,
          airStatus: 'Returning Series',
          numberOfSeasons: 2,
          numberOfEpisodes: 19,
          episodeRuntimeMinutes: 47,
          genres: ['Drama', 'Mystery'],
          creators: ['Dan Erickson'],
          seasons: [
            { seasonNumber: 1, name: 'Season 1', episodeCount: 9 },
            { seasonNumber: 2, name: 'Season 2', episodeCount: 10 },
          ],
          logEntries: [],
        }),
      ),
    );

    const show = await getShow(14);

    expect(show.episodeRuntimeMinutes).toBe(47);
    expect(show.creators).toEqual(['Dan Erickson']);
    expect(show.seasons.map((season) => season.episodeCount)).toEqual([9, 10]);
    expect(show.logEntries).toEqual([]);
  });
});

describe('setShowGenre', () => {
  it('chooses which genre stands for the show', async () => {
    let body: unknown;
    server.use(
      http.put('/api/tv/14/genre', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          ...severance,
          primaryGenre: 'Mystery',
          seasons: [],
          logEntries: [],
        });
      }),
    );

    const show = await setShowGenre(14, 'Mystery');

    expect(body).toEqual({ genre: 'Mystery' });
    expect(show.primaryGenre).toBe('Mystery');
  });

  it('sends a null to go back to the automatic pick, rather than omitting it', async () => {
    let body: unknown;
    server.use(
      http.put('/api/tv/14/genre', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          ...severance,
          primaryGenre: null,
          seasons: [],
          logEntries: [],
        });
      }),
    );

    await setShowGenre(14, null);

    expect(body).toEqual({ genre: null });
  });
});
