import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect } from 'vitest';

/**
 * index.css as text, for the tests that hold a copy of one of its values to the original.
 *
 * It is the only file in the app that names a colour, so anything that has to repeat one —
 * the pre-paint script's bar colours in index.html, the web manifest — is checked against it
 * here rather than trusted.
 */
export const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** The custom-property declarations inside the first block whose selector line matches. */
export function paletteAfter(marker: string): Record<string, string> {
  const start = css.indexOf(marker);
  expect(start, `no block found for ${marker}`).toBeGreaterThan(-1);

  const body = css.slice(start + marker.length);
  const end = body.indexOf('}');
  const declarations: Record<string, string> = {};

  // Trimmed rather than anchored to the line end: the repository stores CRLF, and a stray \r
  // before the `;` is enough to make a strict anchor match nothing and the comparison vacuous.
  for (const line of body.slice(0, end).split(/\r?\n/)) {
    const match = /^\s*(--[a-z-]+):\s*(.+);\s*$/.exec(line);
    const [, name, value] = match ?? [];
    if (name !== undefined && value !== undefined) {
      declarations[name] = value;
    }
  }

  return declarations;
}

/** A theme's ground: what every page paints behind the board, and what a phone's bar should be. */
export function groundOf(marker: string): string {
  const ground = paletteAfter(marker)['--sunken'];
  expect(ground, `${marker} names no --sunken`).toBeDefined();

  return ground!;
}
