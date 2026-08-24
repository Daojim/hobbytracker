import { http, HttpResponse } from 'msw';
import { server } from './server';
import type { Me } from '../api/types';

export const someone: Me = { id: 1, displayName: 'Jimmy Dao' };

/**
 * Answers the session probe.
 *
 * Almost everything that renders the shell asks who is signed in, and MSW runs with
 * `onUnhandledRequest: 'error'` — so a component test that does not state this answer fails
 * rather than quietly rendering a signed-out header. `boardServer` installs it for the board's
 * sake; call this afterwards to override it, since a later `server.use` wins.
 *
 * Null is the signed-out answer, and it is a 200 rather than a 401: the API answers this
 * question without a session on purpose, or the very query that asks it would trip the handler
 * that redirects on a 401.
 */
export function authServer(me: Me | null = someone) {
  server.use(http.get('/api/auth/me', () => HttpResponse.json(me)));
}
