import { useQuery } from '@tanstack/react-query';
import { completionYears } from '../api/library';

export interface YearPickerProps {
  hobby: string;
  /** Undefined means every year, which is what the API understands as no `year=` at all. */
  value: number | undefined;
  onChange: (year: number | undefined) => void;
}

/** The sentinel for "all years". Empty rather than "0", which the API would try to parse. */
const ALL = '';

/**
 * Which year of completions the Completed column shows.
 *
 * The options come from the API rather than from a range of years, because it derives them from
 * the same projection the column itself uses — so the picker can never offer a year that turns
 * out to be empty. It also cannot be computed from `new Date().getFullYear()`: a game finished
 * at 8pm on New Year's Eve belongs to the year it was evening in, not the year UTC had reached.
 */
export function YearPicker({ hobby, value, onChange }: YearPickerProps) {
  const { data: years } = useQuery({
    queryKey: ['library', hobby, 'years'],
    queryFn: () => completionYears(hobby),
  });

  // Nothing until the years arrive. A picker that renders with only "All years" and then
  // silently grows options reads as though there were no completions to filter by, and while it
  // is absent the column is unfiltered — which is exactly what "All years" would have meant.
  if (years === undefined) {
    return null;
  }

  return (
    <label>
      <span className="sr-only">Completed year</span>
      <select
        value={value === undefined ? ALL : String(value)}
        onChange={(event) =>
          onChange(event.target.value === ALL ? undefined : Number(event.target.value))
        }
        className="rounded border border-neutral-300 bg-white px-1 py-0.5 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
      >
        <option value={ALL}>All years</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}
