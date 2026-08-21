import { Navigate, Route, Routes } from 'react-router';
import { BoardPage } from './board/BoardPage';
import { SearchPage } from './search/SearchPage';

/**
 * Two screens for now, per the Phase 3 scope: the board, and the search that puts things on it.
 * A detail page and a year-in-review page are Phase 5.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/board" replace />} />
      <Route path="/board" element={<BoardPage />} />
      <Route path="/search" element={<SearchPage />} />
    </Routes>
  );
}
