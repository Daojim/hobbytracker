import { useEffect, useState } from 'react';

/**
 * The value a moment after it stopped changing.
 *
 * Searching reaches IGDB on every call — the API caches nothing, deliberately, so that a search
 * always reflects the catalogue as it is now. That makes the debounce the only thing standing
 * between typing "hollow" and six requests to a service that never agreed to serve us.
 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    // Clearing on every change is what makes this a debounce rather than a delay: each keystroke
    // throws away the pending one and starts the wait again.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
