import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

/**
 * An overlay whose openness is a history entry, so the browser's Back closes it.
 *
 * The gesture this exists for is a phone's. Android has one Back, it means "out of this", and
 * over an open drawer it took the whole app away instead — because the drawer was component
 * state and the history knew nothing about it. Opening pushes an entry, so the press has
 * something of its own to pop; closing by any other route goes back, so the entry leaves with
 * the thing it stood for.
 *
 * **The openness is read out of the entry rather than kept beside it**, and that is the whole
 * design. A copy in component state has to be told about every pop, and the moment the two
 * disagree the overlay is either shut over its own entry — one more press between the reader and
 * the way out, per journal they ever opened — or open with nothing behind it. Derived, there is
 * one implementation of closing and the browser's button is already using it.
 *
 * Three things it has to get right, none of them visible in development:
 *
 * - **The push takes a path, never the location object.** react-router treats any value carrying
 *   `pathname`/`search`/`hash`/`state`/`key` as a whole location and uses *its* state, so
 *   `navigate(location, { state })` quietly pushes the old entry's state and key again and
 *   nothing opens. A `Partial<Path>` is what makes the second argument count.
 * - **What comes back out is checked rather than trusted.** History state outlives the code that
 *   wrote it — the browser hands it back after a reload, from whichever build was running then —
 *   so anything that is not an id reads as "nothing open", the fallback a stored theme gets for
 *   the same reason.
 * - **`close` goes back rather than clearing anything**, and only while something is open. A
 *   guard that never fires is cheap; without it a stray call walks the reader off the page.
 *
 * A reload comes back to the overlay rather than to the page under it, because that is what a
 * history entry is: the browser hands the state back. On a phone that is an accidental
 * pull-to-refresh returning you to what you were reading, and Back still closes it.
 *
 * Nothing here remounts the page. The entry carries the same path, so the router matches the
 * same route and React reconciles rather than rebuilding — which is what lets a board keep its
 * sorts, its year and its open Dropped well across an open-and-close.
 */
export function useOverlayHistory(name: string) {
  const navigate = useNavigate();
  const { pathname, search, hash, state } = useLocation();

  const held = carriedBy(state)[name];

  /** Which thing the overlay is open for, by id, or null while it is shut. */
  const openFor = typeof held === 'number' ? held : null;

  const open = useCallback(
    (id: number) => {
      void navigate({ pathname, search, hash }, { state: { ...carriedBy(state), [name]: id } });
    },
    [navigate, pathname, search, hash, state, name],
  );

  const close = useCallback(() => {
    if (openFor !== null) {
      void navigate(-1);
    }
  }, [navigate, openFor]);

  return { openFor, open, close };
}

/** History state, as something a key can safely be read off. */
function carriedBy(state: unknown): Record<string, unknown> {
  return typeof state === 'object' && state !== null ? (state as Record<string, unknown>) : {};
}
