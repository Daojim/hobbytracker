import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { upcoming } from '../api/library';
import { genreStripe, hobbyDefinition, resolveGenre } from '../hobbies';
import {
  describeDistance,
  formatGroup,
  formatRelease,
  releaseGroup,
  releaseNote,
  releaseProgress,
} from '../lib/release';
import { todayHere } from '../lib/time';
import { upcomingKey } from './keys';
import type { Hobby } from '../shell/hobbies';
import type { LibraryItem } from '../api/types';

/**
 * How many dated titles are shown before the rest is folded away.
 *
 * A count rather than a horizon in months, which is what this started as. A horizon puts the cut
 * somewhere the reader cannot see — twelve months is one title for somebody and thirty for
 * somebody else — where a count is the same list length whatever is on it.
 */
const SHOWN_AT_FIRST = 20;

const OPEN_KEY = (hobby: string) => `hobbytracker.coming-soon.${hobby}`;

/** Remembered per board, and never allowed to take the page down for it. See `theme/theme.ts`. */
function readOpen(hobby: string): boolean {
  try {
    return localStorage.getItem(OPEN_KEY(hobby)) !== 'closed';
  } catch {
    return true;
  }
}

function writeOpen(hobby: string, open: boolean): void {
  try {
    localStorage.setItem(OPEN_KEY(hobby), open ? 'open' : 'closed');
  } catch {
    // Nothing to do and nobody to tell. The choice applies to this page either way.
  }
}

export interface ComingSoonProps {
  hobby: Hobby;
  /** Opens a title's journal, exactly as a card does. */
  onOpen: (mediaId: number) => void;
}

/**
 * The release calendar, under the board.
 *
 * **These are Backlog entries, not a fifth column.** A title that is not out yet is a real thing
 * you have queued; it is simply drawn on a time axis instead of in the well, because the useful
 * question about it is *when* rather than *what next*. Nothing moves when it comes out — the day
 * the date passes, the Backlog column starts answering with it and this stops.
 *
 * Rendered from `HobbyDefinition.releases` and nothing else: a hobby with none renders no
 * section, and there is no branch on the slug here.
 */
