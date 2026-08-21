import { apiJson, apiVoid } from './client';
import type { CreateLogEntry, LogEntry, LogStatus, PagedResult, UpdateLogEntry } from './types';

/**
 * The journal. Entries are per-pass, not per-title: logging a replay adds a row rather than
 * overwriting the last one, which is what makes "I finished this in 2024 and I am replaying it
 * now" expressible at all.
 */

export interface LogEntryQuery {
  mediaId?: number;
  status?: LogStatus;
  page?: number;
  pageSize?: number;
}

export function listLogEntries(query: LogEntryQuery = {}): Promise<PagedResult<LogEntry>> {
  return apiJson<PagedResult<LogEntry>>('/api/log-entries', { query: { ...query } });
}

export function getLogEntry(id: number): Promise<LogEntry> {
  return apiJson<LogEntry>(`/api/log-entries/${id}`);
}

export function createLogEntry(entry: CreateLogEntry): Promise<LogEntry> {
  // Rebuilt field by field rather than passed through. `loggedAt` is the server's record of when
  // the entry was written, and a body that carried one would be asserting something the caller is
  // not in a position to know — the type forbids it, and this makes a cast past the type harmless.
  return apiJson<LogEntry>('/api/log-entries', {
    method: 'POST',
    body: pick(entry, entry.mediaId),
  });
}

/**
 * Puts a game on the board. There is no endpoint for this and none is needed: search has already
 * upserted the title into the catalog, so this is simply its first entry.
 */
export function addToBacklog(mediaId: number): Promise<LogEntry> {
  return createLogEntry({ mediaId, status: 'Backlog' });
}

/**
 * Full replacement. A field left out of the body is *cleared* — that is what PUT buys over PATCH,
 * which cannot tell "clear the rating" from "leave it alone".
 */
export function updateLogEntry(id: number, entry: UpdateLogEntry): Promise<LogEntry> {
  return apiJson<LogEntry>(`/api/log-entries/${id}`, { method: 'PUT', body: pick(entry) });
}

/** Removes the entry only. The title stays in the catalog — un-logging is not forgetting. */
export function deleteLogEntry(id: number): Promise<void> {
  return apiVoid(`/api/log-entries/${id}`, { method: 'DELETE' });
}

/** The fields the API accepts, and only those. Undefined ones are left out of the body. */
function pick(entry: UpdateLogEntry, mediaId?: number): Record<string, unknown> {
  const body: Record<string, unknown> = mediaId === undefined ? {} : { mediaId };

  body['status'] = entry.status;
  for (const field of ['rating', 'notes', 'platform', 'startedAt', 'completedAt'] as const) {
    if (entry[field] !== undefined) {
      body[field] = entry[field];
    }
  }

  return body;
}
