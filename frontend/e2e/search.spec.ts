import { expect, test, type Page } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { card, column, entriesFor, seed, today, todayOnCard } from './support/board';

/**
 * The way a game gets onto the board in the first place.
 *
 * Searching upserts every result into the catalogue as a side effect, so a result already has the
 * id `POST /api/library/{mediaId}` puts on your board — in Backlog, Playing or Completed, with the
 * dates a drag into that column would give. That upsert is the part worth doing for real rather
 * than stubbing in the browser — it is what turns an IGDB result into an id the board can point
 * at.
 *
 * `.fill()` rather than `.type()`, which sets the value in one shot: the 300ms debounce is then
 * waited out by an auto-retrying expect rather than by keystroke timing.
 */

/** A result in the strip, named by its heading — `hasText` would also match a title it prefixes. */
const result = (page: Page, title: string) =>
  page
    .getByRole('region', { name: 'Search results' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });

test.beforeEach(async ({ page }) => {
  resetDatabase();

  // Every board route is behind [Authorize] now, and the session is a cookie on this page's
  // context — which is also why the helpers below seed through page.request rather than the
  // standalone request fixture, since those two keep separate cookie jars.
  await signIn(page);
  await page.goto('/board');
});

test('finding a game puts it on the board without leaving it', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search games' }).fill('hollow');
  await page.getByRole('button', { name: 'Add Hollow Knight to backlog' }).click();

  // The answer changes on the write, not on the refetch that follows it — a button still live
  // here would take a second click, which the API would refuse as a title already on the board.
  await expect(result(page, 'Hollow Knight')).toContainText('On your board: Backlog');
  await expect(page.getByRole('button', { name: 'Add Hollow Knight to backlog' })).toHaveCount(0);

  // The whole point of the move: the column behind the strip has it already.
  await expect(column(page, 'Backlog').getByText('Hollow Knight')).toBeVisible();
});

test('a game you already logged is not offered a second time', async ({ page }) => {
  await seed(page.request, 'Celeste', 'InProgress', { startedAt: '2026-08-10' });
  await page.reload();

  await page.getByRole('searchbox', { name: 'Search games' }).fill('celeste');

  // Already on the board means logged, in any column — not just Backlog — and the tile says which.
  await expect(result(page, 'Celeste')).toContainText('On your board: Playing');
  await expect(page.getByRole('button', { name: 'Add Celeste to backlog' })).toHaveCount(0);
});

test('a game can go straight to Playing, started today', async ({ page }) => {
  // One press rather than a press and a drag, and the same record either way: the start is the
  // server's to stamp, by the rule a drag into Playing follows. The card saying today is that
  // rule reaching the board, and a Playing card with no start would be on no year's board.
  await page.getByRole('searchbox', { name: 'Search games' }).fill('hollow');
  await page.getByRole('button', { name: 'Add Hollow Knight to playing' }).click();

  await expect(result(page, 'Hollow Knight')).toContainText('On your board: Playing');
  await expect(column(page, 'InProgress').getByText('Hollow Knight')).toBeVisible();
  await expect(card(page, 'Hollow Knight')).toContainText(todayOnCard());
});

test('a game can go straight to Completed, finished today with no start made up', async ({
  page,
}) => {
  await page.getByRole('searchbox', { name: 'Search games' }).fill('hollow');
  await page.getByRole('button', { name: 'Add Hollow Knight to completed' }).click();

  await expect(column(page, 'Completed').getByText('Hollow Knight')).toBeVisible();
  await expect(card(page, 'Hollow Knight')).toContainText(todayOnCard());

  // Finished today and begun on no day anybody said, which is what a drag from Backlog leaves
  // too. Somebody filling a board backwards is adding games finished years ago; the journal is
  // where the real date goes, and a start invented here would be a second fiction on the first.
  const entries = await page.request.get('/api/log-entries', { params: { pageSize: 100 } });
  const { items } = (await entries.json()) as {
    items: { status: string; startedAt: string | null; completedAt: string | null }[];
  };
  expect(items).toHaveLength(1);
  expect(items[0]!.status).toBe('Completed');
  expect(items[0]!.startedAt).toBeNull();
  expect(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(
      new Date(items[0]!.completedAt!),
    ),
  ).toBe(today());
});

