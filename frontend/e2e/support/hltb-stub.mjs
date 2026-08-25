/**
 * A stand-in for HowLongToBeat — the site, not an API, because there is no API to stand in for.
 *
 * The point of this stub is that the *real* code path runs against it. HLTB's access shape is
 * four legs of rediscovery and an anti-bot check, all of it worked out by spike and none of it
 * configurable, so a stub that only answered searches would leave the interesting half of
 * `Integrations/Hltb` unexercised and green. This serves all of it:
 *
 *   1. GET /                          the home page, naming the bundles
 *   2. GET /_next/static/chunks/*.js  the bundles, one of which carries the endpoint's name
 *   3. GET /api/{X}/init              the handshake
 *   4. POST /api/{X}                  the search, checked the way the real one checks
 *   5. GET /game/{id}                 one game by id, with no handshake at all
 *
 * The checks below are not invention. Each is a fact measured against the live site and written
 * down in CLAUDE.md, and enforcing them here is what makes a run fail if somebody drops the
 * Referer or lets the User-Agent drift out of `HltbClient.Identify` — which are two of the three
 * things that were green against stubs while the real site refused three times running.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.HLTB_STUB_PORT ?? 5398);

/**
 * Deliberately not whatever `Hltb:FallbackSearchPath` holds.
 *
 * If discovery broke, the client would fall back to the configured name, this stub would 404
 * and the specs would fail — which is the point. Naming the stub's endpoint after the real one
 * would let the fallback quietly cover for a pair rule that had stopped working.
 *
 * Two segments, because the real one has two. It was a single word here for as long as it was
 * a single word on the site, which is how the pair rule came to reject a name with a slash in
 * it and how this suite stayed green while every automatic lookup in the app was failing.
 */
const SEARCH_PATH = 'warble/site';

/**
 * What HowLongToBeat knows, which is not what IGDB knows — that disagreement is the feature.
 *
 * Stardew Valley is absent altogether: a title HLTB has never heard of. Anthem is here under the
 * edition name, which the matcher is right to refuse at about 0.29 against IGDB's bare "Anthem",
 * and which nothing but the pin can fix. That is Pokemon Scarlet's situation exactly, and it is
 * what `PUT /api/games/{mediaId}/hltb` exists for.
 */
const CATALOGUE = [
  // `all` is deliberately not the mean of the other three, and not their median either. On
  // the real site it is a separate statistic over every submission — Hollow Knight is 41.8
  // where the mean is 44.7 — so a stub that computed it would let the client get away with
  // computing it too, which was the first design and is wrong.
  { id: 9101, name: 'Celeste', year: 2018, all: 20, main: 8, plus: 12.5, hundred: 38 },
  { id: 9102, name: 'Hades', year: 2020, all: 42, main: 21, plus: 39, hundred: 95 },
  { id: 9103, name: 'Hollow Knight', year: 2017, all: 41.8, main: 27, plus: 41.5, hundred: 65 },
  { id: 9104, name: 'Outer Wilds', year: 2019, all: 17, main: 15, plus: 21, hundred: 30 },
  { id: 9105, name: 'Anthem: Legion of Dawn', year: 2019, all: 24, main: 13, plus: 30, hundred: 55 },
];

/** Times go over the wire in seconds. Turning them back into hours is the client's job. */
const seconds = (hours) => Math.round(hours * 3600);

/**
 * One game as the search returns it.
 *
 * `release_world` is an integer here and a date string on the game page. That is a real quirk of
 * the site rather than an accident of this file, and it is why `HltbGameJson.ReleaseWorld` is a
 * JsonElement — typing it either way makes the other endpoint throw. Serving both shapes is what
 * keeps that honest.
 */
const asSearchResult = (game) => ({
  game_id: game.id,
  game_name: game.name,
  game_alias: '',
  game_type: 'game',
  release_world: game.year,
  comp_all: seconds(game.all),
  comp_main: seconds(game.main),
  comp_plus: seconds(game.plus),
  comp_100: seconds(game.hundred),
  comp_all_count: 205,
  comp_main_count: 120,
  comp_plus_count: 60,
  comp_100_count: 25,
});

const asPageGame = (game) => ({ ...asSearchResult(game), release_world: game.year + '-03-01' });

/**
 * The bundle the pair rule has to read.
 *
 * The decoy matters as much as the pair. `/api/game` is reached by a POST fetch and is the first
 * one a reader meets, which is exactly what the community clients take and what answers 404 on
 * the real site; it is here so that "take the first POST fetch" fails this suite rather than
 * passing it. Only `warble/site` is also referenced with /init, so only it is the search.
 */
const BUNDLE = [
  '(self.webpackChunk=self.webpackChunk||[]).push([[404],{',
  '8813:(e,t,n)=>{const r=async(i)=>fetch("/api/game",{method:"POST",body:JSON.stringify(i)});',
  'const o=async()=>{const s=await fetch("/api/' + SEARCH_PATH + '/init?"+Date.now());',
  'const c=await s.json();return fetch("/api/' + SEARCH_PATH + '",{method:"POST",headers:{',
  '"x-auth-token":c.token,"x-hp-key":c.hpKey,"x-hp-val":c.hpVal}})};',
  'n.d(t,{search:()=>o,game:()=>r})}',
  '}]);',
].join('\n');

const HOME = [
  '<!doctype html><html><head><title>HowLongToBeat</title></head><body>',
  '<div id="__next"></div>',
  '<script src="/_next/static/chunks/missing-on-purpose.js" defer></script>',
  '<script src="/_next/static/chunks/main-e2e.js" defer></script>',
  '</body></html>',
].join('\n');

