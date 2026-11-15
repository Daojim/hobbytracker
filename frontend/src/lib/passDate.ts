import { formatJournalDate, todayHere } from './time';

/**
 * A pass's date, which is a day or, since #24, a year: a game finished long ago that somebody
 * remembers by the year, kept as the year it is and never as a day nobody named.
 *
 * **A kept year never goes through `lib/time.ts`.** It was never an instant, so it belongs to no
 * zone: 2019 is 2019 wherever it is read. What does meet the zone is *this* year, which is the
 * year of today here — `todayHere()`, the release calendar's idea of today, so this adds no place
 * where the zone is applied. Everything that reads a pass's date whichever kind it is lives here,
 * so the board, the journal, the Stats page and the add's question say a year the same way.
 */

/**
 * A pass's date as a card prints it: the day it was here, `Dec 31, 2025`, or a year it keeps,
 * alone — `2019`, as the release calendar prints a year, round three's pick. Null with neither.
 *
 * Handed the pair rather than one of them, so a reader that forgot the year prints nothing rather
 * than a day nobody named: the instant is null wherever the date is kept as a year.
 */
export function formatPassDate(instant: string | null, year: number | null): string | null {
  return formatJournalDate(instant) ?? (year === null ? null : String(year));
}

/**
 * A pass's date where it runs on from a word: a day as it is, `Completed Nov 2, 2024`, and a year
 * with *in*, `Completed in 2019` — round three's pick, over a bare year, which read as a label. Null
 * with neither. Where the sentence already has its word, *from* or *on*, the day's own form follows
 * it: see {@link formatPassDate}, and `finishQuestion`.
 */
export function passDateAfterWord(instant: string | null, year: number | null): string | null {
  return formatJournalDate(instant) ?? (year === null ? null : `in ${year}`);
}

/**
 * The earliest year a box takes: picked at the #24 build, because it refuses only a typo, for
 * anybody alive, on every board. The server's `LogEntryRules.FirstYear` and
 * `ck_log_entries_years_range` hold the same floor.
 */
export const FIRST_YEAR = 1900;

/**
 * What a year box says when it cannot take what is in it: text that is not a year, a year either
 * side of the range, and an empty box when the add's question is answered *Add*. One line for every
 * case, the user's pick at the #24 build, and the server's words for the same refusal.
 */
export function yearRule(thisYear: number): string {
  return `A year from ${FIRST_YEAR} to ${thisYear}.`;
}

/** The year it is here — the year a finish cannot be after. */
export function thisYearHere(): number {
  return Number(todayHere().slice(0, 4));
}

export type ParsedYear =
  | { value: number | null; error?: undefined }
  | { value?: undefined; error: string };

/**
 * Reads a year box: four digits, from 1900 to this year here. Empty is no year, which a journal's
 * box means as *cleared*.
 *
 * Read off the text, as `parseRating` is, so what is refused is what was typed: a box that took
 * `20190` or `2019.0` as a number would answer with a year nobody typed.
 */
export function parseYear(text: string, thisYear: number = thisYearHere()): ParsedYear {
  const trimmed = text.trim();

  if (trimmed === '') {
    return { value: null };
  }

  if (!/^\d{4}$/.test(trimmed)) {
    return { error: yearRule(thisYear) };
  }

  const year = Number(trimmed);
  return year >= FIRST_YEAR && year <= thisYear ? { value: year } : { error: yearRule(thisYear) };
}
