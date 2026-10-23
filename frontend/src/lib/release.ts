import type { ReleasePrecision, ReleaseStatus } from '../api/types';
import { todayHere } from './time';

/**
 * Reading a release window — the calendar's whole vocabulary.
 *
 * **A day here is not an instant, and that distinction is the entire reason this file exists
 * rather than three more exports in `time.ts`.** Everything there takes an absolute moment and
 * asks which day it falls on *here*. A release date is the opposite kind of thing: a publisher
 * announced a calendar day, and it belongs to no timezone at all. Running one through
 * `formatJournalDate` answers with the day before, because `new Date('2026-09-26')` parses as
 * midnight **UTC** and Eastern is behind it.
 *
 * So nothing below ever builds a `Date` from a day string. The parts are read out of the string
 * and the arithmetic is done in UTC, where every day is the same length. The journal zone enters
 * in exactly one place — {@link todayHere}, to learn what day it is — which is the fourth and
 * last place the app applies it. See **Time** in `docs/data-model.md`.
 */

/** A calendar day as the API sends one: `YYYY-MM-DD`. Not an instant. */
export type Day = string;

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** The parts of a day string, or null if it is not one. */
function partsOf(day: Day): { year: number; month: number; date: number } | null {
  const match = DAY_PATTERN.exec(day);

  return match === null
    ? null
    : { year: Number(match[1]), month: Number(match[2]), date: Number(match[3]) };
}

/**
 * A day as a UTC timestamp, purely so two of them can be subtracted.
 *
 * UTC and not the journal zone: this is arithmetic on a count of days, and the moment a
 * daylight-saving boundary falls between two dates a local midnight is 23 or 25 hours away from
 * the next. Both sides go through here, so the offset cancels and the answer is a whole number.
 */
function utcOf(day: Day): number | null {
  const parts = partsOf(day);
  return parts === null ? null : Date.UTC(parts.year, parts.month - 1, parts.date);
}

/** Whole days from one calendar day to another. Negative when the second is in the past. */
export function daysBetween(from: Day, to: Day): number | null {
  const start = utcOf(from);
  const end = utcOf(to);

  return start === null || end === null
    ? null
    : Math.round((end - start) / 86_400_000);
}

/**
 * The day this many days after another — when "How long will it take me?" says you would finish.
 *
 * Here rather than beside the pace arithmetic because it is this file's rule applied once more:
 * the day's parts go into `Date.UTC`, which counts every day as the same length, and come out of
 * the UTC getters, so no zone ever touches the day. `new Date(day)` read back through the journal
 * zone would answer the day before every time, and a local `Date` would lose an hour stepping
 * across 1 November and land on the wrong day.
 */
