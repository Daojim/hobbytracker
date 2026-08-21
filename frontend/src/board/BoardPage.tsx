import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { listColumn } from '../api/library';
import { formatJournalDateTime } from '../lib/time';
import type { LogStatus } from '../api/types';

/**
 * Placeholder. The real board is four columns with dnd-kit wiring, a per-column sort, and a year
 * picker above Completed only — the next session's work.
 *
 * What is here proves the wiring end to end: TanStack Query, the API client, the Vite proxy, and
 * that timestamps render in the journal's zone rather than the browser's.
 */
const COLUMNS: { status: LogStatus; label: string }[] = [
  { status: 'Backlog', label: 'Backlog' },
  { status: 'InProgress', label: 'Playing' },
  { status: 'Completed', label: 'Completed' },
  { status: 'Dropped', label: 'Dropped' },
];

export function BoardPage() {
  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="mb-6 flex items-baseline gap-4">
        <h1 className="text-2xl font-semibold">Games</h1>
        <Link to="/search" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Add a game
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {COLUMNS.map((column) => (
          <Column key={column.status} status={column.status} label={column.label} />
        ))}
      </div>
    </main>
  );
}

function Column({ status, label }: { status: LogStatus; label: string }) {
  const { data, isPending, error } = useQuery({
    queryKey: ['library', 'games', status],
    queryFn: () => listColumn({ hobby: 'games', status }),
  });

  return (
    <section
      className={`rounded-lg border p-3 ${
        status === 'Dropped'
          ? 'border-neutral-200 opacity-60 dark:border-neutral-800'
          : 'border-neutral-300 dark:border-neutral-700'
      }`}
    >
      <h2 className="mb-3 text-sm font-medium tracking-wide uppercase">
        {label} {data !== undefined && <span className="text-neutral-500">{data.total}</span>}
      </h2>

      {isPending && <p className="text-sm text-neutral-500">Loading…</p>}
      {error !== null && <p className="text-sm text-red-600">{error.message}</p>}

      <ul className="flex flex-col gap-2">
        {data?.items.map((item) => (
          <li
            key={item.mediaId}
            className="rounded border border-neutral-200 bg-white p-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <p className="font-medium">{item.title}</p>
            {item.lastActivity !== null && (
              <p className="text-xs text-neutral-500">{formatJournalDateTime(item.lastActivity)}</p>
            )}
          </li>
        ))}
      </ul>

      {data?.items.length === 0 && <p className="text-sm text-neutral-500">Nothing here yet.</p>}
    </section>
  );
}
