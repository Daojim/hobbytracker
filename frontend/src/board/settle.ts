import type { QueryClient } from '@tanstack/react-query';
import {
  allStatsKey,
  libraryStatusesKey,
  mediaKey,
  upcomingKey,
  yearsKey,
} from './keys';
import type { LogStatus } from '../api/types';

/** A move, as what it settles needs to know of it: the title, and the two columns it touched. */
export interface SettledMove {
  mediaId: number;
  from: LogStatus;
  to: LogStatus;
}

/**
 * The Stats page's answers for one hobby, after a write that can change a finish: a move, a pass
 * written in the journal, an add, a title taken off the board.
 *
 * **Dropped where nothing is showing them, and asked again where something is.** The page is not
 * on screen while the board is, so it used to be enough that a page mounting refetches what is
 * stale, and nothing settled it. But the app keeps an answer fresh for 30 seconds, so a move made
 * within 30 seconds of leaving the page was missing from it on the way back, and for the five
 * minutes an unwatched answer is kept, the old numbers were drawn before the new ones arrived.
 * Found at #25's pickup, when the page gained a journal of its own and with it the second reason
 * to settle it: a write made over the page, which is on screen behind the drawer.
 */
export function settleStats(queryClient: QueryClient, hobby: string) {
  queryClient.removeQueries({ queryKey: allStatsKey(hobby), type: 'inactive' });
  return queryClient.invalidateQueries({ queryKey: allStatsKey(hobby) });
}

/**
 * Everything a move changes besides the card, wherever it was made from: a drag, a card's menu,
 * the picker's *Start playing*, or a journal, on the board or on the Stats page. One function,
 * so the two places a move is made cannot disagree about what it refreshes.
 *
 * The server decides more than the card's column: leaving Completed inserts a whole new entry,
 * which changes both the count and the dates the card shows. So both columns are refetched rather
 * than patched.
 *
 * By the column *prefix*, not by one view's key. A column has one cache entry per sort and year,
 * and the exact key only reaches the one on screen — look at Backlog by title, drag a card out of
 * it in manual order, and the title ordering keeps that card for the full staleTime.
 *
 * **And dropped, not only made stale, for the views nobody is looking at.** `invalidateQueries`
 * refetches only an entry with an observer, and a stale entry is still *rendered* the moment
 * something switches onto it — so changing a sort or a year puts the moved card back in the
 * column it left while it also sits in the one it went to. Two cards, one media id. That is not a
 * flicker to wait out: one media id is one dnd-kit registration, the second mount overwrites the
 * first, and when it unmounts it deletes the entry — which by then belongs to the card still on
 * screen. The survivor cannot be dragged until something remounts it. Dropping the entries is
 * honest as well as cheap: their ordering is the server's to decide.
 *
 * Returns the journal's refetch, and only that, so a move is not over until it has landed: a
 * journal open on the title is the one reader with a form over the pass, and it holds still until
 * it has the moved pass under it. A drag or the menu has no journal open, so nothing observes the
 * title then, and this answers at once.
 */
export function settleMove(queryClient: QueryClient, hobby: string, { mediaId, from, to }: SettledMove) {
  queryClient.removeQueries({ queryKey: ['library', hobby, from], type: 'inactive' });
  queryClient.removeQueries({ queryKey: ['library', hobby, to], type: 'inactive' });

  void queryClient.invalidateQueries({ queryKey: ['library', hobby, from] });
  void queryClient.invalidateQueries({ queryKey: ['library', hobby, to] });

  // A move stamps a timestamp, and the years are derived from those — so a drag is one of the two
  // things that can bring a new year into existence. Without this the first title finished in a
  // new year vanishes from the board it was on and the year that would show it is not offered
  // until a reload. The column keys above cannot cover it: 'years' is not a status, so no prefix
  // of theirs reaches it.
  void queryClient.invalidateQueries({ queryKey: yearsKey(hobby) });

  // And the calendar, for exactly that reason again. It is the other half of the Backlog column —
  // the entries whose title is not out yet — so moving an unreleased title out of Backlog or back
  // into it changes what belongs on it. `'upcoming'` sits where a status sits, so the two column
  // keys above reach it no more than they reach `'years'`.
  void queryClient.invalidateQueries({ queryKey: upcomingKey(hobby) });

  // And what the search strip says about where each title is, for the same want of a shared
  // prefix. The strip sits above the board and names the column a title is in, so left alone it
  // would go on naming the one a card had just been dragged out of.
  void queryClient.invalidateQueries({ queryKey: libraryStatusesKey(hobby) });

  // And the Stats page: a move into or out of Completed is a finish made or taken back.
  void settleStats(queryClient, hobby);

  return queryClient.invalidateQueries({ queryKey: mediaKey(hobby, mediaId) });
}
