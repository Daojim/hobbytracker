import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * How a press becomes a drag, in the one place that decides it.
 *
 * A card's surface carries two gestures, and the 8px activation distance is the whole of what
 * separates them: under it the press is a click and the title's button or the close corner gets
 * it, over it the card comes away with the pointer and dnd-kit suppresses the click that would
 * otherwise follow. Without a distance every press is a drag from the first pixel and no click
 * on a card ever lands.
 *
 * Its own module, beside `keys.ts` and for `keys.ts`'s reason: the test harness has to mount
 * cards under the same sensors production gives them, and a second copy of this number is a copy
 * that can drift. It already had. A bare `DndContext` takes dnd-kit's defaults, which carry no
 * activation constraint, so the moment a card's title stopped swallowing its own press the
 * journal looked unopenable in jsdom and worked perfectly in a browser.
 */
export function useBoardSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}
