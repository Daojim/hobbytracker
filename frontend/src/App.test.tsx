import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { BackButton, renderWithProviders } from './test/render';
import { boardServer, libraryItem } from './test/library';
import { gameDetail, journalServer } from './test/games';
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

  it('keeps the board it goes back to, because closing a drawer is not a reload', async () => {
    // The journal drawer's openness is a history entry, so closing it is a navigation through
    // these very routes — and a navigation that remounted the page would take the per-column
    // sort, the chosen year and the open Dropped well with it, which is a reload nobody asked
    // for. The entry carries the same path precisely so the router matches the same route and
    // React reconciles rather than rebuilding. Checked by reintroducing the fault: keying this
    // route's element on the location fails this test and nothing else in the suite.
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3003, title: 'Celeste' })] } });
    journalServer({ detail: gameDetail({ title: 'Celeste' }) });
    authServer();

    renderWithProviders(
      <>
        <App />
        <BackButton />
      </>,
      { route: '/board' },
    );

    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Backlog order' }),
      'title',
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Celeste' }));
    await userEvent.click(screen.getByRole('button', { name: 'go back' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Backlog order' })).toHaveValue('title');
  });

  it('still lands the old search address on the board', async () => {
    boardServer();
    authServer();

    renderWithProviders(<App />, { route: '/search' });

    expect(await screen.findByRole('heading', { level: 2, name: 'Backlog 0' })).toBeInTheDocument();
  });
});
