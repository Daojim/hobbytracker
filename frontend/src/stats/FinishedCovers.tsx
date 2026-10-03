import type { Finish } from '../api/types';
import { todayHere } from '../lib/time';
import { byMonth, byYear } from './stats';
import { Nothing } from './Section';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * How many covers a month shows before it says how many more. Six stacks about as tall as the
 * ratings chart beside it at desktop widths, and a busy month would otherwise make the panel as
 * tall as the month was busy.
 */
const STACK = 6;

interface Group {
  key: string;
  /** What is printed under the stack: `Mar`, or a year. */
  label: string;
  /** What the stack is called aloud: `March`, or a year. */
  name: string;
  finishes: Finish[];
  /** A month still to come this year, which a phone leaves out. */
  ahead: boolean;
}

/**
 * Every finish as its cover, a stack per month — or per year under All years, where months would
 * run twelve stacks of every year together. Picked from rendered comparisons on 2 October 2026
 * over columns of counts: it shows what you played, and the stack's height is still the count.
 *
 * **One list that reflows rather than two that take turns.** Across on a wide screen, a stack per
 * month with the first finish at the bottom; on a phone, a row per month with the covers in a
 * line. The same elements either way, so a screen reader and a test meet one of each.
 */
export function FinishedCovers({ finished, year }: { finished: Finish[]; year: number | undefined }) {
  if (finished.length === 0) {
    return <Nothing>{year === undefined ? 'Nothing finished yet.' : `Nothing finished in ${year} yet.`}</Nothing>;
  }

  return (
    <ol className="mt-3 space-y-1.5 sm:flex sm:gap-1.5 sm:space-y-0">
      {groups(finished, year).map((group) => {
        const shown = group.finishes.slice(0, STACK);
        const more = group.finishes.length - shown.length;

        return (
          <li
            key={group.key}
            // A month still to come is left off a phone, where it would be a row with nothing in
            // it; across, it keeps the year's twelve in place. Not dimmed with an opacity: the
            // label is text-muted already, which is held at 4.5:1, and fading it takes it under.
            className={`items-center gap-2 sm:flex-1 sm:flex-col-reverse sm:gap-1 ${
              group.ahead ? 'hidden sm:flex' : 'flex'
            }`}
          >
            {/* Named on the list below rather than read twice. */}
            <span
              aria-hidden="true"
              className="w-10 shrink-0 text-xs text-muted sm:w-auto sm:text-center sm:text-[0.6875rem]"
            >
              {group.label}
            </span>

            <ul
              aria-label={group.name}
              className="flex flex-wrap gap-1 sm:min-h-[7.5rem] sm:w-full sm:flex-col-reverse sm:flex-nowrap sm:items-center sm:justify-start"
            >
              {shown.map((finish, index) => (
                <li key={`${finish.mediaId}-${index}`} className="sm:w-full sm:max-w-10">
                  <Cover finish={finish} />
                </li>
              ))}
              {more > 0 && (
                <li className="flex aspect-[5/7] w-8 items-center justify-center rounded bg-hover text-xs font-medium text-muted sm:w-full sm:max-w-10">
                  <span aria-hidden="true">+{more}</span>
                  <span className="sr-only">and {more} more</span>
                </li>
              )}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

function groups(finished: Finish[], year: number | undefined): Group[] {
  if (year === undefined) {
    return byYear(finished).map(({ year: filed, finishes }) => {
      const label = filed === null ? 'No date' : String(filed);
      return { key: label, label, name: label, finishes, ahead: false };
    });
  }

  // Which months are still to come is a question about today here, and only this year has any.
  const [thisYear, thisMonth] = todayHere().split('-').map(Number) as [number, number];

  return byMonth(finished).map((finishes, index) => ({
    key: MONTHS[index]!,
    label: MONTHS[index]!.slice(0, 3),
    name: MONTHS[index]!,
    finishes,
    ahead: year > thisYear || (year === thisYear && index + 1 > thisMonth),
  }));
}

/** A finish's cover, named for it; the card's lettered placeholder when there is none. */
function Cover({ finish }: { finish: Finish }) {
  const size = 'aspect-[5/7] w-8 rounded sm:w-full';

  return finish.coverUrl === null ? (
    <span
      role="img"
      aria-label={finish.title}
      title={finish.title}
      className={`flex ${size} items-center justify-center bg-sunken text-xs font-semibold text-muted`}
    >
      {finish.title.charAt(0)}
    </span>
  ) : (
    <img
      src={finish.coverUrl}
      alt={finish.title}
      title={finish.title}
      className={`${size} object-cover shadow-card`}
    />
  );
}
