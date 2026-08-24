import { expect, test } from '@playwright/test';
import { resetDatabase } from './support/database';
import { column, seed } from './support/board';

/**
 * The way a game gets onto the board in the first place.
 *
 * There is no "add a game" endpoint: searching upserts every result into the catalogue as a side
 * effect, so the button only has to write a log entry. That upsert is the part worth doing for
 * real rather than stubbing in the browser — it is what turns an IGDB result into an id the
 * board can point at.
 *
 * `.fill()` rather than `.type()`, which sets the value in one shot: the 300ms debounce is then
 * waited out by an auto-retrying expect rather than by keystroke timing.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await page.goto('/board');
});

test('finding a game puts it on the board without leaving it', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search games' }).fill('hollow');
  await page.getByRole('button', { name: 'Add Hollow Knight to backlog' }).click();

  // The answer changes on the write, not on the refetch that follows it — a button still live
  // here would take a second click, and a second Backlog entry reads on the board as a replay.
  await expect(page.getByText('On your board')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Hollow Knight to backlog' })).toHaveCount(0);

  // The whole point of the move: the column behind the strip has it already.
  await expect(column(page, 'Backlog').getByText('Hollow Knight')).toBeVisible();
});

test('a game you already logged is not offered a second time', async ({ page, request }) => {
  await seed(request, 'Celeste', 'InProgress', { startedAt: '2026-08-10' });
  await page.reload();

  await page.getByRole('searchbox', { name: 'Search games' }).fill('celeste');

  // Already on the board means logged, in any column — not just Backlog.
  await expect(page.getByText('On your board')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Celeste to backlog' })).toHaveCount(0);
});

test('a search that matches nothing says so', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search games' }).fill('zzzzzz');

  await expect(page.getByText('Nothing matched “zzzzzz”.')).toBeVisible();
});

test('the results give the board back when the search is cleared', async ({ page }) => {
  const results = page.getByRole('region', { name: 'Search results' });

  await page.getByRole('searchbox', { name: 'Search games' }).fill('hollow');
  await expect(results).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search games' }).fill('');

  await expect(results).toHaveCount(0);
});

test('a mod and a bundle never reach the strip', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search games' }).fill('hollow');

  // Waited for rather than asserted straight away: an absence assertion against a strip that
  // has not loaded yet passes for the wrong reason every time.
  await expect(page.getByRole('button', { name: 'Add Hollow Knight to backlog' })).toBeVisible();

  // Both are in the stub catalogue and both match the term, so the only thing keeping them
  // out is the where clause IgdbClient sends. On the live API this is not hypothetical — the
  // first result for "Hollow Knight" is a mod of it, above the game itself.
  await expect(page.getByText('Hollow Knight: Pale Court')).toHaveCount(0);
  await expect(page.getByText('Hollow Knight Collection')).toHaveCount(0);
});

test('the real game comes first, not the fan game named after it', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search games' }).fill('Hollow Knight Silksong');

  // Both are Main Games, so the game-type filter has nothing to say about this one. The fan
  // game is the better *string* match — it is the exact title typed, and the real one has a
  // colon in it — and the stub lists it first, so IGDB relevance alone would leave it on top.
  const titles = page
    .getByRole('region', { name: 'Search results' })
    .getByRole('heading', { level: 3 });

  await expect(titles.first()).toHaveText('Hollow Knight: Silksong');
});
test('the old search address lands on the board', async ({ page }) => {
  // The screen is gone, but a bookmark to it should not be a dead end.
  await page.goto('/search');

  await expect(page.getByRole('searchbox', { name: 'Search games' })).toBeVisible();
  await expect(column(page, 'Backlog')).toBeVisible();
});
