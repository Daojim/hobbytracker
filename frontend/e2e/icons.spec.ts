import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * The pictures a phone installs are the drawings as they stand.
 *
 * `npm run icons` renders the PNGs and the .ico from the three drawings, and they are committed.
 * Change a drawing without running it and nothing else fails: a tab shows the new drawing,
 * because favicon.svg is served as it is, while a phone installs the old pictures. So each
 * picture is held against its drawing, drawn by this browser at the picture's own size.
 *
 * Not in install.spec.ts, which pins the whole of Chromium: that draws the edges of a shape
 * differently from the headless shell icons/render.mjs draws with. Measured on 3 October 2026,
 * up to 8 pixels in 100 came out different there, and at 32px 14 in 1,000 by more than 32
 * levels, over the 1 in 100 allowed below. In this browser a picture of its own drawing differs
 * by more than 32 levels in at most 2 pixels in 10,000, and a picture of the drawing before it in
 * 38 to 52 in 100. A browser channel is set per file, so the check has a file of its own.
 */

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fromDisk = (path: string) => readFileSync(resolve(frontend, path));

// icons/render.mjs's pairs, repeated.
const PICTURES = [
  { drawing: 'icons/icon.svg', picture: 'public/apple-touch-icon.png', size: 180 },
  { drawing: 'icons/icon.svg', picture: 'public/icon-192.png', size: 192 },
  { drawing: 'icons/icon.svg', picture: 'public/icon-512.png', size: 512 },
  { drawing: 'icons/icon-maskable.svg', picture: 'public/icon-maskable-512.png', size: 512 },
  { drawing: 'public/favicon.svg', picture: 'public/favicon.ico', size: 32 },
];

/** The picture's PNG bytes. The .ico is one PNG behind a header that says where it starts. */
function pngOf(picture: string): Buffer {
  const bytes = fromDisk(picture);
  return picture.endsWith('.ico') ? bytes.subarray(bytes.readUInt32LE(18)) : bytes;
}

test('every picture is its drawing as it stands, so a redrawn icon cannot ship the old one', async ({
  page,
}) => {
  for (const { drawing, picture, size } of PICTURES) {
    const differing = await page.evaluate(
      async ({ svg, png, size }) => {
        const pixels = async (src: string) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          const canvas = new OffscreenCanvas(size, size);
          const context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0, size, size);
          return context.getImageData(0, 0, size, size).data;
        };
        const [drawn, rendered] = await Promise.all([pixels(svg), pixels(png)]);

        let count = 0;
        for (let p = 0; p < drawn.length; p += 4) {
          let most = 0;
          for (let k = p; k < p + 4; k++) most = Math.max(most, Math.abs(drawn[k]! - rendered[k]!));
          if (most > 32) count++;
        }
        return count / (size * size);
      },
      {
        svg: `data:image/svg+xml;base64,${fromDisk(drawing).toString('base64')}`,
        png: `data:image/png;base64,${pngOf(picture).toString('base64')}`,
        size,
      },
    );

    expect(differing, `${picture} is not ${drawing}: run npm run icons`).toBeLessThan(0.01);
  }
});
