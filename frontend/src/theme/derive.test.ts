import { describe, expect, it } from 'vitest';
import { contrast, hexToLab } from './colour';
import { derive, schemeOf } from './derive';
import { measure } from './pairs';
import { PALETTES } from './palettes';
import { THEMES, TOKENS, type NamedTheme, type Picks } from './theme';

const NAMED = THEMES.filter((theme) => theme.value !== 'system').map((theme) => theme.value);

/** A theme's own three colours, which is where a theme of your own starts from. */
const picksOf = (theme: NamedTheme): Picks => ({
  sunken: PALETTES[theme].tokens['--sunken'],
  surface: PALETTES[theme].tokens['--surface'],
  accent: PALETTES[theme].tokens['--accent'],
});

/** How far apart two colours are in OKLab, times 100: about 2 is the least two patches show. */
const deltaE = (x: string, y: string) => {
  const [a, b] = [hexToLab(x), hexToLab(y)];
  return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
};

/**
 * Each of the eight made from each of the other seven with its own three colours: 56 themes, and
 * the real one beside each to say how close the rest came. The workshop's measure of the
 * derivation on 21 November 2026, and so the measure it is held to.
 */
const MADE = NAMED.flatMap((target) =>
  NAMED.filter((base) => base !== target).map((base) => ({
    base,
    target,
    made: derive(PALETTES[base], picksOf(target)),
  })),
);

/** Three papers, two mid-tones and three darks, as docs/design.md counts them. */
const REGISTER: Record<NamedTheme, string> = {
  'shelf-light': 'light',
  frost: 'light',
  almanac: 'light',
  dusk: 'mid',
  'blood-red': 'mid',
  'shelf-dark': 'dark',
  console: 'dark',
  ember: 'dark',
};

/**
 * The four themes of your own the workshop rendered and the user picked from, as its prototype
 * worked them out: Rose and Forest, which read; Harbour, whose accent cannot; and Fog, a dim card
 * on which six pairs and ten stripes fail. Fog's text is black because no darker ink exists: the
 * solve went as far as it could.
 */
const WORKSHOP = {
  rose: {
    from: 'shelf-light',
    picks: { sunken: '#efe1df', surface: '#fffafa', accent: '#a3344f' },
    scheme: 'light',
    tokens: {
      '--surface': '#fffafa',
      '--sunken': '#efe1df',
      '--hover': '#f1e7e1',
      '--line': '#e2d7d0',
      '--line-soft': '#ede2da',
      '--fg': '#211918',
      '--muted': '#675f5e',
      '--accent': '#a3344f',
      '--danger': '#a6261e',
      '--ok': '#1d6939',
      '--drop': '#ebe7e8',
      '--dropped': '#a8958d',
      '--scrim': 'rgb(33 25 24 / 0.28)',
      '--well': '#f7edec',
      '--rating-low': '#b1241d',
      '--rating-mid': '#9f5507',
      '--rating-high': '#7b6800',
      '--danger-fg': '#fcf4f2',
      '--card-shadow': '0 1px 2px rgb(33 25 24 / 0.07), 0 5px 14px rgb(33 25 24 / 0.055)',
      '--card-line': 'transparent',
    },
  },
  forest: {
    from: 'shelf-dark',
    picks: { sunken: '#111a15', surface: '#1b261f', accent: '#e3b04b' },
    scheme: 'dark',
    tokens: {
      '--surface': '#1b261f',
      '--sunken': '#111a15',
      '--hover': '#242d25',
      '--line': '#2c342b',
      '--line-soft': '#222b22',
      '--fg': '#e8f2ec',
      '--muted': '#9ba69f',
      '--accent': '#e3b04b',
      '--danger': '#ff9381',
      '--ok': '#74d194',
      '--drop': '#2f3728',
      '--dropped': '#696d63',
      '--scrim': 'rgb(0 0 0 / 0.6)',
      '--well': '#16201b',
      '--rating-low': '#fb6f6f',
      '--rating-mid': '#f8a850',
      '--rating-high': '#ffd177',
      '--danger-fg': '#2a1f1c',
      '--card-shadow': '0 1px 2px rgb(0 0 0 / 0.45), 0 6px 16px rgb(0 0 0 / 0.38)',
      '--card-line': 'transparent',
    },
  },
  harbour: {
    from: 'dusk',
    picks: { sunken: '#23393b', surface: '#2f4a4d', accent: '#4f86b5' },
    scheme: 'dark',
    tokens: {
      '--surface': '#2f4a4d',
      '--sunken': '#23393b',
      '--hover': '#3b565a',
      '--line': '#476267',
      '--line-soft': '#3a5559',
      '--fg': '#f0f8f8',
      '--muted': '#b9c7c7',
      '--accent': '#4f86b5',
      '--danger': '#ffa797',
      '--ok': '#7cd9a2',
      '--drop': '#1c4b4c',
      '--dropped': '#7d9198',
      '--scrim': 'rgb(0 0 0 / 0.55)',
      '--well': '#2a4447',
      '--rating-low': '#ff9897',
      '--rating-mid': '#ffb36c',
      '--rating-high': '#ffd579',
      '--danger-fg': '#2d1714',
      '--card-shadow': '0 1px 2px rgb(0 0 0 / 0.3), 0 6px 16px rgb(0 0 0 / 0.25)',
      '--card-line': '#476267',
    },
  },
  fog: {
    from: 'frost',
    picks: { sunken: '#9aa3ad', surface: '#b9c1ca', accent: '#1a5f9e' },
    scheme: 'light',
    tokens: {
      '--surface': '#b9c1ca',
      '--sunken': '#9aa3ad',
      '--hover': '#adb6c2',
      '--line': '#94a0ad',
      '--line-soft': '#a2acb8',
      '--fg': '#000000',
      '--muted': '#3d4044',
      '--accent': '#1a5f9e',
      '--danger': '#6f0001',
      '--ok': '#00421d',
      '--drop': '#a5b2c3',
      '--dropped': '#586370',
      '--scrim': 'rgb(0 0 0 / 0.28)',
      '--well': '#adb6c0',
      '--rating-low': '#780002',
      '--rating-mid': '#6c3600',
      '--rating-high': '#534500',
      '--danger-fg': '#c3bbb9',
      '--card-shadow': '0 1px 2px rgb(0 0 0 / 0.07), 0 5px 14px rgb(0 0 0 / 0.06)',
      '--card-line': 'transparent',
    },
  },
} as const;

