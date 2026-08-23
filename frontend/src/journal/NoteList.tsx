import { useId, useState } from 'react';
import { formatJournalDateTime } from '../lib/time';
import { ConfirmDelete } from './ConfirmDelete';
import type { Note } from '../api/types';

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

  function write() {
    if (draft.trim() === '') {
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
          className="w-full rounded border border-line bg-surface px-2 py-1 text-sm"
        />
        <span className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => onRewrite(draft.trim())}
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
