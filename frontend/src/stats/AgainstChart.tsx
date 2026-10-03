import { useState } from 'react';
import type { Finish } from '../api/types';
import { formatHours } from '../lib/hours';
import { againstEstimate, timed, type TimedFinish } from './stats';

/** How many of each end a busy year shows before Show all: six quickest, six slowest. */
const EACH_END = 6;

/** Hours as a figure to read aloud, with `formatHours`' trailing noughts dropped and no unit. */
const spoken = (hours: number) => Number(hours.toFixed(2));

/**
 * Every finish with both figures as a bar either side of its estimate — left for quicker, right
 * for longer — quickest at the top. Picked from rendered comparisons on 2 October 2026 over two
 * short lists: sorted, the quickest and the slowest are simply the two ends, and the games in
 * between are there too.
 *
 * **One colour.** The side a bar is on already says which way it went, and the label at its tip
 * says it in words, so a second hue would only say it a third time.
 *
 * **The hours are in the details**, on hover and on keyboard focus alike, and every row says the
 * whole of it to a screen reader. The bars and their labels are drawn for the eye only.
 */
export function AgainstChart({ finished }: { finished: Finish[] }) {
  const [all, setAll] = useState(false);

  const games = timed(finished);
  if (games.length === 0) {
    return null;
  }

  const busy = games.length > EACH_END * 2;
  const shown = busy && !all ? [...games.slice(0, EACH_END), ...games.slice(-EACH_END)] : games;

  // Every bar is drawn to one scale: the widest difference reaches 38% of the track, which leaves
  // its half room for the label at its tip.
  const widest = Math.max(...games.map((game) => againstEstimate(game.hoursPlayed, game.lengthHours).percent), 1);

  return (
    <div className="mt-4">
      <ol aria-label="Each game against its estimate" className="space-y-1">
        {shown.map((game, index) => (
          <Row key={`${game.mediaId}-${index}`} game={game} widest={widest} />
        ))}
      </ol>

      <div
        aria-hidden="true"
        className="mt-1 grid grid-cols-[minmax(0,9rem)_1fr] gap-2 text-[0.6875rem] text-muted sm:grid-cols-[minmax(0,13rem)_1fr]"
      >
        <span />
        <span className="relative flex justify-between">
          <span>← quicker</span>
          <span className="absolute left-1/2 -translate-x-1/2">estimate</span>
          <span>longer →</span>
        </span>
      </div>

      {busy && !all && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-3 rounded border border-line px-2 py-1 text-xs font-medium hover:bg-hover"
        >
          {`Show all ${games.length}`}
        </button>
      )}
    </div>
  );
}

function Row({ game, widest }: { game: TimedFinish; widest: number }) {
  const against = againstEstimate(game.hoursPlayed, game.lengthHours);
  const width = `${(against.percent / widest) * 38}%`;
  const quicker = against.direction === 'quicker';
  const detail = `${formatHours(game.hoursPlayed)} played vs ~${formatHours(game.lengthHours)} to beat`;

  return (
    <li
      // Focusable, so the details a pointer gets on hover reach the keyboard too.
      tabIndex={0}
      className="group relative grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-accent sm:grid-cols-[minmax(0,13rem)_1fr]"
    >
      <span className="truncate text-right text-xs">{game.title}</span>

      <span className="sr-only">
        {`, ${against.words}: ${spoken(game.hoursPlayed)} hours played against about ${spoken(game.lengthHours)} hours to beat`}
      </span>

      <span aria-hidden="true" className="relative block h-5">
        <span className="absolute inset-y-0 left-1/2 border-l border-line" />
        {against.percent > 0 && (
          <span
            className={`absolute top-1/2 h-2.5 -translate-y-1/2 bg-accent ${quicker ? 'rounded-l' : 'rounded-r'}`}
            style={quicker ? { right: '50%', width } : { left: '50%', width }}
          />
        )}
        <span
          className="absolute top-1/2 -translate-y-1/2 text-[0.6875rem] whitespace-nowrap text-muted tabular-nums"
          style={
            quicker
              ? { right: `calc(50% + ${width} + 0.25rem)` }
              : { left: `calc(50% + ${width} + 0.25rem)` }
          }
        >
          {against.signed}
        </span>
      </span>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-full z-10 hidden rounded bg-fg px-2 py-1 text-xs whitespace-nowrap text-sunken shadow-card group-hover:block group-focus-visible:block"
      >
        {detail}
      </span>
    </li>
  );
}
