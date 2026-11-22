import { expect, test } from '@playwright/test';
import { card, openJournal, seed } from './support/board';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';

/**
 * Choosing a theme, and it still being chosen next time.
 *
 * The interesting half is not the menu — the unit suite covers that — but the script in
 * index.html that stamps the attribute before anything paints. It only matters on a cold load,
 * so this is the only layer that can run it at all.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();

  // Every board route is behind [Authorize] now, and the session is a cookie on this page's
  // context — which is also why the helpers below seed through page.request rather than the
  // standalone request fixture, since those two keep separate cookie jars.
  await signIn(page);
  await page.goto('/board');
});

/** The palette in the header, which holds the themes since #27, and one of them pressed. */
const choose = async (page: import('@playwright/test').Page, theme: string) => {
  await page.getByRole('button', { name: 'Theme' }).click();
  await page.getByRole('radio', { name: theme }).click();
};

test('the palette’s list is reached by the keyboard, and Escape hands it back', async ({
  page,
}) => {
  // What a real browser decides and jsdom only imitates: where Tab goes from the palette, and
  // that Escape returns the keyboard to it rather than to the top of the page. Run in Firefox as
  // well as Chromium, which is where the user reads the board.
  const palette = page.getByRole('button', { name: 'Theme' });
  await palette.focus();
  await page.keyboard.press('Enter');
  await expect(palette).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('radio', { name: 'System' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'shelf-light');
  await expect(page.getByRole('radio', { name: 'Shelf Light' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('radiogroup', { name: 'Theme' })).toHaveCount(0);
  await expect(palette).toBeFocused();
  await expect(palette).toHaveAttribute('aria-expanded', 'false');

  // And a press outside closes it without taking the keyboard anywhere.
  await palette.click();
  await page.getByRole('heading', { level: 1 }).click();
  await expect(page.getByRole('radiogroup', { name: 'Theme' })).toHaveCount(0);
});

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

test('the journal opens where you asked it to, and is the same dialog either way', async ({
  page,
}) => {
  // Geometry is the only honest way to tell these apart. Both are one `role="dialog"` with the
  // same contents and the same Escape, so anything else a spec could assert would pass in both
  // modes and prove nothing about the setting.
  await seed(page.request, 'Celeste', 'InProgress');
  await page.reload();

  const viewport = page.viewportSize()!;
  const centreOf = (box: { x: number; width: number }) => box.x + box.width / 2;

  // A modal until told otherwise, since #27: in the middle, off both edges.
  await openJournal(page, 'Celeste');
  const modal = (await page.getByRole('dialog').boundingBox())!;
  expect(modal.x).toBeGreaterThan(20);
  expect(Math.abs(centreOf(modal) - viewport.width / 2)).toBeLessThan(20);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('radio', { name: 'Drawer' }).click();
  await page.keyboard.press('Escape');

  await openJournal(page, 'Celeste');
  const drawer = (await page.getByRole('dialog').boundingBox())!;
  // Flush to the right edge, give or take a scrollbar.
  expect(drawer.x + drawer.width).toBeGreaterThan(viewport.width - 20);

  // Still a dialog, and still closes the way it did.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

/**
 * The colour a phone puts in the bar above the page: the first theme-color tag in the document
 * whose media matches, which is the rule browsers follow. Compared against the ground the page
 * is actually painted in, so this spec names no colour of its own.
 */
const bar = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const tags = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
    return tags.find((tag) => tag.media === '' || matchMedia(tag.media).matches)?.content ?? null;
  });

const ground = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--sunken').trim(),
  );

test('the bar above the page follows the chosen theme, before the bundle too', async ({
  page,
}) => {
  await choose(page, 'Ember');
  const ember = await ground(page);
  await expect.poll(() => bar(page)).toBe(ember);

  // Without a reload: this is applyTheme's half, not the pre-paint script's.
  await page.getByRole('radio', { name: 'Frost' }).click();
  const frost = await ground(page);
  expect(frost).not.toBe(ember);
  await expect.poll(() => bar(page)).toBe(frost);

  // And with the bundle blocked: this is the script's half.
  await page.route('**/src/main.tsx*', (route) => route.abort());
  await page.reload();
  await expect(page.locator('#root')).toBeEmpty();
  expect(await bar(page)).toBe(frost);
});

test('under System the bar follows the device, light and dark', async ({ page }) => {
  await choose(page, 'Ember');
  await page.getByRole('radio', { name: 'System' }).click();

  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await expect.poll(() => bar(page)).toBe(await ground(page));
  }
});

/**
 * Forest, a theme of your own the #28 workshop made from Shelf Dark, as the bundle keeps it: the
 * base, light or dark, and the twenty values worked out when it was kept.
 */
const FOREST = {
  from: 'shelf-dark',
  scheme: 'dark',
  tokens: {
    '--surface': '#1b261f',
    '--sunken': '#111a15',
    '--hover': '#242d25',
    '--line': '#2c342b',
    '--line-soft': '#222b22',
    '--fg': '#e8f2ec',
    '--muted': '#9ba69f',
    '--accent': '#e3b04b',
    '--danger': '#ff9381',
    '--ok': '#74d194',
    '--drop': '#2f3728',
    '--dropped': '#696d63',
    '--scrim': 'rgb(0 0 0 / 0.6)',
    '--well': '#16201b',
    '--rating-low': '#fb6f6f',
    '--rating-mid': '#f8a850',
    '--rating-high': '#ffd177',
    '--danger-fg': '#2a1f1c',
    '--card-shadow': '0 1px 2px rgb(0 0 0 / 0.45), 0 6px 16px rgb(0 0 0 / 0.38)',
    '--card-line': 'transparent',
  },
};

const keepForest = (page: import('@playwright/test').Page) =>
  page.evaluate((record) => {
    localStorage.setItem('hobbytracker.theme', 'mine');
    localStorage.setItem('hobbytracker.theme.mine', JSON.stringify(record));
  }, FOREST);

const token = (page: import('@playwright/test').Page, name: string) =>
  page.evaluate(
    (property) => getComputedStyle(document.documentElement).getPropertyValue(property).trim(),
    name,
  );

test('a theme of your own is on the page before the bundle is, the bar included', async ({
  page,
}) => {
  // The pre-paint script's half, which only a cold load runs. In development the stylesheet
  // arrives with the bundle, so with the bundle blocked what is on the page is what the script
  // stamped: the base's attribute, and the kept values inline on the root.
  await keepForest(page);
  await page.route('**/src/main.tsx*', (route) => route.abort());
  await page.reload();

  await expect(page.locator('#root')).toBeEmpty();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'shelf-dark');
  expect(await token(page, '--surface')).toBe('#1b261f');
  expect(await token(page, '--accent')).toBe('#e3b04b');
  expect(await page.evaluate(() => document.documentElement.style.colorScheme)).toBe('dark');
  expect(await bar(page)).toBe('#111a15');
});

