/**
 * Which theme the app is wearing, and how tightly it is packed.
 *
 * Themes are CSS and nothing more: every value lives in index.css, and choosing one is a matter
 * of stamping an attribute on the root element. That is why there is no context provider here —
 * a component test renders without a wrapper, and a component never asks what theme it is in,
 * because none of them knows a colour.
 *
 * The storage keys and attribute names are exported rather than inlined because index.html
 * repeats them: the pre-paint script cannot import this module, and two copies of a name that
 * must agree is the failure this codebase keeps paying for. `theme.test.ts` reads index.html and
 * asserts the copies still match.
 *
 * Since #28 there is one theme that is not CSS alone: a theme of your own, made from one of the
 * eight. Its base is stamped as the attribute, as the base itself would be, and its twenty values
 * are set inline on the root over the base's block, where they outrank any selector. Everything
 * here that applies a theme takes them off first.
 */

import { readStored, writeStored } from '../lib/storage';
import type { Part } from './pairs';

export const THEME_ATTRIBUTE = 'data-theme';
export const DENSITY_ATTRIBUTE = 'data-density';
export const JOURNAL_ATTRIBUTE = 'data-journal';

export const THEME_KEY = 'hobbytracker.theme';
export const DENSITY_KEY = 'hobbytracker.density';
export const JOURNAL_KEY = 'hobbytracker.journal';

/**
 * A theme of your own, kept beside the choice: its base, light or dark, and the twenty values
 * worked out when it was kept. Stored as worked out, rather than as the three colours picked, so
 * that the pre-paint script only has to copy them: it cannot work anything out before the bundle.
 * The choice itself is `mine` under `THEME_KEY`, and choosing another theme leaves this alone, so
 * yours is there to choose again.
 */
export const MINE_KEY = 'hobbytracker.theme.mine';

/**
 * `system` is not a palette — it is the absence of a choice, and it stamps no attribute so the
 * `prefers-color-scheme` query in index.css keeps governing. Everything else names a block there.
 */
export const THEMES = [
  { value: 'system', label: 'System', hint: 'Follows your device' },
  // Light, then the two mid-tones, then dark. The menu is this list in order, and grouping it by
  // how bright the room is means the choice a reader is making — usually "something lighter" or
  // "something darker" — runs the same way down the panel.
  { value: 'shelf-light', label: 'Shelf Light', hint: 'Warm paper' },
  { value: 'frost', label: 'Frost', hint: 'Cool paper' },
  { value: 'almanac', label: 'Almanac', hint: 'Aged paper' },
  { value: 'dusk', label: 'Dusk', hint: 'Dim slate' },
  // The second mid-tone, and the only warm one. It sits at 0.0414 against Dusk's 0.0580 — dimmer
  // than Dusk but nowhere near the darks, which are all around 0.010. Named by the colour it is
  // rather than by a mood, because that is what it was asked for by.
  { value: 'blood-red', label: 'Blood Red', hint: 'Gold on blood' },
  { value: 'shelf-dark', label: 'Shelf Dark', hint: 'Warm dark' },
  { value: 'console', label: 'Console', hint: 'Cool and deep' },
  { value: 'ember', label: 'Ember', hint: 'Charcoal and red' },
] as const;

export const DENSITIES = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
] as const;

/**
 * Where the journal opens. Both are the same dialog with the same focus handling and the same
 * contents — only where it sits differs, which is why this is an attribute and a CSS variant
 * rather than two components. A drawer keeps the board visible beside it; a modal puts the pass
 * you are writing about in the middle of the screen, which reads better on a wide monitor where
 * a right-hand drawer is a long way from where you were looking.
 */
export const JOURNAL_VIEWS = [
  { value: 'drawer', label: 'Drawer' },
  { value: 'modal', label: 'Modal' },
] as const;

export type Theme = (typeof THEMES)[number]['value'];
export type Density = (typeof DENSITIES)[number]['value'];
export type JournalView = (typeof JOURNAL_VIEWS)[number]['value'];

/** One of the eight: a theme with a block of its own in index.css, which System is not. */
export type NamedTheme = Exclude<Theme, 'system'>;

/**
 * The twenty custom properties every palette block in index.css sets, in its order. What a theme
 * *is*, and so what a theme of your own has to say: `palettes.test.ts` holds every block to this
 * list, name for name and in order.
 */
export const TOKENS = [
  '--surface',
  '--sunken',
  '--hover',
  '--line',
  '--line-soft',
  '--fg',
  '--muted',
  '--accent',
  '--danger',
  '--ok',
  '--drop',
  '--dropped',
  '--scrim',
  '--well',
  '--rating-low',
  '--rating-mid',
  '--rating-high',
  '--danger-fg',
  '--card-shadow',
  '--card-line',
] as const;

