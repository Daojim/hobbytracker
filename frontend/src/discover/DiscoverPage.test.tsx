import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { App } from '../App';
import { DiscoverPage } from './DiscoverPage';
import { renderWithProviders } from '../test/render';
import { game, searchServer } from '../test/games';
import { authServer } from '../test/auth';
import { boardServer } from '../test/library';
import { server } from '../test/server';
import type { Game } from '../api/types';

/**
 * Serves the Discover page's lists by slug, and records which were asked for.
 *
 * A list the test did not name answers with nothing rather than with another list's games, so a
 * tab asking for the wrong slug shows an empty wall instead of passing on somebody else's titles.
 */
function discoverServer(lists: Record<string, Game[]> = {}, status?: number) {
  const asked: string[] = [];

  server.use(
    http.get('/api/games/discover/:list', ({ params }) => {
      asked.push(String(params['list']));

      if (status !== undefined) {
        return HttpResponse.json(
          { title: 'Bad Gateway', detail: 'Upstream metadata provider failed.', status },
          { status },
        );
      }

      return HttpResponse.json(lists[String(params['list'])] ?? []);
    }),
  );

  return { asked };
}

/**
 * The page on its own, at the address it lives at. `searchServer` answers the library and the
 * add, which are the same two requests the search strip makes — the wall and the strip share them.
 */
function renderDiscover(route = '/board/games/discover/new-releases') {
  authServer();
  return renderWithProviders(<DiscoverPage />, { route, path: '/board/:hobby/discover/:list?' });
}

const lists = () => screen.getByRole('navigation', { name: 'Lists' });

/** The tile whose heading is this title — a tile's title is its only heading. */
const tile = async (title: string) =>
  (await screen.findByRole('heading', { level: 3, name: title })).closest('li')!;

