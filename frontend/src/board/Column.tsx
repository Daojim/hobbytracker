import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { listColumn } from '../api/library';
import { Card } from './Card';
import { SortSelect } from './SortSelect';
import { YearPicker } from './YearPicker';
import { COLUMN_PAGE_SIZE, columnKey } from './keys';
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

export interface ColumnProps {
  hobby: string;
  status: LogStatus;
  /** What a person calls this column. "Playing" is a label; `InProgress` is the protocol. */
  label: string;
  sort: LibrarySort;
  onSortChange: (sort: LibrarySort) => void;
  /** Only Completed is given these; the other columns ignore the year by not asking for one. */
  year?: number;
  onYearChange?: (year: number | undefined) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onDrop: (mediaId: number) => void;
  removal: ColumnRemoval;
  onOpen: (mediaId: number) => void;
}

export function Column({
  hobby,
  status,
  label,
  sort,
  onSortChange,
  year,
  onYearChange,
  collapsed = false,
  onToggleCollapse,
  onDrop,
  removal,
  onOpen,
}: ColumnProps) {
  const headingId = useId();

  const { data, isPending, error } = useQuery({
    queryKey: columnKey(hobby, status, sort, year),
    queryFn: () => listColumn({ hobby, status, sort, year, pageSize: COLUMN_PAGE_SIZE }),
  });

  // Registered whether or not the column is collapsed: a collapsed Dropped column is still
  // somewhere a card can be dragged to.
  const { setNodeRef, isOver } = useDroppable({ id: droppableId(status), data: { status } });

  const items = data?.items ?? [];
  const muted = status === 'Dropped';

  return (
    <section
      aria-labelledby={headingId}
      className={`flex min-h-24 flex-col rounded-lg border p-3 transition-colors ${
        muted ? 'border-dropped/30 opacity-70' : 'border-line'
      } ${isOver ? 'bg-drop' : ''}`}
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
          {onYearChange !== undefined && (
            <YearPicker hobby={hobby} value={year} onChange={onYearChange} />
          )}
          <SortSelect label={label} value={sort} onChange={onSortChange} />
        </div>
      </div>

      {!collapsed && (
        <div ref={setNodeRef} className="flex flex-1 flex-col gap-2">
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
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <Card
                  key={item.mediaId}
                  item={item}
                  onDrop={onDrop}
                  removal={{
                    confirming: removal.mediaId === item.mediaId,
                    onAsk: () => removal.onAsk(item.mediaId),
                    onCancel: removal.onCancel,
                    onConfirm: () => removal.onConfirm(item.mediaId),
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
