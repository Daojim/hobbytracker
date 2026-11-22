import { Chevron } from '../lib/Chevron';

/**
 * The arrow that collapses a column, and the calendar under the board (#29): one control for
 * every fold on the board.
 *
 * Before the heading, picked from renders on 22 November 2026 over after the count and past the
 * sort control: there it stays on the heading's row whatever else in the row wraps, at the same
 * spot in every column. The app's one chevron in a 20px button with the hover fill a control in
 * the journal's heading has, pointing down open and right collapsed.
 *
 * **Named for what a press does**, *Collapse Completed* or *Expand Completed*, as the words it
 * replaced were, and so with no `aria-expanded`: a name and a state that both changed would say
 * it twice. The name carries what it folds, because a screen reader reaches the button without
 * the heading beside it in hand.
 */
export function CollapseArrow({
  collapsed,
  name,
  onToggle,
}: {
  collapsed: boolean;
  /** What it folds, as its heading says it: *Completed*, *Watched*, *Coming soon*. */
  name: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${name}`}
      className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted hover:bg-hover hover:text-fg"
    >
      <Chevron className={collapsed ? '-rotate-90' : ''} />
    </button>
  );
}
