/**
 * A stand-in for IGDB, and for the Twitch token endpoint in front of it.
 *
 * CLAUDE.md asks that end-to-end tests seed through the API and never reach IGDB. Those two are
 * in tension: `media` rows are only ever written by a search, and a search calls IGDB. `BaseUrl`
 * and `TokenUrl` are both plain options, though, so pointing them here makes the instruction
 * true with no production code involved — the API runs exactly as it does in development, and
 * the seeding path a test uses is the same one a person uses.
 *
 * Covers omitted on purpose. A null `coverUrl` means the browser never requests an image from a
 * host it cannot reach, and it exercises the card's placeholder rather than leaving it unseen.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.STUB_PORT ?? 5399);
/** A day this many whole months from today, as `YYYY-MM-DD`. */
const inMonths = (months) => {
  const day = new Date();
  day.setUTCMonth(day.getUTCMonth() + months);
  return day.toISOString().slice(0, 10);
};

/**
 * A quarter that many months out, as the date-and-precision pair IGDB would send for it.
 *
 * Both halves come from the same computed day, which is the point: written separately, a date
 * that drifted into the next quarter would go on carrying last quarter's label, and the stub
 * would be asserting a shape the real API never produces. It cost one round to notice.
 *
 * The date is the **last** day of the quarter, because that is what IGDB actually states —
 * "Q3 2026" arrives as 30 September, not 1 July. A stub sending the first day would let a
 * mapping that truncates the wrong way pass, which is the bug this shape exists to catch.
 */
const upcomingQuarter = (months) => {
  const day = new Date();
  day.setUTCMonth(day.getUTCMonth() + months);

  const quarter = Math.floor(day.getUTCMonth() / 3) + 1;
  const lastDay = new Date(Date.UTC(day.getUTCFullYear(), quarter * 3, 0));

  return { released: lastDay.toISOString().slice(0, 10), precision: `YYYYQ${quarter}` };
};

/** A day this many days before today, as `YYYY-MM-DD` — inside the Discover page's New releases. */
const daysAgo = (days) => {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() - days);
  return day.toISOString().slice(0, 10);
};

/** IGDB's Erotic theme, which the Discover page's queries exclude. */
const EROTIC = 42;

/**
 * Ids are fixed, because a second search for the same title must upsert, not insert.
 *
 * Genres are the board's colours. Hollow Knight carries three, one of which the palette does
 * not paint, which is what lets a spec show the automatic pick choosing the specific genre over
 * the word that describes half the catalogue.
 *
 * gameType mirrors IGDB game_type: 0 Main Game, 3 Bundle, 5 Mod, and ratings mirrors
 * total_rating_count. Ids 3007 to 3010 are the ones that are not the real thing, and they
 * exist so a spec can watch them lose. None of it is invented: searching "Hollow Knight"
 * on the live API really does return a mod of it, and searching "Hollow Knight Silksong"
 * really does put a one-person Game Boy Color game above Team Cherry's, because the fan
 * game's title is the exact string and the real one has a colon in it.
 *
 * `released` and `precision` are the release window. Every title that has come out carries a
 * past date, and that is load-bearing rather than decoration: the Backlog column answers
 * without the titles that are not out yet, so a catalogue with no dates would put the whole
 * stub in the calendar and empty the board every other spec asserts on.
 */
