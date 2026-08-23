import { useId, useState } from 'react';
import { journalDateInput } from '../lib/time';
import { formatHours } from '../lib/hours';
import {
  HOURS_RULE,
  RATING_RULE,
  UNRATED_THUMB,
  dateFieldValue,
  hltbTiers,
  parseHours,
  parseRating,
} from './fields';
import type { HltbEstimates } from './fields';
import type { LogEntry, UpdateLogEntry } from '../api/types';

export interface EntryFormProps {
  entry: LogEntry;
  /** What the game came out on. Already loaded by getGame, so this costs no extra request. */
  platforms: string[];
  /**
   * HowLongToBeat's three estimates, for reading your own hours against. Passed as one object
   * rather than three numbers because three nullable numbers in a row is the argument list
   * where two get swapped silently.
   */
  estimates: HltbEstimates;
  saving: boolean;
  /**
   * Whether what is on screen is what the server has.
   *
   * Held by the drawer rather than here, and that is not a preference: this form is keyed on the
   * values it was seeded from, so a save that changed anything remounts it. A flag set on success
   * would be destroyed by the refetch that proves it was true.
   */
  saved: boolean;
  /** Says the form has been touched since, which is what makes {@link saved} stop being true. */
  onEdit: () => void;
  /** What the API objected to, keyed by field, so it can be shown where it belongs. */
  serverErrors: Record<string, string[]>;
  onSave: (update: UpdateLogEntry) => void;
}

/**
 * The current pass, as something you can change.
 *
 * The status is deliberately not here. Dragging is the gesture that moves a title between
 * columns, and the rules about which entry that touches and which timestamps it stamps live on
 * the server — a second way in would need its own copy of all of it.
 */
