import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SharedBoardPage } from './SharedBoardPage';
import { setCardShows } from '../board/cardShows';
import { setColumnHidden } from '../board/hiddenColumns';
import { collapsedColumnsKey, setColumnCollapsed } from '../board/collapsedColumns';
import { setPace } from '../lib/pace';
import { libraryItem, manyGames } from '../test/library';
import { windowOfWidth } from '../test/media';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { SHOWN, TOKEN, deadShareServer, sharedServer } from '../test/share';
import type { ColumnHours } from '../api/types';

/**
 * A share, as a visitor holding its link sees it: the owner's board, read-only.
 *
 * The fixture serves the share's routes and nothing else — no `/api/library` and no
 * `/api/auth/me` — so a page that read the signed-in board, or asked who is signed in, fails on
 * an unhandled request rather than quietly rendering somebody's board.
 */

function renderShare() {
  return renderWithProviders(<SharedBoardPage />, {
    route: `/share/${TOKEN}`,
    path: '/share/:token',
  });
}

/**
 * Every word on the page a person or a screen reader can be given, outside the banner: the text,
 * every accessible label, and every option a select offers.
 */
function wordsOf(root: HTMLElement): string {
  const labels = [...root.querySelectorAll('[aria-label]')].map(
    (element) => element.getAttribute('aria-label') ?? '',
  );

  return [root.textContent ?? '', ...labels].join(' \n ');
}

const HOURS: ColumnHours = {
  length: 260,
  lengthTitles: 7,
  played: 213,
  playedLength: 218,
  playedTitles: 6,
  // A share's header counts what its figures leave out and names none of it.
  withoutLength: null,
  withoutPlayed: null,
};

