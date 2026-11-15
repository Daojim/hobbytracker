import { useRef, useState } from 'react';
import { isDay } from './fields';

/** Which kind of date a box holds: a day, or a year kept as a year (#24). */
type Mode = 'day' | 'year';

const BOX = 'rounded border border-line bg-surface px-2 py-1 text-sm';

export interface DateFieldProps {
  id: string;
  /** The date's name: *Started*, or the hobby's word for the finish, *Completed* or *Watched*. */
  label: string;
  /** What the box holds: a day as `YYYY-MM-DD`, a year as it is typed, or nothing. */
  value: string;
  onChange: (value: string) => void;
  /**
   * That the form was touched, said by the switch itself: a press raises no change event, so the
   * form's one `onChange` never hears it, and *Saved* would go on claiming the server has what is
   * on screen — the wheel's trap.
   */
  onEdit: () => void;
  /**
   * A move is on its way and the pass takes nothing. The form stops change events itself; a press
   * is not one, so the switch checks for itself, as the wheel does.
   */
  moving: boolean;
  message: string | undefined;
}

/**
 * One of a pass's two dates, as a day or as a year: a game finished long ago that somebody
 * remembers only by the year (#24).
 *
 * **A Day | Year switch beside the label, each box on its own** — round two's pick at the #24
 * workshop, over a link under the box and a select before it, which overflowed the 448px drawer by
 * 34px whenever a box held a day. Beside the label rather than at the field's far end, because an
 * error message widens the field and pushed a switch there away from its label. 18px tall at a
 * desk, and 26px under a coarse pointer, so the row stays the 54px it was.
 *
 * **The mode follows the value**: a box holding a day is in Day mode and one holding anything else
 * is in Year mode, so a pass that keeps a year opens on its year, and a move that stamps a day
 * puts the box back to Day. Only an empty box has nothing to say which it is, and keeps the mode
 * it was last in — or clearing a year to type another would turn the box into a day under the
 * keyboard.
 *
 * **The switch carries what it can and invents nothing**, the user's pick at the #24 build: Day to
 * Year keeps the day's year, which the box already holds here, and Year to Day leaves the day
 * empty. What each mode held is kept while the drawer is open, so switching back brings it back.
 * What the boxes show is what is saved.
 */
export function DateField({ id, label, value, onChange, onEdit, moving, message }: DateFieldProps) {
  const kind: Mode | null = value === '' ? null : isDay(value) ? 'day' : 'year';

  // The mode last shown, for an empty box. Brought into line with the value as it renders rather
  // than in an effect, so a box is never drawn a frame in the wrong mode — React's own pattern for
  // state that follows a prop.
  const [shown, setShown] = useState<Mode>(kind ?? 'day');
  if (kind !== null && kind !== shown) {
    setShown(kind);
  }
  const mode = kind ?? shown;

  // What each mode held when it was left.
  const held = useRef<Record<Mode, string>>({ day: '', year: '' });

  function switchTo(next: Mode) {
    if (moving || next === mode) {
      return;
    }

    held.current[mode] = value;
    setShown(next);

    const carried =
      next === 'year' ? (isDay(value) ? value.slice(0, 4) : held.current.year) : held.current.day;

    if (carried !== value) {
      onChange(carried);
      onEdit();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-xs font-medium text-muted">
          {label}
        </label>
        <div
          role="group"
          aria-label={`${label} as`}
          className="flex h-5 divide-x divide-line rounded border border-line text-[0.6875rem] leading-none pointer-coarse:h-7 pointer-coarse:text-xs"
        >
          {(['day', 'year'] as const).map((which) => (
            <button
              key={which}
              type="button"
              aria-pressed={mode === which}
              onClick={() => switchTo(which)}
              className={`px-1.5 first:rounded-l-[3px] last:rounded-r-[3px] ${
                mode === which ? 'bg-hover font-medium text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {which === 'day' ? 'Day' : 'Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Keyed on the mode, so a switch is a new box rather than a date input turned into text
          under its own value. */}
      {mode === 'day' ? (
        <input
          key="day"
          id={id}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={BOX}
        />
      ) : (
        <input
          key="year"
          id={id}
          inputMode="numeric"
          maxLength={4}
          placeholder="Year"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${BOX} w-24 tabular-nums`}
        />
      )}

      {message !== undefined && (
        <p role="alert" className="text-xs text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
