import type { LogStatus } from '../api/types';
import type { Hobby } from '../shell/hobbies';
import { GAMES } from './games';
import { MOVIES } from './movies';
import { TV } from './tv';
import type { Genre, HobbyDefinition } from './types';

export type {
  Genre,
  HobbyDefinition,
  JournalSection,
  PassFields,
  SearchHit,
  TitleDetail,
  TitleFact,
  TitleHltb,
  TitleSeason,
} from './types';

/**
 * One definition per hobby, keyed by the slug that comes out of the address.
 *
 * A `Record` over `Hobby` rather than a lookup that can miss: `isReadyHobby` in
 * `shell/hobbies.ts` is what decides whether a board exists at all, and by the time anything
 * here is asked the slug has already been through it. The four hobbies with no phase yet are
 * absent, so adding one is a compile error rather than a blank board.
 */
const DEFINITIONS: Partial<Record<Hobby, HobbyDefinition>> = {
  games: GAMES,
  movies: MOVIES,
  tv: TV,
};

/**
 * What this hobby calls things, searches with, and paints its cards from.
 *
 * Falls back to games rather than throwing. Reaching here with an unbuilt slug is a routing
 * mistake — `BoardPage` redirects one before any of this renders — and a board that shows the
 * wrong words is a far better failure than one that shows a stack trace.
 */
export function hobbyDefinition(hobby: string): HobbyDefinition {
  return DEFINITIONS[hobby as Hobby] ?? GAMES;
}

const normalise = (name: string) => name.trim().toLowerCase();

/**
 * The genre a title would be painted as if nobody chose one: the first entry in its hobby's list
 * that it has. Null when it has none of them, which is honest rather than a colour picked at
 * random.
 */
export function automaticGenre(
  genres: readonly Genre[],
  titleGenres: readonly string[] | null,
): string | null {
  if (titleGenres === null) {
    return null;
  }

  const has = new Set(titleGenres.map(normalise));
  return genres.find((genre) => has.has(normalise(genre.name)))?.name ?? null;
}

/**
 * The genre that stands for a title. A chosen one always wins, even one the title no longer
 * lists or one its hobby does not paint — the platform select's rule, for the platform select's
 * reason: a value that was true when it was chosen has to outlive the list it came from.
 */
export function resolveGenre(
  genres: readonly Genre[],
  titleGenres: readonly string[] | null,
  primaryGenre: string | null,
): string | null {
  return primaryGenre ?? automaticGenre(genres, titleGenres);
}

/** The stripe class for a genre, or null for one that is not painted. */
export function genreStripe(
  genres: readonly Genre[],
  genre: string | null,
): string | null {
  if (genre === null) {
    return null;
  }

  return genres.find((known) => normalise(known.name) === normalise(genre))?.stripe ?? null;
}

/**
 * The board's columns for a hobby: what order they sit in, and what each one is called.
 *
 * Nothing here may be sent to the API. The label is not the status: the wire says `InProgress`
 * and a games board says Playing while a movies board says Watching.
 */
export function columnsFor(hobby: string): readonly { status: LogStatus; label: string }[] {
  const { columnLabel } = hobbyDefinition(hobby);

  return BOARD_STATUSES.map((status) => ({ status, label: columnLabel[status] }));
}

/**
 * Left to right, as the board lays them out. The one list the order comes from, so a hobby can
 * rename a column but cannot reorder the board out from under the drag.
 *
 * Dropped is last, and this board has had it both ways. It sat ahead of Backlog from 29 August
 * to 7 September 2026, on the argument that a dropped title *left* the progression rather than
 * finished it and so belongs off the path the eye takes across the board. That argument is
 * still sound; nine days of living with it settled the question the other way, and it is back
 * at the end — a muted well in the corner of the board rather than in the doorway to it.
 * Everything else about it is unchanged: still collapsed until it is asked for, still a drop
 * target while it is.
 *
 * `otherColumns` derives from this, so a card's menu follows the board without a second list
 * to keep in step — which puts *Move to Dropped* back at the bottom of the three moves, above
 * the one item that is not a move.
 */
export const BOARD_STATUSES: readonly LogStatus[] = [
  'Backlog',
  'InProgress',
  'Completed',
  'Dropped',
];

/**
 * Everywhere a card could go from where it is — its three, never its own, because
 * `TransitionAsync` treats a move to the status a title already has as a silent no-op.
 */
export function otherColumns(
  hobby: string,
  status: LogStatus,
): readonly { status: LogStatus; label: string }[] {
  return columnsFor(hobby).filter((column) => column.status !== status);
}
