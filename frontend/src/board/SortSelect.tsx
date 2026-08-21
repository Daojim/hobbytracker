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
        className="rounded border border-neutral-300 bg-white px-1 py-0.5 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
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
