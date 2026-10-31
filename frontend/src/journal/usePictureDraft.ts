import { useEffect, useRef, useState } from 'react';
import { thumbnailUrl, type NotePictures, type PictureUpload } from '../api/notes';
import { CannotOpenPicture, shrink } from '../lib/shrink';
import type { NotePicture } from '../api/types';

/**
 * The most pictures a note holds. The server's rule, held here as well so a fifth is refused
 * before it is shrunk and sent rather than after: the box says so in the words the server would.
 */
export const MAX_PICTURES = 4;

export const TOO_MANY = 'A note holds four pictures. Take one out to add another.';
export const NOT_A_PICTURE = 'Only pictures can go in a note.';

/** A picture in the box: one already in the note, or one waiting to be sent with it. */
export interface HeldPicture {
  /** Stable across renders, for the list. */
  key: string;
  /** Where the box draws it from: a kept picture's thumbnail, or the shrunk one's object URL. */
  src: string;
  width: number;
  height: number;
  /** A picture already in the note, which a rewrite keeps by naming it. */
  id?: number;
  /** A picture waiting to be sent. */
  upload?: PictureUpload;
}

/**
 * The pictures a box holds, and the one thing it has to say about them.
 *
 * Every way in goes through `add`: a paste, a drop and the picker. It refuses what the server
 * would, before anything is sent, and shrinks what it takes. **Each waiting picture is an object
 * URL**, which holds its bytes in memory until it is revoked, so one is revoked when its picture
 * is taken out, when the box is cleared after a send, and when the box goes.
 */
export function usePictureDraft(inNote: readonly NotePicture[] = []) {
  const [held, setHeld] = useState<HeldPicture[]>(() =>
    inNote.map((picture) => ({
      key: `kept-${picture.id}`,
      src: thumbnailUrl(picture.id),
      width: picture.width,
      height: picture.height,
      id: picture.id,
    })),
  );
  const [problem, setProblem] = useState<string | null>(null);

  // What the box holds and what it is still shrinking, as of now rather than as of the last
  // render: two pastes in quick succession would otherwise each see room for four.
  const count = useRef(held.length);
  const urls = useRef(new Set<string>());
  const nextKey = useRef(0);

  useEffect(() => {
    const made = urls.current;
    return () => {
      for (const url of made) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  async function add(files: readonly File[]) {
    if (files.length === 0) {
      return;
    }

    const pictures = files.filter((file) => file.type.startsWith('image/'));
    const room = Math.max(0, MAX_PICTURES - count.current);
    const taking = pictures.slice(0, room);

    setProblem(
      pictures.length < files.length ? NOT_A_PICTURE : taking.length < pictures.length ? TOO_MANY : null,
    );
    count.current += taking.length;

    for (const file of taking) {
      try {
        const shrunk = await shrink(file);
        const src = URL.createObjectURL(shrunk.picture);
        urls.current.add(src);
        setHeld((now) => [
          ...now,
          {
            key: `new-${(nextKey.current += 1)}`,
            src,
            width: shrunk.width,
            height: shrunk.height,
            upload: { picture: shrunk.picture, thumbnail: shrunk.thumbnail },
          },
        ]);
      } catch {
        // Whatever stopped it, the reader's answer is the same: this one did not go in.
        count.current -= 1;
        setProblem(new CannotOpenPicture().message);
      }
    }
  }

  function takeOut(key: string) {
    const leaving = held.find((picture) => picture.key === key);
    if (leaving === undefined) {
      return;
    }

    forget(leaving);
    count.current -= 1;
    setProblem(null);
    setHeld((now) => now.filter((picture) => picture.key !== key));
  }

  /** After a send: the waiting pictures went with it, so their URLs can go too. */
  function clear() {
    for (const picture of held) {
      forget(picture);
    }

    count.current = 0;
    setProblem(null);
    setHeld([]);
  }

  function forget(picture: HeldPicture) {
    if (picture.upload !== undefined) {
      URL.revokeObjectURL(picture.src);
      urls.current.delete(picture.src);
    }
  }

  /** What a rewrite sends about the pictures: the ones kept, and the new ones after them. */
  const changes = (): NotePictures => ({
    keep: held.flatMap((picture) => (picture.id === undefined ? [] : [picture.id])),
    add: uploads(),
  });

  const uploads = (): PictureUpload[] =>
    held.flatMap((picture) => (picture.upload === undefined ? [] : [picture.upload]));

  return { held, problem, add, takeOut, clear, changes, uploads };
}
