import { expect, test, type Locator, type Page } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { card, openJournal, passSaved, seed, titlesIn, todayOnCard } from './support/board';

/**
 * The Discover page, end to end: a wall of what IGDB would show somebody who has not typed
 * anything, reached from under an empty search box.
 *
 * What the stub puts on each list, and why:
 *
 *   - **New releases** is *Tunic II*, out ten days before the run, and *Velvet Lounge*, which IGDB
 *     tags Erotic and which has more hype than anything else in the catalogue. The API's filter is
 *     the only thing keeping it off the top of the wall.
 *   - **Popular now** is PopScore's Playing list, with the same decoy ranked first.
 *   - **Most anticipated** is everything not out that somebody is waiting for, and that includes
 *     *Half-Life 3*: hype and no date is IGDB's "not out". It is a rumour, which the calendar does
 *     not hold, so only the API's rule keeps it off. So is *Scalebound*, cancelled, which the
 *     calendar would hold and this list's own rule does not.
 *   - **Most played** opens on *Hollow Knight: Silksong*, the title the most people have rated.
 *   - **From your ratings** is made from the board: what the stub calls like the games finished
 *     and rated 8 or more. *Hollow Knight* names one game of each fate — offered, kept off by the
 *     Discover filter, by the floor on ratings, and for being the original of a version on the
 *     board — and *Castlevania Requiem*, a port, asks about its original rather than itself.
 *
 * The API here pages a list two titles at a time rather than 48 — see `playwright.config.ts` — so
 * Popular now and Most anticipated each take a Load more to finish.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await signIn(page);
});

/** A tile on the wall, named by its heading — `hasText` would also match a title it prefixes. */
const tile = (page: Page, title: string) =>
  page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });

/** The eye on a tile's cover that hides its title from Discover. */
const markOf = (page: Page, title: string) =>
  tile(page, title).getByRole('button', { name: `Hide ${title} from Discover` });

/**
 * Whether the browser draws something where it stands, as an eye would judge it: neither faded out
 * nor made invisible. Both, so that how the mark is kept out of sight at rest is the keyboard
 * check's to tell apart, and not this one's.
 */
const isDrawn = (locator: Locator) =>
  locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.opacity !== '0' && style.visibility !== 'hidden';
  });

/** Hides a title from its tile, with the pointer on the tile as somebody's would be. */
async function hide(page: Page, title: string) {
  await tile(page, title).hover();
  await markOf(page, title).click();
  await expect(tile(page, title)).toContainText("It won't show up on Discover again.");
}

test('an empty search box offers the wall, and typing takes the offer away', async ({ page }) => {
  await page.goto('/board/games');

  const offer = page.getByRole('link', { name: 'Browse popular games' });
  await expect(offer).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search games' }).fill('celeste');
  await expect(offer).toHaveCount(0);
});

test('the wall opens on new releases, and adding from it puts the game on the board', async ({
  page,
}) => {
  await page.goto('/board/games');
  await page.getByRole('link', { name: 'Browse popular games' }).click();

  await expect(page).toHaveURL(/\/board\/games\/discover\/new-releases$/);
  await expect(
    page.getByRole('navigation', { name: 'Lists' }).getByRole('link', { name: 'New releases' }),
  ).toHaveAttribute('aria-current', 'page');

  // Still the games board's page, so the hobby nav says so.
  await expect(
    page.getByRole('navigation', { name: 'Hobbies' }).getByRole('link', { name: 'Games' }),
  ).toHaveAttribute('aria-current', 'page');

  await tile(page, 'Tunic II').getByRole('button', { name: 'Add Tunic II to backlog' }).click();
  await expect(tile(page, 'Tunic II')).toContainText('On your board: Backlog');

  await page.getByRole('link', { name: 'Back to your board' }).click();

  await expect(card(page, 'Tunic II')).toBeVisible();
  expect(await titlesIn(page, 'Backlog')).toEqual(['Tunic II']);
});

