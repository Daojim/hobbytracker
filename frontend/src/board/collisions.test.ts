import { describe, expect, it } from 'vitest';
import {
  closestCorners,
  type ClientRect,
  type DroppableContainer,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import type { Coordinates } from '@dnd-kit/utilities';
import { boardCollisions } from './collisions';
import { droppableId } from './Column';
import { segmentId } from './ColumnSwitcher';
import type { LogStatus } from '../api/types';

const box = (left: number, top: number, width: number, height: number): ClientRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

/**
 * What dnd-kit hands a collision detector, built from rectangles rather than from a page.
 *
 * jsdom has no layout, so this is the one way to put a switcher, a column and a card where a
 * phone puts them and ask which of them a drag is over.
 *
 * Each target can be in two places, because dnd-kit can be wrong about where one is. The rect is
 * where dnd-kit believes it to be, and the optional third is where its element really is on the
 * screen. They differ for anything pinned while the page scrolls under a drag: dnd-kit measures
 * a target once, when the drag starts, and moves it with the page after that.
 */
function arena(
  droppables: [UniqueIdentifier, ClientRect, ClientRect?][],
  dragged: ClientRect,
  pointer: Coordinates | null,
) {
  return {
    active: { id: 'dragged', data: { current: undefined }, rect: { current: {} } } as never,
    collisionRect: dragged,
    droppableRects: new Map(droppables.map(([id, believed]) => [id, believed])),
    droppableContainers: droppables.map(
      ([id, believed, actual = believed]) =>
        ({
          id,
          key: id,
          data: { current: undefined },
          disabled: false,
          node: { current: { getBoundingClientRect: () => actual } },
          rect: { current: null },
        }) as unknown as DroppableContainer,
    ),
    pointerCoordinates: pointer,
  };
}

const STATUSES: LogStatus[] = ['Backlog', 'InProgress', 'OnHold', 'Completed', 'Dropped'];

/** The switcher pinned to the top of a 390px phone: five segments, 50px tall. */
const SWITCHER = STATUSES.map(
  (status, index) => [segmentId(status), box(21 + index * 70, 5, 70, 50)] as [UniqueIdentifier, ClientRect],
);

/** A column whose one card has been carried up to just under the switcher. */
const COLUMN_BELOW: [UniqueIdentifier, ClientRect][] = [
  [droppableId('Backlog'), box(16, 400, 358, 250)],
  [3001, box(28, 450, 334, 120)],
];
const CARRIED_UP = box(28, 60, 334, 120);

describe('boardCollisions', () => {
  it('lands on a segment while the finger is on it', () => {
    // The point of a segment: hold a card, take it up to Completed, let go.
    const onCompleted = { x: 21 + 3 * 70 + 35, y: 30 };

    const [first] = boardCollisions(arena([...SWITCHER, ...COLUMN_BELOW], CARRIED_UP, onCompleted));

    expect(first?.id).toBe(segmentId('Completed'));
  });

  it('finds a segment where it is on the screen, not where the page scrolling says it went', () => {
    // Measured in a browser, from deep in a long column. The page scrolled up under the drag on
    // the way to the switcher, which stayed pinned at the top of the screen. dnd-kit moves every
    // target it measured by however far the page has scrolled since the drag began — right for
    // everything that scrolls with the page, and wrong for the one thing pinned to the screen.
    // After 51px it had the segment the finger was on entirely below the finger, and the card
    // was let go on a card in its own column.
    const scrolledUp = 120;
    const pinned = SWITCHER.map(
      ([id, actual]) =>
        [id, box(actual.left, actual.top + scrolledUp, actual.width, actual.height), actual] as [
          UniqueIdentifier,
          ClientRect,
          ClientRect,
        ],
    );
    const onCompleted = { x: 21 + 3 * 70 + 35, y: 30 };

    const [first] = boardCollisions(arena([...pinned, ...COLUMN_BELOW], CARRIED_UP, onCompleted));

    expect(first?.id).toBe(segmentId('Completed'));
  });

  it('never lands on a segment by distance, however near its corners are', () => {
    // A card carried up to just under the switcher, with the finger on the card rather than on
    // the bar. Its corners are nearer a segment's than the column's own, so closestCorners
    // alone would hand it to whichever column that segment names — a drop the finger never
    // went near. The switcher sits on top of the column; it is not the column's neighbour.
    const belowTheBar = { x: 200, y: 110 };
    const args = arena([...SWITCHER, ...COLUMN_BELOW], CARRIED_UP, belowTheBar);

    // What this is a test of: in this arrangement, distance alone picks a segment.
    expect(String(closestCorners(args)[0]?.id)).toMatch(/^segment:/);

    expect(String(boardCollisions(args)[0]?.id)).not.toMatch(/^segment:/);
  });

  it('is closestCorners exactly on a board with no switcher', () => {
    // The board side by side, where nothing about the phone may change where a drop lands.
    const args = arena(
      [
        [droppableId('Backlog'), box(24, 200, 260, 600)],
        [droppableId('Completed'), box(300, 200, 260, 600)],
        [3001, box(36, 250, 236, 110)],
        [3002, box(312, 250, 236, 110)],
      ],
      box(290, 260, 236, 110),
      { x: 400, y: 300 },
    );

    expect(boardCollisions(args)).toEqual(closestCorners(args));
  });
});
