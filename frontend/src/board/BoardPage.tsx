import { useEffect, useRef, useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { AppHeader } from '../shell/AppHeader';
import { BoardSearch } from '../search/BoardSearch';
import { CARD_CLASS, CardFace, cardTitleId } from './Card';
import { Column } from './Column';
import { EntryDrawer } from '../journal/EntryDrawer';
import { useBoard } from './useBoard';
import { yearFor } from './keys';
import { COLUMNS } from './columns';
import type { Hobby } from '../shell/hobbies';
import type { LibrarySort, LogStatus } from '../api/types';

/**
 * The games board.
 *
 * Hobby-parameterised even though games are the only hobby there is, so movies and books are a
 * routing change rather than a rewrite. Each column fetches itself, which is what makes a sort
 * or a year on one of them cost nothing on the other three.
 */
const HOBBY: Hobby = 'games';

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
  // Which title's journal is open, if any. One at a time: the drawer covers the board.
  const [journalFor, setJournalFor] = useState<number | null>(null);
  // Which card is asking to be removed, if any. Held here rather than in the card because a
  // refetch remounts cards — the same fact that makes focus go back to the drawer's opener by
  // id rather than by a stored element — and a confirm that closes itself when a background
  // refetch lands is one nobody can trust. One at a time, as the drawer's deletes are.
  const [removingFor, setRemovingFor] = useState<number | null>(null);
  // And which card has its options open, held here for exactly the same reason. One at a time
  // falls out of that, which is what you want anyway: two open menus on one board is two
  // questions nobody asked.
  const [menuFor, setMenuFor] = useState<number | null>(null);

  // Which card it was opened from, so the keyboard can be handed back to it on the way out.
  const openedFrom = useRef<number | null>(null);

  const board = useBoard({ hobby: HOBBY, sorts, year });

  // Focus goes back to the card the drawer was opened from — by id, not by a stored element.
  // Refetches remount the card while the drawer is open, so a reference kept from then would
  // point at a node no longer in the document.
  useEffect(() => {
    if (journalFor !== null || openedFrom.current === null) {
      return;
    }

    document.getElementById(cardTitleId(openedFrom.current))?.focus();
    openedFrom.current = null;
  }, [journalFor]);

  return (
    <main className="min-h-screen bg-sunken p-6 text-fg 2xl:p-8 3xl:p-10">
      <div className="mx-auto max-w-board">
        <AppHeader title="HobbyTracker" />

        {/* Above the board rather than on a screen of its own, so the column a title is
            about to land in is visible while you decide. */}
        <BoardSearch hobby={HOBBY} />

        <DndContext {...board.dnd}>
          {/* Two columns before four. Four across a 768px window left each one 168px, which after
              the well, the card and the cover is about 32px of title — every name a stack of
              broken words, and the card tall enough to stretch its own cover. data-board is
              what scopes the e2e card() locator to the board, so a search result cannot
              answer to it. */}
          <div
            data-board=""
            className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:gap-5 3xl:gap-6"
          >
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
                onMove={(mediaId, to) => board.move(mediaId, status, to)}
                removal={{
                  mediaId: removingFor,
                  onAsk: setRemovingFor,
                  onCancel: () => setRemovingFor(null),
                  onConfirm: (mediaId) => {
                    setRemovingFor(null);
                    board.remove(mediaId);
                  },
                }}
                menu={{
                  mediaId: menuFor,
                  onOpen: setMenuFor,
                  onClose: () => setMenuFor(null),
                }}
                onOpen={(mediaId) => {
                  openedFrom.current = mediaId;
                  setJournalFor(mediaId);
                }}
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
      </div>

      {journalFor !== null && (
        <EntryDrawer mediaId={journalFor} onClose={() => setJournalFor(null)} />
      )}
    </main>
  );
}
