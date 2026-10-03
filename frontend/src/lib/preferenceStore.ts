import { useSyncExternalStore } from 'react';
import { readStored, writeStored } from './storage';

/**
 * Preferences kept in storage that more than one component has to hear, one store per family of
 * keys, and no provider.
 *
 * A theme is an attribute on the root, so nothing in React needs telling when it changes. The
 * columns a board leaves off and the pace you play at are not like that: each is set in one place
 * and read in another — Settings and the board, the journal drawer and the Backlog column behind
 * it — so both subscribe here, through `useSyncExternalStore`, and a component test still renders
 * without a wrapper. It was written inside `board/hiddenColumns.ts` and moved here when the pace
 * became the second store to need it, rather than copied.
 *
 * Three things it has to get right, and each has been got wrong once:
 *
 * - **The snapshot is the raw stored string.** `useSyncExternalStore` compares snapshots by
 *   identity and re-renders whenever they differ, so a store that parsed on every read would
 *   hand back a fresh object each time and re-render for ever. Two equal strings are one value;
 *   parse after, in a `useMemo` keyed on the string.
 * - **Another tab changing a value arrives as a `storage` event**, which fires only in *other*
 *   documents — which is why `write` tells this one itself. A null key is storage being cleared
 *   outright.
 * - **Storage refusing a write must not make the control dead.** In a browser set to block site
 *   data every write throws, and with the snapshot read from storage the change would vanish.
 *   This page keeps it instead, in a map that empties the first time a write succeeds. A spy on
 *   `Storage.prototype` refuses nothing in this repo's test harness, so the test for that spies
 *   on the instance; see `docs/design.md`.
 */
export function preferenceStore(prefix: string) {
  /** What this page was told while storage would not keep it, by key. */
  const unsaved = new Map<string, string>();

  const listeners = new Set<() => void>();

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(prefix)) {
        listener();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }

  /** What is kept under a key: this page's copy while storage refuses, otherwise storage's. */
  const read = (key: string): string | null => unsaved.get(key) ?? readStored(key);

  return {
    read,

    /** The raw value under a key, kept current as it changes here or in another tab. */
    useValue(key: string): string | null {
      return useSyncExternalStore(subscribe, () => read(key));
    },

    /** Keeps a value, or holds it for this page when storage will not, and tells every reader. */
    write(key: string, value: string): void {
      if (writeStored(key, value)) {
        unsaved.delete(key);
      } else {
        unsaved.set(key, value);
      }

      for (const listener of listeners) {
        listener();
      }
    },
  };
}
