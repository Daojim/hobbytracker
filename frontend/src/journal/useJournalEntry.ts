import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGame, setGameGenre, setGameHltbId } from '../api/games';
import { ApiError } from '../api/client';
import { deleteLogEntry, updateLogEntry } from '../api/logEntries';
import { mediaKey } from '../board/keys';
import type { UpdateLogEntry } from '../api/types';

/**
 * One title's journal: everything logged against it, and the write that changes the current pass.
 *
 * `getGame` answers with the game and every entry in a single request, which is what it was
 * built for — the drawer needs both and there is no reason to ask twice.
 */
export function useJournalEntry(hobby: string, mediaId: number) {
  const queryClient = useQueryClient();

  const game = useQuery({
    queryKey: mediaKey(hobby, mediaId),
    queryFn: () => getGame(mediaId),
  });

  const save = useMutation({
    mutationFn: ({ entryId, update }: { entryId: number; update: UpdateLogEntry }) =>
      updateLogEntry(entryId, update),

    onSuccess: () => {
      // The card behind the drawer carries the rating and the dates, so the board has to hear
      // about this as well as the drawer.
      void queryClient.invalidateQueries({ queryKey: ['library', hobby] });
      void queryClient.invalidateQueries({ queryKey: mediaKey(hobby, mediaId) });
    },
  });

  const remove = useMutation({
    mutationFn: (entryId: number) => deleteLogEntry(entryId),

    onSuccess: () => {
      // A pass leaving changes the count on the card, and can take the card with it: the
      // library is titles you have logged something against, so the last one going means the
      // title is no longer one of them.
      void queryClient.invalidateQueries({ queryKey: ['library', hobby] });
      void queryClient.invalidateQueries({ queryKey: mediaKey(hobby, mediaId) });
    },
  });


  const setGenre = useMutation({
    mutationFn: (genre: string | null) => setGameGenre(mediaId, genre),

    onSuccess: () => {
      // Unlike a note, this does show on the card — it is the card's colour and the word beside
      // its rating — so the board hears about it too.
      void queryClient.invalidateQueries({ queryKey: ['library', hobby] });
      void queryClient.invalidateQueries({ queryKey: mediaKey(hobby, mediaId) });
    },
  });

  const setHltbId = useMutation({
    mutationFn: (hltbId: number | null) => setGameHltbId(mediaId, hltbId),

    onSuccess: () => {
      // The card carries the main-story estimate now, and the Time to beat sort orders on it,
      // so a corrected pin changes the board and not only the drawer.
      void queryClient.invalidateQueries({ queryKey: ['library', hobby] });
      void queryClient.invalidateQueries({ queryKey: mediaKey(hobby, mediaId) });
    },
  });

  return {
    game,
    save,
    remove,
    setGenre,
    setHltbId,
    /** Which field the API objected to, rather than only that it objected. */
    fieldErrors: save.error instanceof ApiError ? save.error.fieldErrors : {},
  };
}
