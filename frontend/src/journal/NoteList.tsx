import { useId, useState } from 'react';
import { formatJournalDateTime } from '../lib/time';
import { ConfirmDelete } from './ConfirmDelete';
import type { Note } from '../api/types';

/**
 * Enter sends what is in the box; Shift+Enter puts a line in it.
 *
 * The convention every compose box carries, and it belongs here for the reason it exists there:
 * most journal entries are one line, so without it writing a thought down is a gesture per
 * thought. Shift+Enter is the other half rather than a concession — a note's body is stored and
 * rendered whitespace-preserved, so several lines is something the feature already supports and
 * only the keyboard was in the way of.
 *
 * `preventDefault` is what stops the line being inserted *as well as* the note being sent. A
 * textarea submits nothing on its own, so without it Enter would do both.
 *
 * **The composing check is the trap.** An input method reports the Enter that accepts a
 * candidate as an ordinary key press, so a note typed in Japanese or Korean would be sent
 * halfway through its first word — and what was sent is a note rather than a draft, so there is
 * nothing to take back but a delete. `isComposing` is the only thing that tells the two Enters
 * apart, and it is read off the native event because React's synthetic one does not carry it.
 *
 * A plain handler rather than a hook, and local to this file rather than `lib/`: both call sites
 * are the two textareas below, and a helper moves up only when two *areas* need it — which is
 * what happened to `formatHours` when the board started printing a duration too.
 */
function sendOnEnter(event: React.KeyboardEvent, send: () => void) {
  if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
    return;
  }

  event.preventDefault();
  send();
}

export interface NoteListProps {
  notes: Note[];
  /** Open on the pass you are on; a click away on one that is over. */
  composeOpen: boolean;
  busy: boolean;
  error: string | null;
  onWrite: (body: string) => void;
  onRewrite: (noteId: number, body: string) => void;
  onDelete: (noteId: number) => void;
}

/**
 * What was written during one pass.
 *
 * Newest first, as the API sends them — this does not re-sort, for the same reason the drawer
 * does not re-derive which pass is current. Each note carries its time of day, because "beat it
 * at 9:30pm" is the entry worth reading back and the date alone is a filing label.
 */
export function NoteList({
  notes,
  composeOpen,
  busy,
  error,
  onWrite,
  onRewrite,
  onDelete,
}: NoteListProps) {
  const ids = useId();
  const [composing, setComposing] = useState(composeOpen);
  const [draft, setDraft] = useState('');
  // Which note is being rewritten, and which is being asked about. By id rather than a flag,
  // because every note in the list carries the same pair of controls.
  const [editing, setEditing] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);

  // Guarded here rather than left to the button, because Enter reaches this and a button's
  // `disabled` is not a rule — it is a rendering of one. Both conditions are the two the Add
  // note button is drawn from, so the keyboard and the pointer cannot come to different answers
  // about whether there is anything to send.
  function write() {
    if (busy || draft.trim() === '') {
      return;
    }

    onWrite(draft.trim());
    setDraft('');
  }

  return (
    <div className="flex flex-col gap-2">
      {composing ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-new`} className="sr-only">
            New note
          </label>
          <textarea
            id={`${ids}-new`}
            rows={3}
            value={draft}
            placeholder="write a note…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => sendOnEnter(event, write)}
            className="w-full rounded border border-line bg-surface px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={write}
            disabled={busy}
            className="self-start rounded border border-line px-2 py-0.5 text-xs font-medium hover:bg-hover disabled:opacity-50"
          >
            Add note
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="self-start rounded text-xs text-muted hover:text-fg"
        >
          Add a note
        </button>
      )}

      {error !== null && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}

      {notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1">
              <NoteRow
                note={entry}
                editing={editing === entry.id}
                busy={busy}
                onEdit={() => setEditing(entry.id)}
                onDone={() => setEditing(null)}
                onRewrite={(body) => {
                  onRewrite(entry.id, body);
                  setEditing(null);
                }}
                confirming={confirming === entry.id}
                onAsk={() => setConfirming(entry.id)}
                onCancel={() => setConfirming(null)}
                onDelete={() => {
                  onDelete(entry.id);
                  setConfirming(null);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface NoteRowProps {
  note: Note;
  editing: boolean;
  busy: boolean;
  confirming: boolean;
  onEdit: () => void;
  onDone: () => void;
  onRewrite: (body: string) => void;
  onAsk: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

function NoteRow({
  note,
  editing,
  busy,
  confirming,
  onEdit,
  onDone,
  onRewrite,
  onAsk,
  onCancel,
  onDelete,
}: NoteRowProps) {
  const ids = useId();
  const [draft, setDraft] = useState(note.body);
  // Named by when it was written, because every row carries the same two controls and a reader
  // who cannot see which row they sit on would hear the same word over and over.
  const when = formatJournalDateTime(note.writtenAt) ?? '';

  // The same shape as `write` above and for its reason: the Save note button is drawn from these
  // two conditions, and Enter has to be held to them too, or it is a way past a disabled control
  // and into the 400 the API answers an empty body with.
  //
  // This is the arguable half of the change. Enter-to-send is unarguable in a compose box and
  // genuinely split in an edit box, which is where it is likeliest to be reached for out of habit
  // partway through a thought. It is here because these are one box doing one job, and a textarea
  // that answers Enter in one place and not the other is the near-miss this codebase has paid for
  // before. One call site below to take back if it reads wrong.
  function rewrite() {
    if (busy || draft.trim() === '') {
      return;
    }

    onRewrite(draft.trim());
  }

  if (editing) {
    return (
      <>
        <label htmlFor={`${ids}-body`} className="sr-only">
          Note from {when}
        </label>
        <textarea
          id={`${ids}-body`}
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => sendOnEnter(event, rewrite)}
          className="w-full rounded border border-line bg-surface px-2 py-1 text-sm"
        />
        <span className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={rewrite}
            disabled={busy || draft.trim() === ''}
            className="rounded font-medium hover:underline disabled:opacity-50"
          >
            Save note
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded text-muted hover:underline"
          >
            Cancel
          </button>
        </span>
      </>
    );
  }

  return (
    <>
      <span className="flex flex-wrap items-baseline gap-2 text-xs text-muted">
        <span>{when}</span>

        <button
          type="button"
          aria-label={`Edit the note from ${when}`}
          onClick={onEdit}
          className="rounded hover:text-fg"
        >
          Edit
        </button>

        <ConfirmDelete
          label={`Delete the note from ${when}`}
          warning={null}
          confirming={confirming}
          busy={busy}
          error={null}
          onAsk={onAsk}
          onCancel={onCancel}
          onConfirm={onDelete}
        />
      </span>

      {/* Whitespace preserved: a note written across several lines was written that way. */}
      <p className="text-sm whitespace-pre-wrap">{note.body}</p>
    </>
  );
}
