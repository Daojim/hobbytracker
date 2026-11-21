import type { Finish } from '../api/types';
import type { OpenFrom } from '../journal/useJournal';
import { todayHere } from '../lib/time';
import { byMonth, byYear, noMonth } from './stats';
import { Nothing } from './Section';

/**
 * A cover's id, which the keyboard goes back to when the journal it opened closes. By the game and
 * which of its finishes this is, since a game finished twice in a year is two covers.
 */
export const finishCoverId = (mediaId: number, nth: number) => `stats-cover-${mediaId}-${nth}`;

/** Each finish's cover id, counting a game's finishes in the order the server sent them. */
function coverIds(finished: Finish[]): Map<Finish, string> {
  const seen = new Map<number, number>();
  return new Map(
    finished.map((finish) => {
      const nth = seen.get(finish.mediaId) ?? 0;
      seen.set(finish.mediaId, nth + 1);
      return [finish, finishCoverId(finish.mediaId, nth)];
    }),
  );
}

/**
 * What a cover does under the pointer and the keyboard, once it opens a journal (#25): a ring in
 * the accent, 2px off the cover, the user's pick from renders over the pointer alone and a lift.
 * The keyboard's ring is the same one, which is the page's own: its chart rows wear it.
 */
const OPENS =
  'block cursor-pointer rounded hover:outline-2 hover:outline-offset-2 hover:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

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

interface Group {
  key: string;
  /** What is printed under the stack: `Mar`, or the year for its finishes with no month. */
  label: string;
  /** What the stack is called aloud: `March`, or `2024, no month`. */
  name: string;
  finishes: Finish[];
  /** A month still to come this year, which a phone leaves out. */
  ahead: boolean;
  /** The year's finishes kept as a year (#24), set apart from December by a rule. */
  apart: boolean;
  /** Piled four across rather than stacked: the year's group, standing alone. */
  piled: boolean;
}

/**
 * Every finish as its cover, a stack per month — or a row per year under All years, where months
 * would run twelve stacks of every year together. Picked from rendered comparisons on 2 October
 * 2026 over columns of counts: it shows what you played, and the stack's height is still the count.
 *
 * **Every cover, however busy the month.** A month stopped at six and said "+1" until 29 October
 * 2026. A stack starts with the month's first finish, so the cap kept the oldest and hid the
 * newest, and the tile took the very slot the seventh cover fills. Picked from renders of the
 * user's own finishes over four ways of opening the rest: in place, a popover, a dialog and a page.
 *
 * **A year's finishes kept as a year are a group after December** (#24), set apart by a rule and
 * labelled with the year — round three's picks, over a group before January, no rule, and "No
 * month", which took two lines even at 1440 and lifted its stack. On a phone the months are rows,
 * and the group is a row after December with no rule. **A year with no day in it at all is that
 * group alone**, piled four across as a year was under All years, rather than twelve empty months
 * beside it.
 *
 * **One list that reflows rather than two that take turns.** Across on a wide screen, a stack per
 * month with the first finish at the bottom; on a phone, a row per month with the covers in a
 * line. The same elements either way, so a screen reader and a test meet one of each.
 *
 * **On your page each cover opens that game's journal** (#25), under All years too. A share hands
 * no `onOpen`, so its covers stay pictures, as a share never shows a note.
 */
