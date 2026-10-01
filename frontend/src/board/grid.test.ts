import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SIDE_BY_SIDE } from './grid';

/** A breakpoint as a stylesheet declares it, or undefined where it says nothing about it. */
const breakpoint = (file: string, name: string) =>
  new RegExp(`--breakpoint-${name}:\\s*([^;]+);`).exec(
    readFileSync(resolve(process.cwd(), file), 'utf8'),
  )?.[1];

describe('SIDE_BY_SIDE', () => {
  it("is Tailwind's md, which every md: class on the board answers to", () => {
    // Two copies of one number, one read by the browser and one by React. Between them the board
    // is one column at a time below the line and side by side above it, so a band of widths
    // where they disagreed would draw the switcher over two columns, or one column with nothing
    // to switch it. The app's own stylesheet wins where it names one, which is how Tailwind
    // resolves it too.
    const md = breakpoint('src/index.css', 'md') ?? breakpoint('node_modules/tailwindcss/theme.css', 'md');

    expect(md).toBeDefined();
    expect(SIDE_BY_SIDE).toBe(`(min-width: ${md})`);
  });
});
