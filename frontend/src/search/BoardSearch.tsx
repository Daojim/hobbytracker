import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { hobbyDefinition } from '../hobbies';
import { useDebounced } from '../lib/useDebounced';
import { discoverPath } from '../shell/hobbies';
import { SearchResult } from './SearchResult';
import { useAddToBoard } from './useAddToBoard';

/**
 * Finding a game and putting it on the board, from the board.
 *
 * Searching upserts every IGDB result into the catalogue as a side effect, so a result already
 * has the id that `POST /api/library/{mediaId}` puts on your board — in Backlog, Playing or
 * Completed, with the dates a drag into that column would give. That is also why the catalogue is
 * not the library — most of `media` is metadata for games nobody ever recorded anything about.
 *
 * This used to be its own screen, which meant adding a game was a round trip away from the thing
 * you were adding it to. The bar sits above the board now and the results come in as a strip
 * over it, so the column a title lands in is on screen while you decide.
 *
 * Self-contained on purpose. BoardPage renders it and knows nothing else about search, which
 * keeps its tests about the board — and lets this one be tested without a board around it, which
 * matters because a result's title and a card's title are both an h3.
 *
 * Everything it holds belongs to the board it sits above: the term, and the debounced copy the
 * query is keyed on. So the page keys this on the hobby and the nav remounts it, which is the one
 * thing about search that this file cannot do for itself — by the time the prop changed, the
 * debounced term had already settled, and the query keyed on both was away to the new provider
 * with the old word before anything here could clear it.
 */
export interface BoardSearchProps {
  hobby: string;
}

/** Long enough that a typed word is one search, short enough that it does not feel stuck. */
const SEARCH_DEBOUNCE_MS = 300;

/** Where a slash is somebody's typing rather than a request for this box. */
const FIELDS = 'input, textarea, select';

/** dnd-kit's own mark for the card in hand: a sortable, pressed. */
const CARRIED = '[aria-roledescription="sortable"][aria-pressed="true"]';

export function BoardSearch({ hobby }: BoardSearchProps) {
  const definition = hobbyDefinition(hobby);
  const [term, setTerm] = useState('');
  const boxRef = useRef<HTMLInputElement>(null);
  const settled = useDebounced(term.trim(), SEARCH_DEBOUNCE_MS);

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

  // What is on the board already and where, which columns a title can go to, and the add itself —
  // shared with the Discover page's wall, so a title cannot read as on the board in one place and
  // addable in the other.
  const board = useAddToBoard(hobby);

  // Pressing the button unmounts it — there is nothing left to clear — so it has to say where
  // the keyboard goes next, or focus falls to the document body. Escape deliberately does not do
  // this: it is handled on the container and so can be pressed from a control in the strip,
  // where dragging focus back to the box would be moving it somewhere nobody asked for.
  const clear = () => {
    setTerm('');
    boxRef.current?.focus();
  };

  // `/` brings the keyboard here from anywhere on the board. On the document rather than on the
  // bar, because the press it answers is made while the keyboard is somewhere else. Escape's rule
  // below is about two listeners for one key, and nothing else listens for this one.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Shift is left off deliberately. `key` is already the character the keyboard made, and on
      // a German or French keyboard a slash is a shifted key, so counting Shift as a modifier
      // would take the shortcut away from everybody typing on one. With Ctrl, Alt or Meta it is
      // a different shortcut, and somebody else's.
      if (event.key !== '/' || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // A slash typed into a field is the field's: "7/9" in a note, or Fate/stay night in this
      // box. That covers an IME as well, because composition only ever happens in a field.
      if (event.target instanceof Element && event.target.matches(FIELDS)) {
        return;
      }

      // The journal is aria-modal and traps Tab to keep that promise, and this would be a way out
      // of it. Asked of the document rather than of where the keyboard is, because focus can fall
      // out of an open drawer onto the body, and the board behind is no more this key's then.
      if (document.querySelector('[aria-modal="true"]') !== null) {
        return;
      }

      // Nor while a card is being carried. A drag by keyboard listens at the document for Space,
      // Enter and the arrows wherever focus has gone, so moving the keyboard to the box would
      // leave the card in hand: the first space typed drops it, dnd-kit hands focus back to the
      // card, and the rest of the word goes nowhere.
      if (document.querySelector(CARRIED) !== null) {
        return;
      }

      // Or the keypress follows the focus into the box, and the search begins with a slash.
      event.preventDefault();
      boxRef.current?.focus();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

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

      {term === '' && definition.discover !== null && (
        // Only while the box is empty, which is exactly when somebody might not know what to
        // search for; once there is typing, the strip is the answer. A sibling of the label
        // rather than inside it, for the clear button's reason: a wrapping label would take this
        // sentence into the box's name. Picked from rendered comparisons over a link beside the
        // box, which saved the board 28px and read as something to miss.
        <p className="mt-2 text-sm text-muted">
          {definition.discover.invitation.prompt}{' '}
          <Link
            to={discoverPath(definition.slug)}
            className="font-medium text-accent hover:underline"
          >
            {definition.discover.invitation.link}
          </Link>
        </p>
      )}

      {showStrip && (
        // Labelled rather than headed. A heading here would be a second h2 on the board, and the
        // board's column headings are asserted as an exhaustive list — an aria-label gives
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

          {board.error !== null && (
            <p role="alert" className="text-sm text-danger">
              {board.error.message}
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
                  onBoard={board.statusOf(hit.id)}
                  adding={board.isAdding(hit.id)}
                  onAdd={board.add}
                  columns={board.columns}
                  definition={definition}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
