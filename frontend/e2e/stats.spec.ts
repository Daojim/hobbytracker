import { expect, test, type Locator, type Page } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { awaitEstimate } from './support/hltb';
import { seed, titlesIn, today } from './support/board';

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

/**
 * Three games rated 8 this year, Celeste the highest at 8.5, and Outer Wilds rated 9: the 8s are
 * a list long enough to lie two across, and short enough to read.
 */
async function aYearOfRatings(page: Page) {
  const rated: [string, number][] = [
    ['Celeste', 8.5],
    ['Hades', 8],
    ['Hollow Knight', 8],
    ['Outer Wilds', 9],
  ];
  for (const [title, rating] of rated) {
    await seed(page.request, title, 'Completed', { completedAt: noon(), rating });
  }
}

// Exact, because Playwright matches a name by substring and "Finished" is also "Finished each month".
const section = (page: Page, name: string) => page.getByRole('region', { name, exact: true });

type Box = { x: number; y: number; width: number; height: number };

/** That a list lies wholly inside its panel: part of it, rather than laid over the page. */
function expectInside(inner: Box, outer: Box, what: string) {
  expect(inner.x, `${what} starts inside the panel`).toBeGreaterThanOrEqual(outer.x);
  expect(inner.y, `${what} starts inside the panel`).toBeGreaterThanOrEqual(outer.y);
  expect(inner.x + inner.width, `${what} ends inside the panel`).toBeLessThanOrEqual(outer.x + outer.width);
  expect(inner.y + inner.height, `${what} ends inside the panel`).toBeLessThanOrEqual(outer.y + outer.height);
}

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

test('opens the games rated at a point inside the Ratings panel, two across', async ({ page }) => {
  // Picked from renders on 7 November 2026: the list is part of the panel, so the panel grows
  // round it and covers nothing, and it runs down one column and then the next.
  await aYearOfRatings(page);
  await page.goto(`/board/games/stats/${thisYear()}`);

  const ratings = section(page, 'Ratings');
  const eight = ratings.getByRole('button', { name: '3 rated 8' });
  await eight.click();
  await expect(eight).toHaveAttribute('aria-expanded', 'true');

  const list = ratings.getByRole('list', { name: '3 rated 8' });
  const rows = list.getByRole('listitem');
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText('Celeste');
  await expect(rows.first().getByRole('img', { name: 'Rated 8.5 out of 10' })).toBeVisible();

  expectInside(await boxOf(list, 'the list'), await boxOf(ratings, 'the ratings panel'), 'the list');

  // Down the first column and then the second: the second title under the first, the third
  // beside them.
  const [first, second, third] = await Promise.all(
    [0, 1, 2].map((index) => boxOf(rows.nth(index), `row ${index + 1}`)),
  );
  expect(second!.x, 'the second title is under the first').toBeCloseTo(first!.x, 0);
  expect(second!.y).toBeGreaterThan(first!.y);
  expect(third!.x, 'the third title starts the second column').toBeGreaterThan(first!.x + first!.width / 2);
});

// #25: a finish on your Stats page opens that game's journal over the page, the board's drawer
// whole, from its cover in the months and its row in a rating's list.

