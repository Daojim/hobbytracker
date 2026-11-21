import { expect, test, type Page } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { column, seed, segment, titlesIn } from './support/board';

/**
 * "What should I play next?", end to end: opened from Backlog's header, spun, and the pick moved
 * to Playing by the board's own move, kept across a reload.
 *
 * Under reduced motion, which the panel reads to show the pick with no spin: the spin's own
 * timing is a thing to watch rather than to wait on in a spec. Which title it lands on is the
 * draw's to say, so each spec reads the pick off the panel rather than guessing it.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await signIn(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function seedBacklog(page: Page, titles: readonly string[]) {
  for (const title of titles) {
    await seed(page.request, title, 'Backlog');
  }
  await page.goto('/board/games');
  await expect.poll(() => titlesIn(page, 'Backlog')).toHaveLength(titles.length);
}

/** Opens the picker, spins, and answers with the title it landed on. */
async function spin(page: Page): Promise<string> {
  await column(page, 'Backlog').getByRole('button', { name: 'Pick', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'What should I play next?' });
  await expect(dialog.getByText(/in the draw/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Spin', exact: true }).click();

  const said = dialog.getByRole('status');
  await expect(said).toHaveText(/^Landed on /);
  return ((await said.textContent()) ?? '').replace(/^Landed on /, '');
}

test('starts playing the pick, and it is still in Playing after a reload', async ({ page }) => {
  await seedBacklog(page, ['Celeste', 'Hades', 'Hollow Knight']);

  const pick = await spin(page);
  const dialog = page.getByRole('dialog', { name: 'What should I play next?' });

  // Wait for the move itself, not the card: the card moves before the request lands, and a reload
  // in between could take the move with it — which is what journal.spec.ts's lone-run failure is
  // thought to be.
  const moved = page.waitForResponse(
    (response) =>
      response.url().includes('/api/library/') &&
      response.url().endsWith('/status') &&
      response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Start playing' }).click();
  expect((await moved).ok()).toBe(true);

  await expect(dialog).toBeHidden();
  await expect(column(page, 'InProgress').getByRole('heading', { name: pick })).toBeVisible();

  await page.reload();

  await expect(column(page, 'InProgress').getByRole('heading', { name: pick })).toBeVisible();
  await expect(column(page, 'Backlog').getByRole('heading', { name: pick })).toHaveCount(0);
});

test('never lands on a game said no to', async ({ page }) => {
  await seedBacklog(page, ['Celeste', 'Hades']);

  const first = await spin(page);
  const dialog = page.getByRole('dialog', { name: 'What should I play next?' });
  await dialog.getByRole('button', { name: 'Not this one' }).click();

  await expect(dialog.getByText('1 of 2 in the draw')).toBeVisible();
  await expect(dialog.getByRole('status')).not.toHaveText(`Landed on ${first}`);
  await expect(dialog.getByRole('status')).toHaveText(/^Landed on /);
});

/**
 * Where the panel sits and how it is laid out on a desktop, which is CSS alone: the #26 workshop's
 * picks, 576 wide in one column with a 400 wheel, centred from 768px. At the suite's 1440 × 900.
 */
test.describe('on a desktop', () => {
  test('sits in the middle of the window before and after a spin, with the five lengths on one row', async ({
    page,
  }) => {
    await seedBacklog(page, ['Celeste', 'Hades', 'Hollow Knight']);
    await column(page, 'Backlog').getByRole('button', { name: 'Pick', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'What should I play next?' });
    await expect(dialog.getByText(/in the draw/)).toBeVisible();

    const middle = page.viewportSize()!.height / 2;
    const middleOf = async () => {
      const box = (await dialog.boundingBox())!;
      return box.y + box.height / 2;
    };

    // It sat 10% down the window, which read as the upper middle.
    expect(Math.abs((await middleOf()) - middle)).toBeLessThanOrEqual(2);

    // The width was chosen to hold the five lengths on one row, where 448 wrapped them onto two.
    const tops = await dialog
      .getByRole('radio')
      .evaluateAll((chips) => chips.map((chip) => Math.round(chip.getBoundingClientRect().top)));
    expect(tops).toHaveLength(5);
    expect(new Set(tops).size).toBe(1);

    // And each length's lines under one another: the band, how many, then the hours.
    const lines = await dialog
      .getByRole('radio', { name: /^A weekend/ })
      .evaluate((chip) => [...chip.children].map((line) => line.getBoundingClientRect()));
    expect(lines).toHaveLength(3);
    expect(lines[1]!.top).toBeGreaterThanOrEqual(lines[0]!.bottom - 1);
    expect(lines[2]!.top).toBeGreaterThanOrEqual(lines[1]!.bottom - 1);

    await dialog.getByRole('button', { name: 'Spin', exact: true }).click();
    await expect(dialog.getByRole('status')).toHaveText(/^Landed on /);

    // A pick's row makes the panel taller, and it stays in the middle: its top rises to make room.
    expect(Math.abs((await middleOf()) - middle)).toBeLessThanOrEqual(2);
  });

  test("draws a full wheel's covers no smaller than the pick's own", async ({ page }) => {
    // Eight slices, the most a wheel holds, make its smallest covers. At 300 across they were
    // 41px, smaller than the 48px cover in the pick's row under the wheel: the plan's covers
    // "turning into thumbnails", and the reason the wheel is 400 on a desktop. The stub has no
    // covers, so these are the placeholders, which wear the same boxes.
    await seedBacklog(page, [
      'Celeste',
      'Hades',
      'Hollow Knight',
      'Outer Wilds',
      'Stardew Valley',
      'Dead Cells',
      'Blasphemous',
      'Sea of Stars',
    ]);
    await column(page, 'Backlog').getByRole('button', { name: 'Pick', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'What should I play next?' });
    await expect(dialog.getByText('8 in the draw')).toBeVisible();

    // The first slice is at twelve o'clock and upright before a spin, so its box is the cover's.
    const onWheel = (await dialog.locator('[data-wheel] [data-cover]').first().boundingBox())!;

    await dialog.getByRole('button', { name: 'Spin', exact: true }).click();
    await expect(dialog.getByRole('status')).toHaveText(/^Landed on /);

    const inRow = (await dialog.locator('[data-cover]:not([data-wheel] *)').boundingBox())!;
    expect(onWheel.width).toBeGreaterThanOrEqual(inRow.width);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('opens beside the sort control, fits the screen, and shows Playing once the pick is started', async ({
    page,
  }) => {
    await seedBacklog(page, ['Celeste', 'Hades']);

    const pick = await spin(page);
    const dialog = page.getByRole('dialog', { name: 'What should I play next?' });

    // The panel at its tallest, a pick under the wheel, is on the screen whole. Since #26 a
    // length chip is a line taller, which put it 19px past the foot of a 390 × 844 phone from
    // 8% down, so a phone starts it 16px from the top. jsdom has no layout to ask.
    const box = (await dialog.boundingBox())!;
    expect(Math.round(box.y)).toBe(16);
    expect(box.y + box.height).toBeLessThanOrEqual(844);

    await dialog.getByRole('button', { name: 'Start playing' }).click();

    // The switcher goes to the column the pick went to, or it only seems to vanish from Backlog.
    await expect(segment(page, 'InProgress')).toHaveAttribute('aria-checked', 'true');
    await expect(column(page, 'InProgress').getByRole('heading', { name: pick })).toBeVisible();
  });
});
