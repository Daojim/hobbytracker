import { Link } from 'react-router';

/**
 * Placeholder. The real page debounces into `GET /api/games?search=`, shows cover, title,
 * platforms and developers, and puts a result on the board with `addToBacklog` — which needs no
 * endpoint of its own, because search has already upserted the title into the catalog.
 */
export function SearchPage() {
  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <h1 className="mb-4 text-2xl font-semibold">Search</h1>
      <p className="text-sm text-neutral-500">Not built yet.</p>
      <Link to="/board" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        Back to the board
      </Link>
    </main>
  );
}
