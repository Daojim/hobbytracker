import { Marked } from '../lib/Marked';
import { snippetOf } from '../lib/match';
import { formatJournalDateTime } from '../lib/time';
import type { NoteMatch } from '../api/types';

/**
 * A stable handle on a note found, for the journal it opens to hand the keyboard back to.
 *
 * By the note rather than the title, because one title can have several notes found, and the
 * keyboard goes back to the one pressed. Its own rather than `resultTitleId` for that function's
 * reason: two elements cannot share an id.
 */
export const noteResultId = (noteId: number) => `note-result-${noteId}`;

export interface NoteResultsProps {
  /** Newest first, as the server sends them, which is the order the titles come in. */
  notes: readonly NoteMatch[];
  /** Whether the server had more than it sent. */
  more: boolean;
  /** The words of the search, marked in every note. */
  words: readonly string[];
  /** Opens the note's title's journal, at the note. */
  onOpen: (mediaId: number, noteId: number) => void;
}

/** One title and the notes found on it, newest first. */
interface TitleFound {
  mediaId: number;
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  notes: NoteMatch[];
}

/**
 * The notes under their titles, a title placed where its newest match is.
 *
 * That falls out of the server's order: a title is met first at its newest note, and its older
 * ones join it there rather than starting a second card further down.
 */
function underTitles(notes: readonly NoteMatch[]): TitleFound[] {
  const titles = new Map<number, TitleFound>();

  for (const note of notes) {
    const found = titles.get(note.mediaId);
    if (found === undefined) {
      titles.set(note.mediaId, {
        mediaId: note.mediaId,
        title: note.title,
        subtitle: note.subtitle,
        coverUrl: note.coverUrl,
        notes: [note],
      });
    } else {
      found.notes.push(note);
    }
  }

  return [...titles.values()];
}

/**
 * The notes a search found, a card for each title they were written about.
 *
 * Picked at the #6 workshop on 9 October 2026 from three forms rendered at 1440 and 390, over one
 * column of text with no covers and over the title strip's sideways cards. The cover tells
 * *Hollow Knight* from *Silksong* at a glance, as it does on the strip's tiles; the grid keeps a
 * line of a note near sixty characters at 1440, where one column would have run the width of the
 * board; and on a phone it is one card under another.
 *
 * Each note is a button that opens the journal at it: its date, then the note from shortly before
 * the first word found, two lines at most. The whole note is in the journal.
 */
export function NoteResults({ notes, more, words, onOpen }: NoteResultsProps) {
  return (
    <>
      <ul className="grid items-start gap-2 md:grid-cols-2 xl:grid-cols-3">
        {underTitles(notes).map((found) => (
          <li
            key={found.mediaId}
            className="flex gap-3 rounded-lg border border-card-line bg-surface p-2 shadow-card"
          >
            {/* self-start, or the flex row stretches the cover down the whole card. Empty alt for
                the strip's reason: the title is right beside it. */}
            {found.coverUrl === null ? (
              <span
                aria-hidden="true"
                className="flex aspect-[5/7] w-10 shrink-0 items-center justify-center self-start rounded bg-sunken text-lg font-semibold text-muted"
              >
                {found.title.charAt(0)}
              </span>
            ) : (
              <img
                src={found.coverUrl}
                alt=""
                className="aspect-[5/7] w-10 shrink-0 self-start rounded object-cover"
              />
            )}

            <div className="min-w-0 flex-1">
              {/* An h3, as a tile's title and a card's are. The padding lines the name up with
                  the notes' text, which sits inside their buttons' own. */}
              <h3 className="px-1.5 text-sm font-medium break-words">{found.title}</h3>
              {found.subtitle !== null && (
                <p className="px-1.5 text-xs break-words text-muted">{found.subtitle}</p>
              )}

              <ul className="mt-1 flex flex-col gap-0.5">
                {found.notes.map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      id={noteResultId(note.id)}
                      onClick={() => onOpen(note.mediaId, note.id)}
                      className="block w-full rounded px-1.5 py-1 text-left hover:bg-hover"
                    >
                      {/* No space between the two is needed for the button's name, measured: an
                          accessible name keeps a block apart from what follows it, in a browser
                          and in jsdom alike. */}
                      <span className="block text-xs text-muted">
                        {formatJournalDateTime(note.writtenAt)}
                      </span>
                      <span className="line-clamp-2 text-sm break-words">
                        <Marked text={snippetOf(note.body, words)} words={words} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>

      {/* Narrowed by another word rather than paged: a person looking for one note wants fewer,
          and the server stops at fifty. */}
      {more && (
        <p className="mt-2 text-xs text-muted">The 50 most recent. Another word narrows it.</p>
      )}
    </>
  );
}
