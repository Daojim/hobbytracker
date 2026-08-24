import { expect, test } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { card, column, drag, entriesFor, seed, titlesIn } from './support/board';

/**
 * The drag, in a real browser.
 *
 * The transition rules themselves are settled by the backend suite; what cannot be proved there
 * is that the gesture reaches them. So these read the gesture through the UI and the result
 * through the API, which is the pair jsdom cannot do.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();

  // Every board route is behind [Authorize] now, and the session is a cookie on this page's
  // context — which is also why the helpers below seed through page.request rather than the
  // standalone request fixture, since those two keep separate cookie jars.
  await signIn(page);
  await page.goto('/board');
});

test('dragging out of Backlog starts the clock', async ({ page }) => {
  const mediaId = await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();

  await drag(page, card(page, 'Celeste'), column(page, 'InProgress'));

  await expect(column(page, 'InProgress').getByText('Celeste')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(page.request, mediaId))[0])
    .toMatchObject({ status: 'InProgress', completedAt: null });
  expect((await entriesFor(page.request, mediaId))[0]?.startedAt).not.toBeNull();
});

test('dragging back to Backlog takes the timestamps with it', async ({ page }) => {
  const mediaId = await seed(page.request, 'Hades', 'InProgress', { startedAt: '2026-05-01' });
  await page.reload();

  await drag(page, card(page, 'Hades'), column(page, 'Backlog'));

  await expect(column(page, 'Backlog').getByText('Hades')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(page.request, mediaId))[0])
    .toMatchObject({ status: 'Backlog', startedAt: null, completedAt: null });
});

test('dragging into Completed records when it was finished', async ({ page }) => {
  const mediaId = await seed(page.request, 'Outer Wilds', 'InProgress', { startedAt: '2026-05-01' });
  await page.reload();

  await drag(page, card(page, 'Outer Wilds'), column(page, 'Completed'));

  await expect(column(page, 'Completed').getByText('Outer Wilds')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(page.request, mediaId))[0]?.completedAt)
    .not.toBeNull();
});

test('replaying a finished game keeps the finish', async ({ page }) => {
  // The one that matters. Every other behaviour here is recoverable; this one would destroy a
  // record of something you did, silently, on a gesture as casual as a drag.
  const mediaId = await seed(page.request, 'Hollow Knight', 'Completed', { completedAt: '2024-11-02' });
  await page.reload();

  await drag(page, card(page, 'Hollow Knight'), column(page, 'InProgress'));

  await expect(column(page, 'InProgress').getByText('Hollow Knight')).toBeVisible();
  await expect.poll(async () => (await entriesFor(page.request, mediaId)).length).toBe(2);

  const entries = await entriesFor(page.request, mediaId);
  const completion = entries.find((entry) => entry.status === 'Completed');
  expect(completion?.completedAt).not.toBeNull();
  expect(entries.some((entry) => entry.status === 'InProgress')).toBe(true);
});

test('the close button drops a game, and dragging it out picks it back up', async ({
  page,
}) => {
  const mediaId = await seed(page.request, 'Anthem', 'InProgress', { startedAt: '2026-05-01' });
  await page.reload();

  await card(page, 'Anthem').getByRole('button', { name: 'Drop Anthem' }).click();

  await page.getByRole('button', { name: 'Show Dropped' }).click();
  await expect(column(page, 'Dropped').getByText('Anthem')).toBeVisible();
  // Dropping is not forgetting: the day you started is still the day you started.
  await expect
    .poll(async () => (await entriesFor(page.request, mediaId))[0])
    .toMatchObject({ status: 'Dropped' });
  expect((await entriesFor(page.request, mediaId))[0]?.startedAt).not.toBeNull();

  await drag(page, card(page, 'Anthem'), column(page, 'InProgress'));

  await expect(column(page, 'InProgress').getByText('Anthem')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(page.request, mediaId))[0]?.status)
    .toBe('InProgress');
});


test('closing a backlog game takes it off the board rather than dropping it', async ({
  page,
}) => {
  // Dropped records a game you started and gave up on. Nothing was started here, so there is
  // nothing to record — the title goes, and the catalog keeps the game itself.
  const mediaId = await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();

  await card(page, 'Celeste').getByRole('button', { name: 'Remove Celeste from your board' }).click();
  await expect(page.getByText('Takes Celeste off your board.')).toBeVisible();
  await page.getByRole('button', { name: 'Really remove?' }).click();

  await expect(card(page, 'Celeste')).toBeHidden();
  await expect.poll(async () => (await entriesFor(page.request, mediaId)).length).toBe(0);

  await page.getByRole('button', { name: 'Show Dropped' }).click();
  expect(await titlesIn(page, 'Dropped')).not.toContain('Celeste');
});

test('closing a replay you thought better of gives the finished pass back', async ({
  page,
}) => {
  // Dragging a finished game to Backlog inserts a fresh entry rather than editing the
  // completion. Changing your mind has to undo exactly that much and no more.
  const mediaId = await seed(page.request, 'Hollow Knight', 'Completed', {
    startedAt: '2024-01-10',
    completedAt: '2024-03-02',
  });
  await page.reload();

  await drag(page, card(page, 'Hollow Knight'), column(page, 'Backlog'));
  await expect(column(page, 'Backlog').getByText('Hollow Knight')).toBeVisible();

  // Waits for the refetch before clicking: the badge only appears once the server has answered,
  // and clicking into a list that is still re-laying-out lands the press wherever the card used
  // to be. That the confirm itself survives a refetch is Card.test.tsx's job, where the refetch
  // can be controlled instead of raced.
  await expect(card(page, 'Hollow Knight').getByRole('img', { name: '2 playthroughs' })).toBeVisible();

  await card(page, 'Hollow Knight')
    .getByRole('button', { name: 'Remove Hollow Knight from your board' })
    .click();
  await expect(page.getByText(/Only this pass\./)).toBeVisible();
  await page.getByRole('button', { name: 'Really remove?' }).click();

  await expect(column(page, 'Completed').getByText('Hollow Knight')).toBeVisible();
  await expect.poll(async () => (await entriesFor(page.request, mediaId)).length).toBe(1);
  expect((await entriesFor(page.request, mediaId))[0]?.completedAt).not.toBeNull();
});

test('a reordered column stays reordered', async ({ page }) => {
  await seed(page.request, 'Celeste', 'Backlog');
  await seed(page.request, 'Hades', 'Backlog');
  await seed(page.request, 'Stardew Valley', 'Backlog');
  await page.reload();

  // Newest on top, because a new entry takes min(position) - 1 for its column.
  await expect.poll(() => titlesIn(page, 'Backlog')).toEqual([
    'Stardew Valley',
    'Hades',
    'Celeste',
  ]);

  await drag(page, card(page, 'Celeste'), column(page, 'Backlog'));
  await expect.poll(() => titlesIn(page, 'Backlog')).toEqual([
    'Celeste',
    'Stardew Valley',
    'Hades',
  ]);

  await page.reload();
  await expect.poll(() => titlesIn(page, 'Backlog')).toEqual([
    'Celeste',
    'Stardew Valley',
    'Hades',
  ]);
});

test('sorting is a view, and leaves the ranking alone', async ({ page }) => {
  await seed(page.request, 'Stardew Valley', 'Backlog');
  await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();

  // Waited for rather than read straight after the reload: an eager snapshot can catch the
  // board mid-load and compare the ending order against an empty array.
  await expect.poll(() => titlesIn(page, 'Backlog')).toHaveLength(2);
  const before = await titlesIn(page, 'Backlog');

  await column(page, 'Backlog')
    .getByRole('combobox', { name: 'Backlog order' })
    .selectOption('title');
  await expect.poll(() => titlesIn(page, 'Backlog')).toEqual(['Celeste', 'Stardew Valley']);

  // Dragging is not on offer here, so it cannot write an order the API would refuse to store.
  await expect(card(page, 'Celeste')).toHaveAttribute('aria-disabled', 'true');

  await column(page, 'Backlog')
    .getByRole('combobox', { name: 'Backlog order' })
    .selectOption('manual');
  await expect.poll(() => titlesIn(page, 'Backlog')).toEqual(before);
});

test('the year picker narrows Completed and nothing else', async ({ page }) => {
  await seed(page.request, 'Celeste', 'Backlog');
  await seed(page.request, 'Hades', 'Completed', { completedAt: '2024-11-02' });
  await seed(page.request, 'Outer Wilds', 'Completed', { completedAt: '2026-03-03' });
  await page.reload();

  await expect.poll(() => titlesIn(page, 'Completed')).toHaveLength(2);

  await page.getByRole('combobox', { name: 'Completed year' }).selectOption('2024');

  await expect.poll(() => titlesIn(page, 'Completed')).toEqual(['Hades']);
  await expect.poll(() => titlesIn(page, 'Backlog')).toEqual(['Celeste']);
});
