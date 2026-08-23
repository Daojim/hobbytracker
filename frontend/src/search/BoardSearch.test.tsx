import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardSearch } from './BoardSearch';
import { game, searchServer } from '../test/games';
import { renderWithProviders } from '../test/render';

const box = () => screen.getByRole('searchbox', { name: 'Search games' });
const strip = () => screen.queryByRole('region', { name: 'Search results' });

/**
 * Rendered on its own rather than through BoardPage, and not only for speed.
 *
 * A result's title and a card's title are both an h3, so the "in the order IGDB ranked it" test
 * below would be reading the board's cards as well if there were a board in the document. On its
 * own, the assertion can only be about what search returned.
 */
describe('BoardSearch', () => {
  it('asks IGDB nothing while the box is empty', async () => {
    const search = searchServer();

    renderWithProviders(<BoardSearch hobby="games" />);
    await waitFor(() => expect(box()).toBeInTheDocument());

    expect(search.searches).toEqual([]);
  });

  it('keeps the board its full height until there is something to show', async () => {
    // The bar is always there; the strip is not. An empty box costs the board no room.
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" />);
    await waitFor(() => expect(box()).toBeInTheDocument());

    expect(strip()).not.toBeInTheDocument();
  });

  it('waits for the typing to stop, then asks once', async () => {
    // Every call reaches IGDB — the API does not cache, deliberately — so six keystrokes must
    // not be six searches.
    const search = searchServer({ results: [game()] });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'hollow');
    expect(search.searches).toEqual([]);

    await waitFor(() => expect(search.searches).toEqual(['hollow']));
  });

  it('shows what came back, in the order IGDB ranked it', async () => {
    // The database cannot reproduce relevance ordering, so nothing here re-sorts the results.
    searchServer({
      results: [
        game({ id: 1, title: 'Hollow Knight' }),
        game({ id: 2, title: 'Hollow Knight: Silksong' }),
      ],
    });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'hollow');

    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
        'Hollow Knight',
        'Hollow Knight: Silksong',
      ]),
    );
  });

  it('says when nothing matched, rather than showing an empty strip', async () => {
    searchServer({ results: [] });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'zzzz');

    expect(await screen.findByText('Nothing matched “zzzz”.')).toBeInTheDocument();
  });

  it('passes on what the API said when IGDB is unhappy', async () => {
    // A 502 is a different message to a caller than "this app is broken", and the client keeps
    // the distinction — so this should not flatten it back into "something went wrong".
    searchServer({ searchStatus: 502 });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'hollow');

    expect(await screen.findByRole('alert')).toHaveTextContent('IGDB is unhappy.');
  });

  it('puts a result on the backlog', async () => {
    const search = searchServer({ results: [game({ id: 3003, title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'hollow');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add Hollow Knight to backlog' }),
    );

    await waitFor(() => expect(search.added).toEqual([3003]));
  });

  it('marks a title already in your library instead of offering it again', async () => {
    searchServer({ results: [game({ id: 3003, title: 'Hollow Knight' })], library: [3003] });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'hollow');

    expect(await screen.findByText('On your board')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Hollow Knight to backlog' }),
    ).not.toBeInTheDocument();
  });

  it('gives the board back when the search is cleared', async () => {
    searchServer({ results: [game({ title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'hollow');
    await screen.findByRole('region', { name: 'Search results' });

    await userEvent.clear(box());

    await waitFor(() => expect(strip()).not.toBeInTheDocument());
  });

  it('takes the results away on Escape without leaving the board', async () => {
    // Escape is handled on the search itself rather than on the document: the journal drawer
    // already owns a document-level Escape, and two listeners for one key is how they start
    // disagreeing about which of them the press was meant for.
    searchServer({ results: [game({ title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'hollow');
    await screen.findByRole('region', { name: 'Search results' });

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(strip()).not.toBeInTheDocument());
    expect(box()).toHaveValue('');
  });
});
