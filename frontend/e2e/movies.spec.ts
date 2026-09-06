import { expect, test } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { card, column, drag, entriesFor, openJournal, seed, setSort } from './support/board';

/**
 * The second hobby, end to end: search, add, drag, journal.
 *
 * What this proves that no unit test can is that the *platform* carries a film. Every route
 * below is the same one games use — `/api/log-entries`, `/api/library`, the transition rules,
 * the Eastern clock — with only the catalogue differing, so a spec that passes here says the
 * hobby parameterisation reaches all the way down rather than as far as the board component.
 *
 * The one thing genuinely new is enrichment. TMDB's search carries no runtime and no genre
 * names, so a film arrives half-known and `/movie/{id}` completes it *on add* — synchronously,
 * unlike HowLongToBeat's queue. The card is therefore complete the moment it lands, with no
 * poll and no maintenance route, and the first test here is what says so.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();

  await signIn(page);
  await page.goto('/board/movies');
});

test('finding a film puts it on the board, complete, without leaving it', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search movies' }).fill('arrival');
  await page.getByRole('button', { name: 'Add Arrival to backlog' }).click();

  await expect(page.getByText('On your board')).toBeVisible();

  // The half that search could not answer, on the card immediately. No poll, no refresh route:
  // if enrichment were queued the way HowLongToBeat's is, this runtime would not be here yet.
  const arrival = card(page, 'Arrival');
  await expect(arrival).toBeVisible();
  await expect(arrival.getByText('1 h 56 m')).toBeVisible();

  // And the genre the film's own list picks, which is the specific one rather than Drama.
  await expect(arrival.getByText('Science Fiction')).toBeVisible();
});

test('half a title is enough to find a film, without a second query', async ({ page }) => {
  // Games need two queries merged and re-ranked because IGDB's search does no prefix matching at
  // all — `hollow k` answers with nothing. TMDB prefix-matches mid-word, measured against the
  // live API: `arriv` finds Arrival, `blade runn` finds Blade Runner. So `MovieCatalogService`
  // sends one query and keeps TMDB's order, and this is what says that is still enough.
  await page.getByRole('searchbox', { name: 'Search movies' }).fill('blade runn');

  await expect(page.getByRole('button', { name: 'Add Blade Runner 2049 to backlog' })).toBeVisible();
});

test('the hobby nav goes to the films board, and the films board is a films board', async ({
  page,
}) => {
  await page.goto('/board/games');
  await page.getByRole('link', { name: 'Movies' }).click();

  await expect(page).toHaveURL(/\/board\/movies$/);

  // Three columns keep their word and one does not, which is exactly what makes the fourth easy
  // to miss. The wire value behind it is unchanged: InProgress on both boards.
  await expect(page.getByRole('heading', { level: 2, name: /^Watching / })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /^Watched / })).toBeVisible();
});

test('dragging a film through the columns stamps the same dates a game would', async ({ page }) => {
  const mediaId = await seed(page.request, 'Parasite', 'Backlog', { hobby: 'movies' });
  await page.reload();

  await drag(page, card(page, 'Parasite'), column(page, 'InProgress', 'movies'));

  await expect(column(page, 'InProgress', 'movies').getByText('Parasite')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(page.request, mediaId))[0])
    .toMatchObject({ status: 'InProgress', completedAt: null });
  expect((await entriesFor(page.request, mediaId))[0]?.startedAt).not.toBeNull();

  await drag(page, card(page, 'Parasite'), column(page, 'Completed', 'movies'));

  await expect(column(page, 'Completed', 'movies').getByText('Parasite')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(page.request, mediaId))[0]?.completedAt)
    .not.toBeNull();
});

test("a film's journal is a film's: a director, a runtime, and no hours box", async ({ page }) => {
  await seed(page.request, 'Portrait of a Lady on Fire', 'InProgress', {
    hobby: 'movies',
    startedAt: '2026-08-10',
  });
  await page.reload();

  await openJournal(page, 'Portrait of a Lady on Fire');
  const drawer = page.getByRole('dialog');

  // The byline is the director, and it comes from `credits.crew` where `job === "Director"` —
  // two non-directors sit in front of it in the stub, so a byline built by taking the first
  // crew member would read "Someone in the art department" here.
  await expect(drawer.getByText('Céline Sciamma')).toBeVisible();

  // The runtime sits with the film, not with the pass: it is a fact about the film like the
  // director is, where a game's four figures sit beside your own hours to be compared with.
  await expect(drawer.getByText('Runtime')).toBeVisible();
  await expect(drawer.getByText('2 h 2 m')).toBeVisible();

  // Absent rather than relabelled, which was the decision.
  await expect(drawer.getByLabel('Hours played')).toHaveCount(0);
  await expect(drawer.getByLabel('Platform')).toHaveCount(0);
  await expect(drawer.getByLabel('HowLongToBeat ID')).toHaveCount(0);

  // And what is left says what a film's pass says.
  await expect(drawer.getByRole('region', { name: 'Watching' })).toBeVisible();
  await expect(drawer.getByLabel('Watched')).toBeVisible();
});

test('a rating and a note on a film reach the card behind the drawer', async ({ page }) => {
  await seed(page.request, 'Hereditary', 'Completed', {
    hobby: 'movies',
    completedAt: '2026-08-10',
  });
  await page.reload();

  await openJournal(page, 'Hereditary');
  const drawer = page.getByRole('dialog');

  await drawer.getByRole('spinbutton', { name: 'Exact rating' }).fill('8.5');
  await drawer.getByRole('button', { name: 'Save' }).click();
  await expect(drawer.getByRole('status')).toHaveText('Saved');

  await drawer.getByRole('textbox', { name: 'New note' }).fill('the dinner table scene');
  await drawer.getByRole('button', { name: 'Add note' }).click();
  await expect(drawer.getByText('the dinner table scene')).toBeVisible();

  await drawer.getByRole('button', { name: 'Close' }).click();

  const hereditary = card(page, 'Hereditary');
  await expect(hereditary.getByText('8.5')).toBeVisible();
  await expect(hereditary.getByText('the dinner table scene')).toBeVisible();
});

test('the Watched column orders by runtime, shortest first and the untimed last', async ({
  page,
}) => {
  // One field and one sort value serve both hobbies — `sort=length` — so a column always agrees
  // with the cards in it. Only the word changes: Time to beat, or Runtime.
  //
  // Shortest first is the games rule, and the reason carries over unchanged: the question the
  // sort answers is "what can I fit in tonight". A film TMDB has no runtime for goes last rather
  // than first, which is the arm that is easy to get backwards — null is not zero minutes.
  await seed(page.request, 'Blade Runner 2049', 'Completed', {
    hobby: 'movies',
    completedAt: '2026-08-10',
  });
  await seed(page.request, 'A Film Nobody Timed', 'Completed', {
    hobby: 'movies',
    completedAt: '2026-08-11',
  });
  await seed(page.request, 'Arrival', 'Completed', {
    hobby: 'movies',
    completedAt: '2026-08-12',
  });
  await page.reload();

  await setSort(page, 'Completed', 'Runtime', 'movies');

  // 116 minutes, then 164, then the one TMDB answers 0 for — which `ApplyDetail` stores as null
  // rather than as a film that takes no time.
  await expect
    .poll(async () =>
      column(page, 'Completed', 'movies').getByRole('heading', { level: 3 }).allTextContents(),
    )
    .toEqual(['Arrival', 'Blade Runner 2049', 'A Film Nobody Timed']);
});

test('the two boards are separate, and a film does not appear on the games one', async ({
  page,
}) => {
  // `?hobby=` has always been a real filter rather than decoration, and this is the first time
  // there has been anything to filter *out*.
  await seed(page.request, 'Celeste', 'Backlog');
  await seed(page.request, 'Spirited Away', 'Backlog', { hobby: 'movies' });
  await page.reload();

  await expect(card(page, 'Spirited Away')).toBeVisible();
  await expect(card(page, 'Celeste')).toHaveCount(0);

  await page.goto('/board/games');

  await expect(card(page, 'Celeste')).toBeVisible();
  await expect(card(page, 'Spirited Away')).toHaveCount(0);
});