const CATALOGUE = [
  { id: 3001, released: '2018-01-25', precision: 'YYYYMMDD', gameType: 0, name: 'Celeste', platforms: ['PC', 'Switch'], developer: 'Extremely OK Games',
    genres: ['Platform', 'Indie'] },
  { id: 3002, released: '2020-09-17', precision: 'YYYYMMDD', gameType: 0, name: 'Hades', platforms: ['PC', 'Switch'], developer: 'Supergiant Games',
    genres: ["Hack and slash/Beat 'em up", 'Indie'] },
  { id: 3003, released: '2017-02-24', precision: 'YYYYMMDD', gameType: 0, name: 'Hollow Knight', platforms: ['PC', 'Switch'], developer: 'Team Cherry',
    genres: ['Adventure', 'Platform', 'Indie'] },
  { id: 3004, released: '2019-05-28', precision: 'YYYYMMDD', gameType: 0, name: 'Outer Wilds', platforms: ['PC', 'Xbox'], developer: 'Mobius Digital',
    genres: ['Adventure', 'Puzzle'] },
  // No precision, on purpose: IGDB prunes release_dates rows from older entries while keeping
  // first_release_date, and that shape has to read as a day rather than as TBD.
  { id: 3005, released: '2019-02-22', gameType: 0, name: 'Anthem', platforms: ['PC'], developer: 'BioWare',
    genres: ['Shooter', 'Role-playing (RPG)'] },
  { id: 3006, released: '2016-02-26', precision: 'YYYYMMDD', gameType: 0, name: 'Stardew Valley', platforms: ['PC', 'Switch'], developer: 'ConcernedApe',
    genres: ['Simulator', 'Role-playing (RPG)'] },
  { id: 3007, released: '2021-11-01', precision: 'YYYYMMDD', gameType: 5, name: 'Hollow Knight: Pale Court', platforms: ['PC'],
    developer: 'Team Cherry', genres: ['Platform'] },
  { id: 3008, released: '2019-06-12', precision: 'YYYYMMDD', gameType: 3, name: 'Hollow Knight Collection', platforms: ['PC', 'Switch'],
    developer: 'Team Cherry', genres: ['Platform'] },
  // Listed above the real one on purpose, so the catalogue order is the wrong order and
  // something has to actively fix it.
  { id: 3009, released: '2019-08-01', precision: 'YYYYMMDD', gameType: 0, name: 'Hollow Knight Silksong', platforms: ['Game Boy Color'],
    developer: 'Elvies', genres: ['Platform'] },
  { id: 3010, released: '2025-09-04', precision: 'YYYYMMDD', gameType: 0, ratings: 502, name: 'Hollow Knight: Silksong',
    platforms: ['PC', 'Switch'], developer: 'Team Cherry', genres: ['Platform'] },

  // The five that have not come out, for the release calendar. The dated ones are dated relative
  // to the run rather than pinned, because a fixed date stops being in the future and the spec
  // would then fail on a day nobody changed anything — the year control's specs learned this
  // already.
  //
  // One of each shape the calendar has to tell apart: a day, a window vaguer than a day, a title
  // IGDB says TBD about, a title IGDB says nothing at all about, and a rumour.
  //
  // `hypes` is what puts four of them on the Discover page's Most anticipated, which asks only
  // about titles somebody is waiting for. Celeste 64 has none on purpose: it is what shows that
  // clause being honoured, and a search for "celeste" is typed in three specs, where any hype
  // would move it above Celeste — IgdbRelevance ranks on ratings plus hype.
  { id: 3011, released: inMonths(3), precision: 'YYYYMMDD', gameType: 0, hypes: 120, name: 'Silksong II',
    platforms: ['PC'], developer: 'Team Cherry', genres: ['Platform'] },
  { id: 3012, ...upcomingQuarter(18), gameType: 0, hypes: 80, name: 'Hades III',
    platforms: ['PC'], developer: 'Supergiant Games', genres: ['Indie'] },
  { id: 3013, precision: 'TBD', gameType: 0, name: 'Celeste 64', platforms: ['PC'],
    developer: 'Extremely OK Games', genres: ['Platform'] },

  // Neither key, which is the shape the live API really answers with for an announced title
  // nobody has dated — no first_release_date and no release_dates array at all. It is the one
  // shape a stub is most likely to get wrong by tidying it into a TBD row, and it read as
  // *released* until 12 September 2026. Copied from IGDB id 347557.
  { id: 3014, gameType: 0, hypes: 90, name: 'Stellar Blade: Blood Rain', platforms: ['PC'],
    developer: 'Shift Up', genres: ["Hack and slash/Beat 'em up", 'Adventure'] },

  // The same shape and the opposite answer, which is why the two sit together: undated, and off
  // the calendar because IGDB says nobody announced it. Copied from IGDB id 28029.
  //
  // With hype, because the live one has it — 94, and 32nd on the list of what is not out — so it
  // is IGDB's idea of "not out" and not the calendar's, and only the API's rule keeps it off
  // Most anticipated.
  { id: 3015, status: 'Rumored', gameType: 0, hypes: 94, name: 'Half-Life 3', platforms: ['PC'],
    developer: 'Valve', genres: ['Shooter'] },

  // The Discover page's New releases: out inside the last sixty days.
  { id: 3016, released: daysAgo(10), precision: 'YYYYMMDD', gameType: 0, hypes: 60, name: 'Tunic II',
    platforms: ['PC', 'Switch'], developer: 'Isometricorp Games', genres: ['Adventure'] },

  // Tagged Erotic, and given more hype than anything else here and first place in PopScore's
  // Playing list, so that the day the filter goes missing it is the first tile on two lists
  // rather than something a spec could miss. Eleven of the live Visits list's top 60 were like it.
  { id: 3017, released: daysAgo(5), precision: 'YYYYMMDD', gameType: 0, hypes: 999, themes: [EROTIC],
    name: 'Velvet Lounge', platforms: ['PC'], developer: 'Nobody In Particular', genres: ['Simulator'] },

  // Announced, hyped and dead: IGDB's "not out", and the calendar's too, because the calendar
  // keeps a cancelled title somebody already tracks. Only Most anticipated's own rule keeps it off
  // that list, where nobody is waiting for it. The live list carried one or two a page from page
  // two on; this one ranks second, so the rule has to hold on the very first page.
  { id: 3018, status: 'Cancelled', gameType: 0, hypes: 100, name: 'Scalebound', platforms: ['Xbox'],
    developer: 'PlatinumGames', genres: ['Role-playing (RPG)'] },
];

