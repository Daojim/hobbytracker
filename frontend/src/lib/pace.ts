import { useMemo } from 'react';
import { preferenceStore } from './preferenceStore';
import type { LogStatus } from '../api/types';

/**
 * How much you play, and what that says about how long something will take you.
 *
 * What "How long will it take me?" answers from, in the journal drawer, and what the Backlog
 * column's second line reads — so it lives in `lib/` rather than `journal/`, for `lib/hours.ts`'s
 * reason: `board/` should not reach into `journal/` for it. The question and its look were picked
 * at the #4 workshop on 2 October 2026; see `docs/plans/games-board-next.md`.
 *
 * **The arithmetic is done in hundredths of an hour**, the unit HowLongToBeat's figures and your
 * hours played are both stored at. In floating point, 2.1 hours left at 0.7 a day is
 * 3.0000000000000004 days, and rounding that up promises a fourth day nobody needs. Whole
 * hundredths divide exactly.
 *
 * **Days are counted from tomorrow**: a finish is today plus the days it takes. An evening's play
 * already in your hours is not counted twice, and the answer never promises a day early.
 */

export type Per = 'day' | 'week';

/** How much you play: hours a day, or hours a week. */
export interface Pace {
  hours: number;
  per: Per;
}

/**
 * What the question was told: how much you play, and which of HowLongToBeat's tiers you play to,
 * by the figure's field name (`HltbTier.key`). Either can be unsaid.
 */
export interface Said {
  pace: Pace | null;
  style: string | null;
}

const HUNDREDTHS = 100;

const inHundredths = (hours: number) => Math.round(hours * HUNDREDTHS);

/** The most a pace can be: every hour there is. */
const MOST: Record<Per, number> = { day: 24, week: 168 };

/** How many hours of a figure are left, never fewer than none. */
export function hoursLeft(figure: number, played: number | null): number {
  return Math.max(inHundredths(figure) - inHundredths(played ?? 0), 0) / HUNDREDTHS;
}

/**
 * Whole days to play what is left at a pace, a part-day rounded up to the day it finishes on.
 *
 * A week's pace is a seventh of it a day, which in whole numbers is the hours left times seven,
 * over the hours a week.
 */
export function daysToFinish(left: number, pace: Pace): number {
  const hundredths = inHundredths(left);
  const perDay = inHundredths(pace.hours);

  return pace.per === 'day'
    ? Math.ceil(hundredths / perDay)
    : Math.ceil((hundredths * 7) / perDay);
}

/** How much a day, or a week, finishes what is left in this many days. */
export function hoursNeeded(left: number, days: number, per: Per): number {
  const daily = left / days;
  return per === 'day' ? daily : daily * 7;
}

/** The release calendar's month and year, which `describeDistance` counts in too. */
const DAYS_A_MONTH = 30.44;
const DAYS_A_YEAR = 365.25;

/**
 * A number of days as a person says it: days under 45, then months, then years to the half.
 *
 * The release calendar's ladder, with two differences. Months start at two, because 45 days is a
 * month and a half and "about 1 month" undersells it — the calendar's own `describeDistance`
 * answers "in 1 months" at exactly 45. And years go to the half, because a backlog is the one
 * place years come up and "about 2 years" for two and a half is a year's difference.
 */
export function describeSpan(days: number, more = false): string {
  const still = more ? 'more ' : '';

  if (days < 45) {
    return `${days} ${still}${days === 1 ? 'day' : 'days'}`;
  }

  const months = Math.max(2, Math.round(days / DAYS_A_MONTH));
  if (months < 18) {
    return `about ${months} ${still}months`;
  }

  return `about ${Math.round((days / DAYS_A_YEAR) * 2) / 2} ${still}years`;
}

/**
 * An amount of play: minutes under an hour, rounded to the minute and never nought, otherwise
 * hours to so many places. Rounded to the minute *first*, so 0.999 of an hour is an hour rather
 * than "60 min".
 */
function amount(hours: number, places: number): string {
  const minutes = Math.round(hours * 60);
  return minutes < 60 ? `${Math.max(minutes, 1)} min` : `${Number(hours.toFixed(places))} h`;
}

