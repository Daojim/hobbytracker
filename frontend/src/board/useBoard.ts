import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { boardCollisions } from './collisions';
import { isSegment } from './ColumnSwitcher';
import { removeFromBoard, reorderColumn, transition } from '../api/library';
import { columnKey, mediaKey, yearFor } from './keys';
import { settleMove, settleStats } from './settle';
import { BOARD_STATUSES } from '../hobbies';
import { useBoardSensors } from './sensors';
import type { LibraryItem, LibraryPage, LibrarySort, LogStatus } from '../api/types';

export interface BoardView {
  hobby: string;
  sorts: Record<LogStatus, LibrarySort>;
  year: number | undefined;
}

type Column = LibraryPage;

interface Move {
  mediaId: number;
  from: LogStatus;
  to: LogStatus;
  /** Where in the target column the card was let go. Appended when not given. */
  index?: number;
  /** A finish put back: the pass itself leaves Completed, and its finish goes. See `transition`. */
  notFinished?: boolean;
}

interface Reorder {
  status: LogStatus;
  mediaIds: number[];
}

/**
 * Everything the board writes, and the gestures that ask for it.
 *
 * One optimistic update rather than one per gesture: the close button, a drag between columns
 * and a drag within one all move a card in the cache the same way, and all three have to put it
 * back if the request fails.
 */
