import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComingSoon, upcomingQuery } from './ComingSoon';
import { boardServer, libraryItem } from '../test/library';
import { TOKEN, sharedServer } from '../test/share';
import { sharedUpcomingQuery } from '../share/queries';
import { renderWithProviders } from '../test/render';
import type { LibraryItem } from '../api/types';

/**
 * The release calendar under the board.
 *
 * The clock is stopped for the whole file, because every heading and every distance on screen is
 * measured from today — left running, half of what is asserted below would start failing on a
 * date nobody chose.
 */
const TODAY = new Date('2026-09-15T16:00:00Z');

/** A title on the calendar. Dated in full, since an undated one is the interesting exception. */
function upcomingItem(
  title: string,
  releaseDate: string | null,
  overrides: Partial<LibraryItem> = {},
): LibraryItem {
  return libraryItem({
    title,
    releaseDate,
    releaseEnd: releaseDate,
    releasePrecision: releaseDate === null ? 'Unknown' : 'Day',
    ...overrides,
  });
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
    // The negative assertion, and the only kind that catches this. IGDB states "Q1 2027" as
    // 31 March — a real day — so a row that printed the date it carries would look entirely
    // plausible and would be a fabrication. The heading has to hold the same line: a quarter
    // cannot sit under "Mar 2027" either.
    renderCalendar([
      upcomingItem('Vague', '2027-03-31', { releasePrecision: 'Quarter' }),
    ]);

    await screen.findByText('Vague');

    expect(screen.getByText(/Q1 2027/)).toBeInTheDocument();
    expect(screen.queryByText(/Mar 31/)).not.toBeInTheDocument();

    const groups = screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'));
    expect(groups).toEqual(['2027']);
  });

  it('says how far off a title is in words as well as in a date', async () => {
    renderCalendar([upcomingItem('Soon', '2026-09-26')]);

    await screen.findByText('Soon');

    expect(screen.getByText(/in 11 days/)).toBeInTheDocument();
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
