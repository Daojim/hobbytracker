/**
 * A stand-in for MyAnimeList, serving both of the endpoints the app uses.
 *
 * The same argument the TMDB stub makes: `media` rows are only ever written by a search, so
 * seeding through the API means calling one — and `Mal:BaseUrl` is a plain option, so pointing
 * it here makes "never reach MAL" true with no production code involved.
 *
 * **The client id is enforced.** This is the only place the header wiring is exercised end to
 * end: a request without `X-MAL-CLIENT-ID` gets MAL's own 401 shape, so removing the header
 * from the typed client's configuring lambda fails a spec rather than passing one. It matters
 * more here than the TMDB bearer does, because MAL does not document that a client id alone
 * works at all — the day they withdraw it, this is the wiring that has to be re-proved.
 *
 * **Both endpoints, and they answer the same node**, which is the thing to mirror rather than
 * to tidy. MAL's search and detail take the same `fields` and return the same shape, so a stub
 * that made a search thinner would be inventing a distinction the provider does not have — and
 * would let a client reading the wrong one pass. `docs/games-igdb.md` records what a
 * half-mirrored stub costs; this is the same rule applied to a provider that is *simpler* than
 * the app might assume rather than more complicated.
 *
 * **`fields` is honoured rather than ignored.** A node carries `id`, `title` and `main_picture`
 * whatever is asked for, and everything else only if it was named — so a field dropped from
 * `MalClient.Fields` comes back missing here, exactly as it would upstream, instead of the stub
 * generously answering with data nobody asked for and hiding the fault.
 *
 * Pictures are omitted on purpose, as the other stubs omit covers: a null cover means the
 * browser never asks cdn.myanimelist.net for anything, and the card's placeholder gets
 * exercised rather than left unseen.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.MAL_STUB_PORT ?? 5395);
const CLIENT_ID = process.env.MAL_STUB_CLIENT_ID ?? 'e2e-mal-client';

/**
 * Ids are fixed, because a second search for the same title must upsert rather than insert.
 *
 * Six entries, and each is here for a stated reason. Removing any of them turns a spec into one
 * that passes for the wrong cause:
 *
 * - **Two cours of one show.** Frieren and its 2nd Season are two MAL ids and therefore two
 *   cards, which is the decision this whole hobby is built on. It is also the measured
 *   relevance case: MAL's own order puts the second above the first, and `num_list_users` is
 *   what the server re-ranks on.
 * - **A third cour that has not aired.** `num_episodes: 0` and
 *   `average_episode_duration: 0` are what MAL answers there, and nought means *unknown*
 *   rather than none — a catalogue where every entry had counts would leave that mapping
 *   untested and looking optional.
 * - **One with no English title.** `alternative_titles.en` is absent on a great many entries,
 *   and the card has to render one line rather than a blank second one.
 * - **A film.** Everything MAL calls anime is on this board, which is what the catalogue hands
 *   you anyway — so `media_type` is a fact to print rather than a filter to apply.
 * - **One nobody has timed.** No duration at all, which is what untimed-sorts-last is measured
 *   against — the same argument as the film and the show nobody timed.
 *
 * The genres are MAL's flattened list: genres, themes and demographics together. Frieren's
 * `Shounen` is a demographic and is deliberately unpainted, so the automatic pick has to reach
 * past it to Fantasy.
 */
const CATALOGUE = [
  {
    id: 52991,
    title: 'Sousou no Frieren',
    en: "Frieren: Beyond Journey's End",
    mediaType: 'tv',
    episodes: 28,
    seconds: 1470,
    season: 'fall',
    year: 2023,
    status: 'finished_airing',
    source: 'manga',
    mean: 9.25,
    users: 1511281,
    genres: ['Adventure', 'Award Winning', 'Drama', 'Fantasy', 'Shounen'],
    studios: ['Madhouse'],
    synonyms: ['Frieren at the Funeral'],
  },
  {
    id: 59978,
    title: 'Sousou no Frieren 2nd Season',
    en: "Frieren: Beyond Journey's End Season 2",
    mediaType: 'tv',
    episodes: 10,
    seconds: 1440,
    season: 'winter',
    year: 2026,
    status: 'not_yet_aired',
    source: 'manga',
    mean: 8.84,
    users: 607257,
    genres: ['Adventure', 'Drama', 'Fantasy', 'Shounen'],
    studios: ['Madhouse'],
    synonyms: [],
  },
  {
    id: 60815,
    title: 'Sousou no Frieren: Ougonkyou-hen',
    en: "Frieren: Beyond Journey's End - Golden Land Arc",
    mediaType: 'tv',
    // Nought at both, which is what MAL answers for an entry that has not aired — and means
    // unknown rather than none. The server maps both to null; stored as nought,
    // ck_anime_counts_positive turns an ordinary search into a 500.
    episodes: 0,
    seconds: 0,
    season: 'fall',
    year: 2027,
    status: 'not_yet_aired',
    source: 'manga',
    mean: null,
    users: 108416,
    genres: ['Adventure', 'Drama', 'Fantasy', 'Shounen'],
    studios: ['Madhouse'],
    synonyms: [],
  },
  {
    id: 1,
    title: 'Cowboy Bebop',
    en: 'Cowboy Bebop',
    mediaType: 'tv',
    episodes: 26,
    seconds: 1440,
    season: 'spring',
    year: 1998,
    status: 'finished_airing',
    source: 'original',
    mean: 8.75,
    users: 2084300,
    genres: ['Action', 'Award Winning', 'Sci-Fi', 'Adult Cast', 'Space'],
    studios: ['Sunrise'],
    synonyms: [],
  },
  {
    id: 5,
    title: 'Cowboy Bebop: Tengoku no Tobira',
    en: 'Cowboy Bebop: The Movie',
    mediaType: 'movie',
    episodes: 1,
    seconds: 6911,
    season: 'summer',
    year: 2001,
    status: 'finished_airing',
    source: 'original',
    mean: 8.38,
    users: 416437,
    genres: ['Action', 'Sci-Fi', 'Space'],
    studios: ['Bones'],
    synonyms: [],
  },
  {
    // No English title, and nothing has ever timed it. Two absences in one entry on purpose:
    // both are ordinary rather than exceptional, and a fixture that split them would need two.
    id: 22135,
    title: 'Ping Pong the Animation',
    en: null,
    mediaType: 'tv',
    episodes: 11,
    seconds: null,
    season: 'spring',
    year: 2014,
    status: 'finished_airing',
    source: 'manga',
    mean: 8.63,
    users: 447032,
    genres: ['Award Winning', 'Drama', 'Sports', 'Seinen'],
    studios: ['Tatsunoko Production'],
    synonyms: [],
  },
];

