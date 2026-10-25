import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { BoardPage } from '../board/BoardPage';
import { setColumnHidden } from '../board/hiddenColumns';
import { setPace } from '../lib/pace';
import { boardServer, libraryItem, libraryPage } from '../test/library';
import { gameDetail, journalServer, logEntry } from '../test/games';
import { BackButton, renderWithProviders } from '../test/render';
import { windowOfWidth } from '../test/media';
import { server } from '../test/server';
import type { LibraryItem, LogStatus } from '../api/types';

/**
 * "What should I play next?", through the board it opens from.
 *
 * The draw's arithmetic is `draw.test.ts`'s. This is the panel: where it opens from, what it
 * asks for, what it says, and what its answers do to the board.
 *
 * **`Math.random` answering 0 picks the first title in the board's order**, everywhere: the
 * wheel is drawn without a swap, the spin lands on its first slice, and three suggestions are
 * the first three. A test that needs another pick leaves the rest out of the draw instead, which
 * is how a person would get it.
 */

const BOARD_ROUTE = { route: '/board/games', path: '/board/:hobby' };
const QUESTION = 'What should I play next?';

/** Jimmy's Backlog on 25 October 2026, in its order, as the #16 workshop read it. */
const yours = (): LibraryItem[] => [
  libraryItem({
    mediaId: 907,
    title: 'Final Fantasy Resonance',
    lengthHours: null,
    genres: ['Adventure', 'Role-playing (RPG)'],
  }),
  libraryItem({
    mediaId: 936,
    title: 'The Witcher 3: Wild Hunt Remastered',
    lengthHours: 130.78,
    genres: ['Adventure', 'Role-playing (RPG)'],
  }),
  libraryItem({
    mediaId: 644,
    title: 'Shin Megami Tensei V: Vengeance',
    lengthHours: 67.64,
    genres: ['Adventure', 'Role-playing (RPG)'],
  }),
  libraryItem({
    mediaId: 512,
    title: 'Fire Emblem: Radiant Dawn',
    lengthHours: 48.07,
    genres: ['Role-playing (RPG)', 'Strategy', 'Tactical', 'Turn-based strategy (TBS)'],
  }),
  libraryItem({
    mediaId: 233,
    title: 'Armored Core VI: Fires of Rubicon',
    lengthHours: 28.37,
    genres: ['Shooter'],
  }),
  libraryItem({
    mediaId: 870,
    title: 'Onimusha: Way of the Sword',
    lengthHours: 29.15,
    genres: ['Adventure', "Hack and slash/Beat 'em up", 'Role-playing (RPG)'],
  }),
];

async function openPicker() {
  const backlog = await screen.findByRole('region', { name: /^Backlog/ });
  await userEvent.click(within(backlog).getByRole('button', { name: 'Pick' }));
  return screen.findByRole('dialog', { name: QUESTION });
}

/** Ends a spin as the browser does, when the wheel's turn finishes. jsdom runs no transitions. */
function land() {
  fireEvent.transitionEnd(document.querySelector('[data-wheel]')!);
}

