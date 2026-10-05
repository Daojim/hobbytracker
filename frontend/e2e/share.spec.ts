import { expect, test, type Browser, type Page } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { card, column, holdAndDrag, seed, segment, today } from './support/board';

/**
 * A share link, end to end: made in Settings, opened by somebody who has never signed in, changed
 * a box at a time, and stopped.
 *
 * The visitor is a second browser context with no cookie in it, which is what a friend or a
 * portfolio reviewer is. Everything they read comes from the real API answering for the token's
 * owner, from the real database.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await signIn(page, { name: 'Jimmy Dao' });
});

/** Midday today here, which the API reads as a wall-clock moment in the journal zone. */
const noon = () => `${today()}T12:00:00`;

/** Makes the board's link through Settings, as its owner would, and answers with its address. */
async function makeTheLink(page: Page, { untick = [] as string[] } = {}): Promise<string> {
  await page.goto('/board/games');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Share this board…' }).click();

  const dialog = page.getByRole('dialog', { name: 'Share this board' });
  await expect(dialog.getByText('No link yet. Choose what it shows, then make it.')).toBeVisible();

  for (const box of untick) {
    await dialog.getByRole('checkbox', { name: box }).uncheck();
  }

  await dialog.getByRole('button', { name: 'Make the link' }).click();

  const address = dialog.getByRole('textbox', { name: 'Link to this board' });
  await expect(address).toHaveValue(/\/share\/[A-Za-z0-9_-]{22}$/);
  return address.inputValue();
}

/** Somebody with no account, in a browser of their own. */
async function aVisitor(browser: Browser, options: Parameters<Browser['newContext']>[0] = {}) {
  const context = await browser.newContext(options);
  return { context, page: await context.newPage() };
}

test('a link made in Settings opens the board, read-only, for somebody with no account', async ({
  page,
  browser,
}) => {
  await seed(page.request, 'Celeste', 'Backlog');
  const hollowKnight = await seed(page.request, 'Hollow Knight', 'Completed', {
    completedAt: noon(),
    rating: 9.5,
  });

  // A note the owner's own card shows, and a share must not.
  const [pass] = (await (
    await page.request.get('/api/log-entries', { params: { mediaId: hollowKnight } })
  ).json()).items as { id: number }[];
  await page.request.post(`/api/log-entries/${pass!.id}/notes`, {
    data: { body: 'Mantis Lords first try' },
  });

  const address = await makeTheLink(page);
  const visitor = await aVisitor(browser);
  await visitor.page.goto(address);

  await expect(visitor.page.getByRole('banner')).toHaveText(
    /A board shared from HobbyTracker\. It’s read-only\.\s*Make your own/,
  );
  await expect(visitor.page.getByRole('heading', { level: 1, name: 'Games' })).toBeVisible();
  await expect(column(visitor.page, 'Backlog').getByText('Celeste')).toBeVisible();
  await expect(column(visitor.page, 'Completed').getByText('Hollow Knight')).toBeVisible();

  // Read-only: nothing on a card to press, and nothing written about it.
  await expect(card(visitor.page, 'Hollow Knight').getByRole('button')).toHaveCount(0);
  await expect(visitor.page.getByText('Mantis Lords first try')).toHaveCount(0);
  await expect(
    column(visitor.page, 'Completed').getByRole('combobox', { name: 'Completed order' }),
  ).toHaveValue('manual');
  await expect(
    column(visitor.page, 'Completed').getByRole('option', { name: 'Board order' }),
  ).toBeAttached();

  // And its Stats page, under the same banner, says it to nobody.
  await visitor.page.getByRole('link', { name: `Stats for ${today().slice(0, 4)}` }).click();
  await expect(visitor.page.getByRole('link', { name: 'Back to the board' })).toBeVisible();

  // Exact, as stats.spec.ts has it: Playwright matches a name by substring, and "Finished" is
  // also "Finished each month".
  await expect(
    visitor.page
      .getByRole('region', { name: 'Finished', exact: true })
      .getByText('1', { exact: true }),
  ).toBeVisible();

  await visitor.context.close();
});

