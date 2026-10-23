import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComingSoon, upcomingQuery } from './ComingSoon';
import { boardServer, libraryItem } from '../test/library';
import { TOKEN, sharedServer } from '../test/share';
import { sharedUpcomingQuery } from '../share/queries';
import { renderWithProviders } from '../test/render';
import type { LibraryItem, ReleasePrecision } from '../api/types';

/**
 * The release calendar under the board.
 *
 * The clock is stopped for the whole file, because every heading and every distance on screen is
 * measured from today — left running, half of what is asserted below would start failing on a
 * date nobody chose.
 */
const TODAY = new Date('2026-09-15T16:00:00Z');

/**
 * A title on the calendar, its window shaped the way the API sends one.
 *
 * Dated to the day unless `releasePrecision` says otherwise, since an undated one is the
 * interesting exception. A vaguer window is built as `ReleaseWindow.For` builds it on the
 * server: `releaseDate` is the first day of the month, quarter or year that `day` falls in, and
 * `releaseEnd` the last.
 *
 * It used to send `day` as both ends, which the API never does, and that is how a window read
 * from its first day stayed green: no case here ever handed the calendar a first day already
 * gone. A quarter written as 31 March went on measuring from 31 March.
 */
function upcomingItem(
  title: string,
  day: string | null,
  overrides: Partial<LibraryItem> = {},
): LibraryItem {
  const precision = overrides.releasePrecision ?? (day === null ? 'Unknown' : 'Day');
  const [releaseDate, releaseEnd] = day === null ? [null, null] : windowAround(day, precision);

  return libraryItem({ title, releaseDate, releaseEnd, releasePrecision: precision, ...overrides });
}

/** The first and last day of the unit `day` falls in, at the precision it was announced at. */
function windowAround(day: string, precision: ReleasePrecision): [string, string] {
  const [year, month] = day.split('-').map(Number) as [number, number];
  const first = (m: number) => `${year}-${String(m).padStart(2, '0')}-01`;
  const last = (m: number) =>
    `${year}-${String(m).padStart(2, '0')}-${new Date(Date.UTC(year, m, 0)).getUTCDate()}`;

  switch (precision) {
    case 'Month':
      return [first(month), last(month)];
    case 'Quarter': {
      const opens = Math.floor((month - 1) / 3) * 3 + 1;
      return [first(opens), last(opens + 2)];
    }
    case 'Year':
      return [first(1), last(12)];
    default:
      return [day, day];
  }
}

/** A row on the calendar, by the title it names. */
function rowOf(title: string): HTMLElement {
  return screen.getByText(title).closest('li')!;
}

/**
 * The line under a row's title: the window, and anything said beside it. The only paragraph on a
 * row whose title is a button, which it is wherever the calendar can open a journal.
 */
function lineOf(title: string): string | null | undefined {
  return rowOf(title).querySelector('p')?.textContent;
}

/**
 * A row's bar, which is decoration and hidden from every query that goes by role or by text. Its
 * fill is the one thing on a row with a width of its own, so a row without one has no bar.
 */
function barOf(title: string): Element | null {
  return rowOf(title).querySelector('[style*="width"]');
}

function renderCalendar(upcoming: LibraryItem[], hobby = 'games') {
  boardServer({ upcoming, hobby });

  // Five, as the board draws with nothing taken off. The count only decides how many tracks the
  // section is laid out on, which jsdom cannot measure; layout.spec.ts is where that is checked.
  return renderWithProviders(<ComingSoon
      hobby={hobby as 'games'}
      columns={5}
      query={upcomingQuery(hobby)}
      voice="own"
      remembers
      onOpen={vi.fn()}
    />, {
    route: `/board/${hobby}`,
    path: '/board/:hobby',
  });
}

