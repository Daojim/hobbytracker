import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { parseHours } from '../journal/fields';
import { parseYear, thisYearHere, yearRule } from '../lib/passDate';
import { keepTabIn } from '../lib/useModalPanel';
import { lastYearAdded, rememberYearAdded } from './lastYear';
import type { AddedFinish } from '../api/library';
import type { Hobby } from '../shell/hobbies';

/** How far the panel keeps from the window's edges. */
const MARGIN = 8;

/** How far it keeps from the control it opens over. */
const GAP = 6;

/**
 * Where the ✓'s question goes, from the control's box, its own size and the window's width.
 *
 * **Above the control, its right edge on the ✓'s**, over the tile and its neighbour: round two's
 * pick at the #24 workshop. **Held 8px inside the window** either side, which over the strip's
 * first tile is what keeps it on screen. **Below the control when above would leave it less than
 * 8px from the window's top**, the user's pick at the build: a tile scrolled up until its control
 * is near the top has its cover above the window, and the panel with it otherwise.
 */
export function placePanel(
  control: { top: number; right: number; bottom: number },
  panel: { width: number; height: number },
  windowWidth: number,
): { top: number; left: number } {
  const left = Math.max(
    MARGIN,
    Math.min(control.right - panel.width, windowWidth - MARGIN - panel.width),
  );
  const above = control.top - GAP - panel.height;

  return { top: above >= MARGIN ? above : control.bottom + GAP, left };
}

/** The panel's buttons, and its boxes: the tile's add in small, as round two drew them. */
const SMALL = 'h-7 rounded border border-line bg-surface px-2 text-xs font-medium hover:bg-hover';
const BOX = 'h-7 min-w-0 rounded border border-line bg-surface px-2 text-sm tabular-nums';

/** Which of the three the person answered: a year, today, or *I don't remember*. */
type Answer = 'year' | 'today' | 'undated';

export interface WhenFinishedProps {
  hobby: Hobby;
  /** The hobby's question: *When did you finish it?*, and on a film *When did you watch it?* */
  question: string;
  /** Whether a pass of this hobby keeps hours, and so whether there is a box for them. */
  hours: boolean;
  /** The add control the panel opens over, which it is placed from. */
  control: RefObject<HTMLElement | null>;
  /** The ✓, where a press is the ✓'s own to answer rather than a press elsewhere. */
  opener: RefObject<HTMLElement | null>;
  onAnswer: (finish: AddedFinish) => void;
  /**
   * Closes the panel. True from Escape and the ×, which hand the keyboard back to the ✓; false
   * from a press elsewhere, which has put the keyboard wherever it pressed.
   */
  onClose: (giveBack: boolean) => void;
}

/**
 * What the ✓ on a tile asks before a title goes straight to the finished column (#24): when it was
 * finished, so a game finished in 2019 is not stamped with this evening, nor with a day nobody
 * named.
 *
 * Three answers, round one's pick at the #24 workshop: **a year**, kept as the year it is; **today**,
 * the drag's own stamp and what the ✓ did before; and ***I don't remember***, a finish with no date,
 * which belongs to no year. **Hours played** beside the year where a pass keeps hours, optional and
 * sent with whichever answer is given. In round three's words: *In*, *Add*, *or*, *Today* and *I
 * don't remember*.
 *
 * **In a portal at the end of the page, fixed, and placed from the control's box**: the search
 * strip scrolls sideways, so it cuts off whatever hangs over its edge, which round two's renders
 * found. **Placed again whenever anything scrolls or the window changes size**, so it follows its
 * ✓, the user's pick at the build: a phone scrolls the page itself to lift the focused year box
 * above its keyboard. Drawn hidden first, because it cannot be placed before it has a size.
 *
 * **The keyboard goes to the year box once the panel is placed**, never before: a panel hidden
 * while it measures cannot be focused, which round two's first shots showed. The year is selected,
 * so Enter adds the next game in the year last added and typing replaces it. **Tab goes round
 * inside it**, the user's pick at the build over closing when the keyboard leaves, because past
 * either end Tab would walk the page from its bottom. **Escape and the × close it and give the
 * keyboard back to the ✓, and a press anywhere else closes it**, as the card menu's does.
 *
 * Not `aria-modal`: the page behind it takes a press, which closes it, and nothing behind it is
 * inert.
 */
