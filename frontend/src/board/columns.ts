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
 * `e2e/support/board.ts` keeps a copy, deliberately. The end-to-end suite reads the app from
 * outside, and a locator that imports the string it is asserting on proves only that a constant
 * equals itself.
 */
export const COLUMNS: readonly { status: LogStatus; label: string }[] = [
  { status: 'Backlog', label: 'Backlog' },
  { status: 'InProgress', label: 'Playing' },
  { status: 'Completed', label: 'Completed' },
  { status: 'Dropped', label: 'Dropped' },
];

/** Left to right, the order a title moves through. Derived, so it cannot drift from the labels. */
export const BOARD_STATUSES: readonly LogStatus[] = COLUMNS.map((column) => column.status);

/**
 * Everywhere a card could go from where it is.
 *
 * Never its own column: the API treats a move to the status a title already has as a silent
 * no-op, so offering it would cost a request and change nothing — and a menu item that does
 * nothing is worse than one that is absent.
 */
export const otherColumns = (status: LogStatus) =>
  COLUMNS.filter((column) => column.status !== status);
