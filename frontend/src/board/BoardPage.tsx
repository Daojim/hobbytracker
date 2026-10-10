import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { activityYears } from '../api/library';
import { AppHeader } from '../shell/AppHeader';
import { BoardSearch } from '../search/BoardSearch';
import { noteResultId } from '../search/NoteResults';
import { resultTitleId } from '../search/SearchResult';
import type { FoundNote } from '../journal/NoteList';
import { CARD_CLASS, CardFace, cardAnswerId, cardTitleId } from './Card';
import { Column, columnQuery } from './Column';
import { ColumnSwitcher } from './ColumnSwitcher';
import { ComingSoon, calendarTitleId, upcomingQuery } from './ComingSoon';
import { EntryDrawer } from '../journal/EntryDrawer';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useOverlayHistory } from '../lib/useOverlayHistory';
import { useBoard } from './useBoard';
import { YearPicker } from './YearPicker';
import { ALL_MANUAL, yearFor, yearsKey } from './keys';
import { BOARD_GAP, SIDE_BY_SIDE, boardTracks } from './grid';
import { useHiddenColumns } from './hiddenColumns';
import { columnsFor, hobbyDefinition } from '../hobbies';
import { DEFAULT_HOBBY, boardPath, isReadyHobby, statsPath } from '../shell/hobbies';
import type { Hobby } from '../shell/hobbies';
import type { LibrarySort, LogStatus } from '../api/types';

