import { expect, test, type Locator, type Page } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { openJournal, seed } from './support/board';

/**
 * A game's OpenCritic and Steam pages, end to end (#22).
 *
 * Every leg runs for real against a stub: IGDB's question for a game's slug and Steam page, the
 * Wikidata question from the slug to OpenCritic's ids, OpenCritic's `/game/{id}` with RapidAPI's two
 * headers, and Steam's keyless `GetAppReviews`. The backend suite fakes all four, so these are what
 * prove the four still fit together — the lesson HowLongToBeat taught three times.
 *
 * The scores and counts are the stubs', not the providers'. Hollow Knight's are Armored Core VI's
 * from the workshop's renders, so its rows are as wide as the picked shots' and the layout block
 * below measures what was picked.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await signIn(page);
});

const dialog = (page: Page) => page.getByRole('dialog');

/** The row a label heads in the band's grid: the element after the label. */
const rowOf = (page: Page, label: string): Locator =>
  dialog(page).getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]');

/** Puts a title on the board and opens its journal from its card. */
async function journalOf(page: Page, title: string): Promise<void> {
  await seed(page.request, title, 'Backlog');
  await page.goto('/board');
  await openJournal(page, title);
}

test("a game's journal finds both pages the first time it opens, and says what each says", async ({ page }) => {
  await journalOf(page, 'Hollow Knight');

  await expect(dialog(page).getByText('85 · Mighty · 91% recommend')).toBeVisible();
  await expect(dialog(page).getByText('Very Positive · 94%')).toBeVisible();
  await expect(dialog(page).getByLabel('OpenCritic ID')).toHaveValue('2390');

  await expect(dialog(page).getByRole('link', { name: 'View on OpenCritic' })).toHaveAttribute(
    'href',
    'https://opencritic.com/game/2390/-',
  );

  // The store page IGDB names in `websites`, not the other app listed first among its external ids:
  // only taking the store page first finds the game.
  await expect(dialog(page).getByRole('link', { name: 'View on Steam' })).toHaveAttribute(
    'href',
    'https://store.steampowered.com/app/367520/',
  );
});

test('a game Steam has no page of its own for has no Steam row', async ({ page }) => {
  await journalOf(page, 'Outer Wilds');

  await expect(dialog(page).getByText('85 · Mighty · 89% recommend')).toBeVisible();
  await expect(dialog(page).getByText('Steam', { exact: true })).toHaveCount(0);
  await expect(dialog(page).getByRole('link', { name: 'View on Steam' })).toHaveCount(0);
});

test('of several OpenCritic ids, the journal names the one OpenCritic calls what IGDB calls it', async ({
  page,
}) => {
  // NieR: Automata's Wikidata item carries the game and two editions. OpenCritic writes the game
  // "Nier: Automata", and the editions score higher, so neither the first id nor the best score
  // would find it.
  await journalOf(page, 'NieR: Automata');

  await expect(dialog(page).getByLabel('OpenCritic ID')).toHaveValue('3540');
  await expect(dialog(page).getByText('89 · Mighty · 93% recommend')).toBeVisible();
});

test('a number pinned in the box is checked against OpenCritic, and one it does not know is refused in words', async ({
  page,
}) => {
  // Wikidata ties Celeste to nothing, so the box is empty, with no link and nothing said. Its Steam
  // row is there all the same: IGDB names its app among the external ids alone.
  await journalOf(page, 'Celeste');

  const box = dialog(page).getByLabel('OpenCritic ID');
  await expect(dialog(page).getByText('Overwhelmingly Positive · 97%')).toBeVisible();
  await expect(box).toHaveValue('');
  await expect(dialog(page).getByRole('link', { name: 'View on OpenCritic' })).toHaveCount(0);

  await box.fill('99999999');
  await box.press('Tab');

  await expect(dialog(page).getByRole('alert')).toHaveText('OpenCritic has no game 99999999.');
  await expect(box).toHaveValue('99999999');

  // A whole address, read for its number, and pinned on Enter — once, though the box disabling
  // under the keyboard is a blur, which is the same event that commits. Only Firefox delivers that
  // blur to React, a microtask after the commit; Chromium fires it inside the commit, where React
  // drops it. So the count below goes red without ReviewRows' guard under --browser=firefox alone,
  // and jsdom, which fires no blur at all, cannot show it either.
  const pins: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().endsWith('/opencritic')) {
      pins.push(request.url());
    }
  });

  await box.fill('https://opencritic.com/game/5226/celeste');
  await box.press('Enter');

  await expect(dialog(page).getByText('92 · Mighty · 98% recommend')).toBeVisible();
  await expect(box).toHaveValue('5226');
  await expect(dialog(page).getByRole('alert')).toHaveCount(0);
  expect(pins).toHaveLength(1);
});

