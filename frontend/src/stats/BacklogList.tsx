import { useState } from 'react';
import type { BacklogTitle } from '../api/types';
import type { Voice, Voiced } from '../lib/voice';
import { waited } from './stats';
import { Nothing } from './Section';

/**
 * What "added" means, under a list where a title says it.
 *
 * A twelfth phrase written to the owner, which the #9 workshop's table of eleven missed. The
 * share's words follow that table's own rule, and were picked from renders on 5 October 2026 over
 * leaving the note off a share.
 */
const ADDED_MEANS: Voiced<string> = {
  own:
    '"Added" is the day a title went on your board. Since 1 October 2026 the board records ' +
    'when a title arrives in Backlog, and says "in your backlog" for those.',
  shared:
    '"Added" is the day a title went on the board. Since 1 October 2026 the board records ' +
    'when a title arrives in Backlog, and says "in the backlog" for those.',
};

/** How many titles show before Show all, picked with the list on 2 October 2026. */
const FIRST = 6;

/**
 * What is waiting, oldest first, and for how long — the user's own ask, title by title: "X was
 * added to your backlog Y days ago". Picked from rendered comparisons on 2 October 2026 over
 * buckets of ages, which summarise a long backlog but do not say which games.
 *
 * The same whatever year the page shows, because Backlog belongs to no year.
 */
export function BacklogList({
  backlog,
  noun,
  voice,
}: {
  backlog: BacklogTitle[];
  noun: (count: number) => string;
  voice: Voice;
}) {
  const [all, setAll] = useState(false);

  if (backlog.length === 0) {
    return <Nothing>Nothing waiting.</Nothing>;
  }

  const oldest = backlog[0]!;
  const shown = all ? backlog : backlog.slice(0, FIRST);

  // The note on "added" is for when a title says it, which until the column history has run a
  // while is most of them, and in time will be none.
  const anyAdded = backlog.some((title) => title.inBacklogSince === null);

  return (
    <>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-4xl font-semibold">{backlog.length}</span>
        <span className="text-sm text-muted">{`${noun(backlog.length)} waiting`}</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        the oldest, {oldest.title}, {waited(oldest, voice)}
      </p>

      <ol aria-label="Waiting longest" className="mt-4 space-y-2">
        {shown.map((title) => (
          <li key={title.mediaId} className="flex items-center gap-2">
            {title.coverUrl === null ? (
              <span
                aria-hidden="true"
                className="flex aspect-[5/7] w-8 shrink-0 items-center justify-center rounded bg-sunken text-xs font-semibold text-muted"
              >
                {title.title.charAt(0)}
              </span>
            ) : (
              // Empty alt: the title is right beside it, as on a card.
              <img src={title.coverUrl} alt="" className="aspect-[5/7] w-8 shrink-0 rounded object-cover" />
            )}

            {/* The age under the title rather than beside it, so a long name keeps the row on a
                phone instead of being cut to make room. */}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{title.title}</span>
              <span className="block text-xs text-muted tabular-nums">{waited(title, voice)}</span>
            </span>
          </li>
        ))}
      </ol>

      {!all && backlog.length > FIRST && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-3 text-xs font-medium text-accent hover:underline"
        >
          {`Show all ${backlog.length}`}
        </button>
      )}

      {anyAdded && (
        <p className="mt-3 text-xs text-muted">{ADDED_MEANS[voice]}</p>
      )}
    </>
  );
}
