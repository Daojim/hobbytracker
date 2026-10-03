import { useMemo } from 'react';
import { BOARD_STATUSES } from '../hobbies';
import { preferenceStore } from '../lib/preferenceStore';
import type { LogStatus } from '../api/types';

/**
 * Which columns a board leaves off, as ticked in Settings.
 *
 * **The first preference here that is not CSS, and that is the whole reason this is a store.** A
 * theme is an attribute on the root: the menu stamps it and nothing in React has to hear about
 * it, which is why `useTheme` can hold its own state and there is exactly one menu. A hidden
 * column has to leave the grid, stop fetching, stop being a drop target and leave every card's
 * menu — all of it in the board, which is a sibling of the header the menu lives in. So both
 * subscribe to `lib/preferenceStore.ts`, which was written here and moved out when the pace you
 * play at became a second preference two components share.
 *
 * Remembered per board and per browser, like the calendar's open-or-closed beside it
 * (`hobbytracker.coming-soon.<hobby>`), because a film is seldom put on hold and a game often is.
 * Nothing about it reaches the server; a column taken off is a way of looking at the board, and
 * every title in it stays exactly where it was.
 */

/**
 * The column that is always shown. Search adds every title to it, so a board without it would
 * swallow each add without a trace; and the release calendar under the board is a view of it.
 * Also what guarantees there is always at least one column on screen.
 */
export const ALWAYS_SHOWN: LogStatus = 'Backlog';

export const canHide = (status: LogStatus): boolean => status !== ALWAYS_SHOWN;

const PREFIX = 'hobbytracker.hidden-columns.';

export const hiddenColumnsKey = (hobby: string) => `${PREFIX}${hobby}`;

const NOTHING_HIDDEN: ReadonlySet<LogStatus> = new Set();

/**
 * What storage says is hidden, trusting none of it.
 *
 * A list of what was *hidden* rather than of what is shown, so a column added later starts
 * visible — storing the shown list would have taken On Hold off every board whose owner had
 * ever touched this setting, on the day it arrived. Anything unrecognised falls back to hiding
 * nothing, which is the theme's rule for the theme's reason: storage outlives the code that
 * wrote it. Backlog is dropped even if it is there.
 */
export function parseHidden(stored: string | null): ReadonlySet<LogStatus> {
  if (stored === null) {
    return NOTHING_HIDDEN;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return NOTHING_HIDDEN;
  }

  if (!Array.isArray(parsed)) {
    return NOTHING_HIDDEN;
  }

  return new Set(BOARD_STATUSES.filter((status) => canHide(status) && parsed.includes(status)));
}

/**
 * The raw strings, and this page's copy of any storage would not keep — without which, in a
 * browser set to block site data, the checkbox would be a control that silently did nothing.
 */
const store = preferenceStore(PREFIX);

/** The columns this board leaves off, kept current as they change here or in another tab. */
export function useHiddenColumns(hobby: string): ReadonlySet<LogStatus> {
  // Parsed after, from the raw string: a fresh Set per read would re-render for ever.
  const stored = store.useValue(hiddenColumnsKey(hobby));
  return useMemo(() => parseHidden(stored), [stored]);
}

/** Takes a column off a board, or puts it back. Backlog cannot be taken off, and is ignored. */
export function setColumnHidden(hobby: string, status: LogStatus, hidden: boolean): void {
  if (!canHide(status)) {
    return;
  }

  const key = hiddenColumnsKey(hobby);
  const next = new Set(parseHidden(store.read(key)));
  if (hidden) {
    next.add(status);
  } else {
    next.delete(status);
  }

  // In board order, so what is stored reads the way the board does.
  store.write(key, JSON.stringify(BOARD_STATUSES.filter((each) => next.has(each))));
}
