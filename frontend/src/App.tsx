import { Navigate, Route, Routes } from 'react-router';
import { BoardPage } from './board/BoardPage';
import { DiscoverPage } from './discover/DiscoverPage';
import { StatsPage } from './stats/StatsPage';
import { RequireSession } from './shell/RequireSession';
import { SignInPage } from './shell/SignInPage';
import { SharedBoardPage } from './share/SharedBoardPage';
import { SharedStatsPage } from './share/SharedStatsPage';
import { boardPath } from './shell/hobbies';
import { useOpeningBoard } from './shell/openingBoard';
import { useDateOrder } from './lib/time';

/**
 * One screen per hobby, and one in front of them all. The board is the app, and the search that
 * fills it sits on top of it rather than beside it. A hobby's Discover page lives under its
 * board's address, because it is a page of that board, and so does its Stats page, which is the
 * year in review as well.
 *
 * The hobby is a path parameter rather than something the board decides for itself, so a board is
 * a thing you can link to and come back to. `BoardPage` is what turns a slug nobody has built
 * into the one that exists — here would be too early, since the redirect wants to be inside the
 * session gate rather than in front of it.
 */
/**
 * `/`, `/board` and `/search`, to the board chosen to open first: Games until another is chosen
 * in Settings (#27). Read from its store as the redirect renders, so a choice made a moment ago
 * is the board the next of these lands on.
 */
function ToOpeningBoard() {
  return <Navigate to={boardPath(useOpeningBoard())} replace />;
}

export function App() {
  // Every date on screen is written in the order chosen in Settings (#27), and the formatters
  // read it as they write. Heard here, at the top, so a choice re-renders every page under it
  // and a date already on the board changes at once: nothing below is memoised, so the whole
  // tree renders again, and no formatter's caller has to remember to listen.
  useDateOrder();

  return (
    <Routes>
      <Route path="/" element={<ToOpeningBoard />} />
      <Route path="/signin" element={<SignInPage />} />
      {/* The address the board had while games were the only hobby. Redirected rather than
          dropped, for the reason /search is: bookmarks, every Playwright `goto`, and the
          `returnUrl` sign-in comes back to all name it. */}
      <Route path="/board" element={<ToOpeningBoard />} />
      <Route
        path="/board/:hobby"
        element={
          <RequireSession>
            <BoardPage />
          </RequireSession>
        }
      />
      {/* The list is optional so the bare address works: the page sends it to its first list. */}
      <Route
        path="/board/:hobby/discover/:list?"
        element={
          <RequireSession>
            <DiscoverPage />
          </RequireSession>
        }
      />
      {/* The year is optional for Discover's reason: the bare address opens on the latest. */}
      <Route
        path="/board/:hobby/stats/:year?"
        element={
          <RequireSession>
            <StatsPage />
          </RequireSession>
        }
      />
      {/* Search stopped being a screen and became a bar above the board. Redirected rather
          than dropped: the address outlived the page, and a bookmark to it should land
          somewhere rather than nowhere. */}
      <Route path="/search" element={<ToOpeningBoard />} />

      {/* A share of somebody's board, read by its link: the one board outside the session gate,
          because the person holding the link has no account to be signed in to. It asks only
          the share's own routes, which answer for the token's owner. */}
      <Route path="/share/:token" element={<SharedBoardPage />} />
      <Route path="/share/:token/stats/:year?" element={<SharedStatsPage />} />
    </Routes>
  );
}
