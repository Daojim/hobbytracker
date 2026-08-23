/**
 * What colour a rating is, which is a reading of the number rather than decoration.
 *
 * A board of ratings all in one colour makes you read every digit to find the good ones. Three
 * bands turn the column into something you can scan: poor, middling, good.
 *
 * Lives here beside `formatHours` rather than in `board/`, for its reason — the card and the
 * drawer's history both print a rating, and neither should reach into the other to colour one.
 *
 * The boundaries are the ones a person would say out loud: six is the first orange, eight is the
 * first yellow. Both are values the 0.1 step can land on exactly, so an off-by-one-step band is a
 * visible difference on a real card rather than a rounding curiosity.
 */
const LOW = 6;
const HIGH = 8;

export type RatingTone = 'text-rating-low' | 'text-rating-mid' | 'text-rating-high';

/**
 * Whole class names, never `text-rating-${tone}`. Tailwind scans the source as text, so an
 * interpolated name generates no CSS at all and the rating quietly renders in the inherited
 * colour — the same trap `genres.ts` writes its ten stripe classes out longhand for.
 */
export function ratingTone(rating: number): RatingTone {
  if (rating < LOW) {
    return 'text-rating-low';
  }

  if (rating < HIGH) {
    return 'text-rating-mid';
  }

  return 'text-rating-high';
}
