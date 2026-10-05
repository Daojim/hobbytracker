import { useEffect, useId, useState, type ReactNode } from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { listColumn } from '../api/library';
import { Card, type OpenJournal } from './Card';
import { SortSelect } from './SortSelect';
import { type BoardColumn, hobbyDefinition } from '../hobbies';
import { COLUMN_PAGE_SIZE, columnKey } from './keys';
import { columnHoursLines, type HoursLine } from './columnHours';
import { ESTIMATE_POLL_BUDGET_MS, ESTIMATE_POLL_MS, waitingOn } from './estimates';
import { usePace, type Pace } from '../lib/pace';
import type { Voice } from '../lib/voice';
import type { LibraryItem, LibraryPage, LibrarySort, LogStatus } from '../api/types';

/** The id a column droppable answers to, so a drop onto empty space still names a column. */
export const droppableId = (status: LogStatus) => `column:${status}`;

/**
 * Where one column's answer comes from: your board's library, or a share's. Whichever it is, the
 * column and anything else that needs its answer share it — the phone's switcher counts from it.
 */
export interface ColumnRequest {
  queryKey: QueryKey;
  queryFn: () => Promise<LibraryPage>;
}

/**
 * One column's request, for the column and for anything else that needs its answer.
 *
 * The phone's switcher counts every column from this, so a segment's count is the total its
 * column shows: the same key, so the column on screen and its segment share one fetch, and the
 * same year, so Completed's segment does not count every year's completions under a column
 * showing this one's.
 */
export const columnQuery = (
  hobby: string,
  status: LogStatus,
  sort: LibrarySort,
  year: number | undefined,
): ColumnRequest => ({
  queryKey: columnKey(hobby, status, sort, year),
  queryFn: () => listColumn({ hobby, status, sort, year, pageSize: COLUMN_PAGE_SIZE }),
});

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
  /** The columns the board is drawing, handed on to every card's menu. See `CardMenu.columns`. */
  columns: readonly BoardColumn[];
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
  /**
   * The switcher directly above already says this column's name and count, as it does on a
   * phone. The heading stays for a screen reader, because it is what names the column's region,
   * and only leaves the screen.
   */
  namedAbove?: boolean;
  /** Moves a card to another column. The column it leaves is this one, so it goes unsaid. */
  onMove: (mediaId: number, to: LogStatus) => void;
  removal: ColumnRemoval;
  menu: ColumnMenu;
  onOpen: OpenJournal;
}

/** A column of your own board: a drop target, and a stack of cards you can carry and open. */
export function Column({
  hobby,
  status,
  label,
  sort,
  onSortChange,
  year,
  collapsed = false,
  onToggleCollapse,
  namedAbove = false,
  onMove,
  removal,
  menu,
  onOpen,
}: ColumnProps) {
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

  // What the drawer's "How long will it take me?" was told — a store, because it is told over
  // this column and the Backlog line has to hear it then rather than at the next mount.
  const { pace } = usePace(hobby);

  return (
    <ColumnFrame
      hobby={hobby}
      status={status}
      label={label}
      sort={sort}
      onSortChange={onSortChange}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      namedAbove={namedAbove}
      request={columnQuery(hobby, status, sort, year)}
      voice="own"
      pace={pace}
      dropRef={setNodeRef}
      tinted={isOver}
    >
      {(items) => (
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
                  columns: menu.columns,
                }}
                onOpen={onOpen}
                // Every other mode is a read-only view. Offering a drag there would promise a
                // ranking the API is not going to store.
                draggable={sort === 'manual'}
              />
            ))}
          </ul>
        </SortableContext>
      )}
    </ColumnFrame>
  );
}

export interface ColumnFrameProps {
  hobby: string;
  status: LogStatus;
  label: string;
  sort: LibrarySort;
  onSortChange: (sort: LibrarySort) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  namedAbove?: boolean;

  /** Where the column's answer comes from: your board's library, or a share's. */
  request: ColumnRequest;

  /** Who the header's words are to: the board's owner, or — on a share — nobody. */
  voice: Voice;

