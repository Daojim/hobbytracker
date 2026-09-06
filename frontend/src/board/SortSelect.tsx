import type { LibrarySort } from '../api/types';

/**
 * How one column is ordered.
 *
 * Every mode but `manual` is a read-only view: the API sorts and leaves `position` untouched.
 * That is what lets the board hand dragging out in one mode only and still promise that a look
 * at the alphabetical order cannot disturb the ranking underneath it.
 */
const SHARED_MODES: readonly { value: LibrarySort; label: string }[] = [
  { value: 'manual', label: 'My order' },
  { value: 'added', label: 'Recently added' },
  { value: 'title', label: 'Title' },
  { value: 'rating', label: 'Rating' },
];

/**
 * Every mode, with the length one wearing this hobby's word for it.
 *
 * Only the label moves: `sort=length` is the same request from either board, ordering on the
 * same field. A game's is HowLongToBeat's estimate and is called *Time to beat*, because "Hours"
 * alone would read as the hours you have put in; a film's is its *Runtime*.
 */
const modesFor = (lengthLabel: string): readonly { value: LibrarySort; label: string }[] => [
  ...SHARED_MODES,
  { value: 'length', label: lengthLabel },
];

export interface SortSelectProps {
  /** The column's name, so the control says which column it orders. */
  label: string;
  /** This hobby's word for `sort=length`. See `hobbies/`. */
  lengthLabel: string;
  value: LibrarySort;
  onChange: (sort: LibrarySort) => void;
}

export function SortSelect({ label, lengthLabel, value, onChange }: SortSelectProps) {
  const modes = modesFor(lengthLabel);

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
