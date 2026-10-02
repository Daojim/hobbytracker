import type { HobbyDefinition } from '../hobbies';
import type { LibraryPage, LogStatus } from '../api/types';

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
 */
export function columnHoursLines(
  definition: HobbyDefinition,
  status: LogStatus,
  { total, hours }: Pick<LibraryPage, 'total' | 'hours'>,
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
      ...(unplayed > 0 ? [words.withoutPlayed(unplayed)] : []),
      ...leftOut,
    ];

    return [
      {
        text: words.compared(hours.played, hours.playedLength),
        spoken: words.describeCompared(hours.played, hours.playedLength),
      },
      // Nothing in this line needs a spoken form of its own: it is counts and words.
      { text: over.join(' · '), spoken: over.join(', ') },
    ];
  }

  if (hours.length === null) {
    return [];
  }

  return [
    {
      text: [words.total(hours.length), ...leftOut].join(' · '),
      spoken: [words.describeTotal(hours.length), ...leftOut].join(', '),
    },
  ];
}
