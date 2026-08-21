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