test('a game just added opens its journal from the strip, and gets the keyboard back', async ({
  page,
}) => {
  // Found, put on the board, and written about, without going to look for its card. The name
  // becomes a way in once the server has the pass, which is when the tile says where it went.
  await page.getByRole('searchbox', { name: 'Search games' }).fill('hollow');
  await page.getByRole('button', { name: 'Add Hollow Knight to completed' }).click();
  await expect(result(page, 'Hollow Knight')).toContainText('On your board: Completed');

  const name = result(page, 'Hollow Knight').getByRole('button', {
    name: 'Hollow Knight',
    exact: true,
  });
  await name.click();

  const drawer = page.getByRole('dialog', { name: 'Hollow Knight' });
  await expect(drawer).toBeVisible();

  await page.keyboard.press('Escape');

  // Back to the tile it came from, which is still there: opening the drawer left the search as
  // it was. The card with the same name is on the board behind, and is not where it goes.
  await expect(drawer).toBeHidden();
  await expect(name).toBeFocused();
});

test('a search that matches nothing says so', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search games' }).fill('zzzzzz');

  await expect(page.getByText('Nothing matched “zzzzzz”.')).toBeVisible();
});

test('the box clears from its own corner, and keeps the keyboard', async ({ page }) => {
  // A real browser is the only place the interesting half of this shows. Chrome draws its own
  // cancel button inside a type="search" box as soon as it has content, so without the rule that
  // hides it there are two × in that corner — one of them unstyled, unlabelled and invisible to
  // every locator here. jsdom renders neither and would call this passing either way.
  const box = page.getByRole('searchbox', { name: 'Search games' });
  await box.fill('hollow');
  await expect(page.getByRole('region', { name: 'Search results' })).toBeVisible();

  const clear = page.getByRole('button', { name: 'Clear search' });
  await expect(clear).toHaveCount(1);
  await clear.click();

  await expect(box).toHaveValue('');
  await expect(box).toBeFocused();

  // Gone with the text, because there is nothing left to clear.
  await expect(clear).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Search results' })).toHaveCount(0);
});

test('/ leaves the keyboard with a card that is being carried', async ({ page }) => {
  // A card carried by the keyboard listens at the document for Space, Enter and the arrows,
  // wherever focus has gone. So `/` taking the keyboard to the box left it carried: the first
  // space typed dropped it, dnd-kit handed focus back to the card, and the rest of the word went
  // nowhere — "a b" left the box holding "a", measured on 4 October 2026. Here rather than in
  // Vitest because it is the drag, and the drag gets a real browser: what this guards against is
  // dnd-kit's drop and dnd-kit's focus, and that is where they were measured.
  await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();
  const celeste = card(page, 'Celeste');
  const box = page.getByRole('searchbox', { name: 'Search games' });

  await celeste.focus();
  await page.keyboard.press('Space');
  // dnd-kit's own mark for the card in hand, and the one the bar reads.
  await expect(celeste).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('/');

  await expect(celeste).toBeFocused();
  await expect(box).toHaveValue('');

  // Put down, it is a card like any other again, and `/` goes to the box from it.
  await page.keyboard.press('Escape');
  await expect(celeste).not.toHaveAttribute('aria-pressed');
  await expect(celeste).toBeFocused();

  await page.keyboard.press('/');

  await expect(box).toBeFocused();
});

test('the results give the board back when the search is cleared', async ({ page }) => {
  const results = page.getByRole('region', { name: 'Search results' });

  await page.getByRole('searchbox', { name: 'Search games' }).fill('hollow');
  await expect(results).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search games' }).fill('');

  await expect(results).toHaveCount(0);
});

test('a mod and a bundle never reach the strip', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search games' }).fill('hollow');

  // Waited for rather than asserted straight away: an absence assertion against a strip that
  // has not loaded yet passes for the wrong reason every time.
  await expect(page.getByRole('button', { name: 'Add Hollow Knight to backlog' })).toBeVisible();

  // Both are in the stub catalogue and both match the term, so the only thing keeping them
  // out is the where clause IgdbClient sends. On the live API this is not hypothetical — the
  // first result for "Hollow Knight" is a mod of it, above the game itself.
  await expect(page.getByText('Hollow Knight: Pale Court')).toHaveCount(0);
  await expect(page.getByText('Hollow Knight Collection')).toHaveCount(0);
});

