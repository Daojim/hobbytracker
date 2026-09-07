/**
 * A stand-in for TMDB, serving all four of the endpoints the app uses.
 *
 * **One stub and not two, and that is forced rather than tidy.** There is one `Tmdb:BaseUrl` and
 * one bearer, so a second server on a second port would be unreachable — films and shows are the
 * same host to the same client. Adding TV here is a catalogue and two routes.
 *
 * The same argument the IGDB stub makes: `media` rows are only ever written by a search, so
 * seeding through the API means calling one — and `Tmdb:BaseUrl` is a plain option, so pointing
 * it here makes "never reach TMDB" true with no production code involved.
 *
 * **Both endpoints, deliberately.** CLAUDE.md already records what a half-mirrored stub costs:
 * HowLongToBeat's search path became two segments, a guard refused it, and the suite stayed
 * green because the stub was a single segment for as long as the site was. Search and detail
 * are genuinely different responses here — search carries no runtime and names no genre — and a
 * stub that served only the first could not tell you when the second stopped being asked for.
 *
 * **The bearer is enforced.** This is the only place the token wiring is exercised end to end:
 * a request without it gets TMDB's own 401 shape, so removing the `Authorization` header from
 * the typed client's configuring lambda fails a spec rather than passing one.
 *
 * Poster paths are omitted on purpose, exactly as the IGDB stub omits covers: a null cover means
 * the browser never asks image.tmdb.org for anything, and the card's placeholder gets exercised
 * rather than left unseen.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.TMDB_STUB_PORT ?? 5396);
const TOKEN = process.env.TMDB_STUB_TOKEN ?? 'e2e-tmdb-token';

/**
 * Ids are fixed, because a second search for the same title must upsert rather than insert.
 *
 * Genres are the board's colours, and each film carries more than one so a spec can watch the
 * automatic pick take the specific word over the generic one — Arrival is Drama *and* Science
 * Fiction, and the list in `hobbies/movies.ts` is what decides which of those it is painted as.
 *
 * Runtimes are the real ones. One film has none at all, which is not a gap in the fixture: TMDB
 * answers `0` for a film nobody has filled the field in for, and `ck_movies_runtime_positive`
 * exists so that reaching the column is a loud failure rather than a card claiming a film takes
 * no time.
 */
const CATALOGUE = [
  {
    id: 4001, title: 'Arrival', releaseDate: '2016-11-10', runtime: 116,
    genres: ['Drama', 'Science Fiction', 'Mystery'], directors: ['Denis Villeneuve'],
  },
  {
    id: 4002, title: 'Parasite', releaseDate: '2019-05-30', runtime: 133,
    genres: ['Comedy', 'Thriller', 'Drama'], directors: ['Bong Joon-ho'],
  },
  {
    id: 4003, title: 'Portrait of a Lady on Fire', releaseDate: '2019-09-18', runtime: 122,
    genres: ['Drama', 'Romance'], directors: ['Céline Sciamma'],
  },
  {
    id: 4004, title: 'Spirited Away', releaseDate: '2001-07-20', runtime: 125,
    genres: ['Animation', 'Family', 'Fantasy'], directors: ['Hayao Miyazaki'],
  },
  {
    id: 4005, title: 'Hereditary', releaseDate: '2018-06-07', runtime: 127,
    genres: ['Horror', 'Mystery', 'Thriller'], directors: ['Ari Aster'],
  },
  // Co-directed, so a byline with two names in it is exercised rather than assumed to work.
  {
    id: 4006, title: 'Everything Everywhere All at Once', releaseDate: '2022-03-24', runtime: 140,
    genres: ['Action', 'Adventure', 'Science Fiction'],
    directors: ['Daniel Kwan', 'Daniel Scheinert'],
  },
  // A two-word title with a number in it, kept from when the colon question was still open.
  // It is answered now — dropping a colon changes nothing on the live API — so this is here as
  // an ordinary long film rather than as evidence. See **Ranking** in docs/movies-tmdb.md.
  {
    id: 4007, title: 'Blade Runner 2049', releaseDate: '2017-10-04', runtime: 164,
    genres: ['Science Fiction', 'Drama'], directors: ['Denis Villeneuve'],
  },
  // No runtime at all. TMDB writes 0 rather than omitting the field, and this is what the check
  // constraint is measured against.
  {
    id: 4008, title: 'A Film Nobody Timed', releaseDate: '1974-01-01', runtime: 0,
    genres: ['Documentary'], directors: [],
  },
];

