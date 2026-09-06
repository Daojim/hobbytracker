import type { SearchHit } from '../hobbies';

export interface SearchResultProps {
  hit: SearchHit;
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
export function SearchResult({ hit, onBoard, adding, onAdd }: SearchResultProps) {
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

      {onBoard ? (
        <span className="text-center text-xs text-muted">On your board</span>
      ) : (
        <button
          type="button"
          disabled={adding}
          aria-label={`Add ${hit.title} to backlog`}
          onClick={() => onAdd(hit.id)}
          className="h-7 rounded border border-line px-2 text-xs font-medium hover:bg-hover disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      )}
    </li>
  );
}
