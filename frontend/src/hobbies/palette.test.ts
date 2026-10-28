import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hobbyDefinition } from './index';
import { HOBBIES } from '../shell/hobbies';
import { THEMES } from '../theme/theme';
import type { Genre } from './types';

/**
 * The genre stripes, held to the rules `docs/design.md` states and nothing checked.
 *
 * Every failure this file catches is silent. Tailwind v4 scans source text, so a class naming a
 * token that does not exist generates no CSS at all and the stripe renders as the transparent
 * placeholder an ungenred title already gets — a card painted wrong looks exactly like a card
 * with nothing to paint. And two hues under 0.10 apart in OKLab are the same colour at a 4px
 * stripe, which is a thing you discover by squinting at a board rather than by running anything.
 */

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** The hobbies with a board somebody can actually use, which are the ones whose cards render. */
const BUILT = HOBBIES.filter((hobby) => hobby.ready).map((hobby) => hobby.slug);

interface Oklch {
  l: number;
  c: number;
  h: number;
}

/** Every `--color-genre-*` declaration in the stylesheet, wherever it sits. */
function genreTokens(): Map<string, Oklch[]> {
  const found = new Map<string, Oklch[]>();
  const pattern = /--(color-genre-[a-z-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g;

  for (const [, name, l, c, h] of css.matchAll(pattern)) {
    const values = found.get(name!) ?? [];
    values.push({ l: Number(l), c: Number(c), h: Number(h) });
    found.set(name!, values);
  }

  return found;
}

const TOKENS = genreTokens();

/** `bg-genre-horror` names `--color-genre-horror`. Tailwind's own rule, applied backwards. */
const tokenFor = (stripe: string) => stripe.replace(/^bg-/, 'color-');

/**
 * OKLab, from OKLCH: (L, C·cos H, C·sin H), and the Euclidean distance between two of them.
 *
 * The formula `docs/design.md` gives, reproduced here rather than imported because there is
 * nothing in the app that does this — the palette is chosen by measurement and then written
 * down, and this is the measurement.
 */
function separation(a: Oklch, b: Oklch): number {
  const lab = ({ l, c, h }: Oklch) => {
    const rad = (h * Math.PI) / 180;
    return [l, c * Math.cos(rad), c * Math.sin(rad)] as const;
  };

  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);

  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * The tightest pair any palette accepts: Isekai against Mecha on the anime board, at 0.103.
 *
 * It was Strategy against Adventure on the games board, at 0.0875, until the games palette grew
 * to nineteen on 28 October 2026 and moved Strategy a shade to make room, which opened that pair
 * to 0.136. Raised to follow, because a floor held below every pair that ships stops catching
 * anything. A *new* pair tighter than the tightest pair anybody has ever agreed to is what this
 * catches.
 */
const ACCEPTED_FLOOR = 0.103;

/** The band that stays visible against every theme's surface, light or dark. */
const LIGHTNESS = { min: 0.48, max: 0.75 };

/**
 * The faintest stripe that ships: Horror on Dusk, at 1.484:1, a hue films and anime share.
 *
 * Dusk is where every list's faintest stripe sits, because its card is a mid slate that a dark hue
 * has little to stand out from, and the lightness band is not enough to keep a stripe off it. The
 * first try at the nineteen-genre games palette put Arcade at `oklch(0.48 0.2 340)`, inside the
 * band, and it measured 1.33:1. A *new* stripe fainter than any that has shipped is what this
 * catches, the way the separation floor catches a new pair.
 */
const CONTRAST_FLOOR = 1.48;

/** Every theme's card, which is the ground a stripe is read against. */
const SURFACES = new Map(
  [...css.matchAll(/\[data-theme='([a-z-]+)'\]\s*\{[^}]*?--surface:\s*(#[0-9a-f]{6})/g)].map(
    ([, theme, surface]) => [theme!, surface!] as const,
  ),
);

/** WCAG relative luminance from an OKLCH token: OKLab, then linear sRGB, clipped to the gamut. */
function luminanceOf({ l, c, h }: Oklch): number {
  const rad = (h * Math.PI) / 180;
  const [a, b] = [c * Math.cos(rad), c * Math.sin(rad)];
  const [long, medium, short] = [
    l + 0.3963377774 * a + 0.2158037573 * b,
    l - 0.1055613458 * a - 0.0638541728 * b,
    l - 0.0894841775 * a - 1.291485548 * b,
  ].map((cone) => cone ** 3) as [number, number, number];
  const [red, green, blue] = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ].map((channel) => Math.min(1, Math.max(0, channel))) as [number, number, number];

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** The same luminance from a `#rrggbb` surface, through sRGB's own curve. */
function luminanceOfHex(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG's contrast ratio, which is how `index.css` has always measured a stripe against a ground. */
function contrast(colour: Oklch, surface: string): number {
  const [lighter, darker] = [luminanceOf(colour), luminanceOfHex(surface)].sort((x, y) => y - x);
  return (lighter! + 0.05) / (darker! + 0.05);
}

const hueOf = (genre: Genre): Oklch => {
  const values = TOKENS.get(tokenFor(genre.stripe!));
  expect(values, `${genre.name} paints itself ${genre.stripe}, which index.css does not define`)
    .toBeDefined();

  return values![0]!;
};

describe.each(BUILT)('the %s palette', (slug) => {
  const { genres } = hobbyDefinition(slug);

  it('paints every genre it names', () => {
    // A named-but-unpainted genre is a real interim state — it is what films sat in while the
    // palette was being workshopped — but it is not a state to ship, because a card prints the
    // genre's name beside a stripe that says nothing.
    const unpainted = genres.filter((genre) => genre.stripe === null).map((genre) => genre.name);

    expect(unpainted).toEqual([]);
  });

  it('names a colour index.css actually defines', () => {
    // The silent one. Tailwind generates nothing for a class whose token is missing, so the
    // stripe is transparent and the card looks like one with no genre rather than like a bug.
    for (const genre of genres) {
      expect(TOKENS.has(tokenFor(genre.stripe!)), `no token for ${genre.name}`).toBe(true);
    }
  });

  it('keeps every hue in the band that reads on every theme', () => {
    for (const genre of genres) {
      const { l } = hueOf(genre);

      expect(l, `${genre.name} at lightness ${l}`).toBeGreaterThanOrEqual(LIGHTNESS.min);
      expect(l, `${genre.name} at lightness ${l}`).toBeLessThanOrEqual(LIGHTNESS.max);
    }
  });

  it('keeps every stripe as visible as the faintest one that ships, on every theme', () => {
    for (const genre of genres) {
      for (const [theme, surface] of SURFACES) {
        const ratio = contrast(hueOf(genre), surface);
        expect(ratio, `${genre.name} on ${theme} at ${ratio.toFixed(2)}:1`)
          .toBeGreaterThanOrEqual(CONTRAST_FLOOR);
      }
    }
  });

  it('has no two genres that are the same colour at stripe width', () => {
    // Within one hobby only, and that is the whole scope of the claim: a board is one hobby, so
    // a film's stripe is never read against a game's. It is what let the films palette reuse the
    // hue circle rather than working around eleven colours already spent.
    const tightest = genres
      .flatMap((a, index) =>
        genres.slice(index + 1).map((b) => ({
          pair: `${a.name} / ${b.name}`,
          apart: separation(hueOf(a), hueOf(b)),
        })),
      )
      .sort((x, y) => x.apart - y.apart)[0];

    expect(tightest, 'a palette with fewer than two genres').toBeDefined();
    expect(tightest!.apart, `${tightest!.pair} are ${tightest!.apart.toFixed(3)} apart`)
      .toBeGreaterThanOrEqual(ACCEPTED_FLOOR);
  });
});

describe('genre hues', () => {
  it('are measured against every theme the app offers', () => {
    // The contrast check above loops over what this reads out of index.css, so a pattern that
    // stopped matching would make it pass by measuring nothing at all.
    const offered = THEMES.map((theme) => theme.value).filter((value) => value !== 'system');

    expect([...SURFACES.keys()].sort()).toEqual([...offered].sort());
  });

  it('are defined once each, and never inside a theme', () => {
    // Content, not chrome: a genre means the same thing whatever the app is wearing. A second
    // declaration inside a `[data-theme]` block would make the colour theme-dependent, and the
    // one that fails quietly is the theme nobody switches to.
    const duplicated = [...TOKENS]
      .filter(([, values]) => values.length > 1)
      .map(([name, values]) => `${name} (${values.length}×)`);

    expect(duplicated).toEqual([]);
  });

  it('are all spoken for by some hobby', () => {
    // The other direction, and the one that rots rather than breaks: a hue left behind by a
    // genre that was renamed or dropped is dead CSS nothing reports.
    const claimed = new Set(
      BUILT.flatMap((slug) => hobbyDefinition(slug).genres)
        .filter((genre) => genre.stripe !== null)
        .map((genre) => tokenFor(genre.stripe!)),
    );

    expect([...TOKENS.keys()].filter((name) => !claimed.has(name))).toEqual([]);
  });
});
