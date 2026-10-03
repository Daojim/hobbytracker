import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { renderWithProviders } from '../test/render';
import { boardServer } from '../test/library';
import { backlogTitle, finish, stats, statsServer } from '../test/stats';
import { columnHoursLines } from '../board/columnHours';
import { hobbyDefinition } from '../hobbies';
import type { ColumnHours } from '../api/types';

/** A Friday afternoon, the day the page was built. Ages in the backlog count from here. */
const TODAY = new Date('2026-10-02T16:00:00Z');

/** One of the page's sections — a tile or a panel — by the heading it is named by. */
const section = (name: string) => screen.findByRole('region', { name });

const open = (route: string) => renderWithProviders(<App />, { route });

describe('the Stats address', () => {
  it('opens on the latest year there is, and asks for no other', async () => {
    // Asking for every year first and then the latest would fetch the whole history to throw
    // it away, and paint it for a moment.
    const server = statsServer({ years: [2026, 2025] });

    open('/board/games/stats');

    expect(await screen.findByRole('combobox', { name: 'Year' })).toHaveValue('2026');
    await waitFor(() => expect(server.asked).toEqual(['2026']));
  });

  it('opens on every year when nothing has a year yet', async () => {
    const server = statsServer({ years: [] });

    open('/board/games/stats');

    expect(await screen.findByRole('combobox', { name: 'Year' })).toHaveValue('');
    await waitFor(() => expect(server.asked).toEqual([null]));
  });

  it('reads the year from its address', async () => {
    const server = statsServer({ years: [2026, 2025] });

    open('/board/games/stats/2025');

    expect(await screen.findByRole('combobox', { name: 'Year' })).toHaveValue('2025');
    await waitFor(() => expect(server.asked).toEqual(['2025']));
  });

  it('reads every year from its address', async () => {
    const server = statsServer({ years: [2026] });

    open('/board/games/stats/all');

    expect(await screen.findByRole('combobox', { name: 'Year' })).toHaveValue('');
    await waitFor(() => expect(server.asked).toEqual([null]));
  });

  it('opens on the latest year from an address that names no year', async () => {
    const server = statsServer({ years: [2026, 2025] });

    open('/board/games/stats/soon');

    expect(await screen.findByRole('combobox', { name: 'Year' })).toHaveValue('2026');
    await waitFor(() => expect(server.asked).toEqual(['2026']));
  });

  it('moves to another year when the picker does', async () => {
    const server = statsServer({ years: [2026, 2025] });

    open('/board/games/stats/2026');

    // Offered once the list has arrived, which is the first a person could choose it.
    await screen.findByRole('option', { name: '2025' });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Year' }), '2025');

    await waitFor(() => expect(server.asked).toContain('2025'));
    expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2025');
  });

  it('goes to the board itself for a hobby with no Stats page', async () => {
    boardServer({ hobby: 'movies' });

    open('/board/movies/stats');

    expect(await screen.findByRole('searchbox', { name: 'Search movies' })).toBeInTheDocument();
  });

  it('goes to the games board for a hobby nobody has built', async () => {
    boardServer();

    open('/board/books/stats');

    expect(await screen.findByRole('searchbox', { name: 'Search games' })).toBeInTheDocument();
  });

  it('leads back to the board it came from', async () => {
    statsServer({ years: [2026] });

    open('/board/games/stats/2026');

    expect(await screen.findByRole('link', { name: /back to your board/i })).toHaveAttribute(
      'href',
      '/board/games',
    );
  });
});

