import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Column } from './Column';
import { columnsFor } from '../hobbies';
import { setPace } from '../lib/pace';
import { server } from '../test/server';
import { NO_HOURS, boardServer, libraryItem, libraryPage } from '../test/library';

/**
 * The estimate poll, with its two durations compressed.
 *
 * Real timers, because MSW answers through real async: under a global fake clock the column
 * never receives the data whose arrival is the whole thing being tested, and the test hangs
 * rather than failing. Only the durations are stubbed — the wiring under test is the real
 * `refetchInterval`, the real budget and the real `waitingOn`.
 */
vi.mock('./estimates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./estimates')>()),
  ESTIMATE_POLL_MS: 20,
  ESTIMATE_POLL_BUDGET_MS: 300,
}));

/** Long enough for several polls to have happened, had any been scheduled. */
const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
import { renderWithProviders } from '../test/render';
import type { LibrarySort, LogStatus } from '../api/types';

function renderColumn(
  props: Partial<Parameters<typeof Column>[0]> & { status: LogStatus; label: string },
) {
  return renderWithProviders(
    <Column
      hobby="games"
      sort="manual"
      onSortChange={vi.fn()}
      onMove={vi.fn()}
      removal={{ mediaId: null, onAsk: vi.fn(), onCancel: vi.fn(), onConfirm: vi.fn() }}
      leaving={{
        mediaId: null,
        to: null,
        onReplay: vi.fn(),
        onPutBack: vi.fn(),
        onStay: vi.fn(),
      }}
      menu={{ mediaId: null, onOpen: vi.fn(), onClose: vi.fn(), columns: columnsFor('games') }}
      onOpen={vi.fn()}
      {...props}
    />,
    { dnd: true },
  );
}

