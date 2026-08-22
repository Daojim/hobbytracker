/**
 * Which genre stands for a game, and what colour that is.
 *
 * One ordered list doing both jobs. The order decides the automatic pick — the first entry a
 * game has wins — and each entry carries its own colour, so adding a genre is one line here and
 * one token in index.css.
 *
 * Deliberately on the client rather than the server. A priority order there plus a palette here
 * would be two orderings that have to agree, which is the failure this codebase has already
 * paid for once with which pass the board calls current. Here they are the same array.
 *
 * Ordered specific before generic. `Indie`, `Arcade` and most of the rest of IGDB's vocabulary
 * are absent on purpose: they say almost nothing about what an evening with the game is like,
 * and ten hues is already more than anyone can tell apart at a glance — which is why the card
 * prints the genre's name as well as painting it.
 */
export interface Genre {
  /** IGDB's own name. Matched case-insensitively; this is the exact string IGDB returns. */
  igdb: string;
  /** A whole class name. Tailwind scans source text, so an interpolated one is never built. */
  stripe: string;
}

export const GENRES: readonly Genre[] = [
  { igdb: 'Role-playing (RPG)', stripe: 'bg-genre-rpg' },
  { igdb: 'Shooter', stripe: 'bg-genre-shooter' },
  { igdb: 'Platform', stripe: 'bg-genre-platform' },
  { igdb: 'Fighting', stripe: 'bg-genre-fighting' },
  { igdb: "Hack and slash/Beat 'em up", stripe: 'bg-genre-brawler' },
  { igdb: 'Racing', stripe: 'bg-genre-racing' },
  { igdb: 'Strategy', stripe: 'bg-genre-strategy' },
  { igdb: 'Simulator', stripe: 'bg-genre-simulator' },
  { igdb: 'Puzzle', stripe: 'bg-genre-puzzle' },
  { igdb: 'Adventure', stripe: 'bg-genre-adventure' },
];

const normalise = (name: string) => name.trim().toLowerCase();

/**
 * The genre this game would be painted as if nobody chose one: the first entry above that it
 * has. Null when it has none of them, which is honest rather than a colour picked at random.
 */
export function automaticGenre(genres: readonly string[] | null): string | null {
  if (genres === null) {
    return null;
  }

  const has = new Set(genres.map(normalise));
  return GENRES.find((genre) => has.has(normalise(genre.igdb)))?.igdb ?? null;
}

/**
 * The genre that stands for a game. A chosen one always wins, even one the game no longer lists
 * or one this file does not paint — the platform select's rule, for the platform select's
 * reason: a value that was true when it was chosen has to outlive the list it came from.
 */
export function resolveGenre(
  genres: readonly string[] | null,
  primaryGenre: string | null,
): string | null {
  return primaryGenre ?? automaticGenre(genres);
}

/** The stripe class for a genre, or null for one that is not painted. */
export function genreStripe(genre: string | null): string | null {
  if (genre === null) {
    return null;
  }

  return GENRES.find((known) => normalise(known.igdb) === normalise(genre))?.stripe ?? null;
}
