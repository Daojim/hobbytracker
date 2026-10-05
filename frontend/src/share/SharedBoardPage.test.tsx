import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SharedBoardPage } from './SharedBoardPage';
import { setColumnHidden } from '../board/hiddenColumns';
import { setPace } from '../lib/pace';
import { libraryItem } from '../test/library';
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
            libraryItem({ title: 'Celeste', latestRating: 9.5, latestNotePreview: 'A NOTE' }),
          ],
        },
        years: [2026],
      });
      renderShare();

      const card = (await screen.findByRole('heading', { level: 3, name: 'Celeste' })).closest('li')!;

      expect(within(card).queryByRole('button')).not.toBeInTheDocument();
      expect(within(card).getByRole('img', { name: 'Rated 9.5 out of 10' })).toBeInTheDocument();
      expect(screen.queryByText('A NOTE')).not.toBeInTheDocument();

      // dnd-kit stamps every sortable it registers with this; a share registers none.
      expect(document.querySelector('[aria-roledescription]')).toBeNull();
    });

    it('folds Dropped side by side, as your board does', async () => {
      sharedServer({
        board: { parts: ['Dropped'] },
        columns: { Dropped: [libraryItem({ title: 'Spiritfarer', currentStatus: 'Dropped' })] },
        years: [2026],
      });
      renderShare();

      const show = await screen.findByRole('button', { name: 'Show Dropped' });
      expect(screen.queryByText('Spiritfarer')).not.toBeInTheDocument();

      await userEvent.click(show);

      expect(await screen.findByText('Spiritfarer')).toBeInTheDocument();
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

      await userEvent.click(await screen.findByRole('button', { name: 'Hide Coming soon' }));

      expect(await screen.findByRole('button', { name: 'Show Coming soon' })).toBeInTheDocument();
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
