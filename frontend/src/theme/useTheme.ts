import { useCallback, useState } from 'react';
import {
  type Density,
  type JournalView,
  type Mine,
  type ThemeChoice,
  applyDensity,
  applyJournalView,
  applyMine,
  applyTheme,
  readDensity,
  readJournalView,
  readMine,
  readTheme,
  storeDensity,
  storeJournalView,
  storeMine,
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
 *
 * A theme of your own is held here as well as kept, so that choosing it wears the record this
 * page has, which is the one it was shown, rather than asking storage again.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>(readTheme);
  const [mine, setMine] = useState<Mine | null>(readMine);
  const [density, setDensityState] = useState<Density>(readDensity);
  const [journalView, setJournalViewState] = useState<JournalView>(readJournalView);

  const setTheme = useCallback(
    (next: ThemeChoice) => {
      if (next === 'mine') {
        if (mine === null) {
          return;
        }
        applyMine(mine);
      } else {
        applyTheme(next);
      }
      storeTheme(next);
      setThemeState(next);
    },
    [mine],
  );

  /**
   * Keeps a theme of your own and chooses it. The choice is stored only if the theme was, so that
   * storage refusing leaves the next load on the theme this one started from, while this page
   * wears it for the rest of the visit.
   */
  const keepMine = useCallback((next: Mine) => {
    applyMine(next);
    if (storeMine(next)) {
      storeTheme('mine');
    }
    setMine(next);
    setThemeState('mine');
  }, []);

  /** Wears the chosen theme again, as the panel's Cancel puts back what was worn before it. */
  const putBack = useCallback(() => {
    if (theme === 'mine' && mine !== null) {
      applyMine(mine);
    } else {
      applyTheme(theme === 'mine' ? 'system' : theme);
    }
  }, [theme, mine]);

  const setDensity = useCallback((next: Density) => {
    applyDensity(next);
    storeDensity(next);
    setDensityState(next);
  }, []);

  const setJournalView = useCallback((next: JournalView) => {
    applyJournalView(next);
    storeJournalView(next);
    setJournalViewState(next);
  }, []);

  return {
    theme,
    mine,
    density,
    journalView,
    setTheme,
    keepMine,
    putBack,
    setDensity,
    setJournalView,
  };
}