/** Your pace as you would say it: `2 h a day`, `30 min a day`, `1.25 h a day`. */
export function formatPace(pace: Pace): string {
  return `${amount(pace.hours, 2)} a ${pace.per}`;
}

/** Your pace aloud, which a lone `h` cannot be: `2 hours a day`, `30 minutes a day`. */
export function describePace(pace: Pace): string {
  const minutes = Math.round(pace.hours * 60);

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} a ${pace.per}`;
  }

  const hours = Number(pace.hours.toFixed(2));
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} a ${pace.per}`;
}

/**
 * What finishing by a date asks of you: `18 min a day`, `1.2 h a day`.
 *
 * To the tenth rather than your pace's hundredth, because this is worked out rather than said,
 * and 1.16 hours a day claims an accuracy the estimate under it does not have.
 */
export function formatNeeded(hours: number, per: Per): string {
  return `${amount(hours, 1)} a ${per}`;
}

/**
 * Whether a pass in this column still has a finish ahead of it, which is when it is worth asking
 * how long that will take. Picked at the workshop: a Completed or Dropped pass has nothing left
 * to finish. A status rather than a hobby, so it holds for every board.
 */
export function hasFinishAhead(status: LogStatus): boolean {
  return status === 'Backlog' || status === 'InProgress' || status === 'OnHold';
}

const hoursRule = (per: Per) =>
  `More than 0 and at most ${MOST[per]} hours a ${per}, with at most two decimal places.`;

/**
 * A pace typed into the box behind *Other…*.
 *
 * Read off the text as `parseHours` reads hours played, and to the same two places, which is also
 * what keeps a pace from rounding to no hundredths at all and dividing by nothing.
 */
export function parsePaceInput(
  text: string,
  per: Per,
): { value: Pace; error?: undefined } | { value?: undefined; error: string } {
  const trimmed = text.trim();
  const hours = Number(trimmed);

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed) || hours <= 0 || hours > MOST[per]) {
    return { error: hoursRule(per) };
  }

  return { value: { hours, per } };
}

const PREFIX = 'hobbytracker.pace.';

/**
 * Per board and per browser, beside `hobbytracker.hidden-columns.<hobby>`. Per board because the
 * pace is how much you *play*, and an evening of anime is not an evening of games; nothing asks
 * any other board yet, and nothing has to change when one does.
 */
export const paceKey = (hobby: string) => `${PREFIX}${hobby}`;

const NOTHING_SAID: Said = { pace: null, style: null };

/**
 * What storage says was said, trusting none of it: storage outlives the code that wrote it, so
 * anything unrecognised is something not said yet — the theme's rule, for the theme's reason.
 * The pace and the style are read apart, so a style that cannot be read leaves the pace standing.
 */
export function parsePace(stored: string | null): Said {
  if (stored === null) {
    return NOTHING_SAID;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return NOTHING_SAID;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return NOTHING_SAID;
  }

  const { hours, per, style } = parsed as Record<string, unknown>;
  const pace =
    isPer(per) && typeof hours === 'number' && inHundredths(hours) >= 1 && hours <= MOST[per]
      ? { hours, per }
      : null;

  return { pace, style: typeof style === 'string' ? style : null };
}

const isPer = (value: unknown): value is Per => value === 'day' || value === 'week';

const store = preferenceStore(PREFIX);

/** What this board's question was told, kept current as it is told again, here or in another tab. */
export function usePace(hobby: string): Said {
  // Parsed after, from the raw string: a fresh object per read would re-render for ever.
  const stored = store.useValue(paceKey(hobby));
  return useMemo(() => parsePace(stored), [stored]);
}

function keep(hobby: string, said: Said): void {
  store.write(
    paceKey(hobby),
    JSON.stringify({ ...said.pace, ...(said.style === null ? {} : { style: said.style }) }),
  );
}

/** Remembers how much you play on a board, leaving the way you play alone. */
export function setPace(hobby: string, pace: Pace): void {
  keep(hobby, { ...parsePace(store.read(paceKey(hobby))), pace });
}

/** Remembers which of HowLongToBeat's tiers you play to, leaving your pace alone. */
export function setPlayStyle(hobby: string, style: string): void {
  keep(hobby, { ...parsePace(store.read(paceKey(hobby))), style });
}
