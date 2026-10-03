import { expect, test } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { chooseOption, column, openJournal, seed, today } from './support/board';
import { awaitEstimate } from './support/hltb';

/**
 * "How long will it take me?", end to end: asked in a drawer, kept by the browser, and read back
 * by the Backlog column behind it.
 *
 * The figures are the HowLongToBeat stub's, not the site's: Hollow Knight's Main story is 27
 * hours, and Celeste takes 20 over all play styles.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await signIn(page);
});

/**
 * A day this many days after today, as the answer writes it — "Oct 9", with the year only when it
 * is not this one.
 *
 * A second copy of the app's arithmetic, on purpose, as `COLUMN_LABEL` is a second copy of its
 * words: importing the app's own would make the assertion agree with the app because it is the
 * app. Done on the day's parts in UTC, as the app's is, so a clock change cannot move it.
 */
function inDays(days: number): string {
  const [year, month, date] = today().split('-').map(Number);
  const then = new Date(Date.UTC(year!, month! - 1, date! + days));
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(then);

  return then.getUTCFullYear() === year ? short : `${short}, ${then.getUTCFullYear()}`;
}

test('answers in the drawer, and the backlog behind it hears your pace', async ({ page }) => {
  const knight = await seed(page.request, 'Hollow Knight', 'InProgress', {
    startedAt: '2026-09-14',
    hoursPlayed: 14,
  });
  const celeste = await seed(page.request, 'Celeste', 'Backlog');
  await awaitEstimate(page.request, knight);
  await awaitEstimate(page.request, celeste);

  await page.goto('/board/games');
  await openJournal(page, 'Hollow Knight');

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'How long will it take me?' }).click();
  await dialog.getByRole('button', { name: '2 h a day' }).click();

  // By its whole name, the words and the figure, which is what a screen reader hears. Asserted in a
  // browser rather than in Vitest, because jsdom puts a space between child elements whatever the
  // markup says and so cannot tell a name run together from one kept apart.
  await dialog.getByRole('button', { name: 'Just the story Main story · 27 h', exact: true }).click();

  // 27 - 14 = 13 hours at 2 a day: 6.5, so 7 days, counted from tomorrow.
  await expect(dialog.getByText(/you'd finish around/)).toHaveText(
    `7 more days — you'd finish around ${inDays(7)}.`,
  );

  await dialog.getByRole('button', { name: 'Close', exact: true }).click();

  // Celeste's 20 hours at the pace just given, without a reload: the column hears the store.
  await expect(
    column(page, 'Backlog').getByRole('img', { name: '10 days at 2 hours a day' }),
  ).toHaveText('10 days at 2 h a day');

  // And the browser keeps it.
  await page.reload();
  await expect(
    column(page, 'Backlog').getByRole('img', { name: '10 days at 2 hours a day' }),
  ).toBeVisible();
});

test("a card's menu opens the journal at the question", async ({ page }) => {
  const knight = await seed(page.request, 'Hollow Knight', 'InProgress', { hoursPlayed: 14 });
  await awaitEstimate(page.request, knight);

  await page.goto('/board/games');
  await chooseOption(page, 'Hollow Knight', 'How long for me?');

  await expect(page.getByRole('dialog').getByText('How much do you play?')).toBeVisible();
});
