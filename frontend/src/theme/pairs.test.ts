import { describe, expect, it } from 'vitest';
import { MATCH_MARK } from '../lib/Marked';
import { derive } from './derive';
import { PAIRS, faintStripes, measure, type Shade } from './pairs';
import { PALETTES, STRIPES } from './palettes';

/** A shade as `index.css.test.ts` names it: `fg`, or `danger/10 over surface`. */
const named = (shade: Shade) =>
  'over' in shade ? `${shade.token}/${Math.round(shade.opacity * 100)} over ${shade.over}` : shade.token;

const tokensOf = (shade: Shade) => ('over' in shade ? [shade.token, shade.over] : [shade.token]);

/**
 * The pairs every theme is held to, as one list. `index.css.test.ts` holds the eight and System's
 * dark block to each of them, and since #28 the panel that makes a theme of your own measures the
 * colours being picked against the same list, so the test and the warning cannot disagree about
 * what has to be read on what.
 */
describe('the pairs every theme is held to', () => {
  it('are the seventeen a palette has been held to since #6, each once', () => {
    // The count is pinned because the list is app code now, and a pair taken out of it to quiet a
    // warning would take it out of the contrast test too, with both staying green. 17 a palette,
    // over nine palettes, is the 153 cases docs/design.md counts. A new pair raises this on purpose.
    expect(PAIRS).toHaveLength(17);

    const each = PAIRS.map((pair) => `${named(pair.ink)} on ${named(pair.ground)}`);
    expect(new Set(each).size).toBe(each.length);
  });

  it('hold text to 4.5:1, and a mark only to the floor it was picked at', () => {
    for (const pair of PAIRS) {
      expect(pair.min, pair.words).toBe(pair.kind === 'text' ? 4.5 : 1.4);
    }
    expect(PAIRS.filter((pair) => pair.kind === 'mark').map((pair) => pair.words)).toEqual([
      'the mark round a word found',
    ]);
  });

  it('answer each pair to the colour a person would change first', () => {
    // Where a warning is said: under the colour it answers to. The accent's pairs to the accent;
    // the two on the ground, the column and the page, to the ground; and the rest to the card,
    // since every other ink is worked out against the card.
    const expected = (ink: Shade, ground: Shade) => {
      if ([...tokensOf(ink), ...tokensOf(ground)].includes('accent')) {
        return 'accent';
      }

      return ['well', 'sunken'].includes(ground.token) ? 'sunken' : 'surface';
    };

    for (const pair of PAIRS) {
      expect(pair.by, pair.words).toBe(expected(pair.ink, pair.ground));
    }
  });

  it('measure the mark a note search paints, read out of the class it wears', () => {
    // So a mark changed to another token or a fainter accent is measured as it is painted, as
    // index.css.test.ts measured it before the list moved here.
    const [, token, percent] = /\bbg-([a-z-]+)\/(\d+)\b/.exec(MATCH_MARK) ?? [];
    const marks = PAIRS.flatMap((pair) => [pair.ink, pair.ground]).filter(
      (shade) => 'over' in shade && shade.over === 'surface' && shade.token !== 'danger',
    );

    expect(marks).toHaveLength(2);
    for (const mark of marks) {
      expect(named(mark)).toBe(`${token}/${percent} over surface`);
    }
  });

  it('say each pair in words of its own, which run on in a sentence', () => {
    // *Hard to read: the accent on a card (2.45:1) and quiet text on the ground (4.08:1).*
    const words = PAIRS.map((pair) => pair.words);

    expect(new Set(words).size).toBe(words.length);
    for (const each of words) {
      expect(each).toMatch(/^[a-z]/);
      expect(each).not.toMatch(/[.:]$/);
    }
  });
});

/** What a measure failed, as the warning under a colour prints it: the words and two places. */
const failing = (tokens: Parameters<typeof measure>[0]) =>
  measure(tokens)
    .filter((each) => !each.ok)
    .map((each) => [each.pair.words, each.ratio.toFixed(2)]);

describe('a theme measured against them', () => {
  it('finds every pair of every one of the eight readable', () => {
    for (const [theme, palette] of Object.entries(PALETTES)) {
      expect(measure(palette.tokens)).toHaveLength(17);
      expect(failing(palette.tokens), theme).toEqual([]);
    }
  });

  it('finds what a theme of your own cannot read, at the ratio the workshop showed', () => {
    // Harbour, made from Dusk, whose blue accent cannot be read on its teal: the render said
    // each of these under the Accent.
    const harbour = derive(PALETTES.dusk, { sunken: '#23393b', surface: '#2f4a4d', accent: '#4f86b5' });
    expect(failing(harbour.tokens)).toEqual([
      ['the accent on a card', '2.45'],
      ['the accent in a column', '2.68'],
      ['the accent on the ground', '3.15'],
      ['the accent under the pointer', '2.03'],
      ['the mark round a word found', '1.26'],
    ]);

    // Fog, made from Frost, a card dimmed until much struggles: one under the Ground, and five
    // under the Accent.
    const fog = derive(PALETTES.frost, { sunken: '#9aa3ad', surface: '#b9c1ca', accent: '#1a5f9e' });
    expect(failing(fog.tokens)).toEqual([
      ['the accent on a card', '3.64'],
      ['quiet text on the ground', '4.08'],
      ['the accent in a column', '3.22'],
      ['the accent on the ground', '2.59'],
      ['the accent under the pointer', '3.23'],
      ['the mark round a word found', '1.34'],
    ]);
  });

  it('finds the genre stripes a card is too faint for, faintest first', () => {
    expect(
      faintStripes('#2f4a4d', STRIPES).map((each) => [each.name, each.ratio.toFixed(2)]),
    ).toEqual([['horror', '1.45']]);

    const fog = faintStripes('#b9c1ca', STRIPES);
    expect(fog).toHaveLength(10);
    expect(fog[0]!.name).toBe('puzzle');
    expect(fog[0]!.ratio.toFixed(2)).toBe('1.16');
    expect(fog.every((each, at) => at === 0 || each.ratio >= fog[at - 1]!.ratio)).toBe(true);

    // And none on the eight's own cards, which is palette.test.ts's floor seen from here.
    for (const [theme, palette] of Object.entries(PALETTES)) {
      expect(faintStripes(palette.tokens['--surface'], STRIPES), theme).toEqual([]);
    }
  });
});