export function FinishedCovers({
  finished,
  year,
  onOpen,
}: {
  finished: Finish[];
  year: number | undefined;
  onOpen?: OpenFrom;
}) {
  if (finished.length === 0) {
    return <Nothing>{year === undefined ? 'Nothing finished yet.' : `Nothing finished in ${year} yet.`}</Nothing>;
  }

  const ids = coverIds(finished);

  if (year === undefined) {
    return <EveryYear finished={finished} ids={ids} onOpen={onOpen} />;
  }

  return (
    <ol className="mt-3 space-y-1.5 sm:flex sm:gap-1.5 sm:space-y-0">
      {groups(finished, year).map((group) => (
        <li
          key={group.key}
          // A month still to come is left off a phone, where it would be a row with nothing in
          // it; across, it keeps the year's twelve in place. Not dimmed with an opacity: the
          // label is text-muted already, which is held at 4.5:1, and fading it takes it under.
          className={`items-center gap-2 sm:flex-1 sm:flex-col-reverse sm:gap-1 ${
            group.ahead ? 'hidden sm:flex' : 'flex'
          } ${group.apart ? 'sm:border-l sm:border-line-soft sm:pl-1.5' : ''}`}
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
            className={
              group.piled
                ? // Four across at most: four w-10 covers and the three gap-1s between them. Rows
                  // fill from the bottom, so the first finish sits where a stack's would.
                  'flex flex-wrap gap-1 sm:min-h-[7.5rem] sm:w-full sm:max-w-43 sm:flex-wrap-reverse sm:content-start sm:justify-center'
                : 'flex flex-wrap gap-1 sm:min-h-[7.5rem] sm:w-full sm:flex-col-reverse sm:flex-nowrap sm:items-center sm:justify-start'
            }
          >
            {group.finishes.map((finish, index) => (
              <li
                key={`${finish.mediaId}-${index}`}
                className={group.piled ? 'sm:w-10' : 'sm:w-full sm:max-w-10'}
              >
                <Cover finish={finish} id={ids.get(finish)!} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/**
 * All years, a row per year at every width, the phone's layout — round three's pick (#24). Piled
 * side by side, ten years made each pile one cover wide and 2025's 28 finishes a tower, the panel
 * 1,755px tall at 1440; a row a year is 660px. **The covers keep the phone's `w-8` at every
 * width**: given a stack's `sm:w-full`, a cover in a row is as wide as the panel, and the renders
 * measured that page 15,764px tall.
 */
function EveryYear({
  finished,
  ids,
  onOpen,
}: {
  finished: Finish[];
  ids: Map<Finish, string>;
  onOpen: OpenFrom | undefined;
}) {
  return (
    <ol className="mt-3 space-y-1.5">
      {byYear(finished).map(({ year, finishes }) => {
        const label = year === null ? 'No date' : String(year);

        return (
          <li key={label} className="flex items-center gap-2">
            <span aria-hidden="true" className="w-10 shrink-0 text-xs text-muted">
              {label}
            </span>
            <ul aria-label={label} className="flex flex-wrap gap-1">
              {finishes.map((finish, index) => (
                <li key={`${finish.mediaId}-${index}`}>
                  <Cover
                    finish={finish}
                    id={ids.get(finish)!}
                    onOpen={onOpen}
                    size="aspect-[5/7] w-8 rounded"
                    wide={false}
                  />
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

function groups(finished: Finish[], year: number): Group[] {
  // Which months are still to come is a question about today here, and only this year has any.
  const [thisYear, thisMonth] = todayHere().split('-').map(Number) as [number, number];

  const months = byMonth(finished);
  const kept = noMonth(finished);

  const own: Group = {
    key: 'no month',
    label: String(year),
    name: `${year}, no month`,
    finishes: kept,
    ahead: false,
    apart: true,
    piled: false,
  };

  // A year with no day in it is its kept finishes alone, piled — no empty months beside them.
  if (kept.length > 0 && months.every((month) => month.length === 0)) {
    return [{ ...own, apart: false, piled: true }];
  }

  const twelve = months.map((finishes, index) => ({
    key: MONTHS[index]!,
    label: MONTHS[index]!.slice(0, 3),
    name: MONTHS[index]!,
    finishes,
    ahead: year > thisYear || (year === thisYear && index + 1 > thisMonth),
    apart: false,
    piled: false,
  }));

  return kept.length === 0 ? twelve : [...twelve, own];
}

/**
 * A finish's cover, named for it; the card's lettered placeholder when there is none. A button
 * round it when it opens a journal, named by the cover inside it, with the tooltip moved onto it.
 * `wide` is whether the button takes a stack's width from `sm` up, as the cover does there.
 */
function Cover({
  finish,
  id,
  onOpen,
  size = 'aspect-[5/7] w-8 rounded sm:w-full',
  wide = true,
}: {
  finish: Finish;
  id: string;
  onOpen: OpenFrom | undefined;
  size?: string;
  wide?: boolean;
}) {
  const tooltip = onOpen === undefined ? finish.title : undefined;

  const face =
    finish.coverUrl === null ? (
      <span
        role="img"
        aria-label={finish.title}
        title={tooltip}
        className={`flex ${size} items-center justify-center bg-sunken text-xs font-semibold text-muted`}
      >
        {finish.title.charAt(0)}
      </span>
    ) : (
      <img
        src={finish.coverUrl}
        alt={finish.title}
        title={tooltip}
        className={`${size} object-cover shadow-card`}
      />
    );

  if (onOpen === undefined) {
    return face;
  }

  return (
    <button
      type="button"
      id={id}
      title={finish.title}
      onClick={() => onOpen(id, finish.mediaId)}
      className={`${OPENS} ${wide ? 'sm:w-full' : ''}`}
    >
      {face}
    </button>
  );
}
