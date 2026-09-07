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
  { slug: 'movies', label: 'Movies', ready: true },
  { slug: 'tv', label: 'TV', ready: true },
  { slug: 'anime', label: 'Anime', ready: false },
  { slug: 'books', label: 'Books', ready: false },
  { slug: 'music', label: 'Music', ready: false },
] as const;

export type Hobby = (typeof HOBBIES)[number]['slug'];

/**
 * Where a hobby's board lives, and the one place that knows the shape of the address.
 *
 * The slug is in the path rather than in the page, so a board is a thing you can link to, come
 * back to and see in the address bar. `/board` on its own redirects here rather than being
 * retired — every bookmark, every Playwright `goto` and `signInUrl`'s default point at it, and
 * an address that outlived its page should land somewhere, which is the same courtesy `/search`
 * already gets.
 */
export const boardPath = (slug: Hobby): string => `/board/${slug}`;

/** Where an unknown or unbuilt slug is sent. Games is the board that exists. */
export const DEFAULT_HOBBY: Hobby = 'games';

/** Whether a slug from the address bar names a board somebody can actually use. */
export const isReadyHobby = (slug: string | undefined): slug is Hobby =>
  HOBBIES.some((hobby) => hobby.slug === slug && hobby.ready);