/**
 * The shows, chosen so that each spec measures something rather than agreeing with a constant.
 *
 * Five of the six are here for a stated reason, and removing any of them turns a spec into one
 * that passes for the wrong cause:
 *
 * - **`episodeRunTime: []` with a `lastEpisodeRuntime`.** The fallback chain is load-bearing,
 *   not defensive: `episode_run_time` is empty on most recent entries, so this is the *normal*
 *   path for anything new and not a corner case. A catalogue where every show filled the array
 *   in would leave the fallback untested and looking optional.
 * - **No runtime anywhere.** What untimed-sorts-last is measured against, and the same argument
 *   as the film nobody timed.
 * - **A season 0.** Specials are real, TMDB lists them alongside the rest, and the column's
 *   constraint is `>= 0` rather than `>= 1` because of them.
 * - **Uneven season lengths — 13, 12, 12, 13, 10.** So a spec that changes the season and counts
 *   the episode options is watching the dropdown re-size rather than watching it be coincidentally
 *   right. Two equal seasons would prove nothing.
 * - **Still running, so `lastAirDate` is absent.** The year span renders `2022–` rather than
 *   `2022–undefined`, and null there is a fact about the show rather than missing data.
 * - **One anime.** It is here to *never* come back: `/search/tv` drops anything Japanese and
 *   animated, because anime is its own hobby from MAL. A catalogue with no anime in it would
 *   let that filter be deleted with every spec still green.
 *
 * Genres are TMDB's *television* vocabulary, which is not its film one: Sci-Fi & Fantasy is one
 * genre here and two on a film, and there is no Horror at all.
 *
 * `originalLanguage` defaults to `en` below and is stated only where it matters, which is the
 * anime — it is half of the exclusion rule and the other half is genre 16.
 */

/**
 * TMDB's real television genre ids, because one of them is load-bearing.
 *
 * These used to be synthesised as `18 + index`, which was fine while nothing read them: the
 * detail response spells its genres out, so the ids on a search result went nowhere. The anime
 * exclusion reads `genre_ids` for 16, so a made-up numbering would let a show be animated
 * without ever saying 16 — and the filter would look as though it worked while never firing.
 */
const TV_GENRE_IDS = {
  'Action & Adventure': 10759,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Mystery: 9648,
  Reality: 10764,
  'Sci-Fi & Fantasy': 10765,
  'War & Politics': 10768,
};

const TV_CATALOGUE = [
  // Still running, and the ordinary case: a filled runtime array and a Specials season.
  {
    id: 5001, name: 'Severance', firstAirDate: '2022-02-18', lastAirDate: null,
    status: 'Returning Series', episodeRunTime: [47], lastEpisodeRuntime: null,
    genres: ['Drama', 'Mystery', 'Sci-Fi & Fantasy'], creators: ['Dan Erickson'],
    seasons: [
      { number: 0, name: 'Specials', episodes: 3 },
      { number: 1, name: 'Season 1', episodes: 9 },
      { number: 2, name: 'Season 2', episodes: 10 },
    ],
  },
  // The empty-array case, which is the normal one for anything recent. Its runtime can only be
  // reached through `last_episode_to_air`.
  {
    id: 5002, name: 'The Bear', firstAirDate: '2022-06-23', lastAirDate: null,
    status: 'Returning Series', episodeRunTime: [], lastEpisodeRuntime: 32,
    genres: ['Drama', 'Comedy'], creators: ['Christopher Storer'],
    seasons: [
      { number: 1, name: 'Season 1', episodes: 8 },
      { number: 2, name: 'Season 2', episodes: 10 },
    ],
  },
  // Uneven seasons, so the episode dropdown is provably sized from the season that was chosen.
  {
    id: 5003, name: 'The Wire', firstAirDate: '2002-06-02', lastAirDate: '2008-03-09',
    status: 'Ended', episodeRunTime: [59], lastEpisodeRuntime: null,
    genres: ['Crime', 'Drama'], creators: ['David Simon'],
    seasons: [
      { number: 1, name: 'Season 1', episodes: 13 },
      { number: 2, name: 'Season 2', episodes: 12 },
      { number: 3, name: 'Season 3', episodes: 12 },
      { number: 4, name: 'Season 4', episodes: 13 },
      { number: 5, name: 'Season 5', episodes: 10 },
    ],
  },
  // Co-created, so a byline with two names in it is exercised rather than assumed.
  {
    id: 5004, name: 'Arcane', firstAirDate: '2021-11-06', lastAirDate: '2024-11-23',
    status: 'Ended', episodeRunTime: [41], lastEpisodeRuntime: null,
    genres: ['Animation', 'Sci-Fi & Fantasy', 'Action & Adventure'],
    creators: ['Christian Linke', 'Alex Yee'],
    seasons: [
      { number: 1, name: 'Season 1', episodes: 9 },
      { number: 2, name: 'Season 2', episodes: 9 },
    ],
  },
  // Began and ended in one year, so the span reads `2019` once rather than `2019-2019`.
  {
    id: 5005, name: 'Chernobyl', firstAirDate: '2019-05-06', lastAirDate: '2019-06-03',
    status: 'Ended', episodeRunTime: [65], lastEpisodeRuntime: null,
    genres: ['Drama', 'War & Politics'], creators: ['Craig Mazin'],
    seasons: [{ number: 1, name: 'Season 1', episodes: 5 }],
  },
  // No runtime anywhere — neither the array nor the last episode. The untimed one.
  {
    id: 5006, name: 'A Show Nobody Timed', firstAirDate: '1994-01-01', lastAirDate: '1994-12-31',
    status: 'Ended', episodeRunTime: [], lastEpisodeRuntime: null,
    genres: ['Documentary'], creators: [],
    seasons: [{ number: 1, name: 'Season 1', episodes: 4 }],
  },
  // Japanese and animated, which is the whole of the exclusion rule — so this must never come
  // back from `/search/tv`. Anime is its own hobby from MAL, one card per cour, and a show
  // findable on two boards with episode progress on each is the confusing case that closes.
  {
    id: 5007, name: 'Frieren', firstAirDate: '2023-09-29', lastAirDate: null,
    originalLanguage: 'ja',
    status: 'Returning Series', episodeRunTime: [24], lastEpisodeRuntime: null,
    genres: ['Animation', 'Sci-Fi & Fantasy'], creators: [],
    seasons: [{ number: 1, name: 'Season 1', episodes: 28 }],
  },
];