/** A desktop whose reader asked for reduced motion, where the pick shows with no spin. */
const stillWindow = () => windowOfWidth(1440, { reducedMotion: true });

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('What should I play next?', () => {
  it("opens from Backlog's header, beside its sort control, and from no other column", async () => {
    // The user's pick at the #16 workshop, over a sentence under the search box: next to the
    // column it picks from, at the cost of a wrapped heading at 1280 and 1440.
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const backlog = await screen.findByRole('region', { name: /^Backlog/ });
    const button = within(backlog).getByRole('button', { name: 'Pick' });
    const sort = within(backlog).getByRole('combobox', { name: 'Backlog order' });

    // Named for what it says, so a voice asking for "Pick" finds it, and described by the
    // question, which is also its tooltip.
    expect(button).toHaveAccessibleDescription(QUESTION);
    expect(button.compareDocumentPosition(sort) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      within(screen.getByRole('region', { name: /^Playing/ })).queryByRole('button', {
        name: 'Pick',
      }),
    ).not.toBeInTheDocument();
  });

  it('draws from the whole Backlog, so the 101st title can be picked', async () => {
    // A column loads a page of 100. The picker reads the column to its end, as the strip's
    // library does, or the 101st title could never come up.
    stillWindow();
    const rpgs = Array.from({ length: 100 }, (_, i) =>
      libraryItem({ title: `An RPG ${i + 1}`, genres: ['Role-playing (RPG)'] }),
    );
    const last = libraryItem({ title: 'Armored Core VI: Fires of Rubicon', genres: ['Shooter'] });
    boardServer({ columns: { Backlog: [...rpgs, last] } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    expect(
      await within(dialog).findByText('101 in the draw, 8 of them on the wheel at a time'),
    ).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: /^RPG 100/ }));
    expect(within(dialog).getByText('1 of 101 in the draw')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Spin' }));

    expect(
      within(dialog).getByRole('button', { name: 'Armored Core VI: Fires of Rubicon' }),
    ).toBeInTheDocument();
  });

  it('counts each band, and leaves a title with no estimate to Any alone', async () => {
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    const lengths = within(dialog).getByRole('radiogroup', { name: 'How long do you want to play?' });
    // By name and then by what else the chip says, because jsdom spaces child elements in a name
    // whatever the markup does. Not followed by a digit, so 3 cannot pass for 30.
    const chip = (name: RegExp) => within(lengths).getByRole('radio', { name });

    expect(within(lengths).getAllByRole('radio')).toHaveLength(5);
    expect(chip(/^Any 6(?!\d)/)).toBeChecked();
    expect(chip(/^An evening 0(?!\d)/)).toHaveTextContent('under 5 h');
    expect(chip(/^A weekend 0(?!\d)/)).toHaveTextContent('5–20 h');
    expect(chip(/^A few weeks 3(?!\d)/)).toHaveTextContent('20–50 h');
    expect(chip(/^A long haul 2(?!\d)/)).toHaveTextContent('50 h or more');

    await userEvent.click(within(lengths).getByRole('radio', { name: /^A few weeks/ }));

    expect(within(lengths).getByRole('radio', { name: /^A few weeks/ })).toBeChecked();
    expect(
      within(dialog).getByText('3 of 6 in the draw · 1 with no estimate, only under Any'),
    ).toBeInTheDocument();
  });

  it('leaves out the genres pressed, by the genre each card is painted as', async () => {
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    const leaveOut = within(dialog).getByRole('group', { name: 'Leave out' });

    expect(
      within(leaveOut)
        .getAllByRole('button')
        .map((chip) => chip.textContent),
    ).toEqual(['RPG 5', 'Shooter 1']);

    await userEvent.click(within(leaveOut).getByRole('button', { name: /^RPG/ }));

    expect(within(leaveOut).getByRole('button', { name: /^RPG/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(dialog).getByText('1 of 6 in the draw')).toBeInTheDocument();
  });

  it('says when nothing is left, spins nothing, and puts the filters back', async () => {
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    const leaveOut = within(dialog).getByRole('group', { name: 'Leave out' });
    await userEvent.click(within(leaveOut).getByRole('button', { name: /^RPG/ }));
    await userEvent.click(within(leaveOut).getByRole('button', { name: /^Shooter/ }));

    expect(
      within(dialog).getByText('Nothing in your backlog is left in the draw.', { exact: false }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Spin' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Suggest three' })).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Clear the filters' }));

    expect(within(dialog).getByText('6 in the draw')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Spin' })).toBeInTheDocument();
  });

  it('lands where it was told once the wheel stops turning, and hands the keyboard to Start playing', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    await within(dialog).findByText('6 in the draw');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Spin' }));

    // Turning: nothing is said until it stops.
    expect(within(dialog).getByRole('button', { name: 'Spinning…' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Start playing' })).not.toBeInTheDocument();

    land();

    expect(
      within(dialog).getByRole('button', { name: 'Final Fantasy Resonance' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Start playing' })).toHaveFocus();
  });

  it('shows the pick at once under reduced motion, and the same pick the spin lands on', async () => {
    // The pick is made before anything moves, so motion changes how it arrives and never which.
    stillWindow();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    await within(dialog).findByText('6 in the draw');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Spin' }));

    expect(
      within(dialog).getByRole('button', { name: 'Final Fantasy Resonance' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Start playing' })).toHaveFocus();
  });

  it('announces where the wheel landed', async () => {
    stillWindow();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    await within(dialog).findByText('6 in the draw');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Spin' }));

    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Landed on Final Fantasy Resonance',
    );
  });

  it('takes a game said no to out of the draw, and never lands on it again', async () => {
    // Not this one, the workshop's pick over the plan's Spin again: each press narrows the draw,
    // where keeping every slice let three spins land on one game, another, and the first again.
    stillWindow();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    await within(dialog).findByText('6 in the draw');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Spin' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Not this one' }));

    expect(within(dialog).getByText('5 of 6 in the draw')).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Final Fantasy Resonance' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'The Witcher 3: Wild Hunt Remastered' }),
    ).toBeInTheDocument();
  });

  it("starts playing the pick through the board's own move, and closes", async () => {
    stillWindow();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const board = boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    await within(dialog).findByText('6 in the draw');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Spin' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Start playing' }));

    await waitFor(() =>
      expect(board.transitions).toContainEqual({ mediaId: 907, status: 'InProgress' }),
    );
    expect(screen.queryByRole('dialog', { name: QUESTION })).not.toBeInTheDocument();
  });

  it('offers no Start playing while Playing is taken off the board', async () => {
    // A move to a column the board is not drawing sends the card off screen, which reads as the
    // picker losing it: the card menu's rule.
    setColumnHidden('games', 'InProgress', true);
    stillWindow();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    await within(dialog).findByText('6 in the draw');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Spin' }));

    expect(within(dialog).queryByRole('button', { name: 'Start playing' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Not this one' })).toHaveFocus();
  });

  it("says how long the pick would take at the pace you gave How long will it take me?", async () => {
    stillWindow();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    setPace('games', { hours: 2, per: 'day' });
    const [first, ...rest] = yours();
    const core = rest.find((item) => item.title.startsWith('Armored Core'))!;
    boardServer({ columns: { Backlog: [core, first!] } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    await within(dialog).findByText('2 in the draw');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Spin' }));

    // 28.37 hours at 2 a day: 14.2 days, so 15, counted as Backlog's line counts them.
    expect(within(dialog).getByText('~28.37 h · Shooter')).toBeInTheDocument();
    expect(within(dialog).getByText('15 days at 2 h a day')).toBeInTheDocument();
  });

  it('suggests three from the draw, then three others', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    await within(dialog).findByText('6 in the draw');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suggest three' }));

    const suggested = () =>
      within(within(dialog).getByRole('list', { name: 'Three suggestions' }))
        .getAllByRole('listitem')
        .map((row) => within(row).getAllByRole('button')[0]!.textContent);

    expect(suggested()).toEqual([
      'Final Fantasy Resonance',
      'The Witcher 3: Wild Hunt Remastered',
      'Shin Megami Tensei V: Vengeance',
    ]);
    expect(within(dialog).getAllByRole('button', { name: 'Start playing' })).toHaveLength(3);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Three more' }));

    expect(suggested()).toEqual([
      'Fire Emblem: Radiant Dawn',
      'Armored Core VI: Fires of Rubicon',
      'Onimusha: Way of the Sword',
    ]);
  });

  it("opens the pick's journal from its name, and goes back to the pick after it", async () => {
    stillWindow();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    boardServer({ columns: { Backlog: yours() } });
    journalServer({ detail: gameDetail({ id: 907, title: 'Final Fantasy Resonance' }) });
    renderWithProviders(
      <>
        <BoardPage />
        <BackButton />
      </>,
      BOARD_ROUTE,
    );

    const dialog = await openPicker();
    await within(dialog).findByText('6 in the draw');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Spin' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Final Fantasy Resonance' }));

    // The journal over the board, and the picker out of the way under it.
    expect(await screen.findByRole('spinbutton', { name: 'Exact rating' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: QUESTION })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'go back' }));

    // Back where it was, the same pick, with the keyboard on its name.
    const again = await screen.findByRole('dialog', { name: QUESTION });
    const name = within(again).getByRole('button', { name: 'Final Fantasy Resonance' });
    expect(name).toBeInTheDocument();
    await waitFor(() => expect(name).toHaveFocus());
  });

  it('keeps Escape in the journal a pick opened for the journal, and comes back to the pick', async () => {
    // Covered by the journal, the picker takes no keys. Listening, it would close itself on the
    // same Escape, and the two closes would walk Back off the board.
    stillWindow();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    boardServer({ columns: { Backlog: yours() } });
    journalServer({ detail: gameDetail({ id: 907, title: 'Final Fantasy Resonance' }) });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();
    await within(dialog).findByText('6 in the draw');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Spin' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Final Fantasy Resonance' }));
    await screen.findByRole('spinbutton', { name: 'Exact rating' });

    await userEvent.keyboard('{Escape}');

    const again = await screen.findByRole('dialog', { name: QUESTION });
    expect(
      within(again).getByRole('button', { name: 'Final Fantasy Resonance' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: 'Exact rating' })).not.toBeInTheDocument();
  });

  it('takes a title moved from the journal a pick opened out of the draw', async () => {
    // The journal's heading moves a title. The whole column is kept under the column's own key,
    // so the move settles it without naming it, and the picker it goes back to is up to date.
    stillWindow();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    boardServer();
    const moved = new Set<number>();
    server.use(
      http.get('/api/library/upcoming', () => HttpResponse.json([])),
      http.get('/api/library', ({ request }) => {
        const status = new URL(request.url).searchParams.get('status') as LogStatus | null;
        const items = yours().filter((item) =>
          status === 'Backlog' ? !moved.has(item.mediaId) : status === 'InProgress' && moved.has(item.mediaId),
        );
        return HttpResponse.json(libraryPage(items));
      }),
      http.post('/api/library/:mediaId/status', ({ params }) => {
        moved.add(Number(params['mediaId']));
        return HttpResponse.json(libraryItem({ mediaId: Number(params['mediaId']), currentStatus: 'InProgress' }));
      }),
    );
    journalServer({
      detail: gameDetail({
        id: 907,
        title: 'Final Fantasy Resonance',
        logEntries: [logEntry({ id: 7, mediaId: 907, status: 'Backlog' })],
      }),
    });
    renderWithProviders(
      <>
        <BoardPage />
        <BackButton />
      </>,
      BOARD_ROUTE,
    );

    const dialog = await openPicker();
    await within(dialog).findByText('6 in the draw');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Spin' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Final Fantasy Resonance' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Column: Backlog' }));
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Move to' })).getByRole('button', { name: 'Playing' }),
    );
    await waitFor(() => expect(moved.has(907)).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: 'go back' }));

    const again = await screen.findByRole('dialog', { name: QUESTION });
    expect(await within(again).findByText('5 in the draw')).toBeInTheDocument();
    expect(
      within(again).queryByRole('button', { name: 'Final Fantasy Resonance' }),
    ).not.toBeInTheDocument();
  });

  it('closes on Escape and hands the keyboard back to Pick', async () => {
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    await openPicker();
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: QUESTION })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pick' })).toHaveFocus());
  });

  it('closes on Back, as the journal does, and leaves the board as it was', async () => {
    // Android has one Back, and it means "out of this". The panel's openness is a history entry
    // so the press has something of its own to pop, which is useOverlayHistory's whole job.
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(
      <>
        <BoardPage />
        <BackButton />
      </>,
      BOARD_ROUTE,
    );

    await openPicker();
    await userEvent.click(screen.getByRole('button', { name: 'go back' }));

    expect(screen.queryByRole('dialog', { name: QUESTION })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Backlog 6' })).toBeInTheDocument();
  });

  it('opens beside the sort control on a phone too', async () => {
    windowOfWidth(390);
    boardServer({ columns: { Backlog: yours() } });
    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const dialog = await openPicker();

    expect(await within(dialog).findByText('6 in the draw')).toBeInTheDocument();
  });

  it('is not offered on a board whose hobby has no picker yet', async () => {
    // Games first, as every feature since 1 October 2026: a films board would ask what to watch.
    boardServer({
      hobby: 'movies',
      columns: { Backlog: [libraryItem({ title: 'Aftersun', hobby: 'movies' })] },
    });
    renderWithProviders(<BoardPage />, { route: '/board/movies', path: '/board/:hobby' });

    await screen.findByText('Aftersun');

    expect(screen.queryByRole('button', { name: 'Pick' })).not.toBeInTheDocument();
  });
});
