import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppHeader } from './AppHeader';
import { setHeaderBoard } from './headerBoards';
import { shareServer } from '../test/share';
import { hiddenServer } from '../test/games';
import { HOBBIES } from './hobbies';
import { renderWithProviders } from '../test/render';
import { authServer } from '../test/auth';

const nav = () => screen.getByRole('navigation', { name: 'Hobbies' });

// The header asks who is signed in, and MSW refuses a request no test stated. Answered here so
// the cases about the nav stay about the nav. Settings asks after the board's share link as it
// opens, for its Sharing row's line, so that is answered too.
beforeEach(() => {
  authServer();
  shareServer();
  hiddenServer();
});

/**
 * The shell had no test at all until the nav arrived, which is why this file covers the h1 and
 * the landmark as well as the tabs — none of it was pinned anywhere.
 */
describe('AppHeader', () => {
  it('names the app once, as the page heading', () => {
    renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('HobbyTracker');
  });

  it('lists every hobby, in the order they are planned', () => {
    renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />);

    expect(within(nav()).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Games',
      'Movies',
      'TV',
      'Anime',
      'Books Soon',
      'Music Soon',
    ]);
  });

  describe('with boards taken off in Settings', () => {
    afterEach(() => localStorage.clear());

    it('names only the boards left on, in the order they are planned', () => {
      // Boards in the header, since #27: so the nav shows the boards you use.
      setHeaderBoard('tv', false);
      setHeaderBoard('books', false);
      setHeaderBoard('music', false);
      renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />);

      expect(within(nav()).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        'Games',
        'Movies',
        'Anime',
      ]);
    });

    it('names the board you are on, taken off or not, so a board opened by its address says where you are', () => {
      setHeaderBoard('tv', false);
      renderWithProviders(<AppHeader title="HobbyTracker" hobby="tv" />, { route: '/board/tv' });

      expect(within(nav()).getByRole('link', { name: 'TV' })).toHaveAttribute('aria-current', 'page');
    });

    it('takes a board off the moment it is unticked in Settings', async () => {
      renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />);
      expect(within(nav()).getByRole('link', { name: 'Anime' })).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
      await userEvent.click(screen.getByRole('checkbox', { name: 'Anime' }));

      expect(within(nav()).queryByRole('link', { name: 'Anime' })).not.toBeInTheDocument();
    });
  });

  it('offers a hobby that exists as a link, and says you are on it', () => {
    renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />, { route: '/board/games' });

    const games = within(nav()).getByRole('link', { name: 'Games' });

    // The slug is in the address, so the link names it. aria-current comes free from NavLink and
    // stays right once there is more than one hobby to be current.
    expect(games).toHaveAttribute('href', '/board/games');
    expect(games).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the hobby current on its Discover page, which is still that hobby', () => {
    // /board/games/discover/new-releases is a page of the games board. Matching the board's
    // address exactly would leave the nav saying you are on no hobby at all.
    renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />, {
      route: '/board/games/discover/new-releases',
    });

    expect(within(nav()).getByRole('link', { name: 'Games' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav()).getByRole('link', { name: 'Movies' })).not.toHaveAttribute('aria-current');
  });

  it('leaves the hobbies that do not exist yet unclickable rather than disabled', () => {
    // Not a disabled link and not a disabled button: there is nothing behind them to operate,
    // so the honest markup is text. A disabled control implies it works under some condition.
    renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />);

    // Counted from the list rather than pinned at a number, so building a hobby is one flag in
    // hobbies.ts rather than that flag and an arithmetic edit here.
    expect(within(nav()).getAllByRole('link')).toHaveLength(
      HOBBIES.filter((hobby) => hobby.ready).length,
    );
    expect(within(nav()).queryAllByRole('button')).toHaveLength(0);
  });

  it('says Soon in words, not only in colour', () => {
    // The same rule the destructive controls follow: nothing in this app is signalled by colour
    // alone, because dimming is invisible to anyone who cannot see the difference.
    renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />);

    const unbuilt = HOBBIES.filter((hobby) => !hobby.ready);
    expect(unbuilt.length).toBeGreaterThan(0);

    for (const hobby of unbuilt) {
      expect(within(nav()).getByText(hobby.label).parentElement).toHaveTextContent('Soon');
    }
  });

  it('keeps exactly one palette and one Settings, because useTheme holds its state locally', () => {
    // Two of either would drift: each instance reads storage once on mount and draws its own
    // checked dot, so the second would keep showing the old choice until something remounted it.
    // The themes left Settings for the palette at #27, so each preference has one home.
    renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />);

    expect(screen.getAllByRole('button', { name: 'Theme' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Settings' })).toHaveLength(1);
  });

  it('puts the palette between who is signed in and Settings', async () => {
    authServer({ id: 3, displayName: 'Jimmy Dao' });
    renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />);

    const signOut = await screen.findByRole('button', { name: /sign out/i });
    const palette = screen.getByRole('button', { name: 'Theme' });
    const settings = screen.getByRole('button', { name: 'Settings' });

    expect(signOut.compareDocumentPosition(palette) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(palette.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('says who is signed in', async () => {
    authServer({ id: 3, displayName: 'Jimmy Dao' });

    renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />);

    expect(await screen.findByText('Jimmy Dao')).toBeInTheDocument();
  });

  it('offers a way out', async () => {
    authServer();

    renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />);

    expect(await screen.findByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('says nothing about a session it has not been given', () => {
    // The header renders inside the gate, so this is really about the moment before the answer
    // arrives: a name-shaped gap is better than a flash of somebody else's.
    authServer(null);

    renderWithProviders(<AppHeader title="HobbyTracker" hobby="games" />);

    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });
});
