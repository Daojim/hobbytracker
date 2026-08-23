import { expect, test, type Locator, type Page } from '@playwright/test';
import { card, column, seed } from './support/board';
import { resetDatabase } from './support/database';
import type { LogStatus } from '../src/api/types';

/**
 * The board at the widths a laptop actually has.
 *
 * Every claim here is a layout claim, so this is the only layer that can make one: jsdom has no
 * box model, and a height read there is whatever the stylesheet last said rather than what a
 * browser computed. That is the same reason the drag gets a real browser.
 *
 * The covers are the card's placeholder rather than real art, because the IGDB stub omits cover
 * ids on purpose — see its header. That costs nothing here: the placeholder carries the same
 * `aspect-[5/7] w-cover` classes as the `<img>`, so it is the same box being measured, and both
 * wear the same `data-cover` hook.
 */

const cover = (page: Page, title: string): Locator => card(page, title).locator('[data-cover]');

/** A box that is definitely on screen, or a failure that says which one was not. */
async function boxOf(locator: Locator, what: string) {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error(`${what} is not on screen`);
  }
  return box;
}

/**
 * How many columns share the top row.
 *
 * The grid reflows by wrapping rather than by hiding anything, so every column is on screen at
 * every width and the row breaks are the whole of what changes. Compared with a pixel of
 * tolerance because a grid track's origin is not always a whole number.
 */
async function columnsAcross(page: Page): Promise<number> {
  const statuses: LogStatus[] = ['Backlog', 'InProgress', 'Completed', 'Dropped'];
  const boxes = await Promise.all(
    statuses.map((status) => boxOf(column(page, status), `the ${status} column`)),
  );

  const top = Math.min(...boxes.map((box) => box.y));
  return boxes.filter((box) => Math.abs(box.y - top) < 2).length;
}

test.beforeEach(() => {
  resetDatabase();
});

/**
 * 5:7 is the shape the card asks for, so 7/5 is the ratio a cover should come back at. It is
 * asserted as a band rather than with toBeCloseTo so a failure reports the shape it actually got.
 */
async function expectPortraitCover(page: Page, title: string) {
  const box = await boxOf(cover(page, title), `${title}'s cover`);
  const ratio = box.height / box.width;

  expect(ratio, `${title}'s cover is ${box.width}×${box.height}`).toBeGreaterThan(1.3);
  expect(ratio, `${title}'s cover is ${box.width}×${box.height}`).toBeLessThan(1.5);
}

test.describe('at 768px, where four columns used to become four slivers', () => {
  test.use({ viewport: { width: 768, height: 900 } });

  test('a cover keeps its shape instead of stretching to the card', async ({ page, request }) => {
    await seed(request, 'Stardew Valley', 'Backlog');
    await page.goto('/board');

    await expectPortraitCover(page, 'Stardew Valley');
  });

  test('the columns fall to two across rather than four', async ({ page, request }) => {
    await seed(request, 'Celeste', 'Backlog');
    await page.goto('/board');

    expect(await columnsAcross(page)).toBe(2);
  });
});

test.describe('at 1024px', () => {
  test.use({ viewport: { width: 1024, height: 900 } });

  test('two columns still, because four would be no wider than 768 gave them', async ({
    page,
    request,
  }) => {
    await seed(request, 'Celeste', 'Backlog');
    await page.goto('/board');

    expect(await columnsAcross(page)).toBe(2);
  });
});

test.describe('at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('all four columns are across, which is the board it was designed as', async ({
    page,
    request,
  }) => {
    await seed(request, 'Celeste', 'Backlog');
    await page.goto('/board');

    expect(await columnsAcross(page)).toBe(4);
  });

  test('a cover keeps its shape here too', async ({ page, request }) => {
    await seed(request, 'Stardew Valley', 'Backlog');
    await page.goto('/board');

    await expectPortraitCover(page, 'Stardew Valley');
  });
});

/**
 * The cover reads its own column, not the window.
 *
 * Held at four columns for both measurements on purpose: comparing 768 against 1440 would prove
 * nothing, because two columns at 768 are *wider* than four at 1440 and the cover is right to be
 * bigger there. Fixing the column count and moving only the board width is the one comparison
 * where "tracks its column" is the sole explanation left.
 */
test('a cover grows with the column it is in', async ({ page, request }) => {
  await seed(request, 'Celeste', 'Backlog');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/board');
  expect(await columnsAcross(page), '1280 should already be four across').toBe(4);
  const narrow = await boxOf(cover(page, 'Celeste'), "Celeste's cover at 1280");

  await page.setViewportSize({ width: 1920, height: 900 });
  await expect
    .poll(async () => (await boxOf(cover(page, 'Celeste'), "Celeste's cover at 1920")).width)
    .toBeGreaterThan(narrow.width * 1.25);
});
