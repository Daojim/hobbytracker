import {
  contrast,
  hexToLab,
  labToHex,
  lch,
  luminance,
  parseHex,
  project,
  solveLightness,
  type Lab,
} from './colour';
import { TOKENS, type Palette, type Picks, type Scheme, type Token, type Tokens } from './theme';

/**
 * A theme of your own, worked out from one of the eight and the three colours a person picks: the
 * ground, the card and the accent. Every other token keeps the relation it has in the theme it is
 * made from, applied to the new colours:
 *
 * - a colour between two others stays as far between them, with the same small lean off the
 *   line: the well between the card and the ground; hover, both lines and Dropped's grey between
 *   the card or the ground and the text; the drop tint between the well and the accent;
 * - a colour there to be read keeps its hue and chroma, and has its lightness solved until it
 *   reads on the new card as it read on the old: the text, unset, in the ground's hue; the quiet
 *   text; danger, ok and the three ratings; and the delete chip's label on its fill;
 * - the scrim and the card's shadow follow the register, light or dark, as the eight's do;
 * - the card's outline is the base's choice: Dusk, Blood Red and Console keep one.
 *
 * Picked at the #28 workshop on 21 November 2026, and measured there by making each of the eight
 * from each of the other seven with its own three colours, 56 themes, every token against the
 * real one; `derive.test.ts` holds it to those figures. Ported from the workshop's `derive.mjs`,
 * which also took the text as a fourth pick and set any token outright, for options not chosen.
 */

/**
 * Where black and white text read alike on a ground, (L + 0.05)² = 1.05 × 0.05: a card at or above
 * it is light, so its text is dark, and a card under it is dark.
 */
const LIGHT_DARK_CROSSOVER = 0.179;

/** A paper theme's scrim and shadow alphas, for a light card made from a dark theme. */
const PAPER = { scrim: '0.28', shadow: ['0.07', '0.055'] } as const;

/** Shelf Dark's, for a dark card made from a paper theme: black, as every dark theme's is. */
const DARK = {
  scrim: 'rgb(0 0 0 / 0.6)',
  shadow: '0 1px 2px rgb(0 0 0 / 0.45), 0 6px 16px rgb(0 0 0 / 0.38)',
} as const;

export const schemeOf = (surface: string): Scheme =>
  luminance(surface) >= LIGHT_DARK_CROSSOVER ? 'light' : 'dark';

/** Three numbers worked out from an OKLab triple, as one again. */
const asLab = (xs: readonly number[]): Lab => [xs[0]!, xs[1]!, xs[2]!];

/** How `t` sits between `x` and `y` in a base: how far along, and its lean off the line. */
interface Relation {
  readonly u: number;
  readonly lean: Lab;
}

function relation(x: string, y: string, t: string): Relation {
  const { u } = project(x, y, t);
  const [a, b, p] = [hexToLab(x), hexToLab(y), hexToLab(t)];
  const on = a.map((v, i) => v + (b[i]! - v) * u);
  return { u, lean: asLab(p.map((v, i) => v - on[i]!)) };
}

/** A point between `x` and `y`, as far along as the relation says, with its lean added back. */
function between(x: string, y: string, rel: Relation): string {
  const [a, b] = [hexToLab(x), hexToLab(y)];
  const on = a.map((v, i) => v + (b[i]! - v) * rel.u);
  return labToHex(asLab(on.map((v, i) => v + rel.lean[i]!)));
}

/** The side of a card a colour that reads on it is solved towards: darker on light, lighter on dark. */
const inkSide = (scheme: Scheme) => (scheme === 'light' ? 'below' : 'above');

/** The text, unpicked: the ground's hue at the base's chroma, reading as the base's did. */
function textFor(base: Palette, ground: string, surface: string, scheme: Scheme): string {
  const b = base.tokens;
  const [, c] = lch(hexToLab(b['--fg']));
  const [, , h] = lch(hexToLab(ground));
  const target = contrast(b['--fg'], b['--surface']);
  return solveLightness({ c, h }, surface, target, inkSide(scheme)).hex;
}

/** A colour kept for reading: the base's hue and chroma, its lightness solved on the new card. */
function readable(base: Palette, token: Token, surface: string, scheme: Scheme): string {
  const b = base.tokens;
  const [, c, h] = lch(hexToLab(b[token]));
  const target = contrast(b[token], b['--surface']);
  return solveLightness({ c, h }, surface, target, inkSide(scheme)).hex;
}

