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
const JOURNAL_TIME_ZONE = 'America/New_York';

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
  return instant === null ? null : dateFormat.format(new Date(instant));
}

/** The day and time an instant falls on here. */
export function formatJournalDateTime(instant: string | null): string | null {
  return instant === null ? null : dateTimeFormat.format(new Date(instant));
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
