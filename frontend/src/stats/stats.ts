import type { BacklogTitle, Completion, Finish } from '../api/types';
import { daysBetween, type Day } from '../lib/release';
import { journalDateInput, journalMonth, journalYear, todayHere } from '../lib/time';

/**
 * The Stats page's arithmetic, and the words that come straight out of it.
 *
 * The server sends facts — every finish, as instants — and this is where they are counted, filed
 * under months and read as percentages. Pure functions of what they are given, so each rule has a
 * test that can be read on its own.
 */

/** How your hours compare with an estimate, every way the page says it. */
export interface Against {
  /** The size of the difference, in whole percent. */
  percent: number;
  direction: 'quicker' | 'longer' | 'same';
  /** `4% longer`, `18% quicker`, or `The same`. */
  words: string;
  /** What a bar is labelled with: `+23%`, `−18%`, `0%`. */
  signed: string;
}

/** A finish with both figures, which is what a comparison is made of. */
export type TimedFinish = Finish & { hoursPlayed: number; lengthHours: number };

/**
 * Hours as whole hundredths, the unit both figures are stored in.
 *
 * `lib/pace.ts`'s reason: in floating point 2.01 ÷ 2 is 1.0049999999999999, so half a percent
 * comes out a hair under and rounds the wrong way. Every figure arrives with at most two places,
 * so in hundredths it is a whole number and the arithmetic is exact.
 */
const hundredths = (hours: number) => Math.round(hours * 100);

/**
 * The share of what was started that was finished, in whole percent — or null when nothing was
 * started, which has no share at all. Nought would say you finished none of it.
 */
export function completionPercent({ finished, going, dropped }: Completion): number | null {
  const started = finished + going + dropped;
  return started === 0 ? null : Math.round((finished * 100) / started);
}

/**
 * Your hours against an estimate.
 *
 * The size is rounded and then given its direction, so 4.5% reads as 5% whichever way it went:
 * `Math.round` takes -4.5 to -4 and 4.5 to 5. Under half a percent either way is the same, rather
 * than "0% longer".
 */
export function againstEstimate(played: number, length: number): Against {
  const yours = hundredths(played);
  const theirs = hundredths(length);
  const difference = yours - theirs;
  const percent = Math.round((Math.abs(difference) * 100) / theirs);

  if (percent === 0) {
    return { percent, direction: 'same', words: 'The same', signed: '0%' };
  }

  const direction = difference < 0 ? 'quicker' : 'longer';
  return {
    percent,
    direction,
    words: `${percent}% ${direction}`,
    // A true minus sign, which is the width of the plus beside it.
    signed: `${difference < 0 ? '−' : '+'}${percent}%`,
  };
}

/**
 * The finishes that have both your hours and an estimate, quickest against its estimate first —
 * the same finishes the comparison above the chart is over.
 *
 * Ordered on the ratio exactly: two ratios are compared as cross-products of whole hundredths,
 * so 1 of 2 and 2 of 4 tie, and a tie goes by name.
 */
export function timed(finished: Finish[]): TimedFinish[] {
  return finished
    .filter((finish): finish is TimedFinish =>
      finish.hoursPlayed !== null && finish.lengthHours !== null,
    )
    .sort((a, b) => {
      const order =
        hundredths(a.hoursPlayed) * hundredths(b.lengthHours) -
        hundredths(b.hoursPlayed) * hundredths(a.lengthHours);

      return order !== 0 ? order : a.title.localeCompare(b.title);
    });
}

/**
 * A year's finishes by the month here they were finished in: twelve lists, January first, each in
 * the order the server sent, which is oldest first.
 */
export function byMonth(finished: Finish[]): Finish[][] {
  const months: Finish[][] = Array.from({ length: 12 }, () => []);

  for (const finish of finished) {
    if (finish.completedAt !== null) {
      months[journalMonth(finish.completedAt) - 1]!.push(finish);
    }
  }

  return months;
}

/**
 * Every finish by the year here it was finished in, oldest year first, and the ones finished with
 * their date cleared after all of them — what the page shows under All years in place of months.
 */
export function byYear(finished: Finish[]): { year: number | null; finishes: Finish[] }[] {
  const years = new Map<number | null, Finish[]>();

  for (const finish of finished) {
    const year = finish.completedAt === null ? null : journalYear(finish.completedAt);
    years.set(year, [...(years.get(year) ?? []), finish]);
  }

  return [...years.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a - b))
    .map(([year, finishes]) => ({ year, finishes }));
}

/**
 * The mean of the ratings there are, to the tenth a rating is given in, with a half rounded up
 * as a reader would. The unrated are left out rather than counted as nought. Null when nothing is
 * rated. Added in tenths, which are whole, for {@link hundredths}' reason.
 */
export function averageRating(finished: Finish[]): number | null {
  const tenths = finished.flatMap((finish) =>
    finish.rating === null ? [] : [Math.round(finish.rating * 10)],
  );

  if (tenths.length === 0) {
    return null;
  }

  const total = tenths.reduce((sum, rating) => sum + rating, 0);
  return Math.round(total / tenths.length) / 10;
}

/** How many ratings fall at each whole point, 1 to 10: a 9.9 is a 9, and a 10 is its own. */
export function ratingCounts(finished: Finish[]): number[] {
  const counts = Array.from({ length: 10 }, () => 0);

  for (const finish of finished) {
    if (finish.rating !== null) {
      const point = Math.floor(Math.round(finish.rating * 10) / 10);
      counts[point - 1] = (counts[point - 1] ?? 0) + 1;
    }
  }

  return counts;
}

/**
 * How long a title has waited, in the days here.
 *
 * "In your backlog" when the column history says when it arrived. "Added" when all there is to go
 * on is the day the pass was made, which for a title moved since is earlier than its wait began —
 * so the page claims only what it knows.
 */
export function waited(title: BacklogTitle, today: Day = todayHere()): string {
  const since = title.inBacklogSince ?? title.loggedAt;
  const days = daysBetween(journalDateInput(since), today) ?? 0;
  const span = `${days} ${days === 1 ? 'day' : 'days'}`;

  if (title.inBacklogSince !== null) {
    return days === 0 ? 'in your backlog since today' : `in your backlog ${span}`;
  }

  return days === 0 ? 'added today' : `added ${span} ago`;
}
