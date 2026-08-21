import { useId, useState } from 'react';
import { journalDateInput } from '../lib/time';
import { RATING_RULE, dateFieldValue, parseRating } from './fields';
import type { LogEntry, UpdateLogEntry } from '../api/types';

export interface EntryFormProps {
  entry: LogEntry;
  saving: boolean;
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
export function EntryForm({ entry, saving, serverErrors, onSave }: EntryFormProps) {
  const ids = useId();
  const [rating, setRating] = useState(entry.rating === null ? '' : String(entry.rating));
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [started, setStarted] = useState(journalDateInput(entry.startedAt));
  const [completed, setCompleted] = useState(journalDateInput(entry.completedAt));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const messageFor = (field: string) => errors[field] ?? serverErrors[field]?.join(' ');

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = parseRating(rating);
    const found: Record<string, string> = {};

    if (parsed.error !== undefined) {
      found['rating'] = RATING_RULE;
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
    // field means "cleared" — sending only what changed here would wipe the notes whenever
    // somebody edited a rating.
    onSave({
      status: entry.status,
      rating: parsed.value ?? null,
      notes: notes.trim() === '' ? null : notes.trim(),
      startedAt: dateFieldValue(started, entry.startedAt),
      completedAt: dateFieldValue(completed, entry.completedAt),
    });
  }

  return (
    // noValidate, so the rules below are the ones that speak. step="0.1" is kept for the
    // spinner and the mobile keypad, but leaving native validation on means the browser
    // silently refuses to submit an 8.75 and shows a bubble we cannot word, style or test —
    // and the message that matters here is *why* two decimal places are refused.
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <Field id={`${ids}-rating`} label="Rating" message={messageFor('rating')}>
        <input
          id={`${ids}-rating`}
          type="number"
          step="0.1"
          min="1"
          max="10"
          value={rating}
          onChange={(event) => setRating(event.target.value)}
          className="w-24 rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </Field>

      <Field id={`${ids}-notes`} label="Notes" message={messageFor('notes')}>
        <textarea
          id={`${ids}-notes`}
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
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

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded border border-neutral-300 px-3 py-1 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
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
