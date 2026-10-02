import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { groundOf } from '../test/palette';
import {
  DENSITY_ATTRIBUTE,
  DENSITY_KEY,
  JOURNAL_ATTRIBUTE,
  JOURNAL_KEY,
  THEMES,
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
    document.head
      .querySelectorAll('meta[name="theme-color"], style[data-palette]')
      .forEach((el) => el.remove());
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

  it('is offering no theme the pre-paint script would refuse to stamp', () => {
    // The keys above were the only copy this checked, and they are not the only copy there is.
    // That script carries its own literal list of theme names and stamps nothing for a value
    // outside it — deliberately, because that is also how an unknown stored value falls back to
    // the system palette. The cost is that adding a theme here and forgetting it there is
    // invisible in development and silent in production: the menu offers the theme, choosing it
    // works, and then every reload paints the default first and swaps once the bundle mounts.
    // Which is the flash the script exists to prevent, on the one theme nobody tested for it.
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    for (const theme of THEMES) {
      if (theme.value === 'system') {
        continue;
      }

      expect(html, `the pre-paint script never stamps ${theme.label}`).toContain(
        `'${theme.value}'`,
      );
    }
  });

  it('gives the bar above the page each theme’s ground before the first paint', () => {
    // Android colours its status bar, and Chrome its address bar, from <meta name="theme-color">,
    // and the pre-paint script sets that from the stored theme. So the script carries a colour
    // per theme: a copy of index.css's --sunken that nothing else keeps honest. A ground changed
    // there and not here puts the old colour above the board, on a phone, where nobody working at
    // a desktop would ever see it.
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    for (const theme of THEMES) {
      if (theme.value === 'system') {
        continue;
      }

      const copy = new RegExp(`'${theme.value}':\\s*'(#[0-9a-f]{6})'`).exec(html)?.[1];
      expect(copy, `the pre-paint script's bar colour for ${theme.label}`).toBe(
        groundOf(`[data-theme='${theme.value}'] {`),
      );
    }
  });

  it('leaves the bar to the device under System, one colour per scheme', () => {
    // Two tags with media queries, written into index.html and never touched by script, so a
    // phone switching to dark at sunset takes the bar with it, as the palette itself does.
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const head = new DOMParser().parseFromString(html, 'text/html').head;
    const bar = (scheme: string) =>
      head
        .querySelector(`meta[name="theme-color"][media="(prefers-color-scheme: ${scheme})"]`)
        ?.getAttribute('content');

    expect(bar('light')).toBe(groundOf("[data-theme='shelf-light'] {"));
    expect(bar('dark')).toBe(groundOf(':root:not([data-theme]) {'));
  });

  it('moves the bar when a theme is chosen, and hands it back to the device for System', () => {
    // The pre-paint script only runs on a load, and choosing from the menu happens after one.
    // Without this a phone keeps the old theme's colour above the new theme until a reload.
    const style = document.createElement('style');
    style.dataset['palette'] = '';
    style.textContent = ['ember', 'frost']
      .map((theme) => `[data-theme='${theme}'] { --sunken: ${groundOf(`[data-theme='${theme}'] {`)}; }`)
      .join('\n');
    document.head.append(style);

    // System's two, as index.html writes them. As attributes, because jsdom has no `media`
    // property on a <meta> for a test to set, and the attribute is what a selector reads anyway.
    for (const [scheme, marker] of [
      ['light', "[data-theme='shelf-light'] {"],
      ['dark', ':root:not([data-theme]) {'],
    ] as const) {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('media', `(prefers-color-scheme: ${scheme})`);
      meta.setAttribute('content', groundOf(marker));
      document.head.append(meta);
    }

    // A browser takes the first theme-color whose media matches, so a chosen theme's has to come
    // first and carry no media at all.
    const first = () => document.head.querySelector('meta[name="theme-color"]');
    const chosen = () => document.head.querySelectorAll('meta[name="theme-color"]:not([media])');

    applyTheme('ember');
    expect(first()?.hasAttribute('media')).toBe(false);
    expect(first()?.getAttribute('content')).toBe(groundOf("[data-theme='ember'] {"));

    applyTheme('frost');
    expect(first()?.getAttribute('content')).toBe(groundOf("[data-theme='frost'] {"));
    expect(chosen()).toHaveLength(1);

    applyTheme('system');
    expect(chosen()).toHaveLength(0);
    expect(document.head.querySelectorAll('meta[name="theme-color"][media]')).toHaveLength(2);
  });
});
