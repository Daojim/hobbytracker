// Renders the icons in public/ from the drawings. `npm run icons` after changing a drawing.
//
// The PNGs and the .ico are committed, so neither a build nor the Docker image needs a browser.
// Chromium does the drawing because it is already here for the e2e suite.
//
// Three drawings, because the places an icon goes want different things:
//
//   icon.svg           full bleed, for the platforms that round the corners themselves:
//                      an iPhone's home screen, and a manifest icon of purpose "any"
//   icon-maskable.svg  the same, smaller, inside the safe circle a launcher crops to
//   public/favicon.svg simplified for 16px, on a rounded tile. Served as it stands
//
// What each output must be (sizes, types, which purpose) is held by src/manifest.test.ts and
// e2e/install.spec.ts rather than by anything here.

import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const icons = new URL('./', import.meta.url);
const publicDir = new URL('../public/', import.meta.url);

const RENDERS = [
  { from: new URL('icon.svg', icons), to: 'apple-touch-icon.png', size: 180 },
  { from: new URL('icon.svg', icons), to: 'icon-192.png', size: 192 },
  { from: new URL('icon.svg', icons), to: 'icon-512.png', size: 512 },
  { from: new URL('icon-maskable.svg', icons), to: 'icon-maskable-512.png', size: 512 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

/** One drawing at one size, as PNG bytes. Transparent where the drawing is. */
async function png(svgUrl, size) {
  const svg = readFileSync(svgUrl).toString('base64');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html, body { margin: 0; background: transparent; }</style>
     <img src="data:image/svg+xml;base64,${svg}" width="${size}" height="${size}" alt="">`,
  );
  await page.locator('img').evaluate((img) => img.decode());

  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

/**
 * An .ico holding one 32px image, which the format allows to be a PNG: a six-byte header and a
 * sixteen-byte entry in front of it, and nothing else.
 */
function ico(image) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 is an icon, 2 a cursor
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0); // width
  entry.writeUInt8(32, 1); // height
  entry.writeUInt8(0, 2); // no palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(image.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12); // where the image starts

  return Buffer.concat([header, entry, image]);
}

for (const { from, to, size } of RENDERS) {
  writeFileSync(new URL(to, publicDir), await png(from, size));
  console.log(`${to}  ${size}x${size}`);
}

writeFileSync(new URL('favicon.ico', publicDir), ico(await png(new URL('favicon.svg', publicDir), 32)));
console.log('favicon.ico  32x32');

await browser.close();
