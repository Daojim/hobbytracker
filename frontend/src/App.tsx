import { Navigate, Route, Routes } from 'react-router';
import { BoardPage } from './board/BoardPage';
import { RequireSession } from './shell/RequireSession';
import { SignInPage } from './shell/SignInPage';

/**
 * One screen for now, and one in front of it. The board is the app, and the search that fills it
 * sits on top of it rather than beside it. A detail page and a year-in-review page come with
 * detail and review.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/board" replace />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route
        path="/board"
        element={
          <RequireSession>
            <BoardPage />
          </RequireSession>
        }
      />
      {/* Search stopped being a screen and became a bar above the board. Redirected rather
          than dropped: the address outlived the page, and a bookmark to it should land
          somewhere rather than nowhere. */}
      <Route path="/search" element={<Navigate to="/board" replace />} />
    </Routes>
  );
}