test('the real game comes first, not the fan game named after it', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search games' }).fill('Hollow Knight Silksong');

  // Both are Main Games, so the game-type filter has nothing to say about this one. The fan
  // game is the better *string* match — it is the exact title typed, and the real one has a
  // colon in it — and the stub lists it first, so IGDB relevance alone would leave it on top.
  const titles = page
    .getByRole('region', { name: 'Search results' })
    .getByRole('heading', { level: 3 });

  await expect(titles.first()).toHaveText('Hollow Knight: Silksong');
});
test('half a title is enough to find a game', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search games' }).fill('hollow k');

  // Typing half a title is the ordinary way to use a search box, and IGDB's own search cannot
  // do it — it is full text over whole words, so "hollow k" answers with nothing at all. The
  // stub is as limited on purpose, so only the slug question can find this.
  await expect(page.getByRole('button', { name: 'Add Hollow Knight to backlog' })).toBeVisible();
});
test('the old search address lands on the board', async ({ page }) => {
  // The screen is gone, but a bookmark to it should not be a dead end.
  await page.goto('/search');

  await expect(page.getByRole('searchbox', { name: 'Search games' })).toBeVisible();
  await expect(column(page, 'Backlog')).toBeVisible();
});

/** Writes a note on a pass through the API, which stamps when it was written. */
async function noteOn(page: Page, entryId: number, body: string): Promise<void> {
  const written = await page.request.post(`/api/log-entries/${entryId}/notes`, { data: { body } });
  expect(written.ok(), `note "${body}"`).toBeTruthy();
}

test.describe('searching your notes', () => {
  test('a note found opens its journal at the note, in view, and gets the keyboard back', async ({
    page,
  }) => {
    // Hollow Knight finished in July with a note about the finish, and a replay since with a
    // dozen of its own. The one searched for is on the earlier pass, under all twelve, which is
    // far below where the journal opens.
    const mediaId = await seed(page.request, 'Hollow Knight', 'Completed', {
      completedAt: '2026-07-04',
    });
    const [finished] = await entriesFor(page.request, mediaId);
    await noteOn(page, finished!.id, 'Radiance is the hardest boss I have ever beaten.');

    const replay = await page.request.post('/api/log-entries', {
      data: { mediaId, status: 'InProgress' },
    });
    const { id: replayId } = (await replay.json()) as { id: number };
    for (let day = 1; day <= 12; day += 1) {
      await noteOn(page, replayId, `Steel Soul, day ${day}. Still alive.`);
    }
    await page.reload();

    await page.getByRole('radio', { name: 'Notes' }).click();
    await page.getByRole('searchbox', { name: 'Search your notes' }).fill('boss hardest');
    const found = page
      .getByRole('region', { name: 'Search results' })
      .getByRole('button', { name: /Radiance is the hardest boss/ });
    await found.click();

    // Scrolled to, wholly on screen, with the keyboard on it and the words it was found by
    // marked in it. jsdom can only say the scroll was asked for; this is where it lands.
    const drawer = page.getByRole('dialog', { name: 'Hollow Knight' });
    const marked = drawer.locator('li[aria-current="true"]');
    await expect(marked).toContainText('Radiance is the hardest boss I have ever beaten.');
    await expect(marked).toBeFocused();
    await expect(marked).toBeInViewport({ ratio: 1 });
    await expect(marked.locator('mark')).toHaveText(['hardest', 'boss']);

    await page.keyboard.press('Escape');

    await expect(drawer).toBeHidden();
    await expect(found).toBeFocused();
  });

  test('the words stay when the switch flips back to titles', async ({ page }) => {
    await page.getByRole('radio', { name: 'Notes' }).click();
    await page.getByRole('searchbox', { name: 'Search your notes' }).fill('zeppelin');
    await expect(page.getByText('Nothing in your notes matched “zeppelin”.')).toBeVisible();

    await page.getByRole('radio', { name: 'Titles' }).click();

    await expect(page.getByRole('searchbox', { name: 'Search games' })).toHaveValue('zeppelin');
    await expect(page.getByText('Nothing matched “zeppelin”.')).toBeVisible();
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test('the switch sits beside the box, inside the gutter, and the page does not widen', async ({
      page,
    }) => {
      // Picked at 390 at the #6 workshop, where the box is 216px wide beside it. jsdom has no
      // layout, so this is the only place that is held.
      const box = (await page.getByRole('searchbox', { name: 'Search games' }).boundingBox())!;
      const choice = (await page.getByRole('radiogroup', { name: 'Search in' }).boundingBox())!;

      expect(box.x + box.width).toBeLessThanOrEqual(choice.x);
      expect(choice.y).toBeLessThan(box.y + box.height);
      expect(choice.x + choice.width).toBeLessThanOrEqual(390 - 16);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        390,
      );
    });
  });
});
