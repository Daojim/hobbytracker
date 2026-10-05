import type { Finish } from '../api/types';
import { ratingFill } from '../lib/rating';
import type { Voice, Voiced } from '../lib/voice';
import { ratingCounts } from './stats';
import { Nothing } from './Section';

/** What the chart counts: the ones you rated, or on a share, which addresses nobody, the ones rated. */
const OVER_THE_RATED: Voiced<(rated: number) => string> = {
  own: (rated) => `over the ${rated} you rated`,
  shared: (rated) => `over the ${rated} rated`,
};

/**
 * How many finishes you rated at each whole point, 1 to 10, as a column per point. Picked from
 * rendered comparisons on 2 October 2026 over three bands: it shows where your ratings bunch up,
 * where the bands would put an 8.0 and a 9.5 together.
 *
 * Each column wears the colour a card's rating at that point wears. The chart is drawn for the
 * eye; the same counts are a list for a screen reader, the points with none left out.
 */
export function RatingSpread({
  finished,
  year,
  voice,
}: {
  finished: Finish[];
  year: number | undefined;
  voice: Voice;
}) {
  const rated = finished.filter((finish) => finish.rating !== null).length;
  const unrated = finished.length - rated;

  if (rated === 0) {
    return <Nothing>{year === undefined ? 'Nothing rated yet.' : `Nothing rated in ${year} yet.`}</Nothing>;
  }

  const counts = ratingCounts(finished);
  const most = Math.max(...counts);

  return (
    <>
      <p className="mt-1 text-sm text-muted">
        {OVER_THE_RATED[voice](rated)}
        {unrated > 0 ? ` · ${unrated} finished without a rating` : ''}
      </p>

      <div aria-hidden="true" className="mt-4">
        <div className="flex h-24 items-end gap-1 border-b border-line">
          {counts.map((count, index) => (
            <div key={index} className="flex h-full flex-1 flex-col items-center justify-end">
              {count > 0 && (
                <>
                  <span className="text-[0.6875rem] text-muted tabular-nums">{count}</span>
                  <span
                    className={`w-full max-w-6 rounded-t ${ratingFill(index + 1)}`}
                    style={{ height: `${(count / most) * 80}%` }}
                  />
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {counts.map((_, index) => (
            <span
              key={index}
              className="flex-1 pt-1 text-center text-[0.6875rem] text-muted tabular-nums"
            >
              {index + 1}
            </span>
          ))}
        </div>
      </div>

      <ul aria-label="How many at each rating" className="sr-only">
        {counts.flatMap((count, index) =>
          count === 0 ? [] : [<li key={index}>{`${count} rated ${index + 1}`}</li>],
        )}
      </ul>
    </>
  );
}
