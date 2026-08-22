import { journalDateInput } from '../lib/time';
import type { LogEntry } from '../api/types';

/**
 * The two form fields whose rules are worth stating away from the markup.
 */

/** Mirrors RatingAttribute on the server, word for word, so both sides say the same thing. */
export const RATING_RULE = 'Rating must be between 1.0 and 10.0, with at most one decimal place.';


/**
 * Where the slider's handle rests when nothing has been rated.
 *
 * A range input has no empty state — it always holds a number — so "not rated" is carried by the
 * text box being blank and by the slider's aria-valuetext, not by the handle's position. It sits
 * at the bottom of the scale rather than the middle because a handle in the middle reads as a
 * deliberate 5.5.
 */
export const UNRATED_THUMB = 1;

export type ParsedRating =
  | { value: number | null; error?: undefined }
  | { value?: undefined; error: string };

/**
 * Reads the rating box.
 *
 * Tested against the input text rather than the parsed number on purpose: `8.75 * 10` is not
 * exactly `87.5` in binary floating point, so counting decimal places arithmetically is a way to
 * accept the one value this rule exists to reject. The column is `numeric(3,1)` and Postgres
 * *rounds* rather than refusing, so an accepted 8.75 would be stored as 8.8 and reported back as
 * a rating the database does not hold.
 */
export function parseRating(input: string): ParsedRating {
  const trimmed = input.trim();

  // Empty is "not rated yet", which is always allowed. It is not zero.
  if (trimmed === '') {
    return { value: null };
  }

  if (!/^\d+(\.\d)?$/.test(trimmed)) {
    return { error: RATING_RULE };
  }

  const value = Number(trimmed);
  return value >= 1 && value <= 10 ? { value } : { error: RATING_RULE };
}


/** Mirrors PlaytimeHoursAttribute on the server, so both sides refuse the same numbers. */
export const HOURS_RULE =
  'Hours played must be greater than 0 and at most 999.99, with at most two decimal places.';

/**
 * Reads the hours box.
 *
 * Tested against the text for the same reason as {@link parseRating}, one decimal place further
 * out: the column is numeric(5,2) and Postgres rounds rather than refusing, so a 12.345 counted
 * arithmetically would be accepted and then stored as something else. The ceiling is a separate
 * failure — overflowing numeric(5,2) throws rather than rounding.
 */
export function parseHours(input: string): ParsedRating {
  const trimmed = input.trim();

  // Empty is "not recorded", and is how a number already written down is taken back. Not nought:
  // nought hours played is not a fact about anything.
  if (trimmed === '') {
    return { value: null };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { error: HOURS_RULE };
  }

  const value = Number(trimmed);
  return value > 0 && value <= 999.99 ? { value } : { error: HOURS_RULE };
}

/**
 * How long something took, for reading rather than editing.
 *
 * Trailing noughts are dropped because the column's two decimal places are there for 12.25, not
 * to make every whole number claim a precision nobody entered.
 */
export function formatHours(hours: number | null): string | null {
  return hours === null ? null : `${Number(hours.toFixed(2))} h`;
}
/**
 * What to send for a date field.
 *
 * A date input shows a day, but the column holds an instant. Re-deriving the value from the day
 * on screen would move a 21:30 start to midnight — silent data loss on a save the user made
 * about something else entirely. So an untouched field goes back exactly as it came, and only an
 * edited one is sent as a bare date, which the server reads as that wall-clock moment here.
 */
export function dateFieldValue(input: string, original: string | null): string | null {
  if (input === journalDateInput(original)) {
    return original;
  }

  return input === '' ? null : input;
}

/**
 * What a form seeded from this entry would be holding — its id, and the four values the inputs
 * are filled from.
 *
 * Used as the form's React key. `useState` reads its initial value once, and a transition
 * *edits the current entry in place* rather than adding one, so keying on the id alone left a
 * game just dragged to Playing showing an empty Started when you reopened it. The id is still
 * in there so that opening a different pass with identical values is still a fresh form.
 *
 * The cost is that a refetch landing mid-edit discards what was typed. It can only land after a
 * save of your own, or after a drag — and the drawer covers the board while it is open.
 */
export function entrySeed(entry: LogEntry): string {
  return [
    entry.id,
    entry.rating,
    entry.platform,
    entry.hoursPlayed,
    entry.startedAt,
    entry.completedAt,
  ]
    .join('|');
}
