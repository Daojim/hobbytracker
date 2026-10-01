import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { KeyboardSensor, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { useBoardSensors } from './sensors';

describe('useBoardSensors', () => {
  it('lets a mouse drag from 8px, so a click under that still lands', () => {
    // The number the whole card is tuned to: the title is most of a card's surface and is also
    // the button that opens the journal, and this distance is all that tells the two apart.
    const { result } = renderHook(() => useBoardSensors());

    expect(result.current).toContainEqual({
      sensor: MouseSensor,
      options: { activationConstraint: { distance: 8 } },
    });
  });

  it('makes a finger hold still before it drags, so a swipe across a card scrolls the page', () => {
    // On a phone a card is most of what there is to touch, so a board that drags from the first
    // few pixels of a swipe is a board that cannot be scrolled. A finger that moves more than
    // 5px inside the quarter-second is a scroll, and the drag never begins.
    const { result } = renderHook(() => useBoardSensors());

    expect(result.current).toContainEqual({
      sensor: TouchSensor,
      options: { activationConstraint: { delay: 250, tolerance: 5 } },
    });
  });

  it('starts nothing from a pointer event', () => {
    // A pointer sensor answers a finger as well as a mouse, and a pointerdown arrives ahead of
    // the touchstart, so one left in beside the touch sensor would claim every touch first.
    // It can only keep a touch from scrolling the page with `touch-action: none` on the card,
    // which is the bug: a swipe that began on a card dragged it.
    const { result } = renderHook(() => useBoardSensors());

    expect(new Set(result.current.map(({ sensor }) => sensor))).toEqual(
      new Set([MouseSensor, TouchSensor, KeyboardSensor]),
    );
  });
});
