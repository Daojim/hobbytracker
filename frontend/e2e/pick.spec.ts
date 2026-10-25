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

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('opens beside the sort control, fits the screen, and shows Playing once the pick is started', async ({
    page,
  }) => {
    await seedBacklog(page, ['Celeste', 'Hades']);

    const pick = await spin(page);
    const dialog = page.getByRole('dialog', { name: 'What should I play next?' });

    // The panel at its tallest, a pick under the wheel, is on the screen whole: measured at the
    // workshop as ending 13px above the foot of a 390 × 844 phone. jsdom has no layout to ask.
    const box = (await dialog.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);

    await dialog.getByRole('button', { name: 'Start playing' }).click();

    // The switcher goes to the column the pick went to, or it only seems to vanish from Backlog.
    await expect(segment(page, 'InProgress')).toHaveAttribute('aria-checked', 'true');
    await expect(column(page, 'InProgress').getByRole('heading', { name: pick })).toBeVisible();
  });
});
