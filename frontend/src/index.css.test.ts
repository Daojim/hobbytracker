import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEMES } from './theme/theme';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** The custom-property declarations inside the first block whose selector line matches. */
function paletteAfter(marker: string): Record<string, string> {
  const start = css.indexOf(marker);
  expect(start, `no block found for ${marker}`).toBeGreaterThan(-1);

  const body = css.slice(start + marker.length);
  const end = body.indexOf('}');
  const declarations: Record<string, string> = {};

  // Trimmed rather than anchored to the line end: the repository stores CRLF, and a stray \r
  // before the `;` is enough to make a strict anchor match nothing and the comparison vacuous.
  for (const line of body.slice(0, end).split(/\r?\n/)) {
    const match = /^\s*(--[a-z-]+):\s*(.+);\s*$/.exec(line);
    const [, name, value] = match ?? [];
    if (name !== undefined && value !== undefined) {
      declarations[name] = value;
    }
  }

  return declarations;
}

function luminance(hex: string): number {
  const value = hex.trim().replace('#', '');
  const channels = [0, 2, 4].map((at) => Number.parseInt(value.slice(at, at + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);

  return (hi! + 0.05) / (lo! + 0.05);
}

/** Every block that defines a full palette, by the name a person would call it. */
const PALETTES: readonly (readonly [string, string])[] = [
  ['Shelf Light', "[data-theme='shelf-light'] {"],
  ['Frost', "[data-theme='frost'] {"],
  ['Almanac', "[data-theme='almanac'] {"],
  ['Dusk', "[data-theme='dusk'] {"],
  ['a dark OS with no choice made', ':root:not([data-theme]) {'],
  ['Shelf Dark', "[data-theme='shelf-dark'] {"],
  ['Console', "[data-theme='console'] {"],
  ['Ember', "[data-theme='ember'] {"],
];

describe('contrast', () => {
  // 4.5:1 is AA for text at the sizes this app uses — the card's metadata row is 12px and the
  // drawer's labels are smaller still, so none of it qualifies for the 3:1 large-text allowance.
  //
  // This exists because the same bug happened twice. First `text-neutral-500`, one value for two
  // themes, sat at 3.8:1 on the dark one for the life of the board. Then `--danger-fg` was set to
  // near-white on every theme, which is right on a light theme where the danger fill is a deep
  // red and about 2:1 on a dark one where the fill is a light salmon — a chip whose label could
  // not be read, in the one place the app asks "are you sure".
  for (const [name, marker] of PALETTES) {
    describe(name, () => {
      const palette = paletteAfter(marker);
      const value = (token: string) => {
        const found = palette[`--${token}`];
        expect(found, `${name} has no --${token}`).toBeDefined();

        return found!;
      };
      const on = (token: string, ground: string) => contrast(value(token), value(ground));

      it.each([
        ['fg', 'surface'],
        ['muted', 'surface'],
        ['accent', 'surface'],
        ['danger', 'surface'],
        // All three rating bands, not just the one that happens to be on screen. The low band is
        // the risk: a red that reads well on a dark ground is easy to pick, and a red dark enough
        // to read on a light one stops looking like the same scale.
        ['rating-low', 'surface'],
        ['rating-mid', 'surface'],
        ['rating-high', 'surface'],
        ['muted', 'well'],
        ['muted', 'sunken'],
      ])('%s reads on %s', (token, ground) => {
        expect(on(token, ground)).toBeGreaterThanOrEqual(4.5);
      });

      it('the destructive chip can be read', () => {
        // Its label sits on `danger` as a fill, not on the surface — the one pair in the palette
        // where both halves move together, and so the one that is easiest to get backwards.
        expect(on('danger-fg', 'danger')).toBeGreaterThanOrEqual(4.5);
      });
    });
  }
});

/**
 * HowLongToBeat's own colour, which is deliberately not per-theme.
 *
 * The four estimates are that site's numbers, and the chip says so whatever the app is wearing —
 * the genre stripes' reasoning exactly, which is why these live in the plain `@theme` block
 * beside them rather than in the eight palette blocks. So it is checked once here instead of once
 * per theme above.
 *
 * Checked at all because a fill and its own label are the one pair in this stylesheet that move
 * together, and that is precisely how `--danger-fg` came to be near-white on a light salmon and
 * read at 2:1. A colour that is the same on every theme cannot be corrected by a theme, so the
 * one value has to clear the bar on every ground there is.
 */
describe('the HowLongToBeat chip', () => {
  const shared = paletteAfter('@theme {');
  const value = (token: string) => {
    const found = shared[`--${token}`];
    expect(found, `the shared block has no --${token}`).toBeDefined();

    return found!;
  };

  it('can be read', () => {
    expect(contrast(value('color-hltb-fg'), value('color-hltb'))).toBeGreaterThanOrEqual(4.5);
  });

  it('has not drifted to either end of the range of grounds it sits on', () => {
    // The two extremes, pointedly not every theme, and the reason is arithmetic rather than
    // laziness.
    //
    // One fill that is the same on every theme cannot clear 3:1 against a *mid-tone* ground.
    // Carrying white text caps the fill's luminance at 0.177, and 3:1 from there needs a ground
    // above 0.630 or below 0.026 — so everything in between is unreachable by construction, for
    // any blue, dark or light. Dusk's ground is 0.058 and Dusk is the theme that is deliberately
    // neither paper nor near-black. Asserting 3:1 per theme would therefore have said "this app
    // may not have a mid-tone theme", which is a rule nobody agreed to and not one this test is
    // entitled to impose.
    //
    // What is still worth holding is that the fill has not wandered towards either end, where it
    // *would* disappear into the themes that live there. Between the lightest ground and the
    // darkest, a chip clear of both is clear enough everywhere — 2.10:1 on Dusk is the price,
    // paid by a chip whose white label reads at 4.63:1 and which differs from that ground in
    // saturation as much as in brightness.
    const surfaces = PALETTES.map(([name, marker]) => {
      const surface = paletteAfter(marker)['--surface'];
      expect(surface, `${name} has no --surface`).toBeDefined();

      return surface!;
    }).sort((a, b) => luminance(a) - luminance(b));

    const darkest = surfaces[0]!;
    const lightest = surfaces[surfaces.length - 1]!;

    expect(contrast(value('color-hltb'), lightest)).toBeGreaterThanOrEqual(3);
    expect(contrast(value('color-hltb'), darkest)).toBeGreaterThanOrEqual(3);
  });
});

describe('the palette', () => {
  it('says the same thing for a dark OS as it does for Shelf Dark chosen by hand', () => {
    // These two have to be written twice: `system` stamps no attribute, so it is answered by a
    // media query, and CSS has no way to alias a media query to a selector. Copy-paste that
    // nothing checks is how one of them quietly gets a value the other does not — so this checks
    // it. If they are meant to diverge, this test is the place to say so out loud.
    const viaMediaQuery = paletteAfter(':root:not([data-theme]) {');
    const viaAttribute = paletteAfter("[data-theme='shelf-dark'] {");

    expect(Object.keys(viaMediaQuery).length).toBeGreaterThan(0);
    expect(viaAttribute).toEqual(viaMediaQuery);
  });

  it('gives every theme the app offers a block of its own', () => {
    // A theme in the menu with no palette behind it stamps an attribute nothing answers, and the
    // app renders as unstyled text on an unstyled ground. `system` is the deliberate exception:
    // it is the absence of a choice and has no block by design.
    for (const theme of THEMES) {
      if (theme.value === 'system') {
        continue;
      }

      expect(css, `no palette block for the ${theme.label} theme`).toContain(
        `[data-theme='${theme.value}']`,
      );
    }
  });

  it('gives every theme a color-scheme, which is what themes the rating slider', () => {
    // The one part of a range input no utility can reach. A theme that forgets it renders a
    // light track on a dark drawer — and only in the drawer, which is where it goes unnoticed.
    const blocks = css.split(/\n(?=:root|\[data-theme)/).filter((b) => b.includes('--surface:'));

    expect(blocks.length).toBeGreaterThanOrEqual(4);
    for (const block of blocks) {
      expect(block, `a palette block has no color-scheme:\n${block.slice(0, 80)}`).toMatch(
        /color-scheme:\s*(light|dark);/,
      );
    }
  });
});
