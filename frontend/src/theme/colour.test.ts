import { describe, expect, it } from 'vitest';
import {
  contrast,
  hexToLab,
  labToHex,
  lch,
  lchToHex,
  luminance,
  oklchLuminance,
  over,
  solveLightness,
} from './colour';

/**
 * The colour arithmetic a theme of your own is worked out with, and the warning measured with. Each
 * function is checked against a figure from outside this app: WCAG's for contrast, Björn
 * Ottosson's for OKLab, and a browser's for compositing.
 */
describe('colour', () => {
  it('measures contrast as WCAG does', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1, 10);
    expect(luminance('#000000')).toBe(0);
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 10);
    // The grey every accessibility checker quotes: #767676 is the darkest that reads on white.
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    // Either way round.
    expect(contrast('#ffffff', '#767676')).toBe(contrast('#767676', '#ffffff'));
  });

  it('lays one colour over another as a browser composites, in encoded channels', () => {
    expect(over('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(over('#ff0000', '#00ff00', 1)).toBe('#ff0000');
    expect(over('#ff0000', '#00ff00', 0)).toBe('#00ff00');
    // Dusk's delete warning, bg-danger/10 over the card, and its quiet text on it: 4.58:1.
    expect(over('#ffa393', '#3b4552', 0.1)).toBe('#4f4e59');
    expect(contrast('#b8c3d0', '#4f4e59')).toBeCloseTo(4.58, 2);
  });

  it('takes a colour to OKLab and back', () => {
    // Ottosson's own reference values for the sRGB primaries.
    const red = hexToLab('#ff0000');
    expect(red[0]).toBeCloseTo(0.62796, 4);
    expect(red[1]).toBeCloseTo(0.22486, 4);
    expect(red[2]).toBeCloseTo(0.12585, 4);
    const blue = hexToLab('#0000ff');
    expect(blue[0]).toBeCloseTo(0.45201, 4);
    expect(blue[1]).toBeCloseTo(-0.03246, 4);
    expect(blue[2]).toBeCloseTo(-0.31153, 4);
    expect(hexToLab('#ffffff')[0]).toBeCloseTo(1, 4);

    for (const hex of ['#fffdfa', '#3b4552', '#780606', '#5fbfaa', '#121110', '#e5d9bf']) {
      expect(labToHex(hexToLab(hex))).toBe(hex);
    }
  });

  it('brings a colour outside sRGB inside it by its chroma, keeping its lightness and hue', () => {
    const asked = [0.9, 0.4, 30] as const;
    const hex = lchToHex(asked);
    const [l, c, h] = lch(hexToLab(hex));

    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(l).toBeCloseTo(0.9, 2);
    expect(c).toBeLessThan(0.4);
    expect(Math.abs(h - 30)).toBeLessThan(3);
  });

  it('solves a lightness until a colour reads on a ground, on the side it is asked for', () => {
    // As light as a grey can be and still read on white: one step lighter, #777777, would not.
    const grey = solveLightness({ c: 0, h: 0 }, '#ffffff', 4.5, 'below');
    expect(grey).toEqual({ hex: '#767676', reached: true });

    const red = solveLightness({ c: 0.15, h: 25 }, '#121110', 4.5, 'above');
    expect(red.reached).toBe(true);
    expect(contrast(red.hex, '#121110')).toBeGreaterThanOrEqual(4.5);
    expect(lch(hexToLab(red.hex))[0]).toBeGreaterThan(lch(hexToLab('#121110'))[0]);
  });

  it('says when a contrast cannot be reached, and goes as far as it can', () => {
    const found = solveLightness({ c: 0, h: 0 }, '#777777', 21, 'above');

    expect(found.reached).toBe(false);
    expect(found.hex).toBe('#ffffff');
  });

  it('measures a genre stripe, which index.css writes in OKLCH', () => {
    // The faintest stripe that ships: Horror on Dusk's card, 1.484:1.
    const horror = oklchLuminance({ l: 0.5, c: 0.17, h: 25 });
    const dusk = luminance('#3b4552');

    expect((Math.max(horror, dusk) + 0.05) / (Math.min(horror, dusk) + 0.05)).toBeCloseTo(1.484, 3);
  });
});
