import { useId, useState, type ReactNode } from 'react';
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
import type { PassFields } from '../hobbies';
import { useWheelStep } from '../lib/useWheelStep';
import type { LogEntry, UpdateLogEntry } from '../api/types';

/** What one notch of the wheel is worth on each of the three numbers this form holds. */
const RATING_BAR_GRAIN = 1;
const RATING_BOX_GRAIN = 0.1;
const HOURS_GRAIN = 0.5;

export interface EntryFormProps {
  entry: LogEntry;
  /**
   * Which of the six fields this hobby's pass has at all.
   *
   * Stated rather than inferred from the values, because "no platforms listed" and "a hobby
   * with no such idea" are different things that would otherwise look identical: an unenriched
   * game has no platforms either, and it still wants the select.
   */
  fields: PassFields;
  /** What the title came out on. Already loaded with the detail, so it costs no extra request. */
  platforms: readonly string[];
  /**
   * HowLongToBeat's figures, for reading your own hours against. Passed as one object rather
   * than three numbers because three nullable numbers in a row is the argument list where two
   * get swapped silently.
   *
   * Null for a hobby it says nothing about — which is not the four-nulls-inside of a game
   * nothing has matched, and does not render the "no estimate yet" line that one does.
   */
  estimates: HltbEstimates | null;
  /**
   * What the finished date is called: Completed for a game, Watched for a film.
   *
   * The column's own word, because the column is what stamps it. Started needs no such thing —
   * a film you have started watching is one you started.
   */
  completedLabel: string;
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
  /**
   * Whatever else can be done to this pass, on the Save row and pushed to its far end.
   *
   * A slot rather than a `ConfirmDelete` prop, because this form has no business knowing that
   * deleting a pass is a thing — it submits one PUT and that is all it does. What it does own is
   * the row its own button sits on, which is the only thing a second action needed from it.
   */
  actions?: ReactNode;
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
  fields,
  platforms,
  estimates,
  completedLabel,
  saving,
  saved,
  serverErrors,
  onSave,
  onEdit,
  actions,
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

  /**
   * The wheel over either rating control.
   *
   * One value, two grains, matching what the two controls are already for: the bar is where you
   * find roughly where a game sits, so a notch there is a whole point; the box is where you say
   * exactly, so a notch there is a tenth.
   *
   * It reads from `thumb` rather than from the text when the text will not parse, because the
   * text passes through "8." on its way to 8.5 and the handle is the last thing that *was* a
   * number. Rounding to one decimal place is not tidying: `parseRating` counts the places in the
   * text and 8 + 0.1 is 8.100000000000001, which has fourteen of them and is refused by the rule
   * this form exists to state.
   */
  function stepRating(grain: number, direction: 1 | -1) {
    const from = parseRating(rating).value ?? thumb;
    const next = Math.min(10, Math.max(1, Number((from + grain * direction).toFixed(1))));

    setThumb(next);
    setRating(String(next));
    // A wheel changes the value without the DOM raising a change event, so the `onChange` on the
    // form never hears it — and "Saved" would go on claiming the server has what is on screen.
    onEdit();
  }

  /** The wheel over hours played. Half an hour, which is the grain anybody records a session in. */
  function stepHours(direction: 1 | -1) {
    const from = parseHours(hours).value ?? 0;
    const next = Number((from + HOURS_GRAIN * direction).toFixed(2));

    // The column is numeric(5,2) and greater than zero, so the wheel stops where the rule does.
    // Clamping into range instead would mean scrolling *down* from 0.25 raising it to 0.5.
    if (next <= 0 || next > 999.99) {
      return;
    }

    setHours(String(next));
    onEdit();
  }

  const sliderWheel = useWheelStep<HTMLInputElement>((direction) =>
    stepRating(RATING_BAR_GRAIN, direction),
  );
  const ratingBoxWheel = useWheelStep<HTMLInputElement>((direction) =>
    stepRating(RATING_BOX_GRAIN, direction),
  );
  const hoursWheel = useWheelStep<HTMLInputElement>(stepHours);

  const messageFor = (field: string) => errors[field] ?? serverErrors[field]?.join(' ');

  /**
   * Your hours read against HowLongToBeat's, which is the reason to write them down at all.
   *
   * An empty list is the whole of "this title has never been matched" — hltbTiers drops the
   * tiers nobody has submitted a time for, so a game with a main-story time and no
   * completionist time shows one estimate rather than one number and two dashes.
   */
  const tiers = estimates === null ? [] : hltbTiers(estimates);
  const mine = parseHours(hours).value ?? null;

