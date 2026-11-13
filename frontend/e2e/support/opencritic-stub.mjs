/**
 * A stand-in for OpenCritic's API on RapidAPI, serving the one route the app calls: `/game/{id}`.
 *
 * **RapidAPI's two headers are enforced.** A request without the key the end-to-end API is given,
 * or naming another host, is refused as RapidAPI refuses one. This is the one place the client's
 * own stamping of them is exercised end to end: they are not on the typed client, because whether
 * there is a key decides whether there is a request at all.
 *
 * **A number OpenCritic does not know is a 400 saying "An unknown error has occurred"**, which is
 * what OpenCritic answers — measured on 12 November 2026 — and what a pin refuses in words.
 *
 * **No score is -1 and an empty tier**, in both numbers independently, as OpenCritic sends it.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.OPENCRITIC_STUB_PORT ?? 5393);
const KEY = process.env.OPENCRITIC_STUB_KEY ?? 'e2e-rapidapi-key';
const HOST = 'opencritic-api.p.rapidapi.com';

/** OpenCritic's games by number. The numbers are this stub's, not OpenCritic's. */
const GAMES = [
  // Hollow Knight, scored as Armored Core VI was in the workshop's renders, so its row is as wide
  // as the picked shots' and the layout spec measures what was picked.
  { id: 2390, name: 'Hollow Knight', tier: 'Mighty', topCriticScore: 84.91176470588235, percentRecommended: 90.97222222222221 },
  { id: 6914, name: 'Outer Wilds', tier: 'Mighty', topCriticScore: 85.0, percentRecommended: 89.2 },
  // Pinned by hand in a spec: Wikidata ties Celeste's slug to nothing.
  { id: 5226, name: 'Celeste', tier: 'Mighty', topCriticScore: 91.6, percentRecommended: 97.8 },
  // Not out, and out with too few reviews: OpenCritic's -1 and an empty tier, both ways.
  { id: 20850, name: 'Silksong II', tier: '', topCriticScore: -1, percentRecommended: -1 },
  { id: 20851, name: 'Tunic II', tier: '', topCriticScore: -1, percentRecommended: -1 },
  // NieR: Automata's three, as Wikidata gives them: two editions, and the game, which OpenCritic
  // names "Nier: Automata" where IGDB writes "NieR: Automata".
  { id: 6310, name: 'NieR: Automata Become as Gods Edition', tier: 'Mighty', topCriticScore: 91.5909090909091, percentRecommended: 89.28571428571429 },
  { id: 7334, name: 'NieR: Automata Game of the YoRHa Edition', tier: 'Mighty', topCriticScore: 91.33333333333333, percentRecommended: 100 },
  { id: 3540, name: 'Nier: Automata', tier: 'Mighty', topCriticScore: 89.36206896551724, percentRecommended: 92.76315789473685 },
];

const send = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/health') {
    response.writeHead(200).end('ok');
    return;
  }

  if (request.headers['x-rapidapi-key'] !== KEY) {
    send(response, 401, { message: 'Invalid API key. Go to https://docs.rapidapi.com/docs/keys for more info.' });
    return;
  }

  if (request.headers['x-rapidapi-host'] !== HOST) {
    send(response, 403, { message: 'You are not subscribed to this API.' });
    return;
  }

  const game = /^\/game\/(\d+)$/.exec(url.pathname);
  if (game !== null) {
    const found = GAMES.find((candidate) => candidate.id === Number(game[1]));
    if (found === undefined) {
      send(response, 400, { message: 'An unknown error has occurred' });
      return;
    }

    send(response, 200, {
      ...found,
      url: `https://opencritic.com/game/${found.id}/-`,
      numReviews: 40,
      numTopCriticReviews: 30,
      steamId: null,
    });
    return;
  }

  response.writeHead(404).end();
});

server.listen(PORT, () => console.log(`OpenCritic stub listening on ${PORT}`));
