import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { focusManager } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { App } from '../App';
import { DiscoverPage } from './DiscoverPage';
import { renderWithProviders } from '../test/render';
import { game, searchServer } from '../test/games';
import { authServer } from '../test/auth';
import { boardServer } from '../test/library';
import { server } from '../test/server';
import type { DiscoverListPage, Game, HiddenTitle, RatedTitle } from '../api/types';

/**
 * A list a page at a time, keyed by the place each page starts at — `0` for the first. A page's
 * `next` is whatever the test says, which is the point: the server decides where a page starts,
 * and nothing on this side of the wire should work it out for itself.
 *
 * A page given as a promise is held until the test resolves it, and one given as a number is a
 * failure with that status.
 */
type Pages = Record<number, DiscoverListPage<Game> | Promise<DiscoverListPage<Game>> | number>;

/**
 * Serves the Discover page's lists by slug, and records which were asked for, and from where.
 *
 * A list given as a plain array is one page with nothing after it, which is every list that is
 * not about Load more. A list the test did not name answers with nothing rather than with another
 * list's games, so a tab asking for the wrong slug shows an empty wall instead of passing on
 * somebody else's titles.
 */
function discoverServer(lists: Record<string, Game[] | Pages> = {}, status?: number) {
  const asked: string[] = [];
  const from: (string | null)[] = [];

  const failure = (code: number) =>
    HttpResponse.json(
      { title: 'Bad Gateway', detail: 'Upstream metadata provider failed.', status: code },
      { status: code },
    );

  server.use(
    // Nothing hidden, which every visit to the page asks about. Ahead of the lists, whose path
    // would otherwise read "hidden" as a list's name; `hiddenServer`, registered after, wins.
    http.get('/api/games/discover/hidden', () => HttpResponse.json([])),

    http.get('/api/games/discover/:list', async ({ params, request }) => {
      const list = String(params['list']);
      const start = new URL(request.url).searchParams.get('from');
      asked.push(list);
      from.push(start);

      if (status !== undefined) {
        return failure(status);
      }

      const found = lists[list] ?? [];
      const pages: Pages = Array.isArray(found) ? { 0: { titles: found, next: null } } : found;
      const page = await pages[Number(start ?? 0)];

      if (typeof page === 'number') {
        return failure(page);
      }

      return HttpResponse.json(page ?? { titles: [], next: null });
    }),
  );

  return { asked, from };
}

/**
 * The games hidden from Discover, kept as the API keeps them: newest first, a hide putting a game
 * at the top unless it is there already and Show again taking it out, and every hide and show
 * recorded in order. Registered after `discoverServer`, whose answer is that nothing is hidden.
 *
 * `games` is what a hide can name, since the request carries a media id alone. A status fails
 * every hide and show with it, for the unhappy path.
 */
function hiddenServer(
  initial: HiddenTitle[] = [],
  { games = [], status }: { games?: Game[]; status?: number } = {},
) {
  let hidden = [...initial];
  const sent: string[] = [];

  const refused = (code: number) =>
    HttpResponse.json(
      { title: 'Server Error', detail: 'The database is unhappy.', status: code },
      { status: code },
    );

  server.use(
    http.get('/api/games/discover/hidden', () => HttpResponse.json(hidden)),

    http.put('/api/games/discover/hidden/:mediaId', ({ params }) => {
      const mediaId = Number(params['mediaId']);
      sent.push(`hide ${mediaId}`);

      if (status !== undefined) {
        return refused(status);
      }

      const named = games.find((candidate) => candidate.id === mediaId);
      if (!hidden.some((title) => title.mediaId === mediaId)) {
        hidden = [
          { mediaId, title: named?.title ?? `Game ${mediaId}`, coverUrl: named?.coverUrl ?? null },
          ...hidden,
        ];
      }

      return new HttpResponse(null, { status: 204 });
    }),

    http.delete('/api/games/discover/hidden/:mediaId', ({ params }) => {
      const mediaId = Number(params['mediaId']);
      sent.push(`show ${mediaId}`);

      if (status !== undefined) {
        return refused(status);
      }

      hidden = hidden.filter((title) => title.mediaId !== mediaId);
      return new HttpResponse(null, { status: 204 });
    }),
  );

  return { sent };
}

/** Games numbered from `first`, `count` of them, each titled by its number. */
const numbered = (first: number, count: number) =>
  Array.from({ length: count }, (_, index) =>
    game({ id: first + index, title: `Game ${first + index}` }),
  );

