import type { LibraryItem } from '../api/types';

/**
 * Waiting for HowLongToBeat without anybody having to press anything.
 *
 * Adding a title queues a lookup and replies immediately — nothing a person does waits on a site
 * with a politeness floor of seconds per request — so the hours land on the row some seconds
 * after the card is already on screen. Until this existed the card simply stayed blank: the only
 * things that refetched a column were a drag, a note, or a reload, so the usual way to discover
 * your estimate had arrived was to go and do something unrelated.
 *
 * So the column asks again while, and only while, it is waiting for something. `hltbPending` is
 * the server saying so, and it is read off `hltb_checked_at` rather than off the hours — which
 * is the entire reason this is safe to loop on. A title the matcher refuses is stamped as
 * checked with no hours, so it stops being pending and the asking stops. Looping on "the hours
 * are null" instead would poll for ever on every unmatchable title, of which a real library has
 * several.
 */

/** How long to leave between asks. Comfortably longer than the worker's two-second floor. */
export const ESTIMATE_POLL_MS = 3_000;

/**
 * How long to keep asking before giving up on a title.
 *
 * A backstop rather than a timeout anybody should reach: the queue is drained one title at a
 * time behind that floor, so a board seeded with a few dozen at once genuinely takes a while.
 * What it exists for is the case where no answer is ever coming — `Hltb:Enabled` switched off,
 * or the site refusing us for a spell — where `hltb_checked_at` stays null and there is
 * otherwise nothing to stop the board asking for the rest of the session.
 */
export const ESTIMATE_POLL_BUDGET_MS = 90_000;

/**
 * The titles still waiting, as a value that changes only when the set does.
 *
 * A string rather than an array so it can be an effect's dependency: a refetch that answers with
 * the same rows would otherwise be a new array every time, and restart the budget for ever.
 */
export function waitingOn(items: readonly LibraryItem[] | undefined): string {
  return (items ?? [])
    .filter((item) => item.hltbPending)
    .map((item) => item.mediaId)
    .join(',');
}
