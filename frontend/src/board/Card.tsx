import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatJournalDate } from '../lib/time';
import type { LibraryItem, LogStatus } from '../api/types';

/**
 * Dropping something you have finished means nothing, and dropping something already dropped is
 * a no-op that would still cost a request. The button is absent on both rather than disabled —
 * a control that is never usable is not a control.
 */
const DROPPABLE_FROM: readonly LogStatus[] = ['Backlog', 'InProgress'];

export interface CardFaceProps {
  item: LibraryItem;
  /** Moves the title to Dropped. Omitted by the drag preview, which is not clickable. */
  onDrop?: (mediaId: number) => void;
  /** Opens the journal for this title. Omitted by the drag preview for the same reason. */
  onOpen?: (mediaId: number) => void;
}

/** Everything a card shows. Shared with the drag preview, which must not be a second sortable. */
export function CardFace({ item, onDrop, onOpen }: CardFaceProps) {
  const lastActivity = formatJournalDate(item.lastActivity);

  return (
    <>
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
            start of a drag — the same guard the drop button needs. */}
        <h3 className="font-medium break-words">
          {onOpen === undefined ? (
            item.title
          ) : (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onOpen(item.mediaId)}
              className="text-left hover:underline"
            >
              {item.title}
            </button>
          )}
        </h3>

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
          {lastActivity !== null && <span>{lastActivity}</span>}
        </div>
      </div>

      {onDrop !== undefined && DROPPABLE_FROM.includes(item.currentStatus) && (
        <button
          type="button"
          aria-label={`Drop ${item.title}`}
          // Without this the card's drag listeners see the press first. The pointer sensor's
          // activation distance already stops a click becoming a drag; this stops the press
          // being claimed at all.
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onDrop(item.mediaId)}
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
  onOpen: (mediaId: number) => void;
  /** False outside `manual` sort, where a drag would imply a ranking the API will not store. */
  draggable: boolean;
}

export function Card({ item, onDrop, onOpen, draggable }: CardProps) {
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
      <CardFace item={item} onDrop={onDrop} onOpen={onOpen} />
    </li>
  );
}
