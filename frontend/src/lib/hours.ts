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

/**
 * A film's runtime, read as a person says one: `1 h 52 m`, or `48 m` under the hour.
 *
 * Minutes in, because that is what TMDB stores and what the drawer is handed. The board takes
 * the other door — see {@link formatRuntime} — and both come through here so there is one
 * place that decides what a runtime looks like.
 */
export function formatMinutes(minutes: number): string {
  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;

  // Under an hour, "0 h 48 m" is a way of saying 48 minutes that nobody uses.
  return whole === 0 ? `${rest} m` : `${whole} h ${rest} m`;
}

/**
 * The same runtime, off the hours a board row carries.
 *
 * Hours rather than minutes there because one field says how long anything takes, so a card and
 * `sort=length` cannot drift apart. The minute is recovered exactly: the server rounds to the
 * two decimal places a game's estimate is stored at, which is at most 0.3 of a minute out, so
 * rounding back always lands on the whole minute TMDB gave.
 *
 * Hours rather than minutes throughout would have been the other choice, and it reads worse:
 * `1.87 h` is a number nobody uses about a film.
 */
export function formatRuntime(hours: number): string {
  return formatMinutes(Math.round(hours * 60));
}
