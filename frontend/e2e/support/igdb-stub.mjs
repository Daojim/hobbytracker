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

/** Ids are fixed, because a second search for the same title must upsert, not insert. */
const CATALOGUE = [
  { id: 3001, name: 'Celeste', platform: 'PC', developer: 'Extremely OK Games' },
  { id: 3002, name: 'Hades', platform: 'PC', developer: 'Supergiant Games' },
  { id: 3003, name: 'Hollow Knight', platform: 'PC', developer: 'Team Cherry' },
  { id: 3004, name: 'Outer Wilds', platform: 'PC', developer: 'Mobius Digital' },
  { id: 3005, name: 'Anthem', platform: 'PC', developer: 'BioWare' },
  { id: 3006, name: 'Stardew Valley', platform: 'PC', developer: 'ConcernedApe' },
];

const asIgdbGame = (game) => ({
  id: game.id,
  name: game.name,
  platforms: [{ id: 6, name: game.platform }],
  involved_companies: [
    { developer: true, publisher: false, company: { id: game.id + 9000, name: game.developer } },
  ],
});

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
    // APIcalypse, not a query string: `search "celeste"; fields ...; limit 20;`
    const term = /search\s+"([^"]*)"/.exec(await readBody(request))?.[1] ?? '';
    const matches = CATALOGUE.filter((game) =>
      game.name.toLowerCase().includes(term.toLowerCase().trim()),
    );

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(matches.map(asIgdbGame)));
    return;
  }

  response.writeHead(404).end();
});

server.listen(PORT, () => console.log(`IGDB stub listening on ${PORT}`));
