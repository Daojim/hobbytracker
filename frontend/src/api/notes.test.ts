import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { addNote, deleteNote, searchNotes, updateNote } from './notes';
import { noteMatch } from '../test/notes';
import type { Note } from './types';

const note: Note = {
  id: 5,
  logEntryId: 7,
  body: 'finally beat radiance',
  writtenAt: '2026-08-21T01:30:00+00:00',
};

describe('addNote', () => {
  it('posts under the pass it belongs to', async () => {
    // Nested because it needs the parent, and that is the only moment it does.
    let body: unknown;
    server.use(
      http.post('/api/log-entries/7/notes', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(note, { status: 201 });
      }),
    );

    expect(await addNote(7, 'finally beat radiance')).toEqual(note);
    expect(body).toEqual({ body: 'finally beat radiance' });
  });
});

describe('updateNote', () => {
  it('sends only the body, because the date is not the caller to set', async () => {
    let body: unknown;
    server.use(
      http.put('/api/notes/5', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(note);
      }),
    );

    await updateNote(5, 'finally beat the Radiance');

    expect(body).toEqual({ body: 'finally beat the Radiance' });
  });
});

describe('deleteNote', () => {
  it('accepts the 204', async () => {
    server.use(http.delete('/api/notes/5', () => new HttpResponse(null, { status: 204 })));

    await expect(deleteNote(5)).resolves.toBeUndefined();
  });
});

describe('searchNotes', () => {
  it("asks one board's notes for every word of the search, sent as it was typed", async () => {
    // The server splits the words, so the search goes over whole: splitting it here as well
    // would be a second copy of a rule the two must agree on.
    let asked: URLSearchParams | undefined;
    const found = { notes: [noteMatch()], more: false };
    server.use(
      http.get('/api/notes/search', ({ request }) => {
        asked = new URL(request.url).searchParams;
        return HttpResponse.json(found);
      }),
    );

    expect(await searchNotes('games', 'temple  50%')).toEqual(found);
    expect(asked?.get('q')).toBe('temple  50%');
    expect(asked?.get('hobby')).toBe('games');
  });
});
