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
 */

export const THEME_ATTRIBUTE = 'data-theme';
export const DENSITY_ATTRIBUTE = 'data-density';
export const JOURNAL_ATTRIBUTE = 'data-journal';

export const THEME_KEY = 'hobbytracker.theme';
export const DENSITY_KEY = 'hobbytracker.density';
export const JOURNAL_KEY = 'hobbytracker.journal';

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

const DEFAULT_THEME: Theme = 'system';
const DEFAULT_DENSITY: Density = 'comfortable';
const DEFAULT_JOURNAL: JournalView = 'drawer';

const isTheme = (value: string | null): value is Theme =>
  THEMES.some((theme) => theme.value === value);

const isDensity = (value: string | null): value is Density =>
  DENSITIES.some((density) => density.value === value);

const isJournalView = (value: string | null): value is JournalView =>
  JOURNAL_VIEWS.some((view) => view.value === value);

/**
 * Reading and writing storage both throw rather than fail quietly in more browsers than is
 * comfortable — Safari in private browsing on write, anything set to block site data on read.
 * Losing a preference is a small thing; taking the app down for it is not, and this runs before
 * the first paint, where an exception is a blank page rather than a missing colour.
 */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Nothing to do and nobody to tell. The choice applies to this page either way.
  }
}

/**
 * An unrecognised stored value falls back rather than being trusted. Storage outlives the code
 * that wrote it, so a theme dropped in a later version would otherwise leave the root stamped
 * with a value no palette block answers — which renders as unstyled text on an unstyled ground,
 * the least diagnosable failure available.
 */
export function readTheme(): Theme {
  const stored = read(THEME_KEY);
  return isTheme(stored) ? stored : DEFAULT_THEME;
}

export function readDensity(): Density {
  const stored = read(DENSITY_KEY);
  return isDensity(stored) ? stored : DEFAULT_DENSITY;
}

export function storeTheme(theme: Theme): void {
  write(THEME_KEY, theme);
}

export function storeDensity(density: Density): void {
  write(DENSITY_KEY, density);
}

export function readJournalView(): JournalView {
  const stored = read(JOURNAL_KEY);
  return isJournalView(stored) ? stored : DEFAULT_JOURNAL;
}

export function storeJournalView(view: JournalView): void {
  write(JOURNAL_KEY, view);
}

/**
 * `system` removes the attribute instead of setting it to "system". A literal there would match
 * no palette block *and* would stop `:root:not([data-theme])` matching, so the OS preference
 * would be ignored twice over.
 */
export function applyTheme(theme: Theme): void {
  if (theme === 'system') {
    document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    return;
  }

  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
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
