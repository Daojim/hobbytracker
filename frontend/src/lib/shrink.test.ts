import { describe, expect, it } from 'vitest';
import { PICTURE_EDGE, THUMBNAIL_BOX, fitWithin } from './shrink';

/**
 * How big a picture comes out of the shrink, and its thumbnail. The redraw itself needs a canvas,
 * which jsdom does not have, so it is proved in a real browser: see `e2e/pictures.spec.ts`.
 */
describe('fitWithin', () => {
  it('brings a long edge down to 1920 and keeps the shape', () => {
    // A 1440p screenshot, and a phone photo held upright: picked at the #18 workshop, where the
    // user's own snips were already 1920 wide, so only a photo ever shrinks.
    expect(fitWithin(2560, 1440, PICTURE_EDGE, PICTURE_EDGE)).toEqual({ width: 1920, height: 1080 });
    expect(fitWithin(3000, 4000, PICTURE_EDGE, PICTURE_EDGE)).toEqual({ width: 1440, height: 1920 });
  });

  it('never makes a small picture bigger', () => {
    // Symphony's clear file was a 537px snip, and blowing it up would only blur it.
    expect(fitWithin(537, 331, PICTURE_EDGE, PICTURE_EDGE)).toEqual({ width: 537, height: 331 });
  });

  it('makes a thumbnail about 96px tall, and no wider than twice that', () => {
    expect(fitWithin(1920, 1080, THUMBNAIL_BOX.width, THUMBNAIL_BOX.height)).toEqual({
      width: 171,
      height: 96,
    });
    expect(fitWithin(1440, 1920, THUMBNAIL_BOX.width, THUMBNAIL_BOX.height)).toEqual({
      width: 72,
      height: 96,
    });
    // A panorama is held to the box's width, so a card's thumbnail is never a strip across it.
    expect(fitWithin(1920, 200, THUMBNAIL_BOX.width, THUMBNAIL_BOX.height)).toEqual({
      width: 192,
      height: 20,
    });
  });

  it('never rounds an edge away to nothing', () => {
    expect(fitWithin(4000, 1, PICTURE_EDGE, PICTURE_EDGE)).toEqual({ width: 1920, height: 1 });
  });
});
