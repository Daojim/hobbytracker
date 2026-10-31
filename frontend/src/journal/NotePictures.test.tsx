import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { EntryDrawer } from './EntryDrawer';
import { gameDetail, journalServer, logEntry, note } from '../test/games';
import { BackButton, renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { columnsFor } from '../hobbies';
import { shrink } from '../lib/shrink';

/**
 * Pictures in the journal: how one gets into a note, and how a note shows them.
 *
 * jsdom has no canvas, so the shrink is replaced here: each picture comes back as a stand-in
 * whose bytes are its file's name, which is what lets a test say which picture was sent. The
 * redraw itself is proved in a real browser, in `e2e/pictures.spec.ts`. A file named for a HEIC
 * stands in for one the browser cannot open.
 */
vi.mock('../lib/shrink', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/shrink')>();
  return {
    ...real,
    shrink: vi.fn((file: File) => {
      if (file.name.endsWith('.heic')) {
        return Promise.reject(new real.CannotOpenPicture());
      }

      return Promise.resolve({
        picture: new Blob([`shrunk ${file.name}`], { type: 'image/webp' }),
        thumbnail: new Blob([`small ${file.name}`], { type: 'image/webp' }),
        width: 1920,
        height: 1080,
      });
    }),
  };
});

const WHEN = 'Aug 20, 2026, 9:30 PM';

function open(onClose = vi.fn()) {
  return renderWithProviders(
    <>
      <EntryDrawer
        hobby="games"
        mediaId={3003}
        onClose={onClose}
        columns={columnsFor('games')}
        onMove={() => Promise.resolve()}
        onPutBack={() => Promise.resolve()}
      />
      <BackButton />
    </>,
  );
}

/** A file as the clipboard, a folder or the picker hands one over. */
const file = (name: string, type = 'image/png') => new File([name], name, { type });

/** A paste of what Win+Shift+S puts on the clipboard: pictures, and no words. */
const pasteFiles = (target: Element, ...files: File[]) =>
  fireEvent.paste(target, { clipboardData: { types: ['Files'], files, getData: () => '' } });

const box = () => screen.findByRole('textbox', { name: 'New note' });
const waiting = () => screen.queryAllByRole('button', { name: 'Take this picture out' });

