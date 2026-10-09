import { describe, expect, it } from 'vitest';
import { HOBBIES } from '../shell/hobbies';
import { hobbyDefinition } from './index';

/**
 * What a card's *Remove from board* says it will take, on every board.
 *
 * A title with several passes names them in the hobby's own word. One pass is a title leaving the
 * board, and since #15 it says its notes go too when it has any: the drawer counts them when its
 * last pass is deleted, and this is the same delete from the board.
 */
describe('describeRemoval', () => {
  const ready = HOBBIES.filter((hobby) => hobby.ready).map((hobby) => hobby.slug);

  it('is said by every hobby that is built', () => {
    // Four, so a hobby that never reached the loops below would not leave them passing.
    expect(ready).toEqual(['games', 'movies', 'tv', 'anime']);
  });

  it.each(ready)('on %s, says the notes go too when the only pass has some', (slug) => {
    expect(hobbyDefinition(slug).describeRemoval('Celeste', 1, true)).toBe(
      'Takes Celeste off your board, and its notes.',
    );
  });

  it.each(ready)('on %s, says nothing about notes when the only pass has none', (slug) => {
    expect(hobbyDefinition(slug).describeRemoval('Celeste', 1, false)).toBe(
      'Takes Celeste off your board.',
    );
  });
});
