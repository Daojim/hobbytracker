import { describe, expect, it } from 'vitest';
import { ratingTone } from './rating';

describe('ratingTone', () => {
  it('paints a poor score as the low tone', () => {
    // The scale starts at 1.0 — the column is a check-constrained numeric(3,1) — so there is no
    // nought to worry about, but the boundary at the top of this band is worth pinning.
    expect(ratingTone(1)).toBe('text-rating-low');
    expect(ratingTone(4.5)).toBe('text-rating-low');
    expect(ratingTone(5.9)).toBe('text-rating-low');
  });

  it('paints a middling score as the mid tone', () => {
    expect(ratingTone(6)).toBe('text-rating-mid');
    expect(ratingTone(7.9)).toBe('text-rating-mid');
  });

  it('paints a good score as the high tone', () => {
    expect(ratingTone(8)).toBe('text-rating-high');
    expect(ratingTone(10)).toBe('text-rating-high');
  });

  it('puts each boundary in the band the reader would say it is in', () => {
    // "6 to 7 is orange" means a 6.0 is orange, not the last of the reds; and an 8.0 is the first
    // of the good ones. Both boundaries are exact decimals the rating step can actually produce,
    // so getting either off by one step is a real difference on a real card.
    expect(ratingTone(5.9)).not.toBe(ratingTone(6));
    expect(ratingTone(7.9)).not.toBe(ratingTone(8));
  });

  it('returns whole class names, because Tailwind reads the source as text', () => {
    // An interpolated `text-rating-${tone}` generates nothing at all and the rating renders in
    // the inherited colour — the same trap the genre stripes are written out longhand for.
    for (const tone of [ratingTone(3), ratingTone(6.5), ratingTone(9)]) {
      expect(tone).toMatch(/^text-rating-(low|mid|high)$/);
    }
  });
});
