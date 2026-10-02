import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { groundOf } from './test/palette';

/**
 * What a phone installs, and what a browser tab shows.
 *
 * All of it is files in public/, which Vite copies to the root of dist as they are: no
 * fingerprint, no import, nothing a build would refuse. So nothing fails when one is wrong.
 * Caddy answers any path it has no file for with index.html and a 200, which means a manifest
 * naming an icon that is not there is handed a web page where the picture should be, and the
 * phone quietly draws something of its own instead. These read the files the way a browser
 * would have to; e2e/install.spec.ts asks Chrome itself.
 */

const textOf = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const publicFile = (href: string) => resolve(process.cwd(), 'public', href.replace(/^\//, ''));

const head = () => new DOMParser().parseFromString(textOf('index.html'), 'text/html').head;
const hrefOf = (selector: string) => head().querySelector(selector)?.getAttribute('href') ?? undefined;

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface Manifest {
  name: string;
  short_name: string;
  id: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: ManifestIcon[];
}

function manifest(): Manifest {
  const href = hrefOf('link[rel="manifest"]');
  expect(href, 'index.html links no manifest').toBeDefined();

  return JSON.parse(readFileSync(publicFile(href!), 'utf8')) as Manifest;
}

/** Width x height out of a PNG's header, once it has been shown to be a PNG at all. */
function pngSize(path: string): string {
  expect(existsSync(path), `${path} does not exist`).toBe(true);

  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 8).toString('hex'), `${path} is not a PNG`).toBe('89504e470d0a1a0a');

  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

/**
 * The fill of the first shape drawn on a drawing's canvas, which in each of these is the
 * ground. Not merely the first <rect> in the file: a clip path's lives in <defs>, above it.
 */
function groundOfDrawing(path: string): string | undefined {
  const svg = new DOMParser().parseFromString(textOf(path), 'image/svg+xml');

  return svg.documentElement.querySelector(':scope > rect')?.getAttribute('fill') ?? undefined;
}

describe('index.html', () => {
  it('links a manifest, a tab icon, and an icon for an iPhone’s home screen', () => {
    expect(hrefOf('link[rel="manifest"]')).toBe('/manifest.webmanifest');
    expect(hrefOf('link[rel="icon"][type="image/svg+xml"]')).toBe('/favicon.svg');
    expect(hrefOf('link[rel="icon"][sizes="32x32"]')).toBe('/favicon.ico');
    expect(hrefOf('link[rel="apple-touch-icon"]')).toBe('/apple-touch-icon.png');
  });

  it('names only files that exist', () => {
    const links = head().querySelectorAll(
      'link[rel="manifest"], link[rel~="icon"], link[rel="apple-touch-icon"]',
    );
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const href = link.getAttribute('href')!;
      expect(existsSync(publicFile(href)), `${href} is not in public/`).toBe(true);
    }
  });

  it('gives an iPhone the 180px icon its home screen asks for', () => {
    expect(pngSize(publicFile('/apple-touch-icon.png'))).toBe('180x180');
  });

  it('keeps a 32px .ico for whatever still asks for /favicon.ico by name', () => {
    const path = publicFile('/favicon.ico');
    expect(existsSync(path), 'there is no favicon.ico').toBe(true);

    const ico = readFileSync(path);
    expect(ico.readUInt16LE(2), 'not an icon file').toBe(1);
    expect(ico.readUInt16LE(4), 'not exactly one image').toBe(1);
    expect([ico[6], ico[7]]).toEqual([32, 32]);

    const offset = ico.readUInt32LE(18);
    expect(ico.subarray(offset, offset + 8).toString('hex'), 'the image is not a PNG').toBe(
      '89504e470d0a1a0a',
    );
  });
});

describe('the manifest', () => {
  it('names the app, and opens it on the board as an app of its own', () => {
    expect(manifest()).toMatchObject({
      name: 'HobbyTracker',
      short_name: 'HobbyTracker',
      id: '/',
      start_url: '/board',
      scope: '/',
      display: 'standalone',
    });
  });

  it('names plain icons at 192px and 512px, the two sizes Chrome’s install criteria ask for', () => {
    // Chrome itself is more forgiving: asked in e2e/install.spec.ts, it installs with one plain
    // icon of 144px or more. The criteria ask for both, and an install that holds only because
    // Chrome is lenient today is not one to rely on.
    const plain = manifest()
      .icons.filter((icon) => (icon.purpose ?? 'any') === 'any')
      .map((icon) => icon.sizes);

    expect(plain).toEqual(expect.arrayContaining(['192x192', '512x512']));
  });

  it('gives Android a maskable icon, drawn to be cropped to whatever shape a launcher uses', () => {
    expect(manifest().icons.filter((icon) => icon.purpose === 'maskable')).toHaveLength(1);
  });

  it('names icons that are PNGs of the size it says', () => {
    for (const icon of manifest().icons) {
      expect(icon.type, icon.src).toBe('image/png');
      expect(pngSize(publicFile(icon.src)), icon.src).toBe(icon.sizes);
    }
  });

  it('starts the app on the default theme’s ground, which is also the icon’s', () => {
    // background_color is the splash, shown before any of the app has loaded, and theme_color
    // is the bar until the page's own <meta name="theme-color"> takes over. Neither can follow
    // a stored theme, so both are what System shows in daylight. The icon was drawn on that
    // same paper, so the splash, the icon and the default theme are one colour.
    const ground = groundOf("[data-theme='shelf-light'] {");

    expect(manifest().theme_color).toBe(ground);
    expect(manifest().background_color).toBe(ground);

    for (const drawing of ['icons/icon.svg', 'icons/icon-maskable.svg', 'public/favicon.svg']) {
      expect(existsSync(resolve(process.cwd(), drawing)), `${drawing} does not exist`).toBe(true);
      expect(groundOfDrawing(drawing), drawing).toBe(ground);
    }
  });
});
