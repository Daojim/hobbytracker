
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
        className="self-start rounded text-xs text-neutral-500 hover:text-red-600"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-baseline gap-2 text-xs">
      {warning !== null && <span className="text-neutral-500">{warning}</span>}

      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="rounded font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        {busy ? 'Deleting…' : 'Really delete?'}
      </button>

      <button type="button" onClick={onCancel} className="rounded text-neutral-500 hover:underline">
        Cancel
      </button>

      {error !== null && (
        <span role="alert" className="text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