describe('Column', () => {

  it('asks for its own column of its own hobby, and makes one request to do it', async () => {
    const board = boardServer({ columns: { InProgress: [libraryItem({ title: 'Hades' })] } });

    renderColumn({ status: 'InProgress', label: 'Playing' });
    await screen.findByText('Hades');

    const [query, ...rest] = board.queriesFor('InProgress');
    expect(rest).toHaveLength(0);
    expect(query?.get('hobby')).toBe('games');
    expect(query?.get('status')).toBe('InProgress');
  });

  it('sends no year unless it has been given one', async () => {
    // A column narrows itself by simply not asking. Which columns are given a year is the
    // board's decision — see `yearFor` — and this is the half of that which lives here.
    const board = boardServer({ columns: { Backlog: [libraryItem({ title: 'Celeste' })] } });

    renderColumn({ status: 'Backlog', label: 'Backlog' });
    await screen.findByText('Celeste');

    expect(board.queriesFor('Backlog')[0]?.has('year')).toBe(false);
  });

  it('narrows to a year when one is chosen', async () => {
    const board = boardServer({ columns: { Completed: [libraryItem({ title: 'Outer Wilds' })] } });

    renderColumn({ status: 'Completed', label: 'Completed', year: 2026 });
    await screen.findByText('Outer Wilds');

    expect(board.queriesFor('Completed')[0]?.get('year')).toBe('2026');
  });

  it.each<LibrarySort>(['manual', 'added', 'title', 'rating'])('passes the %s sort through', async (sort) => {
    const board = boardServer({ columns: { Backlog: [libraryItem({ title: 'Celeste' })] } });

    renderColumn({ status: 'Backlog', label: 'Backlog', sort });
    await screen.findByText('Celeste');

    expect(board.queriesFor('Backlog')[0]?.get('sort')).toBe(sort);
  });

  it('counts what the collection holds, not what fits on the page', async () => {
    boardServer({
      columns: { Backlog: [libraryItem({ title: 'Celeste' }), libraryItem({ title: 'Hades' })] },
    });

    renderColumn({ status: 'Backlog', label: 'Backlog' });

    expect(await screen.findByRole('heading', { name: 'Backlog 2' })).toBeInTheDocument();
  });

  it('says so when the page does not hold the whole column', async () => {
    boardServer();
    server.use(
      http.get('/api/library', () =>
        HttpResponse.json(libraryPage([libraryItem({ title: 'Celeste' })], { total: 140 })),
      ),
    );

    renderColumn({ status: 'Backlog', label: 'Backlog' });

    expect(await screen.findByText('Showing 1 of 140')).toBeInTheDocument();
  });

  it('says under its heading how long its titles take, in words that read aloud', async () => {
    boardServer({
      columns: { Backlog: [libraryItem({ title: 'Celeste' }), libraryItem({ title: 'Hades' })] },
      hours: { Backlog: { ...NO_HOURS, length: 61.82, lengthTitles: 2 } },
    });

    renderColumn({ status: 'Backlog', label: 'Backlog' });

    // "~62 h" read aloud is a tilde and a letter. The line says it in words, as a card's own
    // length badge does.
    const line = await screen.findByRole('img', { name: 'About 62 hours to beat' });
    expect(line).toHaveTextContent('~62 h to beat');

    // Under the heading's row rather than in it: the heading and its sort control stay exactly
    // where they were, which is why this placement was picked over the two that shared the row.
    const sort = screen.getByRole('combobox', { name: 'Backlog order' });
    expect(sort.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // And it is not part of the heading, which is what names the column's region.
    expect(screen.getByRole('heading', { name: 'Backlog 2' })).toBeInTheDocument();
  });

  it('compares your hours with the estimate on Completed, over two lines', async () => {
    boardServer({
      columns: {
        Completed: [
          libraryItem({ title: 'Celeste', currentStatus: 'Completed' }),
          libraryItem({ title: 'Outer Wilds', currentStatus: 'Completed' }),
          libraryItem({ title: 'Hi-Fi Rush', currentStatus: 'Completed' }),
        ],
      },
      hours: {
        Completed: {
          length: 50,
          lengthTitles: 3,
          played: 35.5,
          playedLength: 37,
          playedTitles: 2,
        },
      },
    });

    renderColumn({ status: 'Completed', label: 'Completed' });

    expect(
      await screen.findByRole('img', {
        name: 'You played 36 hours, against about 37 hours to beat',
      }),
    ).toHaveTextContent('36 h played vs ~37 h to beat');
    expect(
      screen.getByRole('img', { name: 'over 2 games, 1 without your hours' }),
    ).toHaveTextContent('over 2 games · 1 without your hours');
  });

  it('says how long the backlog would take at your pace, and hears a new one', async () => {
    // The pace is given in a drawer, over the board, so the column has to hear it change rather
    // than read it once: answering the question is what makes the line appear.
    boardServer({
      columns: { Backlog: [libraryItem({ title: 'Celeste' }), libraryItem({ title: 'Hades' })] },
      hours: { Backlog: { ...NO_HOURS, length: 61.82, lengthTitles: 2 } },
    });

    try {
      renderColumn({ status: 'Backlog', label: 'Backlog' });
      await screen.findByRole('img', { name: 'About 62 hours to beat' });
      expect(screen.queryByRole('img', { name: /a day/ })).not.toBeInTheDocument();

      act(() => setPace('games', { hours: 2, per: 'day' }));

      expect(
        await screen.findByRole('img', { name: '31 days at 2 hours a day' }),
      ).toHaveTextContent('31 days at 2 h a day');
    } finally {
      localStorage.clear();
    }
  });

  it('says nothing about hours on a board whose hobby has no words for them yet', async () => {
    // Games only, by the user's choice. A films column handed the same answer prints no line,
    // where a fallback to the games words would print one about beating a film.
    boardServer({
      hobby: 'movies',
      columns: { Backlog: [libraryItem({ title: 'Arrival', hobby: 'movies' })] },
      hours: { Backlog: { ...NO_HOURS, length: 1.93, lengthTitles: 1 } },
    });

    renderColumn({ hobby: 'movies', status: 'Backlog', label: 'Backlog' });
    await screen.findByText('Arrival');

    expect(screen.queryByRole('img', { name: /hours/ })).not.toBeInTheDocument();
  });

  it('says the column is empty rather than showing nothing at all', async () => {
    boardServer();

    renderColumn({ status: 'Backlog', label: 'Backlog' });

    expect(await screen.findByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('renders a card per title', async () => {
    boardServer({
      columns: { Backlog: [libraryItem({ title: 'Celeste' }), libraryItem({ title: 'Hades' })] },
    });

    renderColumn({ status: 'Backlog', label: 'Backlog' });

    expect(await screen.findByText('Celeste')).toBeInTheDocument();
    expect(screen.getByText('Hades')).toBeInTheDocument();
  });

  it('asks again while a title is still waiting on HowLongToBeat', async () => {
    // Adding a title replies before the lookup has begun, so the hours land on the row seconds
    // after the card is already on screen. Without this the card stays blank until a drag, a
    // note or a reload happens to refetch the column — which is to say, until you go and do
    // something unrelated.
    const board = boardServer({
      columns: { Backlog: [libraryItem({ title: 'Celeste', hltbPending: true })] },
    });

    renderColumn({ status: 'Backlog', label: 'Backlog' });
    await screen.findByText('Celeste');

    await waitFor(() => expect(board.queriesFor('Backlog').length).toBeGreaterThan(1));
  });

  it('does not ask again when nothing is waiting', async () => {
    // The half that keeps this from being a permanent poll. Most of the board is settled most of
    // the time, and a column that asked anyway would be asking for the life of the session.
    const board = boardServer({
      columns: { Backlog: [libraryItem({ title: 'Celeste', hltbPending: false })] },
    });

    renderColumn({ status: 'Backlog', label: 'Backlog' });
    await screen.findByText('Celeste');

    await settle(150);

    expect(board.queriesFor('Backlog')).toHaveLength(1);
  });

  it('gives up on a title no answer is ever coming for', async () => {
    // hltb_checked_at stays null when the worker is switched off or the site is refusing us, so
    // "still pending" is not by itself a promise that the waiting ends. The budget is what stops
    // a board asking for the rest of the session about an answer nobody is bringing.
    const board = boardServer({
      columns: { Backlog: [libraryItem({ title: 'Celeste', hltbPending: true })] },
    });

    renderColumn({ status: 'Backlog', label: 'Backlog' });
    await waitFor(() => expect(board.queriesFor('Backlog').length).toBeGreaterThan(1));

    // Past the budget, and then a good while longer with nothing further asked.
    await settle(500);
    const asked = board.queriesFor('Backlog').length;
    await settle(200);

    expect(board.queriesFor('Backlog')).toHaveLength(asked);
  });

  it('has no year control of its own, because the board owns the one there is', async () => {
    // One control over every column, so it cannot live inside one of them. What a column still
    // owns is its sort, which genuinely is per column.
    boardServer({ years: [2026] });

    renderColumn({ status: 'Completed', label: 'Completed', year: 2026 });
    await screen.findByText('Nothing here yet.');

    expect(screen.queryByRole('combobox', { name: 'Year' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Completed order' })).toBeInTheDocument();
  });

  it('keeps its count visible while collapsed, and hides only the cards', async () => {
    boardServer({ columns: { Dropped: [libraryItem({ title: 'Anthem' })] } });

    const { container } = renderColumn({
      status: 'Dropped',
      label: 'Dropped',
      collapsed: true,
      onToggleCollapse: vi.fn(),
    });

    expect(await screen.findByRole('heading', { name: 'Dropped 1' })).toBeInTheDocument();
    expect(screen.queryByText('Anthem')).not.toBeInTheDocument();
    expect(within(container).getByRole('button', { name: 'Show Dropped' })).toBeInTheDocument();
  });
});
