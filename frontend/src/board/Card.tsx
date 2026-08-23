import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatJournalDate } from '../lib/time';
import { formatHours } from '../lib/hours';
import { genreStripe, resolveGenre } from './genres';
import type { LibraryItem } from '../api/types';

/**
 * A stable handle on the button that opens a title's journal.
 *
 * The drawer has to hand focus back to it on the way out, and by then the card has usually been
 * remounted by a refetch — so the element captured at open time is a detached node. An id
 * survives that; a reference does not. Only the real card carries it: the drag preview renders
 * the title as plain text, so there is never a second element with the same id.
 */
export const cardTitleId = (mediaId: number) => `card-title-${mediaId}`;

/**
 * Removing a title, in the same three parts the drawer's deletes use.
 *
 * The `confirming` flag is passed in rather than held here because a refetch remounts cards —
 * the same fact that makes the drawer hand focus back by id rather than by a stored element —
 * and a confirm that quietly closes itself when a background refetch lands is one nobody can
 * trust. Holding it above the board also means only one card can be asking at a time.
 */
export interface CardRemoval {
  confirming: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export interface CardFaceProps {
  item: LibraryItem;
  /** Moves the title to Dropped. Offered on Playing only. Omitted by the drag preview. */
  onDrop?: (mediaId: number) => void;
  /** Deleting the current pass. Offered on Backlog only. Omitted by the drag preview. */
  removal?: CardRemoval;
  /** Opens the journal for this title. Omitted by the drag preview for the same reason. */
  onOpen?: (mediaId: number) => void;
}

/** Everything a card shows. Shared with the drag preview, which must not be a second sortable. */
export function CardFace({ item, onDrop, removal, onOpen }: CardFaceProps) {
  const lastActivity = formatJournalDate(item.lastActivity);

  // The chosen genre, or the one the game would be painted as. The stripe is decoration and the
  // name beside the rating is the information — ten hues is past what colour alone can carry.
  const genre = resolveGenre(item.genres, item.primaryGenre);
  const stripe = genreStripe(genre);

  // What the close corner does is not the same thing in every column. Dropped is a record of a
  // game you started and gave up on: the right ending for one you were playing, and the wrong
  // one for a game you never began, which would be claiming a playthrough that never happened.
  // So Backlog deletes the pass instead — and the title goes with it when that was its only
  // one. Completed and Dropped get neither: finishing something cannot be given up on, and
  // dropping something already dropped is a no-op that would still cost a request. Absent
  // rather than disabled, because a control that is never usable is not a control.
  const droppable = onDrop !== undefined && item.currentStatus === 'InProgress';
  const removable = removal !== undefined && item.currentStatus === 'Backlog';
  const confirming = removable && removal.confirming;

  // Both warnings name the title, which is what lets the confirm buttons stay two plain words:
  // anyone reading the card in order has just been told which one it means.
  const warning =
    item.entryCount > 1
      ? `Only this pass. ${item.title} stays, showing the one before it.`
      : `Takes ${item.title} off your board.`;

  return (
    <>
      {/* Always rendered, transparent when there is nothing to paint: a stripe that vanished
          would shift an ungenred card's contents twelve pixels left of its neighbours' and make
          a mixed column look ragged. A child of CardFace rather than a class on CARD_CLASS, so
          the drag preview wears it too without a second call site knowing about genres. */}
      <span
        aria-hidden="true"
        data-genre-stripe=""
        className={`w-1 shrink-0 self-stretch rounded-full ${stripe ?? 'bg-transparent'}`}
      />

      {item.coverUrl === null ? (
        <span
          aria-hidden="true"
          className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-neutral-100 text-lg font-semibold text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600"
        >
          {item.title.charAt(0)}
        </span>
      ) : (
        // Empty alt on purpose: the title is right there as text, so the cover repeats it.
        <img src={item.coverUrl} alt="" className="h-14 w-10 shrink-0 rounded object-cover" />
      )}

      <div className="min-w-0 flex-1">
        {/* A heading, not a paragraph: each card names a thing, and it gives both test layers
            a way to read a column's contents in order without reaching for a test id.

            The title is the way into the journal, and it is a button so that works from the
            keyboard too. Stopping the pointer here keeps the press from also being read as the
            start of a drag — the same guard the close button needs. */}
        <h3 className="font-medium break-words">
          {onOpen === undefined ? (
            item.title
          ) : (
            <button
              type="button"
              id={cardTitleId(item.mediaId)}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onOpen(item.mediaId)}
              className="text-left hover:underline"
            >
              {item.title}
            </button>
          )}
        </h3>

        {/* The confirm takes the metadata row's place rather than sitting under it, so a card
            asking a question does not also resize the column it is in. */}
        {confirming ? (
          <span
            onPointerDown={(event) => event.stopPropagation()}
            className="mt-1 flex flex-wrap items-baseline gap-2 text-xs"
          >
            <span className="text-neutral-500">{warning}</span>

            <button
              type="button"
              onClick={() => removal?.onConfirm()}
              className="rounded font-medium text-red-600 hover:underline"
            >
              Really remove?
            </button>

            <button
              type="button"
              onClick={() => removal?.onCancel()}
              className="rounded text-neutral-500 hover:underline"
            >
              Cancel
            </button>
          </span>
        ) : (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            {item.latestRating !== null && (
              <span role="img" aria-label={`Rated ${item.latestRating.toFixed(1)} out of 10`}>
                ★ {item.latestRating.toFixed(1)}
              </span>
            )}
            {item.entryCount > 1 && (
              <span role="img" aria-label={`${item.entryCount} playthroughs`}>
                ×{item.entryCount}
              </span>
            )}
            {/* Marked with a tilde and named in full to a screen reader, because the number
                alone is ambiguous: the drawer prints "31.5 h" for what a pass took *you*, and
                this is how long the game takes anyone. Main story only — the other two tiers
                are a drawer reading, where there is room to name which is which. */}
            {item.hltbMainStoryHours !== null && (
              <span
                role="img"
                aria-label={`About ${item.hltbMainStoryHours} hours to finish`}
              >
                ~{formatHours(item.hltbMainStoryHours)}
              </span>
            )}
            {genre !== null && <span>{genre}</span>}
            {lastActivity !== null && <span>{lastActivity}</span>}
          </div>
        )}
      </div>

      {(droppable || removable) && !confirming && (
        <button
          type="button"
          aria-label={
            removable ? `Remove ${item.title} from your board` : `Drop ${item.title}`
          }
          // Without this the card's drag listeners see the press first. The pointer sensor's
          // activation distance already stops a click becoming a drag; this stops the press
          // being claimed at all.
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => (removable ? removal.onAsk() : onDrop?.(item.mediaId))}
          className="h-5 w-5 shrink-0 rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          ×
        </button>
      )}
    </>
  );
}

export const CARD_CLASS =
  'flex touch-none gap-2 rounded border border-neutral-200 bg-white p-2 text-sm dark:border-neutral-800 dark:bg-neutral-900';

export interface CardProps {
  item: LibraryItem;
  onDrop: (mediaId: number) => void;
  removal: CardRemoval;
  onOpen: (mediaId: number) => void;
  /** False outside `manual` sort, where a drag would imply a ranking the API will not store. */
  draggable: boolean;
}

export function Card({ item, onDrop, removal, onOpen, draggable }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.mediaId,
    // Read back by the drag handlers: a drop needs to know which column the card came from, and
    // the card's own status is the only record of that once it is airborne.
    data: { status: item.currentStatus },
    disabled: !draggable,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      // dnd-kit stamps role="button" so a sortable is announced as operable. Restored here
      // because the card contains a real button, and an interactive element inside another one
      // is ambiguous to a screen reader. The focusability the keyboard sensor needs comes from
      // its tabIndex, which survives.
      role="listitem"
      className={`${CARD_CLASS} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <CardFace item={item} onDrop={onDrop} removal={removal} onOpen={onOpen} />
    </li>
  );
}
