import { Navigate, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { SharedBoard } from '../api/types';
import { YearPicker } from '../board/YearPicker';
import { hobbyDefinition, type HobbyDefinition } from '../hobbies';
import type { Hobby } from '../shell/hobbies';
import { Dashboard, Failed, Loading, StatsHeading, askedFor } from '../stats/StatsPage';
import { DeadLink } from './DeadLink';
import { SharedFrame } from './SharedFrame';
import { Unreachable, isNotFound } from './SharedBoardPage';
import { isShareable, sharedPath, sharedStatsPath } from './paths';
import { sharedBoardQuery, sharedStatsQuery, sharedStatsYearsQuery } from './queries';

/**
 * A share's Stats page: `/share/:token/stats/:year?`, under the share's banner.
 *
 * **The owner's page, whole**, as the #9 workshop decided: every finish, and what was dropped as a
 * number with no titles, whichever columns the share shows. So it is the board's own Dashboard,
 * in the share's voice, and the only thing the share decides is whether it is there. A share
 * without Stats sends its address to the share's board, as a hobby with no Stats page sends its
 * own to its board.
 *
 * The year is in the address, as on your Stats page, and the bare address opens on the latest year
 * the page has — the Stats page's own years, not the board's.
 */
export function SharedStatsPage() {
  const { token = '', year } = useParams();
  const board = useQuery(sharedBoardQuery(token));

  if (isNotFound(board.error)) {
    return <DeadLink />;
  }

  if (board.data === undefined) {
    return board.error === null ? null : <Unreachable onRetry={() => void board.refetch()} />;
  }

  if (!isShareable(board.data.hobby)) {
    return <DeadLink />;
  }

  const definition = hobbyDefinition(board.data.hobby);

  if (!board.data.parts.includes('Stats') || definition.stats === null) {
    return <Navigate to={sharedPath(token)} replace />;
  }

  const asked = askedFor(year);

  // Replaced rather than pushed, so Back never returns to an address whose only job is to leave.
  if (asked === 'neither') {
    return <Navigate to={sharedStatsPath(token)} replace />;
  }

  return <StatsOf token={token} board={board.data} asked={asked} definition={definition} />;
}

interface StatsOfProps {
  token: string;
  board: SharedBoard;
  asked: number | 'all' | undefined;
  definition: HobbyDefinition;
}

function StatsOf({ token, board, asked, definition }: StatsOfProps) {
  const navigate = useNavigate();
  const years = useQuery(sharedStatsYearsQuery(token));
  const year = asked === 'all' ? undefined : asked;
  const hobby = board.hobby as Hobby;

  // No year named: the latest there is, and nothing asked for until the years say which — your
  // Stats page's rule, for its reason.
  if (asked === undefined) {
    if (years.data === undefined) {
      return (
        <SharedFrame hobby={hobby} name={board.name}>
          <StatsHeading back={sharedPath(token)} voice="shared" />
          {years.error === null ? <Loading /> : <Failed error={years.error} />}
        </SharedFrame>
      );
    }

    return <Navigate to={sharedStatsPath(token, years.data[0] ?? 'all')} replace />;
  }

  return (
    <SharedFrame hobby={hobby} name={board.name}>
      <StatsHeading back={sharedPath(token)} voice="shared" />

      <div className="mb-4">
        <YearPicker
          years={years.data ?? []}
          value={year}
          onChange={(picked) =>
            void navigate(sharedStatsPath(token, picked ?? 'all'), { replace: true })
          }
        />
      </div>

      <Year token={token} year={year} definition={definition} />
    </SharedFrame>
  );
}

function Year({
  token,
  year,
  definition,
}: {
  token: string;
  year: number | undefined;
  definition: HobbyDefinition;
}) {
  const { data, error } = useQuery(sharedStatsQuery(token, year));

  if (error !== null) {
    return <Failed error={error} />;
  }

  return data === undefined ? (
    <Loading />
  ) : (
    <Dashboard stats={data} year={year} definition={definition} voice="shared" />
  );
}
