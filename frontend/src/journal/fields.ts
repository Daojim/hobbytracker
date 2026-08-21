import { journalDateInput } from '../lib/time';

/**
 * The two form fields whose rules are worth stating away from the markup.
 */

/** Mirrors RatingAttribute on the server, word for word, so both sides say the same thing. */
export const RATING_RULE = 'Rating must be between 1.0 and 10.0, with at most one decimal place.';

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
