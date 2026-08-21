import { useState } from 'react';
import { Link } from 'react-router';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { CARD_CLASS, CardFace } from './Card';
import { Column } from './Column';
import { useBoard } from './useBoard';
import { yearFor } from './keys';
import type { LibrarySort, LogStatus } from '../api/types';

/**
 * The games board.
 *
 * Hobby-parameterised even though games are the only hobby there is, so movies and books are a
 * routing change rather than a rewrite. Each column fetches itself, which is what makes a sort
 * or a year on one of them cost nothing on the other three.
 */
const HOBBY = 'games';

const COLUMNS: readonly { status: LogStatus; label: string }[] = [
  { status: 'Backlog', label: 'Backlog' },
  { status: 'InProgress', label: 'Playing' },
  { status: 'Completed', label: 'Completed' },
  { status: 'Dropped', label: 'Dropped' },
];

const ALL_MANUAL: Record<LogStatus, LibrarySort> = {
  Backlog: 'manual',
  InProgress: 'manual',
  Completed: 'manual',
  Dropped: 'manual',
};

export function BoardPage() {
  // Per column, not board-wide: Completed is worth reading by rating while Backlog stays in the
  // order you put it in.
  const [sorts, setSorts] = useState<Record<LogStatus, LibrarySort>>(ALL_MANUAL);
  const [year, setYear] = useState<number | undefined>(undefined);
  // Dropped is a record, not a queue. It starts out of the way and opens when asked for.
  const [droppedOpen, setDroppedOpen] = useState(false);

  const board = useBoard({ hobby: HOBBY, sorts, year });

  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="mb-6 flex items-baseline gap-4">
        <h1 className="text-2xl font-semibold">Games</h1>
        <Link to="/search" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Add a game
        </Link>
      </header>

      <DndContext {...board.dnd}>
        <div className="grid items-start gap-4 md:grid-cols-4">
          {COLUMNS.map(({ status, label }) => (
            <Column
              key={status}
              hobby={HOBBY}
              status={status}
              label={label}
              sort={sorts[status]}
              onSortChange={(sort) => setSorts((current) => ({ ...current, [status]: sort }))}
              year={yearFor(status, year)}
              onYearChange={status === 'Completed' ? setYear : undefined}
              collapsed={status === 'Dropped' ? !droppedOpen : undefined}
              onToggleCollapse={
                status === 'Dropped' ? () => setDroppedOpen((open) => !open) : undefined
              }
              onDrop={(mediaId) => board.drop(mediaId, status)}
            />
          ))}
        </div>

        {/* What the cursor carries. A card cannot follow the pointer out of its own column and
            stay in the list, and a second sortable with the same id would be ambiguous to
            dnd-kit — so the overlay wears the card's face without being one. */}
        {/* dropAnimation={null}, or releasing a card tweens the overlay back to the rect it
            started in and only then re-renders it where it was dropped — which reads as the card
            being yanked home before it changes its mind. The optimistic cache update has already
            put it in the new column by then, so there is nothing worth animating towards. */}
        <DragOverlay dropAnimation={null}>
          {board.dragging !== null && (
            <div className={`${CARD_CLASS} cursor-grabbing shadow-lg`}>
              <CardFace item={board.dragging} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </main>
  );
}
