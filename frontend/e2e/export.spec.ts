import { expect, test } from '@playwright/test';
import readXlsxFile from 'read-excel-file/node';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { entriesFor, seed, today } from './support/board';

/**
 * The spreadsheet, end to end: the row in Settings, the real API's export, the real writer in a
 * real browser, and the file it saves read back the way a spreadsheet reads one.
 *
 * What only this layer can say is in the file itself — that the writer was handed typed cells and
 * wrote them as such, which the unit tests take on trust from the cells they build.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();
  await signIn(page);
});

/**
 * The day and the minute an instant fell on here, as a spreadsheet date holds them: the wall-clock
 * parts written as UTC. Mirrors `journalMinute` in `src/lib/time.ts`, as `today()` mirrors
 * `journalDateInput`.
 */
function wallClockHere(instant: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((candidate) => candidate.type === type)?.value);

  return new Date(
    Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute')),
  );
}

/**
 * To the minute, because that is all the file holds and all a reader gives back exactly: a
 * serial for 21:12 reads back as 21:11:59.999.
 */
const minuteOf = (date: Date) => Math.round(date.getTime() / 60_000);

test('the row downloads the board as a workbook of three sheets', async ({ page }) => {
  // A finish at 9:30 in the evening, which is the next day in UTC, and a note that begins the way
  // a formula does.
  const celeste = await seed(page.request, 'Celeste', 'Completed', {
    startedAt: '2026-08-01T12:00:00',
    completedAt: '2026-08-20T21:30:00',
    rating: 9,
    hoursPlayed: 15,
  });
  const [pass] = await entriesFor(page.request, celeste);
  const written = await page.request.post(`/api/log-entries/${pass!.id}/notes`, {
    data: { body: '=Farewell is brutal' },
  });
  expect(written.ok()).toBeTruthy();
  const note = (await written.json()) as { writtenAt: string };

  await seed(page.request, 'Hollow Knight', 'Backlog');

  await page.goto('/board');
  await page.getByRole('button', { name: 'Settings' }).click();

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download a spreadsheet' }).click();
  const download = await downloading;

  expect(download.suggestedFilename()).toBe(`hobbytracker-games-${today()}.xlsx`);

  const workbook = await readXlsxFile(await download.path());
  expect(workbook.map((sheet) => sheet.sheet)).toEqual(['Games', 'Playthroughs', 'Notes']);

  const [games, , notes] = workbook.map((sheet) => sheet.data);
  const [header, ...rows] = games!;
  const at = (row: (typeof rows)[number], column: string) => row[header!.indexOf(column)];

  // Board order: Backlog, then Completed.
  expect(rows.map((row) => row[0])).toEqual(['Hollow Knight', 'Celeste']);

  // A real date cell, on the evening's own day, and real numbers.
  const celesteRow = rows[1]!;
  expect(at(celesteRow, 'Finished')).toEqual(new Date(Date.UTC(2026, 7, 20)));
  expect(at(celesteRow, 'Rating')).toBe(9);
  expect(at(celesteRow, 'Hours played')).toBe(15);
  expect(at(celesteRow, 'Latest note')).toBe('=Farewell is brutal');

  // The note as it was typed, and when it was written, here, to the minute. A real date cell: the
  // reader's types call a date cell's value the Date constructor, and it hands back an instance.
  const [, noteRow] = notes!;
  expect(noteRow![3]).toBe('=Farewell is brutal');
  const writtenCell = noteRow![2];
  expect(writtenCell).toBeInstanceOf(Date);
  expect(minuteOf(writtenCell as unknown as Date)).toBe(minuteOf(wallClockHere(note.writtenAt)));
});

test('the keyboard stays on the row while the file is made', async ({ page }) => {
  // A real browser takes focus off a control the moment it is disabled, and jsdom does not, so
  // this is the layer that can say the row is held still some other way.
  await seed(page.request, 'Celeste', 'Backlog');

  await page.goto('/board');
  await page.getByRole('button', { name: 'Settings' }).click();
  const row = page.getByRole('button', { name: 'Download a spreadsheet' });
  await row.focus();

  const downloading = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  await downloading;

  await expect(row).toBeFocused();
});