/**
 * `/search/tv` answers with less than it knows, exactly as the film one does — and with a
 * *different field name for the title*, which is the one place the two endpoints diverge.
 *
 * A show is `name` and `first_air_date` where a film is `title` and `release_date`. Mirrored
 * rather than harmonised: a stub that helpfully sent `title` would let a client reading the
 * wrong field pass, and the symptom in production is a title-less result the upsert skips with
 * no error anywhere.
 */
const asShowSearchResult = (show) => ({
  id: show.id,
  name: show.name,
  first_air_date: show.firstAirDate,
  poster_path: null,
  genre_ids: show.genres.map((name) => TV_GENRE_IDS[name]),
  // The other half of what keeps anime off this board. Defaulted rather than stated on every
  // entry, because `en` is what all but one of them is.
  original_language: show.originalLanguage ?? 'en',
  vote_count: 1000 - show.id,
  popularity: 50,
});

/** `/tv/{id}`, which needs no `append_to_response` — creators and seasons are on the base body. */
const asShowDetail = (show) => ({
  id: show.id,
  name: show.name,
  first_air_date: show.firstAirDate,
  // Absent rather than null for a show still running, which is what TMDB does.
  ...(show.lastAirDate === null ? {} : { last_air_date: show.lastAirDate }),
  status: show.status,
  number_of_seasons: show.seasons.filter((season) => season.number > 0).length,
  // Specials count towards neither, which is what TMDB does: `number_of_seasons` is 2 for a
  // show with a Specials and two real ones. The generated `total_runtime_minutes` multiplies
  // this figure, so counting season 0 here would inflate every card badge on the board.
  number_of_episodes: show.seasons
    .filter((season) => season.number > 0)
    .reduce((total, season) => total + season.episodes, 0),
  poster_path: null,
  episode_run_time: show.episodeRunTime,
  ...(show.lastEpisodeRuntime === null
    ? {}
    : { last_episode_to_air: { runtime: show.lastEpisodeRuntime } }),
  genres: show.genres.map((name) => ({ id: TV_GENRE_IDS[name], name })),
  created_by: show.creators.map((name, index) => ({ id: index + 1, name })),
  seasons: show.seasons.map((season) => ({
    season_number: season.number,
    name: season.name,
    episode_count: season.episodes,
    air_date: show.firstAirDate,
  })),
});

/**
 * `/search/movie` answers with less than it knows: no runtime, and genres only as ids.
 *
 * Mirrored rather than simplified, because the whole enrichment design follows from it. A stub
 * that helpfully included the runtime here would let a broken detail call pass unnoticed.
 */
const asSearchResult = (film) => ({
  id: film.id,
  title: film.title,
  release_date: film.releaseDate,
  poster_path: null,
  genre_ids: film.genres.map((_, index) => 18 + index),
  vote_count: 1000 - film.id,
  popularity: 50,
});