test('nothing IGDB tags erotic reaches the wall', async ({ page }) => {
  await page.goto('/board/games/discover/new-releases');
  await expect(tile(page, 'Tunic II')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Velvet Lounge' })).toHaveCount(0);

  // Ranked first by PopScore, so it has to be the second question that drops it.
  await page.getByRole('navigation', { name: 'Lists' }).getByRole('link', { name: 'Popular now' }).click();
  await expect(page).toHaveURL(/\/discover\/popular-now$/);
  await expect(tile(page, 'Hades')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Velvet Lounge' })).toHaveCount(0);
});

test('most anticipated offers the calendar, and leaves the rumour and the cancellation off', async ({
  page,
}) => {
  await page.goto('/board/games/discover/most-anticipated');

  await tile(page, 'Silksong II')
    .getByRole('button', { name: 'Add Silksong II to your release calendar' })
    .click();
  // On the calendar rather than in the column, and the chip says so rather than "Backlog".
  await expect(tile(page, 'Silksong II')).toContainText('On your board: Coming soon');

  await expect(tile(page, 'Stellar Blade: Blood Rain')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Half-Life 3' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Scalebound' })).toHaveCount(0);

  // It lands where the button said it would: on the calendar, not in the Backlog column.
  await page.goto('/board/games');
  await expect(page.getByRole('region', { name: /^Coming soon/ }).getByText('Silksong II')).toBeVisible();
  await expect(card(page, 'Silksong II')).toHaveCount(0);
});