export function WhenFinished({
  hobby,
  question,
  hours,
  control,
  opener,
  onAnswer,
  onClose,
}: WhenFinishedProps) {
  const panel = useRef<HTMLDivElement>(null);
  const yearBox = useRef<HTMLInputElement>(null);
  const questionId = useId();

  const [year, setYear] = useState(() => {
    const last = lastYearAdded(hobby);
    return last === null ? '' : String(last);
  });
  const [played, setPlayed] = useState('');
  const [refused, setRefused] = useState<{ year?: string; hours?: string }>({});
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const box = control.current?.getBoundingClientRect();
    const own = panel.current?.getBoundingClientRect();
    if (box === undefined || own === undefined) {
      return;
    }

    const next = placePanel(box, own, document.documentElement.clientWidth);
    // The same place hands back the same state, which is what lets the effect below run after
    // every render without rendering again.
    setAt((was) => (was !== null && was.top === next.top && was.left === next.left ? was : next));
  }, [control]);

  // After every render, since its height changes with what it says: a refusal is a line more,
  // and above the control it has to grow upwards to keep its 6px.
  useLayoutEffect(() => {
    place();
  });

  // A capture listener on the window hears every scroll, the strip's sideways one included,
  // because a scroll does not bubble and does pass the window on its way down.
  useEffect(() => {
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [place]);

  const placed = at !== null;
  useLayoutEffect(() => {
    if (placed) {
      yearBox.current?.focus();
      yearBox.current?.select();
    }
  }, [placed]);

  // A press anywhere else shuts it, the card menu's mechanism: `pointerdown` rather than
  // `click`, attached only while open. A press on the ✓ is the ✓'s, which shuts it as a toggle.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !opener.current?.contains(target)) {
        onClose(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [opener, onClose]);

  function answer(kind: Answer) {
    const thisYear = thisYearHere();

    // Only *Add* reads the year box, and an empty one is refused there, since *Add* names a year.
    // *Today* and *I don't remember* name none, so whatever the box holds is not theirs to refuse.
    const readYear = kind === 'year' ? parseYear(year, thisYear) : null;
    const yearRefusal =
      readYear === null
        ? undefined
        : (readYear.error ?? (readYear.value === null ? yearRule(thisYear) : undefined));
    const readHours = hours ? parseHours(played) : { value: null };

    if (yearRefusal !== undefined || readHours.error !== undefined) {
      setRefused({ year: yearRefusal, hours: readHours.error });
      return;
    }

    const finish: AddedFinish = {};
    if (readYear?.value != null) {
      finish.completedYear = readYear.value;
      rememberYearAdded(hobby, readYear.value);
    }
    if (kind === 'undated') {
      finish.undated = true;
    }
    if (readHours.value != null) {
      finish.hoursPlayed = readHours.value;
    }

    onAnswer(finish);
  }

  // Enter in either box is *Add*, so a remembered year is one key. Not while an input method is
  // composing, whose Enter commits what it was writing — `NoteList`'s rule.
  function onEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      answer('year');
    }
  }

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-labelledby={questionId}
      tabIndex={-1}
      // Kept here, never let past: the panel is the strip's in React's tree though not in the
      // page's, and the strip clears its search at an Escape caught on its own container.
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose(true);
          return;
        }

        if (panel.current !== null) {
          keepTabIn(panel.current, event);
        }
      }}
      style={
        at === null
          ? { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }
          : { position: 'fixed', ...at }
      }
      className="z-30 w-72 rounded-lg border border-line bg-surface p-3 text-left text-fg shadow-xl outline-none"
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <p id={questionId} className="text-sm font-medium">
            {question}
          </p>
          <button
            type="button"
            onClick={() => onClose(true)}
            aria-label="Cancel"
            className="-mt-0.5 -mr-0.5 flex size-5 shrink-0 items-center justify-center rounded text-muted hover:bg-hover hover:text-fg"
          >
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
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
          <label className="flex items-center gap-1.5">
            In{' '}
            <input
              ref={yearBox}
              aria-label="Year finished"
              inputMode="numeric"
              maxLength={4}
              placeholder="Year"
              value={year}
              onChange={(event) => {
                setYear(event.target.value);
                setRefused((was) => ({ ...was, year: undefined }));
              }}
              onKeyDown={onEnter}
              className={`${BOX} w-[4.5rem]`}
            />
          </label>
          {hours && (
            <label className="flex items-center gap-1.5">
              Hours played{' '}
              <input
                aria-label="Hours played"
                inputMode="decimal"
                placeholder="optional"
                value={played}
                onChange={(event) => {
                  setPlayed(event.target.value);
                  setRefused((was) => ({ ...was, hours: undefined }));
                }}
                onKeyDown={onEnter}
                className={`${BOX} w-[5.5rem]`}
              />
            </label>
          )}
        </div>

        {/* Under the boxes, in the order rule's red, the year's first: the user's pick at the
            #24 build for the year, and the journal's own rule for the hours. */}
        {(refused.year !== undefined || refused.hours !== undefined) && (
          <div className="flex flex-col gap-1">
            {refused.year !== undefined && (
              <p role="alert" className="text-xs text-danger">
                {refused.year}
              </p>
            )}
            {refused.hours !== undefined && (
              <p role="alert" className="text-xs text-danger">
                {refused.hours}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => answer('year')} className={`${SMALL} px-3 text-accent`}>
            Add
          </button>
          <span className="px-0.5 text-xs text-muted">or</span>
          <button type="button" onClick={() => answer('today')} className={SMALL}>
            Today
          </button>
          <button type="button" onClick={() => answer('undated')} className={SMALL}>
            {"I don't remember"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
