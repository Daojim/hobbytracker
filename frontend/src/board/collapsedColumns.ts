import { useMemo } from 'react';
import { BOARD_STATUSES } from '../hobbies';
import { preferenceStore } from '../lib/preferenceStore';
import type { LogStatus } from '../api/types';

/**
 * Which columns a board shows collapsed, as each column's arrow sets it (#29).
 *
 * **Not to be confused with a column taken off in Settings** (`hiddenColumns.ts`). That one is not
 * drawn, not fetched and not a drop target. A collapsed column is all three: only its cards go, and
 * its heading, count, hours and sort control stay, so a long Completed stops being something to
 * scroll past without leaving the board.
 *
 * Remembered per board and per browser, beside the columns taken off, because a collapse that
 * forgot itself on a reload would be a press every visit; collapsing Completed on Games leaves
 * Watched open on Films. A store rather than state for the hidden columns' reason: the board reads
 * it and every column's arrow writes it, and another tab's press arrives through the `storage`
 * event. Side by side only — on a phone, choosing a column in the switcher is asking to see it,
 * so the board does not read this there.
 */

/**
 * What a board nobody has touched shows collapsed: Dropped, as it always has. It is a record of
 * what was given up on rather than a queue, so it starts out of the way.
 */
const COLLAPSED_AT_FIRST: ReadonlySet<LogStatus> = new Set(['Dropped']);

const PREFIX = 'hobbytracker.collapsed-columns.';

export const collapsedColumnsKey = (hobby: string) => `${PREFIX}${hobby}`;

/**
 * What storage says is collapsed, trusting none of it.
 *
 * **Nothing stored is Dropped collapsed, and a stored empty list is every column open**: once
 * Dropped is opened it stays open, where it used to fold itself again on every load. So what is
 * stored is the whole list of what is collapsed, and anything that is not a list reads as nothing
 * stored. A list keeps the columns there are and drops the rest, because storage outlives the code
 * that wrote it.
 */
export function parseCollapsed(stored: string | null): ReadonlySet<LogStatus> {
  if (stored === null) {
    return COLLAPSED_AT_FIRST;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return COLLAPSED_AT_FIRST;
  }

  if (!Array.isArray(parsed)) {
    return COLLAPSED_AT_FIRST;
  }

  return new Set(BOARD_STATUSES.filter((status) => parsed.includes(status)));
}

/** The raw strings, and this page's copy of any storage would not keep. */
const store = preferenceStore(PREFIX);

/** The columns this board shows collapsed, kept current as they change here or in another tab. */
export function useCollapsedColumns(hobby: string): ReadonlySet<LogStatus> {
  // Parsed after, from the raw string: a fresh Set per read would re-render for ever.
  const stored = store.useValue(collapsedColumnsKey(hobby));
  return useMemo(() => parseCollapsed(stored), [stored]);
}

/**
 * Collapses a column, or opens it. Written whole, from what the board was showing, so the first
 * press on any column also writes down Dropped as it was: collapsed, if nobody had opened it.
 */
export function setColumnCollapsed(hobby: string, status: LogStatus, collapsed: boolean): void {
  const key = collapsedColumnsKey(hobby);
  const next = new Set(parseCollapsed(store.read(key)));
  if (collapsed) {
    next.add(status);
  } else {
    next.delete(status);
  }

  // In board order, so what is stored reads the way the board does.
  store.write(key, JSON.stringify(BOARD_STATUSES.filter((each) => next.has(each))));
}