export function ComingSoon({ hobby, onOpen }: ComingSoonProps) {
  const definition = hobbyDefinition(hobby);
  const words = definition.releases;

  const headingId = useId();
  const [open, setOpen] = useState(() => readOpen(hobby));
  const [showAll, setShowAll] = useState(false);

  // Hooks first, always: a hobby without a calendar still has to run every one of them, or
  // switching boards would change how many hooks this component calls.
  const { data } = useQuery({
    queryKey: upcomingKey(hobby),
    queryFn: () => upcoming(hobby),
    enabled: words !== null,
  });

  if (words === null) {
    return null;
  }

  const items = data ?? [];

  // Today is read once for the whole section rather than per row, so every distance on screen is
  // measured from the same day — a list rendered across midnight would otherwise disagree with
  // itself.
  const today = todayHere();

  // The server has already ordered these: soonest first, undated last. Nothing re-sorts them,
  // for the reason the search strip does not re-rank IGDB's results.
  //
  // The cut takes the whole list rather than the dated part of it, which is a correction a test
  // made: cutting to the dated titles alone means a calendar holding nothing *but* undated ones
  // renders an empty well above a button offering to reveal them. Slicing what the server
  // ordered gives the dated ones the first twenty places anyway, and lets the undated through
  // whenever there is room for them.
  const shown = showAll ? items : items.slice(0, SHOWN_AT_FIRST);
  const hidden = items.length - shown.length;

  const groups = groupOf(shown, today);

  return (
    <section aria-labelledby={headingId} className="mt-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id={headingId} className="text-sm font-medium tracking-wide uppercase">
          {words.heading} <span className="text-muted">{items.length}</span>
        </h2>

        <button
          type="button"
          onClick={() => {
            setOpen((wasOpen) => {
              writeOpen(hobby, !wasOpen);
              return !wasOpen;
            });
          }}
          className="rounded px-1 text-xs text-muted hover:bg-hover"
        >
          {open ? `Hide ${words.heading}` : `Show ${words.heading}`}
        </button>
      </div>

      {open && (
        <div className="rounded-xl border border-line-soft bg-well p-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted">{words.empty}</p>
          ) : (
            <>
              {groups.map(({ key, rows }) => (
                <div key={key} role="group" aria-label={formatGroup(key, words.noDateHeading)}>
                  <p className="mt-3 mb-2 text-xs font-medium tracking-wide text-muted uppercase first:mt-0">
                    {formatGroup(key, words.noDateHeading)}
                  </p>

                  <ul className="flex flex-col gap-2">
                    {rows.map((item) => (
                      <UpcomingRow
                        key={item.mediaId}
                        item={item}
                        hobby={hobby}
                        today={today}
                        onOpen={onOpen}
                      />
                    ))}
                  </ul>
                </div>
              ))}

              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="mt-3 rounded border border-line px-2 py-1 text-xs font-medium hover:bg-hover"
                >
                  {`Show ${hidden} more`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * One title on the calendar.
 *
 * Deliberately a row rather than a card. The board's cards answer "what is this", where these
 * answer "how far off is it" — which is a comparison between rows, and a comparison wants them
 * stacked on one axis rather than tiled.
 */
function UpcomingRow({
  item,
  hobby,
  today,
  onOpen,
}: {
  item: LibraryItem;
  hobby: Hobby;
  today: string;
  onOpen: (mediaId: number) => void;
}) {
  const definition = hobbyDefinition(hobby);

  const genre = resolveGenre(definition.genres, item.genres, item.primaryGenre);
  const stripe = genreStripe(definition.genres, genre);

  const when = formatRelease(item.releaseDate, item.releasePrecision);
  const distance = item.releaseDate === null ? null : describeDistance(item.releaseDate, today);
  const note = releaseNote(item.releaseStatus);
  const progress = releaseProgress(item.releaseDate, today);

  return (
    <li className="flex items-center gap-3 rounded-lg border border-card-line bg-surface p-2 shadow-card">
      {/* Decoration beside the genre's name on a card; here it is the only trace of the genre,
          and that is deliberate — a calendar row is about when, and a genre word would compete
          with the date for the one line that matters. */}
      <span
        aria-hidden="true"
        className={`h-10 w-1 shrink-0 rounded-full ${stripe ?? 'bg-transparent'}`}
      />

      {item.coverUrl === null ? (
        <span
          aria-hidden="true"
          className="flex aspect-[5/7] w-8 shrink-0 items-center justify-center rounded bg-sunken text-xs font-semibold text-muted"
        >
          {item.title.charAt(0)}
        </span>
      ) : (
        // Empty alt: the title is beside it, so the cover only repeats what is already said.
        <img src={item.coverUrl} alt="" className="aspect-[5/7] w-8 shrink-0 rounded object-cover" />
      )}

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpen(item.mediaId)}
          className="block max-w-full truncate text-left text-sm font-medium hover:underline"
        >
          {item.title}
        </button>

        <p className="mt-0.5 text-xs text-muted">
          {when}
          {distance !== null && <span> · {distance}</span>}
          {note !== null && <span className="text-danger"> · {note}</span>}
        </p>
      </div>

      {/* The bar is aria-hidden and the distance above carries the meaning, exactly as a card's
          genre stripe is decoration beside the genre's name.

          The width is an inline style and must stay one: Tailwind scans source text, so an
          interpolated `w-[${x}%]` generates no class at all and every bar renders at nought —
          a calendar where everything is equally far away, painted rather than broken. */}
      {progress !== null && (
        <span
          aria-hidden="true"
          className="hidden h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-sunken sm:block"
        >
          <span
            className="block h-full rounded-full bg-accent"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </span>
      )}
    </li>
  );
}

/**
 * The rows gathered under their headings, in the order the server sent them.
 *
 * Insertion-ordered rather than sorted afterwards: the server has already decided what comes
 * first, and re-deriving that here is a second ordering that could disagree with it.
 */
function groupOf(
  items: readonly LibraryItem[],
  today: string,
): { key: string; rows: LibraryItem[] }[] {
  const groups: { key: string; rows: LibraryItem[] }[] = [];

  for (const item of items) {
    const key = releaseGroup(item.releaseDate, item.releasePrecision, today);
    const last = groups.at(-1);

    if (last !== undefined && last.key === key) {
      last.rows.push(item);
    } else {
      groups.push({ key, rows: [item] });
    }
  }

  return groups;
}