test('leaving a theme of your own takes every one of its values off the page', async ({
  page,
}) => {
  await keepForest(page);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'shelf-dark');
  expect(await token(page, '--surface')).toBe('#1b261f');

  await choose(page, 'Ember');

  // Every value Forest left inline would outrank Ember's block, so the card would stay Forest's.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ember');
  expect(await page.evaluate(() => document.documentElement.style.length)).toBe(0);
  const embers = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.setAttribute('data-theme', 'ember');
    document.body.append(probe);
    const surface = getComputedStyle(probe).getPropertyValue('--surface').trim();
    probe.remove();
    return surface;
  });
  expect(embers).not.toBe('');
  expect(await token(page, '--surface')).toBe(embers);
  await expect.poll(() => bar(page)).toBe(await ground(page));
});

test('System leaves no attribute, so the device keeps deciding', async ({ page }) => {
  await choose(page, 'Ember');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ember');

  await page.getByRole('radio', { name: 'System' }).click();
  await page.reload();

  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
});

/**
 * The panel that makes a theme of your own (#28): beside the board with no scrim, so the board
 * wears each colour as it is picked, and a sheet over half a phone's screen. What only a browser
 * can say: a card's paint following a colour typed, what a press on the board does, where the
 * keyboard goes, and where the sheet sits.
 */
