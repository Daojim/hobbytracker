import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGame } from '../api/games';
import { ApiError } from '../api/client';
import { updateLogEntry } from '../api/logEntries';
import { gameKey } from '../board/keys';
import type { UpdateLogEntry } from '../api/types';

/**
 * One title's journal: everything logged against it, and the write that changes the current pass.
 *
 * `getGame` answers with the game and every entry in a single request, which is what it was
 * built for — the drawer needs both and there is no reason to ask twice.
 */
export function useJournalEntry(mediaId: number) {
  const queryClient = useQueryClient();

  const game = useQuery({
    queryKey: gameKey(mediaId),
    queryFn: () => getGame(mediaId),
  });

  const save = useMutation({
    mutationFn: ({ entryId, update }: { entryId: number; update: UpdateLogEntry }) =>
      updateLogEntry(entryId, update),

    onSuccess: () => {
      // The card behind the drawer carries the rating and the dates, so the board has to hear
      // about this as well as the drawer.
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: gameKey(mediaId) });
    },
  });

  return {
    game,
    save,
    /** Which field the API objected to, rather than only that it objected. */
    fieldErrors: save.error instanceof ApiError ? save.error.fieldErrors : {},
  };
}
