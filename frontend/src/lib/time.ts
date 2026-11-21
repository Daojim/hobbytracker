/**
 * Turning the API's instants into something a person reads.
 *
 * The API sends absolute moments — `"2026-08-21T01:30:00+00:00"`. Which *day* that is depends
 * entirely on where you ask from, and the answer has to match the one the server gives, or the
 * board will show a completion on a day the year filter files under something else.
 *
 * So the zone is pinned here rather than left to the browser. A journal kept in Eastern reads the
 * same on a laptop in Tokyo; nothing about the record changes because of where it is being looked
 * at. This mirrors `Journal:TimeZone` on the server — see **Time** in CLAUDE.md.
 */
import { preferenceStore } from './preferenceStore';

const JOURNAL_TIME_ZONE = 'America/New_York';

/**
 * Whether a day is written month first, *Oct 8, 2026*, or day first, *8 Oct 2026*, as chosen in
 * Settings since #27. Per browser, as every appearance setting is.
 *
 * **Only the order of the day and the month changes.** The time of day is as it was, *8 Oct
 * 2026, 3:30 PM*, the recommendation over a 24-hour clock; a month heading such as *Jan 2027* has
 * no day to put first; and the day is still this zone's. Every formatter that writes a day reads
 * the order as it writes, and `App` hears it, so a date already on the screen changes at once.
 */
export const DATE_ORDERS = [
  { value: 'month', label: 'Oct 8, 2026' },
  { value: 'day', label: '8 Oct 2026' },
] as const;

export type DateOrder = (typeof DATE_ORDERS)[number]['value'];

export const DATE_ORDER_KEY = 'hobbytracker.dates';

const dateOrderStore = preferenceStore(DATE_ORDER_KEY);

/** Month first unless day first was chosen: anything else storage holds is the default. */
const parseDateOrder = (stored: string | null): DateOrder => (stored === 'day' ? 'day' : 'month');

/** The order a day is written in, as a formatter asks it. */
export function dateOrder(): DateOrder {
  return parseDateOrder(dateOrderStore.read(DATE_ORDER_KEY));
}

/** The same, kept current, for the one reader that has to hear it change: `App`. */
export function useDateOrder(): DateOrder {
  return parseDateOrder(dateOrderStore.useValue(DATE_ORDER_KEY));
}

export function setDateOrder(order: DateOrder): void {
  dateOrderStore.write(DATE_ORDER_KEY, order);
}

/** A month and a day in the order chosen: `Oct 8`, or `8 Oct`. */
export function monthAndDay(month: string, day: number | string): string {
  return dateOrder() === 'day' ? `${day} ${month}` : `${month} ${day}`;
}

/** A month, a day and a year in the order chosen: `Oct 8, 2026`, or `8 Oct 2026`. */
export function monthDayAndYear(month: string, day: number | string, year: number | string): string {
  return dateOrder() === 'day' ? `${day} ${month} ${year}` : `${month} ${day}, ${year}`;
}

/**
 * An instant written by one of the formatters below, in the order chosen. Month first is the
 * formatter's own text. Day first moves only the date: everything after the year, the time of day
 * included, is the formatter's own text again.
 *
 * **Cut from `format()`, never rebuilt from `formatToParts()`**, because the two disagree about the
 * space before *PM*: ICU writes a narrow one, and V8 swaps it for a plain space in `format()` alone,
 * measured in Node 25 on 21 November 2026. Rebuilt from the parts, day first would space the time
 * of day differently from month first. The date ahead of it has no such space, so its parts and
 * `format()`'s text are the same length, which is what the cut is measured by.
 */
function inOrder(format: Intl.DateTimeFormat, instant: string): string {
  const date = new Date(instant);
  const written = format.format(date);
  if (dateOrder() === 'month') {
    return written;
  }

  const parts = format.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const year = parts.findIndex((part) => part.type === 'year');
  const dateText = parts
    .slice(0, year + 1)
    .map((part) => part.value)
    .join('');
  const after = written.startsWith(dateText)
    ? written.slice(dateText.length)
    : parts
        .slice(year + 1)
        .map((part) => part.value)
        .join('');

  return `${monthDayAndYear(value('month'), value('day'), value('year'))}${after}`;
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: JOURNAL_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: JOURNAL_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const inputDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: JOURNAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The day an instant falls on here. Null in, null out — an absent timestamp is not "today". */
export function formatJournalDate(instant: string | null): string | null {
  return instant === null ? null : inOrder(dateFormat, instant);
}

/** The day and time an instant falls on here. */
export function formatJournalDateTime(instant: string | null): string | null {
  return instant === null ? null : inOrder(dateTimeFormat, instant);
}

/**
 * The calendar year an instant belongs to here — the same answer `?year=` gives.
 *
 * Deliberately not `new Date(instant).getFullYear()`, which reads the browser's zone and would
 * file a New Year's Eve completion under the following year for anyone west of UTC.
 */
export function journalYear(instant: string): number {
  const year = new Intl.DateTimeFormat('en-US', {
    timeZone: JOURNAL_TIME_ZONE,
    year: 'numeric',
  }).format(new Date(instant));

  return Number(year);
}

/**
 * The calendar month an instant belongs to here, 1 to 12 — what the Stats page files a finish
 * under. {@link journalYear}'s rule, and for its reason: an evening at the end of a month is
 * already the next one in UTC.
 */
export function journalMonth(instant: string): number {
  const month = new Intl.DateTimeFormat('en-US', {
    timeZone: JOURNAL_TIME_ZONE,
    month: 'numeric',
  }).format(new Date(instant));

  return Number(month);
}

/**
 * The day an instant fell on here, as `YYYY-MM-DD` for an `<input type="date">`.
 *
 * Deliberately not `toISOString().slice(0, 10)`, which reads UTC: an evening here is already
 * tomorrow there, so a form populated that way would offer to "correct" a date that was right,
 * and saving it would move the day. `en-CA` formats as YYYY-MM-DD, which is the shape the
 * element wants and the shape the API reads back as a wall-clock moment here.
 */
export function journalDateInput(instant: string | null): string {
  return instant === null ? '' : inputDateFormat.format(new Date(instant));
}

const minuteFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: JOURNAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * The day and the minute an instant fell on here, as `YYYY-MM-DD HH:mm` on a clock that starts
 * the day at nought — {@link journalDateInput}'s day, with the time beside it.
 *
 * What the spreadsheet's Written column is built from: an Excel date has no zone, so the
 * export writes the wall-clock parts here and nothing else. Assembled from the parts rather than
 * taken whole, because `en-CA` puts a comma between the day and the time, and which punctuation
 * a locale uses is not something to build on.
 */
export function journalMinute(instant: string): string {
  const parts = Object.fromEntries(
    minuteFormat.formatToParts(new Date(instant)).map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

/**
 * Today, here, as `YYYY-MM-DD`.
 *
 * The fourth and last place this app applies the journal zone, and the only one that is not
 * about an instant: the release calendar compares announced *days* against this. The zone is
 * used to learn what day it is and for nothing else — a release date is never run through it,
 * because a publisher's day belongs to no timezone and converting one moves it. See
 * `lib/release.ts`, and **Time** in `docs/data-model.md`, which counts the four.
 *
 * Reuses the `en-CA` formatter above, which already produces exactly this shape.
 */
export function todayHere(): string {
  return inputDateFormat.format(new Date());
}
