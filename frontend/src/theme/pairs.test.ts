import { describe, expect, it } from 'vitest';
import { MATCH_MARK } from '../lib/Marked';
import { PAIRS, type Shade } from './pairs';

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
