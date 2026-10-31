import { useId, useRef, useState, type ReactNode } from 'react';
import type { HeldPicture } from './usePictureDraft';

/**
 * Whether a drag carries files, which is the only kind the box and the drawer take. A drag of
 * words, or of a link out of another tab, goes on as it would anywhere else.
 */
export function carriesFiles(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

/** How many files a drag over the box is carrying, for the words it shows. */
function filesHeld(event: React.DragEvent): number {
  const items = Array.from(event.dataTransfer?.items ?? []);
  return items.length === 0 ? 1 : items.filter((item) => item.kind === 'file').length;
}

/**
 * The paste rule, measured on 30 October 2026 in the user's Firefox with a probe that logged
 * each paste: **a paste with words in it is words.** Excel puts a picture of the copied cells on
 * the clipboard beside the row as plain text, so taking every picture would turn a pasted row
 * into a picture of it. A paste with no words attaches each picture it carries: a snip from
 * Win+Shift+S or ShareX is one PNG and nothing else, and Discord's *Copy image* a PNG and some
 * HTML. Word and OneNote were not tried; both put words on the clipboard, so their words paste.
 *
 * Returns the files to take, or null to let the paste go ahead as the browser's.
 */
export function picturesPasted(clipboard: DataTransfer | null): File[] | null {
  if (clipboard === null || Array.from(clipboard.types).includes('text/plain')) {
    return null;
  }

  const files = Array.from(clipboard.files);
  return files.length === 0 ? null : files;
}

/** A picture frame, the shape chat apps use for the same button. */
function PictureGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <circle cx="5.5" cy="6.2" r="1.3" />
      <path
        d="M2.2 12.2 6 8.4l2.8 2.8 1.9-1.9 3.1 3.1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The button that opens the file picker, and the picker it opens. On the phone this is the way
 * in: Android's picker offers the gallery and the camera for `image/*`, which is where a
 * console's screenshot or a photo of the TV is. Picked at the workshop as an icon before the
 * box's own button, named for a screen reader and on hover.
 */
export function PictureButton({ onPick, disabled }: { onPick: (files: File[]) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label="Add a picture"
        title="Add a picture"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="grid h-6 w-6 place-items-center rounded border border-line text-muted hover:bg-hover hover:text-fg disabled:opacity-50"
      >
        <PictureGlyph />
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          onPick(Array.from(event.target.files ?? []));
          // Emptied, so choosing the same picture again after taking it out still arrives.
          event.target.value = '';
        }}
      />
    </>
  );
}

export interface NoteBoxProps {
  /** What a screen reader calls the box: *New note*, or the note's own date when rewriting. */
  label: string;
  words: string;
  onWords: (words: string) => void;
  held: readonly HeldPicture[];
  onAdd: (files: File[]) => void;
  onTakeOut: (key: string) => void;
  /** While its note is on its way: the words are read-only and the pictures dimmed. */
  sending: boolean;
  onKeyDown: (event: React.KeyboardEvent) => void;
  /** The row under the box: the picture button, and the box's own buttons after it. */
  actions: ReactNode;
}

/**
 * The box a note is written in, and rewritten in: one box doing one job, so a picture pasted
 * into either is taken the same way, as Enter sends from either.
 *
 * **A waiting picture sits inside the box's border, under the words**, with an × on each, picked
 * at the #18 workshop over a row under the box. A file held over it dashes the border and says
 * so. Nothing here sends anything: what the box holds goes with its note, in one request.
 */
export function NoteBox({
  label,
  words,
  onWords,
  held,
  onAdd,
  onTakeOut,
  sending,
  onKeyDown,
  actions,
}: NoteBoxProps) {
  const ids = useId();
  // How many files are held over the box, or null when none are.
  const [over, setOver] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${ids}-box`} className="sr-only">
        {label}
      </label>
      <div
        onDragOver={(event) => {
          if (!carriesFiles(event)) {
            return;
          }

          event.preventDefault();
          setOver(filesHeld(event));
        }}
        onDragLeave={(event) => {
          // Moving onto the words or a thumbnail inside the box is not leaving it.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setOver(null);
          }
        }}
        onDrop={(event) => {
          if (!carriesFiles(event)) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          setOver(null);
          if (!sending) {
            onAdd(Array.from(event.dataTransfer.files));
          }
        }}
        className={`relative rounded border bg-surface focus-within:border-accent ${
          over === null ? 'border-line' : 'border-dashed border-accent'
        }`}
      >
        <textarea
          id={`${ids}-box`}
          rows={3}
          value={words}
          placeholder="write a note…"
          readOnly={sending}
          onChange={(event) => onWords(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={(event) => {
            const files = picturesPasted(event.clipboardData);
            if (files === null) {
              return;
            }

            // Prevented, or the browser pastes the file's name as words, or nothing at all.
            //
            // Not taken while the note is on its way: the send has already taken what the box
            // held, and the box is cleared when it lands, so a picture added meanwhile would be
            // cleared away with it, never sent and never said. The drop and the picker hold to
            // the same, the picker by its button being disabled.
            event.preventDefault();
            if (!sending) {
              onAdd(files);
            }
          }}
          className="block w-full resize-y rounded bg-transparent px-2 py-1 text-sm outline-none"
        />

        {held.length > 0 && (
          <ul className="flex flex-wrap gap-2 px-2 pt-1 pb-2">
            {held.map((picture) => (
              <li key={picture.key} className="relative">
                <img
                  src={picture.src}
                  width={picture.width}
                  height={picture.height}
                  alt=""
                  className={`h-14 w-14 rounded border border-line object-cover ${sending ? 'opacity-50' : ''}`}
                />
                <button
                  type="button"
                  aria-label="Take this picture out"
                  disabled={sending}
                  onClick={() => onTakeOut(picture.key)}
                  className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-fg text-[11px] leading-none text-surface shadow"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {over !== null && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center rounded border-2 border-dashed border-accent bg-surface/85 text-xs font-medium text-accent">
            {over === 1 ? 'Drop to add the picture' : 'Drop to add the pictures'}
          </div>
        )}
      </div>
      {actions}
    </div>
  );
}
