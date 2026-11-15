import { useCallback, useRef, useState, type ReactNode } from 'react';
import { addOffer } from './addWords';
import { WhenFinished } from './WhenFinished';
import type { AddColumn, AddStatus, HobbyDefinition, SearchHit } from '../hobbies';
import type { AddedFinish } from '../api/library';
import type { LogStatus } from '../api/types';

/**
 * One symbol per column a tile can add to: + for Backlog, ▶ for Playing, ✓ for Completed.
 *
 * Drawn rather than typed. The font's own ▶ and ✓ were rendered beside these and lost: on
 * Windows the fallback font draws ▶ heavy and ✓ as a thin √, so the two never matched each other
 * and would match nothing on the next machine. Two paths and a triangle, in the text's colour —
 * `currentColor` keeps `index.css` the only file that names one — and hidden from assistive
 * technology, because the button's own name says what it does. `focusable="false"` for the
 * provider marks' reason: an SVG is a tab stop in some browsers unless told otherwise.
 *
 * A `Record` over the three, so a column added to `ADD_STATUSES` without a symbol here is a
 * compile error rather than an empty button.
 */
const SYMBOLS: Record<AddStatus, ReactNode> = {
  Backlog: (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  ),
  InProgress: (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" className="size-3" fill="currentColor">
      <path d="M5 3.4v9.2c0 .6.7 1 1.2.6l7-4.6c.5-.3.5-.9 0-1.2l-7-4.6C5.7 2.4 5 2.8 5 3.4z" />
    </svg>
  ),
  Completed: (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8.5l3.2 3.2L13 4.8" />
    </svg>
  ),
};

export interface AddControlProps {
  hit: SearchHit;
  definition: HobbyDefinition;
  /** Where this board can take a title — see `addColumns`. */
  columns: readonly AddColumn[];
  /** An add for this title is on its way, so nothing here may be pressed again. */
  adding: boolean;
  /**
   * Puts the title in a column. The ✓'s also says what its question was told about the finish,
   * where + and ▶ say nothing beside the column.
   */
  onAdd: (mediaId: number, status: LogStatus, finish?: AddedFinish) => void;
  /**
   * What the Discover wall adds: its own ground under the control, and the stretch that sits
   * every control on its row's bottom edge. The strip's tile is a surface already.
   */
  className?: string;
}

/**
 * A tile's add, in the search strip and on the Discover wall alike.
 *
 * Picked from rendered comparisons on 24 September 2026: one bordered control split into three
 * equal thirds by hairlines, so it still reads as the single button it replaced, with a symbol in
 * each rather than a word — a row of text buttons, one per column, is what this was asked not to
 * be. Muted at rest and the theme's accent under the cursor. The words are the buttons' names,
 * aloud, and their titles, under a resting pointer.
 *
 * While an add is on its way every third is dimmed and disabled, with nothing said about it —
 * *Adding…* went with the word *Add*, and what replaces it is still to be decided.
 *
 * No `overflow-hidden` to round the ends' hover fill, although that is the usual way: it clips
 * a focused button's outline at the control's edge, which leaves the keyboard only two short
 * bars to see. The end thirds round their own inner corners instead, at the border's 4px less
 * its 1px width.
 *
 * **The ✓ asks before it adds** (#24): *When did you finish it?*, in a panel over the tile — see
 * `WhenFinished`. It says so with `aria-expanded`, and holds its hover fill while the panel is
 * open, so the panel is seen to belong to it. + and ▶ add at a press, as they always did: a
 * title arriving in Backlog or Playing has no finish to be wrong about.
 */
export function AddControl({
  hit,
  definition,
  columns,
  adding,
  onAdd,
  className = '',
}: AddControlProps) {
  const offer = addOffer(hit, definition, columns);
  const [asking, setAsking] = useState(false);
  const control = useRef<HTMLDivElement>(null);
  const check = useRef<HTMLButtonElement>(null);

  // Stable, so the panel's listener for a press elsewhere is attached once while it is open.
  const close = useCallback((giveBack: boolean) => {
    setAsking(false);
    if (giveBack) {
      check.current?.focus();
    }
  }, []);

  if (offer.kind === 'calendar') {
    return (
      <button
        type="button"
        disabled={adding}
        aria-label={offer.label}
        onClick={() => onAdd(hit.id, 'Backlog')}
        className={`h-7 rounded border border-line px-2 text-xs font-medium hover:bg-hover disabled:opacity-50 ${className}`}
      >
        {offer.text}
      </button>
    );
  }

  // The panel is a portal, so it adds nothing to the control's own box: the tile lays the control
  // out exactly as it did, and the Discover wall's `mt-auto w-full` still reach it.
  return (
    <>
      <div
        ref={control}
        className={`flex h-7 divide-x divide-line rounded border border-line ${className}`}
      >
        {offer.actions.map(({ column, label, hint }) => {
          const asks = column.status === 'Completed';

          return (
            <button
              key={column.status}
              ref={asks ? check : undefined}
              type="button"
              disabled={adding}
              aria-label={label}
              aria-expanded={asks ? asking : undefined}
              title={hint}
              onClick={() => (asks ? setAsking(!asking) : onAdd(hit.id, column.status))}
              className="flex min-w-0 flex-1 items-center justify-center text-muted first:rounded-l-[3px] last:rounded-r-[3px] hover:bg-hover hover:text-accent disabled:opacity-50 aria-expanded:bg-hover aria-expanded:text-accent"
            >
              {SYMBOLS[column.status]}
            </button>
          );
        })}
      </div>

      {asking && (
        <WhenFinished
          hobby={definition.slug}
          question={definition.whenFinished}
          hours={definition.journal.fields.hoursPlayed}
          control={control}
          opener={check}
          onAnswer={(finish) => {
            close(true);
            onAdd(hit.id, 'Completed', finish);
          }}
          onClose={close}
        />
      )}
    </>
  );
}