/**
 * MAL matches on the romaji title, the English one and the synonyms alike, and it prefix-matches
 * — measured against the live API on 7 September 2026, with the table in `docs/anime-mal.md`.
 * `frier` finds Frieren, `cowboy bebo` finds Bebop, and `fma` finds Fullmetal Alchemist through
 * a synonym it shares with neither of its titles.
 *
 * **This deliberately returns catalogue order rather than MAL's.** MAL's own order is wrong for
 * a person — that is why `MalRelevance` exists — so a stub that mirrored it would be testing the
 * stub, and one that mirrored the *fixed* order would let the re-rank be deleted with every
 * spec still green. Catalogue order puts Frieren season one first, which the re-rank agrees with
 * for its own reason, so `anime.spec.ts` asserts the pair where the two orders disagree.
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

  return CATALOGUE.filter((entry) =>
    [entry.title, entry.en ?? '', ...entry.synonyms].some((name) =>
      flatten(name).includes(wanted),
    ),
  );
};

/**
 * One node, carrying only what `fields` asked for.
 *
 * `id`, `title` and `main_picture` come whatever is asked, which is MAL's own rule and worth
 * mirroring: it is why `MalClient` states them in its list anyway, so a reader does not have to
 * know the exception. Everything else is opt-in, so a field dropped from that list arrives
 * missing here exactly as it would upstream.
 */
const asNode = (entry, fields) => {
  const wanted = new Set(fields);
  const node = { id: entry.id, title: entry.title, main_picture: null };

  const optional = {
    alternative_titles: () => ({
      ...(entry.en === null ? {} : { en: entry.en }),
      ja: entry.title,
      synonyms: entry.synonyms,
    }),
    media_type: () => entry.mediaType,
    num_episodes: () => entry.episodes,
    average_episode_duration: () => entry.seconds,
    start_season: () => ({ year: entry.year, season: entry.season }),
    status: () => entry.status,
    source: () => entry.source,
    mean: () => entry.mean,
    num_list_users: () => entry.users,
    genres: () => entry.genres.map((name, index) => ({ id: index + 1, name })),
    studios: () => entry.studios.map((name, index) => ({ id: index + 1, name })),
  };

  for (const [field, value] of Object.entries(optional)) {
    if (wanted.has(field)) {
      const answer = value();
      // Absent rather than null for the ones MAL simply omits, which is what it does: a missing
      // `average_episode_duration` and one sent as null are the same to the client, and
      // mirroring the omission is what keeps that true rather than assumed.
      if (answer !== null) {
        node[field] = answer;
      }
    }
  }

  return node;
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

  // MAL's own shape for a bad credential. The client puts the body into its exception, so a
  // spec that broke the header wiring reads something useful rather than "MAL returned 401".
  if (request.headers['x-mal-client-id'] !== CLIENT_ID) {
    send(response, 401, { error: 'invalid_token', message: 'Invalid client id' });
    return;
  }

  const fields = (url.searchParams.get('fields') ?? '').split(',').map((field) => field.trim());

  if (url.pathname === '/v2/anime') {
    const found = matches(url.searchParams.get('q') ?? '');
    const limit = Number(url.searchParams.get('limit') ?? 20);

    // The envelope, and the thing a TMDB-shaped reader gets wrong: every result sits inside a
    // `node`. A client reading `data[]` directly would get objects whose only property is
    // `node` — every id nought, every title null — and the upsert would skip all of them
    // without erroring.
    send(response, 200, {
      data: found.slice(0, limit).map((entry) => ({ node: asNode(entry, fields) })),
      paging: {},
    });
    return;
  }

  // Anchored, as the TMDB routes are. `/v2/anime/52991/ranking` is a real MAL endpoint this app
  // does not call, and an unanchored pattern would answer it with the whole title — which is
  // the shape of mistake a stub is supposed to make loud.
  const detail = /^\/v2\/anime\/(\d+)$/.exec(url.pathname);
  if (detail !== null) {
    const found = CATALOGUE.find((entry) => entry.id === Number(detail[1]));

    // A 404 rather than an error, because that is what MAL answers and what MalClient reads as
    // "no such title" — the one status it turns into a null rather than an exception, so a
    // withdrawn entry does not look like an outage.
    if (found === undefined) {
      send(response, 404, { error: 'not_found', message: 'not found' });
      return;
    }

    send(response, 200, asNode(found, fields));
    return;
  }

  response.writeHead(404).end();
});

server.listen(PORT, () => console.log(`MAL stub on http://localhost:${PORT}`));
