import { describe, expect, it } from 'vitest';
import { HOBBIES } from '../shell/hobbies';
import { hobbyDefinition } from './index';

/**
 * What a tile's ✓ asks before a title goes straight to the finished column (#24), on every board.
 *
 * Every board at once, round one's pick at the #24 workshop, and in the hobby's own verb, round
 * three's: a film is watched, where a game, a show and an anime are finished. The verb is a word
 * in `hobbies/`, never a branch on the slug.
 */
describe('whenFinished', () => {
  const ready = HOBBIES.filter((hobby) => hobby.ready).map((hobby) => hobby.slug);

  it('is asked by every hobby that is built', () => {
    // Four, so a hobby that never reached the cases below would not leave them passing.
    expect(ready).toEqual(['games', 'movies', 'tv', 'anime']);
  });

  it.each([
    ['games', 'When did you finish it?'],
    ['movies', 'When did you watch it?'],
    ['tv', 'When did you finish it?'],
    ['anime', 'When did you finish it?'],
  ] as const)('on %s, asks “%s”', (slug, question) => {
    expect(hobbyDefinition(slug).whenFinished).toBe(question);
  });
});
