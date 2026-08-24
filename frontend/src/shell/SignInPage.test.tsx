import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SignInPage } from './SignInPage';
import { renderWithProviders } from '../test/render';

describe('SignInPage', () => {
  beforeEach(() => {
    renderWithProviders(<SignInPage />, { route: '/signin' });
  });

  it('says what the screen is', () => {
    expect(screen.getByRole('heading', { level: 1, name: /sign in/i })).toBeInTheDocument();
  });

  it('offers every provider as a link, not a button', () => {
    // The flow is a browser navigation to somebody else's site, answered with a 302 that fetch
    // cannot usefully follow. A link is what this is; a button would be a lie that holds right
    // up until somebody wires an onClick to it.
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/api/auth/google/start?returnUrl=%2Fboard',
      '/api/auth/discord/start?returnUrl=%2Fboard',
    ]);
  });

  it('names each provider, so the buttons are not two of the same word', () => {
    expect(screen.getByRole('link', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /discord/i })).toBeInTheDocument();
  });

  it("carries each provider's own mark, and keeps it out of the link's name", () => {
    // The mark is what makes these read as sign-in buttons rather than two links differing by a
    // word. It is decoration: the label already names the provider, so a mark that contributed
    // an accessible name would announce "Google Continue with Google" and stop matching the name
    // a person would say. `aria-hidden` is the app's convention for exactly that — the genre
    // stripe and the settings menu's radio dots both wear it.
    const links = screen.getAllByRole('link');

    expect(links.map((link) => link.querySelector('svg[aria-hidden="true"]') !== null)).toEqual([
      true,
      true,
    ]);
    expect(links.map((link) => link.textContent)).toEqual([
      'Continue with Google',
      'Continue with Discord',
    ]);
  });
});
