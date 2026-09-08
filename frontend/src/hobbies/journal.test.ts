import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { hobbyDefinition } from './index';
import { server } from '../test/server';
import { gameDetail } from '../test/games';
import { movieDetail } from '../test/movies';
import { tvShowDetail } from '../test/tv';
import { animeDetail } from '../test/anime';

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

  it('bylines an anime with its studio, which is who anybody says made it', async () => {
    // A game's developers, a film's directors, a show's creators — the fourth answer to one
    // question, and the reason the drawer has a `byline` rather than four fields.
    server.use(
      http.get('/api/anime/14', () => HttpResponse.json(animeDetail({ studios: ['Madhouse'] }))),
    );

    expect((await hobbyDefinition('anime').journal.load(14)).byline).toEqual(['Madhouse']);
  });

  it('states an anime as its run, its airing, one episode, a score and a source', async () => {
    // Five facts where a show has three, and two of them exist only here. MAL's mean is worth a
    // line because it is out of ten, which is the scale a pass's own rating uses — the two sit
    // beside each other with no footnote. The source material is what tells you whether a thing
    // is an original or an adaptation, which is most of what anybody wants to know first.
    //
    // MAL's snake_case is made readable here rather than stored differently, exactly as TMDB's
    // "Returning Series" is carried verbatim and a runtime in minutes is turned into words.
    server.use(http.get('/api/anime/14', () => HttpResponse.json(animeDetail())));

    expect((await hobbyDefinition('anime').journal.load(14)).facts).toEqual([
      { label: 'Run', value: 'TV · 28 episodes' },
      { label: 'Airing', value: 'Finished · Fall 2023' },
      { label: 'Episode', value: '25 m' },
      { label: 'MAL', value: '9.25' },
      { label: 'Source', value: 'Manga' },
    ]);
  });

  it('drops the facts MAL has nothing to say about', async () => {
    // The films runtime rule. Unlike a show, none of these arrives late — MAL answers
    // everything to a search — so a missing one is genuinely missing rather than not yet
    // fetched, which makes a dash here even less honest than it would be there.
    server.use(
      http.get('/api/anime/14', () =>
        HttpResponse.json(
          animeDetail({
            mediaType: null,
            episodeCount: null,
            episodeRuntimeSeconds: null,
            airStatus: null,
            startSeason: null,
            startYear: null,
            sourceMaterial: null,
            meanScore: null,
          }),
        ),
      ),
    );

    expect((await hobbyDefinition('anime').journal.load(14)).facts).toEqual([]);
  });

  it('sizes an anime from its own episode count, and gives it no seasons at all', async () => {
    // The second half of the `progress: 'episode'` contract. `seasons` is empty because a cour
    // is its own MAL entry, and `episodeCount` is what the one dropdown is built from instead.
    //
    // Deliberately *not* a synthetic one-season list, which would look tidier and would be the
    // same mistake as writing season 1 on every anime pass: a fact in the column nobody
    // claimed, which every later reader then has to know to ignore.
    server.use(
      http.get('/api/anime/14', () => HttpResponse.json(animeDetail({ episodeCount: 28 }))),
      http.get('/api/tv/14', () => HttpResponse.json(tvShowDetail())),
    );

    const anime = await hobbyDefinition('anime').journal.load(14);
    expect(anime.seasons).toEqual([]);
    expect(anime.episodeCount).toBe(28);

    // And the other way round: a show has seasons and no title-wide count, because its second
    // dropdown is sized from whichever season was chosen. The whole run's total there would
    // offer episode 19 of a season with nine in it.
    expect((await hobbyDefinition('tv').journal.load(14)).episodeCount).toBeNull();
  });

  it('offers no episodes for a cour that has not aired', async () => {
    // MAL answers `num_episodes: 0` for an announced entry, and nought means unknown rather
    // than none — Frieren's 2027 cour is the ordinary case for it. The server stores null, and
    // the control then offers nothing rather than offering episode 0.
    server.use(
      http.get('/api/anime/14', () => HttpResponse.json(animeDetail({ episodeCount: null }))),
    );

    expect((await hobbyDefinition('anime').journal.load(14)).episodeCount).toBeNull();
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
      progress: 'season-episode',
    });
  });

  it('gives an anime the episode half alone, which is why progress is not a boolean', () => {
    // The decision this field was widened for. MAL numbers each cour as its own entry —
    // `Sousou no Frieren` and `Sousou no Frieren 2nd Season` are two ids and two cards — so the
    // cour *is* the title and "episode 7" says everything there is to say.
    //
    // `ck_log_entries_episode_needs_season` forbade exactly that shape and was dropped for it,
    // along with its LogEntryRules twin. This is where the rule went: a hobby with no season
    // half never renders the control, and a hobby with one keeps its episode list empty until
    // a season is chosen.
    expect(hobbyDefinition('anime').journal.fields).toEqual({
      hoursPlayed: false,
      platform: false,
      progress: 'episode',
    });
  });
});

describe('progress', () => {
  it('exists for exactly the hobbies whose passes say where you are', () => {
    // The `setHltbId` and `hltb` pairing, applied to the second half-and-half thing a hobby has:
    // a form offering the control while nothing formats it would put E12 nowhere, and a card
    // formatting one nothing can set would promise a badge no pass can reach.
    for (const slug of ['games', 'movies', 'tv', 'anime']) {
      const { journal, progress } = hobbyDefinition(slug);

      expect(progress !== null, slug).toBe(journal.fields.progress !== false);
    }
  });

  it('writes an anime as E12, with no season half to be missing', () => {
    // Television's `format` returns null for an episode with no season, on the argument that
    // printing `E7` would be inventing the half that is missing. That is correct *for
    // television* and is exactly why this is not a shared function: here there is no missing
    // half, because a cour is the entry.
    const { progress } = hobbyDefinition('anime');

    expect(progress!.format(null, 12)).toBe('E12');
    expect(progress!.describe(null, 12)).toBe('Episode 12');
  });

  it('says nothing for an anime pass that has not said where it is', () => {
    const { progress } = hobbyDefinition('anime');

    expect(progress!.format(null, null)).toBeNull();
    expect(progress!.describe(null, null)).toBe('Not started');
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
      http.get('/api/anime/14', () => HttpResponse.json(animeDetail())),
    );

    for (const slug of ['games', 'movies', 'tv', 'anime']) {
      const { journal } = hobbyDefinition(slug);
      const carries = (await journal.load(14)).hltb !== null;

      expect(journal.setHltbId !== null).toBe(carries);
    }
  });
});
