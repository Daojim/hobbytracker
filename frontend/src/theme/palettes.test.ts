import { describe, expect, it } from 'vitest';
import { css, paletteAfter } from '../test/palette';
import { PALETTES, STRIPES, palettesFrom, stripesFrom } from './palettes';
import { THEMES, TOKENS } from './theme';

const NAMED = THEMES.filter((theme) => theme.value !== 'system').map((theme) => theme.value);

/**
 * The eight themes as a theme of your own is made from them: read out of index.css itself, which
 * is the only file in the app that names a colour, rather than copied into a module beside it. A
 * copy would be a fifth list for a new theme to join.
 */
describe('the palettes a theme of your own is made from', () => {
  it('are every theme the palette offers, and System is not one', () => {
    // System has no block of its own: under a dark device it is Shelf Dark's values, and under a
    // light one Shelf Light's, so a theme made "from System" is made from whichever it is showing.
    expect(Object.keys(PALETTES)).toEqual(NAMED);
  });

  it('hold each theme’s values as the stylesheet’s tests read them', () => {
    for (const theme of NAMED) {
      expect(PALETTES[theme].tokens, theme).toEqual(paletteAfter(`[data-theme='${theme}'] {`));
    }
  });

  it('name the same twenty tokens in the same order in every block', () => {
    // The order is index.css's, so a theme of your own kept in storage reads as a block does.
    for (const theme of NAMED) {
      expect(Object.keys(PALETTES[theme].tokens), theme).toEqual([...TOKENS]);
    }
    expect(Object.keys(paletteAfter(':root:not([data-theme]) {'))).toEqual([...TOKENS]);
  });

  it('read each theme’s color-scheme from its block', () => {
    expect(Object.fromEntries(NAMED.map((theme) => [theme, PALETTES[theme].scheme]))).toEqual({
      'shelf-light': 'light',
      frost: 'light',
      almanac: 'light',
      dusk: 'dark',
      'blood-red': 'dark',
      'shelf-dark': 'dark',
      console: 'dark',
      ember: 'dark',
    });
  });

  it('read every genre stripe the stylesheet paints, as OKLCH', () => {
    const declared = [...css.matchAll(/--color-genre-[a-z-]+:/g)].length;

    expect(declared).toBeGreaterThan(30);
    expect(STRIPES).toHaveLength(declared);
    expect(STRIPES.find((stripe) => stripe.name === 'horror')).toEqual({
      name: 'horror',
      l: 0.5,
      c: 0.17,
      h: 25,
    });
  });

  it('read the stylesheet the same with either line ending', () => {
    // The working tree is CRLF and the repository LF, and the production image is built from the
    // repository, so the bundle reads whichever this machine did not.
    const lf = css.replace(/\r\n/g, '\n');
    const crlf = lf.replace(/\n/g, '\r\n');

    expect(palettesFrom(crlf)).toEqual(palettesFrom(lf));
    expect(stripesFrom(crlf)).toEqual(stripesFrom(lf));
  });
});
