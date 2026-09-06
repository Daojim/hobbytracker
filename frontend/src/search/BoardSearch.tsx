import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hobbyDefinition } from '../hobbies';
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
  const definition = hobbyDefinition(hobby);
  const [term, setTerm] = useState('');
  const boxRef = useRef<HTMLInputElement>(null);
  const settled = useDebounced(term.trim(), SEARCH_DEBOUNCE_MS);
  const queryClient = useQueryClient();

  const results = useQuery({
    // Keyed on the hobby, and dispatched by it too: `hobbies/` decides which endpoint a term
    // is sent to and what the box calls itself. Two hobbies sharing a search cache would serve
    // one board the other's results, and typing the same word on both boards is exactly how
    // you would find out.
    queryKey: ['search', hobby, settled],
    queryFn: () => definition.search.run(settled),
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
      // This hobby's, not every hobby's: adding a film cannot move a card on the games board.
      void queryClient.invalidateQueries({ queryKey: ['library', hobby] });
    },
  });

  const onBoard = new Set([...(library.data ?? []), ...justAdded]);

  // Pressing the button unmounts it — there is nothing left to clear — so it has to say where
  // the keyboard goes next, or focus falls to the document body. Escape deliberately does not do
  // this: it is handled on the container and so can be pressed from a control in the strip,
  // where dragging focus back to the box would be moving it somewhere nobody asked for.
  const clear = () => {
    setTerm('');
    boxRef.current?.focus();
  };

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
      {/* The button is a sibling of the label, never a child of it. A wrapping label takes its
          text content as the input's accessible name, so a button inside would make the box
          announce itself as "Search games Clear search" — and the four specs that locate it by
          name would stop finding it. */}
      <div className="relative max-w-xl">
        <label className="block">
          <span className="sr-only">{definition.search.label}</span>
          <input
            ref={boxRef}
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={definition.search.placeholder}
            // pr-9 leaves the button its corner. The arbitrary variant hides WebKit's own
            // cancel button, which Chrome draws inside a type="search" box as soon as it has
            // content — without it there are two × to choose from, one of them unstyled and
            // unlabelled.
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 pr-9 text-sm [&::-webkit-search-cancel-button]:appearance-none"
          />
        </label>

        {term !== '' && (
          // Only when there is something to clear. A × that sits there doing nothing on an empty
          // box reads as a control that has stopped working, which is the reasoning the hobby
          // nav already follows for the five hobbies that do not exist yet.
          <button
            type="button"
            aria-label="Clear search"
            onClick={clear}
            className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-muted hover:text-fg"
          >
            {/* The glyph is decoration; the button's name is the aria-label. */}
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

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
              {results.data.map((hit) => (
                <SearchResult
                  key={hit.id}
                  hit={hit}
                  onBoard={onBoard.has(hit.id)}
                  adding={add.isPending && add.variables === hit.id}
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