describe('the compose box, taking a picture', () => {
  it('holds a pasted picture as a thumbnail until the note is sent', async () => {
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();

    // Not prevented, the browser would paste the file's name, or nothing, as words.
    expect(pasteFiles(await box(), file('status.png'))).toBe(false);

    await waitFor(() => expect(waiting()).toHaveLength(1));
  });

  it('sends the words and the picture in one request on Enter, as a form', async () => {
    const journal = journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();
    const compose = await box();

    await userEvent.type(compose, 'the clock tower, at last');
    pasteFiles(compose, file('status.png'));
    await waitFor(() => expect(waiting()).toHaveLength(1));
    await userEvent.type(compose, '{Enter}');

    await waitFor(() =>
      expect(journal.pictured).toEqual([
        { entryId: 7, body: 'the clock tower, at last', pictures: ['shrunk status.png'], thumbnails: 1 },
      ]),
    );
    expect(journal.written).toEqual([]);
    await waitFor(() => expect(compose).toHaveValue(''));
    expect(waiting()).toHaveLength(0);
  });

  it('sends a picture alone, with no words, from the button', async () => {
    const journal = journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();
    await box();

    pasteFiles(await box(), file('save.png'));
    await waitFor(() => expect(waiting()).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: 'Add note' }));

    await waitFor(() =>
      expect(journal.pictured).toEqual([
        { entryId: 7, body: '', pictures: ['shrunk save.png'], thumbnails: 1 },
      ]),
    );
  });

  it('pastes the words when a paste carries words as well as a picture', async () => {
    // Measured on 30 October 2026 in the user's Firefox: Excel puts a picture of the copied
    // cells on the clipboard beside the row as words. Taking the picture would turn a pasted
    // row into a picture of it.
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();

    const pasted = fireEvent.paste(await box(), {
      clipboardData: {
        types: ['text/plain', 'text/html', 'text/rtf', 'Files'],
        files: [file('cells.png')],
        getData: (type: string) => (type === 'text/plain' ? 'Celeste\t9.5' : ''),
      },
    });

    // Not prevented, so the browser pastes the words, and nothing is attached.
    expect(pasted).toBe(true);
    expect(waiting()).toHaveLength(0);
  });

  it('leaves a paste of words as it always was', async () => {
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();
    const compose = await box();

    await userEvent.click(compose);
    await userEvent.paste('watcher knights');

    expect(compose).toHaveValue('watcher knights');
    expect(waiting()).toHaveLength(0);
  });

  it('takes a dropped picture as it takes a pasted one', async () => {
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();
    const compose = await box();

    const files = [file('tv.jpg', 'image/jpeg')];
    fireEvent.dragOver(compose, { dataTransfer: { types: ['Files'], files, items: [{ kind: 'file' }] } });
    expect(screen.getByText('Drop to add the picture')).toBeInTheDocument();
    expect(fireEvent.drop(compose, { dataTransfer: { types: ['Files'], files } })).toBe(false);

    await waitFor(() => expect(waiting()).toHaveLength(1));
    expect(screen.queryByText('Drop to add the picture')).not.toBeInTheDocument();
  });

  it('says it will take the pictures when several are held over it', async () => {
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();

    fireEvent.dragOver(await box(), {
      dataTransfer: { types: ['Files'], files: [], items: [{ kind: 'file' }, { kind: 'file' }] },
    });

    expect(screen.getByText('Drop to add the pictures')).toBeInTheDocument();
  });

  it('opens the picker for pictures from its button', async () => {
    // On the phone this is the way in, and Android's picker offers the gallery and the camera
    // for a picture, which is where a console's screenshot or a photo of the TV is.
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();
    await box();

    const button = screen.getByRole('button', { name: 'Add a picture' });
    const input = button.parentElement?.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input?.accept).toBe('image/*');
    expect(input?.multiple).toBe(true);

    await userEvent.upload(input!, [file('photo.jpg', 'image/jpeg')]);
    await waitFor(() => expect(waiting()).toHaveLength(1));
  });

  it('lets a waiting picture be taken back out', async () => {
    const journal = journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();
    const compose = await box();

    pasteFiles(compose, file('first.png'), file('second.png'));
    await waitFor(() => expect(waiting()).toHaveLength(2));
    await userEvent.click(waiting()[0]!);
    await userEvent.type(compose, 'one left{Enter}');

    await waitFor(() =>
      expect(journal.pictured).toEqual([
        { entryId: 7, body: 'one left', pictures: ['shrunk second.png'], thumbnails: 1 },
      ]),
    );
  });

  it('refuses a fifth picture before anything is sent', async () => {
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();
    const compose = await box();

    pasteFiles(compose, file('1.png'), file('2.png'), file('3.png'), file('4.png'));
    await waitFor(() => expect(waiting()).toHaveLength(4));
    pasteFiles(compose, file('5.png'));

    expect(await screen.findByText('A note holds four pictures. Take one out to add another.'))
      .toBeInTheDocument();
    expect(waiting()).toHaveLength(4);
  });

  it('refuses a file that is not a picture', async () => {
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();

    fireEvent.drop(await box(), {
      dataTransfer: { types: ['Files'], files: [file('notes.pdf', 'application/pdf')] },
    });

    expect(await screen.findByText('Only pictures can go in a note.')).toBeInTheDocument();
    expect(waiting()).toHaveLength(0);
  });

  it('says so when the browser cannot open a picture', async () => {
    // An iPhone's HEIC in Firefox, which has no decoder for it.
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();

    pasteFiles(await box(), file('IMG_0001.heic', 'image/heic'));

    expect(await screen.findByText("That picture couldn't be opened, so it wasn't added."))
      .toBeInTheDocument();
    expect(waiting()).toHaveLength(0);
  });

  it('keeps the words and the pictures in the box when the send fails', async () => {
    const journal = journalServer({
      detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }),
      noteErrors: { Pictures: ['Your pictures have reached 1 GB, the most an account keeps.'] },
    });
    open();
    const compose = await box();

    await userEvent.type(compose, 'the clock tower');
    pasteFiles(compose, file('status.png'));
    await waitFor(() => expect(waiting()).toHaveLength(1));
    await userEvent.type(compose, '{Enter}');

    expect(
      await screen.findByText('Not added. Your pictures have reached 1 GB, the most an account keeps.'),
    ).toBeInTheDocument();
    expect(compose).toHaveValue('the clock tower');
    expect(waiting()).toHaveLength(1);
    expect(journal.pictured).toEqual([]);
  });

  it('takes no picture while a note is on its way', async () => {
    // The send has already taken what the box held, and the box is cleared when it lands, so a
    // picture added meanwhile would be cleared away with it, never sent and never said.
    const journal = journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    let land: () => void = () => undefined;
    const landed = new Promise<void>((resolve) => (land = resolve));
    server.use(
      http.post('/api/log-entries/:entryId/notes', async () => {
        await landed;
        return HttpResponse.json(note({ body: '' }), { status: 201 });
      }),
    );
    open();
    const compose = await box();

    pasteFiles(compose, file('first.png'));
    await waitFor(() => expect(waiting()).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: 'Add note' }));
    await screen.findByRole('button', { name: 'Adding…' });

    // Taken neither way. Prevented all the same, so no file name lands in the words.
    expect(pasteFiles(compose, file('late.png'))).toBe(false);
    fireEvent.drop(compose, { dataTransfer: { types: ['Files'], files: [file('dropped.png')] } });
    const shrunk = vi.mocked(shrink).mock.calls.map(([taken]) => (taken as File).name);
    expect(shrunk).not.toContain('late.png');
    expect(shrunk).not.toContain('dropped.png');
    land();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Add note' })).toBeEnabled());
    expect(waiting()).toHaveLength(0);
    expect(journal.pictured).toEqual([]);
  });

  it('takes, and ignores, a picture dropped on the drawer outside the box', async () => {
    // Chromium opens a dropped file in the tab when nothing takes it, which loses the draft and
    // the drawer. A near miss is likely once the drawer invites a drop at all.
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });
    open();
    await box();

    const drawer = screen.getByRole('dialog');
    const files = [file('missed.png')];
    expect(fireEvent.dragOver(drawer, { dataTransfer: { types: ['Files'], files, items: [{ kind: 'file' }] } }))
      .toBe(false);
    expect(fireEvent.drop(drawer, { dataTransfer: { types: ['Files'], files } })).toBe(false);
    expect(waiting()).toHaveLength(0);
  });
});

