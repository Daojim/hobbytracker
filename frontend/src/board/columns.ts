import type { LogStatus } from '../api/types';

/**
 * The board's columns: what order they sit in, and what each one is called.
 *
 * One list rather than two. The order and the labels were separate before — the order lived in
 * `keys.ts` as `BOARD_STATUSES` and the labels were private to `BoardPage`, which is why a card
 * could not say "Move to Playing" without being handed the word. Two lists of the same four
 * things is how one of them quietly stops matching, and this codebase has already paid for that
 * once over which pass the board calls current.
 *
 * The label is not the status and never has been: the wire says `InProgress` and the column
 * says Playing. Nothing here may be sent to the API.
 *
 * Dropped is first, ahead of the three rather than after them. It used to be the muted fourth,
 * which read as the end of the progression — the place a title arrives at once it is done being
 * played — where it is the opposite: the titles in it *left* that progression, and Backlog to
 * Completed is the whole of it. Sitting ahead of Backlog puts it off the path the eye takes
 * across a board it is reading left to right, which is what a column collapsed by default wants
 * anyway. Everything else about it is unchanged: still muted, still shut until it is asked for,
 * still a drop target while it is.
 *
 * `e2e/support/board.ts` keeps a copy, deliberately. The end-to-end suite reads the app from
 * outside, and a locator that imports the string it is asserting on proves only that a constant
 * equals itself.
 */
export const COLUMNS: readonly { status: LogStatus; label: string }[] = [
  { status: 'Dropped', label: 'Dropped' },
  { status: 'Backlog', label: 'Backlog' },
  { status: 'InProgress', label: 'Playing' },
  { status: 'Completed', label: 'Completed' },
];

/** Left to right, as the board lays them out. Derived, so it cannot drift from the labels. */
export const BOARD_STATUSES: readonly LogStatus[] = COLUMNS.map((column) => column.status);

/**
 * Everywhere a card could go from where it is.
 *
 * Never its own column: the API treats a move to the status a title already has as a silent
 * no-op, so offering it would cost a request and change nothing — and a menu item that does
 * nothing is worse than one that is absent.
 *
 * In board order, which is why it filters `COLUMNS` rather than carrying a list of its own. The
 * menu and the columns are the same four things on the same screen at the same time, so two
 * orderings between them is a disagreement a reader can see. It does mean *Move to Dropped* is
 * the first item on three cards out of four — accepted, because a drop is one drag out of undone
 * and because the ending that is not, *Remove from board*, is still last and still the only one
 * wearing the danger fill.
 */
export const otherColumns = (status: LogStatus) =>
  COLUMNS.filter((column) => column.status !== status);
