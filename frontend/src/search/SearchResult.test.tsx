import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchResult } from './SearchResult';
import type { SearchHit } from '../hobbies';

const hit = (overrides: Partial<SearchHit> = {}): SearchHit => ({
  id: 3003,
  title: 'Hollow Knight',
  coverUrl: 'https://images.example/cover.jpg',
  byline: [],
  ...overrides,
});

function renderResult(props: Partial<Parameters<typeof SearchResult>[0]> = {}) {
  const onAdd = vi.fn();
  render(<SearchResult hit={hit()} onBoard={false} adding={false} onAdd={onAdd} {...props} />);
  return { onAdd };
}

describe('SearchResult', () => {
  it('prints whatever its hobby says about the title', () => {
    // A game's two lines are platforms and developers; the tile does not know that, and does
    // not need to. It is handed lines rather than a shape to interpret, which is what keeps it
    // from growing a branch per hobby for the sake of two <p>s.
    renderResult({
      hit: hit({ title: 'Celeste', byline: ['PC, Switch', 'Extremely OK Games'] }),
    });

    expect(screen.getByRole('heading', { name: 'Celeste' })).toBeInTheDocument();
    expect(screen.getByText('PC, Switch')).toBeInTheDocument();
    expect(screen.getByText('Extremely OK Games')).toBeInTheDocument();
  });

  it('reads the same way for a film', () => {
    renderResult({ hit: hit({ title: 'Arrival', byline: ['2016', 'Denis Villeneuve'] }) });

    expect(screen.getByText('2016')).toBeInTheDocument();
    expect(screen.getByText('Denis Villeneuve')).toBeInTheDocument();
  });

  it('drops a line the source had nothing for', () => {
    // A film's director is not on TMDB's search response, so that line is empty until the title
    // is added and enrichment fills it in. An empty <p> would leave a gap that reads as a
    // missing value rather than as an absent one.
    const { container } = render(
      <SearchResult
        hit={hit({ title: 'Arrival', byline: ['2016', ''] })}
        onBoard={false}
        adding={false}
        onAdd={vi.fn()}
      />,
    );

    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('offers to put it on the board', async () => {
    const { onAdd } = renderResult({ hit: hit({ id: 3003, title: 'Hollow Knight' }) });

    await userEvent.click(screen.getByRole('button', { name: 'Add Hollow Knight to backlog' }));

    expect(onAdd).toHaveBeenCalledExactlyOnceWith(3003);
  });

  it('says so instead when it is already there, rather than offering to add it twice', () => {
    // A second Backlog entry is not a replay, and the board would render it as one.
    renderResult({ hit: hit({ title: 'Hollow Knight' }), onBoard: true });

    expect(screen.getByText('On your board')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Hollow Knight to backlog' }),
    ).not.toBeInTheDocument();
  });

  it('will not take the same click twice while the first is still going', () => {
    renderResult({ hit: hit({ title: 'Hollow Knight' }), adding: true });

    expect(screen.getByRole('button', { name: 'Add Hollow Knight to backlog' })).toBeDisabled();
  });

  it('falls back to an initial when the catalogue has no cover', () => {
    const { container } = render(
      <SearchResult
        hit={hit({ coverUrl: null, title: 'Hades' })}
        onBoard={false}
        adding={false}
        onAdd={vi.fn()}
      />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('H')).toBeInTheDocument();
  });
});
