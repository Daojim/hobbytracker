import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchResult } from './SearchResult';
import { GAMES } from '../hobbies/games';
import { MOVIES } from '../hobbies/movies';
import { addColumns, columnsFor, type SearchHit } from '../hobbies';

const hit = (overrides: Partial<SearchHit> = {}): SearchHit => ({
  id: 3003,
  title: 'Hollow Knight',
  coverUrl: 'https://images.example/cover.jpg',
  byline: [],
  release: null,
  ...overrides,
});

/** A games board with nothing taken off: Backlog, Playing and Completed on offer. */
const GAME_COLUMNS = addColumns(columnsFor('games'));

/** In a list, as the strip draws it, so the tile is a list item the way it is on screen. */
function renderResult(props: Partial<Parameters<typeof SearchResult>[0]> = {}) {
  const onAdd = vi.fn();
  render(
    <ul>
      <SearchResult
        hit={hit()}
        onBoard={null}
        adding={false}
        onAdd={onAdd}
        columns={GAME_COLUMNS}
        definition={GAMES}
        {...props}
      />
    </ul>,
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
    renderResult({ hit: hit({ title: 'Arrival', byline: ['2016', ''] }) });

    expect(screen.getByRole('listitem').querySelectorAll('p')).toHaveLength(1);
  });

  it('offers the three columns a title can arrive in, one button each', async () => {
    const { onAdd } = renderResult({ hit: hit({ id: 3003, title: 'Hollow Knight' }) });

    await userEvent.click(screen.getByRole('button', { name: 'Add Hollow Knight to backlog' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add Hollow Knight to playing' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add Hollow Knight to completed' }));

    expect(onAdd.mock.calls).toEqual([
      [3003, 'Backlog'],
      [3003, 'InProgress'],
      [3003, 'Completed'],
    ]);
  });

  it('draws a symbol on each rather than a word, and names the column under the cursor', () => {
    // Picked from rendered comparisons on 24 September 2026: +, ▶ and ✓ in equal thirds, with
    // no word in the row at all. What each does is its accessible name, and its title for a
    // mouse resting on it.
    renderResult({ hit: hit({ title: 'Hollow Knight' }) });

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('title'))).toEqual([
      'Add to Backlog',
      'Add to Playing',
      'Add to Completed',
    ]);

    for (const button of buttons) {
      expect(button).toHaveTextContent(/^$/);
      expect(button.querySelector('svg')).not.toBeNull();
    }
  });

  it("uses the hobby's words for the columns — a film is watched", () => {
    renderResult({
      hit: hit({ title: 'Arrival' }),
      definition: MOVIES,
      columns: addColumns(columnsFor('movies')),
    });

    expect(screen.getByRole('button', { name: 'Add Arrival to watching' })).toHaveAttribute(
      'title',
      'Add to Watching',
    );
    expect(screen.getByRole('button', { name: 'Add Arrival to watched' })).toHaveAttribute(
      'title',
      'Add to Watched',
    );
  });

  it('offers only the columns it is handed', () => {
    // The board decides which columns are drawn; a tile offering Completed on a board with
    // Completed taken off would put the title somewhere nobody can see it.
    renderResult({
      hit: hit({ title: 'Hollow Knight' }),
      columns: GAME_COLUMNS.filter((column) => column.status !== 'Completed'),
    });

    expect(screen.getByRole('button', { name: 'Add Hollow Knight to playing' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Hollow Knight to completed' }),
    ).not.toBeInTheDocument();
  });

  it('will not take a second click while the first is still going, and says nothing about it', () => {
    // Every button, not only the one pressed: a second column chosen mid-add would be a second
    // pass. No "Adding…" either — that wording went with the word "Add", and what replaces it is
    // still to be decided.
    renderResult({ hit: hit({ title: 'Hollow Knight' }), adding: true });

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
    expect(screen.queryByText(/Adding/)).not.toBeInTheDocument();
  });

  it('says which column a title is in, rather than offering to add it again', () => {
    // A second pass is not a replay, and the board would render it as one.
    renderResult({ hit: hit({ title: 'Hollow Knight' }), onBoard: 'Completed' });

    const tile = screen.getByRole('listitem');
    expect(tile).toHaveTextContent('On your board: Completed');
    expect(within(tile).queryByRole('button')).not.toBeInTheDocument();
  });

  it("names that column in the hobby's words", () => {
    renderResult({ hit: hit({ title: 'Arrival' }), definition: MOVIES, onBoard: 'InProgress' });

    expect(screen.getByRole('listitem')).toHaveTextContent('On your board: Watching');
  });

  it('says Coming soon for a title waiting on the calendar, which is where it is', () => {
    // In Backlog by status, and not in the Backlog column: the board shows a title that is not
    // out on the calendar under it. Saying "Backlog" would send somebody looking in the wrong
    // place — and the tile asks the server's `released`, as the calendar's own partition does.
    renderResult({
      hit: hit({
        title: 'Silksong II',
        release: { released: false, day: '2027-03-12', precision: 'Day' },
      }),
      onBoard: 'Backlog',
    });

    expect(screen.getByRole('listitem')).toHaveTextContent('On your board: Coming soon');
  });

  it('says Backlog for a title in the queue that is out', () => {
    renderResult({
      hit: hit({
        title: 'Hollow Knight',
        release: { released: true, day: '2017-02-24', precision: 'Day' },
      }),
      onBoard: 'Backlog',
    });

    expect(screen.getByRole('listitem')).toHaveTextContent('On your board: Backlog');
  });

  it('falls back to an initial when the catalogue has no cover', () => {
    renderResult({ hit: hit({ coverUrl: null, title: 'Hades' }) });

    expect(screen.getByRole('listitem').querySelector('img')).toBeNull();
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  it('offers the calendar alone for a title that is not out yet', () => {
    // One button, in words: it writes a Backlog entry that shows up on the calendar rather than
    // in the column, and the button says so rather than leaving somebody to wonder where the
    // card went. Nothing to play or to have finished, either — the game is not out.
    renderResult({
      hit: hit({
        title: 'Silksong II',
        release: { released: false, day: '2027-03-12', precision: 'Day' },
      }),
    });

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Add Silksong II to your release calendar' }),
    ).toHaveTextContent('Add to calendar');
  });

  it('puts a title from the calendar button in Backlog', async () => {
    const { onAdd } = renderResult({
      hit: hit({
        id: 11,
        title: 'Silksong II',
        release: { released: false, day: '2027-03-12', precision: 'Day' },
      }),
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Add Silksong II to your release calendar' }),
    );

    expect(onAdd).toHaveBeenCalledExactlyOnceWith(11, 'Backlog');
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

  it('offers the three columns for a hobby with no calendar, whatever the title carries', () => {
    // The guard against a hobby's words leaking out of `src/hobbies/`. A film that is not out
    // yet still gets the ordinary three, because the movies board has nowhere to show a
    // calendar — and the tile decides that by asking the definition rather than the slug.
    renderResult({
      definition: MOVIES,
      columns: addColumns(columnsFor('movies')),
      hit: hit({
        title: 'Dune: Part Three',
        release: { released: false, day: '2027-03-12', precision: 'Day' },
      }),
    });

    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(
      screen.getByRole('button', { name: 'Add Dune: Part Three to backlog' }),
    ).toBeInTheDocument();
  });
});
