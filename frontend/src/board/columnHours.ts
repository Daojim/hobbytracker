import type { HobbyDefinition } from '../hobbies';
import { daysToFinish, describePace, describeSpan, formatPace, type Pace } from '../lib/pace';
import type { LibraryPage, LogStatus } from '../api/types';
import type { Voice } from '../lib/voice';

/**
 * Which titles a header's count is of: the ones with no estimate, or the timed ones without your
 * hours. Named as `ColumnHours` names the lists of them, which is where a count's titles are.
 */
export type LeftOutList = 'withoutLength' | 'withoutPlayed';

/** A piece of a header's line: some words, or a count of the titles a figure leaves out. */
export interface HoursPart {
  text: string;
  /** How it reads aloud: `~1,034 h` is a tilde and a letter. Its text, where that reads. */
  spoken: string;
  /** The list this piece counts, when it is a count. On your board, pressing it opens that list. */
  counts?: LeftOutList;
}

/**
 * One line of a column's header: what it prints, how that reads aloud, and the pieces it is made
 * of, which your board needs because a count on it is something to press.
 */
export interface HoursLine {
  text: string;
  spoken: string;
  parts: HoursPart[];
}

/** A line from its pieces, which are joined by a dot to read and by a comma to hear. */
function lineOf(parts: HoursPart[]): HoursLine {
  return {
    text: parts.map((part) => part.text).join(' · '),
    spoken: parts.map((part) => part.spoken).join(', '),
    parts,
  };
}

/** Words that read aloud as they print, as a count does, and the list it counts if it is one. */
const said = (text: string, counts?: LeftOutList): HoursPart => ({ text, spoken: text, counts });

/**
 * What a column's header says about how long its titles take, as the lines to print. None when
 * there is nothing to say.
 *
 * Every column says how long its titles take: the figure each card prints, added up by the
 * server over the whole column. **Completed instead compares your hours with that**, over the
 * titles that have both, so the two sides are about the same games. It does that only when the
 * hobby's pass records hours at all, which the pass's fields decide rather than the hobby's name,
 * and only when you logged some — nothing to compare is not a comparison of nothing.
 *
 * Whatever a figure leaves out is counted after it. A title with no estimate is not a title that
 * takes no time, so a column where no title has one says nothing rather than "0 h".
 *
 * Playing says how long its games take, like every other column, rather than how much is left.
 * Both were rendered for the user on 1 October 2026; see #3 in `docs/plans/games-board-next.md`.
 *
 * **Backlog adds a second line once it knows your pace**: how long the whole queue would take
 * at it, `about 17 months at 2 h a day`. The pace is what "How long will it take me?" was told in
 * the drawer, handed in rather than read here so this stays a function of what it is given. Picked
 * at the #4 workshop on 2 October 2026. A share is handed none: the pace is the reader's, about
 * their own board.
 *
 * **On a share it addresses nobody**: Completed's comparison is *hours played* rather than *you
 * played*, and the titles it leaves out are *without hours logged*. The rest reads the same.
 *
 * **Each count is a piece of its own that says which list it counts**, so your board can make it
 * a button that opens the titles: #20, picked from renders on 3 November 2026. Where the server
 * named those titles, which is your board, **a count is how many it named**, rather than the
 * figures' difference. A move writes the column's total at once and leaves the hours to the
 * refetch, and a count worked out from both would sit a title away from the list it opens until
 * the answer came. A share and the Stats page are sent no lists, and nothing moves on either.
 */
export function columnHoursLines(
  definition: HobbyDefinition,
  status: LogStatus,
  { total, hours }: Pick<LibraryPage, 'total' | 'hours'>,
  voice: Voice,
  pace: Pace | null = null,
): HoursLine[] {
  const words = definition.columnHours;
  if (words === null) {
    return [];
  }

  const untimed = hours.withoutLength?.length ?? total - hours.lengthTitles;
  const leftOut = untimed > 0 ? [said(words.withoutLength(untimed), 'withoutLength')] : [];

  if (
    status === 'Completed' &&
    definition.journal.fields.hoursPlayed &&
    hours.played !== null &&
    hours.playedLength !== null
  ) {
    const unplayed = hours.withoutPlayed?.length ?? hours.lengthTitles - hours.playedTitles;

    return [
      lineOf([
        {
          text: words.compared(hours.played, hours.playedLength),
          spoken: words.describeCompared[voice](hours.played, hours.playedLength),
        },
      ]),
      // Nothing in this line needs a spoken form of its own: it is counts and words.
      lineOf([
        said(words.over(hours.playedTitles)),
        ...(unplayed > 0 ? [said(words.withoutPlayed[voice](unplayed), 'withoutPlayed')] : []),
        ...leftOut,
      ]),
    ];
  }

  if (hours.length === null) {
    return [];
  }

  const totalLine = lineOf([
    { text: words.total(hours.length), spoken: words.describeTotal(hours.length) },
    ...leftOut,
  ]);

  // The queue you work through, and only that: Playing is half played, so its total at your pace
  // would be a claim about hours you have already spent. All play styles, because that is the
  // figure the line above adds up and the one a card prints.
  if (status !== 'Backlog' || pace === null) {
    return [totalLine];
  }

  const span = describeSpan(daysToFinish(hours.length, pace));
  return [
    totalLine,
    lineOf([
      {
        text: `${span} at ${formatPace(pace)}`,
        spoken: `${span.charAt(0).toUpperCase()}${span.slice(1)} at ${describePace(pace)}`,
      },
    ]),
  ];
}
