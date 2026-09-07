import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { hobbyDefinition } from './index';
import { server } from '../test/server';
import { gameDetail } from '../test/games';
import { movieDetail } from '../test/movies';
import { tvShowDetail } from '../test/tv';

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

  it('bylines a show with its creator, which is routinely nobody', async () => {
    // Three words for one line, and the third is the one that is often empty: TMDB carries no
    // creator at all for most documentaries and most non-US productions. An empty byline is a
    // fact about the show rather than a load that failed.
    server.use(
      http.get('/api/tv/14', () => HttpResponse.json(tvShowDetail({ creators: ['Dan Erickson'] }))),
      http.get('/api/tv/15', () => HttpResponse.json(tvShowDetail({ creators: [] }))),
    );

    expect((await hobbyDefinition('tv').journal.load(14)).byline).toEqual(['Dan Erickson']);
    expect((await hobbyDefinition('tv').journal.load(15)).byline).toEqual([]);
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

  it('states a show as its run, its airing and one episode', async () => {
    // Three facts where a film has one, and each is a pair that only reads as a fact together:
    // seasons mean little without the episode count, and a status without a year span does not
    // say when. `Airing` rather than `Status`, one word away from where *you* are on the title —
    // the same collision `air_status` avoids in the schema.
    server.use(http.get('/api/tv/14', () => HttpResponse.json(tvShowDetail())));

    expect((await hobbyDefinition('tv').journal.load(14)).facts).toEqual([
      { label: 'Run', value: '2 seasons \u00b7 19 episodes' },
      { label: 'Airing', value: 'Returning Series \u00b7 2022\u2013' },
      { label: 'Episode', value: '47 m' },
    ]);
  });

  it('closes the year span on a show that has finished, and says one year once', async () => {
    // Null is meaningful on `lastAirYear` and is not missing data — it is what a show still
    // running has. A run inside one year reads as that year rather than as 2016–2016.
    server.use(
      http.get('/api/tv/14', () =>
        HttpResponse.json(
          tvShowDetail({ airStatus: 'Ended', firstAirYear: 2016, lastAirYear: 2019 }),
        ),
      ),
      http.get('/api/tv/15', () =>
        HttpResponse.json(
          tvShowDetail({ airStatus: 'Ended', firstAirYear: 2016, lastAirYear: 2016 }),
        ),
      ),
    );

    const airing = async (id: number) =>
      (await hobbyDefinition('tv').journal.load(id)).facts.find((fact) => fact.label === 'Airing')
        ?.value;

    expect(await airing(14)).toBe('Ended \u00b7 2016\u20132019');
    expect(await airing(15)).toBe('Ended \u00b7 2016');
  });

  it('drops the facts a show has nothing to say about, rather than printing a dash', async () => {
    // A show only ever searched for has none of these, because TMDB's `/search/tv` carries none
    // of them — the films rule exactly, and the reason enrichment happens on add.
    server.use(
      http.get('/api/tv/14', () =>
        HttpResponse.json(
          tvShowDetail({
            airStatus: null,
            firstAirYear: null,
            lastAirYear: null,
            numberOfSeasons: null,
            numberOfEpisodes: null,
            episodeRuntimeMinutes: null,
          }),
        ),
      ),
    );

    expect((await hobbyDefinition('tv').journal.load(14)).facts).toEqual([]);
  });

  it('counts one season and one episode in the singular', async () => {
    server.use(
      http.get('/api/tv/14', () =>
        HttpResponse.json(tvShowDetail({ numberOfSeasons: 1, numberOfEpisodes: 1 })),
      ),
    );

    expect((await hobbyDefinition('tv').journal.load(14)).facts[0]).toEqual({
      label: 'Run',
      value: '1 season \u00b7 1 episode',
    });
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

  it('carries a show\u2019s seasons, and nothing of the sort for the other two', async () => {
    // What the journal's two dropdowns are built from, and the reason the drawer reaches the
    // detail endpoint rather than reading the board row. `[]` for a hobby with no such idea, on
    // `platforms`' precedent — stated rather than inferred.
    server.use(
      http.get('/api/tv/14', () => HttpResponse.json(tvShowDetail())),
      http.get('/api/movies/14', () => HttpResponse.json(movieDetail())),
      http.get('/api/games/14', () => HttpResponse.json(gameDetail())),
    );

    expect((await hobbyDefinition('tv').journal.load(14)).seasons).toEqual([
      { number: 0, label: 'Specials', episodeCount: 3 },
      { number: 1, label: 'Season 1', episodeCount: 9 },
      { number: 2, label: 'Season 2', episodeCount: 10 },
    ]);
    expect((await hobbyDefinition('movies').journal.load(14)).seasons).toEqual([]);
    expect((await hobbyDefinition('games').journal.load(14)).seasons).toEqual([]);
  });

  it('names a season TMDB has not named, rather than leaving the option blank', async () => {
    server.use(
      http.get('/api/tv/14', () =>
        HttpResponse.json(
          tvShowDetail({
            seasons: [
              { seasonNumber: 0, name: null, episodeCount: 2 },
              { seasonNumber: 4, name: null, episodeCount: 8 },
            ],
          }),
        ),
      ),
    );

    expect(
      (await hobbyDefinition('tv').journal.load(14)).seasons.map((season) => season.label),
    ).toEqual(['Specials', 'Season 4']);
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
      progress: false,
    });
    expect(hobbyDefinition('movies').journal.fields).toEqual({
      hoursPlayed: false,
      platform: false,
      progress: false,
    });
  });

  it('gives a show the season and episode pair, and neither of the other two fields', async () => {
    // A show is the one thing here you are partway *through*, which is what the pair is for. It
    // is still not hours: nobody records how long an evening of television took, and the show
    // already says how long one episode runs.
    expect(hobbyDefinition('tv').journal.fields).toEqual({
      hoursPlayed: false,
      platform: false,
      progress: true,
    });
  });
});

