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

export const THEME_KEY = 'hobbytracker.theme';
export const DENSITY_KEY = 'hobbytracker.density';

/**
 * `system` is not a palette — it is the absence of a choice, and it stamps no attribute so the
 * `prefers-color-scheme` query in index.css keeps governing. Everything else names a block there.
 */
export const THEMES = [
  { value: 'system', label: 'System', hint: 'Follows your device' },
  { value: 'shelf-light', label: 'Shelf Light', hint: 'Warm paper' },
  { value: 'shelf-dark', label: 'Shelf Dark', hint: 'Warm dark' },
  { value: 'console', label: 'Console', hint: 'Cool and deep' },
  { value: 'ember', label: 'Ember', hint: 'Charcoal and red' },
] as const;

export const DENSITIES = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
] as const;

export type Theme = (typeof THEMES)[number]['value'];
export type Density = (typeof DENSITIES)[number]['value'];

const DEFAULT_THEME: Theme = 'system';
const DEFAULT_DENSITY: Density = 'comfortable';

const isTheme = (value: string | null): value is Theme =>
  THEMES.some((theme) => theme.value === value);

const isDensity = (value: string | null): value is Density =>
  DENSITIES.some((density) => density.value === value);

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
