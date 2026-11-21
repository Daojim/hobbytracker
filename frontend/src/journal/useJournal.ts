import { useEffect, useRef, useState } from 'react';
import { useOverlayHistory } from '../lib/useOverlayHistory';
import type { FoundNote } from './NoteList';

/**
 * A door's way into the journal, as a page hands it down: the id of the element the keyboard
 * goes back to, and the title. `openFrom` is one.
 */
export type OpenFrom = (returnTo: string, mediaId: number) => void;

/** Where a door asks the journal to open: at the question, at a note a search found, at Hours played. */
export interface JournalOpening {
  askHowLong?: boolean;
  note?: FoundNote | null;
  atHours?: boolean;
}

/**
 * The way into a title's journal and out of it again, for a page that has one: the board, and
 * since #25 the Stats page. Lifted out of `BoardPage` when the second page needed it, so both open
 * the drawer, close it and hand the keyboard back by one implementation.
 *
 * **Which title is open lives in a history entry rather than in state**, which is what makes a
 * phone's Back close the drawer instead of leaving the page — the press it used to get was the
 * board's. Closing is that same press, so nothing is left behind for the next one to find. See
 * `useOverlayHistory`, which holds the three ways that goes quietly wrong.
 *
 * **What the drawer was opened from is kept by the id of that element**, so the keyboard can be
 * handed back to it on the way out. An id rather than a media id, because one title can be behind
 * two doors at once: a card and a search result naming the same game, or on the Stats page its
 * cover and its row in a rating's list. And an id rather than the element, because a refetch
 * remounts a card while the drawer is open, so an element kept from then would no longer be in
 * the document.
 *
 * **How it was opened is said on every opening** — at the question, at a note, at Hours played —
 * so nothing a door asked for is still set for the next door.
 */
export function useJournal() {
  const { openFor, open, close } = useOverlayHistory('journal');
  const openedFrom = useRef<string | null>(null);

  // State rather than part of the history entry: Back is about whether the drawer is open, and
  // nothing about which door it came through needs surviving a reload.
  const [askHowLong, setAskHowLong] = useState(false);
  const [atNote, setAtNote] = useState<FoundNote | null>(null);
  const [atHours, setAtHours] = useState(false);

  useEffect(() => {
    if (openFor !== null || openedFrom.current === null) {
      return;
    }

    document.getElementById(openedFrom.current)?.focus();
    openedFrom.current = null;
  }, [openFor]);

  /** Opens the title's journal from the element with this id, which the keyboard goes back to. */
  function openFrom(
    returnTo: string,
    mediaId: number,
    { askHowLong: asking = false, note = null, atHours: hours = false }: JournalOpening = {},
  ) {
    openedFrom.current = returnTo;
    setAskHowLong(asking);
    setAtNote(note);
    setAtHours(hours);
    open(mediaId);
  }

  return {
    /** The title whose journal is open, or null while it is shut. */
    openFor,
    openFrom,
    close,
    /** How it was opened, as the drawer takes it. */
    opening: { askHowLong, atNote, atHours },
  };
}
