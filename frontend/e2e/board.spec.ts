import { expect, test } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import {
  card,
  chooseOption,
  column,
  drag,
  entriesFor,
  seed,
  setSort,
  titlesIn,
  today,
} from './support/board';

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

test('a column already holding cards takes another one, wherever in the stack you let go', async ({
  page,
}) => {
  // Letting go over a column that already had cards in it looked like it did nothing, so the
  // habit was to find the empty space below the stack and aim at that. The drop was never the
  // problem — onDragEnd has always read the status off whatever is under the cursor, card or
  // column — which is why this passes on both the top of a stack and the middle of one.
  //
  // What was missing is the answer: see the highlight test below.
  await seed(page.request, 'Celeste', 'Backlog');
  await seed(page.request, 'Hades', 'Completed');
  await seed(page.request, 'Outer Wilds', 'Completed');
  await seed(page.request, 'Hollow Knight', 'Completed');
  await page.reload();

  await drag(page, card(page, 'Celeste'), card(page, 'Outer Wilds'));

  await expect.poll(() => titlesIn(page, 'Completed')).toContain('Celeste');
  await expect.poll(() => titlesIn(page, 'Backlog')).not.toContain('Celeste');
});

test('a column says it will take the card while the cursor is over one of its cards', async ({
  page,
}) => {
  // The whole of what was wrong. A column tints itself while a drag is over it, and it read
  // that off its own `useDroppable` — which is true only when dnd-kit's `over` *is* that
  // droppable, never when it is one of the cards inside it. So a column with cards in it
  // answered a drag over its own contents with nothing at all, and the only place that lit up
  // was the empty strip below the last card. The drop worked the whole time; nothing said so.
  await seed(page.request, 'Celeste', 'Backlog');
  await seed(page.request, 'Hades', 'Completed');
  await page.reload();

  const from = await card(page, 'Celeste').boundingBox();
  const onto = await card(page, 'Hades').boundingBox();
  if (from === null || onto === null) {
    throw new Error('both cards have to be on screen');
  }

  // Held mid-gesture rather than using drag(), because the claim is about what is on screen
  // while the button is still down.
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2 + 20, { steps: 5 });
  await page.mouse.move(onto.x + onto.width / 2, onto.y + onto.height / 2, { steps: 20 });

  await expect(column(page, 'Completed')).toHaveClass(/bg-drop/);
  await expect(column(page, 'Backlog')).not.toHaveClass(/bg-drop/);

  await page.mouse.up();
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

test('the options menu drops a game, and dragging it out picks it back up', async ({
  page,
}) => {
  const mediaId = await seed(page.request, 'Anthem', 'InProgress', { startedAt: '2026-05-01' });
  await page.reload();

  await chooseOption(page, 'Anthem', 'Move to Dropped');

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


test('a card can be dragged into Dropped while Dropped is still collapsed', async ({ page }) => {
  // Dropped starts out of the way, and used to stop being a drop target entirely while it was:
  // the droppable ref hung off the card list, which is not rendered when the column is closed.
  // So the column had no rect, closestCorners could never pick it, and a card let go over that
  // corner of the board landed in Completed — which is next to it and does have one.
  const mediaId = await seed(page.request, 'Anthem', 'InProgress', { startedAt: '2026-05-01' });
  await page.reload();

  await expect(page.getByRole('button', { name: 'Show Dropped' })).toBeVisible();
  await drag(page, card(page, 'Anthem'), column(page, 'Dropped'));

  await expect
    .poll(async () => (await entriesFor(page.request, mediaId))[0]?.status)
    .toBe('Dropped');

  // And it went nowhere near Completed, which is the column it used to land in.
  expect(await titlesIn(page, 'Completed')).not.toContain('Anthem');
});

test('removing a backlog game takes it off the board rather than dropping it', async ({
  page,
}) => {
  // Dropped records a game you started and gave up on. Nothing was started here, so there is
  // nothing to record — the title goes, and the catalog keeps the game itself. Both endings are
  // in the menu now; this is still the one that is not a move.
  const mediaId = await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();

  await chooseOption(page, 'Celeste', 'Remove from board');
  await expect(page.getByText('Takes Celeste off your board.')).toBeVisible();
  await page.getByRole('button', { name: 'Really remove?' }).click();

  await expect(card(page, 'Celeste')).toBeHidden();
  await expect.poll(async () => (await entriesFor(page.request, mediaId)).length).toBe(0);

  await page.getByRole('button', { name: 'Show Dropped' }).click();
  expect(await titlesIn(page, 'Dropped')).not.toContain('Celeste');
});

test('removing a replayed title takes every pass, not one press per playthrough', async ({
  page,
}) => {
  // The bug this rule was changed for. Removing used to delete the current pass alone, so a
  // title carrying a completion and a replay came *back* on the first press — in Completed,
  // reading exactly like the remove had failed — and stacking replays meant one press each.
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

  await chooseOption(page, 'Hollow Knight', 'Remove from board');
  // The count is the warning: two records are going, not a card.
  await expect(page.getByText(/all 2 playthroughs, and their notes/)).toBeVisible();
  await page.getByRole('button', { name: 'Really remove?' }).click();

  // Gone from every column, in one press.
  await expect(card(page, 'Hollow Knight')).toBeHidden();
  await page.getByRole('button', { name: 'Show Dropped' }).click();
  for (const status of ['Backlog', 'InProgress', 'Completed', 'Dropped'] as const) {
    expect(await titlesIn(page, status)).not.toContain('Hollow Knight');
  }
  await expect.poll(async () => (await entriesFor(page.request, mediaId)).length).toBe(0);
});

test('a finished game replayed from the menu keeps the completion, as a drag does', async ({
  page,
}) => {
  // Only reachable this way. Completed had no corner control at all before the menu, so the
  // rule that leaving Completed inserts a fresh pass rather than editing the old one had only
  // ever been driven from a drag — and this route goes through the same endpoint for a reason.
  const mediaId = await seed(page.request, 'Hollow Knight', 'Completed', {
    startedAt: '2024-01-10',
    completedAt: '2024-03-02',
  });
  await page.reload();

  await chooseOption(page, 'Hollow Knight', 'Move to Playing');

  await expect(column(page, 'InProgress').getByText('Hollow Knight')).toBeVisible();
  await expect(
    card(page, 'Hollow Knight').getByRole('img', { name: '2 playthroughs' }),
  ).toBeVisible();

  // Two passes, and the completion below is untouched.
  await expect.poll(async () => (await entriesFor(page.request, mediaId)).length).toBe(2);
  const entries = await entriesFor(page.request, mediaId);
  expect(entries[0]?.status).toBe('InProgress');
  expect(entries[1]?.completedAt).not.toBeNull();
});

test('the menu is offered outside manual sort, where a drag is not', async ({ page }) => {
  // The two are not the same gesture and never were. Dragging is disabled in every other sort
  // because it would promise a ranking the API will not store; a move through the menu stores
  // nothing about order, so there is nothing for it to promise.
  await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();
  await setSort(page, 'Backlog', 'Title');

  await chooseOption(page, 'Celeste', 'Move to Playing');

  await expect(column(page, 'InProgress').getByText('Celeste')).toBeVisible();
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
  // Attempted rather than asserted through an attribute: this used to read dnd-kit's
  // aria-disabled off the card, which says the sortable is off and was taken by everything that
  // reads it — Playwright included — as disabling the card's buttons too. Doing the gesture and
  // finding nothing moved is the claim the test was making all along.
  await drag(page, card(page, 'Celeste'), card(page, 'Stardew Valley'));
  await expect.poll(() => titlesIn(page, 'Backlog')).toEqual(['Celeste', 'Stardew Valley']);

  await column(page, 'Backlog')
    .getByRole('combobox', { name: 'Backlog order' })
    .selectOption('manual');
  await expect.poll(() => titlesIn(page, 'Backlog')).toEqual(before);
});

test('a card dragged out of Backlog and back can be dragged again', async ({ page }) => {
  // The whole of this one is in a real browser or nowhere. On a board where nothing has been
  // started or finished there is no year to read, so the picker opens on All years — and the
  // drag into Completed stamps a completion, which brings 2026 into existence. Dragging back
  // to Backlog clears it again, and the year the board is showing used to follow that list
  // both ways.
  //
  // The card was then in the right column and could not be dragged. Three columns change cache
  // entry when the year moves, and one of those entries still held the card where it used to
  // be — so for a moment the board had two of it, which is one dnd-kit registration made twice
  // and unmade once. Nothing looked wrong, and only a reload fixed it.
  await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();

  const picker = page.getByRole('combobox', { name: 'Year' });
  await expect(picker).toHaveValue('');

  await drag(page, card(page, 'Celeste'), column(page, 'Completed'));
  await expect(column(page, 'Completed').getByText('Celeste')).toBeVisible();

  // The year the completion was stamped in, read off the journal clock rather than off this
  // machine's: a drag at 8pm on New Year's Eve belongs to the year it was evening in here.
  const thisYear = today().slice(0, 4);
  await expect(picker).toHaveValue(thisYear);

  await drag(page, card(page, 'Celeste'), column(page, 'Backlog'));
  await expect(column(page, 'Backlog').getByText('Celeste')).toBeVisible();

  // The year holds, rather than reverting to All years because the list it came from emptied.
  // Loosely ordered against the refetch that empties it, so BoardPage.test.tsx is what actually
  // pins the rule — this is here because the two halves belong to one story.
  await expect(picker).toHaveValue(thisYear);

  // And the card is still a card. No reload between here and the drag that came back.
  await drag(page, card(page, 'Celeste'), column(page, 'Completed'));
  await expect(column(page, 'Completed').getByText('Celeste')).toBeVisible();
});

test('the board opens on the latest year there is', async ({ page }) => {
  await seed(page.request, 'Hades', 'Completed', { completedAt: '2024-11-02' });
  await seed(page.request, 'Outer Wilds', 'Completed', { completedAt: '2026-03-03' });
  await page.reload();

  // Not "All years". The year you are in is the one you are adding to, and a board that opened
  // on everything would be a wall of history for anyone who logs more than one year of it.
  await expect(page.getByRole('combobox', { name: 'Year' })).toHaveValue('2026');
  await expect.poll(() => titlesIn(page, 'Completed')).toEqual(['Outer Wilds']);
});

test('the year narrows three columns and leaves the backlog alone', async ({ page }) => {
  await seed(page.request, 'Celeste', 'Backlog');
  await seed(page.request, 'Hades', 'Completed', { completedAt: '2024-11-02' });
  await seed(page.request, 'Anthem', 'InProgress', { startedAt: '2024-05-06' });
  await seed(page.request, 'Outer Wilds', 'Completed', { completedAt: '2026-03-03' });
  await page.reload();

  await page.getByRole('combobox', { name: 'Year' }).selectOption('2024');

  // Completed answers with the year it was finished in, Playing with the year it was begun in.
  // One predicate for both would empty Playing on every year, because the transition into that
  // column clears the completion date.
  await expect.poll(() => titlesIn(page, 'Completed')).toEqual(['Hades']);
  await expect.poll(() => titlesIn(page, 'InProgress')).toEqual(['Anthem']);

  // The queue is exempt rather than filtered. Both of its timestamps are cleared by the rule
  // that puts a title there, so it belongs to no year — and it is what you drag out of while
  // you read a past one.
  await expect.poll(() => titlesIn(page, 'Backlog')).toEqual(['Celeste']);

  await page.getByRole('combobox', { name: 'Year' }).selectOption('All years');
  await expect.poll(() => titlesIn(page, 'Completed')).toHaveLength(2);
});

test('a year offered by the picker is one something was only started in', async ({ page }) => {
  // The options and the filter have to describe the same set of years. While the list was
  // completions alone, a year you began something in and finished nothing in was a year the
  // columns handled correctly and the picker could not ask for.
  await seed(page.request, 'Anthem', 'InProgress', { startedAt: '2019-05-06' });
  await page.reload();

  const picker = page.getByRole('combobox', { name: 'Year' });
  await expect(picker.getByRole('option', { name: '2019' })).toBeAttached();

  await picker.selectOption('2019');
  await expect.poll(() => titlesIn(page, 'InProgress')).toEqual(['Anthem']);
});
