import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchResult } from './SearchResult';
import { GAMES } from '../hobbies/games';
import type { SearchHit } from '../hobbies';

const hit = (overrides: Partial<SearchHit> = {}): SearchHit => ({
  id: 3003,
  title: 'Hollow Knight',
  coverUrl: 'https://images.example/cover.jpg',
  byline: [],
  release: null,
  ...overrides,
});

function renderResult(props: Partial<Parameters<typeof SearchResult>[0]> = {}) {
  const onAdd = vi.fn();
  render(
    <SearchResult
      hit={hit()}
      onBoard={false}
      adding={false}
      onAdd={onAdd}
      definition={GAMES}
      {...props}
    />,
  );
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
        definition={GAMES}
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
        definition={GAMES}
      />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  it('offers the calendar for a title that is not out yet', () => {
    // The one place the two actions differ, and they differ only in wording: both write the
    // same Backlog entry. What changes is where it appears afterwards, and the button says so
    // rather than leaving somebody to wonder where the card went.
    renderResult({
      hit: hit({
        title: 'Silksong II',
        release: { released: false, day: '2027-03-12', precision: 'Day' },
      }),
    });

    expect(
      screen.getByRole('button', { name: 'Add Silksong II to your release calendar' }),
    ).toHaveTextContent('Add to calendar');
  });

  it('says when an unreleased title is due, at the precision it was announced at', () => {
    renderResult({
      hit: hit({
        title: 'Hades III',
        release: { released: false, day: '2027-01-01', precision: 'Quarter' },
      }),
    });

    expect(screen.getByText('Q1 2027')).toBeInTheDocument();
    expect(screen.queryByText(/Jan 1/)).not.toBeInTheDocument();
  });

  it('still says Add for a title that is out', () => {
    renderResult({
      hit: hit({
        title: 'Hollow Knight',
        release: { released: true, day: '2017-02-24', precision: 'Day' },
      }),
    });

    expect(
      screen.getByRole('button', { name: 'Add Hollow Knight to backlog' }),
    ).toHaveTextContent('Add');
  });

  it('says Add for a hobby with no calendar, whatever the title carries', async () => {
    // The guard against a hobby's words leaking out of `src/hobbies/`. A film that is not out
    // yet still gets a plain Add, because the movies board has nowhere to show a calendar —
    // and the tile decides that by asking the definition rather than by looking at the slug.
    const { MOVIES } = await import('../hobbies/movies');

    renderResult({
      definition: MOVIES,
      hit: hit({
        title: 'Dune: Part Three',
        release: { released: false, day: '2027-03-12', precision: 'Day' },
      }),
    });

    expect(
      screen.getByRole('button', { name: 'Add Dune: Part Three to backlog' }),
    ).toHaveTextContent('Add');
  });
});
