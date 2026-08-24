/**
 * A stand-in for Google's OAuth endpoints.
 *
 * The backend suite fakes nothing about signing in — it hands the app a header and moves on —
 * which leaves the whole OAuth dance with no test above the unit level. So this is a *provider*
 * rather than an endpoint: it authorizes, it exchanges a code, and it answers user-info, and the
 * framework's real handler runs against it unmodified. `Auth:Google:*` are the only things
 * pointed at it, exactly as `Igdb:BaseUrl` and `Hltb:BaseUrl` are.
 *
 * It enforces the protocol rather than decorating it, which is the whole reason it is worth
 * having. A stub that says yes to everything is a stub that stays green while the client sends
 * nonsense — see hltb-stub.mjs, which is where that stance was learned:
 *
 *   - no `code_challenge` on the authorize request is a 400, so turning PKCE off fails the suite
 *     rather than passing it quietly;
 *   - a `code_verifier` that does not hash to that challenge is a 400;
 *   - the wrong `client_secret` is a 401;
 *   - user-info without the bearer it just issued is a 401;
 *   - a code is good exactly once.
 *
 * There is no sign-in screen. The point is to exercise our callback, not to re-enact Google's
 * consent page, so authorize redirects straight back.
 */
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';

const PORT = Number(process.env.GOOGLE_STUB_PORT ?? 5397);

/** Must match what the API is configured with, or every exchange is a 401. */
const CLIENT_ID = process.env.GOOGLE_STUB_CLIENT_ID ?? 'e2e-google-client';
const CLIENT_SECRET = process.env.GOOGLE_STUB_CLIENT_SECRET ?? 'e2e-google-secret';

/**
 * Who signs in next. A spec changes it through POST /__identity, which is what makes the
 * two-user cases expressible — the same affordance the IGDB stub gets from a fixed catalogue.
 */
const DEFAULT_IDENTITY = { sub: '100000000000000000001', email: 'jimmy@example.com', name: 'Jimmy Dao' };
let identity = { ...DEFAULT_IDENTITY };

/** code -> { challenge, identity }, and access token -> identity. Both one-shot by nature. */
const codes = new Map();
const tokens = new Map();

const base64Url = (buffer) =>
  buffer.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

const challengeFor = (verifier) => base64Url(createHash('sha256').update(verifier).digest());

const json = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
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

  // Who the next sign-in is. Resets to the default on an empty body, so a spec can put it back.
  if (url.pathname === '/__identity' && request.method === 'POST') {
    const body = await readBody(request);
    identity = body.trim() === '' ? { ...DEFAULT_IDENTITY } : { ...DEFAULT_IDENTITY, ...JSON.parse(body) };
    json(response, 200, identity);
    return;
  }

  // ------------------------------------------------------------------ authorize
  if (url.pathname === '/o/oauth2/v2/auth') {
    const query = url.searchParams;

    if (query.get('client_id') !== CLIENT_ID) {
      json(response, 400, { error: 'invalid_client' });
      return;
    }

    if (query.get('response_type') !== 'code') {
      json(response, 400, { error: 'unsupported_response_type' });
      return;
    }

    const redirectUri = query.get('redirect_uri');
    const state = query.get('state');

    // state is the framework's CSRF token and it pairs with the correlation cookie. A provider
    // that let it be absent would let the callback be forged.
    if (redirectUri === null || state === null) {
      json(response, 400, { error: 'invalid_request' });
      return;
    }

    // The assertion that costs one option on our side and everything on theirs. Without it an
    // intercepted code is enough to complete somebody else's sign-in.
    const challenge = query.get('code_challenge');
    if (challenge === null || query.get('code_challenge_method') !== 'S256') {
      json(response, 400, { error: 'invalid_request', error_description: 'PKCE is required.' });
      return;
    }

    const code = randomUUID();
    codes.set(code, { challenge, identity: { ...identity } });

    const back = new URL(redirectUri);
    back.searchParams.set('code', code);
    back.searchParams.set('state', state);

    response.writeHead(302, { Location: back.toString() }).end();
    return;
  }

  // ---------------------------------------------------------------------- token
  if (url.pathname === '/token' && request.method === 'POST') {
    const form = new URLSearchParams(await readBody(request));

    if (form.get('client_id') !== CLIENT_ID || form.get('client_secret') !== CLIENT_SECRET) {
      json(response, 401, { error: 'invalid_client' });
      return;
    }

    if (form.get('grant_type') !== 'authorization_code') {
      json(response, 400, { error: 'unsupported_grant_type' });
      return;
    }

    // One use only. A code that could be replayed is a session anyone who saw the URL can take.
    const issued = codes.get(form.get('code') ?? '');
    codes.delete(form.get('code') ?? '');

    if (issued === undefined) {
      json(response, 400, { error: 'invalid_grant' });
      return;
    }

    const verifier = form.get('code_verifier');
    if (verifier === null || challengeFor(verifier) !== issued.challenge) {
      json(response, 400, { error: 'invalid_grant', error_description: 'PKCE verification failed.' });
      return;
    }

    const accessToken = randomUUID();
    tokens.set(accessToken, issued.identity);

    json(response, 200, { access_token: accessToken, token_type: 'Bearer', expires_in: 3_600 });
    return;
  }

  // ------------------------------------------------------------------- user-info
  if (url.pathname === '/v1/userinfo') {
    const bearer = (request.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    const who = tokens.get(bearer);

    if (who === undefined) {
      json(response, 401, { error: 'invalid_token' });
      return;
    }

    json(response, 200, who);
    return;
  }

  response.writeHead(404).end();
});

server.listen(PORT, () => console.log(`Google stub listening on ${PORT}`));
