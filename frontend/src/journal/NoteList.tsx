import { useState } from 'react';
import { Marked } from '../lib/Marked';
import { formatJournalDateTime } from '../lib/time';
import { useOverlayHistory } from '../lib/useOverlayHistory';
import { ConfirmDelete } from './ConfirmDelete';
import { NoteBox, PictureButton } from './NoteBox';
import { Collage, Lightbox } from './NotePictures';
import { usePictureDraft } from './usePictureDraft';
import type { NotePictures, PictureUpload } from '../api/notes';
import type { Note } from '../api/types';

/** A stable handle on a note in the journal, for a search to open the journal at. */
export const noteRowId = (noteId: number) => `note-${noteId}`;

/** The note a search opened the journal at, and the words it was found by. */
export interface FoundNote {
  noteId: number;
  words: readonly string[];
}

/**
 * How the note a search found is marked: a bar of the accent beside it, until the journal closes.
 * Picked at the #6 workshop over the note tinted and over a ring that fades, because it puts no
 * colour behind the words, which carry their own marks. The negative margin and the padding
 * cancel, so its text stays in line with every other note's and the bar sits in the margin.
 *
 * No outline: the keyboard is on the note, and the bar is what shows where.
 */
const FOUND = '-ml-3 border-l-2 border-accent pl-2.5 outline-none';

/**
 * The history entry a picture opened full size is, so the phone's Back closes it and leaves the
 * journal open. The drawer reads it too, to keep its keys to itself while a picture is up.
 */
