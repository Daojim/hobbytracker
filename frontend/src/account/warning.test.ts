import { describe, expect, it } from 'vitest';
import type { Account } from '../api/types';
import { describeDeletion } from './warning';

/** A space that never breaks, which is what keeps "36" on the same line as "games". */
const NBSP = '\u00a0';

const account = (overrides: Partial<Account> = {}): Account => ({
  signedInWith: ['google'],
  boards: [],
  notes: 0,
  ...overrides,
});

describe('describeDeletion', () => {
  it('names the sign-in, and counts every board in its own words and then the notes', () => {
    expect(
      describeDeletion(
        account({
          boards: [
            { hobby: 'games', titles: 36 },
            { hobby: 'movies', titles: 9 },
            { hobby: 'tv', titles: 4 },
            { hobby: 'anime', titles: 2 },
          ],
          notes: 41,
        }),
      ),
    ).toBe(
      'This deletes the account you signed in to with Google, and everything on every board: '
        + `36${NBSP}games, 9${NBSP}films, 4${NBSP}shows, 2${NBSP}anime and 41${NBSP}notes.`,
    );
  });

  it('never lets a number wrap away from its word', () => {
    // "board: 36 / games" was the render before this rule: a count at the end of one line and
    // what it counts at the start of the next.
    const sentence = describeDeletion(
      account({ boards: [{ hobby: 'games', titles: 36 }], notes: 41 }),
    );

    expect(sentence).not.toMatch(/\d /);
  });

  it('says one of a thing in the singular', () => {
    expect(
      describeDeletion(
        account({
          boards: [
            { hobby: 'games', titles: 1 },
            { hobby: 'movies', titles: 1 },
            { hobby: 'tv', titles: 1 },
          ],
          notes: 1,
        }),
      ),
    ).toBe(
      'This deletes the account you signed in to with Google, and everything on every board: '
        + `1${NBSP}game, 1${NBSP}film, 1${NBSP}show and 1${NBSP}note.`,
    );
  });

  it('leaves the notes out when there are none, rather than counting nought of them', () => {
    expect(describeDeletion(account({ boards: [{ hobby: 'games', titles: 3 }] }))).toBe(
      'This deletes the account you signed in to with Google, and everything on every board: '
        + `3${NBSP}games.`,
    );
  });

  it('marks the thousands', () => {
    expect(describeDeletion(account({ boards: [{ hobby: 'games', titles: 1204 }] }))).toContain(
      `1,204${NBSP}games`,
    );
  });

  it('says so when there is nothing on any board, and still says what it deletes', () => {
    expect(describeDeletion(account())).toBe(
      'This deletes the account you signed in to with Google. There’s nothing on your boards yet.',
    );
  });

  it('names both sign-ins when an account has two', () => {
    expect(
      describeDeletion(
        account({ signedInWith: ['google', 'discord'], boards: [{ hobby: 'games', titles: 2 }] }),
      ),
    ).toBe(
      'This deletes the account you signed in to with Google and Discord, and everything on '
        + `every board: 2${NBSP}games.`,
    );
  });

  it('says your account when there is no sign-in to name', () => {
    expect(
      describeDeletion(account({ signedInWith: [], boards: [{ hobby: 'games', titles: 2 }] })),
    ).toBe(`This deletes your account and everything on every board: 2${NBSP}games.`);
  });

  it('goes without numbers until it has them, rather than guessing', () => {
    // While the counts are on their way, and if they never arrive. Every word of it is still
    // true, which a count of nought would not be.
    expect(describeDeletion(null)).toBe(
      'This deletes your account and everything on every board.',
    );
  });

  it('calls a title on a board with no words of its own yet a title', () => {
    // Books and music have no hobby file, and hobbyDefinition falls back to games, which would
    // call two books two games.
    expect(describeDeletion(account({ boards: [{ hobby: 'books', titles: 2 }] }))).toBe(
      'This deletes the account you signed in to with Google, and everything on every board: '
        + `2${NBSP}titles.`,
    );
  });
});
