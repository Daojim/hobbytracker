import { useId, useState } from 'react';
import type { Finish } from '../api/types';
import { ratingFill, ratingTone } from '../lib/rating';
import { formatJournalDate } from '../lib/time';
import type { Voice, Voiced } from '../lib/voice';
import { ratingLists } from './stats';
import { Nothing } from './Section';

/** What the chart counts: the ones you rated, or on a share, which addresses nobody, the ones rated. */
const OVER_THE_RATED: Voiced<(rated: number) => string> = {
  own: (rated) => `over the ${rated} you rated`,
  shared: (rated) => `over the ${rated} rated`,
};

/** What the chart is called to a screen reader, as a group of columns or a list of counts. */
const CHART_NAME = 'How many at each rating';

/** A point's count in words: a column's name, and on a share an item of the list. */
const ratedAt = (count: number, point: number) => `${count} rated ${point}`;

/**
 * How many finishes you rated at each whole point, 1 to 10, as a column per point. Picked from
 * rendered comparisons on 2 October 2026 over three bands: it shows where your ratings bunch up,
 * where the bands would put an 8.0 and a 9.5 together. Each column wears the colour a card's
 * rating at that point wears.
 *
 * **On your page, a rated column opens the finishes rated there**, since #21. Every choice was
 * picked from renders of your own finishes on 7 November 2026:
 * - the whole column is one button, named as the screen reader's list of counts named it,
 *   *22 rated 8*, and replacing that list;
 * - its count is in the accent, the colour of words that open something since #12 and #20, and
 *   the open column is marked as the hobby nav marks the one chosen, its number in the accent
 *   with a rule under it;
 * - the list is part of the panel, two across from `sm`, so it covers nothing and needs nothing
 *   pressed elsewhere to go away. Shutting it on such a press, as #20's list over the cards shuts,
 *   would move whatever is under the pointer;
 * - a row is the cover, the name and the exact rating, since a point holds a 9.0 and a 9.5
 *   alike, and opens nothing: the journal is the board's.
 *
 * **On a share it is the picture it always was.** A share names no rating title by title, so the
 * columns press nothing and the counts are said to a screen reader as a list. The voice is what
 * tells them apart: it is the owner's page exactly when its words are said to the owner.
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
  const [open, setOpen] = useState<number | null>(null);
  const id = useId();

  const rated = finished.filter((finish) => finish.rating !== null).length;
  const unrated = finished.length - rated;

  if (rated === 0) {
    return <Nothing>{year === undefined ? 'Nothing rated yet.' : `Nothing rated in ${year} yet.`}</Nothing>;
  }

  // One filing for the columns and the lists they open, so a count is its list's length.
  const lists = ratingLists(finished);
  const counts = lists.map((list) => list.length);
  const most = Math.max(...counts);

  const opens = voice === 'own';
  const showing = opens && open !== null && counts[open - 1]! > 0 ? open : null;
  const columnId = (point: number) => `${id}-rated-${point}`;
  const listId = `${id}-list`;

  return (
    <div
      // Caught here rather than at the document, as #20's list and the card menu catch theirs.
      onKeyDown={(event) => {
        if (event.key === 'Escape' && showing !== null) {
          setOpen(null);
        }
      }}
    >
      <p className="mt-1 text-sm text-muted">
        {OVER_THE_RATED[voice](rated)}
        {unrated > 0 ? ` · ${unrated} finished without a rating` : ''}
      </p>

      <div
        role={opens ? 'group' : undefined}
        aria-label={opens ? CHART_NAME : undefined}
        aria-hidden={opens ? undefined : true}
        // The columns meet, rather than sitting 4px apart, so a column's button has no gap in it;
        // the bars, at most 24px wide and centred, move by under 2px for it.
        className="mt-4 flex"
      >
        {counts.map((count, index) => {
          const point = index + 1;
          const isOpen = showing === point;

          const face = (
            <>
              <span className="flex h-24 w-full flex-col items-center justify-end border-b border-line px-0.5">
                {count > 0 && (
                  <>
                    <span
                      className={`text-[0.6875rem] tabular-nums ${
                        opens ? 'text-accent group-hover:underline' : 'text-muted'
                      }`}
                    >
                      {count}
                    </span>
                    <span
                      className={`w-full max-w-6 rounded-t ${ratingFill(point)}`}
                      style={{ height: `${(count / most) * 80}%` }}
                    />
                  </>
                )}
              </span>
              <span
                className={`relative block w-full pt-1 text-center text-[0.6875rem] tabular-nums ${
                  isOpen ? 'font-semibold text-accent' : 'text-muted'
                }`}
              >
                {point}
                {/* Under the number rather than on the baseline, where on a phone a rule is the
                    bar's own width and reads as the bar's foot. */}
                {isOpen && (
                  <span aria-hidden="true" className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full bg-accent" />
                )}
              </span>
            </>
          );

          return opens && count > 0 ? (
            <button
              key={point}
              id={columnId(point)}
              type="button"
              aria-label={ratedAt(count, point)}
              aria-expanded={isOpen}
              aria-controls={isOpen ? listId : undefined}
              onClick={() => setOpen(isOpen ? null : point)}
              className="group flex flex-1 flex-col rounded"
            >
              {face}
            </button>
          ) : (
            <div key={point} aria-hidden="true" className="flex flex-1 flex-col">
              {face}
            </div>
          );
        })}
      </div>

      {opens ? (
        showing !== null && (
          <TitleList id={listId} labelledBy={columnId(showing)} finishes={lists[showing - 1]!} />
        )
      ) : (
        <ul aria-label={CHART_NAME} className="sr-only">
          {counts.flatMap((count, index) =>
            count === 0 ? [] : [<li key={index}>{ratedAt(count, index + 1)}</li>],
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * The finishes rated at one point: each a cover, a name and its exact rating, down the first
 * column and then the second, so the highest lead the left one. A list is as long as its count,
 * because every playthrough is a finish; a game finished twice at the point is two rows, and only
 * those say which finish each is, by the day, since two in one month would otherwise read alike.
 */
function TitleList({ id, labelledBy, finishes }: { id: string; labelledBy: string; finishes: Finish[] }) {
  const seen = new Set<number>();
  const twice = new Set<number>();
  for (const finish of finishes) {
    if (seen.has(finish.mediaId)) {
      twice.add(finish.mediaId);
    }
    seen.add(finish.mediaId);
  }

  return (
    <ul
      id={id}
      aria-labelledby={labelledBy}
      className="mt-3 flex flex-col rounded-lg border border-line bg-surface p-1 text-sm text-fg sm:block sm:columns-2 sm:gap-1"
    >
      {finishes.map((finish, index) => {
        const rating = finish.rating!;
        const day = formatJournalDate(finish.completedAt);

        return (
          <li key={`${finish.mediaId}-${index}`} className="flex break-inside-avoid items-center gap-2 rounded px-2 py-1">
            {finish.coverUrl === null ? (
              <span aria-hidden="true" className="h-8 w-6 shrink-0 rounded-sm bg-hover" />
            ) : (
              <img src={finish.coverUrl} alt="" className="h-8 w-6 shrink-0 rounded-sm object-cover" />
            )}
            <span className="flex min-w-0 flex-col">
              <span className="line-clamp-2">{finish.title}</span>
              {twice.has(finish.mediaId) && (
                <span className="text-xs text-muted">{day === null ? 'finished, no date' : `finished ${day}`}</span>
              )}
            </span>
            {/* As a card prints it, and read as a card's is. */}
            <span
              role="img"
              aria-label={`Rated ${rating.toFixed(1)} out of 10`}
              className={`ml-auto shrink-0 pl-2 text-xs font-semibold tabular-nums ${ratingTone(rating)}`}
            >
              ★ {rating.toFixed(1)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
