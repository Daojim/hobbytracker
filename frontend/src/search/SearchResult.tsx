import type { Game } from '../api/types';

export interface SearchResultProps {
  game: Game;
  /** Already logged, so adding again would record a replay that never happened. */
  onBoard: boolean;
  adding: boolean;
  onAdd: (mediaId: number) => void;
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
export function SearchResult({ game, onBoard, adding, onAdd }: SearchResultProps) {
  return (
    <li className="flex w-36 shrink-0 flex-col gap-2 rounded-lg border border-card-line bg-surface p-2 shadow-card">
      {game.coverUrl === null ? (
        <span
          aria-hidden="true"
          className="flex aspect-[5/7] w-full items-center justify-center rounded bg-sunken text-3xl font-semibold text-muted"
        >
          {game.title.charAt(0)}
        </span>
      ) : (
        // Empty alt: the title is right beneath it, so the cover only repeats what is already said.
        <img
          src={game.coverUrl}
          alt=""
          className="aspect-[5/7] w-full rounded object-cover"
        />
      )}

      <div className="min-w-0 flex-1">
        {/* line-clamp rather than truncate: two lines is enough for most titles, and a name cut
            off mid-word at one line is how "Hollow Knight" and "Hollow Knight: Silksong" become
            the same tile. */}
        <h3 className="line-clamp-2 text-sm font-medium break-words">{game.title}</h3>

        <div className="mt-1 text-xs text-muted">
          {game.platforms.length > 0 && <p className="truncate">{game.platforms.join(', ')}</p>}
          {game.developers.length > 0 && <p className="truncate">{game.developers.join(', ')}</p>}
        </div>
      </div>

      {onBoard ? (
        <span className="text-center text-xs text-muted">On your board</span>
      ) : (
        <button
          type="button"
          disabled={adding}
          aria-label={`Add ${game.title} to backlog`}
          onClick={() => onAdd(game.id)}
          className="h-7 rounded border border-line px-2 text-xs font-medium hover:bg-hover disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      )}
    </li>
  );
}
