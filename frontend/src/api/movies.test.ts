import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { getMovie, searchMovies, setMovieGenre } from './movies';
import type { Movie } from './types';

/** As search answers: a year and a poster, and neither a runtime nor a genre name. */
const arrival: Movie = {
  id: 14,
  title: 'Arrival',
  coverUrl: 'https://image.tmdb.org/t/p/w342/x.jpg',
  releaseYear: 2016,
  runtimeMinutes: null,
  genres: [],
  primaryGenre: null,
  directors: [],
  externalId: '329865',
  source: 'tmdb',
};

describe('searchMovies', () => {
  it('returns a bare array, in the order TMDB ranked it', async () => {
    // The same rule as games, for the same reason: search is the one endpoint that does not
    // answer with a PagedResult, and the order is the provider's relevance ranking, which the
    // database has no way to reproduce.
    server.use(http.get('/api/movies', () => HttpResponse.json([arrival, { ...arrival, id: 15 }])));

    const results = await searchMovies('arrival');

    expect(results.map((movie) => movie.id)).toEqual([14, 15]);
  });

  it('sends the search term and an optional limit', async () => {
    let search = '';
    server.use(
      http.get('/api/movies', ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );

    await searchMovies('portrait of a lady on fire', 5);

    const query = new URLSearchParams(search);
    expect(query.get('search')).toBe('portrait of a lady on fire');
    expect(query.get('limit')).toBe('5');
  });

  it('omits the limit when there is none', async () => {
    let search = '';
    server.use(
      http.get('/api/movies', ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );

    await searchMovies('arrival');

    expect(new URLSearchParams(search).has('limit')).toBe(false);
  });
});

describe('getMovie', () => {
  it('answers with the half search could not: the runtime, the genres and the director', async () => {
    // This is the whole shape of the TMDB integration in one assertion. `/search/movie` carries
    // no runtime and only genre *ids*, so a film arrives on the board half-known and the detail
    // call is what completes it — which is why enrichment happens on add rather than on search.
    server.use(
      http.get('/api/movies/14', () =>
        HttpResponse.json({
          ...arrival,
          runtimeMinutes: 116,
          genres: ['Drama', 'Science Fiction'],
          directors: ['Denis Villeneuve'],
          logEntries: [],
        }),
      ),
    );

    const movie = await getMovie(14);

    expect(movie.runtimeMinutes).toBe(116);
    expect(movie.genres).toEqual(['Drama', 'Science Fiction']);
    expect(movie.directors).toEqual(['Denis Villeneuve']);
    expect(movie.logEntries).toEqual([]);
  });
});

describe('setMovieGenre', () => {
  it('chooses which genre stands for the film', async () => {
    let body: unknown;
    server.use(
      http.put('/api/movies/14/genre', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...arrival, primaryGenre: 'Science Fiction', logEntries: [] });
      }),
    );

    const movie = await setMovieGenre(14, 'Science Fiction');

    expect(body).toEqual({ genre: 'Science Fiction' });
    expect(movie.primaryGenre).toBe('Science Fiction');
  });

  it('sends a null to go back to the automatic pick, rather than omitting it', async () => {
    // Omitting the field would be indistinguishable from not asking. Null is a request in its
    // own right: use whatever the list picks, and keep using it if TMDB retags the film.
    let body: unknown;
    server.use(
      http.put('/api/movies/14/genre', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...arrival, primaryGenre: null, logEntries: [] });
      }),
    );

    await setMovieGenre(14, null);

    expect(body).toEqual({ genre: null });
  });
});
