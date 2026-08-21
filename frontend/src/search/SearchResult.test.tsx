import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchResult } from './SearchResult';
import { game } from '../test/games';

function renderResult(props: Partial<Parameters<typeof SearchResult>[0]> = {}) {
  const onAdd = vi.fn();
  render(
    <SearchResult game={game()} onBoard={false} adding={false} onAdd={onAdd} {...props} />,
  );
  return { onAdd };
}

describe('SearchResult', () => {
  it('says what the game is and who made it', () => {
    renderResult({
      game: game({ title: 'Celeste', platforms: ['PC', 'Switch'], developers: ['Extremely OK Games'] }),
    });

    expect(screen.getByRole('heading', { name: 'Celeste' })).toBeInTheDocument();
    expect(screen.getByText('PC, Switch')).toBeInTheDocument();
    expect(screen.getByText('Extremely OK Games')).toBeInTheDocument();
  });

  it('offers to put it on the board', async () => {
    const { onAdd } = renderResult({ game: game({ id: 3003, title: 'Hollow Knight' }) });

    await userEvent.click(screen.getByRole('button', { name: 'Add Hollow Knight to backlog' }));

    expect(onAdd).toHaveBeenCalledExactlyOnceWith(3003);
  });

  it('says so instead when it is already there, rather than offering to add it twice', () => {
    // A second Backlog entry is not a replay, and the board would render it as one.
    renderResult({ game: game({ title: 'Hollow Knight' }), onBoard: true });

    expect(screen.getByText('On your board')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Hollow Knight to backlog' }),
    ).not.toBeInTheDocument();
  });

  it('will not take the same click twice while the first is still going', () => {
    renderResult({ game: game({ title: 'Hollow Knight' }), adding: true });

    expect(screen.getByRole('button', { name: 'Add Hollow Knight to backlog' })).toBeDisabled();
  });

  it('falls back to an initial when the catalogue has no cover', () => {
    const { container } = render(
      <SearchResult game={game({ coverUrl: null, title: 'Hades' })} onBoard={false} adding={false} onAdd={vi.fn()} />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('H')).toBeInTheDocument();
  });
});
