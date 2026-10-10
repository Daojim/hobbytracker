/**
 * Finding the words of a search inside a note, for the two places that show one: a result in the
 * search strip, and the note the journal opens at.
 *
 * **The server decides what matches; this only finds where.** A note is in the results because
 * `NoteService.SearchAsync` found every word in it with `ILIKE`. What is left for the board is
 * which characters to mark and which part of a long note to show, so these agree with the server
 * on what a word is — whatever whitespace separates them — and on case, as nearly as a browser
 * can: a match is found ignoring case, by Unicode's case folding. Where the two would ever
 * disagree, a note is still shown, from its start, with nothing marked.
 *
 * In `lib/` because two areas use it, the search strip and the journal.
 */

/** A stretch of text, and whether it is one of the words searched for. */
export interface MatchRun {
  text: string;
  match: boolean;
}

/**
 * Within this many characters of a note's start, a first match is on the first or second line of
 * a result at every width the board has, and the note is shown from its start.
 */
const SHOWN_FROM_START = 60;

/** Further in, a result starts about this many characters before the first match. */
const LEAD = 40;

/**
 * The words of a search: whatever whitespace separates them, the ideographic space a Japanese
 * keyboard types included. The server's split, `char.IsWhiteSpace`, which `\s` agrees with.
 */
export function wordsOf(query: string): string[] {
  return query.split(/\s+/u).filter((word) => word !== '');
}

/**
 * Every word at once, case ignored, each read as the characters it is — `50%`, `(boss)` and
 * `C:\saves` are text, never a pattern. Longest first, so of two words starting at one place the
 * longer is the one marked.
 */
function anyOf(words: readonly string[]): RegExp | null {
  if (words.length === 0) {
    return null;
  }

  const escaped = [...words]
    .sort((a, b) => b.length - a.length)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  return new RegExp(escaped.join('|'), 'giu');
}

/** The text in stretches, each of the words marked wherever it appears, in any case. */
export function matchRuns(text: string, words: readonly string[]): MatchRun[] {
  const pattern = anyOf(words);
  if (pattern === null) {
    return [{ text, match: false }];
  }

  const runs: MatchRun[] = [];
  let at = 0;

  for (const found of text.matchAll(pattern)) {
    const start = found.index;
    if (start > at) {
      runs.push({ text: text.slice(at, start), match: false });
    }

    runs.push({ text: found[0], match: true });
    at = start + found[0].length;
  }

  if (at < text.length) {
    runs.push({ text: text.slice(at), match: false });
  }

  return runs.length === 0 ? [{ text, match: false }] : runs;
}

/**
 * The part of a note a result shows: all of it on one line, from its start when the first match
 * is near it, and from a word shortly before the match when it is further in, so the match is on
 * the first of the two lines a result has. The ellipsis says the start was left out.
 *
 * Where there is no space to start at — Japanese is written without them — it starts at a
 * character, and never between the two halves of one: an emoji is two UTF-16 units, and half of
 * one is drawn as a box.
 */
export function snippetOf(body: string, words: readonly string[]): string {
  const flat = body.replace(/\s+/gu, ' ').trim();
  const pattern = anyOf(words);
  const first = pattern === null ? -1 : flat.search(pattern);

  if (first <= SHOWN_FROM_START) {
    return flat;
  }

  let from = first - LEAD;
  const unit = flat.charCodeAt(from);
  if (unit >= 0xdc00 && unit <= 0xdfff) {
    from -= 1;
  }

  const space = flat.indexOf(' ', from);
  const start = space !== -1 && space < first ? space + 1 : from;

  return `…${flat.slice(start)}`;
}
