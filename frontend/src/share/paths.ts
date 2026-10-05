import type { LogStatus, SharedBoard, SharePart } from '../api/types';
import { columnsFor, hobbyDefinition, type BoardColumn } from '../hobbies';
import { isReadyHobby } from '../shell/hobbies';

/**
 * Where a share lives: its board, and its Stats page under it, as a hobby's are under
 * `/board/:hobby`. The token is the whole of the address that is a secret.
 */
export const sharedPath = (token: string): string => `/share/${token}`;

/** A share's Stats page, at a year or `all`; with neither, it opens on the latest. */
export const sharedStatsPath = (token: string, year?: number | 'all'): string =>
  year === undefined ? `${sharedPath(token)}/stats` : `${sharedPath(token)}/stats/${year}`;

/**
 * Whether a share shows a column: Backlog always, and the others when ticked. The four columns
 * wear their `LogStatus` names as parts, and a column with no part of its own — one added to the
 * board later — is off, which is the rule a share stores what it shows for.
 */
export const showsColumn = (parts: readonly SharePart[], status: LogStatus): boolean =>
  status === 'Backlog' || (parts as readonly string[]).includes(status);

/** The columns a share draws, in its hobby's board order and words. */
export const sharedColumns = (board: SharedBoard): readonly BoardColumn[] =>
  columnsFor(board.hobby).filter(({ status }) => showsColumn(board.parts, status));

/**
 * Whether the app shares boards of this kind at all, which a share of any other opens as a link
 * that opens no board. The API would make one of any board, by hand; the app offers one where the
 * hobby has words for it, which today is games alone.
 */
export const isShareable = (hobby: string): boolean =>
  isReadyHobby(hobby) && hobbyDefinition(hobby).share !== null;