const asDetail = (film) => ({
  id: film.id,
  title: film.title,
  release_date: film.releaseDate,
  poster_path: null,
  runtime: film.runtime,
  genres: film.genres.map((name, index) => ({ id: 18 + index, name })),
  credits: {
    crew: [
      // A crew list carries hundreds of jobs, and only one of them is read. Two non-directors
      // sit in front so a byline built by taking crew[0] is wrong rather than lucky — and two
      // badly understates it. Measured on the live API: Arrival's crew is 487 entries with the
      // director at index 1, and Everything Everywhere All at Once's is 169 with the first
      // director at index **139**. There is no shortcut to the top of that list.
      { name: 'Someone in the art department', job: 'Production Design' },
      { name: 'Someone else entirely', job: 'Editor' },
      ...film.directors.map((name) => ({ name, job: 'Director' })),
    ],
  },
});

/**
 * TMDB's search is fuzzy, and matching whole words here would be stricter than the real thing.
 *
 * The deliberate difference from the IGDB stub, and it is measured rather than assumed — against
 * the live API on 6 September 2026, with the table in `docs/movies-tmdb.md`. IGDB's search does
 * no prefix matching at all, which is the entire reason `IgdbRelevance` and its second slug query
 * exist; TMDB's prefix-matches mid-word, so `arriv` finds Arrival and `blade runn` finds Blade
 * Runner. A spec that half-types a title here is testing the real behaviour.
 *
 * **One thing this does not mirror: TMDB ranks by popularity and this returns catalogue order.**
 * Nothing depends on it today — no spec asserts the order of more than one result — but a spec
 * that started to would be testing the stub rather than the app.
 */
const flatten = (value) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const matching = (catalogue, term, nameOf) => {
  const wanted = flatten(term);
  if (wanted === '') {
    return [];
  }

  return catalogue.filter((entry) => flatten(nameOf(entry)).includes(wanted));
};

const matches = (term) => matching(CATALOGUE, term, (film) => film.title);
const showMatches = (term) => matching(TV_CATALOGUE, term, (show) => show.name);

const send = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/health') {
    response.writeHead(200).end('ok');
    return;
  }

  // TMDB's own shape for a bad token, down to `status_message` — which is the half of a 401
  // TmdbClient puts in its exception, so a spec that broke the wiring would read something
  // useful rather than "TMDB returned 401".
  if (request.headers.authorization !== `Bearer ${TOKEN}`) {
    send(response, 401, {
      success: false,
      status_code: 7,
      status_message: 'Invalid API key: You must be granted a valid key.',
    });
    return;
  }

  if (url.pathname === '/3/search/tv') {
    const found = showMatches(url.searchParams.get('query') ?? '');

    send(response, 200, {
      page: 1,
      results: found.map(asShowSearchResult),
      total_pages: 1,
      total_results: found.length,
    });
    return;
  }

  // Anchored, as the film route below is. `/3/tv/5003/season/1` is a real TMDB endpoint this app
  // does not call, and an unanchored pattern would answer it with the whole show — which is the
  // shape of mistake a stub is supposed to make loud.
  const show = /^\/3\/tv\/(\d+)$/.exec(url.pathname);
  if (show !== null) {
    const found = TV_CATALOGUE.find((entry) => entry.id === Number(show[1]));

    if (found === undefined) {
      send(response, 404, {
        success: false,
        status_code: 34,
        status_message: 'The resource you requested could not be found.',
      });
      return;
    }

    send(response, 200, asShowDetail(found));
    return;
  }

  if (url.pathname === '/3/search/movie') {
    // TMDB pages at twenty and the client cuts what comes back, so the envelope is what matters
    // here rather than the count.
    send(response, 200, {
      page: 1,
      results: matches(url.searchParams.get('query') ?? '').map(asSearchResult),
      total_pages: 1,
      total_results: matches(url.searchParams.get('query') ?? '').length,
    });
    return;
  }

  const detail = /^\/3\/movie\/(\d+)$/.exec(url.pathname);
  if (detail !== null) {
    const film = CATALOGUE.find((entry) => entry.id === Number(detail[1]));

    // A 404 rather than an error, because that is what TMDB answers and what TmdbClient reads
    // as "no such film" — the one status it turns into a null rather than an exception.
    if (film === undefined) {
      send(response, 404, {
        success: false,
        status_code: 34,
        status_message: 'The resource you requested could not be found.',
      });
      return;
    }

    send(response, 200, asDetail(film));
    return;
  }

  response.writeHead(404).end();
});

server.listen(PORT, () => console.log(`TMDB stub listening on ${PORT}`));
