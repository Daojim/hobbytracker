import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mediaKey, reviewsKey } from '../board/keys';
import type { ReviewSection, TitleReviews } from '../hobbies';

/**
 * What critics and players say about a title, and the pin that corrects which page the critics'
 * row reads — the journal's OpenCritic and Steam rows.
 *
 * Both are off for a hobby with no such rows, which says so with a null on the title and on its
 * journal, as the HowLongToBeat pin's block does. Neither is a branch on the slug.
 */
export function useReviews(
  hobby: string,
  mediaId: number,
  pages: TitleReviews | null,
  section: ReviewSection | null,
) {
  const queryClient = useQueryClient();
  const known = { openCriticId: pages?.openCriticId ?? null, steamAppId: pages?.steamAppId ?? null };

  const verdicts = useQuery({
    queryKey: reviewsKey(hobby, mediaId, known),
    queryFn: () =>
      section === null
        ? // Unreachable: the query is off without a section. Stated rather than assumed, as the
          // HowLongToBeat pin's mutation states it, so a hobby wiring half of this fails loudly.
          Promise.reject(new Error(`${hobby} has no reviews to ask for.`))
        : section.load(mediaId),
    enabled: pages !== null && section !== null,
  });

  // The first journal on a game is what finds its pages, so its answer names pages the title the
  // drawer holds does not have yet. The title is read again, which moves the key above, and the
  // rows draw the pages with the answer that was just asked for them. An answer for the pages the
  // drawer already holds changes nothing, which is what keeps this from asking twice.
  const found = verdicts.data;
  useEffect(() => {
    if (
      found !== undefined
      && (found.openCriticId !== known.openCriticId || found.steamAppId !== known.steamAppId)
    ) {
      void queryClient.invalidateQueries({ queryKey: mediaKey(hobby, mediaId) });
    }
  }, [found, known.openCriticId, known.steamAppId, hobby, mediaId, queryClient]);

  const pin = useMutation({
    mutationFn: (openCriticId: number | null) =>
      section === null
        ? Promise.reject(new Error(`${hobby} has no critics' page to pin.`))
        : section.pin(mediaId, openCriticId),

    // Returned rather than fired, so the pin is still on its way until the title has been read
    // again with the new number in it: the box stays dimmed and the row says `…` throughout,
    // where letting go at the server's answer would put the old number's words back for a moment.
    // Nothing on the board shows a review, so the journal's title is all that is read again.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mediaKey(hobby, mediaId) }),
  });

  return { verdicts, pin };
}
