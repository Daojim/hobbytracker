import { apiJson, apiVoid } from './client';
import type { Me } from './types';

/**
 * The session, as a query key.
 *
 * Held here rather than in board/keys.ts because it belongs to no board, and because three
 * unrelated places need it: the gate that reads it, the header that displays it, and the 401
 * handler that clears it.
 */
export const sessionKey = ['auth', 'me'] as const;

/**
 * Who is signed in, or null.
 *
 * Null rather than an error, because the API answers this one without a session on purpose —
 * a 401 here would trip the very handler that redirects on a 401, and the query would send you
 * to sign in on the strength of its own answer.
 */
export function getMe(): Promise<Me | null> {
  return apiJson<Me | null>('/api/auth/me');
}

/** Ends the session. POST, so that loading an image cannot sign you out. */
export function signOut(): Promise<void> {
  return apiVoid('/api/auth/logout', { method: 'POST' });
}

/**
 * Where to send the browser to sign in. A URL rather than a function that navigates: this is a
 * plain link in the UI, because the flow is a top-level navigation to the provider and fetch
 * cannot follow a 302 to somebody else's site to any useful end.
 */
export function signInUrl(returnUrl = '/board'): string {
  return `/api/auth/google/start?returnUrl=${encodeURIComponent(returnUrl)}`;
}
