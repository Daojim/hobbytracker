import type { LogStatus } from '../api/types';
import type { Hobby } from '../shell/hobbies';
import { ANIME } from './anime';
import { GAMES } from './games';
import { MOVIES } from './movies';
import { TV } from './tv';
import type { Genre, HobbyDefinition } from './types';

export type {
  DiscoverList,
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
  anime: ANIME,
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
 * One column as a board draws it: the status it holds, and what this hobby calls it.
 *
 * Nothing here may be sent to the API. The label is not the status: the wire says `InProgress`
 * and a games board says Playing while a movies board says Watching.
 */
export interface BoardColumn {
  status: LogStatus;
  label: string;
}

/**
 * Every column a hobby has, in board order — before anything is taken off in Settings, which is
 * the board's business rather than the hobby's. The Settings menu lists these; the board draws
 * these less the ones it was told to leave off.
 */
export function columnsFor(hobby: string): readonly BoardColumn[] {
  const { columnLabel } = hobbyDefinition(hobby);

  return BOARD_STATUSES.map((status) => ({ status, label: columnLabel[status] }));
}

/**
 * Left to right, as the board lays them out. The one list the order comes from, so a hobby can
 * rename a column but cannot reorder the board out from under the drag.
 *
 * On Hold sits straight after Playing, because it is Playing with the controller put down:
 * pausing and resuming are a drag to the next column, and left to right still reads as the
 * life of a title — queued, under way, paused, finished. The other place it could have gone was
 * beside Dropped, grouping the two stalled states at the right as MAL's list does; that was
 * weighed and passed over on 17 September 2026. Moving it is this one line, as Dropped's moves
 * have been.
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
 * to keep in step — which puts *Move to Dropped* at the bottom of the four moves, above the one
 * item that is not a move.
 */
export const BOARD_STATUSES: readonly LogStatus[] = [
  'Backlog',
  'InProgress',
  'OnHold',
  'Completed',
  'Dropped',
];

/**
 * Everywhere a card could go from where it is: every column the board is drawing, never its own,
 * because `TransitionAsync` treats a move to the status a title already has as a silent no-op.
 *
 * Handed the board's columns rather than working them out from the hobby, and that is the whole
 * of what keeps the menu honest about a column taken off in Settings. Worked out here, it would
 * go on offering *Move to Dropped* on a board with no Dropped on it — a move that sends the card
 * somewhere off screen, which reads as the menu losing it.
 */
export function otherColumns(
  columns: readonly BoardColumn[],
  status: LogStatus,
): readonly BoardColumn[] {
  return columns.filter((column) => column.status !== status);
}

/**
 * The columns a title can arrive in from a tile, in board order: queued, under way, finished.
 *
 * On Hold and Dropped are places a title goes *after* it has been started — a pause and an
 * abandonment are things that happen to a game you have, not ways of getting one — so neither is
 * on offer. The API takes any of the five and dates each by the drag's rule; which three a tile
 * offers is decided here, once, and chosen on 24 September 2026.
 *
 * Its own type, so a fourth added here is a compile error in `AddControl` until it has a symbol
 * drawn for it, rather than a button with nothing on it.
 */
export const ADD_STATUSES = ['Backlog', 'InProgress', 'Completed'] as const;

export type AddStatus = (typeof ADD_STATUSES)[number];

/** A column a tile can add to — a board column whose status is one of {@link ADD_STATUSES}. */
export interface AddColumn extends BoardColumn {
  status: AddStatus;
}

const isAddColumn = (column: BoardColumn): column is AddColumn =>
  (ADD_STATUSES as readonly LogStatus[]).includes(column.status);

/**
 * Where a tile can put a title: the columns the board is drawing, narrowed to
 * {@link ADD_STATUSES}.
 *
 * Handed the board's columns rather than the hobby's, for `otherColumns`' reason: a tile offering
 * Completed on a board with Completed taken off in Settings would send the title somewhere off
 * screen, which reads as the add having lost it. Backlog can never be taken off, so there is
 * always somewhere to add to.
 */
export function addColumns(columns: readonly BoardColumn[]): readonly AddColumn[] {
  return columns.filter(isAddColumn);
}