test("a game not out yet is not out on OpenCritic, and has Steam's own words for no reviews", async ({
  page,
}) => {
  // Silksong II is on the calendar, not in the Backlog column, and its journal opens from there.
  await seed(page.request, 'Silksong II', 'Backlog');
  await page.goto('/board');
  await page
    .getByRole('region', { name: /^Coming soon/ })
    .getByRole('button', { name: 'Silksong II', exact: true })
    .click();

  await expect(dialog(page).getByText('Not out yet')).toBeVisible();
  await expect(dialog(page).getByText('No user reviews')).toBeVisible();
});

test('a game out with too few critic reviews says so', async ({ page }) => {
  await journalOf(page, 'Tunic II');

  await expect(dialog(page).getByText('Too few reviews')).toBeVisible();
  await expect(dialog(page).getByText('Very Positive · 89%')).toBeVisible();
});

test('says … while asking, beside links that are already there', async ({ page }) => {
  // Found once already, so the journal's read carries both pages when it opens, and the links are
  // drawn before anything is said. The ask is held at the network until the rows have been looked at.
  const mediaId = await seed(page.request, 'Hollow Knight', 'Backlog');
  expect((await page.request.get(`/api/games/${mediaId}/reviews`)).ok()).toBeTruthy();

  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/api/games/*/reviews', async (route) => {
    await held;
    await route.continue();
  });

  await page.goto('/board');
  await openJournal(page, 'Hollow Knight');

  await expect(rowOf(page, 'OpenCritic ID').getByText('…')).toBeVisible();
  await expect(rowOf(page, 'Steam').getByText('…')).toBeVisible();
  await expect(dialog(page).getByRole('link', { name: 'View on OpenCritic' })).toBeVisible();
  await expect(dialog(page).getByRole('link', { name: 'View on Steam' })).toBeVisible();

  release();

  await expect(dialog(page).getByText('85 · Mighty · 91% recommend')).toBeVisible();
  await expect(dialog(page).getByText('…')).toHaveCount(0);
});

/**
 * How many lines a row of the band takes, counted as the workshop's shots counted them: by flex
 * line, the items sharing a line sharing a centre because the row centres them, plus any line a
 * run of words wraps onto inside one item. Counting text tops instead reads one line as three,
 * because the box is taller than the words beside it — the workshop's first count did exactly that.
 */
async function linesOf(row: Locator): Promise<number> {
  return row.evaluate((element) => {
    const centres: number[] = [];
    let wrapped = 0;

    for (const item of [...element.children]) {
      const box = item.getBoundingClientRect();
      if (box.height === 0) {
        continue;
      }

      const centre = (box.top + box.bottom) / 2;
      if (!centres.some((seen) => Math.abs(seen - centre) < 3)) {
        centres.push(centre);
      }

      if (item.tagName !== 'INPUT') {
        const lineHeight = parseFloat(getComputedStyle(item).lineHeight);
        if (lineHeight > 0 && box.height > lineHeight * 1.5) {
          wrapped += Math.round(box.height / lineHeight) - 1;
        }
      }
    }

    return centres.length + wrapped;
  });
}

/**
 * The rows at every width the journal has, against the picked combination as it was re-rendered
 * before the build: OpenCritic's row two lines in both drawers, one in the modal and three on a
 * phone, Steam's one everywhere. jsdom has no layout, so this is the only place a reflow shows.
 */
test.describe('the rows at every width the journal has', () => {
  async function measure(page: Page): Promise<{ openCritic: number; steam: number }> {
    await expect(dialog(page).getByText('85 · Mighty · 91% recommend')).toBeVisible();

    return {
      openCritic: await linesOf(rowOf(page, 'OpenCritic ID')),
      steam: await linesOf(rowOf(page, 'Steam')),
    };
  }

  test.describe('the drawer at 1440', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("OpenCritic's row takes two lines and Steam's one", async ({ page }) => {
      await journalOf(page, 'Hollow Knight');
      expect(await measure(page)).toEqual({ openCritic: 2, steam: 1 });
    });
  });

  test.describe('the drawer from 1536, where it widens', () => {
    test.use({ viewport: { width: 1536, height: 900 } });

    test("OpenCritic's row still takes two lines and Steam's one", async ({ page }) => {
      await journalOf(page, 'Hollow Knight');
      expect(await measure(page)).toEqual({ openCritic: 2, steam: 1 });
    });
  });

  test.describe('the modal at 1440', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('both rows take one line', async ({ page }) => {
      await seed(page.request, 'Hollow Knight', 'Backlog');
      await page.goto('/board');
      await page.getByRole('button', { name: 'Settings' }).click();
      await page.getByRole('radio', { name: 'Modal' }).click();
      await page.keyboard.press('Escape');
      await openJournal(page, 'Hollow Knight');

      expect(await measure(page)).toEqual({ openCritic: 1, steam: 1 });
    });
  });

  test.describe('a phone at 390', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("OpenCritic's row takes three lines and Steam's one", async ({ page }) => {
      await journalOf(page, 'Hollow Knight');
      expect(await measure(page)).toEqual({ openCritic: 3, steam: 1 });
    });
  });
});
