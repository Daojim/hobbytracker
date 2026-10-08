import { useEffect, useRef, useState, type Ref } from 'react';
import { BOARD_STATUSES, type BoardColumn } from '../hobbies';
import type { LogStatus } from '../api/types';

export interface ColumnControlProps {
  /**
   * The id the pass's region is labelled by.
   *
   * On the column's name inside the button rather than on the button, whose own name says what
   * it is for. The region stays called *Playing*, as the plain heading called it, and the button
   * is *Column: Playing*.
   */
  labelId: string;
  /** Where the pass is — or, while a move is on its way, where it is going. */
  status: LogStatus;
  /**
   * A move is on its way. The heading names where it is going and says so, and opens on nothing
   * until it is over: a second move sent behind the first could land before it.
   */
  moving: boolean;
  /**
   * The columns the board draws, in its order, which is what the list offers. A column taken off
   * in Settings is not among them, so it is offered nowhere; a pass already in one still has it
   * named and ticked, because that stays true whether or not the board draws it.
   */
  columns: readonly BoardColumn[];
  /** What this hobby calls each column, for the one the board is not drawing. */
  columnLabel: Readonly<Record<LogStatus, string>>;
  /** The heading's type, which is the drawer's to say: matching *Journal* is the point of it. */
  className: string;
  /** A column other than the one the pass is in. Picking that one again moves nothing. */
  onPick: (status: LogStatus) => void;
  /** The button, so the drawer can hand the keyboard back to it after a question of its own. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * The current pass's heading, as the way to another column.
 *
 * Picked from renders on 7 October 2026 over a *Move* button beside the heading and the phone
 * switcher's segments in its place, because it is the only one of the three that changes
 * nothing at rest: the same type, the same 16px row, the same 44px down to Rating.
 *
 * **Buttons, not a `<select>`.** Chrome on Windows changes a closed select on every arrow key
 * and fires `change` each time, measured: four presses of ↓ were four changes. Here a change is
 * a move, so arrowing from Backlog to Dropped would stamp a completion on the way past. The list
 * is a group of buttons, as the card's menu is, for that menu's reason: a set of buttons that
 * behaves exactly as it announces, rather than `role="menu"` without its keyboard.
 */
export function ColumnControl({
  labelId,
  status,
  moving,
  columns,
  columnLabel,
  className,
  onPick,
  ref,
}: ColumnControlProps) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement | null>(null);

  // A press anywhere else shuts the list: the card menu's mechanism, for the card menu's reason.
  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const listed = columns.some((column) => column.status === status)
    ? columns
    : [...columns, { status, label: columnLabel[status] }].sort(
        (one, other) => BOARD_STATUSES.indexOf(one.status) - BOARD_STATUSES.indexOf(other.status),
      );

  /** The list goes either way, and the keyboard goes back to the heading that opened it. */
  function choose(next: LogStatus) {
    setOpen(false);
    button.current?.focus();

    if (next !== status) {
      onPick(next);
    }
  }

  return (
    <div
      ref={wrapper}
      className="relative flex items-center gap-3 self-start"
      onKeyDown={(event) => {
        // Caught here, and kept from the drawer: it closes on an Escape heard at the document,
        // and an Escape meant for the list would otherwise take the whole journal with it.
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={(node) => {
          button.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        type="button"
        aria-label={`Column: ${columnLabel[status]}`}
        aria-expanded={open}
        // aria-disabled rather than disabled, because the keyboard is on this button while the
        // move it started is on its way, and a browser takes focus off a disabled control.
        aria-disabled={moving}
        onClick={() => {
          if (!moving) {
            setOpen((was) => !was);
          }
        }}
        // -mx-1 against px-1, so the hover fill has room round the word without moving it: the
        // heading starts at the same edge as every label under it, as it did as plain text.
        className={`${className} -mx-1 inline-flex items-center gap-1.5 rounded px-1 hover:bg-hover hover:text-fg`}
      >
        <span id={labelId}>{columnLabel[status]}</span>
        <Chevron />
      </button>

      {/* Beside the heading rather than under it, so nothing below moves while it is there. */}
      {moving && (
        <span role="status" className="text-xs text-muted">
          Moving…
        </span>
      )}

      {open && (
        <div
          role="group"
          aria-label="Move to"
          className="absolute top-full left-0 z-10 mt-1 flex w-44 flex-col rounded-lg border border-line bg-surface p-1 shadow-xl"
        >
          {listed.map((column) => (
            <button
              key={column.status}
              type="button"
              aria-current={column.status === status ? 'true' : undefined}
              onClick={() => choose(column.status)}
              className="flex items-center justify-between rounded px-2 py-1 text-left text-sm hover:bg-hover"
            >
              {column.label}
              {column.status === status && <Tick />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Drawn rather than a glyph, like the tick below it: a fallback font draws ▾ differently on every phone. */
function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 10 6" className="h-1.5 w-2.5 shrink-0">
      <path
        d="M1 1l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Where the pass is, in the accent: the colour the app marks a current choice with, as the
 * settings menu's dots are. On Ember that is red, which the workshop page said before the pick.
 */
function Tick() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 10" className="h-2.5 w-3 shrink-0 text-accent">
      <path
        d="M1 5.5l3.5 3.5L11 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
