import { expect, test, type Page } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';

/**
 * Settings, a dialog behind the gear since #27, where it was a panel under a button.
 *
 * What a browser decides and jsdom only imitates: where the keyboard goes as the dialog and the
 * dialogs it opens come and go, and where the dialog sits. The keyboard cases run in Firefox as
 * well as Chromium, because Firefox is where the user reads the board; `isMobile` is not used
 * here, so every case runs in both.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await signIn(page);
  await page.goto('/board');
});

const gear = (page: Page) => page.getByRole('button', { name: 'Settings' });
const settings = (page: Page) => page.getByRole('dialog', { name: 'Settings' });

/** Whether the keyboard is somewhere inside a dialog, which may have moved it to a control. */
const holdsTheKeyboard = (dialog: ReturnType<Page['getByRole']>) =>
  dialog.evaluate((element) => element.contains(document.activeElement));

test('takes the keyboard, keeps Tab inside, and Escape hands it back to the gear', async ({
  page,
}) => {
  await gear(page).focus();
  await page.keyboard.press('Enter');
  await expect(settings(page)).toBeFocused();

  // The first stop is the ×, and the last is the delete: round from either end, never out onto
  // the board behind, which aria-modal says is inert.
  const close = settings(page).getByRole('button', { name: 'Close' });
  const last = settings(page).getByRole('button', { name: 'Delete my account…' });
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();

  // A choice is made from the keyboard, and the dialog stays for the next.
  await settings(page).getByRole('radio', { name: 'Compact' }).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  await expect(settings(page)).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(settings(page)).toHaveCount(0);
  await expect(gear(page)).toBeFocused();
});

test('closes by its × and by a press beside it, handing the keyboard back each time', async ({
  page,
}) => {
  await gear(page).click();
  await settings(page).getByRole('button', { name: 'Close' }).click();
  await expect(settings(page)).toHaveCount(0);
  await expect(gear(page)).toBeFocused();

  // A press on the scrim, at the window's top-left corner, which the dialog never covers.
  await gear(page).click();
  await expect(settings(page)).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(settings(page)).toHaveCount(0);
  await expect(gear(page)).toBeFocused();
});

test('Share this board… opens in Settings’ place, and hands the keyboard back to the gear', async ({
  page,
}) => {
  await gear(page).click();
  await settings(page).getByRole('button', { name: 'Share this board…' }).click();

  const share = page.getByRole('dialog', { name: 'Share this board' });
  await expect(share).toBeVisible();
  await expect(settings(page)).toHaveCount(0);
  await expect.poll(() => holdsTheKeyboard(share)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(share).toHaveCount(0);
  await expect(gear(page)).toBeFocused();
});

test.describe('at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('is 768 wide, in the middle of the window', async ({ page }) => {
    // 768 from 768px, the user's pick over the journal modal's 672, and centred as the picker is
    // since #26.
    await gear(page).click();
    const box = (await settings(page).boundingBox())!;
    const [wide, tall] = await page.evaluate(() => [
      document.documentElement.clientWidth,
      window.innerHeight,
    ]);

    expect(box.width).toBe(768);
    expect(box.x).toBeCloseTo((wide - box.width) / 2, 0);
    expect(box.y).toBeCloseTo((tall - box.height) / 2, 0);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('is one column 16px in from either edge and from the top', async ({ page }) => {
    await gear(page).click();
    const box = (await settings(page).boundingBox())!;

    expect(box.x).toBeCloseTo(16, 0);
    expect(box.width).toBeCloseTo(358, 0);
    expect(box.y).toBeCloseTo(16, 0);
  });
});
