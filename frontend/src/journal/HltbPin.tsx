import { useId, useState } from 'react';
import { formatDayShort } from '../lib/release';
import { journalDateInput } from '../lib/time';
import { hltbGameUrl, parseHltbId } from './fields';

export interface HltbPinProps {
  /** What is stored against the title, or null when nothing has matched it yet. */
  hltbId: number | null;

  /** The instant HowLongToBeat was last asked about the title, or null for never. */
  checkedAt: string | null;

  /** Whether HowLongToBeat has given the title any figure at all. */
  hasFigures: boolean;

  /** A pin in flight: the id typed is being fetched. */
  saving: boolean;

  /** A check in flight: the arrow's. */
  checking: boolean;

  /** Whether a check from the arrow has answered since the drawer opened. */
  checked: boolean;

  /** What the server said when it refused the id, or the check, or null. */
  error: string | null;
  onPin: (hltbId: number | null) => void;
  onCheck: () => void;
}

/**
 * Naming the HowLongToBeat entry for a title by hand, and asking HowLongToBeat about it again.
 *
 * The matcher writes nothing when it is unsure, which is the right refusal and leaves two ways
 * of being wrong on screen: a title it could not match, and a title it matched to the wrong
 * game. Both are fixed by saying which id is right, and unlike typed-in hours a pinned id
 * survives the next backfill — it is what every later refresh fetches instead of matching again.
 *
 * The link is the other half. HowLongToBeat's name for a game is often not IGDB's, which is the
 * entire reason a matcher exists, so no column stores the matched title — following the link is
 * how you check that the numbers belong to the game you meant.
 *
 * **The arrow is for a third way, which is being early.** HowLongToBeat lists a game before it
 * is out, with no times on it, and the matcher compares names, never times: so the id is right,
 * the figures are empty, and nothing asks again on release day, because the calendar is a view
 * of Backlog and no job runs then. The daily backfill gets to it within a month; the arrow is
 * for not waiting. It was the user's pick over a *Check now* in the line that says there is no
 * estimate, and it is on every game, figures or not.
 *
 * **It renders a label, a control and its lines as siblings, not a row of its own**, so that the
 * drawer's header grid can put its label in the same track as the Genre one above it and give
 * the two controls a shared left edge. The alternative was both files naming the same label
 * width and agreeing by luck. The cost is stated rather than hidden: this expects to sit in a
 * two-track grid, which is why the lines under the row span both columns explicitly.
 */
export function HltbPin({
  hltbId,
  checkedAt,
  hasFigures,
  saving,
  checking,
  checked,
  error,
  onPin,
  onCheck,
}: HltbPinProps) {
  const id = useId();

  // Text rather than a number input. This is an identifier, not a quantity: a spinner that
  // nudges it by one lands on an unrelated game, and a number input reports an unparseable
  // value as an empty string — which here would read as "take the pin back" and silently
  // destroy a good id on a typo.
  const [value, setValue] = useState(hltbId === null ? '' : String(hltbId));
  const [refusal, setRefusal] = useState<string | null>(null);

  /**
   * Commits what is in the box, if it is worth committing.
   *
   * The genre select beside this one saves on change, because a choice from a list is complete
   * the moment it is made. A number is not: "9134" passes through 9, 91 and 913 on the way, and
   * pinning is one of the two routes that hold the caller while the server reads a website. So
   * this waits for the number to be finished — a blur or an Enter, which is what the DOM's own
   * `change` event means for a text box.
   */
  function commit() {
    // Enter commits while the box still has focus, and the commit disables it — which a real
    // browser reports as a blur, the same event that commits. jsdom does not, so nothing in the
    // Vitest suite can fail on this; the guard is here because the browser is what runs it.
    // One pin would otherwise be two upstream lookups, the second on a value the stored id has
    // not caught up with yet.
    if (saving) {
      return;
    }

    const parsed = parseHltbId(value);

    if (parsed.error !== undefined) {
      setRefusal(parsed.error);
      return;
    }

    setRefusal(null);

    // Tabbing past a box nobody edited must not re-ask. The server re-fetches on every pin, so
    // sending back what is already stored is seconds of upstream work to learn nothing.
    if (parsed.value === hltbId) {
      return;
    }

    onPin(parsed.value);
  }

  // Only ever about when HowLongToBeat was asked; the figures in the pass band say what it has,
  // so a check that found none says so there and not twice. At rest it shows only on a title
  // with no figures, the user's pick over every game: there, the day is the reason to press.
  const line = checked
    ? 'Checked just now'
    : !hasFigures && checkedAt !== null
      ? `Last checked ${formatDayShort(journalDateInput(checkedAt))}`
      : null;

  const name = checking ? 'Checking HowLongToBeat' : 'Check HowLongToBeat again';

  return (
    <>
      <label htmlFor={id} className="font-medium">
        HowLongToBeat ID
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="—"
          value={value}
          // One write at a time: a check asks about the id in this box, so the box holds still
          // while one runs, as it already does while a pin is in flight.
          disabled={saving || checking}
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

        {/* A pin in flight keeps the word it has always had, in the arrow's place: there is
            nothing to check while the id is changing under it. */}
        {saving ? (
          <span>Checking…</span>
        ) : (
          <button
            type="button"
            aria-label={name}
            title={name}
            // aria-disabled rather than disabled, so a press from the keyboard keeps its focus:
            // a disabled button lets go of it, and the keyboard would land on the page behind.
            // The click is refused here instead, which is what keeps a second press from
            // becoming a second lookup.
            aria-disabled={checking}
            onClick={() => {
              if (!checking) {
                onCheck();
              }
            }}
            className={
              checking
                ? 'rounded p-0.5 text-muted'
                : 'rounded p-0.5 text-muted hover:bg-hover hover:text-fg'
            }
          >
            <RefreshGlyph turning={checking} />
          </button>
        )}

        {hltbId !== null && (
          <a
            href={hltbGameUrl(hltbId)}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-fg"
          >
            View on HowLongToBeat
          </a>
        )}
      </div>

      {/* Under the row, across both tracks, where the pin's refusals go. A status, so the answer
          to a press is heard as well as seen; present only while there is something to say, as
          the pass's own Saved is. */}
      {line !== null && (
        <p role="status" className="col-span-2">
          {line}
        </p>
      )}

      {/* The local rule wins when it fires, because it is what stopped the request going.
          col-span-2 because this is a grid child now — left in the control's track it would sit
          under the box and drag the label's row taller with it. */}
      {(refusal ?? error) !== null && (
        <p role="alert" className="col-span-2 text-danger">
          {refusal ?? error}
        </p>
      )}
    </>
  );
}

/**
 * A circular arrow, at the row's text size: the picked prototype's drawing.
 *
 * It turns in place while a check runs, so the row keeps its shape — a word in its place was
 * wider, and dropped the link under the box for the length of the check. Under reduced motion it
 * dims instead. Both are the browser's to decide from the reader's setting, as whole class names,
 * because Tailwind reads source text and an assembled one would generate nothing.
 */
function RefreshGlyph({ turning }: { turning: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={turning ? 'motion-safe:animate-spin motion-reduce:opacity-50' : undefined}
    >
      <path d="M13.2 6.4A5.4 5.4 0 0 0 3.3 4.6" />
      <path d="M2.8 9.6a5.4 5.4 0 0 0 9.9 1.8" />
      <path d="M13.4 2.6v3.9H9.5" />
      <path d="M2.6 13.4V9.5h3.9" />
    </svg>
  );
}