describe('the edit box, with pictures', () => {
  function withPictures() {
    return journalServer({
      detail: gameDetail({
        logEntries: [
          logEntry({
            id: 7,
            notes: [
              note({
                id: 9,
                body: 'wathcer',
                pictures: [
                  { id: 41, width: 1920, height: 1080 },
                  { id: 42, width: 537, height: 331 },
                ],
              }),
            ],
          }),
        ],
      }),
    });
  }

  it('can take a picture out and add another, saved with the words in one request', async () => {
    const journal = withPictures();
    open();
    await userEvent.click(await screen.findByRole('button', { name: `Edit the note from ${WHEN}` }));
    const edit = screen.getByRole('textbox', { name: `Note from ${WHEN}` });

    expect(waiting()).toHaveLength(2);
    await userEvent.click(waiting()[0]!);
    pasteFiles(edit, file('new.png'));
    await waitFor(() => expect(waiting()).toHaveLength(2));
    await userEvent.clear(edit);
    await userEvent.type(edit, 'watcher{Enter}');

    await waitFor(() =>
      expect(journal.repictured).toEqual([
        { id: 9, body: 'watcher', keep: [42], pictures: ['shrunk new.png'] },
      ]),
    );
  });

  it('keeps a note of pictures alone when its words are emptied', async () => {
    const journal = withPictures();
    open();
    await userEvent.click(await screen.findByRole('button', { name: `Edit the note from ${WHEN}` }));

    await userEvent.clear(screen.getByRole('textbox', { name: `Note from ${WHEN}` }));
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }));

    await waitFor(() =>
      expect(journal.repictured).toEqual([{ id: 9, body: '', keep: [41, 42], pictures: [] }]),
    );
  });

  it('rewrites a note of words alone as it always did', async () => {
    const journal = journalServer({
      detail: gameDetail({ logEntries: [logEntry({ id: 7, notes: [note({ id: 9, body: 'wathcer' })] })] }),
    });
    open();
    await userEvent.click(await screen.findByRole('button', { name: `Edit the note from ${WHEN}` }));

    const edit = screen.getByRole('textbox', { name: `Note from ${WHEN}` });
    await userEvent.clear(edit);
    await userEvent.type(edit, 'watcher{Enter}');

    await waitFor(() => expect(journal.rewritten).toEqual([{ id: 9, body: 'watcher' }]));
    expect(journal.repictured).toEqual([]);
  });
});

