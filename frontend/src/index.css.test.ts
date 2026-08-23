import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEMES } from './theme/theme';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** The custom-property declarations inside the first block whose selector line matches. */
function paletteAfter(marker: string): Record<string, string> {
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

describe('the palette', () => {
  it('says the same thing for a dark OS as it does for Shelf Dark chosen by hand', () => {
    // These two have to be written twice: `system` stamps no attribute, so it is answered by a
    // media query, and CSS has no way to alias a media query to a selector. Copy-paste that
    // nothing checks is how one of them quietly gets a value the other does not — so this checks
    // it. If they are meant to diverge, this test is the place to say so out loud.
    const viaMediaQuery = paletteAfter(':root:not([data-theme]) {');
    const viaAttribute = paletteAfter("[data-theme='shelf-dark'] {");

    expect(Object.keys(viaMediaQuery).length).toBeGreaterThan(0);
    expect(viaAttribute).toEqual(viaMediaQuery);
  });

  it('gives every theme the app offers a block of its own', () => {
    // A theme in the menu with no palette behind it stamps an attribute nothing answers, and the
    // app renders as unstyled text on an unstyled ground. `system` is the deliberate exception:
    // it is the absence of a choice and has no block by design.
    for (const theme of THEMES) {
      if (theme.value === 'system') {
        continue;
      }

      expect(css, `no palette block for the ${theme.label} theme`).toContain(
        `[data-theme='${theme.value}']`,
      );
    }
  });

  it('gives every theme a color-scheme, which is what themes the rating slider', () => {
    // The one part of a range input no utility can reach. A theme that forgets it renders a
    // light track on a dark drawer — and only in the drawer, which is where it goes unnoticed.
    const blocks = css.split(/\n(?=:root|\[data-theme)/).filter((b) => b.includes('--surface:'));

    expect(blocks.length).toBeGreaterThanOrEqual(4);
    for (const block of blocks) {
      expect(block, `a palette block has no color-scheme:\n${block.slice(0, 80)}`).toMatch(
        /color-scheme:\s*(light|dark);/,
      );
    }
  });
});
