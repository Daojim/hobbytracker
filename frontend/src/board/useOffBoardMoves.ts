import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reorderColumn, transition, wholeColumn } from '../api/library';
import { settleMove, type SettledMove } from './settle';
import type { LogStatus } from '../api/types';

interface Move extends SettledMove {
  /** A finish put back: the pass itself leaves Completed, and its finish goes. See `transition`. */
  notFinished?: boolean;
}

/**
 * A journal's moves where there is no board on screen: the Stats page's, since #25.
 *
 * **The board's move, less the board.** The same route, so the server's rules about which pass a
 * move touches and what it stamps are the board's; and the same `settleMove`, so a move refreshes
 * what a move on the board refreshes, the Stats page included. Nothing optimistic, since there is
 * no card on screen to move ahead of the answer, and the journal waits for the move either way.
 *
 * **What the board has and this does not is a column to read the order from.** A move from the
 * board's journal lands last in its new column, because `useBoard` writes the column's cached
 * order, the moved card appended, after the transition. Left to the server, a replay would land
 * on top and a finish put back would keep the place number it had in Completed, which means
 * nothing in Playing. So the column is read whole and the order written with the title last, and
 * a move lands where it would have from the board's journal.
 */
export function useOffBoardMoves(hobby: string) {
  const queryClient = useQueryClient();

  const move = useMutation({
    mutationFn: async ({ mediaId, to, notFinished }: Move) => {
      await transition(mediaId, to, notFinished);

      const others = (await wholeColumn(hobby, to))
        .map((item) => item.mediaId)
        .filter((id) => id !== mediaId);
      await reorderColumn({ hobby, status: to, mediaIds: [...others, mediaId] });
    },

    // Returned, so the journal waits for its own refetch, as it does on the board.
    onSettled: (_data, _error, settled) => settleMove(queryClient, hobby, settled),
  });

  return {
    /** The journal's heading moving the title, as something to wait on. */
    moveAndWait: (mediaId: number, from: LogStatus, to: LogStatus) =>
      move.mutateAsync({ mediaId, from, to }),
    /** A finish the journal was told never happened, put back in `to`. */
    putBackAndWait: (mediaId: number, to: LogStatus) =>
      move.mutateAsync({ mediaId, from: 'Completed', to, notFinished: true }),
  };
}
