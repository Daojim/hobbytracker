import { Link, NavLink, Navigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '../shell/AppHeader';
import { hobbyDefinition, type DiscoverList } from '../hobbies';
import { discoverKey } from '../board/keys';
import { useAddToBoard } from '../search/useAddToBoard';
import { DEFAULT_HOBBY, boardPath, discoverPath, isReadyHobby } from '../shell/hobbies';
import type { Hobby } from '../shell/hobbies';
import { WallTile } from './WallTile';

/**
 * How long a list stays fresh here. The server asks IGDB once a day for each list, so a person
 * going back and forth between tabs over an evening has nothing new to be told.
 */
const LIST_FRESH_MS = 60 * 60 * 1000;

/**
 * The Discover page: a wall of what the provider would show somebody who has not typed
 * anything, for filling a board without having to know what to search for.
 *
 * A page of its own rather than a strip over the board, which is what search became. Search is
 * finding one thing you have in mind, and the column it lands in wants to be on screen; this is
 * looking along a wall, which wants the room. The way in is a line under the empty search box.
 *
 * It names no hobby. Which lists there are, what each is called and where each is asked for come
 * from `hobbies/`, and a hobby without a `discover` block has no page — its address goes to the
 * board instead.
 */
export function DiscoverPage() {
  const { hobby, list } = useParams();

  // The board's rule: a slug that names no built hobby goes to the board that exists. A
  // component of its own below, so every redirect here comes before any hook.
  if (!isReadyHobby(hobby)) {
    return <Navigate to={boardPath(DEFAULT_HOBBY)} replace />;
  }

  const discover = hobbyDefinition(hobby).discover;

  if (discover === null) {
    return <Navigate to={boardPath(hobby)} replace />;
  }

  const chosen = discover.lists.find((candidate) => candidate.slug === list);

  // No list, or a slug that names none: the first. Replaced rather than pushed, so Back does not
  // return to an address whose only job is to leave.
  if (chosen === undefined) {
    return <Navigate to={discoverPath(hobby, discover.lists[0]!.slug)} replace />;
  }

  return (
    <Discover hobby={hobby} heading={discover.heading} lists={discover.lists} list={chosen} />
  );
}

interface DiscoverProps {
  hobby: Hobby;
  heading: string;
  lists: readonly DiscoverList[];
  list: DiscoverList;
}

function Discover({ hobby, heading, lists, list }: DiscoverProps) {
  const definition = hobbyDefinition(hobby);

  // The search strip's own add, and its idea of what is on the board already, so one title cannot
  // read as addable here and on the board there.
  const board = useAddToBoard(hobby);

  const titles = useQuery({
    queryKey: discoverKey(hobby, list.slug),
    queryFn: () => list.run(),
    staleTime: LIST_FRESH_MS,
  });

  return (
    <main className="min-h-screen bg-sunken p-6 text-fg 2xl:p-8 3xl:p-10">
      <div className="mx-auto max-w-board">
        <AppHeader title="HobbyTracker" hobby={hobby} />

        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-semibold">{heading}</h2>
          <Link to={boardPath(hobby)} className="text-sm text-muted hover:text-fg">
            <span aria-hidden="true">← </span>
            Back to your board
          </Link>
        </div>

        {/* Pills rather than the hobby nav's underline, picked from rendered comparisons: under
            that nav a second underlined row read as a second level of the same menu. They wrap
            on a phone, where an underlined row would scroll its last tab off the screen.

            Links, so each list is an address — Back returns to the list before, and a list can be
            sent to somebody — with aria-current free, as the hobby nav has it. */}
        <nav aria-label="Lists">
          <ul className="flex flex-wrap gap-2">
            {lists.map((candidate) => (
              <li key={candidate.slug}>
                <NavLink
                  to={discoverPath(hobby, candidate.slug)}
                  className={({ isActive }) =>
                    `inline-block rounded-full border px-3 py-1 text-sm font-medium ${
                      isActive
                        ? 'border-accent bg-surface text-accent'
                        : 'border-line text-muted hover:bg-hover hover:text-fg'
                    }`
                  }
                >
                  {candidate.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-3 mb-4 text-sm text-muted">{list.blurb}</p>

        {titles.isPending && <p className="text-sm text-muted">Loading…</p>}

        {titles.error !== null && (
          // The API keeps "IGDB is unhappy" (502) apart from "this app is broken" (500), so this
          // passes on what it said rather than flattening it into "something went wrong".
          <p role="alert" className="text-sm text-danger">
            {titles.error.message}
          </p>
        )}

        {board.error !== null && (
          <p role="alert" className="text-sm text-danger">
            {board.error.message}
          </p>
        )}

        {titles.data?.length === 0 && (
          <p className="text-sm text-muted">Nothing on this list right now.</p>
        )}

        {titles.data !== undefined && titles.data.length > 0 && (
          // Eight across from 1280px, picked from rendered comparisons over six: sixteen games
          // before any scrolling rather than six, with each cover still wider than the strip's.
          // A list is 48 long, which fills the last row at 2, 3, 4, 8 and 12 across alike.
          //
          // Labelled rather than headed, as the strip is: the list's name is already on the tab
          // above it, and the heading levels below the page's are the tiles' own.
          <ul
            aria-label={list.label}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 3xl:grid-cols-12"
          >
            {titles.data.map((hit) => (
              <WallTile
                key={hit.id}
                hit={hit}
                onBoard={board.onBoard.has(hit.id)}
                adding={board.isAdding(hit.id)}
                onAdd={board.add}
                definition={definition}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
