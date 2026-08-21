import { useEffect, useId, useRef } from 'react';
import { formatJournalDate } from '../lib/time';
import { EntryForm } from './EntryForm';
import { entrySeed } from './fields';
import { useJournalEntry } from './useJournalEntry';
import type { LogEntry, LogStatus } from '../api/types';

/** "Playing" is what a person calls it; `InProgress` is what the protocol calls it. */
const STATUS_LABEL: Record<LogStatus, string> = {
  Backlog: 'Backlog',
  InProgress: 'Playing',
  Completed: 'Completed',
  Dropped: 'Dropped',
};

/** What Tab can land on. Mirrors the browser's own idea of it closely enough for one panel. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface EntryDrawerProps {
  mediaId: number;
  onClose: () => void;
}

/**
 * Journalling a title, over the board rather than away from it.
 *
 * Rating, notes and dates were reachable by the API and by nothing else — the card has always
 * rendered a rating that could never be set. This is where they become real.
 */
export function EntryDrawer({ mediaId, onClose }: EntryDrawerProps) {
  const { game, save, fieldErrors } = useJournalEntry(mediaId);
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);

  // The keyboard follows the drawer in. Without this the focus is still on the board behind,
  // and the first Tab walks the columns rather than the form that just opened.
  useEffect(() => {
    panel.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || panel.current === null) {
        return;
      }

      // aria-modal below promises a screen reader that the board is inert while this is open.
      // Letting Tab walk out onto it would make that promise false for anyone who reads by
      // tabbing, so the two are kept honest together.
      const stops = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (first === undefined || last === undefined) {
        return;
      }

      const here = document.activeElement;
      if (event.shiftKey && (here === first || here === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && here === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const detail = game.data;
  // The API orders entries logged_at DESC, id DESC — the same rule the board decides "current"
  // by — so the first one is the pass the card is showing. Re-deriving that here would be a
  // fourth copy of an ordering that has already drifted once.
  const current = detail?.logEntries[0];
  const earlier = detail?.logEntries.slice(1) ?? [];

  return (
    <>
      {/* Presentation rather than aria-hidden: `aria-modal` on the panel is already what tells
          a screen reader the board behind is inert, and this exists for the pointer. Closing
          without prompting is safe because every sub-form has its own explicit save — the one
          thing at risk is an unposted draft, which is cheaper to retype than to guard. */}
      <div
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 z-10 bg-neutral-900/20 dark:bg-neutral-950/50"
      />

      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-20 flex w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-neutral-300 bg-white p-5 shadow-xl outline-none dark:border-neutral-700 dark:bg-neutral-900"
      >
        <div className="flex items-start gap-3">
          <h2 id={titleId} className="flex-1 text-lg font-semibold">
            {detail?.title ?? 'Loading…'}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="h-6 w-6 shrink-0 rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            ×
          </button>
        </div>

        {game.error !== null && (
          <p role="alert" className="text-sm text-red-600">
            {game.error.message}
          </p>
        )}

        {detail !== undefined && (
          <p className="text-xs text-neutral-500">
            {[detail.platforms.join(', '), detail.developers.join(', ')]
              .filter((line) => line !== '')
              .join(' · ')}
          </p>
        )}

        {current !== undefined && (
          <>
            <p className="text-sm text-neutral-500">{STATUS_LABEL[current.status]}</p>

            <EntryForm
              // Remounts when a different card is opened, so the inputs reload rather than
              // keeping the last title's half-typed notes — and when this pass changes underneath
              // the drawer, which a drag does without changing its id. See `entrySeed`.
              key={entrySeed(current)}
              entry={current}
              saving={save.isPending}
              serverErrors={fieldErrors}
              onSave={(update) => save.mutate({ entryId: current.id, update })}
            />
          </>
        )}

        {earlier.length > 0 && (
          <section className="mt-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
            {/* Read-only on purpose. A finished playthrough is a record of something that
                happened, and the schema goes to some trouble to keep it — offering to edit it
                here would undo that with a keystroke. */}
            <h3 className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
              Earlier passes
            </h3>
            <ul className="flex flex-col gap-2 text-sm">
              {earlier.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-2">
                  <span>{STATUS_LABEL[entry.status]}</span>
                  {whenOf(entry) !== null && (
                    <span className="text-xs text-neutral-500">{whenOf(entry)}</span>
                  )}
                  {entry.rating !== null && (
                    <span
                      role="img"
                      aria-label={`Rated ${entry.rating.toFixed(1)} out of 10`}
                      className="text-xs text-neutral-500"
                    >
                      ★ {entry.rating.toFixed(1)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </>
  );
}

/** When the pass ended, or when it started if it never did. Mirrors the card's `lastActivity`. */
function whenOf(entry: LogEntry): string | null {
  return formatJournalDate(entry.completedAt ?? entry.startedAt);
}
