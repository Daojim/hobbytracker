import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { App } from '../App';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { backlogTitle, finish, stats } from '../test/stats';
import { TOKEN, deadShareServer, sharedServer } from '../test/share';

/**
 * A share's Stats page: the owner's, whole, under the share's banner, and in words written to
 * nobody. Through the app's own routes, which sit outside the session gate — the fixture serves
 * no `/api/auth/me`, so a page that asked who was signed in would fail on it.
 */

/** A Friday afternoon, as the Stats page's own tests have it. Ages in the backlog count from here. */
const TODAY = new Date('2026-10-02T16:00:00Z');

const open = (route: string) => renderWithProviders(<App />, { route });

const section = (name: string) => screen.findByRole('region', { name });

/** Every word a person or a screen reader is given, outside the banner. */
function wordsOf(root: HTMLElement): string {
  const labels = [...root.querySelectorAll('[aria-label]')].map(
    (element) => element.getAttribute('aria-label') ?? '',
  );

  return [root.textContent ?? '', ...labels].join(' \n ');
}

/** A year with something to say in every panel, the way the workshop's renders had it. */
function aYear() {
  return stats({
    finished: [
      finish({ title: 'Hollow Knight', rating: 9.5, hoursPlayed: 31.5, lengthHours: 41.82 }),
      finish({ title: 'Celeste', rating: 9.5, hoursPlayed: 11.2, lengthHours: 12.76 }),
      finish({ title: 'Tunic', rating: 8, hoursPlayed: null, lengthHours: 21.5 }),
    ],
    hours: { length: 76.08, lengthTitles: 3, played: 42.7, playedLength: 54.58, playedTitles: 2 },
    completion: { finished: 5, going: 3, dropped: 0 },
    backlog: [
      backlogTitle({ title: 'Outer Wilds', inBacklogSince: '2026-08-21T16:00:00Z' }),
      backlogTitle({ title: 'Fire Emblem: Three Houses', inBacklogSince: null }),
    ],
  });
}

describe('SharedStatsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on the latest year the share’s Stats have, and asks for no other', async () => {
    const share = sharedServer({ statsYears: [2026, 2025], stats: { '2026': aYear() } });

    open(`/share/${TOKEN}/stats`);

    expect(await screen.findByRole('combobox', { name: 'Year' })).toHaveValue('2026');
    await waitFor(() =>
      expect(
        share.asked
          .filter((url) => url.pathname.endsWith('/stats'))
          .map((url) => url.searchParams.get('year')),
      ).toEqual(['2026']),
    );
  });

  it('sits under the share’s banner and heading, with the way back to the share', async () => {
    sharedServer({ board: { name: 'Jimmy Dao' }, statsYears: [2026], stats: { '2026': aYear() } });

    open(`/share/${TOKEN}/stats/2026`);

    expect(await screen.findByRole('banner')).toHaveTextContent(
      'A board shared from HobbyTracker. It’s read-only.',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Jimmy Dao’s games' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the board' })).toHaveAttribute(
      'href',
      `/share/${TOKEN}`,
    );
  });

  it('says every number to nobody', async () => {
    sharedServer({ statsYears: [2026], stats: { '2026': aYear() } });

    open(`/share/${TOKEN}/stats/2026`);

    expect(
      within(await section('Completion')).getByText('of the 8 games started in 2026'),
    ).toBeInTheDocument();
    expect(
      within(await section('Vs HowLongToBeat')).getByText('over 2 games with hours logged'),
    ).toBeInTheDocument();

    const against = await section('Hours against HowLongToBeat');
    expect(
      within(against).getByRole('img', {
        name: '43 hours played, against about 55 hours to beat',
      }),
    ).toBeInTheDocument();
    expect(within(against).getByText(/1 without hours logged/)).toBeInTheDocument();

    expect(within(await section('Ratings')).getByText('over the 3 rated')).toBeInTheDocument();
    expect(within(await section('Backlog')).getAllByText('in the backlog 42 days').length)
      .toBeGreaterThan(0);

    expect(wordsOf(screen.getByRole('main'))).not.toMatch(/\b(you|your|yours|my)\b/i);
  });

  it('says what “added” means in the board’s words rather than its owner’s', async () => {
    // A twelfth phrase written to the owner, which the #9 workshop's table of eleven missed. The
    // table's own rule rewords it, picked from renders on 5 October 2026 over leaving it off.
    sharedServer({ statsYears: [2026], stats: { '2026': aYear() } });

    open(`/share/${TOKEN}/stats/2026`);

    expect(
      within(await section('Backlog')).getByText(
        '"Added" is the day a title went on the board. Since 1 October 2026 the board records ' +
          'when a title arrives in Backlog, and says "in the backlog" for those.',
      ),
    ).toBeInTheDocument();
  });

  it('says there is nothing to compare, and asks the visitor to do nothing about it', async () => {
    sharedServer({ statsYears: [2026], stats: { '2026': stats() } });

    open(`/share/${TOKEN}/stats/2026`);

    expect(
      within(await section('Hours against HowLongToBeat')).getByText('Nothing to compare yet.'),
    ).toBeInTheDocument();
    expect(wordsOf(screen.getByRole('main'))).not.toMatch(/\b(you|your|yours|my)\b/i);
  });

  it('goes to the share’s board when the share leaves Stats off', async () => {
    sharedServer({ board: { parts: ['Completed'] }, years: [2026] });

    open(`/share/${TOKEN}/stats/2026`);

    expect(await screen.findByRole('combobox', { name: 'Year' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Completed 0' })).toBeInTheDocument();
  });

  it('says a dead link the way the board does', async () => {
    deadShareServer();

    open(`/share/${TOKEN}/stats/2026`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'This link doesn’t open a board' }),
    ).toBeInTheDocument();
  });

  it('says a board it could not reach the way the board does, and asks again', async () => {
    // No answer at all this time, rather than the board's 503: a connection that dropped.
    sharedServer({ statsYears: [2026], stats: { '2026': aYear() } });
    server.use(http.get(`/api/shared/${TOKEN}`, () => HttpResponse.error(), { once: true }));

    open(`/share/${TOKEN}/stats/2026`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'This board didn’t load' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await section('Completion')).toBeInTheDocument();
  });

  it('opens with nobody signed in, outside the gate every board is behind', async () => {
    // No /api/auth/me in the fixture, so a share that asked who was signed in would fail on an
    // unhandled request. The board's own Stats page sends somebody signed out to sign in.
    sharedServer({ statsYears: [2026], stats: { '2026': aYear() } });

    open(`/share/${TOKEN}/stats/2026`);

    expect(await section('Completion')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument();
  });
});
