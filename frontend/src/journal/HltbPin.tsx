import { useId, useState } from 'react';
import { parseHltbId } from './fields';

export interface HltbPinProps {
  /** What is stored against the title, or null when nothing has matched it yet. */
  hltbId: number | null;
  saving: boolean;
  /** What the server said when it refused the id, or null. */
  error: string | null;
  onPin: (hltbId: number | null) => void;
}

/**
 * Naming the HowLongToBeat entry for a title by hand.
 *
 * The matcher writes nothing when it is unsure, which is the right refusal and leaves two ways
 * of being wrong on screen: a title it could not match, and a title it matched to the wrong
 * game. Both are fixed by saying which id is right, and unlike typed-in hours a pinned id
 * survives the next backfill — it is what every later refresh fetches instead of matching again.
 *
 * The link is the other half. HowLongToBeat's name for a game is often not IGDB's, which is the
 * entire reason a matcher exists, so no column stores the matched title — following the link is
 * how you check that the numbers belong to the game you meant.
 */
export function HltbPin({ hltbId, saving, error, onPin }: HltbPinProps) {
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
   * pinning is the one route that holds the caller while the server reads a website. So this
   * waits for the number to be finished — a blur or an Enter, which is what the DOM's own
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

  return (
    <div className="flex flex-col gap-1 text-xs text-muted">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="font-medium">
          HowLongToBeat ID
        </label>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="—"
          value={value}
          disabled={saving}
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

        {saving && <span>Checking…</span>}

        {hltbId !== null && (
          <a
            href={`https://howlongtobeat.com/game/${hltbId}`}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-fg"
          >
            View on HowLongToBeat
          </a>
        )}
      </div>

      {/* The local rule wins when it fires, because it is what stopped the request going. */}
      {(refusal ?? error) !== null && (
        <p role="alert" className="text-danger">
          {refusal ?? error}
        </p>
      )}
    </div>
  );
}

