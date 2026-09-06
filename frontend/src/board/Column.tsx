import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { listColumn } from '../api/library';
import { Card } from './Card';
import { SortSelect } from './SortSelect';
import { hobbyDefinition } from '../hobbies';
import { COLUMN_PAGE_SIZE, columnKey } from './keys';
import { ESTIMATE_POLL_BUDGET_MS, ESTIMATE_POLL_MS, waitingOn } from './estimates';
import type { LibrarySort, LogStatus } from '../api/types';

/** The id a column droppable answers to, so a drop onto empty space still names a column. */
export const droppableId = (status: LogStatus) => `column:${status}`;

/**
 * Removing a title, as the whole column sees it: which card is currently asking, and what to do
 * about it. Held above the board rather than in each card — see {@link CardRemoval}.
 */
export interface ColumnRemoval {
  mediaId: number | null;
  onAsk: (mediaId: number) => void;
  onCancel: () => void;
  onConfirm: (mediaId: number) => void;
}

/**
 * Which card has its options open, if any. Same shape and same reasoning as ColumnRemoval:
 * one at a time, held above the board because a refetch remounts cards.
 */
export interface ColumnMenu {
  mediaId: number | null;
  onOpen: (mediaId: number) => void;
  onClose: () => void;
}

export interface ColumnProps {
  hobby: string;
  status: LogStatus;
  /** What a person calls this column. "Playing" is a label; `InProgress` is the protocol. */
  label: string;
  sort: LibrarySort;
  onSortChange: (sort: LibrarySort) => void;
/**
   * The year this column is narrowed to, if any. The board decides which columns get one — see
   * `yearFor` — and a column narrows itself by simply not asking.
   */
  year?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Moves a card to another column. The column it leaves is this one, so it goes unsaid. */
  onMove: (mediaId: number, to: LogStatus) => void;
  removal: ColumnRemoval;
  menu: ColumnMenu;
  onOpen: (mediaId: number) => void;
}

export function Column({
  hobby,
  status,
  label,
  sort,
  onSortChange,
  year,
  collapsed = false,
  onToggleCollapse,
  onMove,
  removal,
  menu,
  onOpen,
}: ColumnProps) {
  const headingId = useId();

  // Until when this column is willing to keep asking about a title HowLongToBeat has not
  // answered for yet. Zero means it is not waiting for anything. See estimates.ts.
  const [pollUntil, setPollUntil] = useState(0);

  const { data, isPending, error } = useQuery({
    queryKey: columnKey(hobby, status, sort, year),
    queryFn: () => listColumn({ hobby, status, sort, year, pageSize: COLUMN_PAGE_SIZE }),

    // A function rather than a number, and that is load-bearing. TanStack calls this to schedule
    // each next ask, so the budget is re-read against the clock every time — where a number
    // computed during render would be read once and never reconsidered, because a refetch that
    // changes nothing does not re-render and so never revises it.
    refetchInterval: () => (Date.now() < pollUntil ? ESTIMATE_POLL_MS : false),
  });

  const waiting = waitingOn(data?.items);

  // A fresh budget whenever the set of waiting titles changes, so a title added while the last
  // one is still being looked up is not left on the tail end of somebody else's clock. When the
  // set empties, the budget goes to zero and the asking stops on the next evaluation.
  useEffect(() => {
    setPollUntil(waiting === '' ? 0 : Date.now() + ESTIMATE_POLL_BUDGET_MS);
  }, [waiting]);

  // The ref goes on the section, and it has to. It used to hang off the card list below, which
  // is not rendered while the column is collapsed — so a closed Dropped column had no rect at
  // all, `closestCorners` could never pick it, and a card let go over that corner of the board
  // landed in Completed instead, which is next to it and does have one. Registering the hook
  // was never enough on its own; a droppable with no node is not a droppable.
  //
  // The section exists collapsed or open and is `min-h-24`, so Dropped is a real target the
  // whole time — which is the point of it, since dropping something is exactly the moment you
  // have not got the column open.
  const { setNodeRef } = useDroppable({ id: droppableId(status), data: { status } });

  // Whether a drag would land here, which is *not* the same question as this droppable being
  // the one under the cursor — and reading `isOver` off the hook above was the whole of what
  // made an occupied column feel closed.
  //
  // dnd-kit's `over` is whatever the cursor is nearest, and inside a column that is almost
  // always one of its cards rather than the column itself: a column with anything in it is
  // mostly cards. So `isOver` was false for every part of the column a person would actually
  // aim at, and the only strip that tinted was the empty space below the last card. The drop
  // was never blocked — `onDragEnd` has always read the status off whatever is under the
  // cursor, card or column — but nothing on screen said so, so the empty space is where people
  // learned to aim.
  //
  // Both answers carry `{ status }` in their drag data, the column from the droppable above and
  // a card from its sortable, so asking what the target *column* is takes one comparison and no
  // knowledge of which kind of thing answered.
  //
  // It stays true while reordering inside one column, which is right: that is where the card
  // is going to land.
  const { over } = useDndContext();
  const isOver = (over?.data.current as { status?: LogStatus } | undefined)?.status === status;

  const items = data?.items ?? [];
  const muted = status === 'Dropped';

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={`flex min-h-24 flex-col rounded-xl border p-3 transition-colors ${
        muted ? 'border-dropped/30 opacity-70' : 'border-line-soft'
      } ${isOver ? 'bg-drop' : 'bg-well'}`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id={headingId} className="text-sm font-medium tracking-wide uppercase">
          {label} <span className="text-muted">{data?.total ?? 0}</span>
        </h2>

        {onToggleCollapse !== undefined && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded px-1 text-xs text-muted hover:bg-hover"
          >
            {collapsed ? `Show ${label}` : `Hide ${label}`}
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <SortSelect
            label={label}
            lengthLabel={hobbyDefinition(hobby).lengthLabel}
            value={sort}
            onChange={onSortChange}
          />
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-1 flex-col gap-cardgap">
          {isPending && <p className="text-sm text-muted">Loading…</p>}
          {error !== null && (
            <p role="alert" className="text-sm text-danger">
              {error.message}
            </p>
          )}

          <SortableContext
            items={items.map((item) => item.mediaId)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-cardgap">
              {items.map((item) => (
                <Card
                  key={item.mediaId}
                  item={item}
                  onMove={onMove}
                  removal={{
                    confirming: removal.mediaId === item.mediaId,
                    onAsk: () => removal.onAsk(item.mediaId),
                    onCancel: removal.onCancel,
                    onConfirm: () => removal.onConfirm(item.mediaId),
                  }}
                  menu={{
                    open: menu.mediaId === item.mediaId,
                    onOpen: () => menu.onOpen(item.mediaId),
                    onClose: menu.onClose,
                  }}
                  onOpen={onOpen}
                  // Every other mode is a read-only view. Offering a drag there would promise a
                  // ranking the API is not going to store.
                  draggable={sort === 'manual'}
                />
              ))}
            </ul>
          </SortableContext>

          {data !== undefined && items.length === 0 && (
            <p className="text-sm text-muted">Nothing here yet.</p>
          )}
          {data !== undefined && items.length < data.total && (
            <p className="text-xs text-muted">
              Showing {items.length} of {data.total}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
