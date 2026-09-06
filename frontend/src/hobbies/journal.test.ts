import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { hobbyDefinition } from './index';
import { server } from '../test/server';
import { gameDetail } from '../test/games';
import { movieDetail } from '../test/movies';

/**
 * The half of a hobby the journal drawer reads.
 *
 * Worth its own file because it is where two genuinely different API shapes become one, and the
 * failure it prevents is silent in both directions: a film bylined with a game's developers
 * would render, and a games detail mapped through the films arm would too.
 */
describe('journal.load', () => {
  it('bylines a game with its developer and a film with its director', async () => {
    server.use(
      http.get('/api/games/14', () =>
        HttpResponse.json(gameDetail({ developers: ['Team Cherry'] })),
      ),
      http.get('/api/movies/14', () =>
        HttpResponse.json(movieDetail({ directors: ['Denis Villeneuve'] })),
      ),
    );

    expect((await hobbyDefinition('games').journal.load(14)).byline).toEqual(['Team Cherry']);
    expect((await hobbyDefinition('movies').journal.load(14)).byline).toEqual([
      'Denis Villeneuve',
    ]);
  });

  it("states a film's runtime as a fact about the film", async () => {
    // Minutes straight off TMDB rather than through the board row's hours, because there is no
    // round trip here to undo. It is a fact and not a control, which is what separates it from
    // the genre select it sits beside.
    server.use(http.get('/api/movies/14', () => HttpResponse.json(movieDetail({ runtimeMinutes: 116 }))));

    expect((await hobbyDefinition('movies').journal.load(14)).facts).toEqual([
      { label: 'Runtime', value: '1 h 56 m' },
    ]);
  });

  it('says nothing at all about a runtime TMDB does not have', async () => {
    // Absent rather than "unknown". A film only ever searched for has none either, since TMDB's
    // search endpoint does not carry one — a dash there would read as a fact about the film.
    server.use(
      http.get('/api/movies/14', () => HttpResponse.json(movieDetail({ runtimeMinutes: null }))),
    );

    expect((await hobbyDefinition('movies').journal.load(14)).facts).toEqual([]);
  });

  it('gives a game no facts, because its length is a guess and belongs beside your own', async () => {
    server.use(http.get('/api/games/14', () => HttpResponse.json(gameDetail())));

    expect((await hobbyDefinition('games').journal.load(14)).facts).toEqual([]);
  });

  it('carries the four HowLongToBeat figures and the pin for a game, and nothing for a film', async () => {
    // One nullable block rather than five nullable fields, because they arrive together or not
    // at all — and that null is what takes both the pin and the estimate tiers off a film.
    server.use(
      http.get('/api/games/14', () =>
        HttpResponse.json(gameDetail({ hltbId: 9134, hltbAllStylesHours: 41.82 })),
      ),
      http.get('/api/movies/14', () => HttpResponse.json(movieDetail())),
    );

    expect((await hobbyDefinition('games').journal.load(14)).hltb).toEqual({
      id: 9134,
      hltbAllStylesHours: 41.82,
      hltbMainStoryHours: null,
      hltbMainExtraHours: null,
      hltbCompletionistHours: null,
    });
    expect((await hobbyDefinition('movies').journal.load(14)).hltb).toBeNull();
  });

  it('gives a film no platforms, because it is watched rather than played on something', async () => {
    server.use(http.get('/api/movies/14', () => HttpResponse.json(movieDetail())));

    expect((await hobbyDefinition('movies').journal.load(14)).platforms).toEqual([]);
  });
});

describe('journal.fields', () => {
  it('drops hours and platform from a film, rather than relabelling them', () => {
    // The decision, stated where the drawer reads it: "your time" on a film is the runtime,
    // which is a fact about the film and not about the evening, and what it was watched on is
    // not worth a control. A pass on a film is a rating and two dates.
    expect(hobbyDefinition('games').journal.fields).toEqual({
      hoursPlayed: true,
      platform: true,
    });
    expect(hobbyDefinition('movies').journal.fields).toEqual({
      hoursPlayed: false,
      platform: false,
    });
  });
});

describe('journal.setHltbId', () => {
  it('exists for exactly the hobbies whose titles carry a HowLongToBeat block', async () => {
    // Two halves of one fact, and this is what keeps them in step. Wiring only the writer would
    // put a control on screen with nothing behind it; wiring only the block would leave a pin
    // that cannot save.
    server.use(
      http.get('/api/games/14', () => HttpResponse.json(gameDetail())),
      http.get('/api/movies/14', () => HttpResponse.json(movieDetail())),
    );

    for (const slug of ['games', 'movies']) {
      const { journal } = hobbyDefinition(slug);
      const carries = (await journal.load(14)).hltb !== null;

      expect(journal.setHltbId !== null).toBe(carries);
    }
  });
});
