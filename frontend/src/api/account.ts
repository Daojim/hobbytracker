import { apiJson, apiVoid } from './client';
import type { Account } from './types';

/**
 * What the account holds, as a query key.
 *
 * Here rather than in board/keys.ts for the session's reason: it belongs to no board. It is the
 * one query that spans all of them.
 */
export const accountKey = ['account'] as const;

/** What deleting your account would take: every board's titles, every note, every sign-in. */
export function getAccount(): Promise<Account> {
  return apiJson<Account>('/api/account');
}

/**
 * Deletes your account and everything that is yours, and signs this browser out. A DELETE, so
 * that no link or image on another site can do it by being loaded.
 */
export function deleteAccount(): Promise<void> {
  return apiVoid('/api/account', { method: 'DELETE' });
}
