import { apiJson, apiVoid } from './client';
import type { Note } from './types';

/**
 * What was written during a pass.
 *
 * Reading is not here: notes come back with their entry on `LogEntry`, so `getGame` already
 * carries everything the drawer needs and a second request would be asking for what it has.
 *
 * A note is addressed under its pass while it is being written, because that is the only moment
 * the parent matters, and by its own id ever after.
 */
export function addNote(entryId: number, body: string): Promise<Note> {
  return apiJson<Note>(`/api/log-entries/${entryId}/notes`, { method: 'POST', body: { body } });
}

/** Rewrites the body. `writtenAt` does not move — see the type. */
export function updateNote(id: number, body: string): Promise<Note> {
  return apiJson<Note>(`/api/notes/${id}`, { method: 'PUT', body: { body } });
}

export function deleteNote(id: number): Promise<void> {
  return apiVoid(`/api/notes/${id}`, { method: 'DELETE' });
}