export function addDays(day: Day, days: number): Day {
  const parts = partsOf(day);
  if (parts === null) {
    return day;
  }

  const then = new Date(Date.UTC(parts.year, parts.month - 1, parts.date + days));

  return [
    then.getUTCFullYear(),
    String(then.getUTCMonth() + 1).padStart(2, '0'),
    String(then.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * A day as a finish date reads: `Oct 9`, with the year only when it is not this one.
 *
 * Not `formatRelease`, which always names the year because a release window is filed by it.
 * A finish date is mostly weeks away, and "Oct 9, 2026" in October 2026 is a year nobody needed
 * telling — until it is January's, which is when it says so.
 */
export function formatDayShort(day: Day, today: Day = todayHere()): string {
  const parts = partsOf(day);
  const now = partsOf(today);
  if (parts === null) {
    return day;
  }

  const short = `${MONTHS[parts.month - 1]} ${parts.date}`;
  return now !== null && now.year === parts.year ? short : `${short}, ${parts.year}`;
}

/**
 * A release window, exactly as precisely as it was announced and never a word more.
 *
 * The precision is what stops this inventing a day. A vague window still arrives as real days:
 * the API sends "Q1 2027" as 1 January to 31 March, and IGDB stated it as the 31st. A formatter
 * reading the date alone would print a day nobody said, and would be wrong by up to a year about
 * which one.
 *
 * Null precision is a title nobody has asked a provider about, which is not the same as one
 * with no date: it reads as released and never reaches the calendar at all.
 */
export function formatRelease(day: Day | null, precision: ReleasePrecision | null): string {
  if (precision === null || precision === 'Unknown' || day === null) {
    return 'TBA';
  }

  const parts = partsOf(day);
  if (parts === null) {
    return 'TBA';
  }

  const month = MONTHS[parts.month - 1];

  switch (precision) {
    case 'Day':
      return `${month} ${parts.date}, ${parts.year}`;
    case 'Month':
      return `${month} ${parts.year}`;
    case 'Quarter':
      return `Q${Math.floor((parts.month - 1) / 3) + 1} ${parts.year}`;
    default:
      return String(parts.year);
  }
}

/**
 * Whether a row counts down to its release, in words and in its bar.
 *
 * **A day, and nothing vaguer.** A window says when it was announced for and nothing finer, so
 * there is nothing to count to. Counted from its first day, *2026* read "295 days ago" in
 * October, with a full bar, and *2027* read "in 2 months" about a whole year. The label already
 * says everything that was announced: the rule
 * {@link formatRelease} keeps, and {@link isRecentRelease} keeps for the badge.
 *
 * **And never for a title that is not coming.** A cancelled title stays on the calendar so you
 * can find out it is dead, and that outranks the date it was once given. Counting to the date
 * said it was still on its way.
 */
export function countsDown(
  precision: ReleasePrecision | null,
  status: ReleaseStatus | null,
): boolean {
  return precision === 'Day' && status !== 'Cancelled';
}

/**
 * How far off a day is, in the units a person would actually say. Only for a row that
 * {@link countsDown}.
 *
 * Vaguer than the date on purpose once it is more than a few weeks out: "in 8 months" is what
 * somebody means, and counting out 243 days implies a precision the announcement rarely has.
 */
export function describeDistance(day: Day, today: Day = todayHere()): string | null {
  const days = daysBetween(today, day);

  if (days === null) {
    return null;
  }

  if (days < 0) {
    const ago = Math.abs(days);
    return ago === 1 ? 'yesterday' : `${ago} days ago`;
  }

  if (days === 0) {
    return 'today';
  }

  if (days === 1) {
    return 'tomorrow';
  }

  if (days < 45) {
    return `in ${days} days`;
  }

  const months = Math.round(days / 30.44);
  return months < 18 ? `in ${months} months` : `in ${Math.round(days / 365.25)} years`;
}

/**
 * How far along the wait is, nought to one, for the bar beside a row that {@link countsDown}.
 *
 * Measured against a fixed horizon rather than against the furthest title in the list. Relative
 * would look better and would make every bar jump whenever anything was added or removed, which
 * is a chart that redraws itself for reasons the reader cannot see.
 *
 * Decoration: the bar is `aria-hidden` and {@link describeDistance} carries the meaning, exactly
 * as a card's genre stripe is decoration beside the genre's name.
 */
export const RELEASE_HORIZON_DAYS = 180;

export function releaseProgress(day: Day | null, today: Day = todayHere()): number | null {
  if (day === null) {
    return null;
  }

  const days = daysBetween(today, day);
  if (days === null) {
    return null;
  }

  const remaining = Math.min(Math.max(days, 0), RELEASE_HORIZON_DAYS);
  return 1 - remaining / RELEASE_HORIZON_DAYS;
}

/**
 * Which heading a title files under.
 *
 * **A title is grouped at the precision it was announced at, not at the precision of the day it
 * happens to carry.** A quarter cannot sit under a month heading and a year cannot sit under a
 * quarter, or the grouping would claim more than the publisher did — which is the same rule
 * {@link formatRelease} follows, applied to the shape of the list rather than to one label. A
 * naive "start of month" grouping gets exactly this wrong.
 *
 * **No heading repeats, and that takes the server's order as well as this.** The server lists a
 * window after every day it could be, the narrowest first among those closing on one day, so a
 * month's days are followed by the quarter that closes with it and the year after that. Each
 * heading's titles therefore arrive together.
 */
export type ReleaseGroup = string;

/**
 * How many months ahead a month or a quarter keeps a heading of its own. Beyond it, a month
 * heading is more precision than the reader needs and more rows of headings than titles, and
 * the year gathers them.
 */
const OWN_HEADING_MONTHS = 12;

export function releaseGroup(
  day: Day | null,
  precision: ReleasePrecision | null,
  today: Day = todayHere(),
): ReleaseGroup {
  if (precision === null || precision === 'Unknown' || day === null) {
    return 'no-date';
  }

  const parts = partsOf(day);
  const now = partsOf(today);

  if (parts === null || now === null) {
    return 'no-date';
  }

  const monthsAway = (month: number) => (parts.year - now.year) * 12 + (month - now.month);

  // Announced only as a year: the year is as fine as the heading may go.
  if (precision === 'Year') {
    return String(parts.year);
  }

  // A quarter heads itself while the month it closes on still has a heading of its own, so
  // "Q1 2027" comes straight after March's. Filed under its year, it sat between March and April
  // under a second "2027". Further out it joins its year, with the months it covers.
  if (precision === 'Quarter') {
    const quarter = Math.floor((parts.month - 1) / 3) + 1;

    return monthsAway(quarter * 3) < OWN_HEADING_MONTHS
      ? `${parts.year}-Q${quarter}`
      : String(parts.year);
  }

  if (parts.year === now.year && parts.month === now.month) {
    return 'this-month';
  }

  return monthsAway(parts.month) < OWN_HEADING_MONTHS
    ? `${parts.year}-${String(parts.month).padStart(2, '0')}`
    : String(parts.year);
}

/** What a group's heading reads, given the key {@link releaseGroup} answered with. */
export function formatGroup(group: ReleaseGroup, noDateLabel: string): string {
  if (group === 'no-date') {
    return noDateLabel;
  }

  if (group === 'this-month') {
    return 'This month';
  }

  // Read as the label under it reads, so a quarter's heading and its titles say the same thing.
  const quarter = /^(\d{4})-Q([1-4])$/.exec(group);
  if (quarter !== null) {
    return `Q${quarter[2]} ${quarter[1]}`;
  }

  const match = /^(\d{4})-(\d{2})$/.exec(group);
  return match === null ? group : `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

/**
 * The one thing a date cannot say for itself.
 *
 * Most statuses are either invisible on the calendar — a title IGDB calls released is not on it —
 * or say nothing a reader needs. Cancelled is the exception and the reason the column is shown at
 * all: a title that is never coming would otherwise sit among the undated ones looking merely
 * patient.
 */
export function releaseNote(status: ReleaseStatus | null): string | null {
  return status === 'Cancelled' ? 'Cancelled' : null;
}

/** How long a title counts as newly out. Long enough to be seen, short enough to mean something. */
export const NEWLY_OUT_DAYS = 14;

/**
 * Whether a title came out recently enough to say so on its card.
 *
 * **Day precision only.** A title announced for "Q1 2027" reaches Backlog on 1 April having come
 * out on a day nobody named, and calling it new would be announcing one — the same rule
 * {@link formatRelease} keeps, applied to a badge, and {@link countsDown} applied to the calendar.
 * A vaguer window is never new; it simply arrives.
 */
export function isRecentRelease(
  day: Day | null,
  precision: ReleasePrecision | null,
  today: Day = todayHere(),
): boolean {
  if (day === null || precision !== 'Day') {
    return false;
  }

  const days = daysBetween(day, today);
  return days !== null && days >= 0 && days <= NEWLY_OUT_DAYS;
}
