import { useEffect, useId, useRef, useState } from 'react';
import { hobbyDefinition, type Genre, type LengthBand } from '../hobbies';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useWheelSpin } from './wheelSpin';
import { useModalPanel } from '../lib/useModalPanel';
import { daysToFinish, describeSpan, formatPace, usePace, type Pace } from '../lib/pace';
import {
  WHEEL_SLICES,
  drawWheel,
  genresIn,
  inTheDraw,
  paintedAs,
  refuse,
  spinFor,
  suggest,
  withoutEstimate,
} from './draw';
import { Wheel } from './Wheel';
import type { HobbyDefinition } from '../hobbies';
import type { LibraryItem } from '../api/types';

/**
 * "What should I play next?": a panel over the board that picks from the Backlog column.
 *
 * Everything in it was settled at the #16 workshop on 25 October 2026, from renders of Jimmy's
 * real backlog. Two optional factors narrow the draw, how long you want to play and genres to
 * leave out, then *Spin* turns a wheel of covers onto one, or *Suggest three* lists three. With
 * nothing chosen, *Spin* is a complete random choice, which was the user's own idea.
 *
 * **It is reached for, never offered.** The board is kept for leisure: nothing here suggests a
 * title unasked, counts how long one has waited, or keeps a record of what was picked.
 *
 * **The pick is made before anything moves** (`draw.ts`), so reduced motion shows the same pick
 * with no spin.
 */

/** The reader's setting, which nothing else in the app reads yet. */
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** The id of a pick's name, which the journal hands the keyboard back to when it closes. */
export const pickTitleId = (mediaId: number) => `pick-title-${mediaId}`;

const BUTTON = 'rounded border border-line px-3 py-1 text-sm font-medium hover:bg-hover';
const SMALL = 'rounded border border-line bg-surface px-2 py-0.5 text-xs hover:bg-hover';
const HEADING = 'text-xs font-semibold tracking-wide text-muted uppercase';

type Mode = 'idle' | 'spinning' | 'landed' | 'three';

const keyOf = (items: readonly LibraryItem[]) => items.map((item) => item.mediaId).join(',');

export interface PickPanelProps {
  hobby: string;

  /** The whole Backlog column, once it has arrived. */
  items: readonly LibraryItem[] | undefined;
  error: Error | null;

  /**
   * Covered by the journal, which a pick's name opens over it. It stays mounted, so Back comes
   * back to the pick, and takes no keys and no space while it waits.
   */
  covered: boolean;

  /** Whether the board draws the column a title is under way in, which *Start playing* moves to. */
  canStart: boolean;

  onStart: (item: LibraryItem) => void;
  onOpen: (mediaId: number) => void;
  onClose: () => void;
}

