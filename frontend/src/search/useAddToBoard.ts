import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { libraryMediaIds } from '../api/library';
import { addToBacklog } from '../api/logEntries';
import { libraryIdsKey } from '../board/keys';

/**
 * Putting a title on a board from a tile, and knowing which titles are on it already.
 *
 * Shared by the two places a tile can be — the search strip and the Discover page — so they
 * cannot disagree about either half. It is also the one place adding straight to a column other
 * than Backlog will land when that comes, rather than two.
 *
 * Moved out of BoardSearch unchanged. The library is paged to the end rather than capped, because
 * a library of 101 titles would otherwise offer to add the hundred-and-first a second time — see
 * `libraryMediaIds`.
 */
export function useAddToBoard(hobby: string) {
  const queryClient = useQueryClient();

  const library = useQuery({
    queryKey: libraryIdsKey(hobby),
    queryFn: () => libraryMediaIds(hobby),
  });

  // Held locally as well as in the library query, so the answer changes the moment the entry is
  // written rather than a refetch later — otherwise the button stays live long enough to be
  // clicked twice, and the second click is a second Backlog entry the board renders as a replay.
  const [justAdded, setJustAdded] = useState<number[]>([]);

  const add = useMutation({
    mutationFn: (mediaId: number) => addToBacklog(mediaId),
    onSuccess: (_entry, mediaId) => {
      setJustAdded((ids) => [...ids, mediaId]);
      // This hobby's, not every hobby's: adding a film cannot move a card on the games board.
      void queryClient.invalidateQueries({ queryKey: ['library', hobby] });
    },
  });

  return {
    onBoard: new Set([...(library.data ?? []), ...justAdded]),
    add: (mediaId: number) => add.mutate(mediaId),
    isAdding: (mediaId: number) => add.isPending && add.variables === mediaId,
    error: add.error,
  };
}
