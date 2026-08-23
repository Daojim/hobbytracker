import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { AppHeader } from './AppHeader';
import { HOBBIES } from './hobbies';
import { renderWithProviders } from '../test/render';

const nav = () => screen.getByRole('navigation', { name: 'Hobbies' });

/**
 * The shell had no test at all until the nav arrived, which is why this file covers the h1 and
 * the landmark as well as the tabs — none of it was pinned anywhere.
 */
describe('AppHeader', () => {
  it('names the app once, as the page heading', () => {
    renderWithProviders(<AppHeader title="HobbyTracker" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('HobbyTracker');
  });

  it('lists every hobby, in the order they are planned', () => {
    renderWithProviders(<AppHeader title="HobbyTracker" />);

    expect(within(nav()).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Games',
      'Movies Soon',
      'TV Soon',
      'Anime Soon',
      'Books Soon',
      'Music Soon',
    ]);
  });

  it('offers the one hobby that exists as a link, and says you are on it', () => {
    renderWithProviders(<AppHeader title="HobbyTracker" />);

    const games = within(nav()).getByRole('link', { name: 'Games' });

    expect(games).toHaveAttribute('href', '/board');
    expect(games).toHaveAttribute('aria-current', 'page');
  });

  it('leaves the hobbies that do not exist yet unclickable rather than disabled', () => {
    // Not a disabled link and not a disabled button: there is nothing behind them to operate,
    // so the honest markup is text. A disabled control implies it works under some condition.
    renderWithProviders(<AppHeader title="HobbyTracker" />);

    expect(within(nav()).getAllByRole('link')).toHaveLength(1);
    expect(within(nav()).queryAllByRole('button')).toHaveLength(0);
  });

  it('says Soon in words, not only in colour', () => {
    // The same rule the destructive controls follow: nothing in this app is signalled by colour
    // alone, because dimming is invisible to anyone who cannot see the difference.
    renderWithProviders(<AppHeader title="HobbyTracker" />);

    const unbuilt = HOBBIES.filter((hobby) => !hobby.ready);
    expect(unbuilt.length).toBeGreaterThan(0);

    for (const hobby of unbuilt) {
      expect(within(nav()).getByText(hobby.label).parentElement).toHaveTextContent('Soon');
    }
  });

  it('keeps exactly one settings menu, because useTheme holds its state locally', () => {
    // Two would drift: each instance reads storage once on mount and draws its own checked dot,
    // so the second would keep showing the old choice until something remounted it.
    renderWithProviders(<AppHeader title="HobbyTracker" />);

    expect(screen.getAllByRole('button', { name: 'Settings' })).toHaveLength(1);
  });
});