/** What each kind of token may hold, so a theme of your own stamps nothing a browser would drop. */
const SHAPES: Record<string, RegExp> = {
  '--scrim': /^rgb\(\d{1,3} \d{1,3} \d{1,3} \/ (0|1|0?\.\d+)\)$/,
  '--card-shadow':
    /^0 1px 2px rgb\(\d{1,3} \d{1,3} \d{1,3} \/ 0?\.\d+\), 0 \d+px \d+px rgb\(\d{1,3} \d{1,3} \d{1,3} \/ 0?\.\d+\)$/,
  '--card-line': /^(#[0-9a-f]{6}|transparent)$/,
};
const COLOUR = /^#[0-9a-f]{6}$/;

describe('a theme of your own, worked out from one of the eight', () => {
  it('is the theme it was made from, exactly, while nothing is changed', () => {
    // The panel opens on the theme you are wearing with its three colours in the boxes, so
    // nothing on the board moves until a colour is picked.
    for (const theme of NAMED) {
      expect(derive(PALETTES[theme], picksOf(theme)), theme).toEqual(PALETTES[theme]);
    }
  });

  it('keeps the three colours it is given, as they were given', () => {
    for (const { made, target } of MADE) {
      expect(made.tokens['--sunken']).toBe(PALETTES[target].tokens['--sunken']);
      expect(made.tokens['--surface']).toBe(PALETTES[target].tokens['--surface']);
      expect(made.tokens['--accent']).toBe(PALETTES[target].tokens['--accent']);
    }
  });

  it('is light or dark by its card, at the luminance where black and white text read alike', () => {
    // 0.179: either side of it, one of black and white reads better than the other on the card.
    for (const card of ['#757575', '#767676', '#3b4552', '#b9c1ca', '#780606']) {
      const blackReadsBetter = contrast('#000000', card) > contrast('#ffffff', card);
      expect(schemeOf(card), card).toBe(blackReadsBetter ? 'light' : 'dark');
    }
    expect(schemeOf('#757575')).toBe('dark');
    expect(schemeOf('#767676')).toBe('light');

    // The eight agree with the color-scheme each block declares.
    for (const theme of NAMED) {
      expect(schemeOf(PALETTES[theme].tokens['--surface']), theme).toBe(PALETTES[theme].scheme);
    }
  });

  it('takes the scrim and the card’s shadow from its own register, not its base’s', () => {
    // A dark card made from a paper theme wears Shelf Dark's; a light card made from a dark theme
    // wears a paper theme's, in its own ink.
    const darkFromLight = derive(PALETTES['shelf-light'], picksOf('ember'));
    expect(darkFromLight.scheme).toBe('dark');
    expect(darkFromLight.tokens['--scrim']).toBe(PALETTES['shelf-dark'].tokens['--scrim']);
    expect(darkFromLight.tokens['--card-shadow']).toBe(PALETTES['shelf-dark'].tokens['--card-shadow']);

    const lightFromDark = derive(PALETTES.console, picksOf('frost'));
    expect(lightFromDark.scheme).toBe('light');
    expect(lightFromDark.tokens['--scrim']).toMatch(/ \/ 0\.28\)$/);
    expect(lightFromDark.tokens['--card-shadow']).toMatch(/ \/ 0\.07\), .* \/ 0\.055\)$/);
  });

  it('writes every value as #rrggbb, transparent, or the scrim’s and the shadow’s own shape', () => {
    const every = [
      ...MADE.map(({ made }) => made),
      ...NAMED.map((theme) => derive(PALETTES[theme], picksOf(theme))),
      ...Object.values(WORKSHOP).map((each) => derive(PALETTES[each.from], each.picks)),
    ];

    for (const theme of every) {
      expect(Object.keys(theme.tokens)).toEqual([...TOKENS]);
      for (const [token, value] of Object.entries(theme.tokens)) {
        expect(value, token).toMatch(SHAPES[token] ?? COLOUR);
      }
    }
  });

  it('makes the four themes the workshop rendered exactly as it made them', () => {
    // The port is held to the prototype's own output, value for value, so the renders the user
    // picked from are what the build draws.
    for (const [name, each] of Object.entries(WORKSHOP)) {
      expect(derive(PALETTES[each.from], each.picks), name).toEqual({
        scheme: each.scheme,
        tokens: each.tokens,
      });
    }
  });

  it('works out the rest of each of the eight as closely as the workshop measured', () => {
    // Each colour token of each made theme against the real one, among the themes made from one
    // of their own register: the median and the worst, never above the workshop's figures. The
    // text is the furthest, at 4.1 and 12.2, which is Almanac's brown ink carried to the papers
    // that have none; and the worst of all, the delete chip's label, is Dusk and Blood Red made
    // from each other. Across registers the worst reach 20 to 25, and are not held.
    const CEILINGS: Record<string, readonly [median: number, worst: number]> = {
      '--hover': [1.3, 3.1],
      '--line': [2.1, 5.5],
      '--line-soft': [1.6, 6.8],
      '--fg': [4.2, 12.3],
      '--muted': [2.2, 6.8],
      '--danger': [1.7, 9.8],
      '--ok': [4.3, 5.2],
      '--drop': [2.6, 3.8],
      '--dropped': [2.9, 15],
      '--well': [0.5, 1.8],
      '--rating-low': [2.6, 7.6],
      '--rating-mid': [1.3, 9.9],
      '--rating-high': [1.7, 10.6],
      '--danger-fg': [2.9, 16.5],
    };
    const median = (xs: number[]) => {
      const sorted = [...xs].sort((a, b) => a - b);
      return (sorted[(sorted.length - 1) >> 1]! + sorted[sorted.length >> 1]!) / 2;
    };

    const kin = MADE.filter(({ base, target }) => REGISTER[base] === REGISTER[target]);
    expect(kin).toHaveLength(14);

    for (const [token, [ceiling, worst]] of Object.entries(CEILINGS)) {
      const apart = kin.map(({ made, target }) =>
        deltaE(made.tokens[token as keyof typeof made.tokens], PALETTES[target].tokens[token as keyof typeof made.tokens]),
      );
      expect(median(apart), `${token}'s median`).toBeLessThanOrEqual(ceiling);
      expect(Math.max(...apart), `${token}'s worst`).toBeLessThanOrEqual(worst);
    }
  });

  it('leaves no more than two of the 56 themes’ 952 pairs under their bar, and those barely', () => {
    // Measured at the workshop: Almanac made from Dusk puts quiet text on the ground at 4.43:1,
    // and Ember made from Shelf Light the accent under the pointer at 4.40:1. Every other pair of
    // every made theme reads.
    const under = MADE.flatMap(({ base, target, made }) =>
      measure(made.tokens)
        .filter((each) => !each.ok)
        .map((each) => ({ made: `${target} from ${base}`, words: each.pair.words, ratio: each.ratio, min: each.pair.min })),
    );

    expect(MADE.length * 17).toBe(952);
    expect(under.length, JSON.stringify(under)).toBeLessThanOrEqual(2);
    for (const each of under) {
      expect(each.ratio, `${each.words} in ${each.made}`).toBeGreaterThan(each.min - 0.15);
    }
  });
});