test.describe('making a theme of your own', () => {
  const panel = (page: import('@playwright/test').Page) =>
    page.getByRole('dialog', { name: 'Your own theme' });

  const openPanel = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: 'Theme' }).click();
    await page.getByRole('button', { name: 'Make your own…' }).click();
    await expect(panel(page)).toBeVisible();
  };

  /**
   * A colour's box. Playwright gives the swatch beside it the textbox role as well, and both are
   * named for the colour, so the box is the one that takes text.
   */
  const colourBox = (page: import('@playwright/test').Page, name: string) =>
    panel(page).getByLabel(name, { exact: true }).and(page.locator('input[type="text"]'));

  const paintOf = (page: import('@playwright/test').Page, title: string) =>
    card(page, title).evaluate((element) => getComputedStyle(element).backgroundColor);

  test('the board wears each colour as it is typed, the bar above the page included', async ({
    page,
  }) => {
    // Run in Firefox as well as Chromium, which is where the user reads the board.
    await seed(page.request, 'Celeste', 'InProgress');
    await page.reload();
    await openPanel(page);

    await colourBox(page, 'Card').fill('#2f4a4d');
    await expect.poll(() => paintOf(page, 'Celeste')).toBe('rgb(47, 74, 77)');

    await colourBox(page, 'Ground').fill('#23393b');
    await expect.poll(() => bar(page)).toBe('#23393b');
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor))
      .toBe('rgb(35, 57, 59)');

    // Kept, it is what the next load paints, before the bundle as after it.
    await page.getByRole('button', { name: 'Keep' }).click();
    await page.reload();
    await expect.poll(() => paintOf(page, 'Celeste')).toBe('rgb(47, 74, 77)');
  });

  test('a press on the board neither keeps nor cancels, and opens nothing', async ({ page }) => {
    await seed(page.request, 'Celeste', 'InProgress');
    await page.reload();
    await openPanel(page);
    await colourBox(page, 'Card').fill('#2f4a4d');

    // Where the card's name is, a press would open its journal.
    const name = card(page, 'Celeste').getByRole('button', { name: 'Celeste', exact: true });
    const box = (await name.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    await expect(panel(page)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    expect(await token(page, '--surface')).toBe('#2f4a4d');
  });

  test('the keyboard goes in from the list, stays in, and comes back to the palette', async ({
    page,
  }) => {
    // Run in Firefox as well as Chromium.
    const palette = page.getByRole('button', { name: 'Theme' });
    await palette.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Make your own…' }).focus();
    await page.keyboard.press('Enter');
    await expect(panel(page)).toBeFocused();

    // In order: the corner's ×, Made from, then each colour's swatch and its box.
    for (let stop = 0; stop < 6; stop += 1) {
      await page.keyboard.press('Tab');
    }
    const cardBox = colourBox(page, 'Card');
    await expect(cardBox).toBeFocused();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('#2f4a4d');
    expect(await token(page, '--surface')).toBe('#2f4a4d');

    // Kept in: from the last stop, Keep, the next is the first, the ×.
    await page.getByRole('button', { name: 'Keep' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Cancel' }).first()).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Keep' })).toBeFocused();

    // Escape puts back what was worn, and the keyboard on the palette.
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    await expect(palette).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.style.length)).toBe(0);

    // And Keep, by the keyboard, keeps it.
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Make your own…' }).focus();
    await page.keyboard.press('Enter');
    await expect(panel(page)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Keep' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel(page)).toHaveCount(0);
    await expect(palette).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('hobbytracker.theme'))).toBe('mine');
  });

  test.describe('on a phone', () => {
    test.skip(({ browserName }) => browserName === 'firefox', 'Firefox has no phone to emulate.');
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test('is a sheet over half the screen, with Keep in view and the board above it', async ({
      page,
    }) => {
      await seed(page.request, 'Celeste', 'InProgress');
      await page.reload();
      await openPanel(page);

      // Half of 844, as the workshop measured it: 422px.
      const sheet = (await panel(page).boundingBox())!;
      expect(Math.round(sheet.height)).toBe(422);
      expect(Math.round(sheet.y + sheet.height)).toBe(844);
      expect(sheet.x).toBe(0);
      expect(sheet.width).toBe(390);

      const keep = (await page.getByRole('button', { name: 'Keep' }).boundingBox())!;
      expect(keep.y).toBeGreaterThanOrEqual(sheet.y);
      expect(keep.y + keep.height).toBeLessThanOrEqual(844);

      // The board's switcher is still in view over the top half.
      const switcher = (await page.getByRole('radiogroup', { name: 'Columns' }).boundingBox())!;
      expect(switcher.y + switcher.height).toBeLessThanOrEqual(sheet.y);
    });
  });
});