describe('DiscoverPage', () => {
  it('shows a list as a wall, in the order the API gave it', async () => {
    // The API's order is IGDB's — hype, ratings or PopScore's ranking — and nothing on this side
    // of the wire knows it, so nothing here re-sorts.
    searchServer();
    discoverServer({
      'new-releases': [
        game({ id: 3, title: 'Third' }),
        game({ id: 1, title: 'First' }),
        game({ id: 2, title: 'Second' }),
      ],
    });

    renderDiscover();

    const wall = await screen.findByRole('list', { name: 'New releases' });
    await waitFor(() =>
      expect(
        within(wall).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
      ).toEqual(['Third', 'First', 'Second']),
    );
  });

  it('names itself under the app, and says what the list it is showing is', async () => {
    searchServer();
    discoverServer();

    renderDiscover('/board/games/discover/most-anticipated');

    // One h1 on a page, and it is the app's; this is a page of the games board.
    expect(await screen.findByRole('heading', { level: 2, name: 'Discover games' })).toBeInTheDocument();
    expect(
      screen.getByText('Not out yet, the most anticipated first. Adding one puts it on your release calendar.'),
    ).toBeInTheDocument();
  });

  it('marks the list it is showing, and links to the others', async () => {
    searchServer();
    discoverServer();

    renderDiscover('/board/games/discover/most-anticipated');

    // Links rather than buttons, so each list is an address: Back goes to the list before, and
    // a list can be sent to somebody. aria-current comes free, as it does on the hobby nav.
    expect(await within(lists()).findByRole('link', { name: 'Most anticipated' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    const other = within(lists()).getByRole('link', { name: 'Popular now' });
    expect(other).toHaveAttribute('href', '/board/games/discover/popular-now');
    expect(other).not.toHaveAttribute('aria-current');
  });

  it('asks for a list when its tab is chosen', async () => {
    searchServer();
    const discover = discoverServer({
      'new-releases': [game({ id: 1, title: 'Tunic II' })],
      'most-played': [game({ id: 9, title: 'Portal 2' })],
    });

    renderDiscover();
    await screen.findByRole('list', { name: 'New releases' });

    await userEvent.click(within(lists()).getByRole('link', { name: 'Most played' }));

    expect(await screen.findByRole('list', { name: 'Most played' })).toBeInTheDocument();
    expect(await tile('Portal 2')).toBeInTheDocument();
    expect(discover.asked).toEqual(['new-releases', 'most-played']);
  });

  it('puts a title on the backlog, and then says it is there', async () => {
    // The same request adding from search sends: the list upserted the title, so a tile already
    // has the media id a log entry points at.
    const search = searchServer();
    discoverServer({ 'new-releases': [game({ id: 7, title: 'Tunic II' })] });

    renderDiscover();
    await userEvent.click(await screen.findByRole('button', { name: 'Add Tunic II to backlog' }));

    await waitFor(() => expect(search.added).toEqual([7]));

    // At once, rather than a refetch later — or the button is live long enough to be pressed
    // twice, and a second Backlog entry reads on the board as a replay that never happened.
    const added = await tile('Tunic II');
    expect(await within(added).findByText('On your board')).toBeInTheDocument();
    expect(within(added).queryByRole('button')).not.toBeInTheDocument();
  });

  it('says on the cover when a title is already on your board, and offers nothing to press', async () => {
    searchServer({ library: [7] });
    discoverServer({
      'new-releases': [game({ id: 7, title: 'Tunic II' }), game({ id: 8, title: 'Blue Prince' })],
    });

    renderDiscover();

    const onBoard = await tile('Tunic II');
    expect(await within(onBoard).findByText('On your board')).toBeInTheDocument();
    expect(within(onBoard).queryByRole('button')).not.toBeInTheDocument();

    const notYet = await tile('Blue Prince');
    expect(within(notYet).getByRole('button', { name: 'Add Blue Prince to backlog' })).toHaveTextContent('Add');
  });

  it('offers the calendar for a title that is not out, and says when it is due', async () => {
    searchServer();
    discoverServer({
      'most-anticipated': [
        game({
          id: 11,
          title: 'Silksong II',
          released: false,
          releaseDate: '2027-03-12',
          releasePrecision: 'Day',
        }),
      ],
    });

    renderDiscover('/board/games/discover/most-anticipated');

    const upcoming = await tile('Silksong II');
    expect(
      within(upcoming).getByRole('button', { name: 'Add Silksong II to your release calendar' }),
    ).toHaveTextContent('Add to calendar');
    expect(within(upcoming).getByText('Mar 12, 2027')).toBeInTheDocument();
  });

  it('passes on what the API said when IGDB is unhappy', async () => {
    searchServer();
    discoverServer({}, 502);

    renderDiscover();

    expect(await screen.findByRole('alert')).toHaveTextContent('Upstream metadata provider failed.');
  });

  it('says so when a list has nothing in it, rather than showing an empty wall', async () => {
    searchServer();
    discoverServer();

    renderDiscover();

    expect(await screen.findByText('Nothing on this list right now.')).toBeInTheDocument();
  });

  it('leads back to the board it belongs to', async () => {
    searchServer();
    discoverServer();

    renderDiscover();

    expect(await screen.findByRole('link', { name: 'Back to your board' })).toHaveAttribute(
      'href',
      '/board/games',
    );
  });
});

/**
 * Where an address that is not quite a list ends up. Through the whole router, because a
 * redirect is only visible as the page it arrives at.
 */
describe('the Discover address', () => {
  it('opens on the first list when it names none', async () => {
    authServer();
    searchServer();
    discoverServer({ 'new-releases': [game({ id: 7, title: 'Tunic II' })] });

    renderWithProviders(<App />, { route: '/board/games/discover' });

    expect(await tile('Tunic II')).toBeInTheDocument();
    expect(within(lists()).getByRole('link', { name: 'New releases' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('goes to the first list when it names one that does not exist', async () => {
    authServer();
    searchServer();
    const discover = discoverServer({ 'new-releases': [game({ id: 7, title: 'Tunic II' })] });

    renderWithProviders(<App />, { route: '/board/games/discover/trending' });

    expect(await tile('Tunic II')).toBeInTheDocument();
    expect(discover.asked).toEqual(['new-releases']);
  });

  it('goes to the board itself for a hobby with no wall', async () => {
    boardServer({ hobby: 'movies' });

    renderWithProviders(<App />, { route: '/board/movies/discover' });

    expect(await screen.findByRole('searchbox', { name: 'Search movies' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Lists' })).not.toBeInTheDocument();
  });

  it('goes to the games board for a hobby nobody has built', async () => {
    boardServer();

    renderWithProviders(<App />, { route: '/board/books/discover' });

    expect(await screen.findByRole('searchbox', { name: 'Search games' })).toBeInTheDocument();
  });
});