export function useBoard({ hobby, sorts, year }: BoardView) {
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState<LibraryItem | null>(null);

  // Whether a card is being held over one of a phone's segments, which is when the page must
  // stop scrolling itself. See `dnd.autoScroll` below.
  const [overSegment, setOverSegment] = useState(false);

  // A card asked to leave Completed, by a drag or by its menu, waiting on whether it was finished.
  //
  // Leaving Completed either replays the title or takes a mistaken finish back, and only the
  // person moving it knows which, so nothing moves until the card is answered. Decided at the #14
  // pickup over an Undo after every move: an Undo is gone in seconds, and the mistaken finish #14
  // was found from was noticed six hours later. Held here, above the cards, for the reason the
  // remove confirm is held above them: a refetch remounts cards. One at a time falls out of it.
  const [leaving, setLeaving] = useState<Move | null>(null);

  const keyFor = (status: LogStatus) =>
    columnKey(hobby, status, sorts[status], yearFor(status, year));

  const columnOf = (status: LogStatus) => queryClient.getQueryData<Column>(keyFor(status));

  /** Every column as it stands, so a failed request can restore the board exactly. */
  const snapshot = () =>
    BOARD_STATUSES.map((status) => [keyFor(status), columnOf(status)] as const);

  const restore = (taken: ReturnType<typeof snapshot>) => {
    for (const [key, column] of taken) {
      queryClient.setQueryData(key, column);
    }
  };

  /** Otherwise a request already in flight can land after the optimistic write and undo it. */
  const holdRefetches = () => queryClient.cancelQueries({ queryKey: ['library', hobby] });

  const move = useMutation({
    mutationFn: async ({ mediaId, to, notFinished }: Move) => {
      await transition(mediaId, to, notFinished);

      // The transition alone puts the card wherever the server decided, which is the top of the
      // column whenever it had to start a new entry. Storing the order it was actually dropped
      // into is a second call, and the optimistic cache is already exactly that order.
      const landed = columnOf(to);
      if (sorts[to] === 'manual' && landed !== undefined && landed.items.length > 0) {
        await reorderColumn({
          hobby,
          status: to,
          mediaIds: landed.items.map((item) => item.mediaId),
        });
      }
    },

    onMutate: async ({ mediaId, from, to, index }) => {
      await holdRefetches();
      const taken = snapshot();

      const source = columnOf(from);
      const card = source?.items.find((item) => item.mediaId === mediaId);

      if (source !== undefined && card !== undefined) {
        queryClient.setQueryData<Column>(keyFor(from), {
          ...source,
          items: source.items.filter((item) => item.mediaId !== mediaId),
          total: source.total - 1,
        });

        const target = columnOf(to);
        if (target !== undefined) {
          const items = [...target.items];
          items.splice(index ?? items.length, 0, { ...card, currentStatus: to });
          queryClient.setQueryData<Column>(keyFor(to), {
            ...target,
            items,
            total: target.total + 1,
          });
        }
      }

      return { taken };
    },

    onError: (_error, _move, context) => {
      if (context !== undefined) {
        restore(context.taken);
      }
    },

    // The server decides more than the card's column: leaving Completed inserts a whole new
    // entry, which changes both the count and the dates the card shows. So both columns are
    // refetched rather than patched, and the optimistic write only has to hold for the moment
    // between letting go and the answer arriving.
    //
    // The headers' hours are left as they were for that moment, rather than patched with the
    // card's length. A card carries its length and not your hours, so patching the total and not
    // Completed's comparison would leave the comparison about one set of games and the total
    // about another until the answer arrived. The count moves at once and the hours follow it.
    //
    // What a move refreshes is `settleMove`'s, shared with the Stats page's journal (#25), which
    // moves a title with no board on screen. Returned, so `moveAndWait` waits for the journal's
    // refetch: see there.
    onSettled: (_data, _error, settled) => settleMove(queryClient, hobby, settled),
  });

  const reorder = useMutation({
    mutationFn: ({ status, mediaIds }: Reorder) => reorderColumn({ hobby, status, mediaIds }),

    onMutate: async ({ status, mediaIds }) => {
      await holdRefetches();
      const taken = snapshot();

      const column = columnOf(status);
      if (column !== undefined) {
        const byId = new Map(column.items.map((item) => [item.mediaId, item]));
        queryClient.setQueryData<Column>(keyFor(status), {
          ...column,
          items: mediaIds.flatMap((mediaId) => byId.get(mediaId) ?? []),
        });
      }

      return { taken };
    },

    onError: (_error, _reorder, context) => {
      if (context !== undefined) {
        restore(context.taken);
      }
    },

    // The exact key, unlike the move above: this writes `position`, and `manual` is the only
    // ordering that reads it. The other three are server-side views a reordering cannot change.
    onSettled: (_data, _error, { status }) => {
      void queryClient.invalidateQueries({ queryKey: keyFor(status) });
    },
  });

  /**
   * Remove from board. Deliberately not optimistic, unlike `move`: a drag has to feel instant,
   * but this already took two clicks and a confirm, and matching the drawer's delete is simpler
   * than a rollback nothing is waiting on.
   */
  const remove = useMutation({
    mutationFn: (mediaId: number) => removeFromBoard(mediaId),

    // The whole hobby, not the column prefix a move settles with. A move names both columns it
    // touches; this one names none — every pass of yours goes, and they can be spread across all
    // four, so the columns that change are only knowable from what was there.
    //
    // And dropped, not only made stale, for the move's reason: a view of a column that is not on
    // screen still *renders* its stale copy the moment something switches onto it. Take a title
    // off, put it back from the strip, switch to an ordering left behind, and the card is mounted
    // in two columns and cannot be dragged. Re-adding into Backlog was always enough to do it;
    // adding straight into any column made it ordinary. See "A card mounted twice" in
    // docs/board.md.
    //
    // And the Stats page's answers, since a title taken off takes its finishes with it.
    onSettled: (_data, _error, mediaId) => {
      queryClient.removeQueries({ queryKey: ['library', hobby], type: 'inactive' });
      void queryClient.invalidateQueries({ queryKey: ['library', hobby] });
      void queryClient.invalidateQueries({ queryKey: mediaKey(hobby, mediaId) });
      void settleStats(queryClient, hobby);
    },
  });

  const sensors = useBoardSensors();

  const findCard = (mediaId: number) =>
    BOARD_STATUSES.flatMap((status) => columnOf(status)?.items ?? []).find(
      (item) => item.mediaId === mediaId,
    ) ?? null;

  /** Which column a drag is over, whether it is hovering a card or the column's empty space. */
  const statusOf = (data: unknown): LogStatus | undefined =>
    (data as { status?: LogStatus } | undefined)?.status;

  /**
   * A move between columns from the board itself, which asks first when it leaves Completed: see
   * `leaving`. The journal does not come through here, because it asks its own question.
   */
  function moveOrAsk(asked: Move) {
    if (asked.from === 'Completed') {
      setLeaving(asked);
      return;
    }

    move.mutate(asked);
  }

  function onDragStart(event: DragStartEvent) {
    setDragging(findCard(Number(event.active.id)));
  }

  function onDragOver({ over }: DragOverEvent) {
    setOverSegment(over !== null && isSegment(over.id));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    setOverSegment(false);
    if (over === null) {
      return;
    }

    const mediaId = Number(active.id);
    const from = statusOf(active.data.current);
    const to = statusOf(over.data.current);
    if (from === undefined || to === undefined) {
      return;
    }

    if (from !== to) {
      // Dropped onto a card: land where that card is. Dropped onto the column itself: the end.
      const target = columnOf(to)?.items ?? [];
      const overIndex = target.findIndex((item) => item.mediaId === Number(over.id));
      moveOrAsk({ mediaId, from, to, index: overIndex === -1 ? undefined : overIndex });
      return;
    }

    // Same column. Only `manual` stores an order; every other mode is a read-only view, and a
    // drag there would be promising a ranking the API is not going to keep.
    if (sorts[from] !== 'manual' || active.id === over.id) {
      return;
    }

    const items = columnOf(from)?.items ?? [];
    const oldIndex = items.findIndex((item) => item.mediaId === mediaId);
    const newIndex = items.findIndex((item) => item.mediaId === Number(over.id));
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    reorder.mutate({
      status: from,
      // The whole column, top first — idempotent, and with no off-by-one to get wrong.
      mediaIds: arrayMove(items, oldIndex, newIndex).map((item) => item.mediaId),
    });
  }

  return {
    /**
     * A move from the card's options menu. `from` is the column the card sits in, which is its
     * status — the caller knows it for free, and the mutation needs it to know which two columns
     * to put back if the request fails.
     *
     * The same mutation the drag ends in, deliberately, so a menu move inherits the optimistic
     * update, the rollback, the reorder that follows it in manual sort, and both invalidations
     * without any of it being written twice. It replaced a `drop` that was this with `to` fixed
     * to 'Dropped', which was all the old close button could ever ask for. And it asks before
     * leaving Completed, as the drag does.
     */
    move: (mediaId: number, from: LogStatus, to: LogStatus) => moveOrAsk({ mediaId, from, to }),
    /**
     * The same move, from the journal's heading, as something to wait on.
     *
     * The drawer has a pass on screen that the move changes underneath it, so it needs to know
     * when the move is over rather than only that it was asked for. A third caller of the one
     * mutation, as the menu is the second: everything above happens for it as well. It does not
     * ask, because the drawer has asked already.
     */
    moveAndWait: (mediaId: number, from: LogStatus, to: LogStatus) =>
      move.mutateAsync({ mediaId, from, to }),
    /** A finish put back from the journal, which asked whether it happened: the same mutation. */
    putBackAndWait: (mediaId: number, to: LogStatus) =>
      move.mutateAsync({ mediaId, from: 'Completed', to, notFinished: true }),
    /** The card waiting on whether it was finished, and where it was asked to go. */
    leaving: leaving === null ? null : { mediaId: leaving.mediaId, to: leaving.to },
    /** It was finished: a new pass in the column it was asked to go to, the finished one kept. */
    replay: () => {
      if (leaving !== null) {
        setLeaving(null);
        move.mutate(leaving);
      }
    },
    /** It was never finished: the pass itself goes there, without its finish. */
    putBack: () => {
      if (leaving !== null) {
        setLeaving(null);
        move.mutate({ ...leaving, notFinished: true });
      }
    },
    /** Neither: the card stays in Completed. */
    stay: () => setLeaving(null),
    /** Taking the current pass off the board, which is the one ending a drag cannot express. */
    remove: (mediaId: number) => remove.mutate(mediaId),
    /** The card under the cursor, so the drag has something to follow. */
    dragging,
    dnd: {
      sensors,
      collisionDetection: boardCollisions,

      // Off while a card is over a phone's segment, and only then. The switcher is pinned to
      // the top edge, and the top edge is also where a drag asks the page to scroll up. Left
      // on, a finger waiting over a segment scrolls the page back to its top, the switcher
      // comes unpinned and slides down with it, and the card is let go on whatever is under the
      // finger by then. Measured, not reasoned: the e2e spec that waits over a segment from deep
      // in a long column lands in the wrong column without this.
      autoScroll: { enabled: !overSegment },
      onDragStart,
      onDragOver,
      onDragEnd,
      onDragCancel: () => {
        setDragging(null);
        setOverSegment(false);
      },
    },
  };
}