/**
 * PopScore's Playing list — `/v4/popularity_primitives`, `popularity_type = 3` — as game ids,
 * highest first. A ranking row carries nothing but an id, which is why the client asks `/games`
 * about them next, and why the Erotic decoy at the top has to be removed by that second question.
 */
const PLAYING = [3017, 3002, 3006, 3001, 3003];

/** Midnight UTC of a `YYYY-MM-DD` day, in unix seconds, which is how IGDB sends a date. */
const unixDay = (day) => Date.parse(`${day}T00:00:00Z`) / 1000;

const asIgdbGame = (game) => ({
  id: game.id,
  name: game.name,
  // The release window. Modelled the way the live API answers rather than the way it would be
  // convenient to: a title with no date carries no `first_release_date` key at all, and a TBD
  // release_dates row carries no `date` key — neither sends a null or a zero. A stub that
  // mirrored only the happy shape could not catch a mapping that reads those as a day.
  ...(game.released === undefined ? {} : { first_release_date: unixDay(game.released) }),
  ...(game.precision === undefined
    ? {}
    : {
        release_dates: [
          {
            ...(game.released === undefined ? {} : { date: unixDay(game.released) }),
            date_format: { id: 0, format: game.precision },
          },
        ],
      }),
  ...(game.status === undefined ? {} : { game_status: { id: 0, status: game.status } }),
  // What IgdbRelevance ranks on. Absent rather than zero for most of the catalogue, because
  // IGDB omits a field it has no value for rather than sending a null.
  ...(game.ratings === undefined ? {} : { total_rating_count: game.ratings }),
  ...(game.hypes === undefined ? {} : { hypes: game.hypes }),
  // A list, because IGDB returns one — a single-platform stub cannot show that the drawer's
  // choices come from the game rather than from somewhere else.
  platforms: game.platforms.map((name, index) => ({ id: 6 + index, name })),
  genres: game.genres.map((name, index) => ({ id: 30 + index, name })),
  involved_companies: [
    { developer: true, publisher: false, company: { id: game.id + 9000, name: game.developer } },
  ],
});