test('load more carries a list on past what it kept off, and says when it has run out', async ({
  page,
}) => {
  await page.goto('/board/games/discover/most-anticipated');

  // Page one asked IGDB about four places — Silksong II, Scalebound, Half-Life 3, Stellar Blade —
  // and kept two. Page two starts after all four, which only the API could know.
  const wall = page.getByRole('list', { name: 'Most anticipated' });
  await expect(wall.getByRole('heading', { level: 3 })).toHaveText([
    'Silksong II',
    'Stellar Blade: Blood Rain',
  ]);

  await page.getByRole('button', { name: 'Load more' }).click();

  await expect(wall.getByRole('heading', { level: 3 })).toHaveText([
    'Silksong II',
    'Stellar Blade: Blood Rain',
    'Hades III',
  ]);
  await expect(page.getByText("That's everything on this list right now.")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);

  // Kept off the second page as well as the first.
  await expect(page.getByRole('heading', { name: 'Half-Life 3' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Scalebound' })).toHaveCount(0);
});

test('popular now carries on through PopScore in its own order', async ({ page }) => {
  await page.goto('/board/games/discover/popular-now');

  // PopScore ranks the Erotic decoy first and the question describing the ranking declines it,
  // so page one is places two and three, and page two starts at the fourth.
  const wall = page.getByRole('list', { name: 'Popular now' });
  await expect(wall.getByRole('heading', { level: 3 })).toHaveText(['Hades', 'Stardew Valley']);

  // From the keyboard, which is where focus moving to the first new title matters.
  await page.getByRole('button', { name: 'Load more' }).focus();
  await page.keyboard.press('Enter');

  await expect(wall.getByRole('heading', { level: 3 })).toHaveText([
    'Hades',
    'Stardew Valley',
    'Celeste',
    'Hollow Knight',
  ]);
  await expect(wall.getByRole('heading', { level: 3, name: 'Celeste' })).toBeFocused();
});

test('a title already on your board says so on its cover and offers nothing to press', async ({
  page,
}) => {
  await seed(page.request, 'Hollow Knight: Silksong', 'Completed');

  await page.goto('/board/games/discover/most-played');

  await expect(tile(page, 'Hollow Knight: Silksong')).toContainText('On your board: Completed');
  await expect(tile(page, 'Hollow Knight: Silksong').getByRole('button')).toHaveCount(0);
});

test('most played fills a board backwards: one press puts a game straight into Completed', async ({
  page,
}) => {
  // The feedback the whole of this answered: a list of games people have finished, added one
  // at a time to Backlog and then dragged across. Now it is one press, finished today — the
  // date a drag would have stamped — for the journal to correct if it was years ago.
  await page.goto('/board/games/discover/most-played');

  await tile(page, 'Hollow Knight: Silksong')
    .getByRole('button', { name: 'Add Hollow Knight: Silksong to completed' })
    .click();
  await expect(tile(page, 'Hollow Knight: Silksong')).toContainText('On your board: Completed');

  await page.getByRole('link', { name: 'Back to your board' }).click();

  await expect(card(page, 'Hollow Knight: Silksong')).toBeVisible();
  expect(await titlesIn(page, 'Completed')).toEqual(['Hollow Knight: Silksong']);
  await expect(card(page, 'Hollow Knight: Silksong')).toContainText(todayOnCard());
});

test('from your ratings says how it fills while nothing is finished and rated 8 or more', async ({
  page,
}) => {
  await seed(page.request, 'Celeste', 'Completed', { rating: 7.5, completedAt: '2026-08-01' });

  await page.goto('/board/games/discover/from-your-ratings');

  await expect(
    page.getByText(
      'Nothing here yet. Finish a game and rate it 8 or more, and games like it will show up here.',
    ),
  ).toBeVisible();
});

test('from your ratings offers games like the ones you rated, says why, and moves when you rate another', async ({
  page,
}) => {
  // A port finished and rated, which asks about the 1997 original rather than itself, and Hollow
  // Knight finished and not rated yet.
  await seed(page.request, 'Castlevania Requiem', 'Completed', { rating: 8.5, completedAt: '2026-08-01' });
  await seed(page.request, 'Hollow Knight', 'Completed', { completedAt: '2026-09-01' });

  await page.goto('/board/games/discover/from-your-ratings');

  const wall = page.getByRole('list', { name: 'From your ratings' });
  await expect(wall.getByRole('heading', { level: 3 })).toHaveText(['Dead Cells', 'Blasphemous']);
  await expect(tile(page, 'Dead Cells')).toContainText('Because you rated Castlevania Requiem 8.5');

  // Rated in the journal, as a person would, with the list left behind in the page's cache.
  await page.getByRole('link', { name: 'Back to your board' }).click();
  await openJournal(page, 'Hollow Knight');
  await page.getByRole('spinbutton', { name: 'Exact rating' }).fill('9');
  await passSaved(page);
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('link', { name: 'Browse popular games' }).click();
  await page.getByRole('navigation', { name: 'Lists' }).getByRole('link', { name: 'From your ratings' }).click();

  // Named by both now, so it says the one rated higher and counts the other.
  await expect(tile(page, 'Dead Cells')).toContainText('Because you rated Hollow Knight 9 and 1 more');
  await expect(wall.getByRole('heading', { level: 3 })).toHaveText(['Dead Cells', 'Blasphemous']);

  // And nothing after them. The API pages two at a time here, and a decoy that got through would
  // rank below both and wait on page two, where the checks below could never see it.
  await expect(page.getByText("That's everything on this list right now.")).toBeVisible();

  // Hollow Knight names each of these, or the port does, and none is offered: the Erotic decoy by
  // the filter every list carries, a game four people rated by the floor, the port's original by
  // the rule that it is the same game, and what only the port's own list names by asking about
  // the original instead.
  for (const never of [
    'Velvet Lounge',
    'Pixel Hike',
    'Castlevania: Symphony of the Night',
    'Idle Castle Tycoon',
    'Hollow Knight',
  ]) {
    await expect(page.getByRole('heading', { level: 3, name: never, exact: true })).toHaveCount(0);
  }

  await tile(page, 'Dead Cells').getByRole('button', { name: 'Add Dead Cells to backlog' }).click();
  await expect(tile(page, 'Dead Cells')).toContainText('On your board: Backlog');

  await page.getByRole('link', { name: 'Back to your board' }).click();
  await expect(card(page, 'Dead Cells')).toBeVisible();
  expect(await titlesIn(page, 'Backlog')).toEqual(['Dead Cells']);
});

// ------------------------------------------------------------------ hiding a game (#23)

test('hiding a game leaves a card in its place with Undo, and Undo puts the tile back', async ({
  page,
}) => {
  await page.goto('/board/games/discover/most-played');

  const wall = page.getByRole('list', { name: 'Most played' });
  await expect(wall.getByRole('heading', { level: 3 })).toHaveText(['Hollow Knight: Silksong', 'Dead Cells']);

  await hide(page, 'Dead Cells');

  // A plain card where the cover was, in the tile's place, and the count by the way back to the
  // board from the first hide on.
  await expect(tile(page, 'Dead Cells')).toContainText('Hidden');
  await expect(wall.getByRole('heading', { level: 3 })).toHaveText(['Hollow Knight: Silksong', 'Dead Cells']);
  await expect(page.getByRole('button', { name: '1 hidden' })).toBeVisible();

  await tile(page, 'Dead Cells').getByRole('button', { name: 'Undo hiding Dead Cells' }).click();

  await expect(tile(page, 'Dead Cells').getByRole('button', { name: 'Add Dead Cells to backlog' })).toBeVisible();
  await expect(page.getByRole('button', { name: /hidden$/ })).toHaveCount(0);
});

test('a hidden game is off every Discover list from then on, and a search still finds it', async ({
  page,
}) => {
  // Rated 9, Hollow Knight starts From your ratings, which then offers Dead Cells — the second
  // place on Most played too.
  await seed(page.request, 'Hollow Knight', 'Completed', { rating: 9, completedAt: '2026-09-01' });

  await page.goto('/board/games/discover/most-played');
  await hide(page, 'Dead Cells');

  // Another list, asked for after the hide, is answered without it by the server.
  await page.getByRole('navigation', { name: 'Lists' }).getByRole('link', { name: 'From your ratings' }).click();
  await expect(page.getByRole('list', { name: 'From your ratings' }).getByRole('heading', { level: 3 })).toHaveText([
    'Castlevania: Symphony of the Night',
  ]);

  // And the list it was hidden on, on the next visit, closes up over it.
  await page.goto('/board/games/discover/most-played');
  await expect(page.getByRole('list', { name: 'Most played' }).getByRole('heading', { level: 3 })).toHaveText([
    'Hollow Knight: Silksong',
    'Castlevania: Symphony of the Night',
  ]);
  await expect(page.getByRole('button', { name: '1 hidden' })).toBeVisible();

  // Somebody who typed its name asked for it, so search leaves a hide alone.
  await page.goto('/board/games');
  await page.getByRole('searchbox', { name: 'Search games' }).fill('dead cells');
  await expect(page.getByRole('button', { name: 'Add Dead Cells to backlog' })).toBeVisible();
});

test('the count opens the list of hides, newest first, and Show again puts a game back', async ({
  page,
}) => {
  await page.goto('/board/games/discover/most-played');
  await hide(page, 'Dead Cells');

  await page.getByRole('navigation', { name: 'Lists' }).getByRole('link', { name: 'Popular now' }).click();
  await hide(page, 'Hades');

  // A visit later, so the list is the server's and in its order.
  await page.reload();
  await page.getByRole('button', { name: '2 hidden' }).click();

  const dialog = page.getByRole('dialog', { name: 'Hidden from Discover' });
  await expect(dialog.getByRole('listitem')).toHaveText([/^Hades/, /^Dead Cells/]);

  await dialog.getByRole('button', { name: 'Show Dead Cells on Discover again' }).click();

  await expect(dialog.getByRole('listitem')).toHaveText([/^Hades/]);
  await expect(page.getByRole('button', { name: '1 hidden' })).toBeAttached();

  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: '1 hidden' })).toBeFocused();

  await page.goto('/board/games/discover/most-played');
  await expect(page.getByRole('list', { name: 'Most played' }).getByRole('heading', { level: 3 })).toHaveText([
    'Hollow Knight: Silksong',
    'Dead Cells',
  ]);
});

