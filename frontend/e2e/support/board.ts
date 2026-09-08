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
    Completed: 'Completed',
    Dropped: 'Dropped',
  },
  movies: {
    Backlog: 'Backlog',
    InProgress: 'Watching',
    Completed: 'Watched',
    Dropped: 'Dropped',
  },
  // The same four words as films, written out again rather than shared. Two hobbies agreeing
  // today is a fact about today, and the copy is what would catch one of them changing.
  tv: {
    Backlog: 'Backlog',
    InProgress: 'Watching',
    Completed: 'Watched',
    Dropped: 'Dropped',
  },
  // And a third copy, for the third hobby that watches things. Three agreeing is still a fact
  // about today.
  anime: {
    Backlog: 'Backlog',
    InProgress: 'Watching',
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
  // Past the pointer sensor's 8px activation distance, which is what keeps a click on the drop
  // button from being read as the beginning of a drag.
  await page.mouse.move(startX + 20, startY + 20, { steps: 5 });
  await page.mouse.move(target.x + target.width / 2, target.y + 60, { steps: 20 });
  await page.mouse.move(target.x + target.width / 2, target.y + 60, { steps: 5 });
  await page.mouse.up();
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
