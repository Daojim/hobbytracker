import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { BoardPage } from './BoardPage';
import { server } from '../test/server';
import { boardServer, libraryItem } from '../test/library';
import type { LibraryItem, LogStatus } from '../api/types';
import { game, gameDetail, journalServer, logEntry, searchServer } from '../test/games';
import { movie, movieDetail, movieJournalServer, movieSearchServer } from '../test/movies';
import { tvShowDetail, tvJournalServer } from '../test/tv';
import { BackButton, renderWithProviders } from '../test/render';

/**
 * Where the board lives, so `useParams` has a hobby to hand it.
 *
 * BoardPage reads its hobby out of the address; a MemoryRouter with no matching route hands it
 * an empty params object, and it redirects rather than rendering. Which route the app puts it on
 * is App.test.tsx's business, not this file's — here it just has to be *somewhere*.
 */
const BOARD_ROUTE = { route: '/board/games', path: '/board/:hobby' };

/**
 * The years endpoint as the server really behaves, rather than as a fixed list.
 *
 * A move stamps a timestamp or clears one, and these are derived from those — so the answer can
 * gain a year between two requests and lose it again. `boardServer` serves one list whatever
 * happens, which is right for every test that is not about this.
 */
function activityYears(first: number[], andThen: number[]) {
  let asked = 0;

  server.use(
    http.get('/api/library/years', () => {
      asked += 1;
      return HttpResponse.json(asked === 1 ? first : andThen);
    }),
  );

  return { asked: () => asked };
}

/**
 * One card, on a board where a move really moves it.
 *
 * `boardServer`'s columns are fixtures and answer the same rows however the board is driven,
 * which is enough until a test is about what the cache is left holding afterwards.
 */
function movingCard(item: LibraryItem) {
  let status = item.currentStatus;

  server.use(
    // Before the bare /api/library below, for the reason test/library.ts states about its own
    // pair: MSW matches in order, and the calendar must not be answered with a paged envelope.
    http.get('/api/library/upcoming', () => HttpResponse.json([])),

    http.get('/api/library', ({ request }) => {
      const asked = new URL(request.url).searchParams.get('status');
      const items = asked === status ? [{ ...item, currentStatus: status }] : [];

      return HttpResponse.json({ items, total: items.length, page: 1, pageSize: 100 });
    }),

    http.post('/api/library/:mediaId/status', async ({ request }) => {
      status = ((await request.json()) as { status: LogStatus }).status;
      return HttpResponse.json({ ...item, currentStatus: status });
    }),
  );
}

/** The board, with something on it to press Back with. */
function boardWithBack() {
  return renderWithProviders(
    <>
      <BoardPage />
      <BackButton />
    </>,
    BOARD_ROUTE,
  );
}