export const PICTURE_OVERLAY = 'picture';

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
 * are the two boxes below, and a helper moves up only when two *areas* need it — which is
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
  /**
   * Sends a note, with any pictures it holds. A promise, so the box can tell a send that failed
   * from one that went: it keeps its words and pictures until the note is written.
   */
  onWrite: (body: string, pictures: readonly PictureUpload[]) => Promise<unknown>;
  /**
   * Rewrites a note. `pictures` is what a rewrite does to them, and is left out for a note that
   * has none and gains none, which is rewritten as it always was.
   */
  onRewrite: (noteId: number, body: string, pictures?: NotePictures) => Promise<unknown>;
  onDelete: (noteId: number) => void;
  /**
   * The note a search found, if the journal was opened from one, which may be on another pass:
   * every pass's list is told, and the one that holds it marks it.
   */
  found?: FoundNote | null;
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
  found = null,
}: NoteListProps) {
  const [composing, setComposing] = useState(composeOpen);
  const [draft, setDraft] = useState('');
  const pictures = usePictureDraft();
  const [sending, setSending] = useState(false);
  // Which note is being rewritten, and which is being asked about. By id rather than a flag,
  // because every note in the list carries the same pair of controls.
  const [editing, setEditing] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);

  // Guarded here rather than left to the button, because Enter reaches this and a button's
  // `disabled` is not a rule — it is a rendering of one. Both conditions are the ones the Add
  // note button is drawn from, so the keyboard and the pointer cannot come to different answers
  // about whether there is anything to send. Words, a picture, or both.
  //
  // **Cleared only once the note is written.** A send that fails keeps the words and the
  // pictures in the box, under what went wrong, to be sent again.
  async function write() {
    if (busy || sending || (draft.trim() === '' && pictures.held.length === 0)) {
      return;
    }

    setSending(true);
    try {
      await onWrite(draft.trim(), pictures.uploads());
      setDraft('');
      pictures.clear();
    } catch {
      // Said by the drawer, which owns the write.
    } finally {
      setSending(false);
    }
  }

  const problem = pictures.problem ?? error;

  return (
    <div className="flex flex-col gap-2">
      {composing ? (
        <NoteBox
          label="New note"
          words={draft}
          onWords={setDraft}
          held={pictures.held}
          onAdd={(files) => void pictures.add(files)}
          onTakeOut={pictures.takeOut}
          sending={sending}
          onKeyDown={(event) => sendOnEnter(event, () => void write())}
          actions={
            <div className="flex items-center gap-2">
              <PictureButton onPick={(files) => void pictures.add(files)} disabled={sending} />
              <button
                type="button"
                onClick={() => void write()}
                disabled={busy || sending}
                className="rounded border border-line px-2 py-0.5 text-xs font-medium hover:bg-hover disabled:opacity-50"
              >
                {sending && pictures.held.length > 0 ? 'Adding…' : 'Add note'}
              </button>
            </div>
          }
        />
      ) : (
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="self-start rounded text-xs text-muted hover:text-fg"
        >
          Add a note
        </button>
      )}

      {problem !== null && (
        <p role="alert" className="text-xs text-danger">
          {problem}
        </p>
      )}

      {notes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {notes.map((entry) => (
            <li
              key={entry.id}
              id={noteRowId(entry.id)}
              // The note the journal was opened for. Current in the list, which a screen reader
              // says, and able to hold the keyboard, which the drawer moves to it once it is here.
              aria-current={found?.noteId === entry.id ? true : undefined}
              tabIndex={found?.noteId === entry.id ? -1 : undefined}
              className={`flex flex-col gap-1 ${found?.noteId === entry.id ? FOUND : ''}`}
            >
              <NoteRow
                note={entry}
                words={found?.noteId === entry.id ? found.words : NO_WORDS}
                editing={editing === entry.id}
                busy={busy}
                onEdit={() => setEditing(entry.id)}
                onDone={() => setEditing(null)}
                onRewrite={async (body, changes) => {
                  await onRewrite(entry.id, body, changes);
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

/** What every note but a found one marks: nothing. */
const NO_WORDS: readonly string[] = [];

interface NoteRowProps {
  note: Note;
  /** The words of the search that found it, marked in its body. None for every other note. */
  words: readonly string[];
  editing: boolean;
  busy: boolean;
  confirming: boolean;
  onEdit: () => void;
  onDone: () => void;
  onRewrite: (body: string, pictures?: NotePictures) => Promise<void>;
  onAsk: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

function NoteRow({
  note,
  words,
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
  // Named by when it was written, because every row carries the same two controls and a reader
  // who cannot see which row they sit on would hear the same word over and over.
  const when = formatJournalDateTime(note.writtenAt) ?? '';
  const viewer = useOverlayHistory(PICTURE_OVERLAY);
  const viewing = note.pictures.some((picture) => picture.id === viewer.openFor);

  if (editing) {
    return <NoteEdit note={note} when={when} busy={busy} onDone={onDone} onRewrite={onRewrite} />;
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

      {/* Whitespace preserved: a note written across several lines was written that way. The
          marks change nothing else about it, so the text reads exactly as written. A note that is
          a picture alone has no words, and no empty line for them. */}
      {note.body !== '' && (
        <p className="text-sm whitespace-pre-wrap">
          <Marked text={note.body} words={words} />
        </p>
      )}

      {/* Under the words: what you wrote, then what you pasted with it, which is the order you
          made them in. */}
      {note.pictures.length > 0 && (
        <Collage pictures={note.pictures} when={when} onOpen={viewer.open} />
      )}

      {viewing && viewer.openFor !== null && (
        <Lightbox
          pictures={note.pictures}
          startAt={viewer.openFor}
          when={when}
          onClose={viewer.close}
        />
      )}
    </>
  );
}

/**
 * A note being rewritten: its words and its pictures, in the same box a note is written in. It
 * takes a picture the same three ways and can take any out, and the words and the pictures are
 * saved in one request.
 */
function NoteEdit({
  note,
  when,
  busy,
  onDone,
  onRewrite,
}: {
  note: Note;
  when: string;
  busy: boolean;
  onDone: () => void;
  onRewrite: (body: string, pictures?: NotePictures) => Promise<void>;
}) {
  const [draft, setDraft] = useState(note.body);
  const pictures = usePictureDraft(note.pictures);
  const [sending, setSending] = useState(false);

  // The same shape as `write` above and for its reason: the Save note button is drawn from these
  // conditions, and Enter has to be held to them too, or it is a way past a disabled control
  // and into the 400 the API answers an empty note with.
  //
  // This is the arguable half of the change. Enter-to-send is unarguable in a compose box and
  // genuinely split in an edit box, which is where it is likeliest to be reached for out of habit
  // partway through a thought. It is here because these are one box doing one job, and a textarea
  // that answers Enter in one place and not the other is the near-miss this codebase has paid for
  // before. One call site below to take back if it reads wrong.
  const empty = draft.trim() === '' && pictures.held.length === 0;

  async function rewrite() {
    if (busy || sending || empty) {
      return;
    }

    // A note that has pictures, or gains one, says which it keeps: one not named is taken out.
    // A note of words that stays one is rewritten as it always was.
    const changes =
      note.pictures.length > 0 || pictures.held.length > 0 ? pictures.changes() : undefined;

    setSending(true);
    try {
      await onRewrite(draft.trim(), changes);
    } catch {
      // Said by the drawer, which owns the write. The box keeps what it held, to save again.
      setSending(false);
    }
  }

  return (
    <>
      <NoteBox
        label={`Note from ${when}`}
        words={draft}
        onWords={setDraft}
        held={pictures.held}
        onAdd={(files) => void pictures.add(files)}
        onTakeOut={pictures.takeOut}
        sending={sending}
        onKeyDown={(event) => sendOnEnter(event, () => void rewrite())}
        actions={
          <span className="flex items-center gap-2 text-xs">
            <PictureButton onPick={(files) => void pictures.add(files)} disabled={sending} />
            <button
              type="button"
              onClick={() => void rewrite()}
              disabled={busy || sending || empty}
              className="rounded font-medium hover:underline disabled:opacity-50"
            >
              {sending && pictures.held.length > 0 ? 'Saving…' : 'Save note'}
            </button>
            <button
              type="button"
              onClick={onDone}
              className="rounded text-muted hover:underline"
            >
              Cancel
            </button>
          </span>
        }
      />
      {pictures.problem !== null && (
        <p role="alert" className="text-xs text-danger">
          {pictures.problem}
        </p>
      )}
    </>
  );
}
