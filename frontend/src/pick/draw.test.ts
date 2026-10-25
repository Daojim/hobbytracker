import { describe, expect, it } from 'vitest';
import {
  WHEEL_SLICES,
  drawWheel,
  genresIn,
  inBand,
  inTheDraw,
  refuse,
  spinFor,
  suggest,
  withoutEstimate,
  type Draw,
} from './draw';
import { GAMES } from '../hobbies/games';
import { libraryItem } from '../test/library';
import type { LibraryItem } from '../api/types';

const GENRES = GAMES.genres;
const BANDS = GAMES.picker!.bands;
const band = (label: string) => BANDS.find((each) => each.label === label)!;

const NOTHING: Draw = { band: null, leftOut: new Set(), refused: new Set() };

/** A seeded random source, so a test about chances draws the same thousands of times every run. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random source that answers these values in turn, then the last one for ever. */
const answering = (...values: number[]) => {
  let at = 0;
  return () => values[Math.min(at++, values.length - 1)]!;
};

const titles = (items: readonly LibraryItem[]) => items.map((item) => item.title);

describe('the bands', () => {
  it('stop where their words say, each starting where the one before it stops', () => {
    // The four the #16 workshop picked from Jimmy's real backlog: an evening and a weekend held
    // none of his six, and a long haul is what split the rest.
    expect(BANDS.map((each) => `${each.label}: ${each.range}`)).toEqual([
      'An evening: under 5 h',
      'A weekend: 5–20 h',
      'A few weeks: 20–50 h',
      'A long haul: 50 h or more',
    ]);

    expect(inBand(4.99, band('An evening'))).toBe(true);
    expect(inBand(5, band('An evening'))).toBe(false);
    expect(inBand(5, band('A weekend'))).toBe(true);
    expect(inBand(19.99, band('A weekend'))).toBe(true);
    expect(inBand(20, band('A few weeks'))).toBe(true);
    expect(inBand(49.99, band('A few weeks'))).toBe(true);
    expect(inBand(50, band('A long haul'))).toBe(true);
    expect(inBand(130.78, band('A long haul'))).toBe(true);
  });

  it('cover every length once, with nothing between them and nothing in two', () => {
    for (const hours of [0.5, 4.99, 5, 12.76, 19.99, 20, 28.37, 49.99, 50, 67.64, 130.78]) {
      expect(BANDS.filter((each) => inBand(hours, each))).toHaveLength(1);
    }
  });

  it('never hold a title with no estimate, which is under Any alone', () => {
    // The column header's rule: a title with no figure is counted, never treated as short.
    expect(BANDS.filter((each) => inBand(null, each))).toEqual([]);
  });
});

describe('what is in the draw', () => {
  const evening = libraryItem({ title: 'Gris', lengthHours: 4.2, genres: ['Adventure'] });
  const weeks = libraryItem({ title: 'Armored Core VI', lengthHours: 28.37, genres: ['Shooter'] });
  const long = libraryItem({
    title: 'Shin Megami Tensei V',
    lengthHours: 67.64,
    genres: ['Adventure', 'Role-playing (RPG)'],
  });
  const untimed = libraryItem({
    title: 'Final Fantasy Resonance',
    lengthHours: null,
    genres: ['Adventure', 'Role-playing (RPG)'],
  });
  const all = [evening, weeks, long, untimed];

  it('is every title with nothing chosen', () => {
    expect(titles(inTheDraw(all, GENRES, NOTHING))).toEqual(titles(all));
  });

  it('is the titles in the band chosen, and none with no estimate', () => {
    expect(titles(inTheDraw(all, GENRES, { ...NOTHING, band: band('A few weeks') }))).toEqual([
      'Armored Core VI',
    ]);
    expect(withoutEstimate(all, GENRES, { ...NOTHING, band: band('A few weeks') })).toBe(1);
  });

  it('counts no title left out for want of an estimate when no band is chosen', () => {
    expect(withoutEstimate(all, GENRES, NOTHING)).toBe(0);
  });

  it('leaves out a genre by the one its card is painted as', () => {
    // Shin Megami Tensei lists Adventure first, and is painted RPG: RPG comes first in the
    // hobby's list, and the list decides. Leaving out RPG leaves it out.
    const draw = inTheDraw(all, GENRES, { ...NOTHING, leftOut: new Set(['Role-playing (RPG)']) });

    expect(titles(draw)).toEqual(['Gris', 'Armored Core VI']);
  });

  it('goes by a genre chosen in the journal over the one IGDB listed first', () => {
    const chosenRpg = libraryItem({
      title: 'Painted RPG',
      genres: ['Shooter'],
      primaryGenre: 'Role-playing (RPG)',
    });
    const chosenAdventure = libraryItem({
      title: 'Painted Adventure',
      genres: ['Role-playing (RPG)', 'Adventure'],
      primaryGenre: 'Adventure',
    });

    const draw = inTheDraw([chosenRpg, chosenAdventure], GENRES, {
      ...NOTHING,
      leftOut: new Set(['Role-playing (RPG)']),
    });

    expect(titles(draw)).toEqual(['Painted Adventure']);
  });

  it('keeps a title painted nothing, whatever is left out', () => {
    const plain = libraryItem({ title: 'Plain', genres: ['Indie'] });

    const draw = inTheDraw([plain], GENRES, { ...NOTHING, leftOut: new Set(['Indie']) });

    expect(titles(draw)).toEqual(['Plain']);
  });

  it('leaves out a title said no to', () => {
    const draw = inTheDraw(all, GENRES, { ...NOTHING, refused: new Set([weeks.mediaId]) });

    expect(titles(draw)).not.toContain('Armored Core VI');
    expect(draw).toHaveLength(3);
  });

  it('counts the genres the titles are painted as, most first', () => {
    expect(genresIn(all, GENRES)).toEqual([
      { genre: 'Role-playing (RPG)', count: 2 },
      { genre: 'Adventure', count: 1 },
      { genre: 'Shooter', count: 1 },
    ]);
  });
});

