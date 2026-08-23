import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

/**
 * `localStorage`, which the environment does not otherwise provide.
 *
 * jsdom implements it, but its value does not reach the test globals here: Node 22 and later
 * declare `localStorage` themselves behind an experimental flag, and the environment does not
 * overwrite a global that is already declared — so the name exists and answers to nothing.
 *
 * The condition asks whether the thing present can actually store, rather than whether it is
 * `undefined`. That distinction is the whole bug: the global is declared, so an existence check
 * passes and every call then fails on a missing method.
 *
 * A real browser always has it, so this is a gap in the harness rather than a case the app has
 * to survive — the app's own handling of storage refusing is tested explicitly in
 * `src/theme/theme.test.ts` by making these methods throw.
 */
if (typeof globalThis.localStorage?.clear !== 'function') {
  class MemoryStorage implements Storage {
    #entries = new Map<string, string>();

    get length() {
      return this.#entries.size;
    }

    key(index: number) {
      return [...this.#entries.keys()][index] ?? null;
    }

    getItem(key: string) {
      return this.#entries.get(key) ?? null;
    }

    setItem(key: string, value: string) {
      this.#entries.set(key, String(value));
    }

    removeItem(key: string) {
      this.#entries.delete(key);
    }

    clear() {
      this.#entries.clear();
    }

    [name: string]: unknown;
  }

  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

// `error` rather than `warn`: an unhandled request means the client asked for a URL the test did
// not expect, which is usually the bug the test was written to catch.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