describe('SharedBoardPage', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  describe('the top of the page', () => {
    it('says in a banner that the board is shared and read-only, and offers one of your own', async () => {
      sharedServer({ years: [2026] });
      renderShare();

      const banner = await screen.findByRole('banner');

      expect(banner).toHaveTextContent('A board shared from HobbyTracker. It’s read-only.');
      expect(within(banner).getByRole('link', { name: 'Make your own' })).toHaveAttribute(
        'href',
        '/board/games',
      );
    });

    it('heads the board with the owner’s name when they ticked it, and only there', async () => {
      // Picked after the renders: with the name in the banner as well it read twice.
      sharedServer({ board: { name: 'Jimmy Dao' }, years: [2026] });
      renderShare();

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Jimmy Dao’s games' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('banner')).not.toHaveTextContent('Jimmy');
      expect(screen.getAllByText(/Jimmy Dao/)).toHaveLength(1);
    });

    it('is the board’s own name when the owner kept theirs off', async () => {
      sharedServer({ years: [2026] });
      renderShare();

      expect(await screen.findByRole('heading', { level: 1, name: 'Games' })).toBeInTheDocument();
    });
  });

  describe('the columns', () => {
    it('draws Backlog and the columns the share shows, in the board’s order, from the share alone', async () => {
      const share = sharedServer({
        board: { parts: ['Completed', 'InProgress'] },
        columns: {
          Backlog: [libraryItem({ title: 'Celeste' })],
          Completed: [libraryItem({ title: 'Tunic', currentStatus: 'Completed' })],
        },
        years: [2026],
      });
      renderShare();

      await screen.findByText('Tunic');

      expect(
        screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
      ).toEqual(['Backlog 1', 'Playing 0', 'Completed 1']);
      expect(share.queriesFor('OnHold')).toHaveLength(0);
      expect(share.queriesFor('Dropped')).toHaveLength(0);
    });

    it('offers a column past a page the same Load more, asking the share’s own route', async () => {
      // A visitor has no other way past a share's first 100 (#35), and nothing on a share drags,
      // so the button is the board's whole. The next page is the share's to answer, never yours.
      const share = sharedServer({ columns: { Backlog: manyGames(140) }, years: [2026] });
      renderShare();

      const backlog = await screen.findByRole('region', { name: 'Backlog 140' });
      await within(backlog).findByText('Game 100');
      expect(within(backlog).queryByText('Game 101')).not.toBeInTheDocument();

      await userEvent.click(within(backlog).getByRole('button', { name: 'Load more' }));

      expect(await within(backlog).findByText('Game 140')).toBeInTheDocument();
      expect(within(backlog).queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
      expect(share.queriesFor('Backlog').map((query) => query.get('page'))).toEqual(['1', '2']);
    });

    it('hands the keyboard to the first new card’s name, a card having nothing to press', async () => {
      // On your board the keyboard goes to the first new card's title, which opens its journal.
      // A share's card is its face alone, so its name takes it, focusable from script and never
      // a stop for Tab, as a Discover tile's name is: the user's pick at #35's build.
      sharedServer({ columns: { Backlog: manyGames(140) }, years: [2026] });
      renderShare();

      const backlog = await screen.findByRole('region', { name: 'Backlog 140' });
      await userEvent.click(await within(backlog).findByRole('button', { name: 'Load more' }));

      const name = await within(backlog).findByRole('heading', { name: 'Game 101' });
      await waitFor(() => expect(name).toHaveFocus());
      expect(name).toHaveAttribute('tabindex', '-1');
    });

    it('offers no way to pick what to play from the owner’s Backlog', async () => {
      // The picker moves a title to Playing, and a share moves nothing. Its way in is handed to
      // your board's Backlog alone, so a share's frame is never given one.
      sharedServer({
        columns: { Backlog: [libraryItem({ title: 'Celeste', lengthHours: 12 })] },
        years: [2026],
      });
      renderShare();

      await screen.findByText('Celeste');

      expect(screen.queryByRole('button', { name: /Pick/ })).not.toBeInTheDocument();
      expect(screen.queryByTitle('What should I play next?')).not.toBeInTheDocument();
    });

    it('takes nothing from this browser’s own Settings', async () => {
      // Columns taken off in Settings are the visitor's view of their own board. What a share
      // shows is its owner's to say, and is stored with the share.
      setColumnHidden('games', 'Completed', true);
      sharedServer({
        board: { parts: ['Completed'] },
        columns: { Completed: [libraryItem({ title: 'Tunic', currentStatus: 'Completed' })] },
        years: [2026],
      });
      renderShare();

      expect(await screen.findByText('Tunic')).toBeInTheDocument();
    });

    it('draws each card whole, whatever this browser’s own board leaves off its cards', async () => {
      // What a card shows (#27) is kept per browser, so the server never knows the owner's
      // choice and a share cannot follow it; nor should it follow a visitor's for their own board.
      setCardShows('games', 'length', false);
      try {
        sharedServer({
          board: { parts: SHOWN },
          columns: { Backlog: [libraryItem({ title: 'Celeste', lengthHours: 12 })] },
          years: [2026],
        });
        renderShare();

        expect(await screen.findByText('Celeste')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'About 12 hours to finish' })).toBeInTheDocument();
      } finally {
        localStorage.clear();
      }
    });

    it('keeps what it reads under its token, and nothing in your own board’s cache', async () => {
      // An owner who opens their own link and follows "Make your own" lands on their board in the
      // same app, holding the same cache. A share's answers leave the note out, so a column kept
      // under the board's key would be drawn there — note-less — until something refetched it.
      sharedServer({
        board: { parts: SHOWN },
        columns: { Backlog: [libraryItem({ title: 'Celeste' })] },
        upcoming: [],
        years: [2026],
      });
      const { queryClient } = renderShare();

      await screen.findByText('Celeste');
      await screen.findByText('Nothing on this board is waiting to come out.');

      const cache = queryClient.getQueryCache();
      expect(cache.findAll({ queryKey: ['library'] })).toHaveLength(0);
      expect(cache.findAll({ queryKey: ['shared', TOKEN] }).length).toBeGreaterThan(0);
    });

    it('shows each title as its card does, with nothing to press and no note', async () => {
      // The server sends no note on a share. The page keeps none either, so a note that somehow
      // arrived would still not be printed: the drag preview's face, with nothing in its hands.
      sharedServer({
        columns: {
          Backlog: [
            libraryItem({
              title: 'Celeste',
              latestRating: 9.5,
              latestNotePreview: 'A NOTE',
              latestNotePicture: { id: 41, width: 1920, height: 1080 },
              latestNotePictures: 1,
            }),
          ],
        },
        years: [2026],
      });
      renderShare();

      const card = (await screen.findByRole('heading', { level: 3, name: 'Celeste' })).closest('li')!;

      expect(within(card).queryByRole('button')).not.toBeInTheDocument();
      expect(within(card).getByRole('img', { name: 'Rated 9.5 out of 10' })).toBeInTheDocument();
      expect(screen.queryByText('A NOTE')).not.toBeInTheDocument();
      // Nor a picture: the picture route would answer a visitor with a 401, and a card that
      // asked would draw a broken picture where the note was.
      expect(card.querySelector('img[src^="/api/note-pictures"]')).toBeNull();

      // dnd-kit stamps every sortable it registers with this; a share registers none.
      expect(document.querySelector('[aria-roledescription]')).toBeNull();
    });

    it("counts what a header leaves out in words, naming none of it, whatever the answer carried", async () => {
      // The server names nothing on a share: which of the owner's games have no hours logged,
      // title by title, is more than a share shows, and a visitor can do nothing about any of
      // them. The page draws no list either, so names that somehow arrived would still not be.
      sharedServer({
        columns: {
          Backlog: [libraryItem({ title: 'Celeste', lengthHours: 12.76 })],
          Completed: [
            libraryItem({ title: 'Tunic', currentStatus: 'Completed' }),
            libraryItem({ title: 'Hi-Fi Rush', currentStatus: 'Completed' }),
          ],
        },
        hours: {
          Completed: {
            ...HOURS,
            withoutLength: [{ mediaId: 70, title: 'Unheard Of', coverUrl: null }],
            withoutPlayed: [{ mediaId: 71, title: 'Hi-Fi Rush', coverUrl: null }],
          },
        },
        years: [2026],
      });
      renderShare();

      const completed = await screen.findByRole('region', { name: /^Completed/ });
      expect(
        await within(completed).findByText('over 6 games · 1 without hours logged · 1 with no estimate'),
      ).toBeInTheDocument();
      expect(within(completed).queryByRole('button', { name: /without hours logged|with no estimate/ }))
        .not.toBeInTheDocument();
      expect(within(completed).queryByRole('group')).not.toBeInTheDocument();
      expect(screen.queryByText('Unheard Of')).not.toBeInTheDocument();
    });

    it('folds Dropped side by side, as your board does', async () => {
      sharedServer({
        board: { parts: ['Dropped'] },
        columns: { Dropped: [libraryItem({ title: 'Spiritfarer', currentStatus: 'Dropped' })] },
        years: [2026],
      });
      renderShare();

      const show = await screen.findByRole('button', { name: 'Expand Dropped' });
      expect(screen.queryByText('Spiritfarer')).not.toBeInTheDocument();

      await userEvent.click(show);

      expect(await screen.findByText('Spiritfarer')).toBeInTheDocument();
    });

    it('folds every column side by side for the visit, and remembers none of it', async () => {
      // #29: a visitor scrolling a long Completed has the owner's complaint. Page state, for the
      // reason the calendar's fold is not remembered on a share: kept under the board's key, a
      // visitor's fold would fold their own games board too.
      sharedServer({
        board: { parts: ['Completed'] },
        columns: { Completed: [libraryItem({ title: 'Celeste', currentStatus: 'Completed' })] },
        years: [2026],
      });
      renderShare();

      await userEvent.click(await screen.findByRole('button', { name: 'Collapse Completed' }));

      expect(screen.queryByText('Celeste')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Expand Completed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Collapse Backlog' })).toBeInTheDocument();
      expect(localStorage.getItem(collapsedColumnsKey('games'))).toBeNull();
    });

    it('never folds a column because this browser folded its own', async () => {
      // What this browser keeps collapsed is the visitor's view of their own board.
      setColumnCollapsed('games', 'Completed', true);
      sharedServer({
        board: { parts: ['Completed'] },
        columns: { Completed: [libraryItem({ title: 'Celeste', currentStatus: 'Completed' })] },
        years: [2026],
      });
      renderShare();

      expect(await screen.findByText('Celeste')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Collapse Completed' })).toBeInTheDocument();
    });

    it('keeps a sort control on every column, and calls the hand-made order Board order', async () => {
      const share = sharedServer({
        columns: { Backlog: [libraryItem({ title: 'Celeste' })] },
        years: [2026],
      });
      renderShare();

      const select = await screen.findByRole('combobox', { name: 'Backlog order' });
      expect(select.querySelector('option')).toHaveTextContent('Board order');

      await userEvent.selectOptions(select, 'rating');

      await waitFor(() => expect(share.queriesFor('Backlog').at(-1)?.get('sort')).toBe('rating'));
    });

    it('opens on the latest year, and narrows the columns the board narrows', async () => {
      const share = sharedServer({ years: [2026, 2025] });
      renderShare();

      const picker = await screen.findByRole('combobox', { name: 'Year' });
      expect(picker).toHaveValue('2026');

      await waitFor(() => expect(share.queriesFor('Completed')).toHaveLength(1));
      expect(share.queriesFor('Completed')[0]?.get('year')).toBe('2026');
      expect(share.queriesFor('Backlog')[0]?.has('year')).toBe(false);
      expect(share.queriesFor('OnHold')[0]?.has('year')).toBe(false);

      await userEvent.selectOptions(picker, '2025');

      await waitFor(() =>
        expect(share.queriesFor('Completed').at(-1)?.get('year')).toBe('2025'),
      );
    });
  });

  describe('the year row', () => {
    it('leads to the share’s Stats page when the share shows it', async () => {
      sharedServer({ years: [2026] });
      renderShare();

      expect(await screen.findByRole('link', { name: 'Stats for 2026' })).toHaveAttribute(
        'href',
        `/share/${TOKEN}/stats/2026`,
      );
    });

    it('offers no Stats when the share leaves them off', async () => {
      sharedServer({ board: { parts: ['Completed'] }, years: [2026] });
      renderShare();

      await screen.findByRole('combobox', { name: 'Year' });

      expect(screen.queryByRole('link', { name: /stats/i })).not.toBeInTheDocument();
    });
  });

  describe('the calendar', () => {
    it('is under the board when the share shows it', async () => {
      sharedServer({
        upcoming: [libraryItem({ title: 'Witchbrook', releaseDate: '2027-01-01', releaseEnd: '2027-03-31', releasePrecision: 'Quarter' })],
        years: [2026],
      });
      renderShare();

      const calendar = await screen.findByRole('region', { name: /^Coming soon/ });
      expect(await within(calendar).findByText('Witchbrook')).toBeInTheDocument();
    });

    it('folds for the visitor without remembering it, or it would fold their own board’s too', async () => {
      // Your board remembers its calendar folded, under the board's key in this browser. A share
      // is somebody else's board, so a fold there is the visitor's for as long as they look.
      sharedServer({
        upcoming: [libraryItem({ title: 'Witchbrook', releaseDate: '2027-01-01', releaseEnd: '2027-03-31', releasePrecision: 'Quarter' })],
        years: [2026],
      });
      renderShare();

      await userEvent.click(await screen.findByRole('button', { name: 'Collapse Coming soon' }));

      expect(await screen.findByRole('button', { name: 'Expand Coming soon' })).toBeInTheDocument();
      expect(localStorage.length).toBe(0);
    });

    it('is not there, and is never asked for, when the share leaves it off', async () => {
      const share = sharedServer({ board: { parts: ['Completed'] }, years: [2026] });
      renderShare();

      await screen.findByRole('combobox', { name: 'Year' });

      expect(screen.queryByRole('region', { name: /^Coming soon/ })).not.toBeInTheDocument();
      expect(share.asked.some((url) => url.pathname.endsWith('/upcoming'))).toBe(false);
    });
  });

  it('credits its data at its foot, because a visitor has no Settings to find it in', async () => {
    sharedServer({ years: [2026] });
    renderShare();

    expect(
      await screen.findByText(
        'Shared from HobbyTracker. Game data from IGDB, and estimates from HowLongToBeat.',
      ),
    ).toBeInTheDocument();
  });

  it('says a link that opens no board, without saying which way it failed', async () => {
    // An unknown link and a stopped one are the same 404, so this cannot say which, and says
    // what may have happened instead.
    deadShareServer();
    renderShare();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'This link doesn’t open a board' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Whoever shared it may have stopped sharing, or part of the address may be missing.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Make your own board' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('says a board that could not be reached is not a dead link, and asks again on Try again', async () => {
    // A server down for a deploy is not a link that opens no board, and saying it was would tell
    // the visitor to give up on a link that may be fine. The dead link's card, saying so, picked
    // from renders on 5 October 2026 over the app's red error line on an empty page.
    sharedServer({ years: [2026] });
    server.use(
      http.get(`/api/shared/${TOKEN}`, () => new HttpResponse(null, { status: 503 }), { once: true }),
    );
    renderShare();

    const card = await screen.findByRole('alert');
    expect(
      within(card).getByRole('heading', { level: 1, name: 'This board didn’t load' }),
    ).toBeInTheDocument();
    expect(
      within(card).getByText('HobbyTracker couldn’t be reached just now. The link itself may be fine.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('This link doesn’t open a board')).not.toBeInTheDocument();

    await userEvent.click(within(card).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Games' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('addresses nobody: no word written to the owner reaches it', async () => {
    // Every phrase the board writes to its owner, given something to say: a column to sort, a
    // comparison with a title missing hours, an empty calendar, and a pace this browser told
    // the drawer — which is the visitor's about their own board, and nothing to do with this.
    setPace('games', { hours: 2, per: 'day' });
    sharedServer({
      board: { name: 'Jimmy Dao' },
      columns: {
        Backlog: [libraryItem({ title: 'Celeste', lengthHours: 12.76 })],
        Completed: [libraryItem({ title: 'Tunic', currentStatus: 'Completed', latestRating: 9 })],
      },
      hours: { Backlog: { ...HOURS, played: null, playedLength: null, playedTitles: 0 }, Completed: HOURS },
      upcoming: [],
      years: [2026],
    });
    renderShare();

    await screen.findByText('Tunic');
    await screen.findByText('Nothing on this board is waiting to come out.');

    const main = screen.getByRole('main');
    expect(wordsOf(main)).not.toMatch(/\b(you|your|yours|my)\b/i);

    // And it does say what it has to, in the share's words.
    expect(within(main).getAllByText('Board order').length).toBeGreaterThan(0);
    expect(
      within(main).getByRole('img', { name: '213 hours played, against about 218 hours to beat' }),
    ).toBeInTheDocument();
    expect(within(main).getByText(/1 without hours logged/)).toBeInTheDocument();
    expect(within(main).queryByText(/a day$/)).not.toBeInTheDocument();
  });

  describe('on a phone', () => {
    it('shows one column at a time under the switcher, counted from the share’s own answers', async () => {
      windowOfWidth(390);
      const share = sharedServer({
        board: { parts: ['Completed'] },
        columns: {
          Backlog: [libraryItem({ title: 'Celeste' }), libraryItem({ title: 'Hades' })],
          Completed: [libraryItem({ title: 'Tunic', currentStatus: 'Completed' })],
        },
        years: [2026],
      });
      renderShare();

      const switcher = await screen.findByRole('radiogroup', { name: 'Columns' });
      expect(await within(switcher).findByRole('radio', { name: 'Backlog 2' })).toBeChecked();
      expect(await within(switcher).findByRole('radio', { name: 'Completed 1' })).not.toBeChecked();

      // One column on the screen, and the other's count came from asking the share for it.
      expect(screen.getAllByRole('region')).toHaveLength(1);
      expect(share.queriesFor('Completed').length).toBeGreaterThan(0);

      await userEvent.click(within(switcher).getByRole('radio', { name: 'Completed 1' }));

      expect(await screen.findByText('Tunic')).toBeInTheDocument();
      expect(screen.queryByText('Celeste')).not.toBeInTheDocument();
    });

    it('has nothing on it to carry anywhere', async () => {
      windowOfWidth(390);
      sharedServer({
        columns: { Backlog: [libraryItem({ title: 'Celeste' })] },
        years: [2026],
      });
      renderShare();

      const card = (await screen.findByRole('heading', { level: 3, name: 'Celeste' })).closest('li')!;

      expect(card).not.toHaveAttribute('tabindex');
      expect(document.querySelector('[aria-roledescription]')).toBeNull();
    });
  });
});
