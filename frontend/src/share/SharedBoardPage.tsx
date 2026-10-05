import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import type { LibrarySort, LogStatus, SharedBoard } from '../api/types';
import { ColumnSwitcher } from '../board/ColumnSwitcher';
import { ComingSoon } from '../board/ComingSoon';
import { YearPicker } from '../board/YearPicker';
import { BOARD_GAP, SIDE_BY_SIDE, boardTracks } from '../board/grid';
import { ALL_MANUAL, yearFor } from '../board/keys';
import { hobbyDefinition } from '../hobbies';
import { useMediaQuery } from '../lib/useMediaQuery';
import type { Hobby } from '../shell/hobbies';
import { DeadLink } from './DeadLink';
import { SharedColumn } from './SharedColumn';
import { SharedFrame } from './SharedFrame';
import { isShareable, sharedColumns, sharedStatsPath } from './paths';
import { sharedBoardQuery, sharedColumnQuery, sharedUpcomingQuery, sharedYearsQuery } from './queries';

/**
 * A share of somebody's board, read by its link with nobody signed in: `/share/:token`.
 *
 * **Outside the session gate, and asking nothing of the session.** Every request here goes to the
 * share's own routes, which answer for the token's owner; none goes to `/api/library`, which acts
 * as whoever is signed in, and none asks who that is.
 *
 * Nothing until the share says what it is, then nothing of the board until its years arrive, for
 * the board's reason: it opens on the latest year, and painting before that is known would show
 * every year on the way to the one it was always going to be.
 */
export function SharedBoardPage() {
  const { token = '' } = useParams();
  const board = useQuery(sharedBoardQuery(token));

  if (isNotFound(board.error)) {
    return <DeadLink />;
  }

  if (board.data === undefined) {
    return board.error === null ? null : <Unreachable onRetry={() => void board.refetch()} />;
  }

  // A share of a board the app does not share yet — made by hand against the API — opens no
  // board, rather than one dressed in some other hobby's words.
  if (!isShareable(board.data.hobby)) {
    return <DeadLink />;
  }

  return <Shared token={token} board={board.data} />;
}

/** Whether a share's answer was its 404: unknown, stopped and switched off are one answer. */
export const isNotFound = (error: Error | null) => error instanceof ApiError && error.status === 404;

/**
 * A share that could not be asked at all — the server unreachable for a moment, say. That is not a
 * link that opens no board, so it does not wear the dead link's words: the link may be fine.
 *
 * The dead link's card, saying something else, with a way to ask again. Picked from renders on
 * 5 October 2026 over the app's red error line on an empty page.
 */
export function Unreachable({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-sunken p-6 text-fg">
      <div
        role="alert"
        className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-line bg-surface p-8 shadow-xl"
      >
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">This board didn’t load</h1>
          <p className="text-sm text-muted">
            HobbyTracker couldn’t be reached just now. The link itself may be fine.
          </p>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="flex items-center justify-center gap-3 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-fg hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

function Shared({ token, board }: { token: string; board: SharedBoard }) {
  const hobby = board.hobby as Hobby;
  const definition = hobbyDefinition(hobby);

  // Per column, as on your board: reading somebody's Completed column by rating is the obvious
  // thing to do with it. The visitor's view, so held here and never written anywhere.
  const [sorts, setSorts] = useState<Record<LogStatus, LibrarySort>>(ALL_MANUAL);
  const [chosen, setChosen] = useState<{ year?: number } | null>(null);
  const [droppedOpen, setDroppedOpen] = useState(false);
  const sideBySide = useMediaQuery(SIDE_BY_SIDE, true);
  const [shown, setShown] = useState<LogStatus>('Backlog');

  const { data: years } = useQuery(sharedYearsQuery(token));
  const year = chosen !== null ? chosen.year : years?.[0];

  // What the share shows, and nothing of this browser's own Settings: columns taken off there are
  // the visitor's view of their own board. Backlog is always first, so there is a column to show.
  const columns = sharedColumns(board);
  const showing = columns.find(({ status }) => status === shown) ?? columns[0]!;
  const drawn = sideBySide ? columns : [showing];
  const switching = !sideBySide && columns.length > 1;

  const showsStats = board.parts.includes('Stats') && definition.stats !== null;
  const showsCalendar = board.parts.includes('Upcoming') && definition.releases !== null;

  return (
    <SharedFrame hobby={hobby} name={board.name}>
      {years !== undefined && (
        <>
          {/* The board's year row: the way to the share's Stats page when it shows them, and
              the year control, opening on the latest year as the board's does. */}
          <div
            className={`mb-3 flex items-center gap-4 ${showsStats ? 'justify-between' : 'justify-end'}`}
          >
            {showsStats && (
              <Link
                to={sharedStatsPath(token, year ?? 'all')}
                className="text-sm font-medium text-accent hover:underline"
              >
                {`Stats for ${year ?? 'all years'}`}
                <span aria-hidden="true"> →</span>
              </Link>
            )}
            <YearPicker years={years} value={year} onChange={(picked) => setChosen({ year: picked })} />
          </div>

          {/* A phone's one column at a time, as on your board, and outside any DndContext: its
              segments register on dnd-kit's defaults and reach nothing, so nothing lands on
              them. Each counts from its column's own request to the share. */}
          {switching && (
            <ColumnSwitcher
              columns={columns}
              requestFor={(status) =>
                sharedColumnQuery(token, status, sorts[status], yearFor(status, year))
              }
              shown={showing.status}
              onShow={setShown}
              lifted={false}
            />
          )}

          {/* data-board, as on your board, which is what the e2e card() locator reads. */}
          <div data-board="" className={`grid items-start ${BOARD_GAP} ${boardTracks(drawn.length)}`}>
            {drawn.map(({ status, label }) => (
              <SharedColumn
                key={status}
                token={token}
                hobby={hobby}
                status={status}
                label={label}
                sort={sorts[status]}
                onSortChange={(sort) => setSorts((current) => ({ ...current, [status]: sort }))}
                year={yearFor(status, year)}
                // Dropped folds side by side, as on yours, and not on a phone, where choosing it
                // in the switcher is already asking to see it.
                collapsed={sideBySide && status === 'Dropped' ? !droppedOpen : undefined}
                onToggleCollapse={
                  sideBySide && status === 'Dropped'
                    ? () => setDroppedOpen((open) => !open)
                    : undefined
                }
                namedAbove={switching}
              />
            ))}
          </div>
        </>
      )}

      {showsCalendar && (
        <ComingSoon
          hobby={hobby}
          columns={columns.length}
          query={sharedUpcomingQuery(token)}
          voice="shared"
          remembers={false}
        />
      )}
    </SharedFrame>
  );
}
