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
 */

test.beforeEach(() => {
  resetDatabase();
});

test('finding a game puts it on the board', async ({ page }) => {
  await page.goto('/search');

  await page.getByRole('searchbox', { name: 'Search games' }).fill('hollow');
  await page.getByRole('button', { name: 'Add Hollow Knight to backlog' }).click();

  // The answer changes on the write, not on the refetch that follows it — a button still live
  // here would take a second click, and a second Backlog entry reads on the board as a replay.
  await expect(page.getByText('On your board')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Hollow Knight to backlog' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Back to the board' }).click();
  await expect(column(page, 'Backlog').getByText('Hollow Knight')).toBeVisible();
});

test('a game you already logged is not offered a second time', async ({ page, request }) => {
  await seed(request, 'Celeste', 'InProgress', { startedAt: '2026-08-10' });

  await page.goto('/search');
  await page.getByRole('searchbox', { name: 'Search games' }).fill('celeste');

  // Already on the board means logged, in any column — not just Backlog.
  await expect(page.getByText('On your board')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Celeste to backlog' })).toHaveCount(0);
});

test('a search that matches nothing says so', async ({ page }) => {
  await page.goto('/search');

  await page.getByRole('searchbox', { name: 'Search games' }).fill('zzzzzz');

  await expect(page.getByText('Nothing matched “zzzzzz”.')).toBeVisible();
});
