import { expect, test, type Page } from '@playwright/test';
import { psql, resetDatabase } from './support/database';
import { signIn, whoAmI } from './support/auth';
import { entriesFor, seed } from './support/board';

/**
 * Deleting your account, end to end: the warning in Settings, the real API's delete and the
 * database's cascades, the sign-in screen it lands on, and the session another device still
 * holds.
 *
 * What only this layer can say: that a cookie the real sign-in issued stops working on the
 * device that did not delete anything, and where the keyboard and the scroll go in a browser
 * that has both.
 */

test.beforeEach(() => {
  resetDatabase();
});

async function openWarning(page: Page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Delete my account…' }).click();
}

async function confirmDelete(page: Page) {
  await page.getByRole('textbox', { name: 'Type delete to confirm' }).fill('delete');
  await page.getByRole('button', { name: 'Delete my account' }).click();
}

const count = (table: string) => psql(`select count(*) from ${table};`);

test('deleting your account takes everything with it, and signing in again starts afresh', async ({
  page,
}) => {
  await signIn(page, { sub: 'google-1', name: 'Jimmy Dao' });
  const before = (await whoAmI(page.request))!.id;

  const celeste = await seed(page.request, 'Celeste', 'Completed', { rating: 9 });
  const [pass] = await entriesFor(page.request, celeste);
  const written = await page.request.post(`/api/log-entries/${pass!.id}/notes`, {
    data: { body: 'Farewell is brutal' },
  });
  expect(written.ok(), 'write a note').toBeTruthy();

  await page.reload();
  await openWarning(page);

  await expect(page.getByRole('group', { name: 'Delete my account' })).toContainText(
    'This deletes the account you signed in to with Google, and everything on every board: '
      + '1 game and 1 note.',
  );

  await confirmDelete(page);

  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Account deleted' })).toBeFocused();

  // Everything that was the account's is gone, and the catalogue is not: the title is anybody's.
  expect(count('users')).toBe('0');
  expect(count('auth_identities')).toBe('0');
  expect(count('log_entries')).toBe('0');
  expect(count('notes')).toBe('0');
  expect(count('status_changes')).toBe('0');
  expect(psql("select count(*) from media where title = 'Celeste';")).toBe('1');

  // This browser was signed out by the delete itself.
  expect(await whoAmI(page.request)).toBeNull();

  // The same Google account signs in to a new account, with nothing on it.
  await signIn(page, { sub: 'google-1', name: 'Jimmy Dao' });

  expect((await whoAmI(page.request))!.id).not.toBe(before);
  expect(count('users')).toBe('1');
  expect(count('log_entries')).toBe('0');
});

test('every other device signed in to the account is signed out', async ({ page, browser }) => {
  await signIn(page, { sub: 'google-1' });

  // A second browser with a cookie of its own, issued by the real sign-in for the same account.
  const phone = await browser.newContext();
  const other = await phone.newPage();
  await signIn(other, { sub: 'google-1' });
  expect((await whoAmI(other.request))!.id).toBe((await whoAmI(page.request))!.id);

  await openWarning(page);
  await confirmDelete(page);
  await expect(page).toHaveURL(/\/signin$/);

  // The other device's cookie still names the account, and nothing about a self-contained
  // cookie changes when the row it names goes. Its next request is refused, rather than
  // answered as an empty board, and the browser is told to forget the cookie.
  const refused = await other.request.get('/api/library', {
    params: { hobby: 'games', status: 'Backlog' },
  });
  expect(refused.status()).toBe(401);
  expect((await phone.cookies()).some((cookie) => cookie.name === 'hobbytracker.session')).toBe(
    false,
  );

  // And it lands on the ordinary card: this device deleted nothing.
  await other.reload();
  await expect(other).toHaveURL(/\/signin$/);
  await expect(other.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();

  await phone.close();
});

test('the keyboard opens the warning, lands in the field, and Enter deletes', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Settings' }).click();

  await page.getByRole('button', { name: 'Delete my account…' }).focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('textbox', { name: 'Type delete to confirm' })).toBeFocused();

  // Enter does nothing until the field says delete.
  await page.keyboard.type('delet');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'Delete my account' })).toBeVisible();
  expect(count('users')).toBe('1');

  await page.keyboard.type('e');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { level: 1, name: 'Account deleted' })).toBeFocused();
  expect(count('users')).toBe('0');
});

test.describe('at 1440 × 900, where the Settings panel is taller than the window', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the warning scrolls itself into view, buttons and all, once the counts are in', async ({
    page,
  }) => {
    // Titles on two boards, so the sentence grows by two lines when the counts arrive, which is
    // after the warning has opened and scrolled. An empty account's sentence is about as long
    // as the one without numbers, and hid that the buttons were then pushed back off the screen.
    await signIn(page);
    await seed(page.request, 'Celeste', 'Completed');
    await seed(page.request, 'Arrival', 'Backlog', { hobby: 'movies' });
    await page.reload();

    await openWarning(page);
    await expect(page.getByRole('group', { name: 'Delete my account' })).toContainText(
      '1 game and 1 film.',
    );

    await expect(page.getByRole('button', { name: 'Delete my account' })).toBeInViewport({
      ratio: 1,
    });
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeInViewport({ ratio: 1 });
  });
});
