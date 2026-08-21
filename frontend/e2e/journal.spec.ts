import { expect, test } from '@playwright/test';
import { resetDatabase } from './support/database';
import { card, column, drag, openJournal, seed } from './support/board';

/**
 * Journalling a title from the board.
 *
 * The rating, the notes and the dates were reachable by the API and by nothing else — the card
 * has rendered a rating since the board was built and there was no way to set one. These check
 * the loop closes: change it in the drawer, see it on the card.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await page.goto('/board');
});

test('rating a game from the board puts the rating on its card', async ({ page, request }) => {
  await seed(request, 'Celeste', 'InProgress', { startedAt: '2026-08-10' });
  await page.reload();

  await openJournal(page, 'Celeste');
  await page.getByRole('spinbutton', { name: 'Rating' }).fill('8.5');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(
    card(page, 'Celeste').getByRole('img', { name: 'Rated 8.5 out of 10' }),
  ).toBeVisible();

  // And it is stored, not just on screen.
  await page.reload();
  await expect(
    card(page, 'Celeste').getByRole('img', { name: 'Rated 8.5 out of 10' }),
  ).toBeVisible();
});

test('a rating the column would round is refused before it is sent', async ({ page, request }) => {
  // numeric(3,1) rounds 8.75 to 8.8 rather than rejecting it, so accepting one would mean
  // reporting a rating the database does not hold.
  await seed(request, 'Celeste', 'InProgress', { startedAt: '2026-08-10' });
  await page.reload();

  await openJournal(page, 'Celeste');
  await page.getByRole('spinbutton', { name: 'Rating' }).fill('8.75');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('alert')).toContainText('one decimal place');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(card(page, 'Celeste').getByRole('img', { name: /Rated/ })).toHaveCount(0);
});

test('a corrected start date shows on the card', async ({ page, request }) => {
  await seed(request, 'Celeste', 'InProgress', { startedAt: '2026-08-10' });
  await page.reload();
  await expect(card(page, 'Celeste')).toContainText('Aug 10, 2026');

  await openJournal(page, 'Celeste');
  await page.getByLabel('Started').fill('2026-08-01');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(card(page, 'Celeste')).toContainText('Aug 1, 2026');
});

test('a finished game dragged back to the backlog stays there', async ({ page, request }) => {
  // The ordinary route to Completed leaves a start date behind, and the Backlog entry that
  // supersedes it has none. Ordering the current pass by started_at meant the completion won,
  // the card sprang back, and every retry added another orphan entry.
  await seed(request, 'Hollow Knight', 'Completed', {
    startedAt: '2024-01-10',
    completedAt: '2024-11-02',
  });
  await page.reload();

  await drag(page, card(page, 'Hollow Knight'), column(page, 'Backlog'));

  await expect(column(page, 'Backlog').getByText('Hollow Knight')).toBeVisible();

  // The reload is the point: the optimistic move always looked right, and the refetch was
  // where it came undone.
  await page.reload();
  await expect(column(page, 'Backlog').getByText('Hollow Knight')).toBeVisible();
  await expect(column(page, 'Completed').getByText('Hollow Knight')).toHaveCount(0);
});

test('the pass you finished is still there to read afterwards', async ({ page, request }) => {
  await seed(request, 'Hollow Knight', 'Completed', {
    startedAt: '2024-01-10',
    completedAt: '2024-11-02',
  });
  await page.reload();

  await drag(page, card(page, 'Hollow Knight'), column(page, 'Backlog'));

  // Waited for rather than the card merely appearing: the optimistic move carries the old entry
  // count, so ×2 is the first thing on screen that can only have come from the refetch. Opening
  // the drawer before that lands means clicking a node React is in the middle of replacing.
  await expect(
    card(page, 'Hollow Knight').getByRole('img', { name: '2 playthroughs' }),
  ).toBeVisible();

  await openJournal(page, 'Hollow Knight');

  await expect(page.getByText('Earlier passes')).toBeVisible();
  await expect(page.getByText('Nov 2, 2024')).toBeVisible();
});

test('a card still drags even though its title opens the journal', async ({ page, request }) => {
  await seed(request, 'Celeste', 'Backlog');
  await page.reload();

  await drag(page, card(page, 'Celeste'), column(page, 'InProgress'));

  await expect(column(page, 'InProgress').getByText('Celeste')).toBeVisible();
  // The gesture moved a card and did not also open anything.
  await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
});