describe('progress', () => {
  it('exists for exactly the hobbies whose passes carry a season and an episode', () => {
    // The `setHltbId` and `hltb` pairing, applied to the second half-and-half thing a hobby has:
    // a form offering the control while nothing formats it would put S3 E7 nowhere, and a card
    // formatting one nothing can set would promise a badge no pass can reach.
    for (const slug of ['games', 'movies', 'tv']) {
      const { journal, progress } = hobbyDefinition(slug);

      expect(progress !== null, slug).toBe(journal.fields.progress);
    }
  });

  it('writes where you are as S3 E7, and reads it aloud in full', () => {
    const { progress } = hobbyDefinition('tv');

    expect(progress!.format(3, 7)).toBe('S3 E7');
    expect(progress!.describe(3, 7)).toBe('Season 3, episode 7');
  });

  it('says the season alone when that is all anybody recorded', () => {
    const { progress } = hobbyDefinition('tv');

    expect(progress!.format(3, null)).toBe('S3');
    expect(progress!.describe(3, null)).toBe('Season 3');
  });

  it('calls season zero Specials, because S0 is not a thing anybody says', () => {
    // The dropdown already says Specials where it is chosen; the badge has to agree, or the
    // card is the one place in the app that calls it something else.
    const { progress } = hobbyDefinition('tv');

    expect(progress!.format(0, 3)).toBe('Specials E3');
    expect(progress!.describe(0, 3)).toBe('Specials, episode 3');
  });

  it('formats nothing at all for a pass that says nothing about where it is', () => {
    // Null rather than an empty string, so the card leaves the badge out entirely instead of
    // rendering a gap in a row of separated facts.
    const { progress } = hobbyDefinition('tv');

    expect(progress!.format(null, null)).toBeNull();
    // An episode with no season is refused by the API and by the form, so this is a shape that
    // should not exist — printing `E7` would be inventing the half that is missing.
    expect(progress!.format(null, 7)).toBeNull();
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
      http.get('/api/tv/14', () => HttpResponse.json(tvShowDetail())),
    );

    for (const slug of ['games', 'movies', 'tv']) {
      const { journal } = hobbyDefinition(slug);
      const carries = (await journal.load(14)).hltb !== null;

      expect(journal.setHltbId !== null).toBe(carries);
    }
  });
});