export function BoardPage() {
  const { hobby } = useParams();

  // A slug that names no hobby, or one whose board is not built yet. `movies` is in hobby_lu and
  // the API answers it, so what this prevents is not a 404 — it is a board of empty columns, which
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
 * on the others — and what lets a column taken off in Settings cost nothing at all.
 */
function Board({ hobby }: { hobby: Hobby }) {
  const definition = hobbyDefinition(hobby);

  // Per column, not board-wide: Completed is worth reading by rating while Backlog stays in the
  // order you put it in.
  const [sorts, setSorts] = useState<Record<LogStatus, LibrarySort>>(ALL_MANUAL);
  // Which year the board is showing, when nobody has said: the latest year there is — or the
  // last one there was, once the list has nothing in it at all.
  //
  // **Following it is right and the empty list is the exception.** The list is derived from
  // timestamps a move writes *and clears*, so it moves in both directions and the board has to
  // go with it both ways: replaying a game finished in 2024 starts a pass dated now, and
  // deleting that pass takes the year away again — a board that would not follow either way
  // answers the gesture by putting the card it is about off screen.
  //
  // An empty list is the one case where following says nothing and costs something. No year
  // existing means nothing anywhere carries a timestamp, so every logged title is in Backlog,
  // which is exempt from the year — the board reads identically under 2026 and under *All
  // years*, and the only thing that changes is what the control claims. It used to flip to All
  // years on the drag that emptied it, which moves three columns onto a different cache entry
  // for no visible gain: that is how a card ended up mounted in two columns at once, and see
  // `useBoard` for what that did to it. See YearPicker for the other half of this, which is
  // that a year the board is reading stays on offer after the list has dropped it.
  const [followed, setFollowed] = useState<number | undefined>(undefined);
  // And what the reader said, which outranks all of that. `null` is "they have not said", a
  // different state from `{ year: undefined }` — that one is All years, an answer somebody gave.
  const [chosen, setChosen] = useState<{ year?: number } | null>(null);
  // Dropped is a record, not a queue. It starts out of the way and opens when asked for.
  const [droppedOpen, setDroppedOpen] = useState(false);
  // Every column side by side, or a phone's one at a time. Side by side where there is no media
  // query to ask, which is jsdom — every component test but the phone's gets the board as it was.
  const sideBySide = useMediaQuery(SIDE_BY_SIDE, true);
  // Which column a phone is showing. Kept while the window is wide, so turning a phone sideways
  // and back returns to the column you were reading.
  const [shown, setShown] = useState<LogStatus>('Backlog');
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

  // What it was opened from, by the id of that element, so the keyboard can be handed back to it
  // on the way out. An id rather than a media id, because there are three doors and one title
  // can be behind two of them at once: a card, and a search result naming the same game.
  const openedFrom = useRef<string | null>(null);
  // Whether it was opened by a card's "How long for me?", so the question starts open. State
  // rather than part of the history entry: Back is about whether the drawer is open, and nothing
  // about which door it came through needs surviving a reload. Set on every opening, so a
  // question asked from the menu is never still open for the next title opened by its name.
  const [askHowLong, setAskHowLong] = useState(false);
  // The note a search found, when the drawer was opened from one, so the journal opens at it.
  // State for `askHowLong`'s reason, and set on every opening for the same one: a note found
  // once is never marked in the next journal opened by another door.
  const [atNote, setAtNote] = useState<FoundNote | null>(null);

  const { data: years } = useQuery({
    queryKey: yearsKey(hobby),
    queryFn: () => activityYears(hobby),
  });

  // Set during render, which is React's own way of adjusting state to something that arrived
  // from outside — an effect would paint one board with no year and refetch every column on the
  // way to the one it was always going to show.
  const latest = years?.[0];
  if (latest !== undefined && latest !== followed) {
    setFollowed(latest);
  }

  const year = chosen !== null ? chosen.year : followed;

  const board = useBoard({ hobby, sorts, year });

  // The columns this board draws, in board order: the hobby's, less any taken off in Settings.
  // One list, read once, and handed to everything that has to agree about it — the grid, the
  // calendar whose width is counted in the grid's tracks, and every card's menu, whose moves come
  // from it. A column left off is not rendered at all, so it asks the API for nothing and is not
  // a drop target; the titles in it stay exactly where they were.
  const hidden = useHiddenColumns(hobby);
  const columns = columnsFor(hobby).filter((column) => !hidden.has(column.status));

  // What a phone shows of those: the column chosen, or Backlog once the chosen one is taken off
  // in Settings. Backlog cannot be taken off, so the board always has a first column to fall
  // back to. The others are not mounted at all rather than hidden — see SIDE_BY_SIDE for why a
  // column out of sight must also be out of the drag.
  const showing = columns.find(({ status }) => status === shown) ?? columns[0]!;
  const drawn = sideBySide ? columns : [showing];
  const switching = !sideBySide && columns.length > 1;

  // Focus goes back to what the drawer was opened from — by id, not by a stored element.
  // Refetches remount a card while the drawer is open, so a reference kept from then would
  // point at a node no longer in the document.
  useEffect(() => {
    if (journalFor !== null || openedFrom.current === null) {
      return;
    }

    document.getElementById(openedFrom.current)?.focus();
    openedFrom.current = null;
  }, [journalFor]);

  // A card asking whether it was finished takes the keyboard when it starts asking, as the
  // journal's question does: the menu item or the drag that asked has gone. Here rather than in
  // the card, and when the question changes rather than when the card mounts, because a refetch
  // remounts cards — taking the keyboard on every mount would take it back from wherever it had
  // gone since. By id, for the reason the drawer's opener is found by id.
  const leavingFor = board.leaving?.mediaId ?? null;
  const leavingTo = board.leaving?.to ?? null;
  useEffect(() => {
    if (leavingFor !== null && leavingTo !== null) {
      document.getElementById(cardAnswerId(leavingFor))?.focus();
    }
  }, [leavingFor, leavingTo]);

  // Every way into the drawer: a card, a calendar row, a search result's name, or a note a search
  // found. Each names the element the keyboard goes back to.
  function openJournalFrom(
    returnTo: string,
    mediaId: number,
    { askHowLong: asking = false, note = null }: { askHowLong?: boolean; note?: FoundNote | null } = {},
  ) {
    openedFrom.current = returnTo;
    setAskHowLong(asking);
    setAtNote(note);
    openJournal(mediaId);
  }

  return (
    // 16px on a phone. 24 there, with the column's own 12 inside it, put the cards 36px in from
    // either edge of a 390px screen.
    <main className="min-h-screen bg-sunken p-4 text-fg md:p-6 2xl:p-8 3xl:p-10">
      <div className="mx-auto max-w-board">
        <AppHeader title="HobbyTracker" hobby={hobby} />

        {/* Above the board rather than on a screen of its own, so the column a title is
            about to land in is visible while you decide.

            Keyed on the hobby, and that key is the whole of what empties the box when the nav
            goes from one board to another. Everything the bar holds belongs to the board it was
            typed on — and clearing the term from inside it would not have been enough, because
            the debounced copy has already settled by the time the prop changes: the first render
            under the new hobby sends the old word to the new provider, measured, before any
            effect could run. Remounting starts all of it empty at once.

            A result on your board opens its journal from its name, the third door into the
            drawer: a title just found can be written about without going to look for its card.
            A note a search found is the fourth, and the one that says where in the journal to go. */}
        <BoardSearch
          key={hobby}
          hobby={hobby}
          onOpen={(mediaId) => openJournalFrom(resultTitleId(mediaId), mediaId)}
          onOpenNote={(mediaId, noteId, words) =>
            openJournalFrom(noteResultId(noteId), mediaId, { note: { noteId, words } })
          }
        />

        {/* Nothing until the years arrive, and that is deliberate rather than a missing
            loading state. The board opens on the latest year there is, so rendering before they
            are known would be a board showing every year — briefly, and then not — with four
            columns refetched on the way to the one it was always going to be. YearPicker held
            this same rule for this same reason while it owned the query. */}
        {years !== undefined && (
          <>
            {/* Above the board and outside every column, because it narrows three of them. It
                lived in the Completed header while completed_at was the only date it meant.

                The way to the Stats page shares its row: beside the year it is about, and taking
                that year there. Picked from renders on 2 October 2026 over a link in the header,
                which is about the app rather than one board, and a button by the picker, which
                read as a second control. The row is there on a phone too. */}
            <div
              className={`mb-3 flex items-center gap-4 ${
                definition.stats === null ? 'justify-end' : 'justify-between'
              }`}
            >
              {definition.stats !== null && (
                <Link
                  to={statsPath(hobby, year ?? 'all')}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  {`Stats for ${year ?? 'all years'}`}
                  <span aria-hidden="true"> →</span>
                </Link>
              )}
              <YearPicker
                years={years}
                value={year}
                onChange={(picked) => setChosen({ year: picked })}
              />
            </div>

            <DndContext {...board.dnd}>
              {/* A phone's one column at a time, chosen here. Inside the DndContext because each
                  segment is a drop target: carry a card up onto one and it moves there. Not
                  drawn with only Backlog on the board, where there is nothing to choose. */}
              {switching && (
                <ColumnSwitcher
                  columns={columns}
                  requestFor={(status) =>
                    columnQuery(hobby, status, sorts[status], yearFor(status, year))
                  }
                  shown={showing.status}
                  onShow={setShown}
                  lifted={board.dragging !== null}
                />
              )}

              {/* Two across before all of them. Four across a 768px window left each one 168px,
                  which after the well, the card and the cover is about 32px of title — every name
                  a stack of broken words. The tracks follow how many columns there are, and the
                  calendar under the board reads the same count so its edge lands on their lines;
                  see grid.ts. data-board is what scopes the e2e card() locator to the board, so a
                  search result cannot answer to it. */}
              <div
                data-board=""
                className={`grid items-start ${BOARD_GAP} ${boardTracks(drawn.length)}`}
              >
                {drawn.map(({ status, label }) => (
                  <Column
                    key={status}
                    hobby={hobby}
                    status={status}
                    label={label}
                    sort={sorts[status]}
                    onSortChange={(sort) => setSorts((current) => ({ ...current, [status]: sort }))}
                    year={yearFor(status, year)}
                    // Folded only side by side. On a phone, choosing Dropped in the switcher is
                    // already asking to see it, and a fold would want a second tap for that.
                    collapsed={sideBySide && status === 'Dropped' ? !droppedOpen : undefined}
                    onToggleCollapse={
                      sideBySide && status === 'Dropped'
                        ? () => setDroppedOpen((open) => !open)
                        : undefined
                    }
                    namedAbove={switching}
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
                    leaving={{
                      mediaId: leavingFor,
                      to: leavingTo,
                      onReplay: board.replay,
                      onPutBack: board.putBack,
                      onStay: board.stay,
                    }}
                    menu={{
                      mediaId: menuFor,
                      onOpen: setMenuFor,
                      onClose: () => setMenuFor(null),
                      columns,
                    }}
                    onOpen={(mediaId, options) =>
                      openJournalFrom(cardTitleId(mediaId), mediaId, {
                        askHowLong: options?.askHowLong,
                      })
                    }
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
              {/* z-40 rather than dnd-kit's own 999, so a phone's switcher can be lifted over the
                  card being carried to it (z-50 while a drag is on, in ColumnSwitcher). Over
                  everything else on the board either way. */}
              <DragOverlay dropAnimation={null} zIndex={40}>
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
          columns={columns.length}
          query={upcomingQuery(hobby)}
          voice="own"
          remembers
          onOpen={(mediaId) => openJournalFrom(calendarTitleId(mediaId), mediaId)}
        />
      </div>

      {journalFor !== null && (
        <EntryDrawer
          hobby={hobby}
          mediaId={journalFor}
          onClose={closeJournal}
          askHowLong={askHowLong}
          atNote={atNote}
          // The board's own list and the board's own move, so the pass's heading offers what a
          // card's menu offers and moves the card the way the menu does.
          columns={columns}
          onMove={(from, to) => board.moveAndWait(journalFor, from, to)}
          onPutBack={(to) => board.putBackAndWait(journalFor, to)}
        />
      )}
    </main>
  );
}
