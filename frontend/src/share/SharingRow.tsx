import { useQuery } from '@tanstack/react-query';
import { shareQuery } from './queries';

export interface SharingRowProps {
  hobby: string;
  /** The panel's id stem, so the group's heading and the row's line have ids of their own. */
  ids: string;
  /** Opens the dialog. The panel closes as it does, so the dialog is the one thing open. */
  onOpen: () => void;
}

/**
 * The Sharing group in Settings: one row, which opens the dialog, and a line under it saying
 * whether the board is shared.
 *
 * Picked at the #9 workshop on 4 October 2026 over the share's boxes kept open in the panel. There
 * a second list of columns sat straight under the panel's own, and the two looked alike while one
 * changes this browser's board and the other what anybody with the link sees. A row like every
 * other in the panel, with the spreadsheet's line under it, and an ellipsis because it opens
 * something rather than doing something.
 */
export function SharingRow({ hobby, ids, onOpen }: SharingRowProps) {
  // Asked as the panel opens, so the line can say which it is. The dialog reads the same answer.
  const { data: share } = useQuery(shareQuery(hobby));

  return (
    <>
      <hr className="my-2 border-line-soft" />

      <p id={`${ids}-sharing`} className="px-2 py-1 text-xs font-semibold tracking-wide text-muted uppercase">
        Sharing
      </p>
      <div role="group" aria-labelledby={`${ids}-sharing`} className="flex flex-col">
        <button
          type="button"
          onClick={onOpen}
          aria-describedby={`${ids}-sharing-state`}
          className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-hover"
        >
          <LinkGlyph />
          Share this board…
        </button>

        {/* Nothing until the answer is in, rather than a guess that would flip a moment later. */}
        {share !== undefined && (
          <p id={`${ids}-sharing-state`} className="px-2 pt-0.5 pb-1 text-xs text-muted">
            {share === null
              ? 'A read-only link. You choose what’s on it.'
              : 'Shared. Anyone with the link can see it.'}
          </p>
        )}
      </div>
    </>
  );
}

/** Two links of a chain, at the spreadsheet row's glyph's size and stroke. */
function LinkGlyph() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.6 9.4 9.4 6.6" />
      <path d="M7.3 4.6 8.4 3.5a2.6 2.6 0 0 1 3.7 3.7L11 8.3" />
      <path d="M8.7 11.4 7.6 12.5a2.6 2.6 0 0 1-3.7-3.7L5 7.7" />
    </svg>
  );
}