describe('BoardPage', () => {
  it('opens with the three columns a title moves through, then Dropped', async () => {
    // Dropped last, at the far right — where it sat for most of this board's life. It spent
    // nine days ahead of Backlog on the argument that a title in it *left* the progression
    // rather than finished it: sound on paper, and answered by using it. Still collapsed,
    // still muted; only the place has changed back.
    boardServer();

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await screen.findByRole('heading', { name: 'Backlog 0' });

    // Exhaustive on purpose, so a section arriving on this page has to come here and say so.
    // The fifth heading is the release calendar, which is *not* a fifth column: it sits under
    // the grid and holds the Backlog entries that are not out yet.
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Backlog 0', 'Playing 0', 'Completed 0', 'Dropped 0', 'Coming soon 0']);
  });

  it('puts one year control above the board rather than one in a column', async () => {
    // It used to sit in the Completed column's header, because completed_at was the only date
    // the year meant. Now that it narrows three of the four columns, a control living inside
    // one of them would be claiming to be about that column alone.
    boardServer({ years: [2026] });

    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    const picker = await screen.findByRole('combobox', { name: 'Year' });
    expect(screen.getAllByRole('combobox', { name: 'Year' })).toHaveLength(1);
    expect(
      within(screen.getByRole('region', { name: 'Completed 0' })).queryByRole('combobox', {
        name: 'Year',
      }),
    ).not.toBeInTheDocument();
    expect(picker).toHaveValue('2026');
  });

  it('opens on the latest year there is, not on all of them', async () => {
    // The board is a record of a year, and the year you are in is the one you are adding to.
    // "All years" is still there and is one choice away; it is just not where you start.
    const board = boardServer({ years: [2026, 2024, 2019] });

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await screen.findByRole('combobox', { name: 'Year' });

    await waitFor(() => expect(board.queriesFor('Completed')[0]?.get('year')).toBe('2026'));
  });

  it('narrows three columns by the year and leaves the backlog out of it', async () => {
    // A Backlog entry has both timestamps cleared by the rule that puts it there, so it belongs
    // to no year at all — and a Backlog narrowed by one would be an empty well on every year
    // rather than the queue you drag out of while reading a past one.
    const board = boardServer({ years: [2026] });

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await screen.findByRole('combobox', { name: 'Year' });

    await waitFor(() => expect(board.queriesFor('Completed')[0]?.get('year')).toBe('2026'));
    expect(board.queriesFor('InProgress')[0]?.get('year')).toBe('2026');
    expect(board.queriesFor('Dropped')[0]?.get('year')).toBe('2026');
    expect(board.queriesFor('Backlog')[0]?.has('year')).toBe(false);
  });

  it('takes the year off every request when All years is chosen', async () => {
    const board = boardServer({ years: [2026, 2024] });

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Year' }),
      'All years',
    );

    await waitFor(() => expect(board.queriesFor('Completed').at(-1)?.has('year')).toBe(false));
  });

  it('adopts the latest year the moment there is one, on a board that had none', async () => {
    // An empty board belongs to no year, so the picker opens on All years — and the first thing
    // finished is what brings a year into existence. Adopting it is not overriding a choice:
    // there was nothing there to override.
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3001, title: 'Celeste' })] } });
    activityYears([], [2026]);

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await userEvent.click(await screen.findByRole('button', { name: 'Options for Celeste' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move to Completed' }));

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2026'),
    );
  });

  it('follows a newer year into existence, so a replay does not leave the board', async () => {
    // The other direction, and it has to keep working. Replaying a game finished in 2024 starts
    // a pass dated now, which is a year the board was not reading and in most cases a year that
    // did not exist a moment ago — so a board that would not follow it answers the press by
    // taking the card off screen.
    boardServer({
      columns: { Completed: [libraryItem({ mediaId: 3001, title: 'Hollow Knight' })] },
    });
    activityYears([2024], [2026, 2024]);

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2024'),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Options for Hollow Knight' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move to Playing' }));

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2026'),
    );
  });

  it('follows the list back down when the year it was reading is undone', async () => {
    // The replay above, taken back. Deleting the pass a mistaken drag added leaves 2024 as the
    // only year again, and the card with it — so a board that would not follow downwards would
    // be left reading a year nothing is in, with the title it is about off screen.
    boardServer({
      columns: { Completed: [libraryItem({ mediaId: 3001, title: 'Hollow Knight' })] },
    });
    activityYears([2026, 2024], [2024]);

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2026'),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Options for Hollow Knight' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move to Playing' }));

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2024'),
    );
  });

  it('holds the year it was reading when the list of years empties underneath it', async () => {
    // The bug this rule exists for. Dragging the only 2026 title back to Backlog clears both
    // its timestamps, so the API stops listing 2026 — and a year re-derived from that list
    // reverted to All years on its own, three columns switching cache entry as it went.
    // The control moves when somebody moves it, and otherwise not at all.
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3001, title: 'Celeste' })] } });
    const years = activityYears([2026], []);

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2026'),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Options for Celeste' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move to Dropped' }));

    await waitFor(() => expect(years.asked()).toBeGreaterThan(1));
    expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2026');
  });

  it('does not bring a moved card back in an ordering it left behind', async () => {
    // A column has one cache entry per sort and per year, and a move invalidates every one of
    // them while refetching only the entry on screen. Switch to one of the others and its stale
    // copy is rendered while it refetches — so the moved card is mounted in two columns at once.
    //
    // That is not a flicker. One media id is one dnd-kit registration: the second mount
    // overwrites the first, and when it unmounts it takes the survivor's registration with it.
    // The card left behind is still on screen and can no longer be dragged at all, until
    // something remounts it — which in practice means reloading the page.
    boardServer();
    movingCard(libraryItem({ mediaId: 3001, title: 'Celeste' }));

    // The one test that needs the cache to outlive its observer, which is what the app's client
    // does and what the harness otherwise switches off. Without it the ordering left behind is
    // collected the moment it leaves the screen and there is nothing stale to come back.
    renderWithProviders(<BoardPage />, { ...BOARD_ROUTE, keepsCache: true });
    await screen.findByRole('button', { name: 'Celeste' });

    // Look at Backlog another way, so the manual ordering is left in the cache holding this card.
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Backlog order' }),
      'title',
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Backlog 1' })).toBeVisible());

    await userEvent.click(screen.getByRole('button', { name: 'Options for Celeste' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move to Completed' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Completed 1' })).toBeVisible());

    // And back to the ordering that was left behind. fireEvent rather than userEvent, and not
    // for convenience: userEvent awaits a macrotask on its way out, which here is long enough
    // for the refetch to land and tidy the evidence away. The damage is done by then — a mount
    // and an unmount are all it takes, however briefly the second card is on screen — so the
    // assertion has to be the next thing that happens after the render.
    fireEvent.change(screen.getByRole('combobox', { name: 'Backlog order' }), {
      target: { value: 'manual' },
    });

    expect(screen.getAllByRole('button', { name: 'Celeste' })).toHaveLength(1);
  });

  it('collapses Dropped until asked, and still says how much is in it', async () => {
    boardServer({ columns: { Dropped: [libraryItem({ title: 'Anthem' })] } });

    renderWithProviders(<BoardPage />, BOARD_ROUTE);

    expect(await screen.findByRole('heading', { name: 'Dropped 1' })).toBeInTheDocument();
    expect(screen.queryByText('Anthem')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show Dropped' }));

    expect(await screen.findByText('Anthem')).toBeInTheDocument();
  });

  it('opens the journal for the card you asked about', async () => {
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3003, title: 'Celeste' })] } });
    journalServer({
      detail: gameDetail({ title: 'Celeste', logEntries: [logEntry({ id: 7, rating: 8.5 })] }),
    });

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await userEvent.click(await screen.findByRole('button', { name: 'Celeste' }));

    // The drawer sits over the board rather than replacing it — the columns are still there.
    expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(await screen.findByRole('spinbutton', { name: 'Exact rating' })).toHaveValue(8.5);
    expect(screen.getByRole('heading', { name: 'Backlog 1' })).toBeInTheDocument();
  });

  it('refetches only the column whose sort changed', async () => {
    // Each column is its own request, which is the whole reason a sort or a year on one of them
    // costs nothing on the other three.
    const board = boardServer({ columns: { Backlog: [libraryItem({ title: 'Celeste' })] } });

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await screen.findByText('Celeste');
    const playingBefore = board.queriesFor('InProgress').length;

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Backlog order' }),
      'title',
    );

    await expect
      .poll(() => board.queriesFor('Backlog').map((query) => query.get('sort')))
      .toEqual(['manual', 'title']);
    expect(board.queriesFor('InProgress')).toHaveLength(playingBefore);
  });

  it('hands focus back to the card when the drawer closes', async () => {
    // Storing the id rather than the element, because refetches remount the card while the
    // drawer is open and the node captured at open time is usually detached by now.
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3003, title: 'Celeste' })] } });
    journalServer({ detail: gameDetail({ title: 'Celeste' }) });

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await userEvent.click(await screen.findByRole('button', { name: 'Celeste' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Celeste' })).toHaveFocus(),
    );
  });

  it('closes the journal when the browser goes back, rather than leaving the board', async () => {
    // On a phone, Back is the gesture for "out of this", and an open drawer is the innermost
    // this. Its openness is a history entry precisely so that press has something of its own to
    // pop — without one it pops the board, which on Android is the whole app going away.
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3003, title: 'Celeste' })] } });
    journalServer({ detail: gameDetail({ title: 'Celeste' }) });

    boardWithBack();
    await userEvent.click(await screen.findByRole('button', { name: 'Celeste' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'go back' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // And what is behind it is the board that was there, still showing its one card.
    expect(screen.getByRole('heading', { name: 'Backlog 1' })).toBeInTheDocument();
  });

  it('keeps one card asking at a time, however many are on the board', async () => {
    // Which card has its options open lives here rather than in the card, so opening a second
    // one closes the first without either of them knowing about the other. Two open menus on
    // one board would be two questions nobody asked.
    boardServer({
      columns: {
        Backlog: [
          libraryItem({ mediaId: 3001, title: 'Celeste' }),
          libraryItem({ mediaId: 3002, title: 'Hollow Knight' }),
        ],
      },
    });

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await userEvent.click(await screen.findByRole('button', { name: 'Options for Celeste' }));
    expect(screen.getByRole('group', { name: 'Options for Celeste' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Options for Hollow Knight' }));

    expect(screen.getByRole('group', { name: 'Options for Hollow Knight' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Options for Celeste' })).not.toBeInTheDocument();
  });

  it('moves a title to the column it was told, without a drag', async () => {
    // The whole point. jsdom has no layout and no pointer events, so this is the only layer
    // that can say a move happened without one — the drag itself belongs to Playwright.
    const board = boardServer({
      columns: { Backlog: [libraryItem({ mediaId: 3001, title: 'Celeste' })] },
    });

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await userEvent.click(await screen.findByRole('button', { name: 'Options for Celeste' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move to Completed' }));

    await waitFor(() =>
      expect(board.transitions).toContainEqual({ mediaId: 3001, status: 'Completed' }),
    );
  });

  it('closes the options on Escape and hands the keyboard back to the corner', async () => {
    // Focus goes back by id rather than to a stored element, for the reason the drawer does:
    // a refetch remounts the card, and the node the menu was opened from is then detached.
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3001, title: 'Celeste' })] } });

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    const corner = await screen.findByRole('button', { name: 'Options for Celeste' });
    await userEvent.click(corner);

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('group', { name: 'Options for Celeste' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Options for Celeste' })).toHaveFocus();
  });

  it('closes the options when the press lands somewhere else', async () => {
    boardServer({ columns: { Backlog: [libraryItem({ mediaId: 3001, title: 'Celeste' })] } });

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await userEvent.click(await screen.findByRole('button', { name: 'Options for Celeste' }));

    await userEvent.click(screen.getByRole('heading', { name: 'Playing 0' }));

    expect(screen.queryByRole('group', { name: 'Options for Celeste' })).not.toBeInTheDocument();
  });

  it('empties the search when the nav goes to another hobby', async () => {
    // The bar belongs to the board under it, and the nav changes that board without leaving the
    // page — so a term left in the box used to ride across and then be sent to the *other*
    // provider, because the search is dispatched by hobby. Typing "hollow" on games and
    // clicking Movies asked TMDB about Hollow Knight.
    //
    // Through BoardPage rather than in BoardSearch's own file, which is the one exception to the
    // rule there: the defect is the bar outliving the hobby, and only the page can produce that.
    // Nothing here asserts an h3, which is what that rule is protecting.
    const igdb = searchServer({ results: [game({ title: 'Hollow Knight' })] });
    const tmdb = movieSearchServer({ results: [movie({ title: 'Arrival' })] });
    // Last, so the board's own /api/library answers the columns rather than the search
    // fixture's — a later server.use wins.
    boardServer();

    renderWithProviders(<BoardPage />, BOARD_ROUTE);
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search games' }), 'hollow');
    await waitFor(() => expect(igdb.searches).toEqual(['hollow']));

    await userEvent.click(screen.getByRole('link', { name: 'Movies' }));

    const films = await screen.findByRole('searchbox', { name: 'Search movies' });
    expect(films).toHaveValue('');

    // And nothing went with it on the way past. Asserted by typing a second term rather than by
    // reading the list straight away: the leaked search lands a moment later, so an empty list
    // read too early passes whether or not it was going to stay empty.
    await userEvent.type(films, 'arriv');
    await waitFor(() => expect(tmdb.searches).toEqual(['arriv']));
  });
});

/**
 * The same page, at `/board/movies`.
 *
 * A handful of cases rather than the whole file over again: what is worth pinning is that the
 * slug in the address reaches every word on the board, and that the board asks the API for the
 * hobby it is showing. Everything else here is the platform, and the platform is already held
 * by the games cases above.
 */
describe('BoardPage, on films', () => {
  const FILMS = { route: '/board/movies', path: '/board/:hobby' };

  it('calls the columns what a film in them is called', async () => {
    // The wire is unchanged — InProgress is still InProgress — and only the label moves. Three
    // of the four columns keep their word, which is what makes the fourth easy to miss.
    boardServer({ hobby: 'movies' });

    renderWithProviders(<BoardPage />, FILMS);
    await screen.findByRole('heading', { name: 'Backlog 0' });

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Backlog 0', 'Watching 0', 'Watched 0', 'Dropped 0']);
  });

  it('asks the API for the hobby in the address', async () => {
    // `boardServer` answers with nothing for any other hobby, deliberately: a films board handed
    // the games fixtures would pass a test that proves nothing, and it would pass it silently.
    const board = boardServer({
      hobby: 'movies',
      columns: { Backlog: [libraryItem({ hobby: 'movies', title: 'Arrival' })] },
    });

    renderWithProviders(<BoardPage />, FILMS);

    expect(await screen.findByText('Arrival')).toBeInTheDocument();
    expect(board.queriesFor('Backlog')[0]?.get('hobby')).toBe('movies');
  });

  it('orders a column by runtime, under that name', async () => {
    // One field and one sort value serve both hobbies — `sort=length` — so a column always
    // agrees with the cards in it. Only the word changes: Time to beat, or Runtime.
    const board = boardServer({ hobby: 'movies' });

    renderWithProviders(<BoardPage />, FILMS);
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Watched order' }),
      'length',
    );

    await waitFor(() =>
      expect(board.queriesFor('Completed').at(-1)?.get('sort')).toBe('length'),
    );
    expect(
      within(screen.getByRole('combobox', { name: 'Watched order' })).getByRole('option', {
        name: 'Runtime',
      }),
    ).toBeInTheDocument();
  });

  it('opens a film’s journal, with a film’s fields', async () => {
    boardServer({
      hobby: 'movies',
      columns: { Backlog: [libraryItem({ mediaId: 4004, hobby: 'movies', title: 'Arrival' })] },
    });
    movieJournalServer({ detail: movieDetail({ title: 'Arrival' }) });

    renderWithProviders(<BoardPage />, FILMS);
    await userEvent.click(await screen.findByRole('button', { name: 'Arrival' }));

    expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByLabelText('Watched')).toBeInTheDocument();
    expect(screen.queryByLabelText('Hours played')).not.toBeInTheDocument();
  });
});

/**
 * The same page again, at `/board/tv`.
 *
 * Fewer cases than films, because films already proved that the slug reaches every word. What
 * is here is the two things only a show has: a length label that had to be a different word,
 * and a card that says where you are.
 */
describe('BoardPage, on TV', () => {
  const TV = { route: '/board/tv', path: '/board/:hobby' };

  it('calls the columns what a show in them is called', async () => {
    boardServer({ hobby: 'tv' });

    renderWithProviders(<BoardPage />, TV);
    await screen.findByRole('heading', { name: 'Backlog 0' });

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Backlog 0', 'Watching 0', 'Watched 0', 'Dropped 0']);
  });

  it('asks the API for the hobby in the address', async () => {
    const board = boardServer({
      hobby: 'tv',
      columns: { Backlog: [libraryItem({ hobby: 'tv', title: 'Severance' })] },
    });

    renderWithProviders(<BoardPage />, TV);

    expect(await screen.findByText('Severance')).toBeInTheDocument();
    expect(board.queriesFor('Backlog')[0]?.get('hobby')).toBe('tv');
  });

  it('orders a column by the whole run, under a name Runtime is not free to take', async () => {
    // `sort=length` again, and the third word for it. Runtime is spoken for on this board — the
    // drawer's facts band calls one episode that — so the sort has to say Time to watch or two
    // controls a few inches apart would name numbers that differ by a factor of nineteen.
    const board = boardServer({ hobby: 'tv' });

    renderWithProviders(<BoardPage />, TV);
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Watched order' }),
      'length',
    );

    await waitFor(() => expect(board.queriesFor('Completed').at(-1)?.get('sort')).toBe('length'));
    expect(
      within(screen.getByRole('combobox', { name: 'Watched order' })).getByRole('option', {
        name: 'Time to watch',
      }),
    ).toBeInTheDocument();
  });

  it('says on the card which episode you are up to', async () => {
    boardServer({
      hobby: 'tv',
      columns: {
        InProgress: [
          libraryItem({ hobby: 'tv', title: 'Severance', seasonNumber: 2, episodeNumber: 4 }),
        ],
      },
    });

    renderWithProviders(<BoardPage />, TV);

    expect(await screen.findByText('S2 E4')).toBeInTheDocument();
  });

  it("opens a show's journal, with a show's fields", async () => {
    boardServer({
      hobby: 'tv',
      columns: { Backlog: [libraryItem({ mediaId: 5005, hobby: 'tv', title: 'Severance' })] },
    });
    tvJournalServer({ detail: tvShowDetail({ title: 'Severance' }) });

    renderWithProviders(<BoardPage />, TV);
    await userEvent.click(await screen.findByRole('button', { name: 'Severance' }));

    expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByLabelText('Season')).toBeInTheDocument();
    expect(screen.getByLabelText('Episode')).toBeInTheDocument();
    expect(screen.queryByLabelText('Hours played')).not.toBeInTheDocument();
  });
});
