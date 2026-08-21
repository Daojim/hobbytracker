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
        muted ? 'border-column-dropped/30 opacity-70' : 'border-neutral-300 dark:border-neutral-700'
      } ${isOver ? 'bg-blue-50 dark:bg-blue-950/40' : ''}`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id={headingId} className="text-sm font-medium tracking-wide uppercase">
          {label} <span className="text-neutral-500">{data?.total ?? 0}</span>
        </h2>

        {onToggleCollapse !== undefined && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded px-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
          {isPending && <p className="text-sm text-neutral-500">Loading…</p>}
          {error !== null && (
            <p role="alert" className="text-sm text-red-600">
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
                  onOpen={onOpen}
                  // Every other mode is a read-only view. Offering a drag there would promise a
                  // ranking the API is not going to store.
                  draggable={sort === 'manual'}
                />
              ))}
            </ul>
          </SortableContext>

          {data !== undefined && items.length === 0 && (
            <p className="text-sm text-neutral-500">Nothing here yet.</p>
          )}
          {data !== undefined && items.length < data.total && (
            <p className="text-xs text-neutral-500">
              Showing {items.length} of {data.total}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
