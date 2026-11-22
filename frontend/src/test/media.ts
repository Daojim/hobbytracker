import { vi } from 'vitest';

/**
 * A window this many pixels wide, as far as `matchMedia` can tell.
 *
 * jsdom has no media queries at all — `window.matchMedia` is simply not there — so a component
 * that asks one gets whatever its caller says a window without them should get, which is the
 * board side by side. This answers `min-width` queries against a width, whether motion is
 * reduced and whether the device is dark, the only three kinds the app asks, and throws on any
 * other rather than guessing at it.
 *
 * `reducedMotion` is the reader's setting, off unless a test says otherwise. The picker's wheel
 * is the first thing to read it: under it the pick shows with no spin.
 *
 * `dark` is the device's colour scheme, light unless a test says otherwise. The panel that makes
 * a theme of your own reads it, to start from the theme System is showing.
 *
 * `resize` moves the width and tells every listener, as a browser does when a query's answer
 * changes. Undo it with `vi.unstubAllGlobals()`.
 */
export function windowOfWidth(width: number, { reducedMotion = false, dark = false } = {}) {
  let current = width;
  const listeners = new Set<() => void>();

  const matches = (query: string) => {
    if (query === '(prefers-reduced-motion: reduce)') {
      return reducedMotion;
    }

    if (query === '(prefers-color-scheme: dark)') {
      return dark;
    }

    const found = /^\(min-width:\s*([\d.]+)(rem|px)\)$/.exec(query);
    if (found === null) {
      throw new Error(
        `windowOfWidth answers min-width, reduced-motion and colour-scheme queries, not ${query}`,
      );
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
