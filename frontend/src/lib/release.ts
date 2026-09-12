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
 * A release window, exactly as precisely as it was announced and never a word more.
 *
 * The precision is what stops this inventing a day. IGDB states "Q1 2027" as a date like any
 * other — as 31 March, the last day of the window — so a formatter reading the date alone would
 * print a day nobody said, and would be wrong by up to a year about which one.
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
 * How far off it is, in the units a person would actually say.
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
 * How far along the wait is, nought to one, for the bar beside a row.
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
 */
export type ReleaseGroup = string;

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

  // Announced only as a quarter or a year: the year is as fine as the heading may go.
  if (precision === 'Quarter' || precision === 'Year') {
    return String(parts.year);
  }

  if (parts.year === now.year && parts.month === now.month) {
    return 'this-month';
  }

  // Beyond a year out, a month heading is more precision than the reader needs and more rows of
  // headings than titles. The year gathers them.
  const monthsAway = (parts.year - now.year) * 12 + (parts.month - now.month);
  return monthsAway < 12
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
 * **Day precision only.** A title announced for "Q1 2027" carries 31 March, and calling it new
 * on 1 April would be announcing a day nobody said — the same rule {@link formatRelease} keeps,
 * applied to a badge. A vaguer window is never new; it simply arrives.
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