test("opens a game's journal from its cover, and Back closes it on the year it was opened from", async ({
  page,
}) => {
  await aYear(page);
  await page.goto(`/board/games/stats/${thisYear()}`);

  // A ring in the accent under the pointer and none at rest: the user's pick from renders.
  const cover = section(page, 'Finished each month').getByRole('button', { name: 'Celeste', exact: true });
  expect(await cover.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none');
  await cover.hover();
  expect(await cover.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');

  await cover.click();
  await expect(page.getByRole('dialog', { name: 'Celeste' })).toBeVisible();

  await page.goBack();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/board/games/stats/${thisYear()}$`));
  await expect(cover).toBeFocused();
});

test("opens a game's journal from its row in a rating's list, and hands the keyboard back to it", async ({
  page,
}) => {
  await aYearOfRatings(page);
  await page.goto(`/board/games/stats/${thisYear()}`);

  const ratings = section(page, 'Ratings');
  await ratings.getByRole('button', { name: '3 rated 8' }).click();
  const row = ratings.getByRole('list', { name: '3 rated 8' }).getByRole('button', { name: /^Celeste/ });
  await row.click();
  await expect(page.getByRole('dialog', { name: 'Celeste' })).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(row).toBeFocused();
});

test('a finish taken back in its journal leaves its month, and lands last in Playing', async ({ page }) => {
  await seed(page.request, 'Celeste', 'Completed', { completedAt: noon(), rating: 9 });
  // Started this year, or the board's year would leave them out of Playing: seed writes only
  // what it is given, and a pass in Playing with no start is in no year.
  await seed(page.request, 'Hades', 'InProgress', { startedAt: noon() });
  await seed(page.request, 'Hollow Knight', 'InProgress', { startedAt: noon() });
  await page.goto(`/board/games/stats/${thisYear()}`);

  const months = section(page, 'Finished each month');
  await months.getByRole('button', { name: 'Celeste', exact: true }).click();
  const journal = page.getByRole('dialog', { name: 'Celeste' });
  await journal.getByRole('button', { name: 'Column: Completed' }).click();
  await journal.getByRole('group', { name: 'Move to' }).getByRole('button', { name: 'Playing' }).click();
  await journal.getByRole('button', { name: 'No — move it to Playing' }).click();
  await expect(journal.getByRole('button', { name: 'Column: Playing' })).toBeVisible();

  // Behind the drawer, the month has let it go, with no reload.
  await expect(months.getByRole('button', { name: 'Celeste', exact: true })).toHaveCount(0);
  await expect(months).toContainText(`Nothing finished in ${thisYear()} yet.`);

  // And on the board it is last in Playing, where a move from the board's own journal lands.
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: /back to your board/i }).click();
  await expect.poll(() => titlesIn(page, 'InProgress')).toHaveLength(3);
  expect((await titlesIn(page, 'InProgress')).at(-1)).toBe('Celeste');
});

/**
 * All years as a row a year, its covers 32px wide (#24): round three's pick, because a board that
 * has been filled backwards has many years, and piled side by side ten of them made 2025's 28
 * finishes a tower 1,755px tall. A finish kept as a year is under its year as it is.
 */
async function everyYear(page: Page) {
  const titles = ['Celeste', 'Hades', 'Hollow Knight', 'Outer Wilds', 'Stardew Valley'];
  for (const [index, title] of titles.entries()) {
    await seed(page.request, title, 'Completed', { completedAt: `2025-06-0${index + 1}T12:00:00` });
  }
  await seed(page.request, 'Dead Cells', 'Completed', { completedYear: 2019 });

  await page.goto('/board/games/stats/all');

  const years = section(page, 'Finished each year');
  const covers = years.getByRole('list', { name: '2025' }).getByRole('img');
  await expect(covers).toHaveCount(titles.length);
  const boxes = await Promise.all(titles.map((title, index) => boxOf(covers.nth(index), title)));

  // One row, oldest at the left, every cover 32px across.
  for (const [index, box] of boxes.entries()) {
    expect(box.width, `${titles[index]} is 32px wide`).toBeCloseTo(32, 0);
    expect(box.y, `${titles[index]} shares the row`).toBeCloseTo(boxes[0]!.y, 0);
    if (index > 0) {
      expect(box.x, `${titles[index]} sits right of the one before`).toBeGreaterThan(boxes[index - 1]!.x);
    }
  }

  // 2019 is a row of its own above 2025's, the oldest year first, its cover the same size.
  const kept = await boxOf(years.getByRole('list', { name: '2019' }).getByRole('img'), 'Dead Cells');
  expect(kept.width).toBeCloseTo(32, 0);
  expect(kept.y + kept.height, '2019 is above 2025').toBeLessThanOrEqual(boxes[0]!.y);
}

test('lays All years out a row a year, its covers 32px wide, a kept year among them', async ({ page }) => {
  await everyYear(page);
});

/**
 * Hades finished on 3 March 2024 and Dead Cells finished in 2024 on no day anybody named: the
 * year's kept finishes are a group after December (#24), round three's pick.
 */
async function aYearWithAKeptFinish(page: Page) {
  await seed(page.request, 'Hades', 'Completed', { completedAt: '2024-03-03T12:00:00' });
  await seed(page.request, 'Dead Cells', 'Completed', { completedYear: 2024 });
  await page.goto('/board/games/stats/2024');
}

test("files a year's kept finishes after December, behind a rule and labelled with the year", async ({
  page,
}) => {
  await aYearWithAKeptFinish(page);

  const months = section(page, 'Finished each month');
  const december = await boxOf(months.getByRole('list', { name: 'December' }), 'December');
  const kept = months.getByRole('list', { name: '2024, no month' });
  await expect(kept.getByRole('img')).toHaveCount(1);
  await expect(months.getByRole('list', { name: 'March' }).getByRole('img')).toHaveCount(1);

  // After December, at the end of the row, and set apart by a rule.
  const group = await boxOf(kept, 'the year’s group');
  expect(group.x, 'after December').toBeGreaterThan(december.x + december.width);
  const rule = await kept.locator('..').evaluate((item) => getComputedStyle(item).borderLeftWidth);
  expect(rule).toBe('1px');
  await expect(kept.locator('..')).toContainText('2024');
});

test('shows a year with no days in it as its kept finishes alone, with no months', async ({ page }) => {
  await seed(page.request, 'Dead Cells', 'Completed', { completedYear: 2019 });
  await seed(page.request, 'Blasphemous', 'Completed', { completedYear: 2019 });
  await page.goto('/board/games/stats/2019');

  const months = section(page, 'Finished each month');
  await expect(months.getByRole('list', { name: '2019, no month' }).getByRole('img')).toHaveCount(2);
  await expect(months.getByRole('list', { name: 'January' })).toHaveCount(0);
  await expect(months.getByRole('list', { name: 'December' })).toHaveCount(0);
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

  test('lays All years out a row a year at this width too, its covers still 32px wide', async ({
    page,
  }) => {
    await everyYear(page);
  });

  test("files a year's kept finishes as a row after December, with no rule", async ({ page }) => {
    await aYearWithAKeptFinish(page);

    const months = section(page, 'Finished each month');
    const december = await boxOf(months.getByRole('list', { name: 'December' }), 'December');
    const kept = months.getByRole('list', { name: '2024, no month' });
    const group = await boxOf(kept, 'the year’s group');
    expect(group.y, 'a row below December').toBeGreaterThan(december.y);
    const rule = await kept.locator('..').evaluate((item) => getComputedStyle(item).borderLeftWidth);
    expect(rule).toBe('0px');
  });

  test("opens a rating's games one across, inside the panel", async ({ page }) => {
    await aYearOfRatings(page);
    await page.goto(`/board/games/stats/${thisYear()}`);

    const ratings = section(page, 'Ratings');
    await ratings.getByRole('button', { name: '3 rated 8' }).tap();

    const list = ratings.getByRole('list', { name: '3 rated 8' });
    const rows = list.getByRole('listitem');
    await expect(rows).toHaveCount(3);

    expectInside(await boxOf(list, 'the list'), await boxOf(ratings, 'the ratings panel'), 'the list');

    // One column on a phone: every title starts at the same edge, each under the one before.
    const boxes = await Promise.all([0, 1, 2].map((index) => boxOf(rows.nth(index), `row ${index + 1}`)));
    for (const [index, box] of boxes.entries()) {
      if (index > 0) {
        expect(box.x, `row ${index + 1} starts where the first does`).toBeCloseTo(boxes[0]!.x, 0);
        expect(box.y, `row ${index + 1} is under the one before`).toBeGreaterThan(boxes[index - 1]!.y);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("opens a game's journal from a cover pressed with a finger, at today's size", async ({ page }) => {
    // #25: on a phone nothing says a cover opens until it is pressed, so the press is the test.
    // Today's 32px, the user's pick from renders over 40, which wrapped a busy month.
    await aYear(page);
    await page.goto(`/board/games/stats/${thisYear()}`);

    const cover = section(page, 'Finished each month').getByRole('button', { name: 'Celeste', exact: true });
    expect((await boxOf(cover, 'the cover')).width).toBeCloseTo(32, 0);
    await cover.tap();

    await expect(page.getByRole('dialog', { name: 'Celeste' })).toBeVisible();
  });
});
