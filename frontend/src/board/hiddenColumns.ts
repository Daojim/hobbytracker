import { useMemo, useSyncExternalStore } from 'react';
import { BOARD_STATUSES } from '../hobbies';
import { readStored, writeStored } from '../lib/storage';
import type { LogStatus } from '../api/types';

/**
 * Which columns a board leaves off, as ticked in Settings.
 *
 * **The first preference here that is not CSS, and that is the whole reason this is a store.** A
 * theme is an attribute on the root: the menu stamps it and nothing in React has to hear about
 * it, which is why `useTheme` can hold its own state and there is exactly one menu. A hidden
 * column has to leave the grid, stop fetching, stop being a drop target and leave every card's
 * menu — all of it in the board, which is a sibling of the header the menu lives in. So both
 * subscribe here, through `useSyncExternalStore`, and neither needs a provider: a component test
 * still renders without a wrapper.
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
 * What this page was told while storage would not keep it, by key. Empty in any browser that
 * stores, and emptied again the first time a write succeeds.
 *
 * It exists because the snapshot below is read from storage: in a browser set to block site data
 * every write throws, and without this the checkbox would be a control that silently did nothing.
 * The theme survives the same browser by holding its choice in state; this is that, for a
 * preference two components share.
 */
const unsaved = new Map<string, string>();

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Another tab changing it. The event fires only in *other* documents, which is why the setter
  // below tells this one itself — and a null key is storage being cleared outright.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(PREFIX)) {
      listener();
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * The raw stored string rather than the parsed set. `useSyncExternalStore` compares snapshots by
 * identity and re-renders whenever they differ, so a fresh Set on every read would re-render
 * forever; two equal strings are the same value.
 */
const snapshotOf = (hobby: string): string | null =>
  unsaved.get(hiddenColumnsKey(hobby)) ?? readStored(hiddenColumnsKey(hobby));

/** The columns this board leaves off, kept current as they change here or in another tab. */
export function useHiddenColumns(hobby: string): ReadonlySet<LogStatus> {
  const stored = useSyncExternalStore(subscribe, () => snapshotOf(hobby));
  return useMemo(() => parseHidden(stored), [stored]);
}

/** Takes a column off a board, or puts it back. Backlog cannot be taken off, and is ignored. */
export function setColumnHidden(hobby: string, status: LogStatus, hidden: boolean): void {
  if (!canHide(status)) {
    return;
  }

  const next = new Set(parseHidden(snapshotOf(hobby)));
  if (hidden) {
    next.add(status);
  } else {
    next.delete(status);
  }

  // In board order, so what is stored reads the way the board does.
  const key = hiddenColumnsKey(hobby);
  const value = JSON.stringify(BOARD_STATUSES.filter((each) => next.has(each)));

  if (writeStored(key, value)) {
    unsaved.delete(key);
  } else {
    unsaved.set(key, value);
  }

  for (const listener of listeners) {
    listener();
  }
}
