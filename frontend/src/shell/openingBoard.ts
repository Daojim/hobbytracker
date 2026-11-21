import { preferenceStore } from '../lib/preferenceStore';
import { DEFAULT_HOBBY, isReadyHobby, type Hobby } from './hobbies';

/**
 * Which board `/` opens on, as chosen in Settings since #27: `/`, `/board` and `/search` each
 * named the games board until then. One of the built boards, Games until another is chosen, the
 * recommendation over a fifth answer, *the board I used last*.
 *
 * Per browser, as every appearance setting is. A board's own address still opens that board, so
 * a bookmark or a link means what it says whichever is chosen.
 */

export const OPENING_BOARD_KEY = 'hobbytracker.opens-on';

/** What storage says, trusting none of it: an unbuilt board or a stranger opens Games. */
export function parseOpeningBoard(stored: string | null): Hobby {
  const slug = stored ?? undefined;
  return isReadyHobby(slug) ? slug : DEFAULT_HOBBY;
}

const store = preferenceStore(OPENING_BOARD_KEY);

/** The board that opens first, kept current as it changes here or in another tab. */
export function useOpeningBoard(): Hobby {
  return parseOpeningBoard(store.useValue(OPENING_BOARD_KEY));
}

export function setOpeningBoard(hobby: Hobby): void {
  store.write(OPENING_BOARD_KEY, hobby);
}
