import { useEffect, useId, useRef, useState } from 'react';
import { genreStripe, type Genre } from '../hobbies';
import { paintedAs } from './draw';
import type { LibraryItem } from '../api/types';

/**
 * The wheel: a slice per title, each carrying its cover, turned to land where it is told.
 *
 * Picked at the #16 workshop from three forms rendered and recorded on a phone, over a slice
 * per title in its genre's colour, which on a backlog of RPGs was five green slices and one blue,
 * and over a reel of covers, which is not a wheel. It never chooses anything: the panel picks the
 * slice first and hands it here, so reduced motion can show the same pick with no turn at all.
 */

/** How long a spin takes. Long enough to watch, short enough not to wait on. */
export const SPIN_MS = 4000;

/**
 * easeOutCubic. The first curve rendered had a tail so flat that the wheel looked stopped about a
 * second before `transitionend`, and the result arrived late; this one stops when it looks stopped.
 */
const SPIN = `transform ${SPIN_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`;

/** Whole turns before it slows onto the slice: enough to read as a spin rather than a nudge. */
const TURNS = 5;

/**
 * The card's genre stripe, drawn as an arc on the rim: whole class names, because Tailwind reads
 * the source and an interpolated `stroke-genre-${x}` generates nothing — an arc with no colour,
 * and no error. Exported for `Wheel.test.ts`, which holds it to the games list: a genre given a
 * colour there and not a line here spins with no arc.
 */
export const RIM: Record<string, string> = {
  'bg-genre-visual-novel': 'stroke-genre-visual-novel',
  'bg-genre-music': 'stroke-genre-music',
  'bg-genre-card-board': 'stroke-genre-card-board',
  'bg-genre-rpg': 'stroke-genre-rpg',
  'bg-genre-shooter': 'stroke-genre-shooter',
  'bg-genre-platform': 'stroke-genre-platform',
  'bg-genre-fighting': 'stroke-genre-fighting',
  'bg-genre-brawler': 'stroke-genre-brawler',
  'bg-genre-racing': 'stroke-genre-racing',
  'bg-genre-sport': 'stroke-genre-sport',
  'bg-genre-tactical': 'stroke-genre-tactical',
  'bg-genre-turn-based': 'stroke-genre-turn-based',
  'bg-genre-real-time': 'stroke-genre-real-time',
  'bg-genre-strategy': 'stroke-genre-strategy',
  'bg-genre-simulator': 'stroke-genre-simulator',
  'bg-genre-puzzle': 'stroke-genre-puzzle',
  'bg-genre-quiz': 'stroke-genre-quiz',
  'bg-genre-adventure': 'stroke-genre-adventure',
  'bg-genre-arcade': 'stroke-genre-arcade',
};

/** The wheel's radius, in the units of a 320-square drawing centred on nought. */
const R = 150;

/** How far out a cover sits, as a share of the radius. */
const COVER_AT = 0.6;

/** A point at a clock angle: degrees clockwise from twelve o'clock, where the pointer is. */
function at(radius: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [radius * Math.sin(radians), -radius * Math.cos(radians)];
}

