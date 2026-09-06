import type { LibrarySort } from '../api/types';

/**
 * How one column is ordered.
 *
 * Every mode but `manual` is a read-only view: the API sorts and leaves `position` untouched.
 * That is what lets the board hand dragging out in one mode only and still promise that a look
 * at the alphabetical order cannot disturb the ranking underneath it.
 */
const MODES: readonly { value: LibrarySort; label: string }[] = [
  { value: 'manual', label: 'My order' },
  { value: 'added', label: 'Recently added' },
  { value: 'title', label: 'Title' },
  { value: 'rating', label: 'Rating' },
  // How long the title takes, shortest first. The label is the hobby's word for it — a game's is
  // HowLongToBeat's estimate, and "Hours" alone would read as the hours you have put in.
  { value: 'length', label: 'Time to beat' },
];

export interface SortSelectProps {
  /** The column's name, so the control says which column it orders. */
  label: string;
  value: LibrarySort;
  onChange: (sort: LibrarySort) => void;
}

export function SortSelect({ label, value, onChange }: SortSelectProps) {
  return (
    <label>
      <span className="sr-only">{label} order</span>
      <select
        value={value}
        // MODES is the closed set of what this control can emit, so the cast cannot widen past
        // LibrarySort however the DOM types the value.
        onChange={(event) => onChange(event.target.value as LibrarySort)}
        className="rounded border border-line bg-surface px-1 py-0.5 text-xs text-fg"
      >
        {MODES.map((mode) => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>
    </label>
  );
}
