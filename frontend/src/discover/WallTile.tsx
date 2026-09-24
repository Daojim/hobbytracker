import { formatRelease } from '../lib/release';
import { AddControl } from '../search/AddControl';
import { awaitsRelease, boardWords } from '../search/addWords';
import type { AddColumn, HobbyDefinition, SearchHit } from '../hobbies';
import type { LogStatus } from '../api/types';

export interface WallTileProps {
  hit: SearchHit;
  /** The column this title is in on your board, or null when it is not on it. */
  onBoard: LogStatus | null;
  adding: boolean;
  onAdd: (mediaId: number, status: LogStatus) => void;
  /** Where this board can take a title — see `addColumns`. */
  columns: readonly AddColumn[];
  definition: HobbyDefinition;
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
 */
export function WallTile({ hit, onBoard, adding, onAdd, columns, definition }: WallTileProps) {
  const upcoming = awaitsRelease(hit, definition);

  return (
    <li className="flex flex-col gap-1.5">
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
          title a page added, and Tab goes from there to that title's own add. */}
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
