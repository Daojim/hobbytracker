import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { activityYears } from '../api/library';
import { AppHeader } from '../shell/AppHeader';
import { BoardSearch } from '../search/BoardSearch';
import { CARD_CLASS, CardFace, cardTitleId } from './Card';
import { Column } from './Column';
import { ComingSoon } from './ComingSoon';
import { EntryDrawer } from '../journal/EntryDrawer';
import { useOverlayHistory } from '../lib/useOverlayHistory';
import { useBoard } from './useBoard';
import { YearPicker } from './YearPicker';
import { yearFor, yearsKey } from './keys';
import { columnsFor } from '../hobbies';
import { DEFAULT_HOBBY, boardPath, isReadyHobby } from '../shell/hobbies';
import type { Hobby } from '../shell/hobbies';
import type { LibrarySort, LogStatus } from '../api/types';

const ALL_MANUAL: Record<LogStatus, LibrarySort> = {
  Backlog: 'manual',
  InProgress: 'manual',
  Completed: 'manual',
  Dropped: 'manual',
};

export function BoardPage() {
  const { hobby } = useParams();

  // A slug that names no hobby, or one whose board is not built yet. `movies` is in hobby_lu and
  // the API answers it, so what this prevents is not a 404 — it is four empty columns, which
  // reads as broken rather than as unbuilt. The same reasoning leaves the nav's five unready
  // hobbies as plain text rather than as links to somewhere disappointing.
  //
  // A component of its own so the redirect can come before any hook rather than after all of
  // them: returning early from Board would make every hook below it conditional.
  if (!isReadyHobby(hobby)) {
    return <Navigate to={boardPath(DEFAULT_HOBBY)} replace />;
  }

  return <Board hobby={hobby} />;
}

/**
 * A hobby's board.
 *
 * Each column fetches itself, which is what makes a sort or a year on one of them cost nothing
 * on the other three.
 */
function Board({ hobby }: { hobby: Hobby }) {
  // Per column, not board-wide: Completed is worth reading by rating while Backlog stays in the
  // order you put it in.
  const [sorts, setSorts] = useState<Record<LogStatus, LibrarySort>>(ALL_MANUAL);
  // Which year the board is showing. `null` is "not chosen yet", which is a different state
  // from `{ year: undefined }` — that one is All years, an answer somebody gave. Until a choice
  // is made the board opens on the latest year there is, because the year you are in is the one
  // you are adding to.
  const [chosen, setChosen] = useState<{ year?: number } | null>(null);
  // Dropped is a record, not a queue. It starts out of the way and opens when asked for.
  const [droppedOpen, setDroppedOpen] = useState(false);
  // Which title's journal is open, if any. One at a time: the drawer covers the board.
  //
  // It lives in a history entry rather than in state, which is what makes a phone's Back
  // close the drawer instead of leaving the board — the press it used to get was the board's.
  // Closing is that same press, so nothing is left behind for the next one to find. See
  // useOverlayHistory, which holds the three ways that goes quietly wrong.
  const {
    openFor: journalFor,
    open: openJournal,
    close: closeJournal,
  } = useOverlayHistory('journal');
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

  const { data: years } = useQuery({
    queryKey: yearsKey(hobby),
    queryFn: () => activityYears(hobby),
  });

  const year = chosen !== null ? chosen.year : years?.[0];

  const board = useBoard({ hobby, sorts, year });

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
            about to land in is visible while you decide.

            Keyed on the hobby, and that key is the whole of what empties the box when the nav
            goes from one board to another. Everything the bar holds belongs to the board it was
            typed on — and clearing the term from inside it would not have been enough, because
            the debounced copy has already settled by the time the prop changes: the first render
            under the new hobby sends the old word to the new provider, measured, before any
            effect could run. Remounting starts all of it empty at once. */}
        <BoardSearch key={hobby} hobby={hobby} />

        {/* Nothing until the years arrive, and that is deliberate rather than a missing
            loading state. The board opens on the latest year there is, so rendering before they
            are known would be a board showing every year — briefly, and then not — with four
            columns refetched on the way to the one it was always going to be. YearPicker held
            this same rule for this same reason while it owned the query. */}
        {years !== undefined && (
          <>
            {/* Above the board and outside every column, because it narrows three of them. It
                lived in the Completed header while completed_at was the only date it meant. */}
            <div className="mb-3 flex items-center justify-end">
              <YearPicker
                years={years}
                value={year}
                onChange={(picked) => setChosen({ year: picked })}
              />
            </div>

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
                {columnsFor(hobby).map(({ status, label }) => (
                  <Column
                    key={status}
                    hobby={hobby}
                    status={status}
                    label={label}
                    sort={sorts[status]}
                    onSortChange={(sort) => setSorts((current) => ({ ...current, [status]: sort }))}
                    year={yearFor(status, year)}
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
                      openJournal(mediaId);
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
          </>
        )}

        {/* Under the board and outside the DndContext, because it is a view of Backlog rather
            than a place a card can be dropped: an unreleased title is a real Backlog entry, and
            this draws the ones that are not out yet on a time axis instead of in the well.

            Outside the years gate above as well. The calendar has nothing to do with which year
            the board is reading — everything on it is in the future, and Backlog is exempt from
            the year anyway — so waiting on that query would hold it back for no reason.

            Deliberately not inside `data-board`: the e2e card() locator is scoped there so a
            search result cannot answer to it, and a calendar row must not either. */}
        <ComingSoon
          hobby={hobby}
          onOpen={(mediaId) => {
            openedFrom.current = mediaId;
            openJournal(mediaId);
          }}
        />
      </div>

      {journalFor !== null && (
        <EntryDrawer hobby={hobby} mediaId={journalFor} onClose={closeJournal} />
      )}
    </main>
  );
}
