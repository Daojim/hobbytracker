import { expect, test } from '@playwright/test';
import { psql, resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { card, column, seed, titlesIn } from './support/board';

/**
 * The release calendar, end to end.
 *
 * What these prove that the unit suites cannot: that the same Backlog row really does answer two
 * different questions, and that a title moves between them with **nothing having run**. There is
 * no worker in this run — `ReleaseRefresh__Enabled` is false in `playwright.config.ts`, because
 * a timer-driven one would rewrite the windows these specs assert on — so anything that changes
 * below changes because a date passed and for no other reason.
 *
 * The stub's three upcoming titles are one of each shape the calendar has to tell apart:
 * *Silksong II* three months out to the day, *Hades III* a quarter eighteen months out, and
 * *Celeste 64* with no announced date at all. The rest of the catalogue is dated in the past, and
 * that is load-bearing: an undated catalogue would put every stub title on the calendar and empty
 * the board every other spec asserts on.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await signIn(page);
});

test('a game that is not out yet goes to the calendar rather than into the backlog', async ({
  page,
}) => {
  await seed(page.request, 'Silksong II', 'Backlog');
  await seed(page.request, 'Celeste', 'Backlog');

  await page.goto('/board/games');

  // Both are Backlog entries. Only the one that has come out is in the column.
  await expect(card(page, 'Celeste')).toBeVisible();
  expect(await titlesIn(page, 'Backlog')).toEqual(['Celeste']);

  const calendar = page.getByRole('region', { name: /^Coming soon/ });
  await expect(calendar.getByText('Silksong II')).toBeVisible();

  // And it is not a fifth column: the section sits outside the board, so the card locator —
  // which is scoped to [data-board] — cannot reach it.
  await expect(card(page, 'Silksong II')).toHaveCount(0);
});

test('the calendar says a date only as precisely as it was announced', async ({ page }) => {
  // Hades III is a quarter in the stub, stated the way IGDB states one: as the *last* day of the
  // window. A row printing the day it carries would be plausible and wrong.
  await seed(page.request, 'Hades III', 'Backlog');

  await page.goto('/board/games');

  const calendar = page.getByRole('region', { name: /^Coming soon/ });
  await expect(calendar.getByText(/Q[1-4] \d{4}/)).toBeVisible();
});

test('a title nobody has announced a date for is on the calendar, at the bottom', async ({
  page,
}) => {
  await seed(page.request, 'Silksong II', 'Backlog');
  await seed(page.request, 'Celeste 64', 'Backlog');

  await page.goto('/board/games');

  const calendar = page.getByRole('region', { name: /^Coming soon/ });
  await expect(calendar.getByText('Celeste 64')).toBeVisible();

  const groups = await calendar.getByRole('group').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label')),
  );

  expect(groups.at(-1)).toBe('No date yet');
});

test('a title IGDB carries no dates for at all reads as TBA rather than as released', async ({
  page,
}) => {
  // The bug this was reported as: Stellar Blade: Blood Rain sat in the Backlog column looking
  // like a game you could go and play. IGDB has no first_release_date and no release_dates rows
  // for it — the shape the stub's 3014 copies — and that used to read as *released*.
  //
  // End to end rather than in IgdbReleaseTests alone, because what went wrong spans the whole
  // path: the mapping, the partition and the row's own words all have to agree that a title
  // nobody has dated is still a title nobody has released.
  await seed(page.request, 'Stellar Blade: Blood Rain', 'Backlog');
  await seed(page.request, 'Celeste', 'Backlog');

  await page.goto('/board/games');
  await expect(card(page, 'Celeste')).toBeVisible();

  const row = page
    .getByRole('region', { name: /^Coming soon/ })
    .getByRole('listitem')
    .filter({ hasText: 'Stellar Blade: Blood Rain' });

  await expect(row).toBeVisible();
  await expect(row.getByText('TBA')).toBeVisible();

  // And gone from the column, because the two are complements rather than two lists.
  expect(await titlesIn(page, 'Backlog')).toEqual(['Celeste']);
});

test('a title IGDB calls a rumour stays in the backlog instead', async ({ page }) => {
  // The other half, and the reason the rule above is not simply "no date means coming soon".
  // IGDB marks Half-Life 3 Rumored, which is a claim about whether anybody announced it rather
  // than about when — so it keeps its place in the queue and the calendar stays a list of
  // things that are actually coming.
  await seed(page.request, 'Half-Life 3', 'Backlog');

  await page.goto('/board/games');
  await expect(card(page, 'Half-Life 3')).toBeVisible();

  expect(await titlesIn(page, 'Backlog')).toEqual(['Half-Life 3']);

  const calendar = page.getByRole('region', { name: /^Coming soon/ });
  await expect(calendar.getByText('Half-Life 3')).toHaveCount(0);
});

test('a title arrives in the backlog on its release day, with nothing having run', async ({
  page,
}) => {
  // The claim the whole design rests on, and the only way to show it is to move the date rather
  // than the row. Nothing is transitioned, no worker ticks, no job is triggered: the window is
  // pushed into the past and the very same row starts answering the other question.
  const mediaId = await seed(page.request, 'Silksong II', 'Backlog');

  await page.goto('/board/games');
  await expect(page.getByRole('region', { name: /^Coming soon/ }).getByText('Silksong II'))
    .toBeVisible();

  expect(await titlesIn(page, 'Backlog')).toEqual([]);

  psql(
    `update media set release_date = date '2020-01-01', release_end = date '2020-01-01' ` +
      `where id = ${mediaId}`,
  );

  await page.reload();

  await expect(card(page, 'Silksong II')).toBeVisible();
  expect(await titlesIn(page, 'Backlog')).toEqual(['Silksong II']);
  await expect(page.getByRole('region', { name: /^Coming soon/ }).getByText('Silksong II'))
    .toHaveCount(0);
});

test('the search strip offers the calendar for a game that is not out', async ({ page }) => {
  await page.goto('/board/games');

  await page.getByRole('searchbox', { name: 'Search games' }).fill('Silksong II');

  const tile = page
    .getByRole('region', { name: 'Search results' })
    .getByRole('listitem')
    .filter({ hasText: 'Silksong II' });

  await expect(tile.getByRole('button', { name: /release calendar/ })).toHaveText(
    'Add to calendar',
  );

  // And adding through it writes an ordinary Backlog entry — the same row, the same endpoint.
  await tile.getByRole('button', { name: /release calendar/ }).click();

  await expect(page.getByRole('region', { name: /^Coming soon/ }).getByText('Silksong II'))
    .toBeVisible();

  const entries = await page.request.get('/api/log-entries', { params: { pageSize: 100 } });
  const { items } = (await entries.json()) as { items: { status: string }[] };
  expect(items.map((entry) => entry.status)).toEqual(['Backlog']);
});

test('the search strip still offers a plain add for a game that is out', async ({ page }) => {
  // Outer Wilds rather than Celeste, and the reason is worth writing down: the stub's undated
  // fixture is called "Celeste 64", so a search for "Celeste" answers with two tiles and one of
  // them is unreleased. `hasText` is a substring match, so the tile this wants has to be named
  // by its heading rather than found by filtering on a title that is also a prefix.
  await page.goto('/board/games');

  await page.getByRole('searchbox', { name: 'Search games' }).fill('Outer Wilds');

  const tile = page
    .getByRole('region', { name: 'Search results' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Outer Wilds', exact: true }) });

  await expect(tile.getByRole('button', { name: /to backlog$/ })).toHaveText('Add');
});

test('an unreleased title still counts as being on your board', async ({ page }) => {
  // The trap the partition would spring if it narrowed anything but the Backlog column. The
  // strip builds its "On your board" set from the un-statused library list, so a title missing
  // from that would be offered a second time — and the second press would write a replay that
  // never happened.
  await seed(page.request, 'Silksong II', 'Backlog');

  await page.goto('/board/games');
  await page.getByRole('searchbox', { name: 'Search games' }).fill('Silksong II');

  const tile = page
    .getByRole('region', { name: 'Search results' })
    .getByRole('listitem')
    .filter({ hasText: 'Silksong II' });

  await expect(tile.getByText('On your board')).toBeVisible();
  await expect(tile.getByRole('button', { name: /release calendar/ })).toHaveCount(0);
});

test('the calendar folds away and stays folded', async ({ page }) => {
  await seed(page.request, 'Silksong II', 'Backlog');

  await page.goto('/board/games');
  await expect(page.getByRole('region', { name: /^Coming soon/ }).getByText('Silksong II'))
    .toBeVisible();

  // Named "Hide Coming soon" and reading "Hide". The button carries the heading's words in its
  // aria-label only, so this locator is deliberately the accessible name and the assertion
  // beneath it is deliberately the visible one — they are two different claims about one button.
  const fold = page.getByRole('button', { name: 'Hide Coming soon' });
  await expect(fold).toHaveText('Hide');

  await fold.click();
  await expect(page.getByText('Silksong II')).toHaveCount(0);

  await page.reload();

  await expect(page.getByRole('button', { name: 'Show Coming soon' })).toHaveText('Show');
  await expect(page.getByText('Silksong II')).toHaveCount(0);
});

test('a board whose hobby has no calendar has no section at all', async ({ page }) => {
  // TMDB is not asked for a release window, so films have no calendar to draw — and the board
  // decides that by asking the hobby rather than by looking at the slug.
  await page.goto('/board/movies');

  await expect(column(page, 'Backlog', 'movies')).toBeVisible();
  await expect(page.getByRole('region', { name: /^Coming soon/ })).toHaveCount(0);
});
