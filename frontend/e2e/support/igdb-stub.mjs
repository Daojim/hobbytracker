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
 */
const CATALOGUE = [
  { id: 3001, name: 'Celeste', platforms: ['PC', 'Switch'], developer: 'Extremely OK Games',
    genres: ['Platform', 'Indie'] },
  { id: 3002, name: 'Hades', platforms: ['PC', 'Switch'], developer: 'Supergiant Games',
    genres: ["Hack and slash/Beat 'em up", 'Indie'] },
  { id: 3003, name: 'Hollow Knight', platforms: ['PC', 'Switch'], developer: 'Team Cherry',
    genres: ['Adventure', 'Platform', 'Indie'] },
  { id: 3004, name: 'Outer Wilds', platforms: ['PC', 'Xbox'], developer: 'Mobius Digital',
    genres: ['Adventure', 'Puzzle'] },
  { id: 3005, name: 'Anthem', platforms: ['PC'], developer: 'BioWare',
    genres: ['Shooter', 'Role-playing (RPG)'] },
  { id: 3006, name: 'Stardew Valley', platforms: ['PC', 'Switch'], developer: 'ConcernedApe',
    genres: ['Simulator', 'Role-playing (RPG)'] },
];

const asIgdbGame = (game) => ({
  id: game.id,
  name: game.name,
  // A list, because IGDB returns one — a single-platform stub cannot show that the drawer's
  // choices come from the game rather than from somewhere else.
  platforms: game.platforms.map((name, index) => ({ id: 6 + index, name })),
  genres: game.genres.map((name, index) => ({ id: 30 + index, name })),
  involved_companies: [
    { developer: true, publisher: false, company: { id: game.id + 9000, name: game.developer } },
  ],
});


/** APIcalypse, not a query string: `search "celeste"; fields ...; limit 20;` */
const matchesTerm = (term) =>
  CATALOGUE.filter((game) => game.name.toLowerCase().includes(term.toLowerCase().trim()));

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

    // Two query shapes, because the API writes two. A search is what adding a game does;
    // `where id = (...)` is what the refresh does, and answering it with a name match would
    // hand back the whole catalogue for an empty term.
    const ids = /where\s+id\s*=\s*\(([^)]*)\)/.exec(query)?.[1];

    const matches =
      ids === undefined
        ? matchesTerm(/search\s+"([^"]*)"/.exec(query)?.[1] ?? '')
        : CATALOGUE.filter((game) => ids.split(',').includes(String(game.id)));

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(matches.map(asIgdbGame)));
    return;
  }

  response.writeHead(404).end();
});

server.listen(PORT, () => console.log(`IGDB stub listening on ${PORT}`));
