/**
 * A picture redrawn the way the app keeps it, in the browser, before it is sent.
 *
 * A screenshot of a 1440p or 4K screen is several megabytes as a PNG, and a phone photo more.
 * Drawn onto a canvas at most `PICTURE_EDGE` on its long edge and saved as WebP at 85, it is a
 * few tens of kilobytes. Picked at the #18 workshop on 30 October 2026, by reading the user's own
 * pictures at each size: 85 matched the originals in 2× crops, and the user's snips are 1920 wide
 * already, so the edge only ever shrinks a photo.
 *
 * **Saving it again keeps only the pixels.** A phone photo loses its location with everything
 * else the file recorded, and the orientation it recorded has to be drawn into the pixels first,
 * so an upright photo stays upright once the record is gone. Both engines do that when they
 * decode it: measured on 30 October 2026, Chromium 151 and Firefox 153 turned a photo by its EXIF
 * whatever `imageOrientation` said, `'none'` included. `'from-image'` says what is wanted rather
 * than causing it, and `e2e/pictures.spec.ts` is what proves the photo arrives upright.
 *
 * A canvas asked for a type it cannot write hands back a PNG, so a browser that cannot write
 * WebP is asked for a JPEG at the same quality instead.
 *
 * jsdom has no canvas, so the component tests replace this module, and `e2e/pictures.spec.ts`
 * proves it in Chromium and in Firefox.
 */

/** The longest edge a picture is kept at. */
export const PICTURE_EDGE = 1920;

/**
 * The box a thumbnail fits in: about 96px tall, which covers a card's 28px at three times the
 * pixels, and no wider than twice that, so a panorama is not a strip across the card.
 */
export const THUMBNAIL_BOX = { width: 192, height: 96 };

const QUALITY = 0.85;

/** A picture as it is sent: the redrawn picture, its thumbnail, and the picture's size. */
export interface ShrunkPicture {
  picture: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
}

/** A picture the browser could not open: an iPhone's HEIC in Firefox, say. */
export class CannotOpenPicture extends Error {
  constructor() {
    super("That picture couldn't be opened, so it wasn't added.");
    this.name = 'CannotOpenPicture';
  }
}

/** A size brought inside a box, keeping its shape, and never made larger. */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Redraws a picture as the app keeps it. Throws {@link CannotOpenPicture} if it cannot be read. */
export async function shrink(file: Blob): Promise<ShrunkPicture> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new CannotOpenPicture();
  }

  try {
    const size = fitWithin(bitmap.width, bitmap.height, PICTURE_EDGE, PICTURE_EDGE);
    const drawn = draw(bitmap, size.width, size.height);

    // From the redrawn picture rather than the original, halving on the way down, because one
    // draw from 1920 to 96 skips most of the pixels it passes over, and the thumbnail shimmers.
    const small = fitWithin(size.width, size.height, THUMBNAIL_BOX.width, THUMBNAIL_BOX.height);
    let step = drawn;
    while (step.width / 2 >= small.width && step.height / 2 >= small.height) {
      step = draw(step, Math.round(step.width / 2), Math.round(step.height / 2));
    }

    return {
      picture: await encode(drawn),
      thumbnail: await encode(draw(step, small.width, small.height)),
      width: size.width,
      height: size.height,
    };
  } finally {
    bitmap.close();
  }
}

function draw(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (context === null) {
    throw new CannotOpenPicture();
  }

  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await toBlob(canvas, 'image/webp');
  return webp.type === 'image/webp' ? webp : toBlob(canvas, 'image/jpeg');
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob === null ? reject(new CannotOpenPicture()) : resolve(blob)),
      type,
      QUALITY,
    );
  });
}
