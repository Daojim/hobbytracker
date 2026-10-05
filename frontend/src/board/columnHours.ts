import type { HobbyDefinition } from '../hobbies';
import { daysToFinish, describePace, describeSpan, formatPace, type Pace } from '../lib/pace';
import type { LibraryPage, LogStatus } from '../api/types';
import type { Voice } from '../lib/voice';

/** One line of a column's header: what it prints, and how that reads aloud. */
export interface HoursLine {
  text: string;
  spoken: string;
}

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

  const untimed = total - hours.lengthTitles;
  const leftOut = untimed > 0 ? [words.withoutLength(untimed)] : [];

  if (
    status === 'Completed' &&
    definition.journal.fields.hoursPlayed &&
    hours.played !== null &&
    hours.playedLength !== null
  ) {
    const unplayed = hours.lengthTitles - hours.playedTitles;
    const over = [
      words.over(hours.playedTitles),
      ...(unplayed > 0 ? [words.withoutPlayed[voice](unplayed)] : []),
      ...leftOut,
    ];

    return [
      {
        text: words.compared(hours.played, hours.playedLength),
        spoken: words.describeCompared[voice](hours.played, hours.playedLength),
      },
      // Nothing in this line needs a spoken form of its own: it is counts and words.
      { text: over.join(' · '), spoken: over.join(', ') },
    ];
  }

  if (hours.length === null) {
    return [];
  }

  const totalLine = {
    text: [words.total(hours.length), ...leftOut].join(' · '),
    spoken: [words.describeTotal(hours.length), ...leftOut].join(', '),
  };

  // The queue you work through, and only that: Playing is half played, so its total at your pace
  // would be a claim about hours you have already spent. All play styles, because that is the
  // figure the line above adds up and the one a card prints.
  if (status !== 'Backlog' || pace === null) {
    return [totalLine];
  }

  const span = describeSpan(daysToFinish(hours.length, pace));
  return [
    totalLine,
    {
      text: `${span} at ${formatPace(pace)}`,
      spoken: `${span.charAt(0).toUpperCase()}${span.slice(1)} at ${describePace(pace)}`,
    },
  ];
}
