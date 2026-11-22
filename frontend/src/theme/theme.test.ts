import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { groundOf } from '../test/palette';
import { derive } from './derive';
import { PALETTES } from './palettes';
import {
  DEFAULT_JOURNAL,
  DENSITY_ATTRIBUTE,
  DENSITY_KEY,
  JOURNAL_ATTRIBUTE,
  JOURNAL_KEY,
  JOURNAL_VIEWS,
  MINE_KEY,
  THEMES,
  THEME_ATTRIBUTE,
  THEME_KEY,
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
  type Mine,
} from './theme';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

/** The pre-paint script, run here as a browser would run it on a load. */
const runPrePaint = () => {
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
  expect(script, 'the pre-paint script').toBeDefined();
  new Function(script!)();
};

/** The root's inline declarations, by name: what a theme of your own leaves on it. */
const inline = () => {
  const style = document.documentElement.style;
  return Object.fromEntries(
    Array.from({ length: style.length }, (_, at) => style.item(at)).map((name) => [
      name,
      style.getPropertyValue(name),
    ]),
  );
};

/** The first theme-color tag with no media query, which is a chosen theme's bar. */
const chosenBar = () =>
  document.head.querySelector('meta[name="theme-color"]:not([media])')?.getAttribute('content');

/** Forest, from the workshop: a theme of your own made from Shelf Dark, which reads throughout. */
const forest = derive(PALETTES['shelf-dark'], {
  sunken: '#111a15',
  surface: '#1b261f',
  accent: '#e3b04b',
});
const FOREST: Mine = { from: 'shelf-dark', scheme: forest.scheme, tokens: forest.tokens };

const keep = (record: unknown) => {
  localStorage.setItem(THEME_KEY, 'mine');
  localStorage.setItem(MINE_KEY, typeof record === 'string' ? record : JSON.stringify(record));
};

