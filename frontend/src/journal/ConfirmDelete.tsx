
export interface ConfirmDeleteProps {
  /** What this button would delete, said in full for anyone who cannot see where it sits. */
  label: string;
  /** What deleting costs beyond it, when it costs anything. Nothing, for most things. */
  warning: string | null;
  confirming: boolean;
  busy: boolean;
  error: string | null;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Deleting one thing — a pass, or a note — with the confirm inline.
 *
 * Not `window.confirm`: it cannot be worded past the browser's own phrasing, cannot be styled,
 * and has to be stubbed in every test that walks past it.
 */
export function ConfirmDelete({
  label,
  warning,
  confirming,
  busy,
  error,
  onAsk,
  onCancel,
  onConfirm,
}: ConfirmDeleteProps) {
  if (!confirming) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={onAsk}
        className="self-start rounded text-xs text-muted hover:text-danger"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-baseline gap-2 text-xs">
      {warning !== null && <span className="text-muted">{warning}</span>}

      {/* Filled, not red text. Colour alone cannot carry "this destroys something": on Ember the
          accent is red too, so a red word beside a red link is a distinction nobody should be
          asked to make. The fill is a shape the accent never wears, and it survives being read
          in greyscale — the same reasoning that makes the genre stripe print its own name. */}
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="rounded bg-danger px-2 py-0.5 font-semibold text-danger-fg disabled:opacity-50"
      >
        {busy ? 'Deleting…' : 'Really delete?'}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="rounded border border-line px-2 py-0.5 text-muted hover:bg-hover hover:text-fg"
      >
        Cancel
      </button>

      {error !== null && (
        <span role="alert" className="text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