describe('a note with pictures', () => {
  function withPictures(count: number, body = 'the clock tower') {
    const sizes = [
      { width: 1920, height: 1080 },
      { width: 537, height: 331 },
      { width: 560, height: 470 },
      { width: 1440, height: 1920 },
    ];
    journalServer({
      detail: gameDetail({
        logEntries: [
          logEntry({
            id: 7,
            notes: [
              note({
                id: 9,
                body,
                pictures: sizes.slice(0, count).map((size, at) => ({ id: 41 + at, ...size })),
              }),
            ],
          }),
        ],
      }),
    });
  }

  it('draws each picture at its stored size before it has arrived', async () => {
    // A journal opened at a note scrolls to it, and pictures above it arriving afterwards would
    // push it back out of view. The <img>'s own attributes hold the space.
    withPictures(2);
    open();

    // Decorative to a screen reader, which hears the button's name, so found as an element.
    const first = (
      await screen.findByRole('button', { name: `Open picture 1 of 2 from ${WHEN}` })
    ).querySelector('img');
    expect(first).toHaveAttribute('src', '/api/note-pictures/41');
    expect(first).toHaveAttribute('width', '1920');
    expect(first).toHaveAttribute('height', '1080');
  });

  it('shows a lone picture under the words, named for its note', async () => {
    withPictures(1);
    open();

    const picture = await screen.findByRole('button', { name: `Open the picture from ${WHEN}` });
    const words = screen.getByText('the clock tower');
    // Under the words: what you wrote, then what you pasted with it, in the order you made them.
    expect(words.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows a note of pictures alone with no empty line for its words', async () => {
    withPictures(1, '');
    open();

    const picture = await screen.findByRole('button', { name: `Open the picture from ${WHEN}` });
    const row = picture.closest('li');
    expect(row?.querySelector('p.whitespace-pre-wrap')).toBeNull();
  });

  it('opens a picture over everything, and steps through the note with the arrow keys', async () => {
    withPictures(2);
    open();

    await userEvent.click(
      await screen.findByRole('button', { name: `Open picture 1 of 2 from ${WHEN}` }),
    );

    const viewer = screen.getByRole('dialog', { name: `Picture 1 of 2, from ${WHEN}` });
    expect(within(viewer).getByText(`${WHEN} · 1 of 2`)).toBeInTheDocument();
    expect(viewer.querySelector('img')).toHaveAttribute('src', '/api/note-pictures/41');

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('dialog', { name: `Picture 2 of 2, from ${WHEN}` })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'The picture before' }));
    expect(screen.getByRole('dialog', { name: `Picture 1 of 2, from ${WHEN}` })).toBeInTheDocument();
  });

  it('closes the picture on Escape and leaves the journal open', async () => {
    // The drawer hears Escape at the document too, and would close the journal on the press
    // meant for the picture if it did not stand aside while one is open.
    withPictures(1);
    const onClose = vi.fn();
    open(onClose);

    await userEvent.click(await screen.findByRole('button', { name: `Open the picture from ${WHEN}` }));
    expect(screen.getByRole('dialog', { name: `The picture from ${WHEN}` })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: `The picture from ${WHEN}` })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps its Escape for itself when the picture history names is not in this journal', async () => {
    // A reload hands the history back, picture and all, and the picture can have been deleted
    // since in another tab. With nothing drawn over the journal, Escape is the journal's again.
    withPictures(1);
    const onClose = vi.fn();
    renderWithProviders(
      <EntryDrawer
        hobby="games"
        mediaId={3003}
        onClose={onClose}
        columns={columnsFor('games')}
        onMove={() => Promise.resolve()}
        onPutBack={() => Promise.resolve()}
      />,
      { routeState: { picture: 999 } },
    );

    await screen.findByRole('button', { name: `Open the picture from ${WHEN}` });
    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('closes the picture on Back and leaves the journal open', async () => {
    // Android's one Back means "out of this", and over a picture that is the picture.
    withPictures(1);
    open();

    await userEvent.click(await screen.findByRole('button', { name: `Open the picture from ${WHEN}` }));
    await userEvent.click(screen.getByRole('button', { name: 'go back' }));

    expect(screen.queryByRole('dialog', { name: `The picture from ${WHEN}` })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hollow Knight' })).toBeInTheDocument();
  });

  it('closes the picture from its own button, and hands the keyboard back to the picture', async () => {
    withPictures(1);
    open();

    const opener = await screen.findByRole('button', { name: `Open the picture from ${WHEN}` });
    await userEvent.click(opener);
    await userEvent.click(screen.getByRole('button', { name: 'Close the picture' }));

    expect(screen.queryByRole('dialog', { name: `The picture from ${WHEN}` })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: `Open the picture from ${WHEN}` })).toHaveFocus(),
    );
  });
});
