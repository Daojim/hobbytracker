import { expect, test, type Locator, type Page } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { awaitEstimate } from './support/hltb';
import { seed, today } from './support/board';

/**
 * The Stats page, end to end: the real API adding up passes the real board wrote, and the way to
 * it from the board.
 *
 * The figures are the HowLongToBeat stub's: Celeste's All Styles is 20 hours.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await signIn(page);
});

/** This year here, as the board's year control names it. */
const thisYear = () => today().slice(0, 4);

/** Midday today here, which the API reads as a wall-clock moment in the journal zone. */
const noon = () => `${today()}T12:00:00`;

/**
 * A year with one of everything: Celeste finished today in 15 hours and rated 9, Outer Wilds
 * started and dropped, and Hollow Knight waiting.
 */
async function aYear(page: Page) {
  const celeste = await seed(page.request, 'Celeste', 'Completed', {
    completedAt: noon(),
    rating: 9,
    hoursPlayed: 15,
  });
  await awaitEstimate(page.request, celeste);

  await seed(page.request, 'Outer Wilds', 'Dropped', { startedAt: noon() });
  await seed(page.request, 'Hollow Knight', 'Backlog');
}

// Exact, because Playwright matches a name by substring and "Finished" is also "Finished each month".
const section = (page: Page, name: string) => page.getByRole('region', { name, exact: true });

async function boxOf(locator: Locator, what: string) {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error(`${what} is not on screen`);
  }
  return box;
}

test("the board leads to its year's stats, which count what was logged", async ({ page }) => {
  await aYear(page);
  await page.goto('/board');

  await page.getByRole('link', { name: `Stats for ${thisYear()}` }).click();
  await expect(page).toHaveURL(new RegExp(`/board/games/stats/${thisYear()}$`));

  await expect(section(page, 'Finished').getByText('1', { exact: true })).toBeVisible();

  // Celeste finished and Outer Wilds dropped: one of the two started this year.
  await expect(section(page, 'Completion').getByText('50%')).toBeVisible();

  // 15 hours against the stub's 20.
  await expect(section(page, 'Vs HowLongToBeat').getByText('25% quicker')).toBeVisible();
  await expect(section(page, 'Rating').getByText('9.0')).toBeVisible();

  // Under the month it was finished in here, by its name.
  const month = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
  }).format(new Date());
  await expect(
    section(page, 'Finished each month')
      .getByRole('list', { name: month })
      .getByRole('img', { name: 'Celeste' }),
  ).toBeVisible();

  // Added through the API, so the column history says when it arrived.
  const backlog = section(page, 'Backlog');
  await expect(backlog.getByRole('list', { name: 'Waiting longest' })).toContainText('Hollow Knight');
  await expect(backlog).toContainText('in your backlog since today');
});

test('lays the numbers out four across and the panels two across at 1440px', async ({ page }) => {
  await aYear(page);
  await page.goto(`/board/games/stats/${thisYear()}`);

  const tiles = await Promise.all(
    ['Finished', 'Completion', 'Vs HowLongToBeat', 'Rating'].map((name) =>
      boxOf(section(page, name), `the ${name} tile`),
    ),
  );
  for (const tile of tiles) {
    expect(tile.y, 'a tile has dropped onto a row of its own').toBeCloseTo(tiles[0]!.y, 0);
  }

  const months = await boxOf(section(page, 'Finished each month'), 'the months panel');
  const ratings = await boxOf(section(page, 'Ratings'), 'the ratings panel');
  expect(ratings.y, 'the panels are one across').toBeCloseTo(months.y, 0);
  expect(ratings.x).toBeGreaterThan(months.x + months.width);
});

test('piles a year at most four covers across under All years, the first at the bottom', async ({ page }) => {
  // Every finish is shown, so a year's covers pile rather than stand one above another: 2025's
  // 28 would make the panel 1,755px tall as a stack. A year alone has the panel's whole width, and
  // the pile still stops at four, so it reads as a column of the chart rather than a strip.
  const titles = ['Celeste', 'Hades', 'Hollow Knight', 'Outer Wilds', 'Stardew Valley'];
  for (const [index, title] of titles.entries()) {
    await seed(page.request, title, 'Completed', { completedAt: `2025-06-0${index + 1}T12:00:00` });
  }

  await page.goto('/board/games/stats/all');

  const covers = section(page, 'Finished each year')
    .getByRole('list', { name: '2025' })
    .getByRole('img');
  await expect(covers).toHaveCount(titles.length);
  const boxes = await Promise.all(titles.map((title, index) => boxOf(covers.nth(index), title)));

  // The first four finishes make the bottom row, oldest at the left.
  for (const [index, box] of boxes.slice(1, 4).entries()) {
    expect(box.y, `${titles[index + 1]} shares the first row`).toBeCloseTo(boxes[0]!.y, 0);
    expect(box.x, `${titles[index + 1]} sits right of the one before`).toBeGreaterThan(boxes[index]!.x);
  }

  // And the fifth starts the row above, as a month's stack grows up from its first finish.
  expect(boxes[4]!.y + boxes[4]!.height, 'Stardew Valley starts the row above').toBeLessThanOrEqual(
    boxes[0]!.y,
  );
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("the way in is on the year's row, and the page keeps the board's gutter", async ({ page }) => {
    await aYear(page);
    await page.goto('/board');

    const link = page.getByRole('link', { name: `Stats for ${thisYear()}` });
    await expect(link).toBeInViewport();
    await link.tap();

    const finished = section(page, 'Finished');
    await expect(finished).toBeVisible();

    // The board's 16px, so the header does not step sideways between the two pages, and nothing
    // wider than the screen anywhere on the page.
    expect((await boxOf(finished, 'the Finished tile')).x).toBeCloseTo(16, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    // A month is a row on a phone: the month after it starts below it, not beside it.
    const months = section(page, 'Finished each month').locator('ol > li');
    const first = await boxOf(months.nth(0), 'January');
    const second = await boxOf(months.nth(1), 'February');
    expect(second.y).toBeGreaterThan(first.y);
    expect(second.x).toBeCloseTo(first.x, 0);
  });
});
