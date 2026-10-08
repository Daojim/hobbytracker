import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import type { LogEntry, LogStatus } from '../../src/api/types';

/**
 * Seeding, driving and reading the board, through the same surfaces a person uses.
 *
 * Nothing here writes SQL. A title reaches the catalogue by being searched for, exactly as it
 * does in the app — the search just happens to reach a stub rather than IGDB.
 */

/**
 * Which board a helper is talking about. Games unless a spec says otherwise, because every
 * spec written before there was a second hobby means games and should not have to say so.
 */
export type Hobby = 'games' | 'movies' | 'tv' | 'anime';

const DEFAULT_HOBBY: Hobby = 'games';

/**
 * What each column is called, per hobby — and **deliberately a second copy** of what
 * `src/hobbies/` holds.
 *
 * Importing the app's own map would make every assertion below a tautology: the spec would
 * agree with the app because it is the app. Written out here, a column silently renamed shows
 * up as a locator that finds nothing.
 */
export const COLUMN_LABEL: Record<Hobby, Record<LogStatus, string>> = {
  games: {
    Backlog: 'Backlog',
    InProgress: 'Playing',
    OnHold: 'On Hold',
    Completed: 'Completed',
    Dropped: 'Dropped',
  },
  movies: {
    Backlog: 'Backlog',
    InProgress: 'Watching',
    OnHold: 'On Hold',
    Completed: 'Watched',
    Dropped: 'Dropped',
  },
  // The same five words as films, written out again rather than shared. Two hobbies agreeing
  // today is a fact about today, and the copy is what would catch one of them changing.
  tv: {
    Backlog: 'Backlog',
    InProgress: 'Watching',
    OnHold: 'On Hold',
    Completed: 'Watched',
    Dropped: 'Dropped',
  },
  // And a third copy, for the third hobby that watches things. Three agreeing is still a fact
  // about today.
  anime: {
    Backlog: 'Backlog',
    InProgress: 'Watching',
    OnHold: 'On Hold',
    Completed: 'Watched',
    Dropped: 'Dropped',
  },
};

interface SeedOptions {
  startedAt?: string;
  completedAt?: string;
  rating?: number;
  hoursPlayed?: number;
  /** Which catalogue to search, and therefore which board the title lands on. */
  hobby?: Hobby;
}

/** Puts a title on the board and answers with its media id. */
export async function seed(
  request: APIRequestContext,
  title: string,
  status: LogStatus,
  options: SeedOptions = {},
): Promise<number> {
  const { hobby = DEFAULT_HOBBY, ...entry } = options;

  // The catalogue route is the hobby's, and it is the only part of seeding that is: a log entry
  // points at a media id and does not care what kind of thing it is.
  const found = await request.get(`/api/${hobby}`, { params: { search: title, limit: 5 } });
  expect(found.ok(), `search for ${title}`).toBeTruthy();

  const results = (await found.json()) as { id: number; title: string }[];
  const media = results.find((candidate) => candidate.title === title);
  expect(media, `${title} is in the stub catalogue`).toBeDefined();

  const created = await request.post('/api/log-entries', {
    data: { mediaId: media!.id, status, ...entry },
  });
  expect(created.ok(), `log ${title} as ${status}`).toBeTruthy();

  return media!.id;
}

export async function entriesFor(
  request: APIRequestContext,
  mediaId: number,
): Promise<LogEntry[]> {
  const response = await request.get('/api/log-entries', { params: { mediaId, pageSize: 100 } });
  const page = (await response.json()) as { items: LogEntry[] };
  return page.items;
}

/** The titles in one column, top first, as the board is currently showing them. */
export async function titlesIn(
  page: Page,
  status: LogStatus,
  hobby: Hobby = DEFAULT_HOBBY,
): Promise<string[]> {
  return column(page, status, hobby).getByRole('heading', { level: 3 }).allTextContents();
}

export function column(page: Page, status: LogStatus, hobby: Hobby = DEFAULT_HOBBY): Locator {
  return page.getByRole('region', { name: new RegExp(`^${COLUMN_LABEL[hobby][status]} `) });
}

/**
 * One segment of the switcher a phone shows above the board, in place of the other columns.
 *
 * Matched on the column's name and any count after it, because the count is what changes as
 * titles move and the name is what a spec means.
 */
