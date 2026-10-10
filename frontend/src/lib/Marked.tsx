import { Fragment } from 'react';
import { matchRuns } from './match';

/**
 * What a word a search found wears: the accent, faintly, behind it.
 *
 * The user's pick at the #6 workshop on 9 October 2026, over bold, which was the recommendation.
 * The page said what it costs on Ember, where the accent is red: red behind text, which
 * `design.md` otherwise keeps off that theme.
 *
 * Not `--drop`, the tint a column takes under a held card, which was the first thing rendered: it
 * sat 1.02:1 off the card on Dusk and Blood Red, and on Dusk a marked word showed no mark at all.
 * `index.css.test.ts` reads this class, so the token and the opacity it measures on every theme
 * are the ones painted.
 */
export const MATCH_MARK = 'rounded-sm bg-accent/25 px-0.5 text-fg';

export interface MarkedProps {
  text: string;
  /** The words of the search. None marks nothing. */
  words: readonly string[];
}

/**
 * Text with each word of a search marked wherever it appears, in any case. The text reads
 * exactly as it was written; only the marks are added.
 */
export function Marked({ text, words }: MarkedProps) {
  return (
    <>
      {matchRuns(text, words).map((run, at) =>
        run.match ? (
          <mark key={at} className={MATCH_MARK}>
            {run.text}
          </mark>
        ) : (
          <Fragment key={at}>{run.text}</Fragment>
        ),
      )}
    </>
  );
}
