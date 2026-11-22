import css from '../index.css?raw';
import type { Oklch } from './colour';
import { THEMES, TOKENS, type NamedTheme, type Palette, type Scheme, type Token, type Tokens } from './theme';

/**
 * The eight themes and the genre stripes, read out of index.css itself for the panel that makes a
 * theme of your own, which works out the seventeen tokens a person does not set from the theme
 * it is made from, and warns of a card too faint for a stripe.
 *
 * Read from the stylesheet's text rather than copied beside it, because index.css is the only
 * file in the app that names a colour, and a copy would be a fifth list for a new theme to join.
 * Not read back from the page's computed styles either: a production build is free to rewrite a
 * value it minifies, `rgb(0 0 0 / 0.6)` as `#0009`, and the e2e suite runs on the development
 * server, where nothing would show it.
 *
 * The text is about 34 KB, 12 KB gzipped, and only the panel needs it, so this module is reached
 * only from the panel, which the palette's list loads when it is first asked for.
 */

/** A genre's stripe, as index.css paints it. */
export interface Stripe extends Oklch {
  /** `horror`, from `--color-genre-horror`. */
  readonly name: string;
}

/** The declarations inside the first block whose selector line is `marker`. */
function blockAfter(text: string, marker: string): { tokens: Record<string, string>; scheme: string | null } {
  const lf = text.replace(/\r\n/g, '\n');
  const start = lf.indexOf(marker);
  if (start < 0) {
    throw new Error(`index.css has no block for ${marker}`);
  }

  const body = lf.slice(start + marker.length);
  const tokens: Record<string, string> = {};
  let scheme: string | null = null;
  for (const line of body.slice(0, body.indexOf('}')).split('\n')) {
    const declared = /^\s*(--[a-z-]+):\s*(.+);\s*$/.exec(line);
    if (declared !== null) {
      tokens[declared[1]!] = declared[2]!;
    }
    const said = /^\s*color-scheme:\s*(light|dark);/.exec(line);
    if (said !== null) {
      scheme = said[1]!;
    }
  }

  return { tokens, scheme };
}

/**
 * Each of the eight's twenty values and its scheme. A block missing a token, or with one the list
 * does not know, is refused here rather than worked from, since a theme made from it would stamp
 * an empty value that paints nothing.
 */
export function palettesFrom(text: string): Readonly<Record<NamedTheme, Palette>> {
  const named = THEMES.filter((theme) => theme.value !== 'system');

  return Object.fromEntries(
    named.map(({ value }) => {
      const { tokens, scheme } = blockAfter(text, `[data-theme='${value}'] {`);
      const names = Object.keys(tokens);
      if (names.length !== TOKENS.length || names.some((name, at) => name !== TOKENS[at])) {
        throw new Error(`index.css's ${value} block does not set the twenty tokens in order`);
      }
      if (scheme === null) {
        throw new Error(`index.css's ${value} block has no color-scheme`);
      }

      const ordered = Object.fromEntries(TOKENS.map((token: Token) => [token, tokens[token]!]));
      return [value, { tokens: ordered as Tokens, scheme: scheme as Scheme }];
    }),
  ) as Record<NamedTheme, Palette>;
}

/** Every genre stripe in the stylesheet, as OKLCH, whichever hobby's list it is in. */
export function stripesFrom(text: string): readonly Stripe[] {
  return [...text.matchAll(/--color-genre-([a-z-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)].map(
    ([, name, l, c, h]) => ({ name: name!, l: Number(l), c: Number(c), h: Number(h) }),
  );
}

export const PALETTES = palettesFrom(css);
export const STRIPES = stripesFrom(css);