export function segment(page: Page, status: LogStatus, hobby: Hobby = DEFAULT_HOBBY): Locator {
  return page
    .getByRole('radiogroup', { name: 'Columns' })
    .getByRole('radio', { name: new RegExp(`^${COLUMN_LABEL[hobby][status]} \\d+$`) });
}

/**
 * A card on the board.
 *
 * Scoped to the board rather than the page: a list item is not a board card just because it
 * is a list item, and anything else on screen that renders a list of titles would answer to a
 * bare getByRole here. The failure would be a strict-mode violation in whichever spec happened
 * to have both on screen, which is nowhere near the change that caused it.
 */
export function card(page: Page, title: string): Locator {
  return page.locator('[data-board]').getByRole('listitem').filter({ hasText: title });
}

/**
 * Opens a title's journal.
 *
 * exact, because Playwright matches an accessible name by substring: a bare "Celeste" also
 * finds the card's "Drop Celeste" button, and the failure then reads as a strict-mode
 * violation rather than as the near-miss it actually is.
 */
export async function openJournal(page: Page, title: string): Promise<void> {
  await card(page, title).getByRole('button', { name: title, exact: true }).click();
}

/**
 * The gesture itself.
 *
 * dnd-kit tracks pointer movement rather than the HTML5 drag events, so a single jump from
 * source to target moves nothing: the sensor needs a press, a move that clears its activation
 * distance, and further moves for collision detection to run against. Playwright's
 * `dragTo` fires the wrong thing entirely.
 */
export async function drag(page: Page, from: Locator, to: Locator): Promise<void> {
  const source = await from.boundingBox();
  const target = await to.boundingBox();
  if (source === null || target === null) {
    throw new Error('drag needs both ends of the gesture to be on screen');
  }

  const startX = source.x + source.width / 2;
  const startY = source.y + source.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Past the mouse sensor's 8px activation distance, which is what keeps a click on the drop
  // button from being read as the beginning of a drag.
  await page.mouse.move(startX + 20, startY + 20, { steps: 5 });
  await page.mouse.move(target.x + target.width / 2, target.y + 60, { steps: 20 });
  await page.mouse.move(target.x + target.width / 2, target.y + 60, { steps: 5 });
  await page.mouse.up();
}

/**
 * The same gesture with a finger: press, hold still, then carry the card across and let go.
 *
 * Playwright can tap and nothing more, so this speaks the Chrome DevTools Protocol directly.
 * That ties it to Chromium, the only browser this suite runs, and to a context with `hasTouch`,
 * without which the page is never told that a touch happened.
 *
 * `lingerMs` holds the finger still over the target before letting go, the way a person waits
 * to see a target light up. That pause is when a page scrolling itself under a drag does its
 * damage, so a spec about that asks for one.
 */
export async function holdAndDrag(
  page: Page,
  from: Locator,
  to: Locator,
  { lingerMs = 0 }: { lingerMs?: number } = {},
): Promise<void> {
  const source = await from.boundingBox();
  const target = await to.boundingBox();
  if (source === null || target === null) {
    throw new Error('holdAndDrag needs both ends of the gesture to be on screen');
  }

  const start = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const end = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  const cdp = await page.context().newCDPSession(page);

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });

  // The one fixed wait in these helpers that is the gesture rather than a guess at when
  // something will have finished: a hold is a length of time. Comfortably past the touch
  // sensor's 250ms, so a slow machine cannot turn it into a swipe.
  await page.waitForTimeout(500);

  const steps = 20;
  for (let step = 1; step <= steps; step++) {
    const point = {
      x: start.x + ((end.x - start.x) * step) / steps,
      y: start.y + ((end.y - start.y) * step) / steps,
    };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
  }

  if (lingerMs > 0) {
    await page.waitForTimeout(lingerMs);
  }

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/**
 * A thumb flicking up the glass from `from`, which scrolls the page down.
 *
 * Touch events written out by hand, and that was measured rather than chosen. Chromium has a
 * gesture for exactly this, `Input.synthesizeScrollGesture`, and headless Chromium accepts it
 * and does nothing: 0px from the page's gutter in both the headless shell and the new headless
 * mode, where these touches scrolled the same page 285px and 674px. A test built on it would
 * have failed for ever, before the fix and after it, and looked like the bug both times.
 *
 * Touches are also the more honest test of this. The browser decides whether to scroll from
 * the touched element's `touch-action` and from whether the page cancelled the move, which are
 * the two things a swipe across a card is about. On the board before the fix, this gesture on a
 * card scrolled nothing and dragged the card two places up its column.
 */