describe('the wheel', () => {
  const backlog = (count: number) =>
    Array.from({ length: count }, (_, i) => libraryItem({ title: `Game ${i + 1}` }));

  it('holds every title in the draw when they fit', () => {
    const six = backlog(6);

    expect(new Set(titles(drawWheel(six, seeded(1))))).toEqual(new Set(titles(six)));
    expect(drawWheel(six, seeded(1))).toHaveLength(6);
  });

  it(`holds ${WHEEL_SLICES} different titles from a draw too big for it`, () => {
    const wheel = drawWheel(backlog(101), seeded(2));

    expect(wheel).toHaveLength(WHEEL_SLICES);
    expect(new Set(titles(wheel)).size).toBe(WHEEL_SLICES);
  });

  it('gives every title in a big draw the same chance of a slice', () => {
    // Eight in 24 each time, so each title should be on a third of the wheels drawn.
    const draw = backlog(24);
    const counts = new Map<string, number>();
    const random = seeded(16);
    const wheels = 12_000;

    for (let i = 0; i < wheels; i += 1) {
      for (const item of drawWheel(draw, random)) {
        counts.set(item.title, (counts.get(item.title) ?? 0) + 1);
      }
    }

    const expected = (wheels * WHEEL_SLICES) / draw.length;
    for (const title of titles(draw)) {
      expect(Math.abs(counts.get(title)! - expected) / expected).toBeLessThan(0.05);
    }
  });

  it('lands on the slice a random value names', () => {
    const four = backlog(4);

    expect(spinFor(four, () => 0)).toBe(0);
    expect(spinFor(four, () => 0.5)).toBe(2);
    expect(spinFor(four, () => 0.999)).toBe(3);
  });

  it('gives every slice the same chance of being landed on', () => {
    const six = backlog(6);
    const landed = Array.from({ length: 600 }, (_, i) => spinFor(six, () => (i + 0.5) / 600));

    for (let slice = 0; slice < 6; slice += 1) {
      expect(landed.filter((index) => index === slice)).toHaveLength(100);
    }
  });
});

describe('not this one', () => {
  const backlog = (count: number) =>
    Array.from({ length: count }, (_, i) => libraryItem({ title: `Game ${i + 1}` }));

  it('takes the slice off a wheel that holds the whole draw', () => {
    const six = backlog(6);
    const rest = six.filter((_, i) => i !== 2);

    const after = refuse(six, 2, rest, seeded(3));

    expect(titles(after)).toEqual(titles(rest));
  });

  it('fills the slice from the draw when there is more of it than the wheel holds', () => {
    const draw = backlog(12);
    const wheel = draw.slice(0, WHEEL_SLICES);
    const rest = draw.filter((item) => item.title !== 'Game 3');

    const after = refuse(wheel, 2, rest, answering(0));

    // Into the refused slot, so the slices around it stay where they were. Game 9 is the first
    // of the draw that was not on the wheel.
    expect(titles(after)).toEqual([
      'Game 1',
      'Game 2',
      'Game 9',
      'Game 4',
      'Game 5',
      'Game 6',
      'Game 7',
      'Game 8',
    ]);
  });
});

describe('three suggestions', () => {
  const backlog = (count: number) =>
    Array.from({ length: count }, (_, i) => libraryItem({ title: `Game ${i + 1}` }));

  it('are three different titles from the draw', () => {
    const three = suggest(backlog(10), seeded(4));

    expect(three).toHaveLength(3);
    expect(new Set(titles(three)).size).toBe(3);
  });

  it('are three others when asked again, while the draw has six or more', () => {
    const draw = backlog(6);
    const first = suggest(draw, seeded(5));

    const again = suggest(draw, seeded(6), first.map((item) => item.mediaId));

    expect(titles(again).filter((title) => titles(first).includes(title))).toEqual([]);
  });

  it('are as many as there are, from a draw of fewer than three', () => {
    expect(suggest(backlog(2), seeded(7))).toHaveLength(2);
  });
});
