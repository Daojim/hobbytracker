import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { App } from './App';
import { renderWithProviders } from './test/render';
import { boardServer } from './test/library';
import { authServer } from './test/auth';

/**
 * The routes, and the gate in front of them.
 *
 * App.tsx had no test at all before this: the /search redirect was unpinned, and there was
 * nothing to gate. Both are here now, because a gate that lets the wrong person through is not
 * the kind of thing to find out about from a browser.
 */
describe('App', () => {
  it('sends somebody signed out to sign in rather than to an error', () => {
    // The board would answer 401 for every column, and every column would paint its own red
    // message. Being asked to sign in is the honest reading of that, and the only useful one.
    boardServer();
    authServer(null);

    renderWithProviders(<App />, { route: '/board' });

    return waitFor(() =>
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument(),
    );
  });

  it('shows the board to somebody signed in', async () => {
    boardServer({ years: [2026] });
    authServer();

    renderWithProviders(<App />, { route: '/board' });

    expect(await screen.findByRole('heading', { level: 2, name: 'Backlog 0' })).toBeInTheDocument();
  });

  it('does not flash the sign-in screen while it is still asking', () => {
    // The answer takes a request, and guessing "signed out" in the meantime would throw a
    // signed-in person onto a sign-in screen on every reload.
    boardServer();
    authServer();

    renderWithProviders(<App />, { route: '/board' });

    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('still lands the old search address on the board', async () => {
    boardServer();
    authServer();

    renderWithProviders(<App />, { route: '/search' });

    expect(await screen.findByRole('heading', { level: 2, name: 'Backlog 0' })).toBeInTheDocument();
  });
});
