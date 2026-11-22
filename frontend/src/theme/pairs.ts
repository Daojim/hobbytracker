import { MATCH_MARK } from '../lib/Marked';

/**
 * What every theme is held to: each pair of colours where one is read or seen on another, and the
 * least contrast it may have.
 *
 * One list with two readers. `index.css.test.ts` holds each of the eight, and System's dark block,
 * to every pair here. And since #28 the panel that makes a theme of your own measures the colours
 * being picked against the same pairs, and says under a colour what will be hard to read on it.
 * The pairs were written into the test until then, which was their only reader; a second list for
 * the panel would have been a copy that could fall behind the test or run ahead of it.
 *
 * 4.5:1 is AA for text at the sizes this app uses: the card's metadata row is 12px and the
 * drawer's labels are smaller still, so none of it has the 3:1 large-text allowance. A mark is not
 * read, only seen, and is held to the floor it was picked at instead.
 */

/** The three colours a theme of your own is made from: the ground, the card and the accent. */
export type Part = 'sunken' | 'surface' | 'accent';

/** A colour on screen: one token, or a token laid over another at an opacity, as `bg-danger/10`. */
export type Shade =
  | { readonly token: string }
  | { readonly token: string; readonly opacity: number; readonly over: string };

export interface Pair {
  readonly ink: Shade;
  readonly ground: Shade;
  /** Text is read, and held to 4.5:1. A mark is only seen. */
  readonly kind: 'text' | 'mark';
  readonly min: number;
  /**
   * The colour a person sets that the pair moves with first, which is where its warning goes: the
   * accent's pairs to the accent, the two on the ground to the ground, and the rest to the card,
   * since every other ink is worked out against the card.
   */
  readonly by: Part;
  /** The pair as a phrase that runs on in a sentence: *the accent on a card*. */
  readonly words: string;
}

const token = (name: string): Shade => ({ token: name });

const tint = (name: string, percent: number, over: string): Shade => ({
  token: name,
  opacity: percent / 100,
  over,
});

const text = (ink: Shade, ground: Shade, by: Part, words: string): Pair => ({
  ink,
  ground,
  kind: 'text',
  min: 4.5,
  by,
  words,
});

/**
 * What a word a note search found is painted with, read out of the class the mark wears, so the
 * ground measured is the one on screen. A mark that stopped being one token at one opacity fails
 * here, loudly, rather than going unmeasured.
 */
const MARKED = /\bbg-([a-z-]+)\/(\d+)\b/.exec(MATCH_MARK);
if (MARKED === null) {
  throw new Error(`${MATCH_MARK} is not one token at an opacity, so its mark cannot be measured`);
}
const mark = tint(MARKED[1]!, Number(MARKED[2]), 'surface');

/**
 * The delete warning in Settings and a share's *Stop sharing?*: `bg-danger/10` over the card, a
 * ground none of the tokens name.
 */
const warning = tint('danger', 10, 'surface');

export const PAIRS: readonly Pair[] = [
  text(token('fg'), token('surface'), 'surface', 'text on a card'),
  text(token('muted'), token('surface'), 'surface', 'quiet text on a card'),
  // Among others, a search result's name once it opens the journal: the tile is `surface`. The
  // lowest on 7 October 2026, measured in the browser: 5.11 on Ember.
  text(token('accent'), token('surface'), 'accent', 'the accent on a card'),
  text(token('danger'), token('surface'), 'surface', 'danger on a card'),
  // All three rating bands, not just the one that happens to be on screen. The low band is the
  // risk: a red that reads well on a dark ground is easy to pick, and a red dark enough to read on
  // a light one stops looking like the same scale.
  text(token('rating-low'), token('surface'), 'surface', 'a low rating'),
  text(token('rating-mid'), token('surface'), 'surface', 'a middling rating'),
  text(token('rating-high'), token('surface'), 'surface', 'a high rating'),
  text(token('muted'), token('well'), 'sunken', 'quiet text in a column'),
  text(token('muted'), token('sunken'), 'sunken', 'quiet text on the ground'),
  // A share's banner is a strip of `well` with Make your own on it, the first accent ink on that
  // ground. And the year row's way to Stats is the accent on the page's own ground, on your board
  // and on a share's. The lowest on 5 October 2026: 5.37 on Ember, 5.24 on Shelf Light.
  text(token('accent'), token('well'), 'accent', 'the accent in a column'),
  text(token('accent'), token('sunken'), 'accent', 'the accent on the ground'),
  // A tile's + ▶ ✓ under the cursor: the symbol turns the accent, on the hover fill. Held to
  // text's bar rather than the 3:1 a symbol needs, because every theme clears it.
  text(token('accent'), token('hover'), 'accent', 'the accent under the pointer'),
  // Its label sits on `danger` as a fill, not on the card: the one pair where both halves move
  // together, and so the one that is easiest to get backwards. It was near-white on every theme
  // once, which is right on a deep red fill and about 2:1 on a dark theme's light salmon.
  text(token('danger-fg'), token('danger'), 'surface', 'a delete button’s label'),
  // The warning's words are `fg` and its backups line `muted`, and muted is thin there: 4.57:1 on
  // Dusk. The failure line is `danger`, which measured 4.24:1 on Dusk's tint, so it sits under the
  // tint on the card's own ground instead, and is not asked about here.
  text(token('fg'), warning, 'surface', 'text on the delete warning'),
  text(token('muted'), warning, 'surface', 'quiet text on the delete warning'),
  // A word a note search found, marked in a result's card and in the journal, both of which are
  // `surface`. The user's pick at the #6 workshop on 9 October 2026, over bold. The lowest that
  // day: 5.48 on Dusk.
  text(token('fg'), mark, 'accent', 'a word a note search found'),
  // The first tint tried was `--drop`, the colour a column takes under a held card. It sat 1.02:1
  // off the card on Dusk and Blood Red, and on Dusk a marked word showed no mark at all. The floor
  // is Ember's 1.41, the faintest that read in the renders.
  {
    ink: mark,
    ground: token('surface'),
    kind: 'mark',
    min: 1.4,
    by: 'accent',
    words: 'the mark round a word found',
  },
];

/**
 * The faintest genre stripe that ships: Horror on Dusk, at 1.484:1, a hue films and anime share.
 * `palette.test.ts` holds every stripe on every theme's card to it, and the panel a card of your own.
 *
 * Dusk is where every list's faintest stripe sits, because its card is a mid slate that a dark hue
 * has little to stand out from, and the lightness band is not enough to keep a stripe off it. The
 * first try at the nineteen-genre games palette put Arcade at `oklch(0.48 0.2 340)`, inside the
 * band, and it measured 1.33:1. A *new* stripe fainter than any that has shipped is what this
 * catches, the way the separation floor catches a new pair.
 */
export const STRIPE_FLOOR = 1.48;