test('the eye shows under the pointer and with the keyboard in its tile, and is a tab stop at rest', async ({
  page,
}) => {
  await page.goto('/board/games/discover/most-played');
  await expect(tile(page, 'Dead Cells').getByRole('button', { name: 'Add Dead Cells to backlog' })).toBeVisible();

  const mark = markOf(page, 'Dead Cells');

  // Out of sight at rest, the user's pick over always showing — and still there, by its role and
  // name, for a screen reader and the keyboard. Faded rather than made invisible for exactly this:
  // `visibility: hidden` takes a button out of the accessibility tree and the tab order both, so
  // an invisible mark would not be found here at all.
  await page.mouse.move(0, 0);
  await expect(mark).toBeAttached();
  await expect.poll(() => isDrawn(mark)).toBe(false);

  await tile(page, 'Dead Cells').hover();
  await expect.poll(() => isDrawn(mark)).toBe(true);

  await page.mouse.move(0, 0);
  await expect.poll(() => isDrawn(mark)).toBe(false);

  // The keyboard arriving from the tile before lands on it, though nothing in its tile had the
  // keyboard to bring it out — a mark made invisible rather than faded would be passed by — and it
  // shows once it has.
  await tile(page, 'Hollow Knight: Silksong')
    .getByRole('button', { name: 'Add Hollow Knight: Silksong to completed' })
    .focus();
  await page.keyboard.press('Tab');
  await expect(mark).toBeFocused();
  await expect.poll(() => isDrawn(mark)).toBe(true);

  // And from the heading, where Load more leaves the keyboard: the mark comes after the name.
  await tile(page, 'Dead Cells').getByRole('heading', { level: 3 }).focus();
  await page.keyboard.press('Tab');
  await expect(mark).toBeFocused();
});

test.describe('hiding on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox has no phone to emulate.');

  test('the eye shows at rest, with no pointer to bring it out, and a tap hides', async ({ page }) => {
    await page.goto('/board/games/discover/most-played');

    const mark = markOf(page, 'Dead Cells');
    await expect.poll(() => isDrawn(mark)).toBe(true);

    await mark.tap();
    await expect(tile(page, 'Dead Cells')).toContainText("It won't show up on Discover again.");
  });
});

test('a board with no wall offers no way to one', async ({ page }) => {
  await page.goto('/board/movies');
  await expect(page.getByRole('searchbox', { name: 'Search movies' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Browse popular/ })).toHaveCount(0);

  // And the address on its own lands on that hobby's board rather than on an empty page.
  await page.goto('/board/movies/discover');
  await expect(page).toHaveURL(/\/board\/movies$/);
});
