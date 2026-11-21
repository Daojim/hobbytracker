import { preferenceStore } from '../lib/preferenceStore';

/**
 * Whether the wheel turns before it shows the pick, or shows it at once, as chosen in Settings
 * since #27: *Spin | Skip the spin*, the second for somebody without reduced motion set on the
 * device. *Show the pick at once* wrapped inside its switch at 672, so the words are the short
 * pair.
 *
 * The picker already shows the pick with no turn under reduced motion, and this is the same
 * path: the pick is made before anything moves (`draw.ts`), so skipping the spin changes how the
 * pick arrives and never which. Per board, under the board's heading where the board has a wheel,
 * and per browser.
 */

export const WHEEL_SPINS = [
  { value: 'spin', label: 'Spin' },
  { value: 'still', label: 'Skip the spin' },
] as const;

export type WheelSpin = (typeof WHEEL_SPINS)[number]['value'];

const PREFIX = 'hobbytracker.wheel.';

export const wheelSpinKey = (hobby: string) => `${PREFIX}${hobby}`;

/** A spin unless told to skip it: anything else storage holds spins. */
const parseWheelSpin = (stored: string | null): WheelSpin => (stored === 'still' ? 'still' : 'spin');

const store = preferenceStore(PREFIX);

/** Whether this board's wheel turns, kept current as it changes here or in another tab. */
export function useWheelSpin(hobby: string): WheelSpin {
  return parseWheelSpin(store.useValue(wheelSpinKey(hobby)));
}

export function setWheelSpin(hobby: string, spin: WheelSpin): void {
  store.write(wheelSpinKey(hobby), spin);
}