describe('StatsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** The page at a year, serving these stats for it. */
  function renderYear(year: string, served: ReturnType<typeof stats>, years = [2026]) {
    statsServer({ years, byYear: { [year]: served } });
    return open(`/board/games/stats/${year}`);
  }

  describe('the tiles', () => {
    it('puts the four numbers first', async () => {
      renderYear(
        '2026',
        stats({
          finished: [
            finish({ rating: 9, hoursPlayed: 10.5, lengthHours: 12.76 }),
            finish({ rating: 7.5, hoursPlayed: null, lengthHours: 20 }),
          ],
          hours: { length: 32.76, lengthTitles: 2, played: 10.5, playedLength: 12.76, playedTitles: 1 },
          completion: { finished: 14, going: 2, dropped: 3 },
        }),
      );

      const finished = await section('Finished');
      expect(within(finished).getByText('2')).toBeInTheDocument();
      expect(within(finished).getByText('games in 2026')).toBeInTheDocument();

      const completion = await section('Completion');
      expect(within(completion).getByText('74%')).toBeInTheDocument();
      expect(within(completion).getByText('14 finished')).toBeInTheDocument();
      expect(within(completion).getByText('2 still going')).toBeInTheDocument();
      expect(within(completion).getByText('3 dropped')).toBeInTheDocument();
      expect(within(completion).getByText('of the 19 games you started in 2026')).toBeInTheDocument();

      const against = await section('Vs HowLongToBeat');
      expect(within(against).getByText('18% quicker')).toBeInTheDocument();
      expect(within(against).getByText('over 1 game you logged hours for')).toBeInTheDocument();

      const rating = await section('Rating');
      expect(within(rating).getByText('8.3')).toBeInTheDocument();
      expect(within(rating).getByText('on average, over 2 rated')).toBeInTheDocument();
    });

    it('has no completion rate when nothing was started, rather than 0%', async () => {
      renderYear('2026', stats({ completion: { finished: 0, going: 0, dropped: 0 } }));

      const completion = await section('Completion');
      expect(within(completion).getByText('Nothing started in 2026')).toBeInTheDocument();
      expect(within(completion).queryByText('0%')).not.toBeInTheDocument();
    });

    it('says what there is nothing of yet, rather than nought', async () => {
      renderYear('2026', stats());

      expect(within(await section('Vs HowLongToBeat')).getByText('Nothing to compare yet'))
        .toBeInTheDocument();
      expect(within(await section('Rating')).getByText('Nothing rated yet')).toBeInTheDocument();
    });

    it('speaks of every year under All years', async () => {
      renderYear('all', stats({ completion: { finished: 1, going: 1, dropped: 0 } }));

      expect(within(await section('Finished')).getByText('games, all years')).toBeInTheDocument();
      expect(within(await section('Completion')).getByText('of the 2 games you started'))
        .toBeInTheDocument();
    });
  });

  describe('you and HowLongToBeat', () => {
    it('compares your hours in the words Completed\'s header uses', async () => {
      // The board's Completed header and this panel add up by the same rules on the server, and
      // say it in the same words here, so the two never read differently about one comparison.
      const hours: ColumnHours = {
        length: 284.31,
        lengthTitles: 9,
        played: 221.3,
        playedLength: 212.15,
        playedTitles: 8,
      };
      const finished = Array.from({ length: 16 }, () => finish());
      renderYear('2026', stats({ finished, hours }));

      const panel = await section('You and HowLongToBeat');
      const header = columnHoursLines(hobbyDefinition('games'), 'Completed', { total: 16, hours });

      expect(header.map((line) => line.text)).toEqual([
        '221 h played vs ~212 h to beat',
        'over 8 games · 1 without your hours · 7 with no estimate',
      ]);
      for (const line of header) {
        expect(within(panel).getByText(line.text)).toBeInTheDocument();
      }
    });

    it('lists every timed game either side of the estimate, quickest first', async () => {
      renderYear(
        '2026',
        stats({
          finished: [
            finish({ title: 'Silksong', hoursPlayed: 61.2, lengthHours: 49.9 }),
            finish({ title: 'Celeste', hoursPlayed: 10.5, lengthHours: 12.76 }),
            finish({ title: 'Unlogged', hoursPlayed: null, lengthHours: 20 }),
          ],
          hours: { length: 82.66, lengthTitles: 3, played: 71.7, playedLength: 62.66, playedTitles: 2 },
        }),
      );

      const chart = within(await section('You and HowLongToBeat')).getByRole('list', {
        name: 'Each game against its estimate',
      });
      const rows = within(chart).getAllByRole('listitem');

      expect(rows.map((row) => row.textContent)).toEqual([
        expect.stringContaining('Celeste'),
        expect.stringContaining('Silksong'),
      ]);
      expect(within(rows[0]!).getByText(/18% quicker/)).toBeInTheDocument();
      expect(within(rows[1]!).getByText(/23% longer/)).toBeInTheDocument();
    });

    it('shows six of each in a busy year, and the rest when asked', async () => {
      const finished = Array.from({ length: 14 }, (_, index) =>
        finish({ title: `Game ${index + 1}`, hoursPlayed: 10 + index, lengthHours: 20 }),
      );
      renderYear(
        '2026',
        stats({
          finished,
          hours: { length: 280, lengthTitles: 14, played: 231, playedLength: 280, playedTitles: 14 },
        }),
      );

      const panel = await section('You and HowLongToBeat');
      const chart = () =>
        within(panel).getByRole('list', { name: 'Each game against its estimate' });

      const shown = within(chart()).getAllByRole('listitem').map((row) => row.textContent);
      expect(shown).toHaveLength(12);
      expect(shown[5]).toContain('Game 6');
      expect(shown[6]).toContain('Game 9');

      await userEvent.click(within(panel).getByRole('button', { name: 'Show all 14' }));

      expect(within(chart()).getAllByRole('listitem')).toHaveLength(14);
    });
  });

  describe('finished each month', () => {
    it('files each finish under the month it was finished in here', async () => {
      // 7:30pm on New Year's Eve here is already January in UTC.
      renderYear(
        '2026',
        stats({
          finished: [
            finish({ title: 'Celeste', completedAt: '2026-01-18T17:00:00Z' }),
            finish({ title: 'Late Night', completedAt: '2027-01-01T00:30:00Z' }),
          ],
        }),
      );

      const panel = await section('Finished each month');
      expect(within(within(panel).getByRole('list', { name: 'January' })).getByRole('img', {
        name: 'Celeste',
      })).toBeInTheDocument();
      expect(within(within(panel).getByRole('list', { name: 'December' })).getByRole('img', {
        name: 'Late Night',
      })).toBeInTheDocument();
    });

    it('stops a month at six covers and says how many more', async () => {
      renderYear(
        '2026',
        stats({
          finished: Array.from({ length: 8 }, (_, index) =>
            finish({ title: `March ${index + 1}`, completedAt: `2026-03-${10 + index}T17:00:00Z` }),
          ),
        }),
      );

      const march = within(await section('Finished each month')).getByRole('list', {
        name: 'March',
      });
      expect(within(march).getAllByRole('img')).toHaveLength(6);
      expect(within(march).getByText('+2')).toBeInTheDocument();
      expect(within(march).getByText('and 2 more')).toBeInTheDocument();
    });

    it('files every finish under its year under All years, the undated last', async () => {
      renderYear(
        'all',
        stats({
          finished: [
            finish({ title: 'Old', completedAt: '2024-06-01T16:00:00Z' }),
            finish({ title: 'New', completedAt: '2026-06-01T16:00:00Z' }),
            finish({ title: 'Undated', completedAt: null }),
          ],
        }),
      );

      const panel = await section('Finished each year');
      const cover = (year: string, title: string) =>
        within(within(panel).getByRole('list', { name: year })).getByRole('img', { name: title });

      expect(cover('2024', 'Old')).toBeInTheDocument();
      expect(cover('2026', 'New')).toBeInTheDocument();
      expect(cover('No date', 'Undated')).toBeInTheDocument();
    });

    it('says when nothing was finished rather than drawing empty months', async () => {
      renderYear('2026', stats());

      const panel = await section('Finished each month');
      expect(within(panel).getByText('Nothing finished in 2026 yet.')).toBeInTheDocument();
      expect(within(panel).queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('ratings', () => {
    it('counts the ratings at each whole point', async () => {
      renderYear(
        '2026',
        stats({
          finished: [
            finish({ rating: 9.5 }),
            finish({ rating: 9 }),
            finish({ rating: 7 }),
            finish({ rating: null }),
          ],
        }),
      );

      const panel = await section('Ratings');
      expect(within(panel).getByText('over the 3 you rated · 1 finished without a rating'))
        .toBeInTheDocument();

      const counts = within(panel).getByRole('list', { name: 'How many at each rating' });
      expect(within(counts).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        expect.stringContaining('1 rated 7'),
        expect.stringContaining('2 rated 9'),
      ]);
    });
  });

  describe('the backlog', () => {
    it('lists it oldest first, six until asked for the rest', async () => {
      renderYear(
        '2026',
        stats({
          backlog: Array.from({ length: 8 }, (_, index) =>
            backlogTitle({ title: `Waiting ${index + 1}` }),
          ),
        }),
      );

      const panel = await section('Backlog');
      expect(within(panel).getByText('8')).toBeInTheDocument();
      expect(within(panel).getByText('games waiting')).toBeInTheDocument();

      const list = () => within(panel).getByRole('list', { name: 'Waiting longest' });
      expect(within(list()).getAllByRole('listitem')).toHaveLength(6);

      await userEvent.click(within(panel).getByRole('button', { name: 'Show all 8' }));

      expect(within(list()).getAllByRole('listitem')).toHaveLength(8);
    });

    it('says in your backlog when the history knows, and added when it does not', async () => {
      renderYear(
        '2026',
        stats({
          backlog: [
            backlogTitle({ title: 'Red Dead Redemption 2', loggedAt: '2025-11-03T17:00:00Z' }),
            backlogTitle({
              title: 'Tears of the Kingdom',
              loggedAt: '2026-07-02T16:00:00Z',
              inBacklogSince: '2026-10-01T16:00:00Z',
            }),
          ],
        }),
      );

      const panel = await section('Backlog');
      const rows = within(within(panel).getByRole('list', { name: 'Waiting longest' }))
        .getAllByRole('listitem');

      expect(rows[0]).toHaveTextContent('Red Dead Redemption 2');
      expect(rows[0]).toHaveTextContent('added 333 days ago');
      expect(rows[1]).toHaveTextContent('Tears of the Kingdom');
      expect(rows[1]).toHaveTextContent('in your backlog 1 day');

      // And under the count, the oldest by name.
      expect(within(panel).getByText('the oldest, Red Dead Redemption 2, added 333 days ago'))
        .toBeInTheDocument();

      // And why two titles are spoken of differently.
      expect(within(panel).getByText(/is the day a title went on your board/)).toBeInTheDocument();
    });

    it('explains "added" only when a title says it', async () => {
      renderYear(
        '2026',
        stats({ backlog: [backlogTitle({ inBacklogSince: '2026-10-01T16:00:00Z' })] }),
      );

      const panel = await section('Backlog');
      expect(within(panel).queryByText(/is the day a title went on your board/)).not.toBeInTheDocument();
    });

    it('says nothing is waiting rather than listing nothing', async () => {
      renderYear('2026', stats());

      expect(within(await section('Backlog')).getByText('Nothing waiting.')).toBeInTheDocument();
    });
  });
});