  /**
   * How much the reader plays, for Backlog's second line — the reader's own pace, about their
   * own board, so a share is handed none.
   */
  pace: Pace | null;

  /** The droppable this column is on your board. Absent on a share, where nothing lands. */
  dropRef?: (element: HTMLElement | null) => void;

  /** Whether a card held over the board would land here, which tints the well. */
  tinted?: boolean;

  /** The cards, drawn from this page of the column. */
  children: (items: LibraryItem[]) => ReactNode;
}

/**
 * Everything a column is apart from its cards: the well, the heading and its count, the hours
 * under it, the fold, the sort control, and what it says while loading or with nothing in it.
 *
 * One frame for your board's columns and for a share's, so the two cannot drift: a share's
 * column is this, around faces with nothing in their hands. The cards are the caller's, because
 * that is where the two differ.
 */
export function ColumnFrame({
  hobby,
  status,
  label,
  sort,
  onSortChange,
  collapsed = false,
  onToggleCollapse,
  namedAbove = false,
  request,
  voice,
  pace,
  dropRef,
  tinted = false,
  children,
}: ColumnFrameProps) {
  const headingId = useId();

  // Until when this column is willing to keep asking about a title HowLongToBeat has not
  // answered for yet. Zero means it is not waiting for anything. See estimates.ts.
  const [pollUntil, setPollUntil] = useState(0);

  const { data, isPending, error } = useQuery({
    ...request,

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

  const items = data?.items ?? [];
  const muted = status === 'Dropped';
  const definition = hobbyDefinition(hobby);

  // How long the column's titles take, which the server adds up over the whole column rather
  // than this page of it. See columnHours.ts for what each column says.
  const hours = data === undefined ? [] : columnHoursLines(definition, status, data, voice, pace);

  return (
    <section
      ref={dropRef}
      aria-labelledby={headingId}
      className={`flex min-h-24 flex-col rounded-xl border p-3 transition-colors ${
        muted ? 'border-dropped/30 opacity-70' : 'border-line-soft'
      } ${tinted ? 'bg-drop' : 'bg-well'}`}
    >
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id={headingId}
            className={`text-sm font-medium tracking-wide uppercase ${namedAbove ? 'sr-only' : ''}`}
          >
            {label} <span className="text-muted">{data?.total ?? 0}</span>
          </h2>

          {/* On a phone the heading is off the screen and the switcher says its name, so the
              hours take its place, beside the sort control. Picked over a line under each
              segment's count, which made the pinned switcher taller on every column and had no
              room for Completed's comparison. */}
          {namedAbove && <HoursLines lines={hours} />}

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
              lengthLabel={definition.lengthLabel}
              value={sort}
              onChange={onSortChange}
              voice={voice}
            />
          </div>
        </div>

        {/* Side by side, a line of its own under the heading's row, which this leaves exactly as
            it was. The two placements that shared the row, after the count or before the sort
            control, put every column's sort control on a second line even at 1440px. Chosen
            from screenshots on 1 October 2026. */}
        {!namedAbove && <HoursLines lines={hours} className="mt-1" />}
      </div>

      {!collapsed && (
        <div className="flex flex-1 flex-col gap-cardgap">
          {isPending && <p className="text-sm text-muted">Loading…</p>}
          {error !== null && (
            <p role="alert" className="text-sm text-danger">
              {error.message}
            </p>
          )}

          {children(items)}

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

/**
 * A column's hours, one muted line each, or nothing at all.
 *
 * Each line reads aloud in words, as a card's length badge does: `~1,034 h` is a tilde and a
 * letter to a screen reader. Kept out of the heading, which is what names the column's region.
 */
function HoursLines({ lines, className = '' }: { lines: HoursLine[]; className?: string }) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <p className={`text-xs text-muted tabular-nums ${className}`}>
      {lines.map((line) => (
        <span key={line.text} role="img" aria-label={line.spoken} className="block">
          {line.text}
        </span>
      ))}
    </p>
  );
}
