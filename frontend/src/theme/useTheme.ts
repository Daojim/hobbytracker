import { useCallback, useState } from 'react';
import {
  type Density,
  type Theme,
  applyDensity,
  applyTheme,
  readDensity,
  readTheme,
  storeDensity,
  storeTheme,
} from './theme';

/**
 * The current preferences, and the two setters that change them.
 *
 * State is held here only so the menu can show a tick beside the current choice — the appearance
 * itself comes from the attribute on the root element, which index.html has already stamped
 * before React runs.
 *
 * So this deliberately does *not* apply anything on mount. Re-applying the value already on the
 * element would be harmless, but it would also mean a broken pre-paint script showed up as a
 * flash of the wrong palette rather than as a failing test: `e2e/theme.spec.ts` blocks the
 * bundle and asserts the attribute is stamped anyway, which only means something while the
 * script is the one thing that stamps it.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [density, setDensityState] = useState<Density>(readDensity);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    storeTheme(next);
    setThemeState(next);
  }, []);

  const setDensity = useCallback((next: Density) => {
    applyDensity(next);
    storeDensity(next);
    setDensityState(next);
  }, []);

  return { theme, density, setTheme, setDensity };
}