export function PickPanel({
  hobby,
  items,
  error,
  covered,
  canStart,
  onStart,
  onOpen,
  onClose,
}: PickPanelProps) {
  const definition = hobbyDefinition(hobby);
  const words = definition.picker!;
  const genres = definition.genres;
  const { pace } = usePace(hobby);
  // Still under reduced motion, and since #27 when Settings says to skip the spin: the same
  // path either way, because the pick is made before anything moves.
  const skipped = useWheelSpin(hobby) === 'still';
  const still = useMediaQuery(REDUCED_MOTION, false) || skipped;

  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  useModalPanel(panel, onClose, !covered);

  const [band, setBand] = useState<LengthBand | null>(null);
  const [leftOut, setLeftOut] = useState<ReadonlySet<string>>(new Set());
  const [refused, setRefused] = useState<ReadonlySet<number>>(new Set());
  const [mode, setMode] = useState<Mode>('idle');
  const [landing, setLanding] = useState<{ index: number; turn: number } | null>(null);
  const [three, setThree] = useState<LibraryItem[]>([]);

  const all = items ?? [];
  const draw = { band, leftOut, refused };
  const pool = inTheDraw(all, genres, draw);
  const poolKey = keyOf(pool);

  // The slices, drawn afresh whenever the draw changes, which is set during render for the board's
  // reason: an effect would paint the old wheel under the new count first. *Not this one* changes
  // the draw too, and redraws only the slice it took, so it writes the key it leaves behind.
  const [wheel, setWheel] = useState<{ key: string | null; slices: LibraryItem[] }>({
    key: null,
    slices: [],
  });
  if (items !== undefined && wheel.key !== poolKey) {
    setWheel({ key: poolKey, slices: drawWheel(pool) });
    setLanding(null);
    setMode('idle');
  }

  const start = useRef<HTMLButtonElement>(null);
  const notThis = useRef<HTMLButtonElement>(null);
  const turn = landing?.turn ?? 0;

  // Landed: the keyboard goes to what you would do next, as the plan said.
  useEffect(() => {
    if (mode === 'landed') {
      (start.current ?? notThis.current)?.focus();
    }
  }, [mode, turn]);

  const busy = mode === 'spinning';

  function spin() {
    if (busy || wheel.slices.length === 0) {
      return;
    }

    setLanding({ index: spinFor(wheel.slices), turn: turn + 1 });
    setMode('spinning');
  }

  function refuseThis() {
    if (landing === null || mode !== 'landed') {
      return;
    }

    const gone = wheel.slices[landing.index]!;
    const nowRefused = new Set(refused).add(gone.mediaId);
    const rest = inTheDraw(all, genres, { band, leftOut, refused: nowRefused });
    const slices = refuse(wheel.slices, landing.index, rest);

    setRefused(nowRefused);
    setWheel({ key: keyOf(rest), slices });

    if (slices.length === 0) {
      setLanding(null);
      setMode('idle');
      return;
    }

    // Not this one is a second spin, onto what is left.
    setLanding({ index: spinFor(slices), turn: turn + 1 });
    setMode('spinning');
  }

  function suggestThree() {
    if (busy) {
      return;
    }

    setThree(suggest(pool, Math.random, mode === 'three' ? three.map((item) => item.mediaId) : []));
    setMode('three');
  }

  function clear() {
    setBand(null);
    setLeftOut(new Set());
    setRefused(new Set());
  }

  const untimed = withoutEstimate(all, genres, draw);
  const picked = mode === 'landed' && landing !== null ? wheel.slices[landing.index] : undefined;

  return (
    <>
      {/* The share dialog's scrim and frame, for its reasons: a press on the scrim closes the
          panel, and a press that starts inside and ends outside selects rather than closing. */}
      <div role="presentation" hidden={covered} onClick={onClose} className="fixed inset-0 z-40 bg-scrim" />

      {/* In the middle of the window from 768px, and 16px from the top on a phone: the #26
          workshop's picks, over 10% down, which read as the upper middle. `my-auto` rather than
          centring the column, because the panel changes height as it is used: a pick's row adds
          122px, and a column centred with `items-center` would clip the panel's top once it was
          taller than the window. Auto margins are nought when there is no room, so it scrolls as
          a whole instead. Centred, its top rises 61px when a pick lands, which the workshop saw
          recorded and chose over sitting at the top before a spin. A phone starts at the top
          because its chips wrap onto two rows: from 8% down it ended 19px past the foot of a
          390 × 844 screen after a spin. */}
      <div
        hidden={covered}
        className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4"
      >
        {/* 576 wide: the five lengths on one row, which 448 wrapped onto two, and room for the
            wheel at 400. Measured 833px tall with a pick under the wheel, so it shows whole in
            any window 865px tall or more, which is what the 448 panel needed from 10% down. */}
        <section
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="pointer-events-auto w-full max-w-xl rounded-xl border border-line bg-surface p-5 text-fg shadow-xl outline-none md:my-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-lg font-semibold">
              {words.question}
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="-mt-1 -mr-1 rounded px-2 py-0.5 text-lg text-muted hover:bg-hover hover:text-fg"
            >
              ×
            </button>
          </div>

          {error !== null && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error.message}
            </p>
          )}

          {items === undefined && error === null && <p className="mt-3 text-sm text-muted">Loading…</p>}

          {items !== undefined && (
            <>
              <div className="mt-3">
                <p aria-hidden="true" className={HEADING}>
                  How long
                </p>
                <div
                  role="radiogroup"
                  aria-label="How long do you want to play?"
                  className="mt-1.5 flex flex-wrap gap-1.5"
                >
                  <Band
                    label="Any"
                    holds={titles(all.length, definition)}
                    on={band === null}
                    onChoose={() => !busy && setBand(null)}
                  />
                  {words.bands.map((each) => (
                    <Band
                      key={each.label}
                      label={each.label}
                      range={each.range}
                      holds={titles(
                        inTheDraw(all, genres, { band: each, leftOut: new Set(), refused: new Set() }).length,
                        definition,
                      )}
                      on={band?.label === each.label}
                      onChoose={() => !busy && setBand(each)}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <p aria-hidden="true" className={HEADING}>
                  Leave out
                </p>
                <div role="group" aria-label="Leave out" className="mt-1.5 flex flex-wrap gap-1.5">
                  {genresIn(all, genres).map(({ genre, count }) => (
                    <LeaveOut
                      key={genre}
                      label={shortName(genres, genre)}
                      count={count}
                      out={leftOut.has(genre)}
                      onToggle={() => {
                        if (busy) {
                          return;
                        }
                        const next = new Set(leftOut);
                        if (!next.delete(genre)) {
                          next.add(genre);
                        }
                        setLeftOut(next);
                      }}
                    />
                  ))}
                </div>
              </div>

              <p aria-live="polite" className="mt-3 text-xs text-muted">
                {countLine(pool.length, all.length, mode, untimed, words)}
              </p>

              {/* Where the wheel landed, said once it has: the wheel itself is decoration. */}
              <p role="status" className="sr-only">
                {picked === undefined ? '' : `Landed on ${picked.title}`}
              </p>

              {pool.length === 0 ? (
                <Empty
                  backlog={all.length}
                  filtered={band !== null || leftOut.size > 0}
                  onClear={clear}
                />
              ) : mode === 'three' ? (
                <Three
                  items={three}
                  definition={definition}
                  pace={pace}
                  canStart={canStart}
                  onStart={onStart}
                  onOpen={onOpen}
                />
              ) : (
                <div className="mt-4">
                  <Wheel
                    slices={wheel.slices}
                    genres={genres}
                    landing={landing}
                    landed={mode === 'landed'}
                    still={still}
                    onLanded={() => setMode((now) => (now === 'spinning' ? 'landed' : now))}
                  />
                </div>
              )}

              {picked !== undefined && (
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-line-soft bg-well p-2.5">
                  <Cover item={picked} className="aspect-[5/7] w-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Name item={picked} onOpen={onOpen} />
                    <p className="text-xs text-muted">{factsOf(picked, definition)}</p>
                    {atYourPace(picked, pace) !== null && (
                      <p className="text-xs text-muted">{atYourPace(picked, pace)}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {canStart && (
                        <button
                          ref={start}
                          type="button"
                          onClick={() => onStart(picked)}
                          className={`${SMALL} font-medium`}
                        >
                          <span aria-hidden="true">▶ </span>
                          {words.start}
                        </button>
                      )}
                      <button ref={notThis} type="button" onClick={refuseThis} className={`${SMALL} text-muted hover:text-fg`}>
                        Not this one
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {pool.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {(mode === 'idle' || mode === 'spinning') && (
                    // Held while it turns by aria-disabled rather than disabled, which would take the
                    // keyboard off it: the spreadsheet row's measured reason.
                    <button
                      type="button"
                      onClick={spin}
                      aria-disabled={busy || undefined}
                      className={`${BUTTON} min-w-24 aria-disabled:cursor-wait aria-disabled:text-muted`}
                    >
                      {busy ? 'Spinning…' : 'Spin'}
                    </button>
                  )}
                  <button type="button" onClick={suggestThree} className={BUTTON}>
                    {mode === 'three' ? 'Three more' : 'Suggest three'}
                  </button>
                  {mode === 'three' && (
                    <button type="button" onClick={spin} className={BUTTON}>
                      Spin
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}

/** What the draw holds, under the factors: `3 of 6 in the draw · 1 with no estimate, only under Any`. */
function countLine(
  inDraw: number,
  backlog: number,
  mode: Mode,
  untimed: number,
  words: NonNullable<HobbyDefinition['picker']>,
): string {
  const counted = inDraw === backlog ? `${inDraw} in the draw` : `${inDraw} of ${backlog} in the draw`;
  const wheel = inDraw > WHEEL_SLICES && mode !== 'three' ? `, ${WHEEL_SLICES} of them on the wheel at a time` : '';
  const leftOut = untimed > 0 ? ` · ${words.withoutLength(untimed)}, only under Any` : '';

  return `${counted}${wheel}${leftOut}`;
}

/** How many titles a length holds, in the board's own word for them: `1 game`, `5 games`. */
function titles(count: number, definition: HobbyDefinition): string {
  return `${count} ${definition.titleNoun(count)}`;
}

/** The chip's name for a genre: its short one where the source's runs long. */
function shortName(genres: readonly Genre[], genre: string): string {
  const known = genres.find((each) => each.name.toLowerCase() === genre.toLowerCase());
  return known?.short ?? genre;
}

/** A pick's length and genre, as its card says them: `~28.37 h · Shooter`. */
function factsOf(item: LibraryItem, definition: HobbyDefinition): string {
  const genre = paintedAs(item, definition.genres);
  const length =
    item.lengthHours === null ? definition.picker!.noLength : definition.formatLength(item.lengthHours);

  return genre === null ? length : `${length} · ${shortName(definition.genres, genre)}`;
}

/**
 * How long it would take at the pace "How long will it take me?" was told, in Backlog's own
 * words: `15 days at 2 h a day`. Nothing without a pace, or without a length to divide.
 */
function atYourPace(item: LibraryItem, pace: Pace | null): string | null {
  if (pace === null || item.lengthHours === null) {
    return null;
  }

  return `${describeSpan(daysToFinish(item.lengthHours, pace))} at ${formatPace(pace)}`;
}

/**
 * A length to play for: the band, how many titles it holds, then its hours, each a line of its
 * own. The user's ask at #26, where the count had sat beside the label as *Any 5*. The count keeps
 * the grey it wore there, the workshop's pick over the text's own colour, and each chip is as wide
 * as its words, over five of one width, which broke *A few weeks* over two lines at 512.
 */
function Band({
  label,
  range,
  holds,
  on,
  onChoose,
}: {
  label: string;
  range?: string;
  holds: string;
  on: boolean;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onChoose}
      className={`flex flex-col items-start rounded-lg border px-2.5 py-1 text-left text-xs ${
        on ? 'border-fg bg-fg text-surface' : 'border-line hover:bg-hover'
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className={on ? '' : 'text-muted'}>{holds}</span>
      {range !== undefined && <span className={`text-[11px] ${on ? '' : 'text-muted'}`}>{range}</span>}
    </button>
  );
}

/**
 * A genre to leave out. Left out, it is struck through on the sunken ground: the first render drew
 * it filled, as a chosen length is, and chosen and left out looked alike.
 */
function LeaveOut({
  label,
  count,
  out,
  onToggle,
}: {
  label: string;
  count: number;
  out: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={out}
      onClick={onToggle}
      className={`rounded-full border border-line px-2.5 py-1 text-xs ${
        out ? 'bg-sunken text-muted line-through' : 'hover:bg-hover'
      }`}
    >
      {label} <span className="text-muted">{count}</span>
    </button>
  );
}

function Empty({ backlog, filtered, onClear }: { backlog: number; filtered: boolean; onClear: () => void }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
      {backlog === 0 ? (
        'Nothing in your backlog yet.'
      ) : (
        <>
          Nothing in your backlog is left in the draw.{' '}
          <button type="button" onClick={onClear} className="font-medium text-accent hover:underline">
            {filtered ? 'Clear the filters' : 'Put them back'}
          </button>
        </>
      )}
    </div>
  );
}

function Three({
  items,
  definition,
  pace,
  canStart,
  onStart,
  onOpen,
}: {
  items: readonly LibraryItem[];
  definition: HobbyDefinition;
  pace: Pace | null;
  canStart: boolean;
  onStart: (item: LibraryItem) => void;
  onOpen: (mediaId: number) => void;
}) {
  return (
    <ul aria-label="Three suggestions" className="mt-4 flex flex-col gap-2">
      {items.map((item) => {
        const at = atYourPace(item, pace);
        return (
          <li key={item.mediaId} className="flex items-center gap-3 rounded-lg border border-line-soft bg-well p-2">
            <Cover item={item} className="aspect-[5/7] w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <Name item={item} onOpen={onOpen} />
              <p className="text-xs text-muted">
                {factsOf(item, definition)}
                {at !== null && ` · ${at}`}
              </p>
            </div>
            {canStart && (
              <button type="button" onClick={() => onStart(item)} className={`${SMALL} shrink-0 font-medium`}>
                <span aria-hidden="true">▶ </span>
                {definition.picker!.start}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** A title's name, which opens its journal as a name does everywhere else, in the accent. */
function Name({ item, onOpen }: { item: LibraryItem; onOpen: (mediaId: number) => void }) {
  return (
    <button
      type="button"
      id={pickTitleId(item.mediaId)}
      onClick={() => onOpen(item.mediaId)}
      className="text-left text-sm font-semibold text-accent hover:underline"
    >
      {item.title}
    </button>
  );
}

/**
 * The card's cover, or its first letter where there is none, as a card draws it. `data-cover`
 * is the card's hook for the card's reason, an image with no words has no role: `pick.spec.ts`
 * measures a full wheel's covers against this one.
 */
function Cover({ item, className }: { item: LibraryItem; className: string }) {
  return item.coverUrl === null ? (
    <span
      aria-hidden="true"
      data-cover=""
      className={`flex items-center justify-center rounded bg-sunken font-semibold text-muted ${className}`}
    >
      {item.title.charAt(0)}
    </span>
  ) : (
    <img src={item.coverUrl} alt="" data-cover="" className={`rounded object-cover ${className}`} />
  );
}
