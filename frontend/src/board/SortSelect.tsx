import type { LibrarySort } from '../api/types';
import type { Voice, Voiced } from '../lib/voice';

/**
 * The order a column was put in by hand, which is the board's own.
 *
 * *My order* on your board, and *Board order* on a share, where it is the owner's order and not
 * the reader's. Kept on a share at all because sorting changes nothing but the reader's view, and
 * reading somebody's Completed column by rating is the obvious thing to do with it. Picked at the
 * #9 workshop on 4 October 2026.
 */
const MANUAL: Voiced<string> = { own: 'My order', shared: 'Board order' };

/**
 * How one column is ordered, with the length mode wearing this hobby's word for it.
 *
 * Every mode but `manual` is a read-only view: the API sorts and leaves `position` untouched.
 * That is what lets the board hand dragging out in one mode only and still promise that a look
 * at the alphabetical order cannot disturb the ranking underneath it.
 *
 * Only the length label moves between hobbies: `sort=length` is the same request from either
 * board, ordering on the same field. A game's is HowLongToBeat's estimate and is called *Time to
 * beat*, because "Hours" alone would read as the hours you have put in; a film's is its *Runtime*.
 */
const modesFor = (
  lengthLabel: string,
  voice: Voice,
): readonly { value: LibrarySort; label: string }[] => [
  { value: 'manual', label: MANUAL[voice] },
  { value: 'added', label: 'Recently added' },
  { value: 'title', label: 'Title' },
  { value: 'rating', label: 'Rating' },
  { value: 'length', label: lengthLabel },
];

export interface SortSelectProps {
  /** The column's name, so the control says which column it orders. */
  label: string;
  /** This hobby's word for `sort=length`. See `hobbies/`. */
  lengthLabel: string;
  value: LibrarySort;
  onChange: (sort: LibrarySort) => void;
  /** Whose board the column is on, which is whose the hand-made order is. */
  voice: Voice;
}

export function SortSelect({ label, lengthLabel, value, onChange, voice }: SortSelectProps) {
  const modes = modesFor(lengthLabel, voice);

  return (
    <label>
      <span className="sr-only">{label} order</span>
      <select
        value={value}
        // The modes are the closed set of what this control can emit, so the cast cannot widen
        // past LibrarySort however the DOM types the value.
        onChange={(event) => onChange(event.target.value as LibrarySort)}
        className="rounded border border-line bg-surface px-1 py-0.5 text-xs text-fg"
      >
        {modes.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>
    </label>
  );
}
