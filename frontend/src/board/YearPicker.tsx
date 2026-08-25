import { useId } from 'react';

export interface YearPickerProps {
  /** Newest first, as the API returns them. Re-sorting here would only risk disagreeing. */
  years: number[];
  /** Undefined means every year, which is what the API understands as no `year=` at all. */
  value: number | undefined;
  onChange: (year: number | undefined) => void;
}

/** The sentinel for "all years". Empty rather than "0", which the API would try to parse. */
const ALL = '';

/**
 * Which year the board is showing.
 *
 * Presentational, and deliberately so. It used to fetch its own options, which was right while
 * it was the Completed column's own control and nothing above it needed to know the answer. The
 * board opens on the latest year there is, so the page has to hold that query to have anything
 * to default to — and two components reasoning about one loading state is how they start
 * disagreeing about it.
 *
 * The options come from the API rather than from a range of years, because it derives them from
 * the same projection the columns filter on — so the picker can never offer a year that turns
 * out to be empty everywhere. They also cannot be computed from `new Date().getFullYear()`: a
 * game finished at 8pm on New Year's Eve belongs to the year it was evening in, not the year
 * UTC had reached.
 *
 * Labelled through htmlFor rather than by wrapping the select, which would fold every option's
 * text into the control's accessible name — the trap the drawer's Platform field already
 * records.
 */
export function YearPicker({ years, value, onChange }: YearPickerProps) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs font-medium tracking-wide text-muted uppercase">
        Year
      </label>
      <select
        id={id}
        value={value === undefined ? ALL : String(value)}
        onChange={(event) =>
          onChange(event.target.value === ALL ? undefined : Number(event.target.value))
        }
        className="rounded border border-line bg-surface px-2 py-1 text-sm text-fg"
      >
        <option value={ALL}>All years</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}
