import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { deleteLogEntry, updateLogEntry } from '../api/logEntries';
import { hobbyDefinition } from '../hobbies';
import { mediaKey } from '../board/keys';
import type { UpdateLogEntry } from '../api/types';

/**
 * One title's journal: everything logged against it, and the writes that change it.
 *
 * The read answers with the title and every entry in a single request, which is what both
 * detail routes were built for — the drawer needs both and there is no reason to ask twice.
 *
 * Which route that is, and what comes back, is the hobby's: `hobbies/games.ts` and
 * `hobbies/movies.ts` each map their own response into one `TitleDetail`. Everything below this
 * line is the platform, and the three writes it owns — the pass, the delete, the notes — carry
 * no hobby concept at all, which is why they are not in the registry beside the other two.
 */
export function useJournalEntry(hobby: string, mediaId: number) {
  const queryClient = useQueryClient();
  const { journal } = hobbyDefinition(hobby);

  const title = useQuery({
    queryKey: mediaKey(hobby, mediaId),
    queryFn: () => journal.load(mediaId),
  });

  /** Both halves of what a write changed: the drawer in front of you, and the card behind it. */
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['library', hobby] });
    void queryClient.invalidateQueries({ queryKey: mediaKey(hobby, mediaId) });
  };

  const save = useMutation({
    mutationFn: ({ entryId, update }: { entryId: number; update: UpdateLogEntry }) =>
      updateLogEntry(entryId, update),

    // The card behind the drawer carries the rating and the dates, so the board has to hear
    // about this as well as the drawer.
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (entryId: number) => deleteLogEntry(entryId),

    // A pass leaving changes the count on the card, and can take the card with it: the library
    // is titles you have logged something against, so the last one going means the title is no
    // longer one of them.
    onSuccess: refresh,
  });

  const setGenre = useMutation({
    mutationFn: (genre: string | null) => journal.setGenre(mediaId, genre),

    // Unlike a note, this does show on the card — it is the card's colour and the word beside
    // its rating — so the board hears about it too.
    onSuccess: refresh,
  });

  const setHltbId = useMutation({
    mutationFn: (hltbId: number | null) =>
      journal.setHltbId === null
        ? // Unreachable through the UI: the pin renders only where the loaded detail carries a
          // HowLongToBeat block, and only a hobby with a writer has one. Stated rather than
          // assumed so that wiring one half of that pair fails here, loudly, instead of posting
          // a film to /api/games and getting a 404 nobody can read.
          Promise.reject(new Error(`${hobby} has no HowLongToBeat pin.`))
        : journal.setHltbId(mediaId, hltbId),

    // The card carries the headline estimate, and the Time to beat sort orders on it, so a
    // corrected pin changes the board and not only the drawer.
    onSuccess: refresh,
  });

  return {
    title,
    save,
    remove,
    setGenre,
    setHltbId,
    /** Which field the API objected to, rather than only that it objected. */
    fieldErrors: save.error instanceof ApiError ? save.error.fieldErrors : {},
  };
}