/**
 * APIcalypse, not a query string: `search "celeste"; fields ...; limit 20;`
 *
 * Punctuation is flattened on both sides, because the real endpoint is fuzzy and a raw
 * substring test is not: searching "Hollow Knight Silksong" has to reach "Hollow Knight:
 * Silksong", the colon between them being the entire reason IgdbRelevance exists.
 *
 * But every token has to match a **whole word**, because that is the real limitation and the
 * whole reason the client asks a second question. IGDB's search does no prefix matching:
 * "hollow k" answers with nothing, and "pokemon s" answers with Pokemon Topaz rather than
 * Pokémon Sword. A stub that quietly matched prefixes here would make the slug query look
 * unnecessary and its spec pass for the wrong reason.
 */
const flatten = (value) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const matchesTerm = (term) => {
  const wanted = flatten(term).split(' ').filter(Boolean);
  if (wanted.length === 0) {
    return [];
  }

  return CATALOGUE.filter((game) => {
    const words = flatten(game.name).split(' ');
    return wanted.every((token) => words.includes(token));
  });
};

/**
 * `where slug ~ *"hollow-k"*;` — the prefix question, and the only one that can answer half
 * a title. Slugs are what make it work on "pokemon s": IGDB writes "Pokémon Sword" as
 * pokemon-sword, so the accent that defeats a name match is already gone.
 */
const slugOf = (name) => flatten(name).replace(/ /g, '-');

const matchesSlug = (pattern) =>
  CATALOGUE.filter((game) => slugOf(game.name).includes(pattern))
    // sort total_rating_count desc, as the client asks for. Without it, which entries come
    // back for a broad pattern would be arbitrary.
    .sort((a, b) => (b.ratings ?? 0) - (a.ratings ?? 0));

/**
 * `where game_type != (3,5);` — honoured rather than ignored, so a spec that watches a mod
 * not arrive is watching the clause the API actually sent rather than a catalogue that never
 * had one. Drop the clause from IgdbClient and the mod comes back and the spec goes red.
 *
 * Applied before the limit, as IGDB applies it: filtering afterwards would ask for ten and
 * hand back six.
 * The `where` keyword is deliberately not part of the pattern: the relevance query writes
 * `where game_type != (...)` and the slug query writes `& game_type != (...)`, and anchoring
 * on `where` silently let mods through the second one.
 */
const withoutExcludedTypes = (games, query) => {
  const excluded = /game_type\s*!=\s*\(([^)]*)\)/.exec(query)?.[1];
  if (excluded === undefined) {
    return games;
  }

  const ids = excluded.split(',').map((id) => id.trim());
  return games.filter((game) => !ids.includes(String(game.gameType)));
};

/**
 * `themes != (42)` — the Discover page's filter, honoured for the reason the game-type one is:
 * drop it from IgdbClient and the decoy comes back and the spec goes red, rather than a stub
 * that never had the clause letting it pass. A search never carries it, so this changes nothing
 * a search sees.
 */
const withoutExcludedThemes = (games, query) => {
  const excluded = /themes\s*!=\s*\(([^)]*)\)/.exec(query)?.[1];
  if (excluded === undefined) {
    return games;
  }

  const ids = excluded.split(',').map((id) => Number(id.trim()));
  return games.filter((game) => !(game.themes ?? []).some((theme) => ids.includes(theme)));
};

/**
 * The Discover page's three `/games` questions, which carry no `search`, no slug and no ids:
 *
 *   - New releases: `first_release_date >= A & first_release_date <= B`, by hype;
 *   - Most anticipated: `hypes != null & (first_release_date > A | first_release_date = null)`;
 *   - Most played: `total_rating_count != null`, by ratings.
 *
 * Each clause is parsed and honoured rather than pattern-matched on the question as a whole, so
 * a clause the client stops sending shows up as the wrong titles on the wall.
 */
