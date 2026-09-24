import { useEffect, useMemo, useRef } from 'react';
import { Link, NavLink, Navigate, useParams } from 'react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AppHeader } from '../shell/AppHeader';
import { hobbyDefinition, type DiscoverList } from '../hobbies';
import { discoverKey } from '../board/keys';
import { useAddToBoard } from '../search/useAddToBoard';
import { DEFAULT_HOBBY, boardPath, discoverPath, isReadyHobby } from '../shell/hobbies';
import type { Hobby } from '../shell/hobbies';
import { WallTile } from './WallTile';

/**
 * A loaded wall is never refreshed behind somebody's back — it stays as it was loaded for as long
 * as it is open, and a fresh visit starts again from page one.
 *
 * It was an hour, when a list was one page. Refreshing a list with Load more behind it asks for
 * every page again, one after another: ten pages of Popular now would be twenty IGDB requests in a
 * few seconds, against a limit of four a second, set off by nothing more than the window coming
 * back into focus. And there is little to gain, because the server keeps each page's answer for
 * the day anyway.
 */
const LIST_FRESH_MS = Infinity;

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

  // A page at a time. Where the next one starts is the server's to say — two of the lists drop
  // titles after the provider has answered, so page two does not begin a page's worth of places
  // on — and this side only ever hands back what it was told.
  const titles = useInfiniteQuery({
    queryKey: discoverKey(hobby, list.slug),
    queryFn: ({ pageParam }) => list.run(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.next ?? undefined,
    staleTime: LIST_FRESH_MS,
  });

  // Every page so far, as one wall. A title already on it is dropped rather than drawn twice:
  // the server keeps the provider's answer for hours and asks again at midnight, so a page loaded
  // either side of that can carry a title the page before it already showed.
  const hits = useMemo(() => {
    const seen = new Set<number>();

    return (titles.data?.pages ?? [])
      .flatMap((page) => page.titles)
      .filter((hit) => {
        if (seen.has(hit.id)) {
          return false;
        }

        seen.add(hit.id);
        return true;
      });
  }, [titles.data]);

  // Focus goes to the first title a page added, where reading carries on. The new tiles arrive
  // above the button, so left there, somebody on a keyboard would have to go back through all of
  // them to reach the first. Moved once the tiles are drawn, which is after the page arrives.
  const wall = useRef<HTMLUListElement>(null);
  const firstNew = useRef<number | null>(null);

  // Forgotten when the tabs move on. This component outlives a tab — each list is the same page
  // with a different prop — so a page asked for on one list and found in the cache on the way
  // back would otherwise take focus when nobody had pressed anything. Declared first, because
  // effects run in order and on a tab change this one has to win.
  useEffect(() => {
    firstNew.current = null;
  }, [list.slug]);

  useEffect(() => {
    const index = firstNew.current;

    if (index === null || hits.length <= index) {
      return;
    }

    firstNew.current = null;
    wall.current?.children[index]?.querySelector('h3')?.focus();
  }, [hits.length]);

  const loadMore = () => {
    firstNew.current = hits.length;
    void titles.fetchNextPage();
  };

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

        {titles.error !== null && !titles.isFetchNextPageError && (
          // The API keeps "IGDB is unhappy" (502) apart from "this app is broken" (500), so this
          // passes on what it said rather than flattening it into "something went wrong". A later
          // page failing says so by the button instead, under the titles it leaves in place.
          <p role="alert" className="text-sm text-danger">
            {titles.error.message}
          </p>
        )}

        {board.error !== null && (
          <p role="alert" className="text-sm text-danger">
            {board.error.message}
          </p>
        )}

        {titles.isSuccess && hits.length === 0 && !titles.hasNextPage && (
          <p className="text-sm text-muted">Nothing on this list right now.</p>
        )}

        {hits.length > 0 && (
          // Eight across from 1280px, picked from rendered comparisons over six: sixteen games
          // before any scrolling rather than six, with each cover still wider than the strip's.
          // A page is 48 long, which fills the last row at 2, 3, 4, 8 and 12 across alike — and
          // so does every page after it.
          //
          // Labelled rather than headed, as the strip is: the list's name is already on the tab
          // above it, and the heading levels below the page's are the tiles' own.
          <ul
            ref={wall}
            aria-label={list.label}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 3xl:grid-cols-12"
          >
            {hits.map((hit) => (
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

        {titles.hasNextPage ? (
          // Picked from rendered comparisons on 24 September 2026 over a full-width bar, the
          // same button on a rule, and an accent link: the tile's own Add button at its own
          // width, so there is nothing new to learn, and at 119px nothing that reads as part of
          // the wall. Twice the gap between rows above it, so it never reads as another row.
          <div className="mt-8">
            {titles.isFetchNextPageError && (
              // Pressing the button again is the retry, so it stays where it is, under this.
              <p role="alert" className="mb-3 text-center text-sm text-danger">
                {titles.error?.message}
              </p>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                disabled={titles.isFetchingNextPage}
                onClick={loadMore}
                className="h-9 rounded border border-line bg-surface px-6 text-sm font-medium hover:bg-hover disabled:opacity-50"
              >
                {titles.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          </div>
        ) : (
          hits.length > 0 && (
            // Also picked from the renders, over saying nothing: without it the end of a list
            // looks the same as a page that stopped loading. Worded as the sibling of the empty
            // list's line above.
            <p className="mt-8 text-center text-sm text-muted">
              That's everything on this list right now.
            </p>
          )
        )}
      </div>
    </main>
  );
}
