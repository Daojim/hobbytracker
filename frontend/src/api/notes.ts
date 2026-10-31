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
export function addNote(
  entryId: number,
  body: string,
  pictures: readonly PictureUpload[] = [],
): Promise<Note> {
  return apiJson<Note>(`/api/log-entries/${entryId}/notes`, {
    method: 'POST',
    body: pictures.length === 0 ? { body } : form(body, [], pictures),
  });
}

/**
 * Rewrites the body. `writtenAt` does not move — see the type.
 *
 * Words alone go as JSON, as they always have, and leave the note's pictures as they are. Say
 * which `pictures` the note keeps and adds, and it goes as a form instead: a picture not kept is
 * taken out. A note that has any pictures is always rewritten that way, so that taking one out,
 * or emptying the words beside one, means what it says.
 */
export function updateNote(id: number, body: string, pictures?: NotePictures): Promise<Note> {
  return apiJson<Note>(`/api/notes/${id}`, {
    method: 'PUT',
    body: pictures === undefined ? { body } : form(body, pictures.keep, pictures.add),
  });
}

/** A picture as the box holds it until it is sent: the shrunk picture and its small copy. */
export interface PictureUpload {
  picture: Blob;
  thumbnail: Blob;
}

/** What a rewrite does to a note's pictures. */
export interface NotePictures {
  /** The pictures already in the note that stay, by id. They keep the order they were in. */
  keep: readonly number[];
  /** New ones, which go after them. */
  add: readonly PictureUpload[];
}

/**
 * A note as the server's form write reads it: the words, the ids it keeps, and each picture with
 * its thumbnail, in the same order. The files' names say nothing the server reads; it reads what
 * a picture is from its bytes.
 */
function form(body: string, keep: readonly number[], add: readonly PictureUpload[]): FormData {
  const sent = new FormData();
  sent.append('body', body);

  for (const id of keep) {
    sent.append('keep', String(id));
  }

  for (const { picture, thumbnail } of add) {
    sent.append('pictures', picture, 'picture');
    sent.append('thumbnails', thumbnail, 'thumbnail');
  }

  return sent;
}

/**
 * Where a picture is read from, by an `<img>` that carries the session cookie because the app and
 * the API share an origin. **No file extension**: Cloudflare keeps the file types it knows at its
 * edge, and hands its copy to anyone who asks.
 */
export function pictureUrl(id: number): string {
  return `/api/note-pictures/${id}`;
}

/** The small copy of a picture a card draws, about 96px tall. */
export function thumbnailUrl(id: number): string {
  return `${pictureUrl(id)}/thumbnail`;
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
