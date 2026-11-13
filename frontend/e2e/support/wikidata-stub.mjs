/**
 * A stand-in for Wikidata's query service, answering the one question the app asks: which
 * OpenCritic ids (P2864) sit on the item carrying an IGDB slug (P5794).
 *
 * **The slug is parsed out of the SPARQL**, from the `wdt:P5794 "…"` clause, rather than the
 * question recognised whole, and a question asking about anything other than P2864 answers nothing.
 *
 * **A request that does not name its program is refused**, as Wikimedia refuses one: the client's
 * own User-Agent is what keeps it from being throttled, and this is the one place that wiring is
 * exercised end to end.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.WIKIDATA_STUB_PORT ?? 5392);

/** OpenCritic's ids per IGDB slug. A slug absent from here is tied to none, as Celeste's is. */
const BY_SLUG = {
  'hollow-knight': ['2390'],
  'outer-wilds': ['6914'],
  'silksong-ii': ['20850'],
  'tunic-ii': ['20851'],
  // The game and two editions, as the real item carries them.
  'nier-automata': ['6310', '7334', '3540'],
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

  if (url.pathname === '/sparql' && request.method === 'POST') {
    if (!/HobbyTracker/.test(request.headers['user-agent'] ?? '')) {
      response.writeHead(403, { 'Content-Type': 'text/plain' });
      response.end('Please set a user-agent and respect our robot policy.');
      return;
    }

    const query = new URLSearchParams(await readBody(request)).get('query') ?? '';
    const slug = /wdt:P5794\s+"((?:[^"\\]|\\.)*)"/.exec(query)?.[1];
    const ids = slug !== undefined && /wdt:P2864/.test(query) ? (BY_SLUG[slug] ?? []) : [];

    response.writeHead(200, { 'Content-Type': 'application/sparql-results+json' });
    response.end(
      JSON.stringify({
        head: { vars: ['oc'] },
        results: { bindings: ids.map((value) => ({ oc: { type: 'literal', value } })) },
      }),
    );
    return;
  }

  response.writeHead(404).end();
});

server.listen(PORT, () => console.log(`Wikidata stub listening on ${PORT}`));
