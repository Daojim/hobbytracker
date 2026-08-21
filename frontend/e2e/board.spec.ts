import { expect, test } from '@playwright/test';
import { resetDatabase } from './support/database';
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
  await page.goto('/board');
});

test('dragging out of Backlog starts the clock', async ({ page, request }) => {
  const mediaId = await seed(request, 'Celeste', 'Backlog');
  await page.reload();

  await drag(page, card(page, 'Celeste'), column(page, 'InProgress'));

  await expect(column(page, 'InProgress').getByText('Celeste')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(request, mediaId))[0])
    .toMatchObject({ status: 'InProgress', completedAt: null });
  expect((await entriesFor(request, mediaId))[0]?.startedAt).not.toBeNull();
});

test('dragging back to Backlog takes the timestamps with it', async ({ page, request }) => {
  const mediaId = await seed(request, 'Hades', 'InProgress', { startedAt: '2026-05-01' });
  await page.reload();

  await drag(page, card(page, 'Hades'), column(page, 'Backlog'));

  await expect(column(page, 'Backlog').getByText('Hades')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(request, mediaId))[0])
    .toMatchObject({ status: 'Backlog', startedAt: null, completedAt: null });
});

test('dragging into Completed records when it was finished', async ({ page, request }) => {
  const mediaId = await seed(request, 'Outer Wilds', 'InProgress', { startedAt: '2026-05-01' });
  await page.reload();

  await drag(page, card(page, 'Outer Wilds'), column(page, 'Completed'));

  await expect(column(page, 'Completed').getByText('Outer Wilds')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(request, mediaId))[0]?.completedAt)
    .not.toBeNull();
});

test('replaying a finished game keeps the finish', async ({ page, request }) => {
  // The one that matters. Every other behaviour here is recoverable; this one would destroy a
  // record of something you did, silently, on a gesture as casual as a drag.
  const mediaId = await seed(request, 'Hollow Knight', 'Completed', { completedAt: '2024-11-02' });
  await page.reload();

  await drag(page, card(page, 'Hollow Knight'), column(page, 'InProgress'));

  await expect(column(page, 'InProgress').getByText('Hollow Knight')).toBeVisible();
  await expect.poll(async () => (await entriesFor(request, mediaId)).length).toBe(2);

  const entries = await entriesFor(request, mediaId);
  const completion = entries.find((entry) => entry.status === 'Completed');
  expect(completion?.completedAt).not.toBeNull();
  expect(entries.some((entry) => entry.status === 'InProgress')).toBe(true);
});

test('the close button drops a game, and dragging it out picks it back up', async ({
  page,
  request,
}) => {
  const mediaId = await seed(request, 'Anthem', 'InProgress', { startedAt: '2026-05-01' });
  await page.reload();

  await card(page, 'Anthem').getByRole('button', { name: 'Drop Anthem' }).click();

  await page.getByRole('button', { name: 'Show Dropped' }).click();
  await expect(column(page, 'Dropped').getByText('Anthem')).toBeVisible();
  // Dropping is not forgetting: the day you started is still the day you started.
  await expect
    .poll(async () => (await entriesFor(request, mediaId))[0])
    .toMatchObject({ status: 'Dropped' });
  expect((await entriesFor(request, mediaId))[0]?.startedAt).not.toBeNull();

  await drag(page, card(page, 'Anthem'), column(page, 'InProgress'));

  await expect(column(page, 'InProgress').getByText('Anthem')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(request, mediaId))[0]?.status)
    .toBe('InProgress');
});

test('a reordered column stays reordered', async ({ page, request }) => {
  await seed(request, 'Celeste', 'Backlog');
  await seed(request, 'Hades', 'Backlog');
  await seed(request, 'Stardew Valley', 'Backlog');
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

test('sorting is a view, and leaves the ranking alone', async ({ page, request }) => {
  await seed(request, 'Stardew Valley', 'Backlog');
  await seed(request, 'Celeste', 'Backlog');
  await page.reload();

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

test('the year picker narrows Completed and nothing else', async ({ page, request }) => {
  await seed(request, 'Celeste', 'Backlog');
  await seed(request, 'Hades', 'Completed', { completedAt: '2024-11-02' });
  await seed(request, 'Outer Wilds', 'Completed', { completedAt: '2026-03-03' });
  await page.reload();

  await expect.poll(() => titlesIn(page, 'Completed')).toHaveLength(2);

  await page.getByRole('combobox', { name: 'Completed year' }).selectOption('2024');

  await expect.poll(() => titlesIn(page, 'Completed')).toEqual(['Hades']);
  await expect.poll(() => titlesIn(page, 'Backlog')).toEqual(['Celeste']);
});
