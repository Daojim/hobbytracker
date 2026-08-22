import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import type { LogEntry, LogStatus } from '../../src/api/types';

/**
 * Seeding, driving and reading the board, through the same surfaces a person uses.
 *
 * Nothing here writes SQL. A title reaches the catalogue by being searched for, exactly as it
 * does in the app — the search just happens to reach a stub rather than IGDB.
 */

export const COLUMN_LABEL: Record<LogStatus, string> = {
  Backlog: 'Backlog',
  InProgress: 'Playing',
  Completed: 'Completed',
  Dropped: 'Dropped',
};

interface SeedOptions {
  startedAt?: string;
  completedAt?: string;
  rating?: number;
  hoursPlayed?: number;
}

/** Puts a title on the board and answers with its media id. */
export async function seed(
  request: APIRequestContext,
  title: string,
  status: LogStatus,
  options: SeedOptions = {},
): Promise<number> {
  const found = await request.get('/api/games', { params: { search: title, limit: 5 } });
  expect(found.ok(), `search for ${title}`).toBeTruthy();

  const games = (await found.json()) as { id: number; title: string }[];
  const game = games.find((candidate) => candidate.title === title);
  expect(game, `${title} is in the stub catalogue`).toBeDefined();

  const created = await request.post('/api/log-entries', {
    data: { mediaId: game!.id, status, ...options },
  });
  expect(created.ok(), `log ${title} as ${status}`).toBeTruthy();

  return game!.id;
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
export async function titlesIn(page: Page, status: LogStatus): Promise<string[]> {
  return column(page, status).getByRole('heading', { level: 3 }).allTextContents();
}

export function column(page: Page, status: LogStatus): Locator {
  return page.getByRole('region', { name: new RegExp(`^${COLUMN_LABEL[status]} `) });
}

export function card(page: Page, title: string): Locator {
  return page.getByRole('listitem').filter({ hasText: title });
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
export async function setSort(page: Page, status: LogStatus, mode: string): Promise<void> {
  await page
    .getByRole('combobox', { name: `${COLUMN_LABEL[status]} order` })
    .selectOption({ label: mode });
}

/** Writes a note on whichever pass has its compose box open — the current one, by default. */
export async function writeNote(page: Page, body: string): Promise<void> {
  await page.getByRole('textbox', { name: 'New note' }).fill(body);
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByText(body)).toBeVisible();
}
