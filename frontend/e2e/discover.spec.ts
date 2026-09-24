import { expect, test } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { card, seed, titlesIn } from './support/board';

/**
 * The Discover page, end to end: a wall of what IGDB would show somebody who has not typed
 * anything, reached from under an empty search box.
 *
 * What the stub puts on each list, and why:
 *
 *   - **New releases** is *Tunic II*, out ten days before the run, and *Velvet Lounge*, which IGDB
 *     tags Erotic and which has more hype than anything else in the catalogue. The API's filter is
 *     the only thing keeping it off the top of the wall.
 *   - **Popular now** is PopScore's Playing list, with the same decoy ranked first.
 *   - **Most anticipated** is everything not out that somebody is waiting for, and that includes
 *     *Half-Life 3*: hype and no date is IGDB's "not out". It is a rumour, which the calendar does
 *     not hold, so only the API's rule keeps it off.
 *   - **Most played** is the one title with ratings, *Hollow Knight: Silksong*.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await signIn(page);
});

/** A tile on the wall, named by its heading — `hasText` would also match a title it prefixes. */
const tile = (page: import('@playwright/test').Page, title: string) =>
  page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });

test('an empty search box offers the wall, and typing takes the offer away', async ({ page }) => {
  await page.goto('/board/games');

  const offer = page.getByRole('link', { name: 'Browse popular games' });
  await expect(offer).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search games' }).fill('celeste');
  await expect(offer).toHaveCount(0);
});

test('the wall opens on new releases, and adding from it puts the game on the board', async ({
  page,
}) => {
  await page.goto('/board/games');
  await page.getByRole('link', { name: 'Browse popular games' }).click();

  await expect(page).toHaveURL(/\/board\/games\/discover\/new-releases$/);
  await expect(
    page.getByRole('navigation', { name: 'Lists' }).getByRole('link', { name: 'New releases' }),
  ).toHaveAttribute('aria-current', 'page');

  // Still the games board's page, so the hobby nav says so.
  await expect(
    page.getByRole('navigation', { name: 'Hobbies' }).getByRole('link', { name: 'Games' }),
  ).toHaveAttribute('aria-current', 'page');

  await tile(page, 'Tunic II').getByRole('button', { name: 'Add Tunic II to backlog' }).click();
  await expect(tile(page, 'Tunic II').getByText('On your board')).toBeVisible();

  await page.getByRole('link', { name: 'Back to your board' }).click();

  await expect(card(page, 'Tunic II')).toBeVisible();
  expect(await titlesIn(page, 'Backlog')).toEqual(['Tunic II']);
});

test('nothing IGDB tags erotic reaches the wall', async ({ page }) => {
  await page.goto('/board/games/discover/new-releases');
  await expect(tile(page, 'Tunic II')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Velvet Lounge' })).toHaveCount(0);

  // Ranked first by PopScore, so it has to be the second question that drops it.
  await page.getByRole('navigation', { name: 'Lists' }).getByRole('link', { name: 'Popular now' }).click();
  await expect(page).toHaveURL(/\/discover\/popular-now$/);
  await expect(tile(page, 'Hades')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Velvet Lounge' })).toHaveCount(0);
});

test('most anticipated offers the calendar, and leaves the rumour off', async ({ page }) => {
  await page.goto('/board/games/discover/most-anticipated');

  await tile(page, 'Silksong II')
    .getByRole('button', { name: 'Add Silksong II to your release calendar' })
    .click();
  await expect(tile(page, 'Silksong II').getByText('On your board')).toBeVisible();

  await expect(tile(page, 'Stellar Blade: Blood Rain')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Half-Life 3' })).toHaveCount(0);

  // It lands where the button said it would: on the calendar, not in the Backlog column.
  await page.goto('/board/games');
  await expect(page.getByRole('region', { name: /^Coming soon/ }).getByText('Silksong II')).toBeVisible();
  await expect(card(page, 'Silksong II')).toHaveCount(0);
});

test('a title already on your board says so on its cover and offers nothing to press', async ({
  page,
}) => {
  await seed(page.request, 'Hollow Knight: Silksong', 'Completed');

  await page.goto('/board/games/discover/most-played');

  await expect(tile(page, 'Hollow Knight: Silksong').getByText('On your board')).toBeVisible();
  await expect(tile(page, 'Hollow Knight: Silksong').getByRole('button')).toHaveCount(0);
});

test('a board with no wall offers no way to one', async ({ page }) => {
  await page.goto('/board/movies');
  await expect(page.getByRole('searchbox', { name: 'Search movies' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Browse popular/ })).toHaveCount(0);

  // And the address on its own lands on that hobby's board rather than on an empty page.
  await page.goto('/board/movies/discover');
  await expect(page).toHaveURL(/\/board\/movies$/);
});