/**
 * The page on its own, at the address it lives at. `searchServer` answers the library and the
 * add, which are the same two requests the search strip makes — the wall and the strip share them.
 */
function renderDiscover(route = '/board/games/discover/new-releases') {
  authServer();
  return renderWithProviders(<DiscoverPage />, { route, path: '/board/:hobby/discover/:list?' });
}

const lists = () => screen.getByRole('navigation', { name: 'Lists' });

/** The tile whose heading is this title — a tile's title is its only heading. */
const tile = async (title: string) =>
  (await screen.findByRole('heading', { level: 3, name: title })).closest('li')!;

describe('DiscoverPage', () => {
  it('shows a list as a wall, in the order the API gave it', async () => {
    // The API's order is IGDB's — hype, ratings or PopScore's ranking — and nothing on this side
    // of the wire knows it, so nothing here re-sorts.
    searchServer();
    discoverServer({
      'new-releases': [
        game({ id: 3, title: 'Third' }),
        game({ id: 1, title: 'First' }),
        game({ id: 2, title: 'Second' }),
      ],
    });

    renderDiscover();

    const wall = await screen.findByRole('list', { name: 'New releases' });
    await waitFor(() =>
      expect(
        within(wall).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
      ).toEqual(['Third', 'First', 'Second']),
    );
  });

  it('names itself under the app, and says what the list it is showing is', async () => {
    searchServer();
    discoverServer();

    renderDiscover('/board/games/discover/most-anticipated');

    // One h1 on a page, and it is the app's; this is a page of the games board.
    expect(await screen.findByRole('heading', { level: 2, name: 'Discover games' })).toBeInTheDocument();
    expect(
      screen.getByText('Not out yet, the most anticipated first. Adding one puts it on your release calendar.'),
    ).toBeInTheDocument();
  });

  it('marks the list it is showing, and links to the others', async () => {
    searchServer();
    discoverServer();

    renderDiscover('/board/games/discover/most-anticipated');

    // Links rather than buttons, so each list is an address: Back goes to the list before, and
    // a list can be sent to somebody. aria-current comes free, as it does on the hobby nav.
    expect(await within(lists()).findByRole('link', { name: 'Most anticipated' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    const other = within(lists()).getByRole('link', { name: 'Popular now' });
    expect(other).toHaveAttribute('href', '/board/games/discover/popular-now');
    expect(other).not.toHaveAttribute('aria-current');
  });

  it('asks for a list when its tab is chosen', async () => {
    searchServer();
    const discover = discoverServer({
      'new-releases': [game({ id: 1, title: 'Tunic II' })],
      'most-played': [game({ id: 9, title: 'Portal 2' })],
    });

    renderDiscover();
    await screen.findByRole('list', { name: 'New releases' });

    await userEvent.click(within(lists()).getByRole('link', { name: 'Most played' }));

    expect(await screen.findByRole('list', { name: 'Most played' })).toBeInTheDocument();
    expect(await tile('Portal 2')).toBeInTheDocument();
    expect(discover.asked).toEqual(['new-releases', 'most-played']);
  });

  it('puts a title straight into Completed, and then says so on its cover', async () => {
    // Filling a board backwards — Most played is a list of games people have finished — one
    // press a game rather than one press and a drag. The same request adding from search sends:
    // the list upserted the title, so a tile already has the media id the add points at.
    const search = searchServer();
    discoverServer({ 'new-releases': [game({ id: 7, title: 'Tunic II' })] });

    renderDiscover();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add Tunic II to completed' }),
    );

    await waitFor(() => expect(search.added).toEqual([{ mediaId: 7, status: 'Completed' }]));

    const added = await tile('Tunic II');
    await waitFor(() => expect(added).toHaveTextContent('On your board: Completed'));
    expect(within(added).queryByRole('button')).not.toBeInTheDocument();
  });

  it('says on the cover which column a title is in, and offers nothing to press', async () => {
    searchServer({ library: [{ mediaId: 7, status: 'InProgress' }] });
    discoverServer({
      'new-releases': [game({ id: 7, title: 'Tunic II' }), game({ id: 8, title: 'Blue Prince' })],
    });

    renderDiscover();

    const onBoard = await tile('Tunic II');
    await waitFor(() => expect(onBoard).toHaveTextContent('On your board: Playing'));
    expect(within(onBoard).queryByRole('button')).not.toBeInTheDocument();

    // The hide first, after the name and before the add, and none of it on the title above: a
    // title on your board offers no hide either.
    const notYet = await tile('Blue Prince');
    expect(within(notYet).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Hide Blue Prince from Discover',
      'Add Blue Prince to backlog',
      'Add Blue Prince to playing',
      'Add Blue Prince to completed',
    ]);
  });

  it('offers the calendar for a title that is not out, and says when it is due', async () => {
    searchServer();
    discoverServer({
      'most-anticipated': [
        game({
          id: 11,
          title: 'Silksong II',
          released: false,
          releaseDate: '2027-03-12',
          releasePrecision: 'Day',
        }),
      ],
    });

    renderDiscover('/board/games/discover/most-anticipated');

    const upcoming = await tile('Silksong II');
    expect(
      within(upcoming).getByRole('button', { name: 'Add Silksong II to your release calendar' }),
    ).toHaveTextContent('Add to calendar');
    expect(within(upcoming).getByText('Mar 12, 2027')).toBeInTheDocument();
  });

  it('passes on what the API said when IGDB is unhappy', async () => {
    searchServer();
    discoverServer({}, 502);

    renderDiscover();

    expect(await screen.findByRole('alert')).toHaveTextContent('Upstream metadata provider failed.');
  });

  it('says so when a list has nothing in it, rather than showing an empty wall', async () => {
    searchServer();
    discoverServer();

    renderDiscover();

    expect(await screen.findByText('Nothing on this list right now.')).toBeInTheDocument();
  });

  it('leads back to the board it belongs to', async () => {
    searchServer();
    discoverServer();

    renderDiscover();

    expect(await screen.findByRole('link', { name: 'Back to your board' })).toHaveAttribute(
      'href',
      '/board/games',
    );
  });
});

/**
 * A list a page at a time. The server says where each page starts; the page asks for it, adds it
 * to the wall, and says so when the list has run out.
 */
describe('Load more', () => {
  const wallTitles = () =>
    within(screen.getByRole('list', { name: 'Most played' }))
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);

  it('offers the next page under the wall, and adds it to the wall', async () => {
    searchServer();
    discoverServer({
      'most-played': {
        0: { titles: numbered(1, 48), next: 48 },
        48: { titles: numbered(49, 2), next: null },
      },
    });

    renderDiscover('/board/games/discover/most-played');
    await tile('Game 48');

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await tile('Game 50')).toBeInTheDocument();
    expect(wallTitles()).toEqual(numbered(1, 50).map((title) => title.title));
  });

  it('asks for the page the last one pointed at, not a page further on', async () => {
    // Two of the lists drop titles after IGDB has answered, so page one of Most anticipated
    // reaches past the 48th place to fill itself. Only the server knows where it stopped.
    searchServer();
    const discover = discoverServer({
      'most-played': {
        0: { titles: numbered(1, 48), next: 53 },
        53: { titles: numbered(54, 1), next: null },
      },
    });

    renderDiscover('/board/games/discover/most-played');
    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));

    expect(await tile('Game 54')).toBeInTheDocument();
    expect(discover.from).toEqual(['0', '53']);
  });

  it('says so when a list has run out, and offers nothing more', async () => {
    searchServer();
    discoverServer({ 'most-played': numbered(1, 3) });

    renderDiscover('/board/games/discover/most-played');
    await tile('Game 3');

    // Without it, the end of a list looks the same as a page that stopped loading.
    expect(screen.getByText("That's everything on this list right now.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('says nothing about running out of a list that had nothing in it', async () => {
    searchServer();
    discoverServer();

    renderDiscover('/board/games/discover/most-played');

    expect(await screen.findByText('Nothing on this list right now.')).toBeInTheDocument();
    expect(screen.queryByText("That's everything on this list right now.")).not.toBeInTheDocument();
  });

  it('says it is loading, and cannot be pressed again, while the next page is on its way', async () => {
    let arrive!: (page: DiscoverListPage<Game>) => void;

    searchServer();
    discoverServer({
      'most-played': {
        0: { titles: numbered(1, 48), next: 48 },
        48: new Promise((resolve) => (arrive = resolve)),
      },
    });

    renderDiscover('/board/games/discover/most-played');
    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));

    // In the words the tile's add used to say "Adding…" in, before it became three symbols.
    const loading = await screen.findByRole('button', { name: 'Loading…' });
    expect(loading).toBeDisabled();

    arrive({ titles: numbered(49, 1), next: null });
    expect(await tile('Game 49')).toBeInTheDocument();
  });

  it('shows a title once when a list has moved between two pages', async () => {
    // IGDB's answer is kept for hours and asked again at midnight, so a page loaded either side
    // of that can carry a title the page before it already showed. Twice on the wall is two
    // tiles with one key — and one of them offering to add what the other says is on the board.
    searchServer();
    discoverServer({
      'most-played': {
        0: { titles: numbered(1, 48), next: 48 },
        48: { titles: [game({ id: 48, title: 'Game 48' }), ...numbered(49, 2)], next: null },
      },
    });

    renderDiscover('/board/games/discover/most-played');
    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));

    expect(await tile('Game 50')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3, name: 'Game 48' })).toHaveLength(1);
    expect(wallTitles()).toHaveLength(50);
  });

  it('moves focus to the first new title, where reading carries on', async () => {
    // The new tiles arrive above the button. Left on it, somebody using a keyboard would have
    // to go back through all of them to reach the first.
    searchServer();
    discoverServer({
      'most-played': {
        0: { titles: numbered(1, 48), next: 48 },
        48: { titles: numbered(49, 2), next: null },
      },
    });

    renderDiscover('/board/games/discover/most-played');
    const more = await screen.findByRole('button', { name: 'Load more' });
    more.focus();
    await userEvent.keyboard('{Enter}');

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 3, name: 'Game 49' })).toHaveFocus(),
    );
  });

  it('does not move focus for a page that arrives after the tabs have moved on', async () => {
    // Asked for on Most played, landed while Popular now was open, found in the cache on the way
    // back. Nobody pressed anything on the way back, so nothing should take their focus.
    let arrive!: (page: DiscoverListPage<Game>) => void;

    searchServer();
    discoverServer({
      'most-played': {
        0: { titles: numbered(1, 48), next: 48 },
        48: new Promise((resolve) => (arrive = resolve)),
      },
      'popular-now': numbered(101, 3),
    });

    // The cache kept, as it is in the app: the page that arrives has to be found on the way back.
    authServer();
    renderWithProviders(<DiscoverPage />, {
      route: '/board/games/discover/most-played',
      path: '/board/:hobby/discover/:list?',
      keepsCache: true,
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    await userEvent.click(within(lists()).getByRole('link', { name: 'Popular now' }));
    await tile('Game 103');

    arrive({ titles: numbered(49, 2), next: null });
    await userEvent.click(within(lists()).getByRole('link', { name: 'Most played' }));

    expect(await tile('Game 50')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Game 49' })).not.toHaveFocus();
  });

  it('does not ask for every page again when the window comes back to it hours later', async () => {
    // A loaded wall refetched is every page asked for again, one after another — ten pages of
    // Popular now would be twenty IGDB requests in a few seconds, against a limit of four a
    // second. The server keeps each page's answer for the day anyway, so a wall stays as loaded
    // for as long as it is open, and a fresh visit starts again from page one.
    searchServer();
    const discover = discoverServer({
      'most-played': {
        0: { titles: numbered(1, 48), next: 48 },
        48: { titles: numbered(49, 2), next: null },
      },
    });

    renderDiscover('/board/games/discover/most-played');
    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    await tile('Game 50');
    expect(discover.from).toEqual(['0', '48']);

    const later = Date.now() + 3 * 60 * 60 * 1000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(later);

    try {
      act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });

      // Long enough for a refetch to have been asked for, had one been due.
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(discover.from).toEqual(['0', '48']);
    } finally {
      clock.mockRestore();
      focusManager.setFocused(undefined);
    }
  });

  it('keeps the wall when a page fails, says why by the button, and tries again when pressed', async () => {
    searchServer();
    discoverServer({
      'most-played': { 0: { titles: numbered(1, 48), next: 48 }, 48: 502 },
    });

    renderDiscover('/board/games/discover/most-played');
    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Upstream metadata provider failed.');
    expect(wallTitles()).toHaveLength(48);

    // IGDB has come back.
    discoverServer({
      'most-played': {
        0: { titles: numbered(1, 48), next: 48 },
        48: { titles: numbered(49, 1), next: null },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await tile('Game 49')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

/**
 * The fifth list, made from your own board: games like the ones you finished and rated 8 or more.
 * The server says how many of your titles it starts from and which of them point at each title;
 * this side says so in words, and asks again each time the list is opened.
 */
describe('From your ratings', () => {
  const RATINGS = '/board/games/discover/from-your-ratings';

  /** A page of the list as the API answers it: the titles, and the games of yours behind each. */
  const ratingsPage = (
    titles: Game[],
    because: Record<number, RatedTitle[]>,
    { seeds = 3, next = null }: { seeds?: number; next?: number | null } = {},
  ): DiscoverListPage<Game> => ({ titles, next, seeds, because });

  it('is the last tab, and says under the tabs what it holds and in what order', async () => {
    searchServer();
    discoverServer({ 'from-your-ratings': { 0: ratingsPage([], {}) } });

    renderDiscover(RATINGS);

    const tabs = await within(await screen.findByRole('navigation', { name: 'Lists' })).findAllByRole(
      'link',
    );
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'New releases',
      'Popular now',
      'Most anticipated',
      'Most played',
      'From your ratings',
    ]);
    expect(tabs.at(-1)).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByText(
        'Games like the ones you finished and rated 8 or more. Those like several of them come first.',
      ),
    ).toBeInTheDocument();
  });

  it('says on each tile which of your games it is like, the highest rated first', async () => {
    searchServer();
    discoverServer({
      'from-your-ratings': {
        0: ratingsPage([game({ id: 7, title: 'Dead Cells' }), game({ id: 8, title: 'Gris' })], {
          7: [
            { title: 'Hollow Knight', rating: 9 },
            { title: 'Celeste', rating: 8.5 },
            { title: 'Hades', rating: 8 },
          ],
          8: [{ title: 'Celeste', rating: 8.5 }],
        }),
      },
    });

    renderDiscover(RATINGS);

    expect(await tile('Dead Cells')).toHaveTextContent('Because you rated Hollow Knight 9 and 2 more');

    // One game of yours is named alone, because "and 0 more" says nothing.
    const gris = await tile('Gris');
    expect(gris).toHaveTextContent('Because you rated Celeste 8.5');
    expect(gris).not.toHaveTextContent('more');
  });

  it('says nothing about why on a list that is the same for everybody', async () => {
    searchServer();
    discoverServer({ 'new-releases': [game({ id: 7, title: 'Tunic II' })] });

    renderDiscover();

    expect(await tile('Tunic II')).not.toHaveTextContent('Because you rated');
  });

  it('with nothing finished and rated 8 or more, says how the list fills', async () => {
    searchServer();
    discoverServer({ 'from-your-ratings': { 0: ratingsPage([], {}, { seeds: 0 }) } });

    renderDiscover(RATINGS);

    expect(
      await screen.findByText(
        'Nothing here yet. Finish a game and rate it 8 or more, and games like it will show up here.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Nothing on this list right now.')).not.toBeInTheDocument();
  });

  it('with games rated and nothing left to offer, says what any empty list says', async () => {
    // Every game the seeds name is on the board already, say. Telling somebody with three games
    // rated 9 to go and rate one would be wrong, so the server's count of seeds decides.
    searchServer();
    discoverServer({ 'from-your-ratings': { 0: ratingsPage([], {}, { seeds: 3 }) } });

    renderDiscover(RATINGS);

    expect(await screen.findByText('Nothing on this list right now.')).toBeInTheDocument();
    expect(screen.queryByText(/^Nothing here yet/)).not.toBeInTheDocument();
  });

  it('keeps each page’s reasons with its own titles as Load more adds them', async () => {
    const first = numbered(1, 48);

    searchServer();
    discoverServer({
      'from-your-ratings': {
        0: ratingsPage(
          first,
          Object.fromEntries(first.map((title) => [title.id, [{ title: 'Hollow Knight', rating: 9 }]])),
          { next: 48 },
        ),
        48: ratingsPage([game({ id: 49, title: 'Game 49' })], { 49: [{ title: 'Celeste', rating: 8 }] }),
      },
    });

    renderDiscover(RATINGS);
    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));

    expect(await tile('Game 49')).toHaveTextContent('Because you rated Celeste 8');
    expect(await tile('Game 1')).toHaveTextContent('Because you rated Hollow Knight 9');
  });

  it('is asked for afresh each time it is opened', async () => {
    // A rating given in the journal has to move the list the next time the tab is opened. The
    // other lists stay as loaded for five minutes after they are left — the page shows them from
    // the cache on the way back — and kept the same way, this one would go on saying there was
    // nothing rated after somebody had gone and rated something.
    searchServer();
    discoverServer({
      'from-your-ratings': { 0: ratingsPage([], {}, { seeds: 0 }) },
      'new-releases': [game({ id: 7, title: 'Tunic II' })],
    });

    // The cache kept, as it is in the app.
    authServer();
    renderWithProviders(<DiscoverPage />, {
      route: RATINGS,
      path: '/board/:hobby/discover/:list?',
      keepsCache: true,
    });
    await screen.findByText(/^Nothing here yet/);

    await userEvent.click(within(lists()).getByRole('link', { name: 'New releases' }));
    await tile('Tunic II');

    // Rated in the journal meanwhile.
    discoverServer({
      'from-your-ratings': {
        0: ratingsPage([game({ id: 9, title: 'Dead Cells' })], {
          9: [{ title: 'Hollow Knight', rating: 9 }],
        }, { seeds: 1 }),
      },
      'new-releases': [game({ id: 7, title: 'Tunic II' })],
    });
    await userEvent.click(within(lists()).getByRole('link', { name: 'From your ratings' }));

    expect(await tile('Dead Cells')).toHaveTextContent('Because you rated Hollow Knight 9');
  });
});

/**
 * Hiding a game from Discover (#23), workshopped on 13 November 2026: an eye struck through on
 * the cover's corner, a plain card with Undo where the tile was for the rest of the visit, and
 * *1 hidden* by the way back to the board, opening the list. That one entry, kept on the server,
 * which leaves it off every list from then on; what is here is the page's half.
 *
 * When the mark shows — under the pointer, with the keyboard in the tile, always on a phone — is
 * CSS that jsdom does not run, so `discover.spec.ts` holds it in a real browser.
 */
describe('Hiding a game', () => {
  const tunic = game({ id: 7, title: 'Tunic II', coverUrl: 'https://images.igdb.com/t.jpg' });
  const prince = game({ id: 8, title: 'Blue Prince' });
  const first = game({ id: 1, title: 'First' });

  const horizon: HiddenTitle = { mediaId: 4, title: 'Horizon Zero Dawn', coverUrl: null };
  const forbidden: HiddenTitle = {
    mediaId: 9,
    title: 'Horizon Forbidden West',
    coverUrl: 'https://images.igdb.com/f.jpg',
  };

  const wallTitles = () =>
    within(screen.getByRole('list', { name: 'New releases' }))
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);

  const markOf = (title: string) =>
    screen.findByRole('button', { name: `Hide ${title} from Discover` });

  it('offers a hide on a title after its name, and none on a title already on your board', async () => {
    searchServer({ library: [{ mediaId: 8, status: 'InProgress' }] });
    discoverServer({ 'new-releases': [tunic, prince] });

    renderDiscover();

    const offered = await tile('Tunic II');
    const mark = await markOf('Tunic II');
    const heading = within(offered).getByRole('heading', { level: 3 });

    // After the name, though it sits on the cover's corner: a screen reader hears what the tile
    // is before what it does, and Tab from the heading — where Load more leaves the keyboard —
    // reaches the mark before the add.
    expect(heading.compareDocumentPosition(mark) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    act(() => heading.focus());
    await userEvent.tab();
    expect(mark).toHaveFocus();

    // On your board already, so there is nothing to hide it from, the workshop's pick: the corner
    // is the chip's.
    const onBoard = await tile('Blue Prince');
    await waitFor(() => expect(onBoard).toHaveTextContent('On your board: Playing'));
    expect(within(onBoard).queryByRole('button', { name: /^Hide / })).not.toBeInTheDocument();
  });

  it('leaves a card where the tile was, saying it is hidden, with Undo and the name under it', async () => {
    searchServer();
    discoverServer({ 'new-releases': [first, tunic, prince] });
    const hides = hiddenServer([], { games: [tunic] });

    renderDiscover();
    await userEvent.click(await markOf('Tunic II'));

    await waitFor(() => expect(hides.sent).toEqual(['hide 7']));

    const card = await tile('Tunic II');
    expect(await within(card).findByText('Hidden')).toBeInTheDocument();
    expect(card).toHaveTextContent("It won't show up on Discover again.");
    expect(within(card).getByRole('button', { name: 'Undo hiding Tunic II' })).toHaveTextContent('Undo');

    // In its place, as an add leaves its tile, and with nothing else to press.
    expect(wallTitles()).toEqual(['First', 'Tunic II', 'Blue Prince']);
    expect(within(card).getAllByRole('button')).toHaveLength(1);
  });

  it('never asks for the wall again, so the card stays where the tile was', async () => {
    searchServer();
    const discover = discoverServer({ 'new-releases': [first, tunic, prince] });
    hiddenServer([], { games: [tunic] });

    renderDiscover();
    await userEvent.click(await markOf('Tunic II'));
    await within(await tile('Tunic II')).findByText('Hidden');

    // Asked again, the server would leave the game out and the wall would close up under the
    // pointer. The next visit asks.
    expect(discover.asked).toEqual(['new-releases']);
  });

  it('takes a hide back with Undo, and puts the tile back as it was', async () => {
    searchServer();
    discoverServer({ 'new-releases': [first, tunic, prince] });
    const hides = hiddenServer([], { games: [tunic] });

    renderDiscover();
    await userEvent.click(await markOf('Tunic II'));
    await userEvent.click(await screen.findByRole('button', { name: 'Undo hiding Tunic II' }));

    await waitFor(() => expect(hides.sent).toEqual(['hide 7', 'show 7']));

    const back = await tile('Tunic II');
    expect(await within(back).findByRole('button', { name: 'Add Tunic II to backlog' })).toBeInTheDocument();
    expect(within(back).getByRole('button', { name: 'Hide Tunic II from Discover' })).toBeInTheDocument();
    expect(wallTitles()).toEqual(['First', 'Tunic II', 'Blue Prince']);
  });

  it('takes the keyboard from the mark to Undo, and from Undo back to the mark', async () => {
    // The control pressed goes with the tile each time, and focus left on it would fall to the
    // top of the page.
    searchServer();
    discoverServer({ 'new-releases': [tunic, prince] });
    hiddenServer([], { games: [tunic] });

    renderDiscover();
    const mark = await markOf('Tunic II');
    act(() => mark.focus());
    await userEvent.keyboard('{Enter}');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Undo hiding Tunic II' })).toHaveFocus(),
    );

    await userEvent.keyboard('{Enter}');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Hide Tunic II from Discover' })).toHaveFocus(),
    );
  });

  it('keeps a game hidden here hidden on every list the page draws it on', async () => {
    // Until the page is left, wherever the wall still holds it: a list asked for afresh after
    // the hide never carries it, and one loaded before it shows the card rather than the game.
    searchServer();
    discoverServer({ 'new-releases': [tunic], 'most-played': [prince, tunic] });
    hiddenServer([], { games: [tunic] });

    renderDiscover();
    await userEvent.click(await markOf('Tunic II'));
    await screen.findByRole('button', { name: 'Undo hiding Tunic II' });

    await userEvent.click(within(lists()).getByRole('link', { name: 'Most played' }));

    await screen.findByRole('list', { name: 'Most played' });
    expect(await screen.findByRole('button', { name: 'Undo hiding Tunic II' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Tunic II to backlog' })).not.toBeInTheDocument();
  });

  it('leaves a game hidden before this visit off a wall loaded before it was hidden', async () => {
    // The server leaves a hidden game out of every list. A wall kept from before the hide still
    // holds it — TanStack keeps a list five minutes after it is left — and drops it here.
    searchServer();
    discoverServer({ 'new-releases': [first, tunic, prince] });
    hiddenServer([{ mediaId: 7, title: 'Tunic II', coverUrl: null }]);

    renderDiscover();

    await waitFor(() => expect(wallTitles()).toEqual(['First', 'Blue Prince']));
  });

  it('says how many are hidden by the way back to the board, from the first hide on', async () => {
    searchServer();
    discoverServer({ 'new-releases': [tunic] });
    hiddenServer([], { games: [tunic] });

    renderDiscover();
    await tile('Tunic II');
    expect(screen.queryByRole('button', { name: /hidden$/ })).not.toBeInTheDocument();

    await userEvent.click(await markOf('Tunic II'));

    expect(await screen.findByRole('button', { name: '1 hidden' })).toBeInTheDocument();
  });

  it('counts what was hidden on an earlier visit as the page opens', async () => {
    searchServer();
    discoverServer({ 'new-releases': [tunic] });
    hiddenServer([forbidden, horizon]);

    renderDiscover();

    expect(await screen.findByRole('button', { name: '2 hidden' })).toBeInTheDocument();
  });

  it('opens the list from the count: the newest hide first, a cover and a name a row', async () => {
    searchServer();
    discoverServer({ 'new-releases': [tunic] });
    hiddenServer([forbidden, horizon]);

    renderDiscover();
    await userEvent.click(await screen.findByRole('button', { name: '2 hidden' }));

    const dialog = await screen.findByRole('dialog', { name: 'Hidden from Discover' });
    expect(dialog).toHaveTextContent(
      'None of these is offered on any Discover list. Search still finds them.',
    );

    const rows = within(dialog).getAllByRole('listitem');
    expect(rows.map((row) => within(row).getByRole('button').getAttribute('aria-label'))).toEqual([
      'Show Horizon Forbidden West on Discover again',
      'Show Horizon Zero Dawn on Discover again',
    ]);
    expect(within(rows[0]!).getByRole('button')).toHaveTextContent('Show again');
  });

  it('shows a game again from the list, takes it off the count, and closes with Done', async () => {
    searchServer();
    discoverServer({ 'new-releases': [tunic] });
    const hides = hiddenServer([forbidden, horizon]);

    renderDiscover();
    await userEvent.click(await screen.findByRole('button', { name: '2 hidden' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hidden from Discover' });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Show Horizon Forbidden West on Discover again' }),
    );

    await waitFor(() => expect(hides.sent).toEqual(['show 9']));
    await waitFor(() => expect(within(dialog).getAllByRole('listitem')).toHaveLength(1));
    expect(screen.getByRole('button', { name: '1 hidden' })).toBeInTheDocument();

    // The row the keyboard was on is gone, so it moves to the row that took its place rather than
    // falling out of the dialog onto the page behind.
    expect(
      within(dialog).getByRole('button', { name: 'Show Horizon Zero Dawn on Discover again' }),
    ).toHaveFocus();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 hidden' })).toHaveFocus();
  });

  it('turns a card back into its tile when its game is shown again from the list', async () => {
    searchServer();
    discoverServer({ 'new-releases': [tunic, prince] });
    hiddenServer([], { games: [tunic] });

    renderDiscover();
    await userEvent.click(await markOf('Tunic II'));
    await userEvent.click(await screen.findByRole('button', { name: '1 hidden' }));

    const dialog = await screen.findByRole('dialog', { name: 'Hidden from Discover' });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Show Tunic II on Discover again' }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));

    expect(await within(await tile('Tunic II')).findByRole('button', { name: 'Add Tunic II to backlog' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hidden$/ })).not.toBeInTheDocument();
  });

  it('says why when a hide fails, and leaves the tile as it was', async () => {
    searchServer();
    discoverServer({ 'new-releases': [tunic] });
    hiddenServer([], { games: [tunic], status: 500 });

    renderDiscover();
    await userEvent.click(await markOf('Tunic II'));

    expect(await screen.findByRole('alert')).toHaveTextContent('The database is unhappy.');
    expect(within(await tile('Tunic II')).getByRole('button', { name: 'Add Tunic II to backlog' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hidden$/ })).not.toBeInTheDocument();
  });
});

/**
 * Where an address that is not quite a list ends up. Through the whole router, because a
 * redirect is only visible as the page it arrives at.
 */
describe('the Discover address', () => {
  it('opens on the first list when it names none', async () => {
    authServer();
    searchServer();
    discoverServer({ 'new-releases': [game({ id: 7, title: 'Tunic II' })] });

    renderWithProviders(<App />, { route: '/board/games/discover' });

    expect(await tile('Tunic II')).toBeInTheDocument();
    expect(within(lists()).getByRole('link', { name: 'New releases' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('goes to the first list when it names one that does not exist', async () => {
    authServer();
    searchServer();
    const discover = discoverServer({ 'new-releases': [game({ id: 7, title: 'Tunic II' })] });

    renderWithProviders(<App />, { route: '/board/games/discover/trending' });

    expect(await tile('Tunic II')).toBeInTheDocument();
    expect(discover.asked).toEqual(['new-releases']);
  });

  it('goes to the board itself for a hobby with no wall', async () => {
    boardServer({ hobby: 'movies' });

    renderWithProviders(<App />, { route: '/board/movies/discover' });

    expect(await screen.findByRole('searchbox', { name: 'Search movies' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Lists' })).not.toBeInTheDocument();
  });

  it('goes to the games board for a hobby nobody has built', async () => {
    boardServer();

    renderWithProviders(<App />, { route: '/board/books/discover' });

    expect(await screen.findByRole('searchbox', { name: 'Search games' })).toBeInTheDocument();
  });
});
