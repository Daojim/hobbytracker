import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNote, deleteNote, updateNote } from '../api/notes';
import { gameKey } from '../board/keys';

/**
 * Writing, rewriting and taking back notes on one title's passes.
 *
 * Its own hook rather than three more mutations on `useJournalEntry`, which already carries the
 * entry query, the save and the pass delete.
 *
 * Only the game query is invalidated. The card behind the drawer shows a rating, a count of
 * passes and a date, and none of those move when a note is written — so unlike a save or a
 * delete, the board has nothing to hear about.
 */
export function useNotes(mediaId: number) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: gameKey(mediaId) });

  const write = useMutation({
    mutationFn: ({ entryId, body }: { entryId: number; body: string }) => addNote(entryId, body),
    onSuccess: () => void refresh(),
  });

  const rewrite = useMutation({
    mutationFn: ({ noteId, body }: { noteId: number; body: string }) => updateNote(noteId, body),
    onSuccess: () => void refresh(),
  });

  const remove = useMutation({
    mutationFn: (noteId: number) => deleteNote(noteId),
    onSuccess: () => void refresh(),
  });

  return { write, rewrite, remove };
}
