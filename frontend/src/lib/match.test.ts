import { describe, expect, it } from 'vitest';
import { matchRuns, snippetOf, wordsOf } from './match';

describe('wordsOf', () => {
  it('splits a search on whatever whitespace separates its words', () => {
    // The server's split, so the words marked are the words the notes were found by. The
    // ideographic space is what a Japanese keyboard types for a space.
    expect(wordsOf('  temple\tboss \u3000ボス  ')).toEqual(['temple', 'boss', 'ボス']);
  });

  it('keeps every other character, because each word is matched as the characters it is', () => {
    expect(wordsOf('50% a_b C:\\saves')).toEqual(['50%', 'a_b', 'C:\\saves']);
  });

  it('finds no words in nothing', () => {
    expect(wordsOf('   ')).toEqual([]);
  });
});

describe('matchRuns', () => {
  it('marks every place a word appears, in any case, keeping the text as it was written', () => {
    expect(matchRuns('Boss rush, then the BOSS.', ['boss'])).toEqual([
      { text: 'Boss', match: true },
      { text: ' rush, then the ', match: false },
      { text: 'BOSS', match: true },
      { text: '.', match: false },
    ]);
  });

  it('marks each word of the search, wherever it is', () => {
    expect(matchRuns('an hour on the boss', ['boss', 'hour'])).toEqual([
      { text: 'an ', match: false },
      { text: 'hour', match: true },
      { text: ' on the ', match: false },
      { text: 'boss', match: true },
    ]);
  });

  it('marks the longer of two words that start in the same place', () => {
    // "the" and "there": shortest first would mark "the" and leave "re" plain.
    expect(matchRuns('there', ['the', 'there'])).toEqual([{ text: 'there', match: true }]);
  });

  it.each([
    ['50%', '50% through'],
    ['(boss)', 'the (boss) fight'],
    ['a.b', 'axb then a.b'],
    ['C:\\saves', 'backed up C:\\saves'],
    ['[1]', 'footnote [1]'],
  ])('reads %s as the characters it is, never as a pattern', (word, text) => {
    const marked = matchRuns(text, [word]).filter((run) => run.match);

    expect(marked).toEqual([{ text: word, match: true }]);
  });

  it('marks Japanese, which has no case and no spaces', () => {
    expect(matchRuns('ボス戦がきつい。', ['ボス'])).toEqual([
      { text: 'ボス', match: true },
      { text: '戦がきつい。', match: false },
    ]);
  });

  it('leaves the text whole when no word is in it, or there are no words', () => {
    expect(matchRuns('Started on the Switch 2.', ['boss'])).toEqual([
      { text: 'Started on the Switch 2.', match: false },
    ]);
    expect(matchRuns('Started on the Switch 2.', [])).toEqual([
      { text: 'Started on the Switch 2.', match: false },
    ]);
  });
});

describe('snippetOf', () => {
  it('gives a short note whole, on one line', () => {
    // A result is two lines at most and says nothing about a note's own line breaks; the
    // journal it opens shows the note as it was written.
    expect(snippetOf('- Mantis Lords first try\n- Pantheon 5\n\nstill', ['pantheon'])).toBe(
      '- Mantis Lords first try - Pantheon 5 still',
    );
  });

  it('starts at the beginning when the first match is near it', () => {
    const body = 'Bellhart at last. Spent an hour on the boss above the town, and the trick was patience.';

    expect(snippetOf(body, ['boss'])).toBe(body);
  });

  it('starts at a word shortly before a match further in, and says it has', () => {
    // So the match is on the first of the two lines a result shows, at any width the board has.
    const body =
      "Hearts of Stone done. O'Dimm is the best villain in the series, and the boss fight against the Caretaker took an hour.";

    expect(snippetOf(body, ['boss'])).toBe(
      '…best villain in the series, and the boss fight against the Caretaker took an hour.',
    );
  });

  it('starts from the first match of any word, not of the first word', () => {
    const body =
      'Two hours with no map and no lantern, then the bellway, then the long climb up the tower, then an hour on the boss.';

    expect(snippetOf(body, ['boss', 'climb'])).toBe(
      '…then the bellway, then the long climb up the tower, then an hour on the boss.',
    );
  });

  it('starts at a character where there are no spaces to start at', () => {
    const body = `${'あ'.repeat(70)}ボス戦がきつい。`;

    expect(snippetOf(body, ['ボス'])).toBe(`…${'あ'.repeat(40)}ボス戦がきつい。`);
  });

  it('never starts halfway through a character a pair of code units makes', () => {
    // An emoji is two UTF-16 units, and the start is counted in units. Cut between them, the
    // snippet would open on half a character, which a browser draws as a box.
    const body = `x${'😀'.repeat(60)}yboss`;

    const snippet = snippetOf(body, ['boss']);

    expect(snippet.codePointAt(1)).toBe(0x1f600);
    expect(snippet.endsWith('yboss')).toBe(true);
  });

  it('starts at the beginning when no word can be found in it', () => {
    // The server found the note, so it is shown whatever the browser can or cannot find in it:
    // from its start, with nothing marked.
    const body = `${'a '.repeat(50)}nothing to see`;

    expect(snippetOf(body, ['zeppelin'])).toBe(body);
  });
});
