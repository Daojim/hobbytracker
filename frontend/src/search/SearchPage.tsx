import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchGames } from '../api/games';
import { libraryMediaIds } from '../api/library';
import { addToBacklog } from '../api/logEntries';
import { useDebounced } from '../lib/useDebounced';
import { SearchResult } from './SearchResult';

/**
 * Finding a game and putting it on the board.
 *
 * There is no "add a game" endpoint and none is needed: searching upserts every IGDB result into
 * the catalogue as a side effect, so a result already has an id that a log entry can point at.
 * That is also why the catalogue is not the library — most of `media` is metadata for games
 * nobody ever recorded anything about.
 */
const HOBBY = 'games';

/** Long enough that a typed word is one search, short enough that it does not feel stuck. */
const SEARCH_DEBOUNCE_MS = 300;

export function SearchPage() {
  const [term, setTerm] = useState('');
  const settled = useDebounced(term.trim(), SEARCH_DEBOUNCE_MS);
  const queryClient = useQueryClient();

  const results = useQuery({
    queryKey: ['games', 'search', settled],
    queryFn: () => searchGames(settled),
    // An empty box is not a search for nothing; it is not a search.
    enabled: settled !== '',
  });

  const library = useQuery({
    queryKey: ['library', HOBBY, 'ids'],
    queryFn: () => libraryMediaIds(HOBBY),
  });

  // Held locally as well as in the library query, so the answer changes the moment the entry is
  // written rather than a refetch later — otherwise the button stays live long enough to be
  // clicked twice, and the second click is a second Backlog entry the board renders as a replay.
  const [justAdded, setJustAdded] = useState<number[]>([]);

  const add = useMutation({
    mutationFn: (mediaId: number) => addToBacklog(mediaId),
    onSuccess: (_entry, mediaId) => {
      setJustAdded((ids) => [...ids, mediaId]);
      void queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });

  const onBoard = new Set([...(library.data ?? []), ...justAdded]);

  return (
    <main className="min-h-screen bg-sunken p-6 text-fg">
      <header className="mb-6 flex items-baseline gap-4">
        <h1 className="text-2xl font-semibold">Search</h1>
        <Link to="/board" className="text-sm text-accent hover:underline">
          Back to the board
        </Link>
      </header>

      <label className="block max-w-xl">
        <span className="sr-only">Search games</span>
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Hollow Knight, Celeste, Outer Wilds…"
          className="w-full rounded border border-line bg-surface px-3 py-2 text-sm"
        />
      </label>

      <div className="mt-6 max-w-xl">
        {settled === '' && (
          <p className="text-sm text-muted">Search for a game to put it on your board.</p>
        )}

        {settled !== '' && results.isPending && (
          <p className="text-sm text-muted">Searching…</p>
        )}

        {results.error !== null && (
          // The client keeps the API's distinction between "IGDB is unhappy" (502) and "this app
          // is broken" (500), so flattening it back into "something went wrong" here would throw
          // away the only part worth reading.
          <p role="alert" className="text-sm text-danger">
            {results.error.message}
          </p>
        )}

        {add.error !== null && (
          <p role="alert" className="text-sm text-danger">
            {add.error.message}
          </p>
        )}

        {results.data?.length === 0 && (
          <p className="text-sm text-muted">Nothing matched “{settled}”.</p>
        )}

        <ul className="flex flex-col gap-2">
          {/* Rendered in the order IGDB ranked them. The database has no idea that ordering
              exists, so re-sorting here would be discarding the only relevance there is. */}
          {results.data?.map((game) => (
            <SearchResult
              key={game.id}
              game={game}
              onBoard={onBoard.has(game.id)}
              adding={add.isPending && add.variables === game.id}
              onAdd={(mediaId) => add.mutate(mediaId)}
            />
          ))}
        </ul>
      </div>
    </main>
  );
}
