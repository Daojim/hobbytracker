import { apiJson, apiVoid } from './client';
import type { Note, NoteSearchResult } from './types';

/**
 * What was written during a pass.
 *
 * Reading one title's notes is not here: they come back with their entry on `LogEntry`, so
 * `getGame` already carries everything the drawer needs and a second request would be asking for
 * what it has. The one read here is the search, across every title on a board.
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

/**
 * Your notes on one board with every word of `query` in them, newest first.
 *
 * The query goes whole, as it was typed. The server splits it into words, and splitting it here
 * as well would be a second copy of a rule the two have to agree on.
 */
export function searchNotes(hobby: string, query: string): Promise<NoteSearchResult> {
  return apiJson<NoteSearchResult>('/api/notes/search', { query: { q: query, hobby } });
}
