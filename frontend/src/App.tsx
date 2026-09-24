import { Navigate, Route, Routes } from 'react-router';
import { BoardPage } from './board/BoardPage';
import { DiscoverPage } from './discover/DiscoverPage';
import { RequireSession } from './shell/RequireSession';
import { SignInPage } from './shell/SignInPage';
import { DEFAULT_HOBBY, boardPath } from './shell/hobbies';

/**
 * One screen per hobby, and one in front of them all. The board is the app, and the search that
 * fills it sits on top of it rather than beside it. A hobby's Discover page lives under its
 * board's address, because it is a page of that board. A detail page and a year-in-review page
 * come with detail and review.
 *
 * The hobby is a path parameter rather than something the board decides for itself, so a board is
 * a thing you can link to and come back to. `BoardPage` is what turns a slug nobody has built
 * into the one that exists — here would be too early, since the redirect wants to be inside the
 * session gate rather than in front of it.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={boardPath(DEFAULT_HOBBY)} replace />} />
      <Route path="/signin" element={<SignInPage />} />
      {/* The address the board had while games were the only hobby. Redirected rather than
          dropped, for the reason /search is: bookmarks, every Playwright `goto`, and the
          `returnUrl` sign-in comes back to all name it. */}
      <Route path="/board" element={<Navigate to={boardPath(DEFAULT_HOBBY)} replace />} />
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
      {/* Search stopped being a screen and became a bar above the board. Redirected rather
          than dropped: the address outlived the page, and a bookmark to it should land
          somewhere rather than nowhere. */}
      <Route path="/search" element={<Navigate to={boardPath(DEFAULT_HOBBY)} replace />} />
    </Routes>
  );
}
