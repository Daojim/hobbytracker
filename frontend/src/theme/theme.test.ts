import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DENSITY_ATTRIBUTE,
  DENSITY_KEY,
  JOURNAL_ATTRIBUTE,
  JOURNAL_KEY,
  THEME_ATTRIBUTE,
  THEME_KEY,
  applyDensity,
  applyJournalView,
  applyTheme,
  readDensity,
  readJournalView,
  readTheme,
  storeDensity,
  storeJournalView,
  storeTheme,
} from './theme';

describe('theme preferences', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    document.documentElement.removeAttribute(DENSITY_ATTRIBUTE);
    document.documentElement.removeAttribute(JOURNAL_ATTRIBUTE);
    vi.restoreAllMocks();
  });

  it('starts on system, which is the only value that defers to the OS', () => {
    expect(readTheme()).toBe('system');
    expect(readDensity()).toBe('comfortable');
  });

  it('reads back what was stored', () => {
    storeTheme('ember');
    storeDensity('compact');

    expect(readTheme()).toBe('ember');
    expect(readDensity()).toBe('compact');
  });

  it('falls back to system when the stored value is not a theme we ship', () => {
    // Storage outlives the code that wrote it. A theme dropped in a later version, or a value
    // typed in by hand, must not leave the app stamped with an attribute no CSS answers — which
    // renders as unstyled text on an unstyled ground rather than as anything diagnosable.
    localStorage.setItem(THEME_KEY, 'midnight');
    localStorage.setItem(DENSITY_KEY, 'roomy');

    expect(readTheme()).toBe('system');
    expect(readDensity()).toBe('comfortable');
  });

  it('stamps a chosen theme on the root element', () => {
    applyTheme('console');

    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('console');
  });

  it('leaves no attribute at all for system, because the media query has to govern', () => {
    // Writing data-theme="system" would be a value no palette block matches, and would also stop
    // `:root:not([data-theme])` matching — so the OS preference would be ignored twice over.
    applyTheme('ember');
    applyTheme('system');

    expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
  });

  it('stamps density, which has no system option and so is always present', () => {
    applyDensity('compact');
    expect(document.documentElement.getAttribute(DENSITY_ATTRIBUTE)).toBe('compact');

    applyDensity('comfortable');
    expect(document.documentElement.getAttribute(DENSITY_ATTRIBUTE)).toBe('comfortable');
  });

  it('opens the journal in a drawer until told otherwise', () => {
    expect(readJournalView()).toBe('drawer');

    storeJournalView('modal');
    expect(readJournalView()).toBe('modal');

    localStorage.setItem(JOURNAL_KEY, 'sidebar');
    expect(readJournalView()).toBe('drawer');
  });

  it('stamps the journal view, which like density is always present', () => {
    applyJournalView('modal');
    expect(document.documentElement.getAttribute(JOURNAL_ATTRIBUTE)).toBe('modal');

    applyJournalView('drawer');
    expect(document.documentElement.getAttribute(JOURNAL_ATTRIBUTE)).toBe('drawer');
  });

  it('keeps working when storage refuses', () => {
    // Safari in private browsing throws on setItem rather than returning; a browser set to block
    // site data throws on the read. Losing the preference is acceptable, taking the app down
    // with it is not — and this runs before the first paint, where an exception is a blank page.
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => storeTheme('ember')).not.toThrow();
    expect(readTheme()).toBe('system');
  });

  it('agrees with the script that runs before the first paint', () => {
    // index.html stamps the attributes before the bundle loads, or the page renders in the
    // default theme and then swaps — the flash every themed app gets wrong once. It cannot
    // import this module, so it repeats the keys as literals. This is what stops the two drifting
    // apart silently: rename a key here and the copy in index.html keeps reading the old one, and
    // the preference simply stops being honoured with nothing failing.
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(html).toContain(THEME_KEY);
    expect(html).toContain(DENSITY_KEY);
    expect(html).toContain(THEME_ATTRIBUTE);
    expect(html).toContain(DENSITY_ATTRIBUTE);
  });
});
