import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import {
  addNote,
  deleteNote,
  pictureUrl,
  searchNotes,
  thumbnailUrl,
  updateNote,
  type PictureUpload,
} from './notes';
import { noteMatch } from '../test/notes';
import type { Note } from './types';

const note: Note = {
  id: 5,
  logEntryId: 7,
  body: 'finally beat radiance',
  writtenAt: '2026-08-21T01:30:00+00:00',
  pictures: [],
};

/** A picture as the box holds one, its bytes standing in for what the shrink makes. */
function upload(name: string): PictureUpload {
  return {
    picture: new Blob([`${name} picture`], { type: 'image/webp' }),
    thumbnail: new Blob([`${name} thumbnail`], { type: 'image/webp' }),
  };
}

/** What a form held, each file read back as the text it was made of. */
async function read(form: FormData) {
  const texts = (field: string) =>
    Promise.all(form.getAll(field).map((value) => (value as Blob).text()));

  return {
    body: form.get('body'),
    keep: form.getAll('keep'),
    pictures: await texts('pictures'),
    thumbnails: await texts('thumbnails'),
  };
}

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

  it('sends the words and the pictures in one form, each picture with its thumbnail', async () => {
    // One request, written in one save, so a drawer closed before Enter leaves nothing behind.
    let sent: Awaited<ReturnType<typeof read>> | undefined;
    server.use(
      http.post('/api/log-entries/7/notes', async ({ request }) => {
        sent = await read(await request.formData());
        return HttpResponse.json(note, { status: 201 });
      }),
    );

    await addNote(7, 'the clock tower', [upload('first'), upload('second')]);

    expect(sent).toEqual({
      body: 'the clock tower',
      keep: [],
      pictures: ['first picture', 'second picture'],
      thumbnails: ['first thumbnail', 'second thumbnail'],
    });
  });

  it('sends a picture alone with empty words', async () => {
    let sent: Awaited<ReturnType<typeof read>> | undefined;
    server.use(
      http.post('/api/log-entries/7/notes', async ({ request }) => {
        sent = await read(await request.formData());
        return HttpResponse.json(note, { status: 201 });
      }),
    );

    await addNote(7, '', [upload('only')]);

    expect(sent?.body).toBe('');
    expect(sent?.pictures).toEqual(['only picture']);
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

  it('names the pictures it keeps and sends the new ones after them', async () => {
    // A picture not named is taken out, so a rewrite of a note with pictures always says which
    // stay, even when it adds none.
    let sent: Awaited<ReturnType<typeof read>> | undefined;
    server.use(
      http.put('/api/notes/5', async ({ request }) => {
        sent = await read(await request.formData());
        return HttpResponse.json(note);
      }),
    );

    await updateNote(5, 'two kept, one new', { keep: [31, 33], add: [upload('new')] });

    expect(sent).toEqual({
      body: 'two kept, one new',
      keep: ['31', '33'],
      pictures: ['new picture'],
      thumbnails: ['new thumbnail'],
    });
  });

  it('takes every picture out when it keeps none and adds none', async () => {
    let sent: Awaited<ReturnType<typeof read>> | undefined;
    server.use(
      http.put('/api/notes/5', async ({ request }) => {
        sent = await read(await request.formData());
        return HttpResponse.json(note);
      }),
    );

    await updateNote(5, 'words alone now', { keep: [], add: [] });

    expect(sent).toEqual({ body: 'words alone now', keep: [], pictures: [], thumbnails: [] });
  });
});

describe('a picture is read one at a time', () => {
  it('from an address with no file extension', () => {
    // Cloudflare keeps the file types it knows at its edge by default, and hands its copy to
    // anyone who asks. The server says private as well; this is the other half.
    expect(pictureUrl(41)).toBe('/api/note-pictures/41');
    expect(thumbnailUrl(41)).toBe('/api/note-pictures/41/thumbnail');
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
