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
/**
 * Ids are fixed, because a second search for the same title must upsert, not insert.
 *
 * Genres are the board's colours. Hollow Knight carries three, one of which the palette does
 * not paint, which is what lets a spec show the automatic pick choosing the specific genre over
 * the word that describes half the catalogue.
 *
 * gameType mirrors IGDB game_type: 0 Main Game, 3 Bundle, 5 Mod, and ratings mirrors
 * total_rating_count. The last four entries are the ones that are not the real thing, and
 * they exist so a spec can watch them lose. None of it is invented: searching "Hollow Knight"
 * on the live API really does return a mod of it, and searching "Hollow Knight Silksong"
 * really does put a one-person Game Boy Color game above Team Cherry's, because the fan
 * game's title is the exact string and the real one has a colon in it.
 */
const CATALOGUE = [
  { id: 3001, gameType: 0, name: 'Celeste', platforms: ['PC', 'Switch'], developer: 'Extremely OK Games',
    genres: ['Platform', 'Indie'] },
  { id: 3002, gameType: 0, name: 'Hades', platforms: ['PC', 'Switch'], developer: 'Supergiant Games',
    genres: ["Hack and slash/Beat 'em up", 'Indie'] },
  { id: 3003, gameType: 0, name: 'Hollow Knight', platforms: ['PC', 'Switch'], developer: 'Team Cherry',
    genres: ['Adventure', 'Platform', 'Indie'] },
  { id: 3004, gameType: 0, name: 'Outer Wilds', platforms: ['PC', 'Xbox'], developer: 'Mobius Digital',
    genres: ['Adventure', 'Puzzle'] },
  { id: 3005, gameType: 0, name: 'Anthem', platforms: ['PC'], developer: 'BioWare',
    genres: ['Shooter', 'Role-playing (RPG)'] },
  { id: 3006, gameType: 0, name: 'Stardew Valley', platforms: ['PC', 'Switch'], developer: 'ConcernedApe',
    genres: ['Simulator', 'Role-playing (RPG)'] },
  { id: 3007, gameType: 5, name: 'Hollow Knight: Pale Court', platforms: ['PC'],
    developer: 'Team Cherry', genres: ['Platform'] },
  { id: 3008, gameType: 3, name: 'Hollow Knight Collection', platforms: ['PC', 'Switch'],
    developer: 'Team Cherry', genres: ['Platform'] },
  // Listed above the real one on purpose, so the catalogue order is the wrong order and
  // something has to actively fix it.
  { id: 3009, gameType: 0, name: 'Hollow Knight Silksong', platforms: ['Game Boy Color'],
    developer: 'Elvies', genres: ['Platform'] },
  { id: 3010, gameType: 0, ratings: 502, name: 'Hollow Knight: Silksong',
    platforms: ['PC', 'Switch'], developer: 'Team Cherry', genres: ['Platform'] },
];

const asIgdbGame = (game) => ({
  id: game.id,
  name: game.name,
  // What IgdbRelevance ranks on. Absent rather than zero for most of the catalogue, because
  // IGDB omits a field it has no value for rather than sending a null.
  ...(game.ratings === undefined ? {} : { total_rating_count: game.ratings }),
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

    let matches;
    if (ids !== undefined) {
      matches = CATALOGUE.filter((game) => ids.split(',').includes(String(game.id)));
    } else if (slug !== undefined) {
      matches = matchesSlug(slug);
    } else {
      matches = matchesTerm(/search\s+"([^"]*)"/.exec(query)?.[1] ?? '');
    }

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(withoutExcludedTypes(matches, query).map(asIgdbGame)));
    return;
  }

  response.writeHead(404).end();
});

server.listen(PORT, () => console.log(`IGDB stub listening on ${PORT}`));
