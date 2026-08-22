import { describe, expect, it } from 'vitest';
import { GENRES, automaticGenre, genreStripe, resolveGenre } from './genres';

describe('automaticGenre', () => {
  it('picks the most specific genre the game has, not the first IGDB listed', () => {
    // IGDB's order is essentially id order. Ours runs specific before generic, so a game that
    // is Platform, Adventure and Indie reads as Platform rather than as one of the two words
    // that describe half the catalogue.
    expect(automaticGenre(['Adventure', 'Indie', 'Platform'])).toBe('Platform');
    expect(automaticGenre(['Indie', 'Shooter'])).toBe('Shooter');
  });

  it('has nothing to say about a game whose genres we do not paint', () => {
    // Indie and Arcade are deliberately absent from the list: they say almost nothing about
    // what an evening with the game is like.
    expect(automaticGenre(['Indie', 'Arcade'])).toBeNull();
    expect(automaticGenre([])).toBeNull();
    expect(automaticGenre(null)).toBeNull();
  });

  it('matches IGDB names case-insensitively and ignoring surrounding space', () => {
    expect(automaticGenre(['  shooter '])).toBe('Shooter');
  });
});

describe('resolveGenre', () => {
  it('prefers the genre you chose over the automatic pick', () => {
    expect(resolveGenre(['Adventure', 'Platform'], 'Adventure')).toBe('Adventure');
  });

  it('falls back to the automatic pick when nothing was chosen', () => {
    expect(resolveGenre(['Adventure', 'Platform'], null)).toBe('Platform');
  });

  it('keeps a chosen genre the game no longer lists, and one we do not paint', () => {
    // The same rule the platform select follows: a value that was true when it was chosen has
    // to outlive the list it was chosen from.
    expect(resolveGenre(['Shooter'], 'Metroidvania')).toBe('Metroidvania');
    expect(resolveGenre(null, 'Indie')).toBe('Indie');
  });
});

describe('genreStripe', () => {
  it('gives every painted genre its own whole class name', () => {
    // Whole literals, because Tailwind v4 scans source text: a class built by interpolation is
    // never generated and the stripe silently renders transparent.
    const stripes = GENRES.map((genre) => genre.stripe);

    expect(new Set(stripes).size).toBe(GENRES.length);
    for (const stripe of stripes) {
      expect(stripe).toMatch(/^bg-genre-[a-z]+$/);
    }
  });

  it('paints nothing for a genre outside the list, or for none at all', () => {
    expect(genreStripe('Metroidvania')).toBeNull();
    expect(genreStripe(null)).toBeNull();
  });

  it('finds the stripe for a genre by its IGDB name', () => {
    expect(genreStripe('Shooter')).toBe('bg-genre-shooter');
  });
});
