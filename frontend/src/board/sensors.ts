import { KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * How a press becomes a drag, in the one place that decides it.
 *
 * A card's surface carries two gestures, and the activation constraint is the whole of what
 * separates them: short of it the press is a click and the title's button or the options corner
 * gets it, past it the card comes away and dnd-kit suppresses the click that would otherwise
 * follow. Without one every press is a drag from the first pixel and no click on a card ever
 * lands.
 *
 * **A mouse and a finger cross that line differently, so they are two sensors.** A mouse drags
 * after 8px of travel. A finger has to hold still for a quarter of a second first, because on a
 * phone the cards are most of the board and a finger that moves at once is scrolling it: 5px of
 * movement inside the hold hands the gesture to the browser and no drag begins. One pointer
 * sensor cannot say both. In dnd-kit 6 it takes a single constraint for every kind of pointer, so
 * a hold for the finger slows the mouse as well. And it can only keep a finger from scrolling the
 * page with `touch-action: none` on the card, which was the bug: a swipe that began on a card
 * dragged it. The touch sensor stops the scroll itself, from a non-passive `touchmove` listener,
 * and only once a drag has started, which is what lets a card wear `touch-manipulation`.
 *
 * **What starts a drag is a `mousedown` or a `touchstart`**, the two sensors' activator events,
 * so those are what a control inside a card stops to keep a press its own — `NOT_A_DRAG` in
 * `Card.tsx`. A test there reads the events off these sensors, so the two cannot drift apart.
 *
 * Its own module, beside `keys.ts` and for `keys.ts`'s reason: the test harness has to mount
 * cards under the same sensors production gives them, and a second copy of these numbers is a
 * copy that can drift. It already had. A bare `DndContext` takes dnd-kit's defaults, which carry
 * no activation constraint, so the moment a card's title stopped swallowing its own press the
 * journal looked unopenable in jsdom and worked perfectly in a browser.
 */
export function useBoardSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}
