/**
 * The way into "What should I play next?": a die and *Pick*, beside Backlog's sort control.
 *
 * The user's pick at the #16 workshop, over the recommended sentence under the search box. It
 * makes Backlog's heading wrap at 1280 and 1440, which starts the column's cards 28px lower than
 * its neighbours'; it was shown that before choosing it, and chose to have it next to the column
 * it picks from. On your board only: `Column` hands it to the frame, and a share's columns are
 * handed nothing.
 */

/** Where the keyboard goes back to when the picker closes, found by id for the journal's reason. */
export const PICK_BUTTON_ID = 'pick-button';

export interface PickButtonProps {
  /** The hobby's question, which describes the button and is its tooltip. */
  question: string;
  onPick: () => void;
}

export function PickButton({ question, onPick }: PickButtonProps) {
  return (
    // Named "Pick", what it says, so a voice asking for it finds it; the question is its
    // description, and the tooltip a mouse gets for a die it might not read.
    <button
      type="button"
      id={PICK_BUTTON_ID}
      onClick={onPick}
      title={question}
      className="flex items-center gap-1 rounded border border-line bg-surface px-1.5 py-0.5 text-xs text-fg hover:bg-hover"
    >
      <Die />
      Pick
    </button>
  );
}

/** A die showing three, drawn in the text's colour so it follows every theme. */
function Die() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.25" cy="5.25" r="1.25" fill="currentColor" />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
      <circle cx="10.75" cy="10.75" r="1.25" fill="currentColor" />
    </svg>
  );
}
