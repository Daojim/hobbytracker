import { expect, test } from '@playwright/test';

/**
 * Choosing a theme, and it still being chosen next time.
 *
 * The interesting half is not the menu — the unit suite covers that — but the script in
 * index.html that stamps the attribute before anything paints. It only matters on a cold load,
 * so this is the only layer that can run it at all.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/board');
});

const choose = async (page: import('@playwright/test').Page, theme: string) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('radio', { name: theme }).click();
};

test('a chosen theme is still chosen after a reload', async ({ page }) => {
  await choose(page, 'Ember');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ember');

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ember');
});

test('the theme is on the page before the bundle is', async ({ page }) => {
  // The point of the inline script, and the one thing that cannot be checked from the unit
  // suite. Blocking the module leaves the app dead on the page — deliberately: if the attribute
  // is still stamped with nothing but index.html having run, the script did it. Without that
  // script this passes only because React eventually gets there, which is exactly the flash of
  // the wrong palette that the script exists to prevent.
  await choose(page, 'Console');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'console');

  await page.route('**/src/main.tsx*', (route) => route.abort());
  await page.reload();

  await expect(page.locator('#root')).toBeEmpty();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'console');
});

test('density is remembered too, and is always stamped', async ({ page }) => {
  // Unlike the theme it has no "system" to defer to, so an absent attribute is a bug rather
  // than a meaning.
  await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('radio', { name: 'Compact' }).click();
  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
});

test('System leaves no attribute, so the device keeps deciding', async ({ page }) => {
  await choose(page, 'Ember');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ember');

  await page.getByRole('radio', { name: 'System' }).click();
  await page.reload();

  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
});
