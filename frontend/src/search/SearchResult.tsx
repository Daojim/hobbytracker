import type { Game } from '../api/types';

export interface SearchResultProps {
  game: Game;
  /** Already logged, so adding again would record a replay that never happened. */
  onBoard: boolean;
  adding: boolean;
  onAdd: (mediaId: number) => void;
}

export function SearchResult({ game, onBoard, adding, onAdd }: SearchResultProps) {
  return (
    <li className="flex gap-3 rounded border border-line-soft bg-surface p-3">
      {game.coverUrl === null ? (
        <span
          aria-hidden="true"
          className="flex h-20 w-14 shrink-0 items-center justify-center rounded bg-sunken text-2xl font-semibold text-muted"
        >
          {game.title.charAt(0)}
        </span>
      ) : (
        // Empty alt: the title is right beside it, so the cover only repeats what is already said.
        <img src={game.coverUrl} alt="" className="h-20 w-14 shrink-0 rounded object-cover" />
      )}

      <div className="min-w-0 flex-1">
        <h3 className="font-medium break-words">{game.title}</h3>

        <div className="mt-1 space-y-0.5 text-xs text-muted">
          {game.platforms.length > 0 && <p>{game.platforms.join(', ')}</p>}
          {game.developers.length > 0 && <p>{game.developers.join(', ')}</p>}
        </div>
      </div>

      {onBoard ? (
        <span className="self-center text-xs text-muted">On your board</span>
      ) : (
        <button
          type="button"
          disabled={adding}
          aria-label={`Add ${game.title} to backlog`}
          onClick={() => onAdd(game.id)}
          className="h-8 shrink-0 self-center rounded border border-line px-3 text-xs font-medium hover:bg-hover disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add to backlog'}
        </button>
      )}
    </li>
  );
}
