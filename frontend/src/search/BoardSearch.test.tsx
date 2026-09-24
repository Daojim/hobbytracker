import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { BoardSearch } from './BoardSearch';
import { hiddenColumnsKey } from '../board/hiddenColumns';
import { game, searchServer } from '../test/games';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';

const box = () => screen.getByRole('searchbox', { name: 'Search games' });
const strip = () => screen.queryByRole('region', { name: 'Search results' });
const clearButton = () => screen.queryByRole('button', { name: 'Clear search' });

// A column taken off in Settings is remembered in storage, and must not follow one test into the
// next.
afterEach(() => localStorage.clear());

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

    await waitFor(() => expect(search.added).toEqual([{ mediaId: 3003, status: 'Backlog' }]));
  });

  it('puts a result straight into Playing, naming the column and nothing else', async () => {
    // The dates are the server's: a start is stamped by the rule a drag into Playing follows,
    // so nothing here sends one.
    const search = searchServer({ results: [game({ id: 3003, title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'hollow');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add Hollow Knight to playing' }),
    );

    await waitFor(() => expect(search.added).toEqual([{ mediaId: 3003, status: 'InProgress' }]));
  });

  it('says where the title went the moment the add is written, not a refetch later', async () => {
    // Otherwise the buttons stay live long enough to be pressed twice. From here on the library
    // never answers again, so the tile can only change on the add's own write.
    searchServer({ results: [game({ id: 3003, title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'hollow');
    const add = await screen.findByRole('button', { name: 'Add Hollow Knight to completed' });

    server.use(http.get('/api/library', () => new Promise<never>(() => {})));
    await userEvent.click(add);

    const tile = (await screen.findByRole('heading', { name: 'Hollow Knight' })).closest('li')!;
    await waitFor(() => expect(tile).toHaveTextContent('On your board: Completed'));
    expect(within(tile).queryByRole('button')).not.toBeInTheDocument();
  });

  it('says which column a title in your library is in, instead of offering it again', async () => {
    searchServer({
      results: [game({ id: 3003, title: 'Hollow Knight' })],
      library: [{ mediaId: 3003, status: 'Completed' }],
    });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'hollow');

    const tile = (await screen.findByRole('heading', { name: 'Hollow Knight' })).closest('li')!;
    await waitFor(() => expect(tile).toHaveTextContent('On your board: Completed'));
    expect(
      screen.queryByRole('button', { name: 'Add Hollow Knight to backlog' }),
    ).not.toBeInTheDocument();
  });

  it('offers no column the board has taken off in Settings', async () => {
    // The card menu's rule: a column the board is not drawing is nowhere a title can be sent,
    // because it would land somewhere nobody can see it.
    localStorage.setItem(hiddenColumnsKey('games'), JSON.stringify(['Completed']));
    searchServer({ results: [game({ id: 3003, title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'hollow');

    expect(
      await screen.findByRole('button', { name: 'Add Hollow Knight to playing' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Hollow Knight to completed' }),
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

  it('offers nothing to clear while the box is empty', async () => {
    // A control that does nothing is worse than no control: there is nothing to clear, and a
    // dead × sitting in the box reads as something that has stopped working.
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" />);

    expect(clearButton()).not.toBeInTheDocument();

    await userEvent.type(box(), 'hollow');

    expect(clearButton()).toBeInTheDocument();
  });

  it('clears the box and gives the keyboard back to it', async () => {
    // The focus half is the part worth pinning. The button unmounts the moment it works, so
    // without this the keyboard is left on the document body — which is a worse place to be
    // than where it started, and only someone tabbing would ever notice.
    searchServer({ results: [game({ title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" />);
    await userEvent.type(box(), 'hollow');
    await screen.findByRole('region', { name: 'Search results' });

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(box()).toHaveValue('');
    expect(box()).toHaveFocus();
    await waitFor(() => expect(strip()).not.toBeInTheDocument());
  });

  it('offers the Discover page while the box is empty, and takes the offer away once there is typing', async () => {
    // For somebody who does not know what to search for, which is exactly when the box is empty.
    // Once there is typing, the strip is the answer and the offer would only be in its way.
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" />);

    const offer = await screen.findByRole('link', { name: 'Browse popular games' });
    expect(offer).toHaveAttribute('href', '/board/games/discover');
    expect(offer.closest('p')).toHaveTextContent('Not sure what to add? Browse popular games');

    await userEvent.type(box(), 'hollow');

    expect(screen.queryByRole('link', { name: 'Browse popular games' })).not.toBeInTheDocument();
  });

  it('keeps the box named for what it is, with the offer beside the label rather than in it', async () => {
    // A wrapping label takes all of its text as the input's name, so a link inside it would make
    // the box announce itself as "Search games Not sure what to add? Browse popular games" — and
    // every spec that finds the box by name would stop finding it. The clear button's rule.
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" />);
    await screen.findByRole('link', { name: 'Browse popular games' });

    expect(box()).toHaveAccessibleName('Search games');
  });

  it('offers nothing on a board whose hobby has no Discover page', async () => {
    searchServer();

    renderWithProviders(<BoardSearch hobby="movies" />, { route: '/board/movies' });
    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: 'Search movies' })).toBeInTheDocument(),
    );

    expect(screen.queryByRole('link', { name: /^Browse popular/ })).not.toBeInTheDocument();
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
