import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { pictureUrl } from '../api/notes';
import { useModalPanel } from '../lib/useModalPanel';
import type { NotePicture } from '../api/types';

/** A stable handle on the button that opens a picture, so closing it can hand the keyboard back. */
export const pictureButtonId = (pictureId: number) => `picture-${pictureId}`;

/** What pressing a picture is called: the note's date, and which picture when there are several. */
function openLabel(pictures: readonly NotePicture[], at: number, when: string) {
  return pictures.length === 1
    ? `Open the picture from ${when}`
    : `Open picture ${at + 1} of ${pictures.length} from ${when}`;
}

/**
 * A note's pictures, under its words: picked at the #18 workshop over thumbnails and over every
 * picture whole. **A lone picture is shown whole**, as wide as the column and at most 320px tall,
 * so a status screen reads at a glance and a photo of the TV is not cropped. **Two or more are
 * 16:9 tiles**, two to a row and cropped to fill them: three are one across and two under it, and
 * four are two by two. The five staged notes took 1,316px at drawer width, against 710 as
 * thumbnails and 2,911 large.
 *
 * Every picture is drawn at its stored size, as the `<img>`'s own attributes, so its space is
 * held before it arrives. A journal opened at a note a search found scrolls to it, and pictures
 * above it arriving afterwards would push it back out of view.
 */
export function Collage({
  pictures,
  when,
  onOpen,
}: {
  pictures: readonly NotePicture[];
  when: string;
  onOpen: (pictureId: number) => void;
}) {
  const [only] = pictures;
  if (pictures.length === 1 && only !== undefined) {
    return (
      <button
        type="button"
        id={pictureButtonId(only.id)}
        aria-label={openLabel(pictures, 0, when)}
        onClick={() => onOpen(only.id)}
        className="block max-w-full self-start rounded"
      >
        <img
          src={pictureUrl(only.id)}
          width={only.width}
          height={only.height}
          alt=""
          className="h-auto max-h-80 w-auto max-w-full rounded border border-line"
        />
      </button>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-1.5">
      {pictures.map((picture, at) => (
        <li key={picture.id} className={pictures.length === 3 && at === 0 ? 'col-span-2' : ''}>
          <button
            type="button"
            id={pictureButtonId(picture.id)}
            aria-label={openLabel(pictures, at, when)}
            onClick={() => onOpen(picture.id)}
            className="block w-full rounded"
          >
            <img
              src={pictureUrl(picture.id)}
              width={picture.width}
              height={picture.height}
              alt=""
              className="aspect-video h-auto w-full rounded border border-line object-cover"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * A picture over everything, on near-black: picked at the #18 workshop over growing it in place
 * and over a new tab, which leaves the installed app on a phone.
 *
 * **It fits the picture to the window and never enlarges one**, because blowing up a 537px snip
 * only blurs it. ‹ › and the arrow keys step through the note's pictures, with the note's date
 * and *1 of 2* above. Escape, × and Back close it, and the journal stays open under it: its
 * openness is a history entry of its own, which the drawer reads to keep its keys to itself
 * meanwhile, as the picker does under the journal.
 *
 * A portal, so nothing the drawer is inside, its scroll or a transform, can hold it to the
 * drawer's box.
 */
export function Lightbox({
  pictures,
  startAt,
  when,
  onClose,
}: {
  pictures: readonly NotePicture[];
  startAt: number;
  when: string;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(() =>
    Math.max(0, pictures.findIndex((picture) => picture.id === startAt)),
  );
  const shown = pictures[at];
  const several = pictures.length > 1;

  useModalPanel(panel, onClose);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') {
        setAt((now) => Math.min(pictures.length - 1, now + 1));
      } else if (event.key === 'ArrowLeft') {
        setAt((now) => Math.max(0, now - 1));
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pictures.length]);

  // The keyboard goes back to the picture last shown, which is in the note's collage, by id:
  // the button the lightbox was opened from can have been re-rendered since.
  const lastShown = useRef(shown?.id);
  lastShown.current = shown?.id;
  useEffect(
    () => () => {
      if (lastShown.current !== undefined) {
        document.getElementById(pictureButtonId(lastShown.current))?.focus();
      }
    },
    [],
  );

  if (shown === undefined) {
    return null;
  }

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label={
        several ? `Picture ${at + 1} of ${pictures.length}, from ${when}` : `The picture from ${when}`
      }
      tabIndex={-1}
      className="fixed inset-0 z-30 flex flex-col bg-black/90 text-white outline-none"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-white/75">
        <span>
          {when}
          {several && ` · ${at + 1} of ${pictures.length}`}
        </span>
        <button
          type="button"
          aria-label="Close the picture"
          onClick={onClose}
          className="h-8 w-8 rounded text-lg text-white/85 hover:bg-white/10"
        >
          ×
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        <img
          src={pictureUrl(shown.id)}
          width={shown.width}
          height={shown.height}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
        {several && at > 0 && (
          <button
            type="button"
            aria-label="The picture before"
            onClick={() => setAt(at - 1)}
            className="absolute top-1/2 left-3 h-10 w-10 -translate-y-1/2 rounded-full bg-black/50 text-xl hover:bg-black/70"
          >
            ‹
          </button>
        )}
        {several && at < pictures.length - 1 && (
          <button
            type="button"
            aria-label="The next picture"
            onClick={() => setAt(at + 1)}
            className="absolute top-1/2 right-3 h-10 w-10 -translate-y-1/2 rounded-full bg-black/50 text-xl hover:bg-black/70"
          >
            ›
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
