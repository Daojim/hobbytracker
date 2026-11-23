import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The README's shots, as GitHub's own repo page shows them.
 *
 * Measured there on 22 November 2026, in Chrome and Firefox, light and dark (#30 in
 * docs/plans/games-board-next.md): an image inside a `<picture>` is never a link on the repo page,
 * so nobody can open it bigger, and a link wrapped round a `<picture>` breaks its switch, showing
 * every reader the light one. A Markdown image is a link to its file, and GitHub hides one whose
 * address ends `#gh-light-mode-only` from a dark reader, and `#gh-dark-mode-only` from a light
 * one. So every still is a pair, and pressing the one a reader sees opens their own theme.
 *
 * The pair costs every reader both files, since GitHub fetches the hidden one too, so the wheel is
 * the exception: already shown at its full size, it stays one `<picture>` and one download.
 * Nothing on GitHub fails when any of this is wrong; the README simply shows a reader the other
 * theme, or a shot that does nothing when pressed. These read the README and the files.
 */

const REPO = resolve(process.cwd(), '..');
const SHOTS = resolve(REPO, 'docs', 'shots');
const readme = () => readFileSync(resolve(REPO, 'README.md'), 'utf8').replaceAll('\r\n', '\n');

/** Every still the README shows, as the light and dark Markdown images GitHub picks between. */
const PAIR =
  /!\[([^\]]+)\]\(docs\/shots\/([a-z-]+)-light\.webp#gh-light-mode-only\)\n!\[([^\]]+)\]\(docs\/shots\/([a-z-]+)-dark\.webp#gh-dark-mode-only\)/g;
const pairs = () => [...readme().matchAll(PAIR)].map(([, lightAlt, light, darkAlt, dark]) => ({ lightAlt, light, darkAlt, dark }));

/** A WebP's or a GIF's own width and height, from its header. */
function sizeOf(file: string): [number, number] {
  const b = readFileSync(resolve(SHOTS, file));
  if (b.toString('ascii', 0, 3) === 'GIF') return [b.readUInt16LE(6), b.readUInt16LE(8)];
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (chunk === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  throw new Error(`${file} is neither a WebP nor a GIF`);
}

describe('the README', () => {
  it('writes every still as a light and dark pair, each opening its own theme', () => {
    const named = [...readme().matchAll(/docs\/shots\/[a-z-]+-(?:light|dark)\.webp/g)].length;

    expect(pairs().length).toBeGreaterThan(0);
    // Each still named twice, both times inside a pair: a WebP named anywhere else is either
    // a picture nobody can open or one theme shown to every reader.
    expect(pairs().length * 2).toBe(named);
    for (const { lightAlt, light, darkAlt, dark } of pairs()) {
      expect(dark).toBe(light);
      expect(darkAlt).toBe(lightAlt);
    }
  });

  it('keeps every still out of a <picture>, which the repo page never links', () => {
    const pictures = [...readme().matchAll(/<picture>[\s\S]*?<\/picture>/g)].map(([p]) => p);

    for (const picture of pictures) expect(picture).not.toMatch(/\.webp/);
  });

  it('keeps the wheel one <picture>, a dark source over the light GIF', () => {
    const pictures = [...readme().matchAll(/<picture>[\s\S]*?<\/picture>/g)].map(([p]) => p);

    expect(pictures).toHaveLength(1);
    expect(pictures.join('')).toMatch(
      /<source media="\(prefers-color-scheme: dark\)" srcset="docs\/shots\/wheel-dark\.gif">\s*<img alt="[^"]+" src="docs\/shots\/wheel-light\.gif">/,
    );
    expect(readme()).not.toMatch(/<a[^>]*>\s*<picture>/);
  });

  it('names only files there are, and every file in docs/shots', () => {
    const named = new Set([...readme().matchAll(/docs\/shots\/([a-z-]+\.(?:webp|gif))/g)].map(([, file = '']) => file));

    for (const file of named) expect(existsSync(resolve(SHOTS, file)), file).toBe(true);
    expect([...readdirSync(SHOTS)].sort()).toEqual([...named].sort());
  });

  it('draws each pair the same size, 1,760 wide: twice the mat, so it is sharp at 2x', () => {
    expect(pairs().length).toBeGreaterThan(0);
    for (const { light } of pairs()) {
      expect(sizeOf(`${light}-dark.webp`), light).toEqual(sizeOf(`${light}-light.webp`));
      expect(sizeOf(`${light}-light.webp`)[0], light).toBe(1760);
    }
    expect(sizeOf('wheel-dark.gif')).toEqual(sizeOf('wheel-light.gif'));
  });
});
