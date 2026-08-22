/**
 * How long something took, for reading rather than editing.
 *
 * Lives here rather than beside parseHours in journal/fields.ts because two unrelated places
 * read a duration and only one of them is a form: the drawer prints what a pass took, and a
 * board card prints HowLongToBeat's estimate. Reaching into journal/ from board/ to format a
 * number would be a dependency pointing the wrong way for no reason.
 *
 * Trailing noughts are dropped because the column's two decimal places are there for 12.25, not
 * to make every whole number claim a precision nobody entered.
 */
export function formatHours(hours: number | null): string | null {
  return hours === null ? null : `${Number(hours.toFixed(2))} h`;
}
