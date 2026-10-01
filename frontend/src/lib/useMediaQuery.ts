import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a media query matches, kept current as the window changes.
 *
 * A store over `matchMedia`, for `board/hiddenColumns.ts`'s reason: the answer lives outside
 * React and changes on its own, and `useSyncExternalStore` is how React reads a thing like that
 * without tearing. The snapshot is a boolean, so reading it twice can never look like a change.
 *
 * `fallback` is the answer where there is no `matchMedia` to ask, which is jsdom. A real browser
 * always has one; the component tests get whatever the caller says a window with no media
 * queries should, and `src/test/media.ts` gives them a window of a chosen width instead.
 */
export function useMediaQuery(query: string, fallback: boolean): boolean {
  const subscribe = useCallback(
    (changed: () => void) => {
      if (typeof window.matchMedia !== 'function') {
        return () => {};
      }

      const list = window.matchMedia(query);
      list.addEventListener('change', changed);
      return () => list.removeEventListener('change', changed);
    },
    [query],
  );

  return useSyncExternalStore(subscribe, () =>
    typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : fallback,
  );
}
