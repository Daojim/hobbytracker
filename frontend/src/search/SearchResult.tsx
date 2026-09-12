import { formatRelease } from '../lib/release';
import type { HobbyDefinition, SearchHit } from '../hobbies';

export interface SearchResultProps {
  hit: SearchHit;
  /** Already logged, so adding again would record a replay that never happened. */
  onBoard: boolean;
  adding: boolean;
  onAdd: (mediaId: number) => void;

  /**
   * The hobby whose strip this is, for the words on the add button.
   *
   * Passed in rather than read off the hit, and passed as the definition rather than as two
   * pre-computed strings: which words a tile uses is a fact about the hobby, and building them
   * above would put a hobby's vocabulary somewhere that is not `src/hobbies/`.
   */
  definition: HobbyDefinition;
}

/**
 * One result, as a tile in the strip above the board.
 *
 * A poster rather than a row, because the strip runs sideways: a row's worth of text turned on
 * its side is unreadable, and the cover is the fastest way to tell two games with similar names
 * apart — which is most of what searching "hollow" gives you.
 *
 * The width is fixed so the tiles stay a rhythm rather than each sizing to its own title, and
 * `shrink-0` is what keeps the flex row from squeezing them all into the visible width instead of
 * scrolling. The cover carries the same 5:7 the board's cards do.
 */
export function SearchResult({
  hit,
  onBoard,
  adding,
  onAdd,
  definition,
}: SearchResultProps) {
  // Both halves have to be true, and they are different questions. The hobby decides whether
  // there is a calendar to add to at all; the server decides whether this particular title is
  // out. `released` is taken as given rather than re-derived from the date — the board is
  // partitioned on the server's answer, and a second copy of that rule here would be free to
  // disagree, offering the calendar for something that then lands in Backlog.
  const calendar = definition.releases;
  const upcoming = calendar !== null && hit.release !== null && !hit.release.released;

  return (
    <li className="flex w-36 shrink-0 flex-col gap-2 rounded-lg border border-card-line bg-surface p-2 shadow-card">
      {hit.coverUrl === null ? (
        <span
          aria-hidden="true"
          className="flex aspect-[5/7] w-full items-center justify-center rounded bg-sunken text-3xl font-semibold text-muted"
        >
          {hit.title.charAt(0)}
        </span>
      ) : (
        // Empty alt: the title is right beneath it, so the cover only repeats what is already said.
        <img
          src={hit.coverUrl}
          alt=""
          className="aspect-[5/7] w-full rounded object-cover"
        />
      )}

      <div className="min-w-0 flex-1">
        {/* line-clamp rather than truncate: two lines is enough for most titles, and a name cut
            off mid-word at one line is how "Hollow Knight" and "Hollow Knight: Silksong" become
            the same tile. */}
        <h3 className="line-clamp-2 text-sm font-medium break-words">{hit.title}</h3>

        {/* Whatever this hobby says about a title in a line or two: a game's platforms and
            developers, a film's year and director. The hobby builds the lines and this prints
            them, rather than the tile growing a branch per hobby for the sake of two <p>s. An
            empty one is dropped — a film's director is not on TMDB's search response, so that
            line is blank until the title is added and enrichment fills it in. */}
        <div className="mt-1 text-xs text-muted">
          {hit.byline
            .filter((line) => line !== '')
            .map((line) => (
              <p key={line} className="truncate">
                {line}
              </p>
            ))}
        </div>
      </div>

      {/* When it is due, for a title that is not out. The one thing a search result can say that
          a board card cannot, and worth saying before adding rather than after: whether to
          commit to something is partly a question of how long the wait is. */}
      {upcoming && hit.release !== null && (
        <p className="text-center text-xs text-muted">
          {formatRelease(hit.release.day, hit.release.precision)}
        </p>
      )}

      {onBoard ? (
        <span className="text-center text-xs text-muted">On your board</span>
      ) : (
        <button
          type="button"
          disabled={adding}
          aria-label={
            upcoming && calendar !== null
              ? calendar.describeAdd(hit.title)
              : `Add ${hit.title} to backlog`
          }
          onClick={() => onAdd(hit.id)}
          className="h-7 rounded border border-line px-2 text-xs font-medium hover:bg-hover disabled:opacity-50"
        >
          {adding ? 'Adding…' : upcoming && calendar !== null ? calendar.addAction : 'Add'}
        </button>
      )}
    </li>
  );
}
