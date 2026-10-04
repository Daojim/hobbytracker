import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountKey, getAccount } from '../api/account';
import { describeDeletion } from './warning';
import type { useDeleteAccount } from './useDeleteAccount';

type Deletion = ReturnType<typeof useDeleteAccount>;

export interface DeleteAccountProps {
  /** The delete itself, held by the menu, so a panel shut and opened again finds it still going. */
  deletion: Deletion;
}

/**
 * The last row of Settings' *Your data* group, and the warning it opens into.
 *
 * The row is tinted, as the card menu's *Remove from board* is: plain rows do things and the
 * tinted one deletes. Pressed, it keeps its name and its tint and opens into the warning, so the
 * tint is the edge of everything that deletes. That was picked from renders on 4 October 2026
 * over the warning taking the row's place on the panel's own ground; the page is linked from #8
 * in `docs/plans/games-board-next.md`.
 */
export function DeleteAccount({ deletion }: DeleteAccountProps) {
  // Open from the start when a delete is still on its way, so a panel shut and opened again shows
  // it working rather than the row, as though nothing had been pressed.
  const [open, setOpen] = useState(deletion.isPending);
  const row = useRef<HTMLButtonElement>(null);
  const cancelled = useRef(false);

  // Cancel hands the keyboard back to the row that opened the warning, the drawer's rule: what
  // opened something is where focus belongs when it shuts, or the next Tab starts from the top.
  useEffect(() => {
    if (!open && cancelled.current) {
      cancelled.current = false;
      row.current?.focus();
    }
  }, [open]);

  if (!open) {
    return (
      <button
        ref={row}
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 rounded bg-danger/10 px-2 py-1 text-left text-sm hover:bg-danger/25"
      >
        Delete my account…
      </button>
    );
  }

  return (
    <Warning
      deletion={deletion}
      onCancel={() => {
        cancelled.current = true;
        setOpen(false);
      }}
    />
  );
}

/**
 * What deleting takes, and the word that does it.
 *
 * A word to type rather than a second press, because this is the one delete in the app that
 * reaches past the board you are looking at, and the app cannot undo it. Any case and spaces
 * either side, since a phone capitalises the first letter of a field.
 */
function Warning({ deletion, onCancel }: { deletion: Deletion; onCancel: () => void }) {
  const ids = useId();
  const [typed, setTyped] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  // Asked for each time the warning opens, and kept for none of them. The app holds an answer
  // for five minutes by default, and a count from the last time is a number about a board that
  // may have changed since. Until it arrives, or if it never does, the sentence goes without.
  const account = useQuery({ queryKey: accountKey, queryFn: getAccount, staleTime: 0, gcTime: 0 });

  // The keyboard goes where the next step is. Without scrolling, so the scroll is the warning's,
  // with its scroll margin under the buttons.
  useEffect(() => {
    field.current?.focus({ preventScroll: true });
  }, []);

  // The warning scrolls itself into view, because the panel is taller than most windows and the
  // row sits at its foot. Once as it opens, and again when the counts arrive: they add two lines
  // to the sentence and pushed the buttons back off a 900px window the first time. `nearest`
  // does nothing when it is already in view. jsdom has no scrollIntoView, hence the optional call.
  useEffect(() => {
    box.current?.scrollIntoView?.({ block: 'nearest' });
  }, [account.data]);

  const confirmed = typed.trim().toLowerCase() === 'delete';
  const busy = deletion.isPending;

  return (
    <>
      <div
        ref={box}
        role="group"
        aria-labelledby={`${ids}-name`}
        className="mt-1 flex scroll-mb-4 flex-col gap-2 rounded bg-danger/10 px-2 pt-1 pb-2 text-xs"
      >
        <p id={`${ids}-name`} className="text-sm">
          Delete my account
        </p>
        <p id={`${ids}-what`}>{describeDeletion(account.data ?? null)}</p>
        <p id={`${ids}-undo`} className="font-semibold">
          It can’t be undone.
        </p>
        <p id={`${ids}-backups`} className="text-muted">
          The nightly backups keep a copy for about two weeks, then that goes too.
        </p>

        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (confirmed && !busy) {
              deletion.mutate();
            }
          }}
        >
          <label className="flex flex-col gap-1">
            <span>
              Type <strong className="font-semibold">delete</strong> to confirm
            </span>
            {/* Read-only rather than disabled while it works, and the buttons are held by
                aria-disabled rather than disabled: a real browser takes focus off a control the
                moment it is disabled, and the keyboard would land at the top of the page with the
                delete still going. The spreadsheet's row measured that first. */}
            <input
              ref={field}
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              readOnly={busy}
              aria-describedby={`${ids}-what ${ids}-undo ${ids}-backups`}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded border border-line bg-surface px-2 py-1 text-sm"
            />
          </label>

          <span className="flex flex-wrap items-baseline gap-2">
            {/* Filled, for ConfirmDelete's reason: on Ember the accent is red as well, and a
                destructive control must not be one hue away from a link. */}
            <button
              type="submit"
              aria-disabled={!confirmed || busy || undefined}
              className="rounded bg-danger px-2 py-0.5 font-semibold text-danger-fg aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              {busy ? 'Deleting…' : 'Delete my account'}
            </button>

            {/* On the panel's ground, because on the dark themes the tint and the border are
                nearly one colour and a bordered button there read as plain text. Held while the
                delete works: it cannot stop one that has already been sent. */}
            <button
              type="button"
              onClick={() => {
                if (!busy) {
                  onCancel();
                }
              }}
              aria-disabled={busy || undefined}
              className="rounded border border-line bg-surface px-2 py-0.5 text-muted hover:bg-hover hover:text-fg aria-disabled:opacity-50"
            >
              Cancel
            </button>
          </span>
        </form>
      </div>

      {/* Under the tint rather than inside it, on the panel's own ground, as the spreadsheet's
          failure line is: danger on bg-danger/10 measured 4.24:1 on Dusk, where the panel gives
          it 5.05. index.css.test.ts holds the text that does sit on the tint. */}
      {deletion.isError && (
        <p role="alert" className="px-2 pt-0.5 pb-1 text-xs text-danger">
          Couldn’t delete your account. Try again.
        </p>
      )}
    </>
  );
}
