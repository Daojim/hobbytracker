import { expect, test, type Locator, type Page } from '@playwright/test';
import { card, column, openJournal, seed } from './support/board';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { awaitEstimate } from './support/hltb';
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

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await signIn(page);
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

  test('a cover keeps its shape instead of stretching to the card', async ({ page }) => {
    await seed(page.request, 'Stardew Valley', 'Backlog');
    await page.goto('/board');

    await expectPortraitCover(page, 'Stardew Valley');
  });

  test('the columns fall to two across rather than four', async ({ page }) => {
    await seed(page.request, 'Celeste', 'Backlog');
    await page.goto('/board');

    expect(await columnsAcross(page)).toBe(2);
  });
});

test.describe('at 1024px', () => {
  test.use({ viewport: { width: 1024, height: 900 } });

  test('two columns still, because four would be no wider than 768 gave them', async ({
    page,
  }) => {
    await seed(page.request, 'Celeste', 'Backlog');
    await page.goto('/board');

    expect(await columnsAcross(page)).toBe(2);
  });
});

test.describe('at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('all four columns are across, which is the board it was designed as', async ({
    page,
  }) => {
    await seed(page.request, 'Celeste', 'Backlog');
    await page.goto('/board');

    expect(await columnsAcross(page)).toBe(4);
  });

  test('a cover keeps its shape here too', async ({ page }) => {
    await seed(page.request, 'Stardew Valley', 'Backlog');
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
test('a cover grows with the column it is in', async ({ page }) => {
  await seed(page.request, 'Celeste', 'Backlog');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/board');
  expect(await columnsAcross(page), '1280 should already be four across').toBe(4);
  const narrow = await boxOf(cover(page, 'Celeste'), "Celeste's cover at 1280");

  await page.setViewportSize({ width: 1920, height: 900 });
  await expect
    .poll(async () => (await boxOf(cover(page, 'Celeste'), "Celeste's cover at 1920")).width)
    .toBeGreaterThan(narrow.width * 1.25);
});

/**
 * HowLongToBeat's four estimates, in both boxes the journal opens in.
 *
 * The only layer that can check this. The grid's column count comes from a container query on the
 * dialog's own width, so what decides it is a `max-w-*` in the stylesheet rather than anything a
 * component knows — and jsdom, which has no box model, reports whatever the class list last said.
 *
 * Both cases run at one viewport on purpose, and that is the claim rather than a convenience: the
 * drawer is `max-w-md` on a 4K monitor exactly as it is on a laptop, so a viewport breakpoint
 * would have answered the wrong question entirely. Only the journal setting changes between them.
 *
 * What it protects is the defect this replaced. Four spans in a wrapping flex row fitted three
 * across the drawer and dropped Completionist onto a second line under nothing, its name no
 * longer above the number it belonged to — which is invisible to every other layer here.
 *
 * The two cases answer *different numbers* about the same component at the same viewport, which
 * is what makes them worth having rather than a pair that agree by construction. Nothing but the
 * container query can produce both: a locator that found nothing fails `toHaveCount`, and a grid
 * that did not reflow — one column everywhere, or four everywhere — takes one of the two down.
 */
test.describe('the estimates read the same in the drawer as in the modal', () => {
  /** How many tiers share the top row. Reflow is the whole mechanism, so rows are the measure. */
  async function tiersAcross(page: Page): Promise<number> {
    const tiers = page.getByRole('dialog').locator('[data-hltb-tier]');
    await expect(tiers).toHaveCount(4);

    const boxes = await Promise.all(
      (await tiers.all()).map((tier, at) => boxOf(tier, `estimate ${at + 1}`)),
    );
    const top = Math.min(...boxes.map((box) => box.y));

    // A pixel of tolerance, as columnsAcross takes: a grid track's origin is not always whole.
    return boxes.filter((box) => Math.abs(box.y - top) < 2).length;
  }

  /** The journal's box is a preference on the root element, so it is set where a person sets it. */
  async function openIn(page: Page, view: 'Drawer' | 'Modal'): Promise<void> {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('radio', { name: view }).click();
    await page.keyboard.press('Escape');
    await openJournal(page, 'Hollow Knight');
  }

  test.beforeEach(async ({ page }) => {
    // Hollow Knight is the one title the stub gives all four tiers, which is what makes "two
    // across" and "four across" different numbers rather than the same one.
    const mediaId = await seed(page.request, 'Hollow Knight', 'Completed');
    await awaitEstimate(page.request, mediaId);
    await page.goto('/board');
  });

  test('two across in the drawer, where four would not fit', async ({ page }) => {
    await openIn(page, 'Drawer');

    expect(await tiersAcross(page)).toBe(2);
  });

  test('four across in the modal, which is the row that was always right there', async ({
    page,
  }) => {
    await openIn(page, 'Modal');

    expect(await tiersAcross(page)).toBe(4);
  });
});

/**
 * The release calendar's own box.
 *
 * Both claims below are box-model claims about a section that has no test anywhere else able to
 * make one, and both were wrong in the shipped version — the section ran the full width of the
 * board, and the space above a month heading was nought.
 */
test.describe('the release calendar, at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const calendar = (page: Page): Locator => page.getByRole('region', { name: /^Coming soon/ });

  test.beforeEach(async ({ page }) => {
    // One of each shape the stub has, which is also one per group: a month, a year and no date.
    // Two groups would do for the spacing, but the third costs nothing and the width test wants
    // a section tall enough to be obviously a section.
    await seed(page.request, 'Silksong II', 'Backlog');
    await seed(page.request, 'Hades III', 'Backlog');
    await seed(page.request, 'Celeste 64', 'Backlog');
    await page.goto('/board/games');
  });

  test('is two board columns wide, not four', async ({ page }) => {
    // Asserted against the Playing column's right edge rather than against a pixel count, so it
    // stays true at every width and says the thing that actually matters: the calendar's edge
    // lands on one of the board's grid lines instead of somewhere near it.
    //
    // The width is written as `50% - half a gap` in ComingSoon, which is two of four tracks plus
    // the gap between them. Change the board's gap without changing that and nothing errors —
    // the section just stops lining up, which is what this notices.
    const section = await boxOf(calendar(page), 'the Coming soon section');
    const playing = await boxOf(column(page, 'InProgress'), 'the Playing column');
    const backlog = await boxOf(column(page, 'Backlog'), 'the Backlog column');

    expect(section.x, 'starts where the board does').toBeCloseTo(backlog.x, 0);
    expect(section.x + section.width, 'ends on the Playing column').toBeCloseTo(
      playing.x + playing.width,
      0,
    );
  });

  test('leaves more air above a month heading than between two rows', async ({ page }) => {
    // It left none. `first:mt-0` was on the heading rather than on the group it heads, and a
    // heading is always the first child of its own group — so the class meant to clear the
    // margin on the first heading cleared it on every one, and a month began flush against the
    // last row of the month before.
    //
    // Compared against the space inside a group rather than against a number, because what was
    // wrong is the ranking: a month break has to read as bigger than a row break.
    const groups = calendar(page).getByRole('group');
    await expect(groups).toHaveCount(3);

    const first = await boxOf(groups.nth(0), 'the first month');
    const second = await boxOf(groups.nth(1), 'the second month');

    const heading = await boxOf(groups.nth(0).locator('p').first(), "the first month's heading");
    const row = await boxOf(groups.nth(0).getByRole('listitem').first(), 'its first row');

    const betweenGroups = second.y - (first.y + first.height);
    const insideAGroup = row.y - (heading.y + heading.height);

    expect(betweenGroups, 'a month heading sits flush against the month before it').toBeGreaterThan(
      insideAGroup,
    );
  });
});