/** The quiet text: on the line from the text to the card, where it reads as the base's did. */
function quiet(base: Palette, fg: string, surface: string): string {
  const b = base.tokens;
  const target = Math.min(contrast(b['--muted'], b['--surface']), contrast(fg, surface));
  const [a, s] = [hexToLab(fg), hexToLab(surface)];
  const at = (t: number) => labToHex(asLab(a.map((v, k) => v + (s[k]! - v) * t)));

  let [lo, hi] = [0, 1];
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (contrast(at(mid), surface) >= target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return at(lo);
}

const rgbOf = (hex: string) =>
  parseHex(hex)
    .map((c) => Math.round(c * 255))
    .join(' ');

/** The alphas in a scrim's or a shadow's `rgb(… / a)`, in order. */
const alphasOf = (value: string) => [...value.matchAll(/\/\s*([\d.]+)\)/g)].map((found) => found[1]!);

/**
 * The theme `base` with the ground, the card and the accent `picks` says, and the other seventeen
 * worked out from them. The three as given are the base's own, the base comes back exactly.
 */
export function derive(base: Palette, picks: Picks): Palette {
  const b = base.tokens;
  const ground = picks.sunken;
  const surface = picks.surface;
  const accent = picks.accent;

  if (ground === b['--sunken'] && surface === b['--surface'] && accent === b['--accent']) {
    return base;
  }

  const scheme = schemeOf(surface);
  const fg =
    ground === b['--sunken'] && surface === b['--surface']
      ? b['--fg']
      : textFor(base, ground, surface, scheme);

  const t: Partial<Record<Token, string>> = {
    '--surface': surface,
    '--sunken': ground,
    '--fg': fg,
    '--accent': accent,
  };

  t['--well'] = between(surface, ground, relation(b['--surface'], b['--sunken'], b['--well']));
  t['--hover'] = between(surface, fg, relation(b['--surface'], b['--fg'], b['--hover']));
  t['--line'] = between(surface, fg, relation(b['--surface'], b['--fg'], b['--line']));
  t['--line-soft'] = between(surface, fg, relation(b['--surface'], b['--fg'], b['--line-soft']));
  t['--dropped'] = between(ground, fg, relation(b['--sunken'], b['--fg'], b['--dropped']));
  t['--drop'] = between(t['--well'], accent, relation(b['--well'], b['--accent'], b['--drop']));
  t['--muted'] = quiet(base, fg, surface);

  t['--danger'] = readable(base, '--danger', surface, scheme);
  for (const token of ['--ok', '--rating-low', '--rating-mid', '--rating-high'] as const) {
    t[token] = readable(base, token, surface, scheme);
  }

  {
    const [, c, h] = lch(hexToLab(b['--danger-fg']));
    const target = contrast(b['--danger-fg'], b['--danger']);
    // The label goes the other way from text: on a light theme the fill is deep, its label pale.
    const side = scheme === 'light' ? 'above' : 'below';
    t['--danger-fg'] = solveLightness({ c, h }, t['--danger'], target, side).hex;
  }

  if (scheme === 'light') {
    const scrim = base.scheme === 'light' ? alphasOf(b['--scrim'])[0]! : PAPER.scrim;
    const [near, far] = base.scheme === 'light' ? alphasOf(b['--card-shadow']) : PAPER.shadow;
    t['--scrim'] = `rgb(${rgbOf(fg)} / ${scrim})`;
    t['--card-shadow'] = `0 1px 2px rgb(${rgbOf(fg)} / ${near}), 0 5px 14px rgb(${rgbOf(fg)} / ${far})`;
  } else {
    t['--scrim'] = base.scheme === 'dark' ? b['--scrim'] : DARK.scrim;
    t['--card-shadow'] = base.scheme === 'dark' ? b['--card-shadow'] : DARK.shadow;
  }

  t['--card-line'] =
    b['--card-line'] === 'transparent'
      ? 'transparent'
      : between(surface, t['--line'], relation(b['--surface'], b['--line'], b['--card-line']));

  // In index.css's order, so a theme kept in storage reads as a block does.
  const tokens = Object.fromEntries(TOKENS.map((token) => [token, t[token]!])) as Tokens;
  return { tokens, scheme };
}
