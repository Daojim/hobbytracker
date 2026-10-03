import { useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useDndContext, useDroppable, type UniqueIdentifier } from '@dnd-kit/core';
import { columnQuery } from './Column';
import { yearFor } from './keys';
import type { BoardColumn } from '../hobbies';
import type { LibrarySort, LogStatus } from '../api/types';

/** The id a segment answers to as a drop target, beside a column's `column:` ids. */
export const segmentId = (status: LogStatus) => `segment:${status}`;

export const isSegment = (id: UniqueIdentifier) => String(id).startsWith('segment:');

/**
 * Whole class names for the segments' tracks, one per column drawn, for `grid.ts`'s reason: an
 * interpolated `grid-cols-${n}` generates nothing and the segments would stack.
 */
const SEGMENT_TRACKS: Readonly<Record<number, string>> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

export interface ColumnSwitcherProps {
  hobby: string;
  /** The columns the board is drawing, which are the ones there are to switch between. */
  columns: readonly BoardColumn[];
  sorts: Record<LogStatus, LibrarySort>;
  year: number | undefined;
  shown: LogStatus;
  onShow: (status: LogStatus) => void;
  /** A card is being carried, so the switcher is a drop target and has to be seen as one. */
  lifted: boolean;
}

/**
 * Which column a phone is showing, chosen from a row of segments that count every column.
 *
 * Picked on 1 October 2026 from four layouts rendered at 390px. Tabs like the hobby nav's could
 * not fit five columns and their counts; this fits them with room to spare, and looks like
 * something other than a second row of hobbies.
 *
 * **Pinned to the top of the screen**, so wherever you are in a long column every other column
 * is one tap away — and one drag away, because each segment is a drop target. Hold a card, carry
 * it up onto *Completed*, let go: the same move the card's menu makes, landing at the end of the
 * column. `collisions.ts` keeps that to the segment the finger is on, and `useBoard` stops the
 * page scrolling while it is, or the page would carry the switcher out from under the finger.
 *
 * **A radio group**, for the settings menu's reason: a closed set where exactly one is current,
 * which a screen reader can then say. Each name and its count are one accessible name, "Backlog
 * 4", which is what the column's own heading says too.
 *
 * Its counts are the columns' own answers, from `columnQuery`. The column on screen shares its
 * fetch with its segment, and every other column is fetched once, as it was side by side. So
 * choosing a column shows what is already known about it, and a move counts at once in the
 * column it went to, because a move writes those same cached answers.
 */
export function ColumnSwitcher({
  hobby,
  columns,
  sorts,
  year,
  shown,
  onShow,
  lifted,
}: ColumnSwitcherProps) {
  const totals = useQueries({
    queries: columns.map(({ status }) =>
      columnQuery(hobby, status, sorts[status], yearFor(status, year)),
    ),
  });

  // Where the switcher sits when nothing has scrolled it. Sticky, it reports the top of the
  // screen instead, so the place it would be is read from a mark just before it.
  const resting = useRef<HTMLDivElement>(null);

  const choose = (status: LogStatus) => {
    onShow(status);

    // From deep in a long column, the next one would open at the same depth: scrolled past its
    // own beginning, with its first titles above the screen and nothing saying they are there.
    // So a choice made while the switcher is pinned starts the new column right under it.
    // Instant rather than smooth, as switching a tab is.
    const top = (resting.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
    if (window.scrollY > top) {
      window.scrollTo({ top, behavior: 'instant' });
    }
  };

  return (
    <>
      <div ref={resting} aria-hidden="true" />

      {/* Edge to edge on a phone, so a card scrolling up under it is hidden rather than seen
          through the gutter. z-15 puts it over a card's open menu (z-10) and under the drawer
          (z-20). While a card is being carried it goes over the card too — the overlay is
          z-40, in BoardPage — or the segment under the finger is behind the very card being
          dropped on it and nobody can see it light. */}
      <div
        className={`sticky top-0 -mx-4 mb-3 bg-sunken px-4 py-1 ${lifted ? 'z-50' : 'z-15'}`}
      >
        <div
          role="radiogroup"
          aria-label="Columns"
          className={`grid gap-1 rounded-xl border border-line-soft bg-well p-1 ${
            SEGMENT_TRACKS[columns.length] ?? SEGMENT_TRACKS[5]
          }`}
        >
          {columns.map(({ status, label }, index) => (
            <Segment
              key={status}
              status={status}
              label={label}
              total={totals[index]?.data?.total ?? 0}
              current={status === shown}
              onChoose={() => choose(status)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

interface SegmentProps {
  status: LogStatus;
  label: string;
  total: number;
  current: boolean;
  onChoose: () => void;
}

function Segment({ status, label, total, current, onChoose }: SegmentProps) {
  const { setNodeRef } = useDroppable({ id: segmentId(status), data: { status } });

  // Lit while a card from another column is held over it, in the colour a column takes for the
  // same news: let go here and it moves there. Never for the card's own column, where letting
  // go moves nothing — and a phone only ever shows one column, so that is the current segment.
  const { active, over } = useDndContext();
  const from = (active?.data.current as { status?: LogStatus } | undefined)?.status;
  const landing = over?.id === segmentId(status) && from !== status;

  return (
    <button
      ref={setNodeRef}
      type="button"
      role="radio"
      aria-checked={current}
      onClick={onChoose}
      className={`flex flex-col items-center rounded-lg px-0.5 py-1.5 ${
        landing
          ? 'bg-drop text-fg'
          : current
            ? 'bg-surface text-fg shadow-card'
            : 'text-muted'
      }`}
    >
      {/* A space between the two, which the name "Backlog 4" was once thought to need. Measured on
          2 October 2026, it does not: the two are flex items, block-level, and an accessible name
          keeps those apart whatever the markup says. Harmless, so it stays — see *On a phone* in
          docs/design.md. */}
      <span className="text-[0.6875rem] leading-tight">{label}</span>{' '}
      <span className="text-sm leading-tight font-semibold">{total}</span>
    </button>
  );
}
