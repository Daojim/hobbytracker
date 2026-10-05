import { apiJson, apiVoid } from './client';
import type { Share, SharePart } from './types';

/**
 * Your board's share link, from Settings. One per board, addressed by the hobby: every route here
 * is about your own link, so none takes an id.
 */

/** What a link shows: every box, every time, since a part left out is a part switched off. */
export interface ShareRequest {
  parts: SharePart[];
  showsName: boolean;
}

/** The board's link, or null when it has none — "No link yet", which is an answer, not a failure. */
export function getShare(hobby: string): Promise<Share | null> {
  return apiJson<Share | null>('/api/share', { query: { hobby } });
}

/**
 * Makes the board's link — the one way a link comes to exist. A 409 when the board has one
 * already, which only a dialog opened before another tab made it can meet.
 */
export function makeShare(hobby: string, request: ShareRequest): Promise<Share> {
  return apiJson<Share>('/api/share', { method: 'POST', query: { hobby }, body: request });
}

/** Rewrites what the link shows, a box at a time. The address does not change. */
export function changeShare(hobby: string, request: ShareRequest): Promise<Share> {
  return apiJson<Share>('/api/share', { method: 'PUT', query: { hobby }, body: request });
}

/** Stops sharing: the address stops working for everyone who has it, for good. */
export function stopShare(hobby: string): Promise<void> {
  return apiVoid('/api/share', { method: 'DELETE', query: { hobby } });
}
