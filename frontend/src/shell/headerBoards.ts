import { useMemo } from 'react';
import { preferenceStore } from '../lib/preferenceStore';
import { HOBBIES, type Hobby } from './hobbies';

/**
 * Which boards the nav under the header names, as ticked in Settings since #27: any of the six,
 * Books and Music among them, the recommendation over only the two marked Soon. So the nav shows
 * the boards you use.
 *
 * **The board you are on is always named**, taken off or not, and Settings leaves it out of the
 * list with a line saying so, as Columns does Backlog. A board taken off still opens at its
 * address, by a bookmark or as the board that opens first, and the nav still says where you are.
 *
 * Per browser, as every appearance setting is, and kept as what is taken off rather than what is
 * shown, so a board built later is named: the Columns group's rule for its reason.
 */

export const HEADER_BOARDS_KEY = 'hobbytracker.header-boards';

const NONE_OFF: ReadonlySet<Hobby> = new Set();

/** What storage says is taken off, trusting none of it. */
export function parseHeaderBoards(stored: string | null): ReadonlySet<Hobby> {
  if (stored === null) {
    return NONE_OFF;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return NONE_OFF;
  }

  if (!Array.isArray(parsed)) {
    return NONE_OFF;
  }

  return new Set(HOBBIES.map((each) => each.slug).filter((slug) => parsed.includes(slug)));
}

const store = preferenceStore(HEADER_BOARDS_KEY);

/** The boards taken off the nav, kept current as they change here or in another tab. */
export function useHeaderBoards(): ReadonlySet<Hobby> {
  // Parsed after, from the raw string: a fresh Set per read would re-render for ever.
  const stored = store.useValue(HEADER_BOARDS_KEY);
  return useMemo(() => parseHeaderBoards(stored), [stored]);
}

/** Names a board in the nav, or takes it off. */
export function setHeaderBoard(hobby: Hobby, shown: boolean): void {
  const off = new Set(parseHeaderBoards(store.read(HEADER_BOARDS_KEY)));
  if (shown) {
    off.delete(hobby);
  } else {
    off.add(hobby);
  }

  // In the nav's order, so what is stored reads the way the nav does.
  store.write(
    HEADER_BOARDS_KEY,
    JSON.stringify(HOBBIES.map((each) => each.slug).filter((slug) => off.has(slug))),
  );
}