export type Token = (typeof TOKENS)[number];
export type Tokens = Readonly<Record<Token, string>>;

/** A token as a utility names it, without its two hyphens: `surface`, `danger-fg`. */
export type TokenName = Token extends `--${infer Name}` ? Name : never;

/** Light or dark: what a block's `color-scheme` says, and what themes a range input's track. */
export type Scheme = 'light' | 'dark';

/** A theme's values: one of the eight's block, or a theme of your own worked out from one. */
export interface Palette {
  readonly tokens: Tokens;
  readonly scheme: Scheme;
}

/** The three colours a person sets for a theme of their own: the ground, the card and the accent. */
export type Picks = Readonly<Record<Part, string>>;

/**
 * What the palette's list can have chosen: one of `THEMES`, or a theme of your own. `THEMES`
 * itself stays the eight and System, because the contrast test's palettes and the pre-paint
 * test's grounds are derived from it, and a theme of your own has no block for either to find.
 */
export type ThemeChoice = Theme | 'mine';

/** A theme of your own as it is kept and worn: what `MINE_KEY` holds, read back and checked. */
export interface Mine {
  readonly from: NamedTheme;
  readonly scheme: Scheme;
  /** The kept values that can be stamped, by token. One that cannot is left to the base's block. */
  readonly tokens: Readonly<Record<string, string>>;
}

/**
 * What a kept value may be called, and what it may hold: `#rrggbb`, `transparent`, or a scrim's
 * or a shadow's `rgb(… / …)` and pixels. A value stamped inline that is not a colour paints
 * nothing at all where it is used, so one that cannot be one is skipped and the base answers for
 * it. The pre-paint script repeats both rules, and `theme.test.ts` runs it beside this reader on
 * the same record to hold the two together.
 */
