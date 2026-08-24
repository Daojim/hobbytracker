import { expect, test } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { awaitEstimate } from './support/hltb';
import {
  card,
  column,
  drag,
  openJournal,
  seed,
  setSort,
  titlesIn,
  today,
  todayOnCard,
  writeNote,
} from './support/board';

/**
 * Journalling a title from the board.
 *
 * The rating, the notes and the dates were reachable by the API and by nothing else — the card
 * has rendered a rating since the board was built and there was no way to set one. These check
 * the loop closes: change it in the drawer, see it on the card.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();

  // Every board route is behind [Authorize] now, and the session is a cookie on this page's
  // context — which is also why the helpers below seed through page.request rather than the
  // standalone request fixture, since those two keep separate cookie jars.
  await signIn(page);
  await page.goto('/board');
});

test('rating a game from the board puts the rating on its card', async ({ page }) => {
  await seed(page.request, 'Celeste', 'InProgress', { startedAt: '2026-08-10' });
  await page.reload();

  await openJournal(page, 'Celeste');
  await page.getByRole('spinbutton', { name: 'Exact rating' }).fill('8.5');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(
    card(page, 'Celeste').getByRole('img', { name: 'Rated 8.5 out of 10' }),
  ).toBeVisible();

  // And it is stored, not just on screen.
  await page.reload();
  await expect(
    card(page, 'Celeste').getByRole('img', { name: 'Rated 8.5 out of 10' }),
  ).toBeVisible();
});

test('saving says so, and stops saying so once you change something', async ({
  page,
}) => {
  // The button reads "Saving…" for a few hundred milliseconds and then goes back to "Save",
  // which leaves nothing behind to say the write landed. This is that something — and the real
  // API is what makes the test worth having, since a save that changes a value remounts the
  // form underneath the message.
  await seed(page.request, 'Celeste', 'InProgress');
  await page.reload();

  await openJournal(page, 'Celeste');
  await page.getByRole('spinbutton', { name: 'Exact rating' }).fill('8.5');
  await page.getByRole('button', { name: 'Save' }).click();

  // Scoped to the dialog, because the board behind it has a role="status" of its own: dnd-kit
  // mounts a live region to announce a drag, and it is empty except while one is happening. A
  // bare getByRole('status') matches both and fails as a strict-mode violation — which the Vitest
  // suite cannot show, because it mounts the drawer without the board's DndContext around it.
  const confirmation = page.getByRole('dialog').getByRole('status');
  await expect(confirmation).toHaveText('Saved');

  // It is a claim about what is on screen, not an announcement about the past, so editing
  // takes it back rather than a timer running out.
  await page.getByRole('spinbutton', { name: 'Exact rating' }).fill('9.1');
  await expect(confirmation).toHaveCount(0);
});

test('a rating the column would round is refused before it is sent', async ({ page }) => {
  // numeric(3,1) rounds 8.75 to 8.8 rather than rejecting it, so accepting one would mean
  // reporting a rating the database does not hold.
  await seed(page.request, 'Celeste', 'InProgress', { startedAt: '2026-08-10' });
  await page.reload();

  await openJournal(page, 'Celeste');
  await page.getByRole('spinbutton', { name: 'Exact rating' }).fill('8.75');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('alert')).toContainText('one decimal place');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(card(page, 'Celeste').getByRole('img', { name: /Rated/ })).toHaveCount(0);
});


test('the rating slider answers to the keyboard, a tenth at a time', async ({ page }) => {
  // jsdom has no slider to press: the arrow keys a range input answers to are the browser's,
  // not ours, and "it comes for free" is only true if something checks.
  await seed(page.request, 'Celeste', 'InProgress', { startedAt: '2026-08-10', rating: 8 });
  await page.reload();

  await openJournal(page, 'Celeste');
  await page.getByRole('slider', { name: 'Rating' }).focus();
  for (let nudge = 0; nudge < 5; nudge += 1) {
    await page.keyboard.press('ArrowRight');
  }

  await expect(page.getByRole('spinbutton', { name: 'Exact rating' })).toHaveValue('8.5');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(
    card(page, 'Celeste').getByRole('img', { name: 'Rated 8.5 out of 10' }),
  ).toBeVisible();
});

test('clearing a rating takes it off the card', async ({ page }) => {
  await seed(page.request, 'Celeste', 'InProgress', { startedAt: '2026-08-10', rating: 8.5 });
  await page.reload();

  await openJournal(page, 'Celeste');
  await page.getByRole('button', { name: 'Clear rating' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(card(page, 'Celeste').getByRole('img', { name: /Rated/ })).toBeHidden();

  // Cleared, not merely blanked on screen: PUT sends the null that empties the column.
  await page.reload();
  await expect(card(page, 'Celeste').getByRole('img', { name: /Rated/ })).toBeHidden();
});


test('a card names the genre it is coloured by, picking the specific one', async ({
  page,
}) => {
  // Hollow Knight is Adventure, Platform and Indie at IGDB. Indie is not painted at all and
  // Adventure describes half the catalogue, so the card should read Platform.
  await seed(page.request, 'Hollow Knight', 'Backlog');
  await page.reload();

  await expect(card(page, 'Hollow Knight').getByText('Platform')).toBeVisible();
});

test('choosing a genre in the drawer recolours the card', async ({ page }) => {
  await seed(page.request, 'Hollow Knight', 'Backlog');
  await page.reload();

  await openJournal(page, 'Hollow Knight');
  await page.getByLabel('Genre').selectOption('Adventure');
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(card(page, 'Hollow Knight').getByText('Adventure')).toBeVisible();
  await expect(card(page, 'Hollow Knight').getByText('Platform')).toBeHidden();

  // Against the game, so it survives a reload and would survive a replay.
  await page.reload();
  await expect(card(page, 'Hollow Knight').getByText('Adventure')).toBeVisible();
});

test('a refresh brings genres to a title that predates them', async ({ page }) => {
  // media rows are only ever written by a search, so a column added to the schema is empty on
  // the library you already have. This is what the backfill is for.
  const mediaId = await seed(page.request, 'Celeste', 'Backlog');
  await page.request.post('/api/games/refresh');

  await page.reload();
  await expect(card(page, 'Celeste').getByText('Platform')).toBeVisible();

  const refreshed = await page.request.get(`/api/games/${mediaId}`);
  expect(((await refreshed.json()) as { genres: string[] }).genres).toEqual(['Indie', 'Platform']);
});

test('a corrected start date shows on the card', async ({ page }) => {
  await seed(page.request, 'Celeste', 'InProgress', { startedAt: '2026-08-10' });
  await page.reload();
  await expect(card(page, 'Celeste')).toContainText('Aug 10, 2026');

  await openJournal(page, 'Celeste');
  await page.getByLabel('Started').fill('2026-08-01');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(card(page, 'Celeste')).toContainText('Aug 1, 2026');
});

test('a finished game dragged back to the backlog stays there', async ({ page }) => {
  // The ordinary route to Completed leaves a start date behind, and the Backlog entry that
  // supersedes it has none. Ordering the current pass by started_at meant the completion won,
  // the card sprang back, and every retry added another orphan entry.
  await seed(page.request, 'Hollow Knight', 'Completed', {
    startedAt: '2024-01-10',
    completedAt: '2024-11-02',
  });
  await page.reload();

  await drag(page, card(page, 'Hollow Knight'), column(page, 'Backlog'));

  await expect(column(page, 'Backlog').getByText('Hollow Knight')).toBeVisible();

  // The reload is the point: the optimistic move always looked right, and the refetch was
  // where it came undone.
  await page.reload();
  await expect(column(page, 'Backlog').getByText('Hollow Knight')).toBeVisible();
  await expect(column(page, 'Completed').getByText('Hollow Knight')).toHaveCount(0);
});

test('the pass you finished is still there to read afterwards', async ({ page }) => {
  await seed(page.request, 'Hollow Knight', 'Completed', {
    startedAt: '2024-01-10',
    completedAt: '2024-11-02',
  });
  await page.reload();

  await drag(page, card(page, 'Hollow Knight'), column(page, 'Backlog'));

  // Waited for rather than the card merely appearing: the optimistic move carries the old entry
  // count, so ×2 is the first thing on screen that can only have come from the refetch. Opening
  // the drawer before that lands means clicking a node React is in the middle of replacing.
  await expect(
    card(page, 'Hollow Knight').getByRole('img', { name: '2 playthroughs' }),
  ).toBeVisible();

  await openJournal(page, 'Hollow Knight');

  await expect(page.getByText('Earlier passes')).toBeVisible();
  await expect(page.getByText('Nov 2, 2024')).toBeVisible();
});

test('a card still drags even though its title opens the journal', async ({ page }) => {
  await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();

  await drag(page, card(page, 'Celeste'), column(page, 'InProgress'));

  await expect(column(page, 'InProgress').getByText('Celeste')).toBeVisible();
  // The gesture moved a card and did not also open anything.
  await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
});

test('a card drags from its title, which is most of its surface', async ({ page }) => {
  // The title is a button, and it is by far the biggest target on a card. If pressing it could
  // only ever be a click, most of the card would be dead to the gesture — which is what having
  // to aim at the margins felt like.
  await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();

  const title = card(page, 'Celeste').getByRole('button', { name: 'Celeste', exact: true });
  await drag(page, title, column(page, 'InProgress'));

  await expect(column(page, 'InProgress').getByText('Celeste')).toBeVisible();
  // And the gesture did not also count as a click on the button it started from: past the
  // activation distance dnd-kit swallows the click itself, so nothing here has to.
  await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
});

test('a wobble while clicking the title still opens the journal', async ({ page }) => {
  // The press that opens a card and the press that starts a drag are the same press, and only
  // the distance tells them apart. A hand that moves three pixels between down and up is
  // clicking, and this is what the title button's old stopPropagation was over-protecting.
  await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();

  const title = card(page, 'Celeste').getByRole('button', { name: 'Celeste', exact: true });
  const box = await title.boundingBox();
  if (box === null) {
    throw new Error('the title has to be on screen to be pressed');
  }

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  // Inside the pointer sensor's 8px activation distance, so this is still a click.
  await page.mouse.move(x + 3, y + 2);
  await page.mouse.up();

  await expect(page.getByRole('dialog', { name: 'Celeste' })).toBeVisible();
  expect(await titlesIn(page, 'Backlog')).toEqual(['Celeste']);
});

test('the drawer catches up with a drag', async ({ page }) => {
  // A drag sets started_at server-side, and the drawer reads a different query from the one the
  // drag invalidates. With staleTime at 30s, open-close-drag-reopen inside that window served
  // the pre-drag entry, so Started looked empty on a game that had just been started.
  await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();

  await openJournal(page, 'Celeste');
  await expect(page.getByLabel('Started')).toHaveValue('');
  await page.getByRole('button', { name: 'Close' }).click();

  await drag(page, card(page, 'Celeste'), column(page, 'InProgress'));

  // Waited for rather than the card merely arriving: a backlog entry carries no dates, so the
  // date on its face can only have come from the refetch. Clicking before that lands means
  // clicking a node React is in the middle of replacing, and the click never becomes one.
  await expect(card(page, 'Celeste')).toContainText(todayOnCard());

  await openJournal(page, 'Celeste');
  await expect(page.getByLabel('Started')).toHaveValue(today());
});

test('a drag reaches the ordering you are not looking at', async ({ page }) => {
  // The same missed invalidation one level over: a column's key carries its sort, so only the
  // ordering on screen was refetched and any other cached ordering of it kept the moved card.
  await seed(page.request, 'Celeste', 'Backlog');
  await seed(page.request, 'Hades', 'Backlog');
  await page.reload();

  // Look at Title first, so that ordering is in the cache and has something to go stale. Then
  // back to My order, which is the only mode a drag is offered in.
  await setSort(page, 'Backlog', 'Title');
  await expect(column(page, 'Backlog').getByText('Celeste')).toBeVisible();
  await setSort(page, 'Backlog', 'My order');

  await drag(page, card(page, 'Celeste'), column(page, 'InProgress'));
  await expect(column(page, 'InProgress').getByText('Celeste')).toBeVisible();

  await setSort(page, 'Backlog', 'Title');
  await expect(column(page, 'Backlog').getByText('Celeste')).toHaveCount(0);
  await expect(column(page, 'Backlog').getByText('Hades')).toBeVisible();
});

test('clicking away from the drawer closes it, and so does Escape', async ({ page }) => {
  // jsdom has no layout, so it cannot say whether the backdrop really covers the board — only
  // that a click on it calls onClose. This clicks where a column is and lets the browser
  // decide what receives it.
  await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();

  await openJournal(page, 'Celeste');
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.mouse.click(40, 400);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await openJournal(page, 'Celeste');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a pass added by a mistaken drag can be taken back', async ({ page }) => {
  // The gap this closes: drag to Completed and back and the card says ×2 forever, because
  // leaving Completed inserts an entry rather than editing one. Nothing could remove it.
  await seed(page.request, 'Hollow Knight', 'Completed', {
    startedAt: '2024-01-10',
    completedAt: '2024-11-02',
  });
  await page.reload();

  await drag(page, card(page, 'Hollow Knight'), column(page, 'InProgress'));
  await expect(
    card(page, 'Hollow Knight').getByRole('img', { name: '2 playthroughs' }),
  ).toBeVisible();

  await openJournal(page, 'Hollow Knight');
  await page.getByRole('button', { name: 'Delete this pass' }).click();
  await page.getByRole('button', { name: 'Really delete?' }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  // Back where it was, with the 2024 completion untouched — which is the whole point of the
  // schema keeping several entries per title.
  await expect(column(page, 'Completed').getByText('Hollow Knight')).toBeVisible();
  await expect(card(page, 'Hollow Knight')).toContainText('Nov 2, 2024');
  await expect(
    card(page, 'Hollow Knight').getByRole('img', { name: '2 playthroughs' }),
  ).toHaveCount(0);
});

test('deleting the only pass takes the title off the board', async ({ page }) => {
  // The library is titles you have logged something against, so the last pass leaving takes
  // the card with it. The drawer would otherwise be left describing nothing.
  await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();

  await openJournal(page, 'Celeste');
  await page.getByRole('button', { name: 'Delete this pass' }).click();
  await expect(page.getByText(/takes Celeste off your board/)).toBeVisible();
  await page.getByRole('button', { name: 'Really delete?' }).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(card(page, 'Celeste')).toHaveCount(0);
});


test('how long a pass took is recorded against that pass', async ({ page }) => {
  // Per pass, like the platform: a replay is not the same length as the first run, and the
  // number worth putting beside HowLongToBeat's estimate is what this playthrough took.
  const mediaId = await seed(page.request, 'Celeste', 'Completed', {
    startedAt: '2026-08-01',
    completedAt: '2026-08-10',
  });

  // Reading yours against theirs is the reason to write yours down at all, and until the
  // HowLongToBeat stub existed there was nothing here to read it against. See hltb.spec.ts.
  await awaitEstimate(page.request, mediaId);
  await page.reload();

  await openJournal(page, 'Celeste');
  await expect(page.getByText('Main story: 8 h')).toBeVisible();

  await page.getByLabel('Hours played').fill('31.5');
  await page.getByRole('button', { name: 'Save' }).click();

  // Measured against Main Story alone: three deltas is arithmetic rather than a reading.
  await expect(page.getByText('you: 31.5 h (+23.5)')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.reload();
  await openJournal(page, 'Celeste');
  await expect(page.getByLabel('Hours played')).toHaveValue('31.5');
});

test('the platform you played on is recorded against that pass', async ({ page }) => {
  await seed(page.request, 'Hollow Knight', 'InProgress');
  await page.reload();

  await openJournal(page, 'Hollow Knight');
  // The choices are the game's own, which is why the stub gives it more than one.
  await page.getByLabel('Platform').selectOption('Switch');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  // Stored, not merely on screen — the column is new and the migration has to have landed.
  await page.reload();
  await openJournal(page, 'Hollow Knight');
  await expect(page.getByLabel('Platform')).toHaveValue('Switch');
});

test('notes stack up on a pass instead of overwriting each other', async ({ page }) => {
  // The bug this whole table exists to fix: one column meant a journal you could only overwrite.
  await seed(page.request, 'Hollow Knight', 'InProgress');
  await page.reload();

  await openJournal(page, 'Hollow Knight');
  await writeNote(page, 'stuck on watcher knights');
  await writeNote(page, 'finally beat radiance');

  // Reloaded, because "both are on screen" and "both are stored" are different claims.
  await page.reload();
  await openJournal(page, 'Hollow Knight');

  await expect(page.getByText('stuck on watcher knights')).toBeVisible();
  await expect(page.getByText('finally beat radiance')).toBeVisible();

  // Newest first, matching every other list in this app.
  // Scoped to the drawer: the board's cards behind it are list items too, and its "Playing"
  // column would answer to the same region name as the pass.
  const bodies = await page.getByRole('dialog').getByRole('listitem').allTextContents();
  expect(bodies[0]).toContain('finally beat radiance');
  expect(bodies[1]).toContain('stuck on watcher knights');
});

test('a note can be fixed and another taken back', async ({ page }) => {
  await seed(page.request, 'Celeste', 'InProgress');
  await page.reload();

  await openJournal(page, 'Celeste');
  await writeNote(page, 'wathcer knights');
  await writeNote(page, 'a typo I will regret');

  await page.getByRole('button', { name: /^Edit the note from/ }).last().click();
  const box = page.getByRole('textbox', { name: /^Note from/ });
  await box.fill('watcher knights');
  await page.getByRole('button', { name: 'Save note' }).click();

  // Waited for, not assumed: the rewritten body can only be on screen once the refetch lands,
  // and clicking before then means clicking a node React is in the middle of replacing.
  await expect(page.getByText('watcher knights')).toBeVisible();

  await page.getByRole('button', { name: /^Delete the note from/ }).first().click();
  await page.getByRole('button', { name: 'Really delete?' }).click();

  // Gone from the screen before reloading, or the navigation cancels the request that removes it.
  await expect(page.getByText('a typo I will regret')).toHaveCount(0);

  await page.reload();
  await openJournal(page, 'Celeste');

  await expect(page.getByText('watcher knights')).toBeVisible();
  await expect(page.getByText('a typo I will regret')).toHaveCount(0);
});

test('a replay starts empty and the finished pass keeps what you wrote', async ({
  page,
}) => {
  // A note belongs to the pass it was written during, which is the whole reason it hangs off the
  // entry rather than the title. Only a real stack can show the two halves of that at once.
  await seed(page.request, 'Hollow Knight', 'Completed', {
    startedAt: '2024-01-10',
    completedAt: '2024-11-02',
  });
  await page.reload();

  await openJournal(page, 'Hollow Knight');
  await writeNote(page, 'what a finish');
  await page.getByRole('button', { name: 'Close' }).click();

  await drag(page, card(page, 'Hollow Knight'), column(page, 'InProgress'));
  await expect(
    card(page, 'Hollow Knight').getByRole('img', { name: '2 playthroughs' }),
  ).toBeVisible();

  await openJournal(page, 'Hollow Knight');

  const finished = page.getByRole('region', { name: 'Completed Nov 2, 2024' });
  await expect(finished.getByText('what a finish')).toBeVisible();

  // And the pass just started has nothing on it yet.
  const started = page.getByRole('region', { name: 'Playing', exact: true });
  await expect(started.getByText('what a finish')).toHaveCount(0);
});
