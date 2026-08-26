import { expect, test } from '@playwright/test';
import { psql, resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { awaitChecked, awaitEstimate, estimate } from './support/hltb';
import { card, column, openJournal, seed, setSort, titlesIn } from './support/board';

/**
 * How long a game takes, end to end.
 *
 * The whole of `Integrations/Hltb` runs here against `e2e/support/hltb-stub.mjs` — the bundle
 * scrape, the pair rule, the handshake, the body-borne anti-bot key, and the by-id page fetch
 * that needs none of them. The unit suites can only prove the code does what it was told; these
 * prove the legs still fit together, which is the part that broke three times against the real
 * site while every stub stayed green.
 *
 * The numbers below are the stub's, not HowLongToBeat's: Celeste 8h, Outer Wilds 15h, Hollow
 * Knight 27h, and "Anthem: Legion of Dawn" 13h behind a name the matcher is right to refuse.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();

  // Every board route is behind [Authorize] now, and the session is a cookie on this page's
  // context — which is also why the helpers below seed through page.request rather than the
  // standalone request fixture, since those two keep separate cookie jars.
  await signIn(page);
  await page.goto('/board');
});

test('adding a title to the board fetches how long it takes', async ({ page }) => {
  // The one gesture that produces the numbers without anybody running maintenance. Everything
  // the integration knows how to do runs behind this: the bundles are read, the search endpoint
  // is found by the pair rule, the handshake is done, and the search is answered.
  const mediaId = await seed(page.request, 'Celeste', 'Backlog');
  await awaitEstimate(page.request, mediaId);

  await page.reload();
  await expect(
    card(page, 'Celeste').getByRole('img', { name: 'About 20 hours to finish' }),
  ).toBeVisible();

  // All three in the drawer, under HowLongToBeat's own names; only main story on the card.
  await openJournal(page, 'Celeste');
  await expect(estimate(page, 'All play styles')).toContainText('20 h');
  await expect(estimate(page, 'Main story')).toContainText('8 h');
  await expect(estimate(page, 'Main + Extra')).toContainText('12.5 h');
  await expect(estimate(page, 'Completionist')).toContainText('38 h');
});

test('the card fills its own estimate in, without a reload', async ({ page }) => {
  // The gesture as a person actually performs it: find a game, add it, and keep looking at the
  // board. Nothing a person does waits on HowLongToBeat, so the card arrives with no estimate
  // and the number lands a few seconds later — and until the board learned to look again, the
  // only ways to see it were a reload or some unrelated write that happened to refetch the
  // column. This is the one spec that can prove it, because jsdom cannot run a poll against a
  // worker that is genuinely behind.
  await page.getByRole('searchbox', { name: 'Search games' }).fill('celeste');
  await page.getByRole('button', { name: 'Add Celeste to backlog' }).click();

  await expect(column(page, 'Backlog').getByText('Celeste')).toBeVisible();

  // No reload, no drag, no note — the column asks again on its own while the row says the
  // lookup has not happened yet, and stops as soon as it says it has.
  await expect(
    card(page, 'Celeste').getByRole('img', { name: 'About 20 hours to finish' }),
  ).toBeVisible({ timeout: 30_000 });
});

test('a title HowLongToBeat refuses stops the board waiting for it', async ({ page }) => {
  // The other half, and the reason the row reports hltb_checked_at rather than the hours. The
  // stub files Anthem as "Anthem: Legion of Dawn", which the matcher is right to refuse — so no
  // estimate is ever coming, and a board that waited on the hours would wait for the rest of
  // the session. Instead the lookup is stamped as done and the asking stops.
  const mediaId = await seed(page.request, 'Anthem', 'Backlog');
  await awaitChecked(mediaId);

  await page.reload();
  await expect(column(page, 'Backlog').getByText('Anthem')).toBeVisible();

  // Nothing to show, and nothing still being waited for: the API says it has been asked.
  const row = await page.request.get('/api/library?hobby=games&status=Backlog');
  const body = (await row.json()) as { items: { title: string; hltbPending: boolean }[] };
  expect(body.items.find((item) => item.title === 'Anthem')?.hltbPending).toBe(false);
});

test('a backfill brings the numbers to a library that predates them', async ({ page }) => {
  const mediaId = await seed(page.request, 'Hollow Knight', 'Backlog');

  // Let the lookup adding it triggered finish first, so what follows is unambiguous rather than
  // racing it.
  await awaitEstimate(page.request, mediaId);

  // Now make it a title from before the feature existed. media rows are only ever written by a
  // search, so columns added to the schema stay empty on the library you already have — that is
  // what the backfill is for, and there is no other way to arrive at that state through the app.
  psql(
    'update games set hltb_id = null, hltb_checked_at = null, hltb_all_styles_hours = null, '
    + 'hltb_main_story_hours = null, '
    + `hltb_main_extra_hours = null, hltb_completionist_hours = null where media_id = ${mediaId};`,
  );

  await page.reload();
  await expect(card(page, 'Hollow Knight').getByText(/hours to finish/)).toBeHidden();

  // 202 with a count of what was queued, not of what changed: at a floor of seconds per request
  // the answers arrive long after the reply has gone.
  const queued = await page.request.post('/api/games/hltb/refresh');
  expect(queued.status()).toBe(202);
  expect(((await queued.json()) as { queued: number }).queued).toBeGreaterThanOrEqual(1);

  await awaitEstimate(page.request, mediaId);
  await page.reload();
  await expect(
    card(page, 'Hollow Knight').getByRole('img', { name: 'About 41.8 hours to finish' }),
  ).toBeVisible();
});

test('a title HowLongToBeat has never heard of says so rather than showing nothing', async ({
  page,
}) => {
  // The stub's catalogue has no Stardew Valley at all, so the search comes back empty.
  const mediaId = await seed(page.request, 'Stardew Valley', 'Backlog');
  await awaitChecked(mediaId);

  await page.reload();
  await openJournal(page, 'Stardew Valley');

  await expect(page.getByText('No HowLongToBeat estimate yet')).toBeVisible();
  await expect(page.getByLabel('HowLongToBeat ID')).toHaveValue('');
});

test('a title filed under another name is refused rather than guessed at', async ({
  page,
}) => {
  // HowLongToBeat calls it "Anthem: Legion of Dawn" and IGDB just says "Anthem", which scores
  // nowhere near the threshold. Refusing is the correct answer — a wrong number is worse than
  // none, because the question being asked is whether this fits in a weekend. Pokemon Scarlet
  // is the real library's version of this, and it is what the pin exists for.
  const mediaId = await seed(page.request, 'Anthem', 'Backlog');
  await awaitChecked(mediaId);

  const game = await page.request.get(`/api/games/${mediaId}`);
  expect((await game.json()) as { hltbId: number | null }).toMatchObject({
    hltbId: null,
    hltbAllStylesHours: null,
  });

  await page.reload();
  await openJournal(page, 'Anthem');
  await expect(page.getByText('No HowLongToBeat estimate yet')).toBeVisible();
});

test('pinning the id by hand brings the numbers to a title nothing matched', async ({
  page,
}) => {
  const mediaId = await seed(page.request, 'Anthem', 'Backlog');
  await awaitChecked(mediaId);

  await page.reload();
  await openJournal(page, 'Anthem');
  await page.getByLabel('HowLongToBeat ID').fill('9105');
  await page.getByLabel('HowLongToBeat ID').press('Enter');

  // Fetched there and then rather than queued, because the point of typing an id is to find out
  // whether it was the right one. So the numbers are on screen without waiting for a worker.
  await expect(estimate(page, 'All play styles')).toContainText('24 h');
  await expect(estimate(page, 'Main story')).toContainText('13 h');
  await expect(estimate(page, 'Completionist')).toContainText('55 h');

  // And the link is how you check it matched the game you meant, which is why no column stores
  // HowLongToBeat's title for it.
  await expect(page.getByRole('link', { name: 'View on HowLongToBeat' })).toHaveAttribute(
    'href',
    'https://howlongtobeat.com/game/9105',
  );

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(
    card(page, 'Anthem').getByRole('img', { name: 'About 24 hours to finish' }),
  ).toBeVisible();

  // Stored, not just on screen — and stored as the id, which is what every later refresh
  // fetches instead of matching again.
  await page.reload();
  await expect(
    card(page, 'Anthem').getByRole('img', { name: 'About 24 hours to finish' }),
  ).toBeVisible();
  expect(psql(`select hltb_id from games where media_id = ${mediaId};`)).toBe('9105');
});

test('an id HowLongToBeat does not know is refused, not quietly stored', async ({
  page,
}) => {
  const mediaId = await seed(page.request, 'Celeste', 'Backlog');
  await awaitEstimate(page.request, mediaId);

  await page.reload();
  await openJournal(page, 'Celeste');
  await page.getByLabel('HowLongToBeat ID').fill('424242');
  await page.getByLabel('HowLongToBeat ID').press('Enter');

  await expect(page.getByText('HowLongToBeat has no game 424242.')).toBeVisible();

  // The title keeps what it had. A pin that answered nothing would look like it worked.
  await expect(estimate(page, 'Main story')).toContainText('8 h');
  expect(psql(`select hltb_id from games where media_id = ${mediaId};`)).toBe('9101');
});

test('taking the pin back puts the title in the way of the next backfill', async ({
  page,
}) => {
  const mediaId = await seed(page.request, 'Celeste', 'Backlog');
  await awaitEstimate(page.request, mediaId);

  await page.reload();
  await openJournal(page, 'Celeste');
  await page.getByLabel('HowLongToBeat ID').fill('');
  await page.getByLabel('HowLongToBeat ID').press('Enter');

  await expect(page.getByText('No HowLongToBeat estimate yet')).toBeVisible();

  // Back to never-having-been-asked, not to asked-and-found-nothing. The numbers were wrong, so
  // a stamp left behind would stop the backfill ever looking again and the card would stay
  // blank for good.
  expect(psql(`select hltb_checked_at is null from games where media_id = ${mediaId};`)).toBe('t');

  const queued = await page.request.post('/api/games/hltb/refresh');
  expect(((await queued.json()) as { queued: number }).queued).toBeGreaterThanOrEqual(1);
});

test('Time to beat orders the shortest first, and the unestimated last', async ({
  page,
}) => {
  // Deliberately not added in length order, so the sort has something to do.
  const knight = await seed(page.request, 'Hollow Knight', 'Backlog');
  const stardew = await seed(page.request, 'Stardew Valley', 'Backlog');
  const celeste = await seed(page.request, 'Celeste', 'Backlog');
  const wilds = await seed(page.request, 'Outer Wilds', 'Backlog');

  await awaitEstimate(page.request, knight);
  await awaitEstimate(page.request, celeste);
  await awaitEstimate(page.request, wilds);
  // Stardew is the one HowLongToBeat has never heard of, so it only ever gets a stamp.
  await awaitChecked(stardew);

  await page.reload();
  // Waited for rather than read straight after: an eager snapshot catches the board mid-load
  // and compares the ordering against an empty column.
  await expect.poll(() => titlesIn(page, 'Backlog')).toHaveLength(4);

  await setSort(page, 'Backlog', 'Time to beat');

  // On the headline figure, which is the number the cards print — a column sorted shortest
  // first on a figure nobody can see reads as broken. A title with no estimate goes last rather
  // than sorting as though nobody having timed it meant it took no time, which is the same
  // treatment an unrated title gets under Rating.
  //
  // The stub's all-styles figures deliberately order these differently from its main-story
  // ones — Outer Wilds is 17 against Celeste's 20, where main story has Celeste at 8 and Outer
  // Wilds at 15. Otherwise this spec would pass whichever field the sort happened to read.
  await expect.poll(() => titlesIn(page, 'Backlog')).toEqual([
    'Outer Wilds',
    'Celeste',
    'Hollow Knight',
    'Stardew Valley',
  ]);
});
