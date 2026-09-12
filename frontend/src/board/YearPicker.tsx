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

  // The years on offer, plus the one being read when the list has stopped mentioning it.
  //
  // The platform select's rule, on a list that moves for a different reason: these are derived
  // from timestamps, and a move clears them. Drag the only 2026 title back to Backlog and the
  // API stops listing 2026 while the board is still reading it — and a <select> holding a value
  // it has no option for renders blank, so the control would be reporting no year at all.
  const offered = value === undefined || years.includes(value) ? years : putBack(years, value);

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
        {offered.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * A year put back into a newest-first list that has stopped carrying it.
 *
 * In its place rather than appended, and the list is not re-sorted: the API hands these over
 * newest first and knows things this does not, so exactly one thing is inserted and everything
 * else stays as it arrived. Appending would file 2026 under 2024, which reads as a bug.
 */
function putBack(years: number[], value: number): number[] {
  const at = years.findIndex((year) => year < value);

  return at === -1 ? [...years, value] : [...years.slice(0, at), value, ...years.slice(at)];
}
