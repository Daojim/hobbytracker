import { describe, expect, it } from 'vitest';
import { hobbyDefinition } from '../hobbies';
import { RIM } from './Wheel';

describe('the wheel', () => {
  it('draws every genre the games board paints as an arc on its rim', () => {
    // RIM is a map of whole class names, because Tailwind reads source text and an interpolated
    // `stroke-genre-${x}` generates nothing. So a genre added to the games list without a line
    // there spins with no arc on its slice, and nothing reports it.
    for (const { name, stripe } of hobbyDefinition('games').genres) {
      expect(RIM[stripe!], `${name} has no arc`).toBe(stripe!.replace(/^bg-/, 'stroke-'));
    }
  });
});
