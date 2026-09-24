import type { AddColumn, HobbyDefinition, SearchHit } from '../hobbies';
import type { LogStatus } from '../api/types';

/** One button of a tile's add: where it puts the title, and what it says about that. */
export interface AddAction {
  column: AddColumn;
  /** How it reads aloud — `Add Hollow Knight to playing`. */
  label: string;
  /** What it says under a resting cursor — `Add to Playing`. */
  hint: string;
}

/**
 * What a tile offers, whether it is in the search strip or on the Discover page's wall, so the two
 * cannot disagree about one title.
 *
 * - `columns` — a button for each column the board can take a title into, drawn as a symbol.
 * - `calendar` — one button, in words, for a title that is not out: it writes a Backlog entry
 *   that appears on the release calendar rather than in the column, and there is nothing to be
 *   playing or to have finished.
 *
 * Both halves have to be true for the calendar, and they are different questions. The hobby
 * decides whether there is a calendar to add to at all; the server decides whether this
 * particular title is out. `released` is taken as given rather than re-derived from the date —
 * the board is partitioned on the server's answer, and a second copy of that rule here would be
 * free to disagree, offering the calendar for something that then lands in Backlog.
 */
export type AddOffer =
  | { kind: 'columns'; actions: readonly AddAction[] }
  | { kind: 'calendar'; text: string; label: string };

/**
 * Whether this title belongs on the calendar rather than in a column: this hobby keeps one, and
 * the server says the title is not out. The one condition the offer, the words for where a title
 * is, and a tile's release date all turn on.
 */
export function awaitsRelease(hit: SearchHit, definition: HobbyDefinition): boolean {
  return definition.releases !== null && hit.release !== null && !hit.release.released;
}

export function addOffer(
  hit: SearchHit,
  definition: HobbyDefinition,
  columns: readonly AddColumn[],
): AddOffer {
  const calendar = definition.releases;

  if (calendar !== null && awaitsRelease(hit, definition)) {
    return { kind: 'calendar', text: calendar.addAction, label: calendar.describeAdd(hit.title) };
  }

  return {
    kind: 'columns',
    actions: columns.map((column) => ({
      column,
      // Lower-cased in the sentence, as "to backlog" always was: every spec that has ever added
      // a title finds the button by that name, and a screen reader does not hear the capital.
      label: `Add ${hit.title} to ${column.label.toLowerCase()}`,
      hint: `Add to ${column.label}`,
    })),
  };
}

/**
 * Where a title on your board is, in the words a tile says it in: the column, as this hobby
 * calls it.
 *
 * Except for a title waiting to come out. It is in Backlog by status and not in the Backlog
 * column — the board shows it on the calendar under the columns — so saying *Backlog* would
 * send somebody looking in the wrong place. It says the calendar's own heading instead, decided
 * by the server's `released` exactly as the calendar's partition is.
 */
export function boardWords(
  hit: SearchHit,
  definition: HobbyDefinition,
  status: LogStatus,
): string {
  const calendar = definition.releases;

  if (status === 'Backlog' && calendar !== null && awaitsRelease(hit, definition)) {
    return calendar.heading;
  }

  return definition.columnLabel[status];
}
