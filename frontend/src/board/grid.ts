/**
 * The board's grid, spelled once for the two things laid out on it.
 *
 * The columns and the release calendar under them are separate grids — the calendar sits outside
 * the DndContext and outside `data-board` on purpose, see BoardPage — so the only way the
 * calendar's edge can land on a column's edge is for both to be built from the same tracks and
 * the same gap. It used to be computed instead, as `50% - g/2` with the three gap values repeated
 * by hand in ComingSoon: right for four columns, and for nothing else.
 *
 * **Whole class names throughout, never `xl:grid-cols-${n}`.** Tailwind scans source text, so an
 * interpolated class generates nothing and the board collapses to one column with no error —
 * the `ratingTone` rule, for the `ratingTone` reason.
 */

/** The space between columns, which the calendar's grid has to share to share their lines. */
export const BOARD_GAP = 'gap-4 2xl:gap-5 3xl:gap-6';

/**
 * Whether the columns sit side by side, which they do from Tailwind's `md` — the line every
 * `md:` class in this file answers to. Below it a phone shows one column at a time, chosen from
 * the switcher above the board.
 *
 * **A media query React reads, not only a class the browser does**, because a column that is
 * not shown must not be a drop target either, and CSS cannot see to that. dnd-kit measures a
 * `display: none` column as an empty box in the page's top-left corner, and `closestCorners` will
 * hand a card carried up near it to that box: a move into a column nobody can see. So a column
 * that is not shown is not mounted. `grid.test.ts` reads the number out of Tailwind, so the two
 * copies cannot disagree about where a phone ends.
 */
export const SIDE_BY_SIDE = '(min-width: 48rem)';

/**
 * How many tracks the board is laid out in, keyed on how many columns it is showing.
 *
 * Two across from 768px, because four at 768 left each column 168px — about 32px of title once
 * the well, the card and the cover were paid for. From 1280px, every column across: four is the
 * board as it was designed, and five puts each at about 233px there, which the cover's own clamp
 * (`--cover` in index.css) is what keeps readable. Fewer than four simply fills the width; the
 * cover is capped at 5rem, so a wide column gives the title more room rather than a bigger box.
 */
const TRACKS: Readonly<Record<number, string>> = {
  1: '',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 xl:grid-cols-3',
  4: 'md:grid-cols-2 xl:grid-cols-4',
  5: 'md:grid-cols-2 xl:grid-cols-5',
};

export function boardTracks(columns: number): string {
  return TRACKS[columns] ?? TRACKS[5]!;
}

/**
 * Two of the board's tracks, for the calendar under it: its right edge on the grid line under
 * the second column rather than near it. A calendar row answers "how far off is it" on one line,
 * and at the board's full width the date ends up a foot from the name it belongs to.
 *
 * Nothing below `md`, where the grid is one track and two would invent a second; and nothing on a
 * board showing a single column, for the same reason at every width.
 */
export function calendarSpan(columns: number): string {
  return columns >= 2 ? 'md:col-span-2' : '';
}
