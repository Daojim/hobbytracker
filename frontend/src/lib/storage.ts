/**
 * `localStorage`, for the preferences that live there, without letting it take the page down.
 *
 * Reading and writing storage both throw rather than fail quietly in more browsers than is
 * comfortable — Safari in private browsing on write, anything set to block site data on read.
 * Losing a preference is a small thing; taking the app down for it is not, and the theme's reads
 * run before the first paint, where an exception is a blank page rather than a missing colour.
 *
 * One pair for the whole app. The theme, the release calendar's open-or-closed and the columns a
 * board leaves off each carried their own copy of this until there were three.
 */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Whether the value was kept. Most callers can ignore the answer — the choice applies to this
 * page either way — but one that shares a preference between components has to hold on to it
 * itself when storage would not, or its control goes dead in exactly those browsers.
 */
export function writeStored(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