/** One slice, from the centre out to the rim between two clock angles. */
function slice(from: number, to: number): string {
  const [x1, y1] = at(R, from);
  const [x2, y2] = at(R, to);
  return `M 0 0 L ${x1} ${y1} A ${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
}

/** An arc along a circle between two clock angles. */
function arc(radius: number, from: number, to: number): string {
  const [x1, y1] = at(radius, from);
  const [x2, y2] = at(radius, to);
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

/**
 * The turn that brings a slice's middle to the pointer, from wherever the wheel is now: always
 * forwards, `TURNS` whole turns and then the rest of the way, and a little to one side of the
 * middle so it does not stop dead centre every time. Which side is the spin's count, not a random
 * number: the slice was chosen already, and this is only where on it the pointer comes to rest.
 */
function turnTo(from: number, index: number, step: number, turn: number, still: boolean): number {
  const middle = index * step;
  const start = from + (still ? 0 : TURNS * 360);
  const offset = (((middle + start) % 360) + 360) % 360;
  const aside = (((turn * 37) % 60) / 100 - 0.3) * step;

  return start + ((360 - offset) % 360) + aside;
}

export interface WheelProps {
  slices: readonly LibraryItem[];
  genres: readonly Genre[];

  /**
   * Where to land, and which spin this is: each new `turn` is a spin. Null before the first, and
   * again whenever the draw changes under it.
   */
  landing: { index: number; turn: number } | null;

  /** Whether it has come to rest on `landing`, which outlines the slice. */
  landed: boolean;

  /** Reduced motion: drawn where it lands, with no turn to watch. */
  still: boolean;

  /** Called once, when a spin has come to rest. */
  onLanded: () => void;
}

export function Wheel({ slices, genres, landing, landed, still, onLanded }: WheelProps) {
  const [rotation, setRotation] = useState(0);
  const [turning, setTurning] = useState(false);
  const ids = useId().replace(/[^\w-]/g, '');

  // The latest callback, so the effect below starts a spin on a new turn and on nothing else.
  const landedRef = useRef(onLanded);
  useEffect(() => {
    landedRef.current = onLanded;
  });

  const count = slices.length;
  const step = 360 / Math.max(count, 1);
  const turn = landing?.turn;
  const index = landing?.index;

  useEffect(() => {
    if (turn === undefined || index === undefined) {
      return;
    }

    setRotation((from) => turnTo(from, index, step, turn, still));

    if (still) {
      landedRef.current();
      return;
    }

    setTurning(true);

    // `transitionend` is what lands it. This is in case it never comes — a transition the browser
    // skipped — so the panel cannot be left spinning for ever.
    const fallback = window.setTimeout(() => {
      setTurning(false);
      landedRef.current();
    }, SPIN_MS + 250);

    return () => window.clearTimeout(fallback);
    // A spin is a new turn. The slices and the step are read as they are when it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn]);

  const coverWidth = Math.min(56, ((2 * Math.PI * R * COVER_AT) / Math.max(count, 1)) * 0.62);
  const coverHeight = coverWidth * 1.4;
  const coverBox = {
    x: -coverWidth / 2,
    y: -R * COVER_AT - coverHeight / 2,
    width: coverWidth,
    height: coverHeight,
  };

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <svg viewBox="-160 -160 320 320" className="h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <clipPath id={`${ids}-cover`}>
            <rect {...coverBox} rx="4" />
          </clipPath>
        </defs>

        <g
          data-wheel=""
          style={{ transform: `rotate(${rotation}deg)`, transition: turning ? SPIN : 'none' }}
          onTransitionEnd={() => {
            if (turning) {
              setTurning(false);
              landedRef.current();
            }
          }}
        >
          {slices.map((item, place) => (
            // Two tones in turn, and a hairline between: with an odd number of slices the first
            // and the last share a tone, and the line is what keeps them two.
            <path
              key={item.mediaId}
              d={
                count === 1
                  ? `M 0 ${-R} A ${R} ${R} 0 1 1 0 ${R} A ${R} ${R} 0 1 1 0 ${-R} Z`
                  : slice(place * step - step / 2, place * step + step / 2)
              }
              className={`${place % 2 === 0 ? 'fill-well' : 'fill-sunken'} stroke-line-soft`}
              strokeWidth={count === 1 ? 0 : 1}
            />
          ))}

          {slices.map((item, place) => {
            const stripe = genreStripe(genres, paintedAs(item, genres));
            return (
              <g key={item.mediaId} transform={`rotate(${place * step})`}>
                {stripe !== null && RIM[stripe] !== undefined && (
                  <path
                    d={arc(R - 4, -step / 2 + 2, step / 2 - 2)}
                    className={RIM[stripe]}
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="none"
                  />
                )}
                {item.coverUrl === null ? (
                  <g>
                    <rect {...coverBox} rx="4" className="fill-surface stroke-line" />
                    <text
                      x="0"
                      y={-R * COVER_AT + 6}
                      textAnchor="middle"
                      className="fill-muted text-lg font-semibold"
                    >
                      {item.title.charAt(0)}
                    </text>
                  </g>
                ) : (
                  <image
                    href={item.coverUrl}
                    {...coverBox}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${ids}-cover)`}
                  />
                )}
              </g>
            );
          })}

          {landed && landing !== null && count > 1 && (
            <path
              d={slice(landing.index * step - step / 2, landing.index * step + step / 2)}
              className="fill-none stroke-accent"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          )}
        </g>

        <circle r={R} className="fill-none stroke-line" strokeWidth="1" />
        <circle r="18" className="fill-surface stroke-line" strokeWidth="1" />

        {/* The pointer, fixed at twelve o'clock, where the slice it lands on comes to rest. */}
        <path
          d="M -11 -163 L 11 -163 L 0 -141 Z"
          className="fill-fg stroke-surface"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
