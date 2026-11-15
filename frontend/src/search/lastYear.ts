import type { Hobby } from '../shell/hobbies';

/**
 * The year each board's ✓ last added a title in, for the visit (#24).
 *
 * Filling a board backwards is many games in one sitting, often of one year, so the ✓'s question
 * starts at the year given last: round one's pick at the #24 workshop, over keeping it per board
 * and per browser and over never. In the box and selected, round two's, so Enter adds the next
 * game in it. **Per board**, the user's pick at the build: a year of games is not a year of films.
 *
 * **In memory and nowhere else**, which is what *for the visit* means: the strip and the Discover
 * wall share it, since both are one board's, and a reload starts it empty. Set only by an *Add* the
 * year rule takes — never by a year typed and not added, and never by *Today* or *I don't
 * remember*, which name no year.
 */
const added = new Map<Hobby, number>();

/** The year this board's ✓ last added a title in on this visit, or null before its first. */
export function lastYearAdded(hobby: Hobby): number | null {
  return added.get(hobby) ?? null;
}

export function rememberYearAdded(hobby: Hobby, year: number): void {
  added.set(hobby, year);
}

/** Ends the visit. A test is one, so `src/test/setup.ts` calls this after each. */
export function forgetYearsAdded(): void {
  added.clear();
}
