import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardPage } from './BoardPage';
import { boardServer, libraryItem } from '../test/library';
import { gameDetail, journalServer, logEntry } from '../test/games';
import { renderWithProviders } from '../test/render';

describe('BoardPage', () => {
  it('lays the four columns out in the order a title moves through them', async () => {
    boardServer();

    renderWithProviders(<BoardPage />);
    await screen.findByRole('heading', { name: 'Backlog 0' });

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Backlog 0', 'Playing 0', 'Completed 0', 'Dropped 0']);
  });

  it('puts the year picker above Completed and nowhere else', async () => {
    // Backlog and Playing have no completion date to filter on, so a year control over them
    // would be a question with no answer.
    boardServer({ years: [2026] });

    renderWithProviders(<BoardPage />);

    const picker = await screen.findByRole('combobox', { name: 'Completed year' });
    const completed = screen.getByRole('region', { name: 'Completed 0' });
    expect(within(completed).getByRole('combobox', { name: 'Completed year' })).toBe(picker);
    expect(screen.getAllByRole('combobox', { name: 'Completed year' })).toHaveLength(1);
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
