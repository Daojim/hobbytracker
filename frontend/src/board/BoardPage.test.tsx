import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
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
    expect(await screen.findByRole('spinbutton', { name: 'Rating' })).toHaveValue(8.5);
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
});