export async function swipeUp(page: Page, from: Locator, distance: number): Promise<void> {
  const box = await from.boundingBox();
  if (box === null) {
    throw new Error('swipeUp needs somewhere on screen to start from');
  }

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (y - distance < 0) {
    throw new Error(`swipeUp would run off the top of the screen: start lower than y=${y}`);
  }

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });

  // No pause before the first move, which is what makes it a swipe: a finger that moves at once
  // is past the touch sensor's 5px tolerance long before its 250ms are up.
  const steps = 15;
  for (let step = 1; step <= steps; step++) {
    const point = { x, y: y - (distance * step) / steps };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
  }

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/**
 * Today, in the two shapes the app writes a day in.
 *
 * `toISOString().slice(0, 10)` would answer in UTC and hand this suite tomorrow's date every
 * evening after 8pm — the exact bug the Eastern journal zone exists to remove. These mirror
 * `journalDateInput` and `formatJournalDate` in `src/lib/time.ts`.
 */
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

/** The same day as a card renders it — "Aug 21, 2026". */
export function todayOnCard(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date());
}

/** Changes one column's ordering. The control names the column it orders. */
export async function setSort(
  page: Page,
  status: LogStatus,
  mode: string,
  hobby: Hobby = DEFAULT_HOBBY,
): Promise<void> {
  await page
    .getByRole('combobox', { name: `${COLUMN_LABEL[hobby][status]} order` })
    .selectOption({ label: mode });
}

/**
 * Waits for the pass to write itself.
 *
 * There is no Save button: a change arms a timer, so a spec that corrected a field waits for
 * the drawer to say the write landed rather than pressing anything. Skipping the wait is not
 * merely slower — the assertion after it would be racing a request that has not been made yet.
 *
 * Scoped to the dialog, and it has to be: the board behind carries a role="status" of its own,
 * since dnd-kit mounts a live region to announce a drag. A bare getByRole('status') matches
 * both and fails as a strict-mode violation, which the Vitest suite cannot show you — it mounts
 * the drawer without the board's DndContext around it.
 */
export async function passSaved(page: Page): Promise<void> {
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Saved');
}

/**
 * Writes a note on whichever pass has its compose box open — the current one, by default.
 *
 * The wait is scoped to the dialog, and has to be: a card carries the last thing you wrote
 * about a title, so the note lands in two places at once and a bare getByText resolves to both.
 * That is the feature working rather than a flake, but it is still a strict-mode violation.
 */
export async function writeNote(page: Page, body: string): Promise<void> {
  await page.getByRole('textbox', { name: 'New note' }).fill(body);
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByRole('dialog').getByText(body)).toBeVisible();
}

/**
 * Opens a card's options and picks one of them.
 *
 * The item's own text carries no title — the name is on the group — so the click is scoped to
 * the card rather than to the page. Two cards' menus can never be open at once, but scoping it
 * is what makes the locator say which card it means.
 */
export async function chooseOption(page: Page, title: string, option: string): Promise<void> {
  await card(page, title).getByRole('button', { name: `Options for ${title}` }).click();
  await card(page, title)
    .getByRole('group', { name: `Options for ${title}` })
    .getByRole('button', { name: option })
    .click();
}

/**
 * Answers the question a card asks before it leaves Completed, which a drag or a menu move out of
 * Completed has asked since #14: whether it was finished. Yes is a replay, a new pass beside the
 * finished one; no is a finish put back, the finished pass itself moving without its finish.
 */
export async function answerFinished(page: Page, title: string, finished: boolean): Promise<void> {
  const question = card(page, title).getByText(/^Did you finish it/);
  const answer = card(page, title).getByRole('button', {
    name: finished ? 'Yes — start a new pass' : /^No — move it to /,
  });

  // Pressed until the question goes, because the first press can land on nothing. dnd-kit stops
  // every click on the page until 50ms after a drop: its sensor takes its click listener off on a
  // timeout (AbstractPointerSensor.detach, in 6.3.1). A spec answering the moment drag() returns
  // is faster than that, and a person is not. Found on 8 October 2026, when the seven specs that
  // answered at once went red and the ones that looked at the card first stayed green.
  await expect(async () => {
    if (await question.isVisible()) {
      await answer.click({ timeout: 1000 });
    }
    await expect(question).toBeHidden({ timeout: 250 });
  }).toPass({ timeout: 5000 });
}