export function EntryForm({
  entry,
  platforms,
  estimates,
  saving,
  saved,
  serverErrors,
  onSave,
  onEdit,
}: EntryFormProps) {
  const ids = useId();

  // Two pieces of state for one value, on purpose. `rating` is the value — held as text, so the
  // 8.75 rule can be applied to what was typed rather than to a float that has already lost the
  // distinction. `thumb` is only where the handle sits, and it moves only when the text parses:
  // typing 8.75 passes through "8." and "8.75", both refused, and a handle derived from the text
  // would be thrown to the far left on each of them on the way past.
  const [rating, setRating] = useState(entry.rating === null ? '' : String(entry.rating));
  const [thumb, setThumb] = useState(entry.rating ?? UNRATED_THUMB);
  const [platform, setPlatform] = useState(entry.platform ?? '');
  const [hours, setHours] = useState(entry.hoursPlayed === null ? '' : String(entry.hoursPlayed));
  const [started, setStarted] = useState(journalDateInput(entry.startedAt));
  const [completed, setCompleted] = useState(journalDateInput(entry.completedAt));
  const [errors, setErrors] = useState<Record<string, string>>({});


  /** Dragging the slider. A step of 0.1 gives exactly the scale the column stores. */
  function slide(value: number) {
    setThumb(value);
    setRating(value.toFixed(1));
  }

  /** Typing an exact value. The handle keeps up only while there is a number to keep up with. */
  function type(text: string) {
    setRating(text);

    const parsed = parseRating(text);
    if (parsed.value !== undefined && parsed.value !== null) {
      setThumb(parsed.value);
    }
  }

  function clearRating() {
    setRating('');
    setThumb(UNRATED_THUMB);
  }

  const messageFor = (field: string) => errors[field] ?? serverErrors[field]?.join(' ');

  /**
   * Your hours read against HowLongToBeat's, which is the reason to write them down at all.
   *
   * An empty list is the whole of "this title has never been matched" — hltbTiers drops the
   * tiers nobody has submitted a time for, so a game with a main-story time and no
   * completionist time shows one estimate rather than one number and two dashes.
   */
  const tiers = hltbTiers(estimates);
  const mine = parseHours(hours).value ?? null;

  /**
   * The difference, against Main Story alone.
   *
   * Three deltas would be arithmetic rather than a reading, and main story is what the card and
   * the Time to beat sort both mean by "how long does this take" — so it is the one your own
   * hours are worth holding up against.
   */
  const delta =
    mine === null || estimates.hltbMainStoryHours === null
      ? null
      : Number((mine - estimates.hltbMainStoryHours).toFixed(2));

  // IGDB's list, plus whatever is already recorded when that list has stopped mentioning it.
  // Dropping a stored value on a save the reader made about something else is not a correction.
  const options =
    entry.platform === null || platforms.includes(entry.platform)
      ? platforms
      : [...platforms, entry.platform];

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = parseRating(rating);
    const found: Record<string, string> = {};

    if (parsed.error !== undefined) {
      found['rating'] = RATING_RULE;
    }

    const playtime = parseHours(hours);
    if (playtime.error !== undefined) {
      found['hoursPlayed'] = HOURS_RULE;
    }

    // Both are the same YYYY-MM-DD shape here, so comparing the text compares the days. Caught
    // before sending because the API answers this with a 400 and the reader would rather know
    // now — though it is checked there too, before the check constraint can turn it into a 500.
    if (started !== '' && completed !== '' && completed < started) {
      found['completedAt'] = 'Completed cannot be earlier than started.';
    }

    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }

    // Every field, every time. The API takes PUT rather than PATCH precisely so that an absent
    // field means "cleared" — sending only what changed would wipe the rating whenever somebody
    // corrected a date. Notes are not among them any more: each one is its own row and its own
    // write, so this form cannot clear them and does not try.
    onSave({
      status: entry.status,
      rating: parsed.value ?? null,
      platform: platform === '' ? null : platform,
      hoursPlayed: playtime.value ?? null,
      startedAt: dateFieldValue(started, entry.startedAt),
      completedAt: dateFieldValue(completed, entry.completedAt),
    });
  }

  return (
    // noValidate, so the rules below are the ones that speak. step="0.1" is kept for the
    // spinner and the mobile keypad, but leaving native validation on means the browser
    // silently refuses to submit an 8.75 and shows a bubble we cannot word, style or test —
    // and the message that matters here is *why* two decimal places are refused.
    // onChange on the form rather than on each of seven fields: React's synthetic events
    // propagate through the tree, so one handler here hears every control inside. The notes box
    // is outside this form and is its own write, so it is right that it does not reach this.
    <form onSubmit={submit} onChange={onEdit} noValidate className="flex flex-col gap-3">
      <Field id={`${ids}-rating`} label="Rating" message={messageFor('rating')}>
        <div className="flex items-center gap-3">
          {/* The slider carries the field's label, so it is the control a screen reader meets
              first and the one arrow keys reach. aria-valuetext is what keeps an unrated pass
              from being announced as the 1.0 the handle happens to be parked on. */}
          <input
            id={`${ids}-rating`}
            type="range"
            min="1"
            max="10"
            step="0.1"
            value={thumb}
            aria-valuetext={rating === '' ? 'Not rated' : rating}
            onChange={(event) => slide(Number(event.target.value))}
            className={`w-40 cursor-pointer accent-neutral-700 dark:accent-neutral-300 ${
              rating === '' ? 'opacity-40' : ''
            }`}
          />

          <input
            type="number"
            step="0.1"
            min="1"
            max="10"
            aria-label="Exact rating"
            placeholder="—"
            value={rating}
            onChange={(event) => type(event.target.value)}
            className="w-16 rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />

          {/* Absent rather than disabled while there is nothing to clear, as the card's close
              button is absent in the columns where it would mean nothing. */}
          {rating !== '' && (
            <button
              type="button"
              aria-label="Clear rating"
              onClick={clearRating}
              className="rounded text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              ×
            </button>
          )}
        </div>
      </Field>


      <Field id={`${ids}-hours`} label="Hours played" message={messageFor('hoursPlayed')}>
        <div className="flex flex-wrap items-baseline gap-3">
          <input
            id={`${ids}-hours`}
            type="number"
            step="0.1"
            min="0"
            placeholder="—"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            className="w-24 rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />

          {/* One span per tier rather than one assembled string: they wrap independently on a
              narrow drawer, and a test can name the tier it means. */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-neutral-500">
            {tiers.length === 0 ? (
              <span>No HowLongToBeat estimate yet</span>
            ) : (
              tiers.map((tier) => (
                <span key={tier.label}>
                  {tier.label}: {formatHours(tier.hours)}
                </span>
              ))
            )}

            {delta !== null && (
              <span>
                you: {formatHours(mine)} ({delta > 0 ? '+' : ''}
                {delta})
              </span>
            )}
          </div>
        </div>
      </Field>

      <Field id={`${ids}-platform`} label="Platform" message={messageFor('platform')}>
        <select
          id={`${ids}-platform`}
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
          className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">Not recorded</option>
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex gap-3">
        <Field id={`${ids}-started`} label="Started" message={messageFor('startedAt')}>
          <input
            id={`${ids}-started`}
            type="date"
            value={started}
            onChange={(event) => setStarted(event.target.value)}
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </Field>

        <Field id={`${ids}-completed`} label="Completed" message={messageFor('completedAt')}>
          <input
            id={`${ids}-completed`}
            type="date"
            value={completed}
            onChange={(event) => setCompleted(event.target.value)}
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {/* Not on a timer. It says "what you are looking at is what the server has", which stops
            being true the moment a field changes and not a few seconds after the write — so it
            is cleared by the edit rather than by a clock, and is therefore never a stale claim.
            The transition a fade would have given comes free from the button, which reads
            "Saving…" in between and takes this away while it does.

            role="status" so it is announced politely: a confirmation only sighted readers get is
            only half a confirmation, and this drawer is a real dialog for the same reason. */}
        {saved && !saving && (
          <span role="status" className="text-sm text-green-700 dark:text-green-500">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  message,
  children,
}: {
  id: string;
  label: string;
  message: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
        {label}
      </label>
      {children}
      {message !== undefined && (
        <p role="alert" className="text-xs text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