/** What has been handed out, so the search can check the caller actually did the handshake. */
const issued = new Map();
let handshakes = 0;

const readBody = (request) =>
  new Promise((resolve) => {
    let body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => resolve(body));
  });

/**
 * Both of these are load-bearing on the real site, measured rather than guessed: it answers
 * 403 {"error":"Access Denied"} without a User-Agent *and* a Referer, and 200 with them.
 */
const identified = (request) =>
  typeof request.headers['user-agent'] === 'string'
  && request.headers['user-agent'].length > 0
  && typeof request.headers['referer'] === 'string';

const denied = (response, why) => {
  response.writeHead(403, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ error: 'Access Denied', why }));
};

const json = (response, body, status = 200) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost:' + PORT);
  const path = url.pathname;

  if (path === '/health') {
    response.writeHead(200).end('ok');
    return;
  }

  if (path === '/') {
    if (!identified(request)) {
      denied(response, 'the home page wants a User-Agent and a Referer too');
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/html' }).end(HOME);
    return;
  }

  // One chunk that is not there. The real discovery loop reads past an unreadable bundle rather
  // than giving up on it, because the name is only ever in one of them.
  if (path === '/_next/static/chunks/missing-on-purpose.js') {
    response.writeHead(404).end();
    return;
  }

  if (path === '/_next/static/chunks/main-e2e.js') {
    response.writeHead(200, { 'Content-Type': 'application/javascript' }).end(BUNDLE);
    return;
  }

  if (path === '/api/' + SEARCH_PATH + '/init') {
    if (!identified(request)) {
      denied(response, 'the handshake refuses without a User-Agent and a Referer');
      return;
    }

    handshakes += 1;
    const hpKey = 'ign_e2e' + handshakes;
    const hpVal = String(Date.now());

    // The real token decodes to <ms>::<ip>|<user-agent>|<hpKey>|<hpVal>.<hmac>. The User-Agent
    // being baked in is the whole reason the search has to send the same one, so this bakes it
    // in too and the search below checks it.
    const token = Buffer.from(
      Date.now() + '::127.0.0.1|' + request.headers['user-agent'] + '|' + hpKey + '|' + hpVal,
    ).toString('base64');

    issued.set(token, { hpKey, hpVal, userAgent: request.headers['user-agent'] });
    json(response, { token, hpKey, hpVal });
    return;
  }

  if (path === '/api/' + SEARCH_PATH && request.method === 'POST') {
    const raw = await readBody(request);
    const body = raw === '' ? {} : JSON.parse(raw);

    const token = request.headers['x-auth-token'];
    const credentials = typeof token === 'string' ? issued.get(token) : undefined;

    if (credentials === undefined) {
      denied(response, 'no handshake stands behind that token');
      return;
    }

    // The token has the User-Agent baked in, so searching under a different one is refused. This
    // is what catches HltbClient.Identify and HltbSession drifting apart — two files agreeing
    // about one string, where only the far end can tell you they have stopped.
    if (credentials.userAgent !== request.headers['user-agent']) {
      denied(response, 'searched under a different User-Agent than the token was issued to');
      return;
    }

    if (
      request.headers['x-hp-key'] !== credentials.hpKey
      || request.headers['x-hp-val'] !== credentials.hpVal
    ) {
      denied(response, 'the handshake headers do not match what was issued');
      return;
    }

    // The trap, and the reason it cost a spike to find: the body has to carry a property whose
    // *name* is the hpKey. Without it the real endpoint answers 404 rather than 403, so a failed
    // anti-bot check reads as a wrong URL and sends you hunting for a path suffix.
    if (body[credentials.hpKey] !== credentials.hpVal) {
      response.writeHead(404).end();
      return;
    }

    const terms = (body.searchTerms ?? []).map((term) => String(term).toLowerCase());
    const matches = CATALOGUE.filter((game) =>
      terms.every((term) => game.name.toLowerCase().includes(term)),
    );

    json(response, { count: matches.length, data: matches.map(asSearchResult) });
    return;
  }

  // Fetching a pinned id needs no handshake at all — the record is in the JSON Next.js embeds in
  // the page. That is what keeps a matched title refreshable on a day the search endpoint has
  // been renamed out from under us, and it is what the drawer's pin control calls.
  const page = /^\/game\/(\d+)$/.exec(path);
  if (page !== null) {
    if (!identified(request)) {
      denied(response, 'the game page wants a User-Agent and a Referer');
      return;
    }

    const game = CATALOGUE.find((candidate) => candidate.id === Number(page[1]));
    if (game === undefined) {
      // An answer rather than a failure: the title keeps whatever was last known about it.
      response.writeHead(404).end();
      return;
    }

    // props.pageProps.game.data.game[0]. `data` is an object here, not the array the search
    // returns — its siblings on the real site are relationships, userReviews and platformData —
    // and the game sits one level inside it. That last hop is the easy one to miss.
    const embedded = {
      props: {
        pageProps: {
          game: {
            data: {
              game: [asPageGame(game)],
              relationships: [],
              userReviews: [],
              platformData: [],
            },
          },
        },
      },
    };

    response.writeHead(200, { 'Content-Type': 'text/html' }).end(
      '<!doctype html><html><body><div id="__next"></div>'
      + '<script id="__NEXT_DATA__" type="application/json">'
      + JSON.stringify(embedded)
      + '</script></body></html>',
    );
    return;
  }

  response.writeHead(404).end();
});

server.listen(PORT, () => console.log('HowLongToBeat stub listening on ' + PORT));