describe('ComingSoon', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing at all for a hobby with no release calendar', async () => {
    // Films have release dates; TMDB is simply not asked for them, so a movies board has no
    // calendar to draw. Paired with the test below — this one passes on its own even if the
    // component branched on the slug, and that one is what forbids the branch.
    renderCalendar([], 'movies');

    expect(screen.queryByRole('heading', { name: /coming soon/i })).not.toBeInTheDocument();
  });

  it('takes its heading from the hobby rather than from the component', async () => {
    // Every word on screen comes out of `src/hobbies/`. Hard-code "Coming soon" here and this
    // still passes — which is why the assertion is against the definition's own string rather
    // than against a literal.
    const { GAMES } = await import('../hobbies/games');

    renderCalendar([upcomingItem('Silksong II', '2026-11-03')]);

    expect(
      await screen.findByRole('heading', { name: new RegExp(GAMES.releases!.heading, 'i') }),
    ).toBeInTheDocument();
  });

  it('groups by month, nearest first', async () => {
    renderCalendar([
      upcomingItem('Out This Month', '2026-09-26'),
      upcomingItem('Out In November', '2026-11-03'),
    ]);

    await screen.findByText('Out This Month');

    const groups = screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'));
    expect(groups).toEqual(['This month', 'Nov 2026']);
  });

  it('puts the titles nobody has announced a date for last', async () => {
    renderCalendar([
      upcomingItem('Dated', '2026-11-03'),
      upcomingItem('Undated', null),
    ]);

    await screen.findByText('Dated');

    const groups = screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'));
    expect(groups.at(-1)).toBe('No date yet');
  });

  it('never prints a day that was not announced', async () => {
    // The negative assertion, and the only kind that catches this. "Q1 2027" arrives as
    // 1 January to 31 March, two real days, so a row that printed either would look entirely
    // plausible and would be a fabrication. The heading has to hold the same line: a quarter
    // cannot sit under "Jan 2027" or "Mar 2027" either.
    renderCalendar([
      upcomingItem('Vague', '2027-03-31', { releasePrecision: 'Quarter' }),
    ]);

    await screen.findByText('Vague');

    expect(lineOf('Vague')).toBe('Q1 2027');
    expect(screen.queryByText(/Jan 1|Mar 31/)).not.toBeInTheDocument();

    const groups = screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'));
    expect(groups).toEqual(['Q1 2027']);
  });

  it('never repeats a heading', async () => {
    // In the order the server sends: a window after every day it could be, and the narrowest
    // first when several close on one day. Each window heads itself at the precision it was
    // announced at. A quarter used to file under its year, so a list holding one, a later
    // month and a year read "2027, Apr 2027, 2027", and React logged a duplicate key.
    renderCalendar([
      upcomingItem('Out This Month', '2026-09-26'),
      upcomingItem('Sometime This Month', '2026-09-01', { releasePrecision: 'Month' }),
      upcomingItem('Sometime This Quarter', '2026-07-01', { releasePrecision: 'Quarter' }),
      upcomingItem('Out In November', '2026-11-03'),
      upcomingItem('Sometime Next Quarter', '2026-10-01', { releasePrecision: 'Quarter' }),
      upcomingItem('Sometime This Year', '2026-01-01', { releasePrecision: 'Year' }),
      upcomingItem('Out In January', '2027-01-15'),
      upcomingItem('Early Next Year', '2027-01-01', { releasePrecision: 'Quarter' }),
      upcomingItem('Out In April', '2027-04-07'),
      upcomingItem('Spring Next Year', '2027-04-01', { releasePrecision: 'Quarter' }),
      upcomingItem('Sometime Next Year', '2027-01-01', { releasePrecision: 'Year' }),
      upcomingItem('Undated', null),
    ]);

    await screen.findByText('Undated');

    const groups = screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'));
    expect(groups).toEqual([
      'This month',
      'Q3 2026',
      'Nov 2026',
      'Q4 2026',
      '2026',
      'Jan 2027',
      'Q1 2027',
      'Apr 2027',
      'Q2 2027',
      '2027',
      'No date yet',
    ]);
  });

  it('says how far off a title is in words as well as in a date', async () => {
    renderCalendar([upcomingItem('Soon', '2026-09-26')]);

    await screen.findByText('Soon');

    expect(screen.getByText(/in 11 days/)).toBeInTheDocument();
  });

  it('counts down to a day, in words and in its bar', async () => {
    // What the count and the bar are for, and the half of the rule below that must survive it.
    // A title out today reaches the calendar only from a list fetched yesterday, because the
    // server moves it to Backlog on the day, which is why "today" is said rather than counted.
    renderCalendar([
      upcomingItem('Out Today', '2026-09-15'),
      upcomingItem('Out Tomorrow', '2026-09-16'),
      upcomingItem('Out In Twelve Days', '2026-09-27'),
    ]);

    await screen.findByText('Out Today');

    expect(lineOf('Out Today')).toBe('Sep 15, 2026 · today');
    expect(lineOf('Out Tomorrow')).toBe('Sep 16, 2026 · tomorrow');
    expect(lineOf('Out In Twelve Days')).toBe('Sep 27, 2026 · in 12 days');

    for (const title of ['Out Today', 'Out Tomorrow', 'Out In Twelve Days']) {
      expect(barOf(title)).not.toBeNull();
    }
  });

  it('says nothing about how far off a window is once it has begun', async () => {
    // The bug this file once missed. A window is stored as its first and last day, and the row
    // measured from the first, so Witchbrook, announced for 2026, said "2026 · 295 days ago"
    // with a full bar from January until it came out. Once a window has begun nobody knows how
    // far off the title is, and the label already says everything that was announced.
    renderCalendar([
      upcomingItem('Sometime This Year', '2026-06-01', { releasePrecision: 'Year' }),
      upcomingItem('Sometime This Quarter', '2026-08-01', { releasePrecision: 'Quarter' }),
      upcomingItem('Sometime This Month', '2026-09-20', { releasePrecision: 'Month' }),
    ]);

    await screen.findByText('Sometime This Year');

    expect(lineOf('Sometime This Year')).toBe('2026');
    expect(lineOf('Sometime This Quarter')).toBe('Q3 2026');
    expect(lineOf('Sometime This Month')).toBe('Sep 2026');
    expect(screen.queryByText(/ago/)).not.toBeInTheDocument();

    for (const title of ['Sometime This Year', 'Sometime This Quarter', 'Sometime This Month']) {
      expect(barOf(title)).toBeNull();
    }
  });

  it('says nothing on the day a window opens, rather than calling it today', async () => {
    // A window's first day is the day it was measured from, so on 1 October the row announced
    // "Q4 2026 · today" about a title that could come out on any day until New Year's Eve.
    vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));

    renderCalendar([
      upcomingItem('Opens This Quarter', '2026-10-01', { releasePrecision: 'Quarter' }),
      upcomingItem('Opens This Month', '2026-10-01', { releasePrecision: 'Month' }),
    ]);

    await screen.findByText('Opens This Quarter');

    expect(lineOf('Opens This Quarter')).toBe('Q4 2026');
    expect(lineOf('Opens This Month')).toBe('Oct 2026');
  });

  it('says nothing about how far off a window is before it begins either', async () => {
    // Counted to its first day, a window reads as the day the title comes out, when that is
    // only the earliest it could. Seven titles announced for 2027 all said "in 2 months" in
    // October, and a month said "in 9 days" above a day in that month saying "in 13 days".
    renderCalendar([
      upcomingItem('Sometime Next Year', '2027-06-01', { releasePrecision: 'Year' }),
      upcomingItem('Sometime Next Quarter', '2027-02-01', { releasePrecision: 'Quarter' }),
      upcomingItem('Sometime In November', '2026-11-10', { releasePrecision: 'Month' }),
    ]);

    await screen.findByText('Sometime Next Year');

    expect(lineOf('Sometime Next Year')).toBe('2027');
    expect(lineOf('Sometime Next Quarter')).toBe('Q1 2027');
    expect(lineOf('Sometime In November')).toBe('Nov 2026');

    for (const title of ['Sometime Next Year', 'Sometime Next Quarter', 'Sometime In November']) {
      expect(barOf(title)).toBeNull();
    }
  });

  it('stops counting a title that is never coming', async () => {
    // A cancelled title stays on the calendar so you find out it is dead, and that outranks its
    // date. Counting to the date said it was still on its way: "in 3 months · Cancelled" with
    // its bar filling, or "196 days ago" once the date had gone.
    renderCalendar([
      upcomingItem('Never Coming', '2026-12-09', { releaseStatus: 'Cancelled' }),
      upcomingItem('Long Gone', '2026-03-03', { releaseStatus: 'Cancelled' }),
    ]);

    await screen.findByText('Never Coming');

    expect(lineOf('Never Coming')).toBe('Dec 9, 2026 · Cancelled');
    expect(lineOf('Long Gone')).toBe('Mar 3, 2026 · Cancelled');
    expect(barOf('Never Coming')).toBeNull();
    expect(barOf('Long Gone')).toBeNull();
  });

  it('says when a title is never coming rather than leaving it looking patient', async () => {
    renderCalendar([
      upcomingItem('Silent Hills', null, { releaseStatus: 'Cancelled' }),
    ]);

    await screen.findByText('Silent Hills');

    expect(screen.getByText(/Cancelled/)).toBeInTheDocument();
  });

  it('shows the first twenty and offers the rest', async () => {
    const many = Array.from({ length: 25 }, (_, index) =>
      upcomingItem(`Title ${index}`, `2026-1${(index % 2) + 1}-0${(index % 9) + 1}`),
    );

    renderCalendar(many);

    await screen.findByText('Title 0');

    expect(screen.getAllByRole('listitem')).toHaveLength(20);

    await userEvent.click(screen.getByRole('button', { name: /show 5 more/i }));

    expect(screen.getAllByRole('listitem')).toHaveLength(25);
  });

  it('counts every title in the heading, not only the ones on screen', async () => {
    const many = Array.from({ length: 25 }, (_, index) =>
      upcomingItem(`Title ${index}`, `2026-11-0${(index % 9) + 1}`),
    );

    renderCalendar(many);

    expect(await screen.findByRole('heading', { name: 'Coming soon 25' })).toBeInTheDocument();
  });

  it('says so when there is nothing to wait for', async () => {
    const { GAMES } = await import('../hobbies/games');

    renderCalendar([]);

    expect(await screen.findByText(GAMES.releases!.empty.own)).toBeInTheDocument();
  });

  it('folds away, and stays folded on the next visit', async () => {
    const { unmount } = renderCalendar([upcomingItem('Silksong II', '2026-11-03')]);

    await screen.findByText('Silksong II');
    await userEvent.click(screen.getByRole('button', { name: /hide coming soon/i }));

    expect(screen.queryByText('Silksong II')).not.toBeInTheDocument();

    unmount();
    renderCalendar([upcomingItem('Silksong II', '2026-11-03')]);

    expect(
      await screen.findByRole('button', { name: /show coming soon/i }),
    ).toBeInTheDocument();
  });

  it('says only Hide, and says the rest to a screen reader', async () => {
    // The heading is right beside it saying "Coming soon", so repeating that in the button is
    // noise on screen. It is not noise off screen: a screen reader reaches the button without
    // the heading in hand, and "Hide" alone would be the third such button on the page.
    //
    // So the visible word narrows and the accessible name does not, which is also why the
    // e2e spec's `getByRole('button', { name: 'Hide Coming soon' })` still finds it.
    renderCalendar([upcomingItem('Silksong II', '2026-11-03')]);

    const fold = await screen.findByRole('button', { name: 'Hide Coming soon' });

    expect(fold).toHaveTextContent(/^Hide$/);

    await userEvent.click(fold);

    expect(await screen.findByRole('button', { name: 'Show Coming soon' })).toHaveTextContent(
      /^Show$/,
    );
  });

  it('opens a title the way a card does', async () => {
    boardServer({ upcoming: [upcomingItem('Silksong II', '2026-11-03')] });

    const onOpen = vi.fn();
    renderWithProviders(<ComingSoon
        hobby="games"
        columns={5}
        query={upcomingQuery('games')}
        voice="own"
        remembers
        onOpen={onOpen}
      />, {
      route: '/board/games',
      path: '/board/:hobby',
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Silksong II' }));

    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('is a list of rows rather than a fifth column of cards', async () => {
    // A calendar row must not answer to the e2e card() locator, which is scoped to [data-board].
    // The section renders outside it — see BoardPage — and this is the unit-level half of that.
    const { container } = renderCalendar([upcomingItem('Silksong II', '2026-11-03')]);

    await screen.findByText('Silksong II');

    expect(container.querySelector('[data-board]')).toBeNull();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1);
  });
});

/**
 * The calendar on a share: the owner's, read by its token, in words written to nobody, and with
 * no journal behind its titles.
 */
describe('ComingSoon on a share', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderShared(upcoming: LibraryItem[]) {
    // No boardServer: a share's calendar asking the signed-in board for its titles would be an
    // unhandled request, and that is the failure this is here to see.
    sharedServer({ upcoming });

    return renderWithProviders(
      <ComingSoon
        hobby="games"
        columns={4}
        query={sharedUpcomingQuery(TOKEN)}
        voice="shared"
        remembers={false}
      />,
      { route: `/share/${TOKEN}` },
    );
  }

  it('reads the share’s calendar and names its titles without offering to open them', async () => {
    renderShared([upcomingItem('Silksong II', '2026-11-03')]);

    expect(await screen.findByText('Silksong II')).toBeInTheDocument();

    // A share has no journal, so a title is text rather than a button that leads nowhere.
    expect(screen.queryByRole('button', { name: 'Silksong II' })).not.toBeInTheDocument();
  });

  it('says nothing is waiting on this board, not on yours', async () => {
    renderShared([]);

    expect(
      await screen.findByText('Nothing on this board is waiting to come out.'),
    ).toBeInTheDocument();
  });

  it('folds for the visitor without folding their own board’s calendar', async () => {
    // Remembered per board on your own board. On a share the choice is about somebody else's,
    // and the board's key would fold the visitor's own calendar along with it.
    renderShared([upcomingItem('Silksong II', '2026-11-03')]);

    await userEvent.click(await screen.findByRole('button', { name: 'Hide Coming soon' }));

    expect(await screen.findByRole('button', { name: 'Show Coming soon' })).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
  });
});
