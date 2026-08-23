import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchGames } from '../api/games';
import { libraryMediaIds } from '../api/library';
import { addToBacklog } from '../api/logEntries';
import { useDebounced } from '../lib/useDebounced';
import { SearchResult } from './SearchResult';

/**
 * Finding a game and putting it on the board, from the board.
 *
 * There is no "add a game" endpoint and none is needed: searching upserts every IGDB result into
 * the catalogue as a side effect, so a result already has an id that a log entry can point at.
 * That is also why the catalogue is not the library — most of `media` is metadata for games
 * nobody ever recorded anything about.
 *
 * This used to be its own screen, which meant adding a game was a round trip away from the thing
 * you were adding it to. The bar sits above the board now and the results come in as a strip
 * over it, so the column a title lands in is on screen while you decide.
 *
 * Self-contained on purpose. BoardPage renders it and knows nothing else about search, which
 * keeps its tests about the board — and lets this one be tested without a board around it, which
 * matters because a result's title and a card's title are both an h3.
 */
export interface BoardSearchProps {
  hobby: string;
}

/** Long enough that a typed word is one search, short enough that it does not feel stuck. */
const SEARCH_DEBOUNCE_MS = 300;

export function BoardSearch({ hobby }: BoardSearchProps) {
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
    queryKey: ['library', hobby, 'ids'],
    queryFn: () => libraryMediaIds(hobby),
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

  // Whether there is anything worth taking room from the board for. An idle box is a bar and
  // nothing else; the strip arrives with results, with "nothing matched", or with a failure, and
  // leaves again when the box is emptied.
  const searching = settled !== '';
  const showStrip = searching && (results.isPending || results.error !== null || results.data !== undefined);

  return (
    <div
      className="mb-4"
      // On the search rather than on the document. The journal drawer already listens for Escape
      // at the document, and a second listener for one key is how the two start disagreeing about
      // which of them a press was meant for. React's synthetic events bubble through the tree, so
      // this catches the box and every control in the strip without any of them knowing.
      onKeyDown={(event) => {
        if (event.key === 'Escape' && term !== '') {
          setTerm('');
        }
      }}
    >
      <label className="block max-w-xl">
        <span className="sr-only">Search games</span>
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search to add a game — Hollow Knight, Celeste, Outer Wilds…"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        />
      </label>

      {showStrip && (
        // Labelled rather than headed. A heading here would be a second h2 on the board, and the
        // board's four column headings are asserted as an exhaustive list — an aria-label gives
        // the strip a landmark and a name without joining that list.
        <section
          aria-label="Search results"
          className="mt-3 rounded-xl border border-line-soft bg-well p-3"
        >
          {results.isPending && <p className="text-sm text-muted">Searching…</p>}

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

          {results.data !== undefined && results.data.length > 0 && (
            // Sideways, so the strip costs the board one band of height rather than a screenful.
            // Rendered in the order IGDB ranked them: the database has no idea that ordering
            // exists, so re-sorting here would be discarding the only relevance there is.
            <ul className="flex gap-3 overflow-x-auto pb-1">
              {results.data.map((game) => (
                <SearchResult
                  key={game.id}
                  game={game}
                  onBoard={onBoard.has(game.id)}
                  adding={add.isPending && add.variables === game.id}
                  onAdd={(mediaId) => add.mutate(mediaId)}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
