import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNote, deleteNote, updateNote } from '../api/notes';
import { mediaKey } from '../board/keys';

/**
 * Writing, rewriting and taking back notes on one title's passes.
 *
 * Its own hook rather than three more mutations on `useJournalEntry`, which already carries the
 * entry query, the save and the pass delete.
 *
 * Both the game query and the library are invalidated, and the library half is newer than the
 * rest of this hook. A card carries the last thing you wrote about a title now, so writing,
 * rewriting or taking back a note all move something on the board — which was not true when
 * this was written, and the comment here went on saying so for a while after it stopped being.
 *
 * Both are scoped to the hobby, which they were not while a drawer knew only a media id — the
 * board hands it down now, because the journal has to know whose fields to render anyway.
 */
export function useNotes(hobby: string, mediaId: number) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: mediaKey(hobby, mediaId) }),
      queryClient.invalidateQueries({ queryKey: ['library', hobby] }),
    ]);

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
