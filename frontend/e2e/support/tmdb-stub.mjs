/**
 * A stand-in for TMDB, serving both of the endpoints the app uses.
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
    id: 4006, title: 'Everything Everywhere All at Once', releaseDate: '2022-03-24', runtime: 139,
    genres: ['Action', 'Comedy', 'Science Fiction'],
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
      // A crew list carries dozens of jobs, and only one of them is read. Two non-directors sit
      // in front so a byline built by taking crew[0] would be wrong rather than lucky.
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

const matches = (term) => {
  const wanted = flatten(term);
  if (wanted === '') {
    return [];
  }

  return CATALOGUE.filter((film) => flatten(film.title).includes(wanted));
};

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
