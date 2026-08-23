import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { formatJournalDate } from '../lib/time';
import { ConfirmDelete } from './ConfirmDelete';
import { EntryForm } from './EntryForm';
import { HltbPin } from './HltbPin';
import { NoteList } from './NoteList';
import { automaticGenre } from '../board/genres';
import { entrySeed } from './fields';
import { formatHours } from '../lib/hours';
import { useJournalEntry } from './useJournalEntry';
import { useNotes } from './useNotes';
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
  const { game, save, remove, setGenre, setHltbId, fieldErrors } = useJournalEntry(mediaId);
  const titleId = useId();
  const genreId = useId();
  const panel = useRef<HTMLElement>(null);
  // Which pass has been asked about, if any. One at a time, and by id rather than a flag,
  // because every row in the history carries the same control.
  const [confirming, setConfirming] = useState<number | null>(null);

  // Whether the form on screen matches what was last written.
  //
  // Here rather than in EntryForm, which is keyed on the values it was seeded from and so
  // remounts on any save that changed one — a flag set on success would be wiped by the very
  // refetch that confirms it. Not read off save.isSuccess either: that stays true until the next
  // write, where this has to stop being true as soon as a field is touched. The drawer unmounts
  // when it closes, so opening another title starts with nothing claimed.
  const [saved, setSaved] = useState(false);

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
  const onlyPass = detail !== undefined && detail.logEntries.length === 1;

  // The game's own genres, plus whatever is already chosen when that list has stopped mentioning
  // it. Exactly the platform select's rule, for exactly its reason.
  const genreOptions =
    detail === undefined || detail.primaryGenre === null
      ? (detail?.genres ?? [])
      : detail.genres.includes(detail.primaryGenre)
        ? detail.genres
        : [...detail.genres, detail.primaryGenre];

  function deletePass(entryId: number) {
    // Read before the mutation, because by the time it answers the refetch has already changed
    // what the drawer is holding.
    const wasTheLast = onlyPass;

    remove.mutate(entryId, {
      onSuccess: () => {
        setConfirming(null);
        if (wasTheLast) {
          onClose();
        }
      },
    });
  }

  const deleteProps = (entryId: number) => ({
    confirming: confirming === entryId,
    busy: remove.isPending,
    error: remove.error === null ? null : remove.error.message,
    onAsk: () => setConfirming(entryId),
    onCancel: () => setConfirming(null),
    onConfirm: () => deletePass(entryId),
  });

  const notes = useNotes(mediaId);
  const noteError = [notes.write.error, notes.rewrite.error, notes.remove.error].find(
    (failure) => failure !== null,
  );

  const noteProps = (entryId: number) => ({
    busy: notes.write.isPending || notes.rewrite.isPending || notes.remove.isPending,
    error: noteError?.message ?? null,
    onWrite: (body: string) => notes.write.mutate({ entryId, body }),
    onRewrite: (noteId: number, body: string) => notes.rewrite.mutate({ noteId, body }),
    onDelete: (noteId: number) => notes.remove.mutate(noteId),
  });

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


        {/* A property of the title, so it sits in the header describing the game rather than in
            the form describing a pass — which submits one PUT to a different endpoint and would
            otherwise be writing to two. Saves on change; there is nothing to hold back. */}
        {detail !== undefined && (
          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <label htmlFor={genreId} className="font-medium">
              Genre
            </label>
            <select
              id={genreId}
              value={detail.primaryGenre ?? ''}
              onChange={(event) =>
                setGenre.mutate(event.target.value === '' ? null : event.target.value)
              }
              className="rounded border border-neutral-300 bg-white px-1 py-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            >
              {/* Not "Not recorded": null here means "use the automatic pick", so the option
                  says which one that is. */}
              <option value="">{`Automatic — ${automaticGenre(detail.genres) ?? 'none'}`}</option>
              {genreOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {detail !== undefined && (
          <HltbPin
            // Re-seeds when the stored id changes — after a pin of your own, or after the
            // queue matches the title while the drawer is open. EntryForm is keyed for the
            // same reason: useState reads its initial value once. A refused pin leaves the id
            // alone, so what was typed stays in the box to be corrected.
            key={detail.hltbId}
            hltbId={detail.hltbId}
            saving={setHltbId.isPending}
            error={setHltbId.error === null ? null : setHltbId.error.message}
            onPin={(hltbId) => setHltbId.mutate(hltbId)}
          />
        )}

        {current !== undefined && detail !== undefined && (
          <PassSection entry={current} heading={STATUS_LABEL[current.status]}>
            <EntryForm
              // Remounts when a different card is opened, so the inputs reload rather than
              // keeping the last title's half-typed rating — and when this pass changes
              // underneath the drawer, which a drag does without changing its id. See entrySeed.
              key={entrySeed(current)}
              entry={current}
              platforms={detail.platforms}
              estimates={detail}
              saving={save.isPending}
              saved={saved}
              serverErrors={fieldErrors}
              onSave={(update) =>
                save.mutate(
                  { entryId: current.id, update },
                  { onSuccess: () => setSaved(true) },
                )
              }
              onEdit={() => setSaved(false)}
            />

            <ConfirmDelete
              label="Delete this pass"
              warning={
                onlyPass
                  ? `The only pass — deleting it takes ${detail.title} off your board.`
                  : null
              }
              {...deleteProps(current.id)}
            />

            <NoteList notes={current.notes} composeOpen {...noteProps(current.id)} />
          </PassSection>
        )}

        {earlier.length > 0 && (
          <section className="mt-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
            {/* A finished pass's own fields are read-only. It is a record of something that
                happened, and the schema goes to some trouble to keep it — offering to edit the
                dates here would undo that with a keystroke.

                Its notes are not, and neither is the pass itself. A note is yours to fix, and a
                pass that never happened is not a record worth keeping. */}
            <h3 className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
              Earlier passes
            </h3>

            <div className="flex flex-col gap-4">
              {earlier.map((entry) => (
                <PassSection key={entry.id} entry={entry} heading={headingFor(entry)}>
                  <div className="flex flex-wrap items-baseline gap-2 text-sm">
                    {entry.rating !== null && (
                      <span
                        role="img"
                        aria-label={`Rated ${entry.rating.toFixed(1)} out of 10`}
                        className="text-xs text-neutral-500"
                      >
                        ★ {entry.rating.toFixed(1)}
                      </span>
                    )}
                    {entry.hoursPlayed !== null && (
                      <span className="text-xs text-neutral-500">
                        {formatHours(entry.hoursPlayed)}
                      </span>
                    )}
                    {entry.platform !== null && (
                      <span className="text-xs text-neutral-500">{entry.platform}</span>
                    )}
                    <ConfirmDelete
                      // Named rather than a bare "Delete", because every pass carries one and a
                      // reader who cannot see which one it sits on would hear the same word over
                      // and over.
                      label={labelFor(entry)}
                      warning={null}
                      {...deleteProps(entry.id)}
                    />
                  </div>

                  <NoteList notes={entry.notes} composeOpen={false} {...noteProps(entry.id)} />
                </PassSection>
              ))}
            </div>
          </section>
        )}
      </aside>
    </>
  );
}

interface PassSectionProps {
  entry: LogEntry;
  /** What the pass is called, and what names the region a screen reader can jump to. */
  heading: string;
  children: ReactNode;
}

/**
 * One pass and everything about it.
 *
 * A labelled region rather than a list item, which is how `Column` already solves the same
 * problem — several passes on one screen, each carrying identically-named controls, and tests
 * and screen readers both needing to say which one they mean.
 */
function PassSection({ entry, heading, children }: PassSectionProps) {
  const headingId = `pass-${entry.id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <p id={headingId} className="text-sm text-neutral-500">
        {heading}
      </p>
      {children}
    </section>
  );
}

/** When the pass ended, or when it started if it never did. Mirrors the card's `lastActivity`. */
function whenOf(entry: LogEntry): string | null {
  return formatJournalDate(entry.completedAt ?? entry.startedAt);
}

/** What names an earlier pass's region: "Completed Nov 2, 2024", or just its status. */
function headingFor(entry: LogEntry): string {
  const when = whenOf(entry);
  return when === null ? STATUS_LABEL[entry.status] : `${STATUS_LABEL[entry.status]} ${when}`;
}
/** Which pass a delete button in the history would take, for a reader who cannot see the row. */
function labelFor(entry: LogEntry): string {
  const when = whenOf(entry);
  return `Delete the ${STATUS_LABEL[entry.status]} pass${when === null ? '' : ` from ${when}`}`;
}
