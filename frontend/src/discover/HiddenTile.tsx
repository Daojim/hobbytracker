import { EyeOff } from './EyeOff';
import type { SearchHit } from '../hobbies';

export interface HiddenTileProps {
  hit: SearchHit;
  /** Takes the hide back, and the tile comes back as it was. */
  onUndo: () => void;
}

/**
 * A title hidden from Discover on this visit, in the place its tile had: a plain card where the
 * cover was, saying so, with Undo, and the name under it in grey.
 *
 * Picked at the #23 workshop on 13 November 2026 over the cover faded with Undo across the add's
 * row, where a double press would have put the game straight back, and over a dashed outline, which
 * read as a cover that had failed to load.
 *
 * It stays until the page is left, as an add leaves its tile with its column on the cover. The wall
 * under it is never asked for again while it is open, and the next visit asks the server, which
 * leaves the game out. Undo is the card's only button, which is where the page finds it to hand the
 * keyboard over after a hide.
 */
export function HiddenTile({ hit, onUndo }: HiddenTileProps) {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex aspect-[5/7] w-full flex-col items-center justify-center gap-2 rounded-md bg-surface px-3 text-center shadow-card">
        <EyeOff className="size-5 text-muted" />
        <p className="text-sm font-medium text-fg">Hidden</p>
        <p className="text-xs text-muted">It won't show up on Discover again.</p>
        <button
          type="button"
          onClick={onUndo}
          aria-label={`Undo hiding ${hit.title}`}
          className="mt-1 h-7 rounded border border-line px-3 text-xs font-medium hover:bg-hover"
        >
          Undo
        </button>
      </div>

      {/* A heading still, so the wall reads as the same list of titles it was, and Load more's
          move to the first new title finds one here as on any tile. */}
      <h3 tabIndex={-1} className="line-clamp-2 text-sm leading-snug font-medium break-words text-muted">
        {hit.title}
      </h3>
    </li>
  );
}