const matchesDiscovery = (query) => {
  const since = /first_release_date\s*>=\s*(\d+)/.exec(query)?.[1];
  const until = /first_release_date\s*<=\s*(\d+)/.exec(query)?.[1];
  const after = /first_release_date\s*>\s*(\d+)\s*\|\s*first_release_date\s*=\s*null/.exec(query)?.[1];
  const sortBy = /sort\s+(\w+)\s+desc/.exec(query)?.[1];

  const releasedAt = (game) => (game.released === undefined ? undefined : unixDay(game.released));
  const scoreOf = (game) =>
    sortBy === 'hypes' ? (game.hypes ?? 0) : sortBy === 'total_rating_count' ? (game.ratings ?? 0) : 0;

  return CATALOGUE.filter((game) => since === undefined || (releasedAt(game) ?? -1) >= Number(since))
    .filter((game) => until === undefined || (releasedAt(game) ?? Infinity) <= Number(until))
    .filter((game) => after === undefined || releasedAt(game) === undefined || releasedAt(game) > Number(after))
    .filter((game) => !/hypes\s*!=\s*null/.test(query) || game.hypes !== undefined)
    .filter((game) => !/total_rating_count\s*!=\s*null/.test(query) || game.ratings !== undefined)
    .sort((a, b) => scoreOf(b) - scoreOf(a));
};

/** `limit N;`, honoured on the Discover page's questions and on PopScore's. */
const limitOf = (query) => Number(/limit\s+(\d+)/.exec(query)?.[1] ?? 500);

/**
 * `offset N;`, honoured where `limit` is. It is what Load more sends: the place in a list the page
 * before said to start at. Applied after the filters, as IGDB applies it — `where`, then `sort`,
 * then `offset` and `limit` — so a place counts only what passed.
 */
const offsetOf = (query) => Number(/offset\s+(\d+)/.exec(query)?.[1] ?? 0);

const readBody = (request) =>
  new Promise((resolve) => {
    let body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => resolve(body));
  });

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/health') {
    response.writeHead(200).end('ok');
    return;
  }

  if (url.pathname === '/oauth2/token') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({ access_token: 'e2e-token', expires_in: 5_184_000, token_type: 'bearer' }),
    );
    return;
  }

  if (url.pathname === '/v4/games') {
    const query = await readBody(request);

    // Three query shapes, because the API writes three: a relevance search and a slug prefix
    // match, which together are what adding a game does, and `where id = (...)`, which is the
    // refresh. Answering that last one with a name match would hand back the whole catalogue
    // for an empty term.
    const ids = /where\s+id\s*=\s*\(([^)]*)\)/.exec(query)?.[1];
    const slug = /slug\s*~\s*\*"([^"]*)"\*/.exec(query)?.[1];
    const term = /search\s+"([^"]*)"/.exec(query)?.[1];

    let matches;
    // Unlimited for the three shapes search and refresh send, which is how the stub has always
    // answered them; the Discover page's questions are the ones whose limit and offset are the point.
    let offset = 0;
    let limit = Infinity;
    if (ids !== undefined) {
      matches = CATALOGUE.filter((game) => ids.split(',').includes(String(game.id)));
    } else if (slug !== undefined) {
      matches = matchesSlug(slug);
    } else if (term !== undefined) {
      matches = matchesTerm(term);
    } else {
      matches = matchesDiscovery(query);
      offset = offsetOf(query);
      limit = limitOf(query);
    }

    // Both filters before the offset and limit, as IGDB applies `where` before either.
    const answer = withoutExcludedThemes(withoutExcludedTypes(matches, query), query).slice(
      offset,
      offset + limit,
    );

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(answer.map(asIgdbGame)));
    return;
  }

  if (url.pathname === '/v4/popularity_primitives') {
    const query = await readBody(request);

    // Only the Playing list has anything in it, because it is the only one the API asks about. A
    // page of it is a stretch of the ranking, which is where Load more's offset goes.
    const type = /popularity_type\s*=\s*(\d+)/.exec(query)?.[1];
    const offset = offsetOf(query);
    const ranking = type === '3' ? PLAYING.slice(offset, offset + limitOf(query)) : [];

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(ranking.map((id) => ({ id: 90000 + id, game_id: id }))));
    return;
  }

  response.writeHead(404).end();
});

server.listen(PORT, () => console.log(`IGDB stub listening on ${PORT}`));
