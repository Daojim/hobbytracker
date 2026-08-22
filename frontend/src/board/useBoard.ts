import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { removeCurrentPass, reorderColumn, transition } from '../api/library';
import { BOARD_STATUSES, columnKey, gameKey, yearFor } from './keys';
import type { LibraryItem, LibrarySort, LogStatus, PagedResult } from '../api/types';

export interface BoardView {
  hobby: string;
  sorts: Record<LogStatus, LibrarySort>;
  year: number | undefined;
}

type Column = PagedResult<LibraryItem>;

interface Move {
  mediaId: number;
  from: LogStatus;
  to: LogStatus;
  /** Where in the target column the card was let go. Appended when not given. */
  index?: number;
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
    mutationFn: async ({ mediaId, to }: Move) => {
      await transition(mediaId, to);

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
    // By the column *prefix*, not by `keyFor`. A column has one cache entry per sort and year,
    // and the exact key only reaches the one on screen — look at Backlog by title, drag a card
    // out of it in manual order, and the title ordering keeps that card for the full staleTime.
    //
    // And `['games', mediaId]`, which is what the drawer reads: a transition stamps started_at
    // and can insert an entry, so leaving it cached showed the pass as it was before the drag.
    onSettled: (_data, _error, { mediaId, from, to }) => {
      void queryClient.invalidateQueries({ queryKey: ['library', hobby, from] });
      void queryClient.invalidateQueries({ queryKey: ['library', hobby, to] });
      void queryClient.invalidateQueries({ queryKey: gameKey(mediaId) });
    },
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
   * Closing a Backlog card. Deliberately not optimistic, unlike `move`: a drag has to feel
   * instant, but this already took two clicks and a confirm, and matching the drawer's delete is
   * simpler than a rollback nothing is waiting on.
   */
  const remove = useMutation({
    mutationFn: (mediaId: number) => removeCurrentPass(mediaId),

    // The whole hobby, not the column prefix a move settles with. A move names both columns it
    // touches; this one does not know where the title lands until the server has answered —
    // deleting a Backlog pass laid over a 2024 completion puts the card in Completed, which is
    // a column nobody mentioned.
    onSettled: (_data, _error, mediaId) => {
      void queryClient.invalidateQueries({ queryKey: ['library', hobby] });
      void queryClient.invalidateQueries({ queryKey: gameKey(mediaId) });
    },
  });

  const sensors = useSensors(
    // Without a distance, the press that opens a card's drop button is read as the beginning of
    // a drag and the click never lands.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findCard = (mediaId: number) =>
    BOARD_STATUSES.flatMap((status) => columnOf(status)?.items ?? []).find(
      (item) => item.mediaId === mediaId,
    ) ?? null;

  /** Which column a drag is over, whether it is hovering a card or the column's empty space. */
  const statusOf = (data: unknown): LogStatus | undefined =>
    (data as { status?: LogStatus } | undefined)?.status;

  function onDragStart(event: DragStartEvent) {
    setDragging(findCard(Number(event.active.id)));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
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
      move.mutate({ mediaId, from, to, index: overIndex === -1 ? undefined : overIndex });
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
     * The close button on Playing. `from` is the column the card sits in, which is its status.
     */
    drop: (mediaId: number, from: LogStatus) => move.mutate({ mediaId, from, to: 'Dropped' }),
    /** The close button on Backlog, where the pass goes rather than moving to Dropped. */
    remove: (mediaId: number) => remove.mutate(mediaId),
    /** The card under the cursor, so the drag has something to follow. */
    dragging,
    dnd: {
      sensors,
      collisionDetection: closestCorners,
      onDragStart,
      onDragEnd,
      onDragCancel: () => setDragging(null),
    },
  };
}
