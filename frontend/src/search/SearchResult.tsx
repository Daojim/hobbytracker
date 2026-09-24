import { formatRelease } from '../lib/release';
import { AddControl } from './AddControl';
import { awaitsRelease, boardWords } from './addWords';
import type { AddColumn, HobbyDefinition, SearchHit } from '../hobbies';
import type { LogStatus } from '../api/types';

export interface SearchResultProps {
  hit: SearchHit;
  /**
   * The column this title is in on your board, or null when it is not on it. Already logged
   * means adding again would record a replay that never happened, so the tile says where it is
   * instead.
   */
  onBoard: LogStatus | null;
  adding: boolean;
  onAdd: (mediaId: number, status: LogStatus) => void;
  /** Where this board can take a title — see `addColumns`. */
  columns: readonly AddColumn[];

  /**
   * The hobby whose strip this is, for every word the tile says.
   *
   * Passed in rather than read off the hit, and passed as the definition rather than as
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
  columns,
  definition,
}: SearchResultProps) {
  // Whether the title is waiting on the calendar — decided in one place for this tile and the
  // Discover page's, so the two cannot disagree about the same title. See addWords.
  const upcoming = awaitsRelease(hit, definition);

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

      {onBoard !== null ? (
        // Where it is rather than only that it is there: with three ways onto the board, "On your
        // board" no longer said which one a title took. Picked from the renders over keeping
        // those words. The tick is decoration and the column is the claim; a screen reader hears
        // the whole of it, because "Completed" alone under a game's name could mean the game.
        <span className="text-center text-xs text-muted">
          <span aria-hidden="true">✓ </span>
          <span className="sr-only">On your board: </span>
          {boardWords(hit, definition, onBoard)}
        </span>
      ) : (
        <AddControl
          hit={hit}
          definition={definition}
          columns={columns}
          adding={adding}
          onAdd={onAdd}
        />
      )}
    </li>
  );
}
