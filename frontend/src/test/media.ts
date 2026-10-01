import { vi } from 'vitest';

/**
 * A window this many pixels wide, as far as `matchMedia` can tell.
 *
 * jsdom has no media queries at all — `window.matchMedia` is simply not there — so a component
 * that asks one gets whatever its caller says a window without them should get, which is the
 * board side by side. This answers `min-width` queries against a width, the only kind the app
 * asks, and throws on any other rather than guessing at it.
 *
 * `resize` moves the width and tells every listener, as a browser does when a query's answer
 * changes. Undo it with `vi.unstubAllGlobals()`.
 */
export function windowOfWidth(width: number) {
  let current = width;
  const listeners = new Set<() => void>();

  const matches = (query: string) => {
    const found = /^\(min-width:\s*([\d.]+)(rem|px)\)$/.exec(query);
    if (found === null) {
      throw new Error(`windowOfWidth answers min-width queries, not ${query}`);
    }

    return current >= Number(found[1]) * (found[2] === 'rem' ? 16 : 1);
  };

  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    get matches() {
      return matches(query);
    },
    addEventListener: (_type: 'change', listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: 'change', listener: () => void) => listeners.delete(listener),
  }));

  return {
    resize(next: number) {
      current = next;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}
