import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardPage } from './BoardPage';
import { boardServer, libraryItem } from '../test/library';
import { gameDetail, journalServer, logEntry } from '../test/games';
import { BackButton, renderWithProviders } from '../test/render';

/** The board, with something on it to press Back with. */
function boardWithBack() {
  return renderWithProviders(
    <>
      <BoardPage />
      <BackButton />
    </>,
  );
}

describe('BoardPage', () => {
  it('opens with Dropped, then the three columns a title moves through', async () => {
    // Dropped is not a stage of that progression — it is where the titles that left it go — so
    // it sits ahead of the three rather than after them, off the path the eye takes across a
    // board it reads left to right. Still collapsed, still muted; only the place has changed.
    boardServer();

    renderWithProviders(<BoardPage />);
    await screen.findByRole('heading', { name: 'Backlog 0' });

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Dropped 0', 'Backlog 0', 'Playing 0', 'Completed 0']);
  });

  it('puts one year control above the board rather than one in a column', async () => {
    // It used to sit in the Completed column's header, because completed_at was the only date
    // the year meant. Now that it narrows three of the four columns, a control living inside
    // one of them would be claiming to be about that column alone.
    boardServer({ years: [2026] });

    renderWithProviders(<BoardPage />);

    const picker = await screen.findByRole('combobox', { name: 'Year' });
    expect(screen.getAllByRole('combobox', { name: 'Year' })).toHaveLength(1);
    expect(
      within(screen.getByRole('region', { name: 'Completed 0' })).queryByRole('combobox', {
        name: 'Year',
      }),
    ).not.toBeInTheDocument();
    expect(picker).toHaveValue('2026');
  });

  it('opens on the latest year there is, not on all of them', async () => {
    // The board is a record of a year, and the year you are in is the one you are adding to.
    // "All years" is still there and is one choice away; it is just not where you start.
    const board = boardServer({ years: [2026, 2024, 2019] });

    renderWithProviders(<BoardPage />);
    await screen.findByRole('combobox', { name: 'Year' });

    await waitFor(() => expect(board.queriesFor('Completed')[0]?.get('year')).toBe('2026'));
  });

  it('narrows three columns by the year and leaves the backlog out of it', async () => {
    // A Backlog entry has both timestamps cleared by the rule that puts it there, so it belongs
    // to no year at all — and a Backlog narrowed by one would be an empty well on every year
    // rather than the queue you drag out of while reading a past one.
    const board = boardServer({ years: [2026] });

    renderWithProviders(<BoardPage />);
    await screen.findByRole('combobox', { name: 'Year' });

    await waitFor(() => expect(board.queriesFor('Completed')[0]?.get('year')).toBe('2026'));
    expect(board.queriesFor('InProgress')[0]?.get('year')).toBe('2026');
    expect(board.queriesFor('Dropped')[0]?.get('year')).toBe('2026');
    expect(board.queriesFor('Backlog')[0]?.has('year')).toBe(false);
  });

  it('takes the year off every request when All years is chosen', async () => {
    const board = boardServer({ years: [2026, 2024] });

    renderWithProviders(<BoardPage />);
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Year' }),
      'All years',
    );

    await waitFor(() => expect(board.queriesFor('Completed').at(-1)?.has('year')).toBe(false));
  });

  it('collapses Dropped until asked, and still says how much is in it', async () => {
    boardServer({ columns: { Dropped: [libraryItem({ title: 'Anthem' })] } });

    renderWithProviders(<BoardPage />);

    expect(await screen.findByRole('heading', { name: 'Dropped 1' })).toBeInTheDocument();
    expect(screen.queryByText('Anthem')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show Dropped' }));

    expect(await screen.findByText('Anthem')).toBeInTheDocument();
  });

  it('opens the journal for the card you asked about', async () => {
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3003, title: 'Celeste' })] } });
    journalServer({
      detail: gameDetail({ title: 'Celeste', logEntries: [logEntry({ id: 7, rating: 8.5 })] }),
    });

    renderWithProviders(<BoardPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Celeste' }));

    // The drawer sits over the board rather than replacing it — the columns are still there.
    expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(await screen.findByRole('spinbutton', { name: 'Exact rating' })).toHaveValue(8.5);
    expect(screen.getByRole('heading', { name: 'Backlog 1' })).toBeInTheDocument();
  });

  it('refetches only the column whose sort changed', async () => {
    // Each column is its own request, which is the whole reason a sort or a year on one of them
    // costs nothing on the other three.
    const board = boardServer({ columns: { Backlog: [libraryItem({ title: 'Celeste' })] } });

    renderWithProviders(<BoardPage />);
    await screen.findByText('Celeste');
    const playingBefore = board.queriesFor('InProgress').length;

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Backlog order' }),
      'title',
    );

    await expect
      .poll(() => board.queriesFor('Backlog').map((query) => query.get('sort')))
      .toEqual(['manual', 'title']);
    expect(board.queriesFor('InProgress')).toHaveLength(playingBefore);
  });

  it('hands focus back to the card when the drawer closes', async () => {
    // Storing the id rather than the element, because refetches remount the card while the
    // drawer is open and the node captured at open time is usually detached by now.
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3003, title: 'Celeste' })] } });
    journalServer({ detail: gameDetail({ title: 'Celeste' }) });

    renderWithProviders(<BoardPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Celeste' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Celeste' })).toHaveFocus(),
    );
  });

  it('closes the journal when the browser goes back, rather than leaving the board', async () => {
    // On a phone, Back is the gesture for "out of this", and an open drawer is the innermost
    // this. Its openness is a history entry precisely so that press has something of its own to
    // pop — without one it pops the board, which on Android is the whole app going away.
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3003, title: 'Celeste' })] } });
    journalServer({ detail: gameDetail({ title: 'Celeste' }) });

    boardWithBack();
    await userEvent.click(await screen.findByRole('button', { name: 'Celeste' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'go back' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // And what is behind it is the board that was there, still showing its one card.
    expect(screen.getByRole('heading', { name: 'Backlog 1' })).toBeInTheDocument();
  });

  it('keeps one card asking at a time, however many are on the board', async () => {
    // Which card has its options open lives here rather than in the card, so opening a second
    // one closes the first without either of them knowing about the other. Two open menus on
    // one board would be two questions nobody asked.
    boardServer({
      columns: {
        Backlog: [
          libraryItem({ mediaId: 3001, title: 'Celeste' }),
          libraryItem({ mediaId: 3002, title: 'Hollow Knight' }),
        ],
      },
    });

    renderWithProviders(<BoardPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Options for Celeste' }));
    expect(screen.getByRole('group', { name: 'Options for Celeste' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Options for Hollow Knight' }));

    expect(screen.getByRole('group', { name: 'Options for Hollow Knight' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Options for Celeste' })).not.toBeInTheDocument();
  });

  it('moves a title to the column it was told, without a drag', async () => {
    // The whole point. jsdom has no layout and no pointer events, so this is the only layer
    // that can say a move happened without one — the drag itself belongs to Playwright.
    const board = boardServer({
      columns: { Backlog: [libraryItem({ mediaId: 3001, title: 'Celeste' })] },
    });

    renderWithProviders(<BoardPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Options for Celeste' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move to Completed' }));

    await waitFor(() =>
      expect(board.transitions).toContainEqual({ mediaId: 3001, status: 'Completed' }),
    );
  });

  it('closes the options on Escape and hands the keyboard back to the corner', async () => {
    // Focus goes back by id rather than to a stored element, for the reason the drawer does:
    // a refetch remounts the card, and the node the menu was opened from is then detached.
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3001, title: 'Celeste' })] } });

    renderWithProviders(<BoardPage />);
    const corner = await screen.findByRole('button', { name: 'Options for Celeste' });
    await userEvent.click(corner);

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('group', { name: 'Options for Celeste' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Options for Celeste' })).toHaveFocus();
  });

  it('closes the options when the press lands somewhere else', async () => {
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3001, title: 'Celeste' })] } });

    renderWithProviders(<BoardPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Options for Celeste' }));

    await userEvent.click(screen.getByRole('heading', { name: 'Playing 0' }));

    expect(screen.queryByRole('group', { name: 'Options for Celeste' })).not.toBeInTheDocument();
  });
});
