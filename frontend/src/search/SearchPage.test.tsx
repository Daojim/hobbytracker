import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchPage } from './SearchPage';
import { game, searchServer } from '../test/games';
import { renderWithProviders } from '../test/render';

const box = () => screen.getByRole('searchbox', { name: 'Search games' });

describe('SearchPage', () => {
  it('asks IGDB nothing while the box is empty', async () => {
    const search = searchServer();

    renderWithProviders(<SearchPage />);
    await screen.findByText('Search for a game to put it on your board.');

    expect(search.searches).toEqual([]);
  });

  it('waits for the typing to stop, then asks once', async () => {
    // Every call reaches IGDB — the API does not cache, deliberately — so six keystrokes must
    // not be six searches.
    const search = searchServer({ results: [game()] });

    renderWithProviders(<SearchPage />);
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

    renderWithProviders(<SearchPage />);
    await userEvent.type(box(), 'hollow');

    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
        'Hollow Knight',
        'Hollow Knight: Silksong',
      ]),
    );
  });

  it('says when nothing matched, rather than showing an empty page', async () => {
    searchServer({ results: [] });

    renderWithProviders(<SearchPage />);
    await userEvent.type(box(), 'zzzz');

    expect(await screen.findByText('Nothing matched “zzzz”.')).toBeInTheDocument();
  });

  it('passes on what the API said when IGDB is unhappy', async () => {
    // A 502 is a different message to a caller than "this app is broken", and the client keeps
    // the distinction — so the page should not flatten it back into "something went wrong".
    searchServer({ searchStatus: 502 });

    renderWithProviders(<SearchPage />);
    await userEvent.type(box(), 'hollow');

    expect(await screen.findByRole('alert')).toHaveTextContent('IGDB is unhappy.');
  });

  it('puts a result on the backlog', async () => {
    const search = searchServer({ results: [game({ id: 3003, title: 'Hollow Knight' })] });

    renderWithProviders(<SearchPage />);
    await userEvent.type(box(), 'hollow');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add Hollow Knight to backlog' }),
    );

    await waitFor(() => expect(search.added).toEqual([3003]));
  });

  it('marks a title already in your library instead of offering it again', async () => {
    searchServer({ results: [game({ id: 3003, title: 'Hollow Knight' })], library: [3003] });

    renderWithProviders(<SearchPage />);
    await userEvent.type(box(), 'hollow');

    expect(await screen.findByText('On your board')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Hollow Knight to backlog' }),
    ).not.toBeInTheDocument();
  });
});