describe('theme preferences', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    document.documentElement.removeAttribute(DENSITY_ATTRIBUTE);
    document.documentElement.removeAttribute(JOURNAL_ATTRIBUTE);
    document.documentElement.removeAttribute('style');
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

  it('opens the journal in a modal until told otherwise', () => {
    // Since #27: the user's own ask. A browser that pressed Drawer at some point has it stored
    // and keeps it; only a browser that never chose changes.
    expect(DEFAULT_JOURNAL).toBe('modal');
    expect(readJournalView()).toBe('modal');

    storeJournalView('drawer');
    expect(readJournalView()).toBe('drawer');

    localStorage.setItem(JOURNAL_KEY, 'sidebar');
    expect(readJournalView()).toBe('modal');
  });

  describe('the default journal, in the three places that say it', () => {
    // theme.ts is one. The pre-paint script is the second: it stamps the attribute on a load, it
    // falls back on its own when nothing is stored, and since useTheme applies nothing on mount,
    // a script left on the old default would paint the old box under a menu saying the new one.
    // index.css is the third: when storage refuses outright, the script stamps nothing, and the
    // variant decides what an absent attribute is.
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

    /**
     * Whether the stylesheet's `modal:` variant holds for an element, with the root as given.
     *
     * The variant is `&:where(<the root's state> *)`, which keeps a modal class's weight at
     * nought, and it is asked here as the plain descendant selector it means: jsdom's engine
     * answers false for every `:not()` inside a `:where()`, whatever the root says, measured on
     * 21 November 2026, where it reads the same selector written plainly as a browser does.
     */
    const isModal = (journal: string | null) => {
      const variant = /@custom-variant modal \((.*)\);/.exec(css)?.[1];
      const ancestor = variant === undefined ? undefined : /^&:where\((.*) \*\)$/.exec(variant)?.[1];
      expect(ancestor, 'the modal variant, as &:where(… *)').toBeDefined();
      const selector = `${ancestor!} &`;

      if (journal === null) {
        document.documentElement.removeAttribute(JOURNAL_ATTRIBUTE);
      } else {
        document.documentElement.setAttribute(JOURNAL_ATTRIBUTE, journal);
      }

      const probe = document.createElement('div');
      probe.className = 'probe';
      document.body.append(probe);
      try {
        return probe.matches(selector!.replace('&', '.probe'));
      } finally {
        probe.remove();
      }
    };

    it('is what the pre-paint script stamps when nothing is stored, or nothing it knows', () => {
      runPrePaint();
      expect(document.documentElement.getAttribute(JOURNAL_ATTRIBUTE)).toBe(DEFAULT_JOURNAL);

      localStorage.setItem(JOURNAL_KEY, 'sidebar');
      runPrePaint();
      expect(document.documentElement.getAttribute(JOURNAL_ATTRIBUTE)).toBe(DEFAULT_JOURNAL);
    });

    it('leaves a stored choice to the pre-paint script, either one', () => {
      for (const view of JOURNAL_VIEWS) {
        localStorage.setItem(JOURNAL_KEY, view.value);
        runPrePaint();
        expect(document.documentElement.getAttribute(JOURNAL_ATTRIBUTE)).toBe(view.value);
      }
    });

    it('is what the stylesheet draws when the root says nothing', () => {
      expect(isModal(null)).toBe(DEFAULT_JOURNAL === 'modal');
      expect(isModal('modal')).toBe(true);
      expect(isModal('drawer')).toBe(false);
    });
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

/**
 * A theme of your own (#28): one of the eight underneath, stamped as the attribute so its block
 * answers anything not kept, and the twenty values kept over it on the root, where an inline
 * declaration outranks any selector. Kept per browser under a key of its own beside the choice.
 */
describe('a theme of your own', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    document.documentElement.removeAttribute(DENSITY_ATTRIBUTE);
    document.documentElement.removeAttribute(JOURNAL_ATTRIBUTE);
    document.documentElement.removeAttribute('style');
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
    vi.restoreAllMocks();
  });

  describe('kept', () => {
    it('is kept under a key of its own, and read back as it was kept', () => {
      expect(storeMine(FOREST)).toBe(true);

      expect(JSON.parse(localStorage.getItem(MINE_KEY)!)).toEqual({
        from: 'shelf-dark',
        scheme: 'dark',
        tokens: forest.tokens,
      });
      expect(readMine()).toEqual(FOREST);
    });

    it('is the theme chosen only while there is one to wear', () => {
      keep(FOREST);
      expect(readTheme()).toBe('mine');

      localStorage.removeItem(MINE_KEY);
      expect(readTheme()).toBe('system');
    });

    it('is refused whole when it is not JSON, or its base is gone, and the choice is System', () => {
      for (const record of [
        '{"from":"dusk",',
        JSON.stringify({ ...FOREST, from: 'midnight' }),
        JSON.stringify({ ...FOREST, from: 'system' }),
        JSON.stringify({ ...FOREST, from: 'toString' }),
        JSON.stringify({ from: 'shelf-dark', scheme: 'dark' }),
        'null',
      ]) {
        keep(record);
        expect(readMine(), record).toBeNull();
        expect(readTheme(), record).toBe('system');
      }
    });

    it('skips a value that is not a colour, so the base’s own answers for it', () => {
      keep({
        ...FOREST,
        tokens: {
          ...FOREST.tokens,
          '--accent': 'red;background:url(x)',
          '--muted': 'notacolour',
          '--fg': 42,
          'surface': '#ffffff',
        },
      });

      const read = readMine()!;
      expect(read).not.toBeNull();
      expect(Object.keys(read.tokens)).not.toContain('--accent');
      expect(Object.keys(read.tokens)).not.toContain('--muted');
      expect(Object.keys(read.tokens)).not.toContain('--fg');
      expect(Object.keys(read.tokens)).not.toContain('surface');
      expect(read.tokens['--surface']).toBe('#1b261f');
      expect(read.tokens['--scrim']).toBe('rgb(0 0 0 / 0.6)');
      expect(read.tokens['--card-shadow']).toBe(FOREST.tokens['--card-shadow']);
    });

    it('takes a scheme it does not know as dark', () => {
      keep({ ...FOREST, scheme: 'dim' });
      expect(readMine()?.scheme).toBe('dark');
      keep({ ...FOREST, scheme: 'light' });
      expect(readMine()?.scheme).toBe('light');
    });

    it('says so when storage refuses, and reads nothing back', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('denied');
      });
      expect(storeMine(FOREST)).toBe(false);

      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });
      expect(readMine()).toBeNull();
      expect(readTheme()).toBe('system');
    });

    it('is chosen as mine, which the menu stores like any other theme', () => {
      storeTheme('mine');
      expect(localStorage.getItem(THEME_KEY)).toBe('mine');
    });
  });

  describe('worn', () => {
    it('stamps its base, every value inline, its color-scheme and the bar', () => {
      applyMine(FOREST);

      expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('shelf-dark');
      expect(inline()).toEqual({ ...FOREST.tokens, 'color-scheme': 'dark' });
      expect(chosenBar()).toBe('#111a15');
    });

    it('takes every inline value off when another theme is chosen, System included', () => {
      // The values sit over the base's block, where they outrank any selector, so one left
      // behind would paint over the theme chosen next, with no error.
      applyMine(FOREST);
      applyTheme('ember');
      expect(inline()).toEqual({});
      expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('ember');

      applyMine(FOREST);
      applyTheme('system');
      expect(inline()).toEqual({});
      expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
      expect(chosenBar()).toBeUndefined();
    });

    it('leaves nothing of the last one behind when worn again', () => {
      // The panel wears each change as it is made, so it is worn over and over.
      applyMine({ ...FOREST, tokens: { ...FOREST.tokens, '--ok': '#00ff00' } });
      const withoutOk = Object.fromEntries(
        Object.entries(FOREST.tokens).filter(([name]) => name !== '--ok'),
      );
      applyMine({ ...FOREST, tokens: withoutOk });

      expect(inline()).toEqual({ ...withoutOk, 'color-scheme': 'dark' });
      expect(document.head.querySelectorAll('meta[name="theme-color"]:not([media])')).toHaveLength(1);
    });
  });

  describe('before the bundle', () => {
    it('is stamped by the pre-paint script: its base, its values, its scheme and the bar', () => {
      keep(FOREST);
      runPrePaint();

      expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('shelf-dark');
      expect(inline()).toEqual({ ...FOREST.tokens, 'color-scheme': 'dark' });
      expect(chosenBar()).toBe('#111a15');
    });

    it('falls back to System for a record it cannot read, with no error', () => {
      for (const record of [
        '{"from":"dusk",',
        JSON.stringify({ ...FOREST, from: 'midnight' }),
        JSON.stringify({ ...FOREST, from: 'toString' }),
        JSON.stringify({ from: 'shelf-dark', scheme: 'dark' }),
        'null',
      ]) {
        keep(record);
        expect(runPrePaint, record).not.toThrow();
        expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE), record).toBe(false);
        expect(inline(), record).toEqual({});
        expect(chosenBar(), record).toBeUndefined();
        // The rest of the script still ran.
        expect(document.documentElement.getAttribute(JOURNAL_ATTRIBUTE)).toBe(DEFAULT_JOURNAL);
      }
    });

    it('stamps what the bundle’s reader keeps, value for value, and nothing it skips', () => {
      // The script cannot import theme.ts, so it repeats the reader's two rules; this runs both
      // on the same record, with every kind of value the reader refuses in it.
      const record = {
        ...FOREST,
        tokens: {
          ...FOREST.tokens,
          '--accent': 'red;background:url(x)',
          '--muted': 'notacolour',
          '--danger': 'RED',
          '--ok': '#12345',
          '--fg': 42,
          'surface': '#ffffff',
          '--Line': '#ffffff',
        },
      };
      keep(record);
      runPrePaint();

      const { 'color-scheme': scheme, ...stamped } = inline();
      expect(scheme).toBe('dark');
      expect(stamped).toEqual(readMine()!.tokens);
    });

    it('gives the bar the base’s ground when the kept one is not a colour', () => {
      keep({ ...FOREST, tokens: { ...FOREST.tokens, '--sunken': 'transparent' } });
      runPrePaint();

      expect(chosenBar()).toBe(groundOf("[data-theme='shelf-dark'] {"));
    });

    it('stamps nothing when storage refuses, and the page still loads', () => {
      keep(FOREST);
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });

      expect(runPrePaint).not.toThrow();
      expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
      expect(inline()).toEqual({});
    });

    it('reads the key theme.ts keeps it under', () => {
      expect(html).toContain(`'${MINE_KEY}'`);
    });
  });
});