  /**
   * The difference, against the headline figure alone.
   *
   * Four deltas would be arithmetic rather than a reading, and this is the one the card and the
   * Time to beat sort both mean by "how long does this take" — so it is what your own hours are
   * worth holding up against. It followed those two here from Main Story, and should keep
   * following them: a delta against a tier nobody is looking at is a number with no question.
   *
   * It is also the better comparison on its own terms. All play styles is what everybody took,
   * however they played; a completionist run held up against Main Story reads as wildly over,
   * when it is only over for a tier it was never doing.
   */
  const delta =
    mine === null || estimates === null || estimates.hltbAllStylesHours === null
      ? null
      : Number((mine - estimates.hltbAllStylesHours).toFixed(2));

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
    if (fields.hoursPlayed && playtime.error !== undefined) {
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
    //
    // A field this hobby does not have goes as null rather than as whatever it was seeded with.
    // That is the point of it being absent rather than hidden: a film's pass does not hold hours
    // or a platform, so a row that somehow has one is corrected by the next save rather than
    // carrying a value with no control to see it by.
    onSave({
      status: entry.status,
      rating: parsed.value ?? null,
      platform: !fields.platform || platform === '' ? null : platform,
      hoursPlayed: fields.hoursPlayed ? (playtime.value ?? null) : null,
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
            ref={sliderWheel}
            id={`${ids}-rating`}
            type="range"
            min="1"
            max="10"
            step="0.1"
            value={thumb}
            aria-valuetext={rating === '' ? 'Not rated' : rating}
            onChange={(event) => slide(Number(event.target.value))}
            className={`w-40 cursor-pointer accent-accent ${
              rating === '' ? 'opacity-40' : ''
            }`}
          />

          <input
            ref={ratingBoxWheel}
            type="number"
            step="0.1"
            min="1"
            max="10"
            aria-label="Exact rating"
            placeholder="—"
            value={rating}
            onChange={(event) => type(event.target.value)}
            className="w-16 rounded border border-line bg-surface px-2 py-1 text-sm"
          />

          {/* Absent rather than disabled while there is nothing to clear, as the card's close
              button is absent in the columns where it would mean nothing. */}
          {rating !== '' && (
            <button
              type="button"
              aria-label="Clear rating"
              onClick={clearRating}
              className="rounded text-xs text-muted hover:text-fg"
            >
              ×
            </button>
          )}
        </div>
      </Field>


      {fields.hoursPlayed && (
        <Field id={`${ids}-hours`} label="Hours played" message={messageFor('hoursPlayed')}>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-3">
              <input
                ref={hoursWheel}
                id={`${ids}-hours`}
                type="number"
                step="0.1"
                min="0"
                placeholder="—"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                className="w-24 rounded border border-line bg-surface px-2 py-1 text-sm"
              />

              {/* Beside your own box rather than in among the four estimates, which is where it
                  used to sit. It is a fact about you and they are facts about the game, and once
                  the four became a block of their own a fifth item in it was the odd one out. */}
              {delta !== null && (
                <span className="text-xs text-muted">
                  you: {formatHours(mine)} ({delta > 0 ? '+' : ''}
                  {delta})
                </span>
              )}
            </div>

            {estimates === null ? null : tiers.length === 0 ? (
              <p className="text-xs text-muted">No HowLongToBeat estimate yet</p>
            ) : (
              /*
               * A grid off the dialog's own width, not the window's.
               *
               * These were four spans in a wrapping flex row, which is a layout with exactly one
               * good width. The modal has it — all four sat on one line — and the drawer never
               * did: three fitted and Completionist dropped to a second line, under nothing, with
               * its name no longer above the number it belonged to. Wrapping cannot be tuned out
               * of that, because the two boxes differ by 200-odd pixels by design.
               *
               * So the column count is chosen rather than fallen into: two in the drawer, four in
               * the modal, switching at 32rem of *container*. A viewport breakpoint would be the
               * wrong question — the drawer is `max-w-md` on a 4K monitor exactly as it is on a
               * laptop — which is the same reason a card sizes its cover from its column.
               *
               * `@container` is on the wrapper and never on the grid itself. A container query
               * unit resolves against the nearest *ancestor* container, so an element cannot
               * query itself: `@container @lg:grid-cols-4` on one node silently measures the
               * viewport instead. index.css records the same trap costing `--card-pad` its cqi.
               *
               * A <dl> because that is what these are — four names and their values. It also
               * gives each pair a wrapper to share, which is the whole fix: a reflow now moves a
               * label and its number together or moves neither.
               */
              <div className="@container">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 @lg:grid-cols-4">
                  {tiers.map((tier) => (
                    // data-hltb-tier because there is no role that says "one name and its number":
                    // a <dt>/<dd> pair maps to nothing a locator can ask for. The same reason
                    // data-cover and data-genre-stripe exist, and e2e/layout.spec.ts is what reads
                    // it — the column count is a box-model claim and jsdom has no box model.
                    <div key={tier.label} data-hltb-tier="" className="flex flex-col items-start gap-1">
                      <dt className="text-xs text-muted">{tier.label}</dt>
                      {/* HowLongToBeat's own colour, not the theme's — see index.css. Filled
                          rather than tinted text because these are the numbers the drawer is
                          actually for, and a row of muted spans was the one thing here nobody
                          could find at a glance. */}
                      <dd className="rounded bg-hltb px-2 py-0.5 text-xs font-semibold text-hltb-fg">
                        {formatHours(tier.hours)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </Field>
      )}

      {fields.platform && (
        <Field id={`${ids}-platform`} label="Platform" message={messageFor('platform')}>
          <select
            id={`${ids}-platform`}
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            className="rounded border border-line bg-surface px-2 py-1 text-sm"
          >
            <option value="">Not recorded</option>
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="flex gap-3">
        <Field id={`${ids}-started`} label="Started" message={messageFor('startedAt')}>
          <input
            id={`${ids}-started`}
            type="date"
            value={started}
            onChange={(event) => setStarted(event.target.value)}
            className="rounded border border-line bg-surface px-2 py-1 text-sm"
          />
        </Field>

        <Field id={`${ids}-completed`} label={completedLabel} message={messageFor('completedAt')}>
          <input
            id={`${ids}-completed`}
            type="date"
            value={completed}
            onChange={(event) => setCompleted(event.target.value)}
            className="rounded border border-line bg-surface px-2 py-1 text-sm"
          />
        </Field>
      </div>

      {/* flex-wrap, because the slot on the end can grow: a delete that has been asked about
          replaces one word with a sentence naming what it would take. */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded border border-line px-3 py-1 text-sm font-medium hover:bg-hover disabled:opacity-50"
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
          <span role="status" className="text-sm text-ok">
            Saved
          </span>
        )}

        {actions !== undefined && <div className="ml-auto">{actions}</div>}
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
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children}
      {message !== undefined && (
        <p role="alert" className="text-xs text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
