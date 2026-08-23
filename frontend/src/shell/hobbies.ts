/**
 * The six hobbies the app is for, and which of them exist yet.
 *
 * The slugs are not decorative — they are what `?hobby=` is filtered on, and `LibraryController`
 * answers a 400 for anything not in `hobby_lu`. All six are seeded (see `SeedData.Apply`), so the
 * taxonomy is fixed and app-owned; these are copies of those names and must stay copies. There is
 * no `/api/hobbies` endpoint to read them from, which is the same reason `THEMES` is a literal
 * list rather than something fetched.
 *
 * `ready` is what the nav dims. It is a fact about how much of the app is built, not a preference
 * and not a permission, so it lives beside the name rather than in a component: when movies land,
 * this flag and a route are the change, and nothing else in the header moves.
 *
 * The order is the order the phases are planned in, which is also roughly the order of how much
 * of each anyone logs.
 */
export const HOBBIES = [
  { slug: 'games', label: 'Games', ready: true },
  { slug: 'movies', label: 'Movies', ready: false },
  { slug: 'tv', label: 'TV', ready: false },
  { slug: 'anime', label: 'Anime', ready: false },
  { slug: 'books', label: 'Books', ready: false },
  { slug: 'music', label: 'Music', ready: false },
] as const;

export type Hobby = (typeof HOBBIES)[number]['slug'];

/**
 * Where a hobby's board lives.
 *
 * Games is the board, full stop, because it is the only one — so it keeps the bare `/board` that
 * every bookmark and every spec already points at. The second live hobby is what makes this a
 * `/board/:hobby` parameter, and this function is the one place that has to learn it.
 */
export const boardPath = (slug: Hobby): string => (slug === 'games' ? '/board' : `/board/${slug}`);
