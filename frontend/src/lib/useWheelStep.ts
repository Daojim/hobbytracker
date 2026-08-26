import { useEffect, useRef } from 'react';

/**
 * Turning the wheel over a control into a step: up for more, down for less.
 *
 * **It cannot be React's `onWheel`, and that is the whole reason this is a hook.** React
 * registers `wheel` at the root as a *passive* listener, and a passive listener is one that has
 * promised not to cancel the event — so `preventDefault()` inside an `onWheel` handler does
 * nothing but log a warning, and the page scrolls out from under the control while the value
 * changes. A listener attached to the node itself with `{ passive: false }` is the only way to
 * take the gesture, so the node needs a ref and the ref needs an effect.
 *
 * `deltaY` is negative when the wheel is pushed away from you, which is the direction everybody
 * reads as "more", so the sign is inverted here rather than at each call site.
 *
 * One step per event, which is exactly one notch of a mouse wheel. A trackpad emits a stream of
 * small deltas instead and will step per event, so a flick travels further than a flick of a
 * page would — accumulating deltas against a threshold is the fix if that ever matters, and it
 * is deliberately not here, because it would make a mouse feel laggy to buy something no mouse
 * needs.
 */
export function useWheelStep<T extends HTMLElement>(onStep: (direction: 1 | -1) => void) {
  const ref = useRef<T>(null);

  // The handler is attached once, so it must not close over the first render's `onStep` — every
  // caller below reads state that changes on every step it makes.
  const latest = useRef(onStep);
  useEffect(() => {
    latest.current = onStep;
  });

  useEffect(() => {
    const node = ref.current;
    if (node === null) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      // A horizontal wheel, or a trackpad's sideways drift, is not an answer to this question.
      if (event.deltaY === 0) {
        return;
      }

      event.preventDefault();
      latest.current(event.deltaY < 0 ? 1 : -1);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);

  return ref;
}
