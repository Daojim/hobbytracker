import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addToBoard, libraryStatuses, type OnBoard } from '../api/library';
import { libraryStatusesKey } from '../board/keys';
import { useHiddenColumns } from '../board/hiddenColumns';
import { addColumns, columnsFor } from '../hobbies';
import type { LogStatus } from '../api/types';

interface Add {
  mediaId: number;
  status: LogStatus;
}

/**
 * Putting a title on a board from a tile, and knowing where the titles already on it are.
 *
 * Shared by the two places a tile can be — the search strip and the Discover page — so they
 * cannot disagree about any of it: which columns a tile offers, which column a title is in, and
 * what an add sends.
 *
 * The library is paged to the end rather than capped, because a library of 101 titles would
 * otherwise offer to add the hundred-and-first a second time — see `libraryStatuses`.
 */
export function useAddToBoard(hobby: string) {
  const queryClient = useQueryClient();

  // Where a tile can put a title: Backlog, Playing and Completed, less any this board has taken
  // off in Settings. Read from the same store the board reads, which needs no provider, so the
  // Discover page — which draws no board — offers exactly what the board would accept.
  const hidden = useHiddenColumns(hobby);
  const columns = addColumns(columnsFor(hobby).filter((column) => !hidden.has(column.status)));

  const library = useQuery({
    queryKey: libraryStatusesKey(hobby),
    queryFn: () => libraryStatuses(hobby),
  });

  const add = useMutation({
    mutationFn: ({ mediaId, status }: Add) => addToBoard(mediaId, status),

    // Written into the library's answer the moment the add is, rather than waiting on the
    // refetch below: otherwise the buttons stay live long enough to be pressed twice, and the
    // second press is refused. Into the cache rather than beside it, which is what this used to
    // do — a list of its own, laid over the library's, went on claiming a title was on the board
    // after it had been taken off again, because nothing ever emptied it.
    onSuccess: (_card, { mediaId, status }) => {
      queryClient.setQueryData<OnBoard[]>(libraryStatusesKey(hobby), (titles = []) => [
        ...titles.filter((title) => title.mediaId !== mediaId),
        { mediaId, status },
      ]);
    },

    // Settled, not only on success. A refusal means the tile's idea of the board was stale — the
    // title went on in another tab — so the refetch is what brings it up to date. This hobby's,
    // not every hobby's: adding a film cannot move a card on the games board.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['library', hobby] });
    },
  });

  const onBoard = new Map((library.data ?? []).map(({ mediaId, status }) => [mediaId, status]));

  return {
    columns,
    /** The column a title is in, or null when it is not on this board. */
    statusOf: (mediaId: number): LogStatus | null => onBoard.get(mediaId) ?? null,
    add: (mediaId: number, status: LogStatus) => add.mutate({ mediaId, status }),
    isAdding: (mediaId: number) => add.isPending && add.variables?.mediaId === mediaId,
    error: add.error,
  };
}
