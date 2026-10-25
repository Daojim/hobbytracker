import { resolveGenre, type Genre, type LengthBand } from '../hobbies';
import type { LibraryItem } from '../api/types';

/**
 * The picker's arithmetic: which titles are in the draw, what goes on the wheel, and where it
 * lands. Nothing here knows about React, so all of it is tested on its own, and the panel only
 * says it.
 *
 * **The pick is made before anything moves.** The panel asks `spinFor` which slice, then tells the
 * wheel where to land, so a test can name the pick with a random value and reduced motion can show
 * the same pick with no spin. Every random choice takes its source as an argument, defaulting to
 * `Math.random`, for the same reason.
 *
 * **Every title in the draw has the same chance**, whatever its size. A wheel holds at most
 * {@link WHEEL_SLICES}, drawn uniformly from the draw, and the spin lands uniformly on one of
 * them: eight in n to be on the wheel, then one in eight to be landed on, which is one in n. The
 * #16 plan's own arithmetic, and `draw.test.ts` counts it.
 */

/**
 * The most titles a wheel holds. Each slice carries a cover, and past eight there is no room on a
 * slice for one: the #16 workshop's renders put eight 44px covers on a 300px wheel.
 */
export const WHEEL_SLICES = 8;

/** A random source: a number from 0 up to, but not including, 1. */
export type Random = () => number;

/** What narrows the draw: a band of length, the genres left out, and the titles said no to. */
export interface Draw {
  band: LengthBand | null;
  /** By the genre's name as its hobby writes it — `Role-playing (RPG)`, never the chip's `RPG`. */
  leftOut: ReadonlySet<string>;
  /** By media id: the titles *Not this one* has taken out since the panel opened. */
  refused: ReadonlySet<number>;
}

/** Whether a length is in a band: from its `min`, up to but not including its `max`. */
export function inBand(hours: number | null, band: LengthBand): boolean {
  return hours !== null && hours >= (band.min ?? 0) && hours < (band.max ?? Infinity);
}

/**
 * The genre a title's card is painted as — the one the picker leaves out — or null for one it is
 * not painted as anything.
 *
 * `resolveGenre`, so a genre chosen in the journal wins over the order IGDB listed them in, and
 * *not another RPG* leaves out what the board shows as an RPG.
 */
export const paintedAs = (item: LibraryItem, genres: readonly Genre[]) =>
  resolveGenre(genres, item.genres, item.primaryGenre);

/** Whether a title gets past the genres left out and the titles said no to. Length aside. */
const kept = (item: LibraryItem, genres: readonly Genre[], { leftOut, refused }: Draw) => {
  const genre = paintedAs(item, genres);
  return !refused.has(item.mediaId) && (genre === null || !leftOut.has(genre));
};

/**
 * The titles a spin or a suggestion can come from, in the order they were handed over.
 *
 * A title painted as nothing is never left out, whatever is pressed: there is no chip for it.
 */
export function inTheDraw(
  items: readonly LibraryItem[],
  genres: readonly Genre[],
  draw: Draw,
): LibraryItem[] {
  return items.filter(
    (item) => kept(item, genres, draw) && (draw.band === null || inBand(item.lengthHours, draw.band)),
  );
}

/**
 * How many titles the band chosen leaves out for having no length at all — titles that would
 * otherwise be in the draw. Nought with no band chosen, where nothing is left out for that.
 */
export function withoutEstimate(
  items: readonly LibraryItem[],
  genres: readonly Genre[],
  draw: Draw,
): number {
  if (draw.band === null) {
    return 0;
  }

  return items.filter((item) => item.lengthHours === null && kept(item, genres, draw)).length;
}

/**
 * Every genre the titles are painted as, with how many of each, most first and then by name. A
 * title painted as nothing is not counted, because there is nothing to leave it out by.
 */
export function genresIn(
  items: readonly LibraryItem[],
  genres: readonly Genre[],
): { genre: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const genre = paintedAs(item, genres);
    if (genre !== null) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }

  return [...counts]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}

/**
 * Up to `count` titles, each set of that many as likely as any other, in an order as random as
 * the choice: the first steps of a Fisher–Yates shuffle, on a copy.
 */
function choose<T>(from: readonly T[], count: number, random: Random): T[] {
  const deck = [...from];
  const take = Math.min(count, deck.length);

  for (let i = 0; i < take; i += 1) {
    const j = i + Math.floor(random() * (deck.length - i));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }

  return deck.slice(0, take);
}

/** What goes on the wheel: the whole draw when it fits, otherwise {@link WHEEL_SLICES} of it. */
export function drawWheel(pool: readonly LibraryItem[], random: Random = Math.random): LibraryItem[] {
  return choose(pool, WHEEL_SLICES, random);
}

/** Which slice a spin lands on, every slice as likely as another. */
export function spinFor(slices: readonly LibraryItem[], random: Random = Math.random): number {
  return Math.min(Math.floor(random() * slices.length), slices.length - 1);
}

/**
 * The wheel after *Not this one*: the slice it landed on goes, and a title from the draw that was
 * not on the wheel takes its place, while there is one. Into the same slot, so the slices around
 * it stay where they were.
 *
 * Still a fair wheel: the seven left are a fair seven of what is left, and the one that joins
 * them is a fair one of the rest. `rest` is the draw without the title said no to.
 */
export function refuse(
  slices: readonly LibraryItem[],
  index: number,
  rest: readonly LibraryItem[],
  random: Random = Math.random,
): LibraryItem[] {
  const left = slices.filter((_, at) => at !== index);
  const onWheel = new Set(left.map((item) => item.mediaId));
  const off = rest.filter((item) => !onWheel.has(item.mediaId));

  if (off.length === 0) {
    return left;
  }

  const joins = off[Math.floor(random() * off.length)]!;
  return [...left.slice(0, index), joins, ...left.slice(index)];
}

/**
 * Three titles from the draw, or as many as it has. Asked again, three others, while the draw has
 * three it has not just shown.
 */
export function suggest(
  pool: readonly LibraryItem[],
  random: Random = Math.random,
  shown: readonly number[] = [],
): LibraryItem[] {
  const fresh = pool.filter((item) => !shown.includes(item.mediaId));
  return choose(fresh.length >= 3 ? fresh : pool, 3, random);
}
