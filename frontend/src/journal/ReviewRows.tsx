import { useId, useState } from 'react';
import type { GameReviews } from '../api/types';
import type { ReviewWords, TitleReviews } from '../hobbies';
import { openCriticGameUrl, parseOpenCriticId, steamAppUrl } from './fields';

export interface ReviewRowsProps {
  /** The title's two pages, and whether it is out, as the journal's read has them. */
  pages: TitleReviews;

  /** What each page says, once asked: undefined while it is being asked, or when it could not be. */
  verdicts: GameReviews | undefined;

  /** Whether what each page says is being asked for now. */
  asking: boolean;

  /** The rows' words, which are the hobby's. */
  words: ReviewWords;

  /** A pin in flight: the number typed is being checked against OpenCritic. */
  pinning: boolean;

  /** What the server said when it refused the number, or null. */
  error: string | null;

  onPin: (openCriticId: number | null) => void;
}

/**
 * Said while a verdict is on its way, beside a link that is already there. Punctuation rather than
 * a word, so the drawer's and not the hobby's.
 */
const ASKING = '…';

/**
 * What OpenCritic's critics and Steam's players say about a game, each beside a link to its page,
 * and the box that pins OpenCritic's: two rows under HowLongToBeat's, in the band about the title.
 *
 * Every look here was picked at #22's workshop on 12 November 2026, from renders of the real drawer
 * around a prototype of these rows, with real scores. **Built as drawn**: a verdict on its way is
 * `…` with the link already there; with no key on the server, OpenCritic's row is its link alone; a
 * game with no page of its own on Steam has no Steam row. See docs/games-reviews.md for where each
 * page is found and how long what each says is kept.
 *
 * **It renders labels and rows as siblings, not a block of its own**, for {@link HltbPin}'s reason:
 * the band is one two-track grid, so the labels share a column with Genre's and HowLongToBeat's and
 * every control a left edge. The refusal under the box spans both tracks for the same reason.
 */
export function ReviewRows({ pages, verdicts, asking, words, pinning, error, onPin }: ReviewRowsProps) {
  const id = useId();

  // Text rather than a number input, for the HowLongToBeat box's reasons — an id is not a quantity,
  // and a number input reports what it cannot parse as empty, which here would take the pin back —
  // and one more of its own: it takes a whole OpenCritic address, which is where the number is.
  const [value, setValue] = useState(pages.openCriticId === null ? '' : String(pages.openCriticId));
  const [refusal, setRefusal] = useState<string | null>(null);

  /**
   * Commits what is in the box once it is finished — a blur or an Enter — as the HowLongToBeat box
   * does, because "16438" passes through 1, 16 and 164 on the way and a pin asks OpenCritic.
   */
  function commit() {
    // Enter commits while the box has focus, and the commit disables it, which the browser reports
    // as a blur, the event that also commits. Only Firefox's reaches here: Chromium fires it inside
    // the `disabled` React writes while it commits, when React has its own events switched off, and
    // Firefox a microtask later, when they are on again. Without this, one pin is two in Firefox.
    // jsdom fires no blur at all, so reviews.spec.ts is what proves it, and only under
    // --browser=firefox: measured on 13 November 2026, in docs/games-reviews.md.
    if (pinning) {
      return;
    }

    const parsed = parseOpenCriticId(value);

    if (parsed.error !== undefined) {
      setRefusal(parsed.error);
      return;
    }

    setRefusal(null);

    // Tabbing past a box nobody changed must not ask OpenCritic about a number it already has.
    if (parsed.value === pages.openCriticId) {
      return;
    }

    onPin(parsed.value);
  }

  // A pin in flight is a verdict on its way too: the number is changing under the row.
  const critics =
    asking || pinning
      ? ASKING
      : verdicts?.openCritic != null
        ? words.critics(verdicts.openCritic, pages.released)
        : null;

  const players = asking ? ASKING : verdicts?.steam != null ? words.players(verdicts.steam) : null;

  return (
    <>
      <label htmlFor={id} className="font-medium">
        {words.criticsLabel}
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="—"
          value={value}
          disabled={pinning}
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
          className="w-24 rounded border border-line bg-surface px-1 py-0.5 text-xs disabled:opacity-50"
        />

        {/* No number, nothing to link to and nothing to say: the box alone, on every game. */}
        {pages.openCriticId !== null && (
          <>
            {critics !== null && <span>{critics}</span>}
            <a
              href={openCriticGameUrl(pages.openCriticId)}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-fg"
            >
              {words.criticsLink}
            </a>
          </>
        )}
      </div>

      {/* Under the box, across both tracks, where HowLongToBeat's refusals go. The local rule wins
          when it fires, because it is what stopped the request going. */}
      {(refusal ?? error) !== null && (
        <p role="alert" className="col-span-2 text-danger">
          {refusal ?? error}
        </p>
      )}

      {/* Its own page only: a game Steam sells inside a collection, or not at all, has no row. */}
      {pages.steamAppId !== null && (
        <>
          <span className="font-medium">{words.playersLabel}</span>

          <div className="flex flex-wrap items-center gap-2">
            {players !== null && <span>{players}</span>}
            <a
              href={steamAppUrl(pages.steamAppId)}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-fg"
            >
              {words.playersLink}
            </a>
          </div>
        </>
      )}
    </>
  );
}
