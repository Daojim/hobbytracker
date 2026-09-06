import { describe, expect, it } from 'vitest';
import { automaticGenre, genreStripe, hobbyDefinition, resolveGenre } from './index';

const GAMES = hobbyDefinition('games').genres;
const MOVIES = hobbyDefinition('movies').genres;

describe('automaticGenre', () => {
  it('paints a game as the most specific genre it has', () => {
    // The list is ordered specific before generic, so this is the ordering doing its job rather
    // than a coincidence of what IGDB happened to return first. IGDB's own order is not
    // meaningfulness order.
    expect(automaticGenre(GAMES, ['Adventure', 'Indie', 'Platform'])).toBe('Platform');
    expect(automaticGenre(GAMES, ['Indie', 'Shooter'])).toBe('Shooter');
  });

  it('puts Visual Novel above everything, including RPG', () => {
    // The one placement in the list worth defending. It names the form rather than the subject:
    // a game that is one is an evening of reading however else it is tagged.
    expect(automaticGenre(GAMES, ['Adventure', 'Puzzle', 'Visual Novel'])).toBe('Visual Novel');
    expect(automaticGenre(GAMES, ['Role-playing (RPG)', 'Visual Novel'])).toBe('Visual Novel');
  });

  it('paints nothing rather than picking a colour at random', () => {
    expect(automaticGenre(GAMES, ['Indie', 'Arcade'])).toBeNull();
    expect(automaticGenre(GAMES, [])).toBeNull();
    expect(automaticGenre(GAMES, null)).toBeNull();
  });

  it('matches on the trimmed, lower-cased name', () => {
    // So a provider renaming a parenthetical does not silently unpaint a genre.
    expect(automaticGenre(GAMES, ['  shooter '])).toBe('Shooter');
  });

  it('reads a film against its own list, not games', () => {
    // The two vocabularies overlap barely at all, which is the point of the list being a
    // property of the hobby: TMDB's "Science Fiction" is nowhere in IGDB's twenty-odd.
    expect(automaticGenre(MOVIES, ['Drama', 'Science Fiction'])).toBe('Science Fiction');
    expect(automaticGenre(GAMES, ['Drama', 'Science Fiction'])).toBeNull();
  });

  it('puts the genres that name a form above the ones that name a subject', () => {
    // Documentary and Animation are Visual Novel's argument applied to film: a documentary is a
    // documentary whatever it is about, where Drama is on about half of TMDB's catalogue.
    expect(automaticGenre(MOVIES, ['Drama', 'Documentary'])).toBe('Documentary');
    expect(automaticGenre(MOVIES, ['Action', 'Animation', 'Comedy'])).toBe('Animation');
    expect(automaticGenre(MOVIES, ['Drama', 'Romance'])).toBe('Romance');
  });
});

describe('resolveGenre', () => {
  it('lets a chosen genre win', () => {
    expect(resolveGenre(GAMES, ['Adventure', 'Platform'], 'Adventure')).toBe('Adventure');
  });

  it('falls back to the automatic pick when nothing was chosen', () => {
    expect(resolveGenre(GAMES, ['Adventure', 'Platform'], null)).toBe('Platform');
  });

  it('keeps a chosen genre the list no longer mentions', () => {
    // The platform select's rule, for the platform select's reason: a value that was true when
    // it was chosen has to outlive the list it came from.
    expect(resolveGenre(GAMES, ['Shooter'], 'Metroidvania')).toBe('Metroidvania');
    expect(resolveGenre(GAMES, null, 'Indie')).toBe('Indie');
  });
});

describe('genreStripe', () => {
  it('gives a painted genre its whole class name', () => {
    // Whole, never interpolated: Tailwind scans source text, so `bg-genre-${x}` generates
    // nothing and the stripe renders transparent with no symptom at all.
    expect(genreStripe(GAMES, 'Shooter')).toBe('bg-genre-shooter');
    expect(genreStripe(GAMES, 'Visual Novel')).toBe('bg-genre-visual-novel');
  });

  it('paints nothing for a genre it does not know', () => {
    expect(genreStripe(GAMES, 'Metroidvania')).toBeNull();
    expect(genreStripe(GAMES, null)).toBeNull();
  });

  it('names a film genre without painting it yet', () => {
    // The interim state while the palette is workshopped: the name resolves, so the card prints
    // it and the drawer offers it, and the stripe stays the transparent placeholder an ungenred
    // title already gets. docs/design.md asks that a hue be measured before it is added.
    expect(automaticGenre(MOVIES, ['Horror'])).toBe('Horror');
    expect(genreStripe(MOVIES, 'Horror')).toBeNull();
  });
});

describe('hobbyDefinition', () => {
  it('falls back to games rather than throwing on a slug with no board', () => {
    // Reaching here with an unbuilt slug is a routing mistake — BoardPage redirects one before
    // any of this renders — and the wrong words are a far better failure than a stack trace.
    expect(hobbyDefinition('books').slug).toBe('games');
    expect(hobbyDefinition('nonsense').slug).toBe('games');
  });

  it('gives each hobby its own word for a column and a length', () => {
    // The wire vocabulary is untouched: InProgress is InProgress on both boards, because
    // cross-hobby views depend on the four statuses being identical everywhere.
    expect(hobbyDefinition('games').columnLabel.InProgress).toBe('Playing');
    expect(hobbyDefinition('movies').columnLabel.InProgress).toBe('Watching');
    expect(hobbyDefinition('movies').columnLabel.Completed).toBe('Watched');

    expect(hobbyDefinition('games').lengthLabel).toBe('Time to beat');
    expect(hobbyDefinition('movies').lengthLabel).toBe('Runtime');
  });

  it('reads one length field two ways', () => {
    // The board row carries hours whichever hobby answered, so the card and sort=length cannot
    // drift apart. What that number means, and how it is said, is the hobby's.
    expect(hobbyDefinition('games').formatLength(41.82)).toBe('~41.82 h');
    expect(hobbyDefinition('movies').formatLength(1.93)).toBe('1 h 56 m');
  });
});
