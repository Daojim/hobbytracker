import { formatRelease } from '../lib/release';
import { AddControl } from '../search/AddControl';
import { awaitsRelease, boardWords } from '../search/addWords';
import { EyeOff } from './EyeOff';
import type { AddColumn, HobbyDefinition, SearchHit } from '../hobbies';
import type { LogStatus, RatedTitle } from '../api/types';

export interface WallTileProps {
  hit: SearchHit;
  /** The column this title is in on your board, or null when it is not on it. */
  onBoard: LogStatus | null;
  adding: boolean;
  onAdd: (mediaId: number, status: LogStatus) => void;
  /** Where this board can take a title — see `addColumns`. */
  columns: readonly AddColumn[];
  definition: HobbyDefinition;
  /**
   * The games of yours this title is on a list for, highest rated first — From your ratings'
   * reason. Absent on a list that is the same for everybody, and then the tile says nothing about why.
   */
  because?: readonly RatedTitle[] | null;
  /**
   * Hides the title from Discover, from the mark on the cover's corner. The tile offers it only
   * while the title is not on your board, as it does the add.
   */
  onHide?: () => void;
}

/**
 * One title on the Discover page's wall: the cover first, the name under it, and the add.
 *
 * Picked from rendered comparisons on 23 September 2026 over the search strip's tile, which
 * carries platforms and developers under the name. At a wall's width that byline was cut off on
 * 20 of 48 lines — "PC (Microsoft Windows), PlayStati…" — and a cover is how a person recognises a
 * game. The strip keeps its own tile, where the byline tells two similar names apart.
 *
 * A title already on your board says so on its cover, also picked by eye: a wall is read by
 * scanning covers, so that is where it is seen. The tile then has nothing to press and its row is
 * one control shorter than its neighbours' — seen in the renders, and chosen anyway. Since 24
 * September 2026 the chip names the column rather than saying "On your board", because a title
 * can arrive in three of them and filling a board backwards means knowing which one each went to.
 *
 * A title not on your board can be hidden from Discover (#23), by a mark in the corner the chip
 * would use, so the two never meet: the user's pick at the 13 November 2026 workshop over a button
 * of its own beside the add.
 */
export function WallTile({
  hit,
  onBoard,
  adding,
  onAdd,
  columns,
  definition,
  because = null,
  onHide,
}: WallTileProps) {
  const upcoming = awaitsRelease(hit, definition);
  const [reason, ...others] = because ?? [];

  return (
    // A group, so the mark on the cover can show while the pointer or the keyboard is anywhere in
    // the tile, and the place the mark is measured from, since it sits outside the cover's box.
    <li className="group relative flex flex-col gap-1.5">
      <div className="relative">
        {hit.coverUrl === null ? (
          // On the page's own ground rather than inside a card, so the placeholder takes the
          // surface colour to stand out from it.
          <span
            aria-hidden="true"
            className="flex aspect-[5/7] w-full items-center justify-center rounded-md bg-surface text-4xl font-semibold text-muted shadow-card"
          >
            {hit.title.charAt(0)}
          </span>
        ) : (
          // Empty alt: the title is right beneath it, so the cover only repeats what is said.
          <img
            src={hit.coverUrl}
            alt=""
            className="aspect-[5/7] w-full rounded-md object-cover shadow-card"
          />
        )}

        {onBoard !== null && (
          <span className="absolute top-1.5 right-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[0.6875rem] font-medium text-fg shadow-card">
            {/* The tick is decoration; the column is the claim — and a screen reader hears where
                it is, because "Completed" alone under a game's name could mean the game. */}
            <span aria-hidden="true">✓ </span>
            <span className="sr-only">On your board: </span>
            <span>{boardWords(hit, definition, onBoard)}</span>
          </span>
        )}
      </div>

      {/* Two lines, as in the strip, so "Hollow Knight" and "Hollow Knight: Silksong" stay two
          different titles. Measured at 8 across and 1440px: 8 of 24 names took the second line
          and none needed a third.

          Focusable from script and nowhere else, because Load more moves focus to the first
          title a page added, and Tab goes from there to that title's own controls: its hide,
          then its add. */}
      <h3 tabIndex={-1} className="line-clamp-2 text-sm leading-snug font-medium break-words">
        {hit.title}
      </h3>

      {/* When it is due, for a title that is not out — worth knowing before committing to the
          wait. The same rule as the strip's tile decides it. */}
      {upcoming && hit.release !== null && (
        <p className="-mt-1 text-xs text-muted">
          {formatRelease(hit.release.day, hit.release.precision)}
        </p>
      )}

      {/* Why it is on a list made from your board: "Because you rated Hollow Knight 9 and 2 more",
          the game of yours rated highest named in the text colour and the rest muted. Picked at
          the #17 workshop, the user's choice over "Like Hollow Knight and 2 more", and allowed
          three lines once picked: at two, the cut took the rating and the count on 21 of 48 tiles
          at 1440px, and nothing on the user's list needed a fourth. A ceiling, not a target — most
          take two. The count is said only past one, because "and 0 more" says nothing. */}
      {reason !== undefined && (
        <p className="-mt-1 line-clamp-3 text-xs break-words text-muted">
          Because you rated <span className="text-fg">{reason.title}</span> {reason.rating}
          {others.length > 0 && ` and ${others.length} more`}
        </p>
      )}

      {/* Hide from Discover: an eye struck through on the cover's top-right corner, which is the
          chip's on a title on your board, and a title there offers no hide. Picked at the #23
          workshop, with when it shows: under the pointer, with the keyboard anywhere in the tile,
          and always on a phone, where there is no pointer to bring it out.

          After the name in the page though it sits over the cover, so a screen reader hears what
          the tile is before what it does, and Tab goes from the heading — where Load more leaves
          the keyboard — to the mark and then the add. The first button in the tile, which is where
          the page finds it to hand the keyboard back after an Undo.

          Faded rather than made invisible, so it stays in the page for a screen reader and the
          keyboard: visibility: hidden takes a button out of the accessibility tree and the tab
          order both, and Tab arriving from the tile before would pass it by, since nothing in this
          tile would have the keyboard yet to bring it out. group-hover only matches where a
          pointer can hover, which is why a phone needs pointer-coarse to show it.

          Never disabled while its hide is on its way, unlike the add: a button that disables
          itself is blurred by it in Firefox alone, and the keyboard would fall to the top of the
          page. A second press only sends the same hide again, which the server answers as the
          first. */}
      {onBoard === null && onHide !== undefined && (
        <button
          type="button"
          aria-label={`Hide ${hit.title} from Discover`}
          title="Hide from Discover"
          onClick={onHide}
          className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full border border-line bg-surface text-muted opacity-0 shadow-card group-focus-within:opacity-100 group-hover:opacity-100 hover:text-accent pointer-coarse:opacity-100"
        >
          <EyeOff />
        </button>
      )}

      {onBoard === null && (
        // mt-auto sits every control on the row's bottom edge, whichever titles took two lines.
        <AddControl
          hit={hit}
          definition={definition}
          columns={columns}
          adding={adding}
          onAdd={onAdd}
          className="mt-auto w-full bg-surface"
        />
      )}
    </li>
  );
}
