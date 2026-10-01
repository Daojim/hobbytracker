import { closestCorners, pointerWithin, type CollisionDetection } from '@dnd-kit/core';
import { isSegment } from './ColumnSwitcher';

/**
 * Where a drag would land, on a board that may have a phone's switcher above it.
 *
 * **A segment is a target only while the finger is on it.** Everything else is decided as it
 * always was, by `closestCorners`. Left to `closestCorners` alone, a segment would compete on
 * distance with the column it sits on top of, and lose to it only most of the time: carry a
 * column's last card up to just under the switcher and a segment's corners are nearer the card's
 * than anything in the column is, so letting go there would move the card to whichever column
 * that segment names — somewhere the finger never went. `collisions.test.ts` builds that
 * arrangement and checks that `closestCorners` does choose the segment in it.
 *
 * **A segment is measured where it is now, from the page.** dnd-kit measures a target once, when
 * the drag starts, and after that moves it with the page however far the page scrolls — its
 * `Rect` adds the scroll since then to every edge. That is right for everything that scrolls
 * with the page and wrong for the switcher, which is pinned to the top of the screen while the
 * page scrolls under it. Measured from deep in a long column: the page scrolled 51px on the way
 * up, dnd-kit had the segment under the finger 51px lower than it was, and the card was let go
 * on a card in its own column. Five rectangles per move is cheap.
 *
 * With no switcher on the board there are no segments to set aside, and this is
 * `closestCorners` exactly.
 */
export const boardCollisions: CollisionDetection = (args) => {
  const segments = args.droppableContainers.filter(({ id }) => isSegment(id));

  const whereTheyAre = new Map(
    segments.flatMap(({ id, node }) =>
      node.current === null ? [] : [[id, node.current.getBoundingClientRect()] as const],
    ),
  );

  const onSegment = pointerWithin({
    ...args,
    droppableContainers: segments,
    droppableRects: whereTheyAre,
  });
  if (onSegment.length > 0) {
    return onSegment;
  }

  return closestCorners({
    ...args,
    droppableContainers: args.droppableContainers.filter(({ id }) => !isSegment(id)),
  });
};