test('copies the whole address', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const address = await makeTheLink(page);

  const dialog = page.getByRole('dialog', { name: 'Share this board' });
  await dialog.getByRole('button', { name: 'Copy' }).click();

  await expect(dialog.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(address);
});

test('a box changes what the link shows as it is ticked, and stopping asks first, then kills the address', async ({
  page,
  browser,
}) => {
  await seed(page.request, 'Hollow Knight', 'Completed', { completedAt: noon() });
  const address = await makeTheLink(page);

  const visitor = await aVisitor(browser);
  await visitor.page.goto(address);
  await expect(column(visitor.page, 'Completed').getByText('Hollow Knight')).toBeVisible();

  // Off with Completed, from the dialog that is still open: written as it is ticked, with no Save.
  const dialog = page.getByRole('dialog', { name: 'Share this board' });
  const completed = dialog.getByRole('checkbox', { name: 'Completed' });
  const written = page.waitForResponse(
    (response) => response.request().method() === 'PUT' && response.url().includes('/api/share'),
  );
  await completed.uncheck();
  expect((await written).ok()).toBe(true);

  await visitor.page.reload();
  await expect(visitor.page.getByRole('heading', { level: 2, name: /^Backlog/ })).toBeVisible();
  await expect(column(visitor.page, 'Completed')).toHaveCount(0);

  // Stopping asks, and Cancel leaves the link working.
  await dialog.getByRole('button', { name: 'Stop sharing' }).click();
  await expect(dialog.getByText('The link stops working for everyone who has it.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await visitor.page.reload();
  await expect(visitor.page.getByRole('heading', { level: 1, name: 'Games' })).toBeVisible();

  // Then it stops, for good.
  await dialog.getByRole('button', { name: 'Stop sharing' }).click();
  await dialog.getByRole('button', { name: 'Stop sharing' }).click();
  await expect(dialog.getByText('No link yet. Choose what it shows, then make it.')).toBeVisible();

  await visitor.page.reload();
  await expect(
    visitor.page.getByRole('heading', { level: 1, name: 'This link doesn’t open a board' }),
  ).toBeVisible();

  await visitor.context.close();
});

test.describe('on a phone', () => {
  test('a share is one column at a time, and nothing on it can be carried', async ({
    page,
    browser,
  }) => {
    await seed(page.request, 'Celeste', 'Backlog');
    await seed(page.request, 'Hades', 'Backlog');
    await seed(page.request, 'Hollow Knight', 'Completed', { completedAt: noon() });
    const address = await makeTheLink(page);

    const visitor = await aVisitor(browser, {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await visitor.page.goto(address);

    await expect(segment(visitor.page, 'Backlog')).toHaveAccessibleName('Backlog 2');
    await expect(segment(visitor.page, 'Completed')).toHaveAccessibleName('Completed 1');
    await expect(visitor.page.getByRole('region', { name: /^(Backlog|Playing|On Hold|Completed) / }))
      .toHaveCount(1);

    // Nothing to carry: dnd-kit stamps every sortable it registers with this, and a share
    // registers none. Measured, because the gesture below cannot see it alone — a card made
    // carriable, with nothing to hear the drop, moves nothing and passes everything after this.
    await expect(visitor.page.locator('[aria-roledescription]')).toHaveCount(0);

    // The board's own gesture for a move — a finger held still, carried onto a segment — moves
    // nothing on a share.
    await holdAndDrag(visitor.page, card(visitor.page, 'Celeste'), segment(visitor.page, 'Completed'), {
      lingerMs: 300,
    });

    await expect(segment(visitor.page, 'Backlog')).toHaveAccessibleName('Backlog 2');
    await expect(segment(visitor.page, 'Completed')).toHaveAccessibleName('Completed 1');
    await expect(card(visitor.page, 'Celeste')).toBeVisible();

    // And the owner's board is as it was.
    const backlog = (await (
      await page.request.get('/api/library', { params: { hobby: 'games', status: 'Backlog' } })
    ).json()) as { total: number };
    expect(backlog.total).toBe(2);

    await visitor.context.close();
  });
});