const KEPT_NAME = /^--[a-z-]+$/;
const KEPT_VALUE = /^(#[0-9a-f]{6}|transparent|[0-9 .,/()pxrgb]+)$/;

const DEFAULT_THEME: Theme = 'system';
const DEFAULT_DENSITY: Density = 'comfortable';

/**
 * A modal since #27, at the user's ask; it was a drawer. Said in three places, and
 * `theme.test.ts` holds the other two to this one: the pre-paint script in index.html, which
 * stamps it on a load when nothing is stored, and index.css's `modal:` variant, which is what
 * an absent attribute draws when storage refuses and the script stamps nothing.
 *
 * Below 768px the journal fills the screen whichever this is: the variant's box is `md:` only.
 */
export const DEFAULT_JOURNAL: JournalView = 'modal';

const isTheme = (value: string | null): value is Theme =>
  THEMES.some((theme) => theme.value === value);

const isNamedTheme = (value: unknown): value is NamedTheme =>
  typeof value === 'string' && value !== 'system' && isTheme(value);

const isDensity = (value: string | null): value is Density =>
  DENSITIES.some((density) => density.value === value);

const isJournalView = (value: string | null): value is JournalView =>
  JOURNAL_VIEWS.some((view) => view.value === value);

/**
 * An unrecognised stored value falls back rather than being trusted. Storage outlives the code
 * that wrote it, so a theme dropped in a later version would otherwise leave the root stamped
 * with a value no palette block answers — which renders as unstyled text on an unstyled ground,
 * the least diagnosable failure available.
 */
export function readTheme(): ThemeChoice {
  const stored = readStored(THEME_KEY);
  if (stored === 'mine') {
    return readMine() === null ? DEFAULT_THEME : 'mine';
  }

  return isTheme(stored) ? stored : DEFAULT_THEME;
}

/**
 * The theme of your own kept in this browser, or null where there is none to wear: none kept, a
 * record that is not JSON, or one made from a theme that is gone. Each kept value that cannot be
 * stamped is skipped, and the base's block answers for it, as it does before the bundle.
 */
export function readMine(): Mine | null {
  const raw = readStored(MINE_KEY);
  if (raw === null) {
    return null;
  }

  let record: unknown;
  try {
    record = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof record !== 'object' || record === null) {
    return null;
  }

  const { from, scheme, tokens } = record as Record<string, unknown>;
  if (!isNamedTheme(from) || typeof tokens !== 'object' || tokens === null) {
    return null;
  }

  const kept = Object.entries(tokens).filter(
    (entry): entry is [string, string] =>
      KEPT_NAME.test(entry[0]) && typeof entry[1] === 'string' && KEPT_VALUE.test(entry[1]),
  );
  return { from, scheme: scheme === 'light' ? 'light' : 'dark', tokens: Object.fromEntries(kept) };
}

/**
 * Keeps a theme of your own. Whether it was kept: the caller stores the choice only if it was, so
 * that storage refusing leaves the next load on the theme this one started from.
 */
export function storeMine(mine: Mine): boolean {
  return writeStored(MINE_KEY, JSON.stringify(mine));
}

export function readDensity(): Density {
  const stored = readStored(DENSITY_KEY);
  return isDensity(stored) ? stored : DEFAULT_DENSITY;
}

export function storeTheme(theme: ThemeChoice): void {
  writeStored(THEME_KEY, theme);
}

export function storeDensity(density: Density): void {
  writeStored(DENSITY_KEY, density);
}

export function readJournalView(): JournalView {
  const stored = readStored(JOURNAL_KEY);
  return isJournalView(stored) ? stored : DEFAULT_JOURNAL;
}

export function storeJournalView(view: JournalView): void {
  writeStored(JOURNAL_KEY, view);
}

/**
 * `system` removes the attribute instead of setting it to "system". A literal there would match
 * no palette block *and* would stop `:root:not([data-theme])` matching, so the OS preference
 * would be ignored twice over.
 *
 * It moves the bar above the page too: Chrome's on Android, and the installed app's status bar.
 * index.html's pre-paint script does that on a load, and this does it for a theme chosen after
 * one. A chosen theme's colour goes in a `theme-color` tag of its own, ahead of System's two,
 * because a browser takes the first that matches; System's two are never touched, so removing
 * the chosen one hands the bar back to the device. The colour is read back from index.css rather
 * than copied a third time, because by now the stylesheet is there to ask.
 *
 * A theme of your own worn before this takes all of its inline values off first, System included:
 * they sit over the base's block, where they outrank any selector, so one left behind would paint
 * over the theme chosen now, with no error.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  takeOffMine(root);

  if (theme === 'system') {
    root.removeAttribute(THEME_ATTRIBUTE);
    return;
  }

  root.setAttribute(THEME_ATTRIBUTE, theme);

  // Empty only where no stylesheet is loaded at all, which is a unit test that did not add one.
  const ground = getComputedStyle(root).getPropertyValue('--sunken').trim();
  if (ground !== '') {
    setBar(ground);
  }
}

/**
 * Wears a theme of your own: its base stamped as the attribute, so the base's block answers for
 * anything not kept, every kept value inline over it, its `color-scheme`, and the bar above the
 * page in its own ground. The pre-paint script does the same on a load; this does it when one is
 * kept, chosen, or tried in the panel that makes it, which wears each change as it is made.
 */
export function applyMine(mine: Mine): void {
  const root = document.documentElement;
  takeOffMine(root);

  root.setAttribute(THEME_ATTRIBUTE, mine.from);
  for (const [name, value] of Object.entries(mine.tokens)) {
    root.style.setProperty(name, value);
  }
  root.style.setProperty('color-scheme', mine.scheme);

  const kept = mine.tokens['--sunken'];
  const ground =
    kept !== undefined && /^#[0-9a-f]{6}$/.test(kept)
      ? kept
      : getComputedStyle(root).getPropertyValue('--sunken').trim();
  if (ground !== '') {
    setBar(ground);
  }
}

/**
 * Takes every inline value a theme of your own set off the root, and the bar a chosen theme set.
 * Nothing else in the app writes the root's inline style, and only custom properties and
 * `color-scheme` are taken, so anything that did one day would be left alone.
 */
function takeOffMine(root: HTMLElement): void {
  const style = root.style;
  const names = Array.from({ length: style.length }, (_, at) => style.item(at));
  for (const name of names) {
    if (name.startsWith('--') || name === 'color-scheme') {
      style.removeProperty(name);
    }
  }
  if (style.length === 0) {
    root.removeAttribute('style');
  }

  document.head.querySelectorAll('meta[name="theme-color"]:not([media])').forEach((tag) => {
    tag.remove();
  });
}

/** A chosen theme's bar, ahead of System's two, because a browser takes the first that matches. */
function setBar(colour: string): void {
  const bar = document.createElement('meta');
  bar.name = 'theme-color';
  bar.content = colour;
  document.head.insertBefore(bar, document.head.querySelector('meta[name="theme-color"]'));
}

/** Density has no system to defer to, so it is always stamped. */
export function applyDensity(density: Density): void {
  document.documentElement.setAttribute(DENSITY_ATTRIBUTE, density);
}

/**
 * Always stamped too. It is on the root rather than passed down as a prop because that is what
 * lets the drawer's position be a CSS variant: nothing has to thread the preference through the
 * board to the dialog, and the menu changing it does not need shared React state to be heard.
 */
export function applyJournalView(view: JournalView): void {
  document.documentElement.setAttribute(JOURNAL_ATTRIBUTE, view);
}
