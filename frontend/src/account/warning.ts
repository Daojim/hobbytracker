import type { Account } from '../api/types';
import { hobbyDefinition } from '../hobbies';
import { isReadyHobby } from '../shell/hobbies';
import { PROVIDERS } from '../shell/providers';

/**
 * A space that never breaks. The first render of this warning wrapped "board: 36" onto one line
 * and "games" onto the next, and a count read without its word is a number that means nothing.
 */
const NBSP = '\u00a0';

const NUMBER = new Intl.NumberFormat('en-US');

/** A list said aloud: "a", "a and b", "a, b and c". No serial comma, as the app's lists go. */
function spoken(items: readonly string[]): string {
  return items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

const counted = (count: number, noun: string) => `${NUMBER.format(count)}${NBSP}${noun}`;

/** A provider as a sentence says it: Google. The id itself, for one this app has no name for. */
const providerName = (id: string) =>
  PROVIDERS.find((provider) => provider.id === id)?.name ?? id;

/**
 * A board's titles in that hobby's own word. A board with no hobby file yet has no word of its
 * own, and `hobbyDefinition` falls back to games, which would call two books two games.
 */
function titlesOn(hobby: string, count: number): string {
  const noun = isReadyHobby(hobby)
    ? hobbyDefinition(hobby).titleNoun(count)
    : count === 1
      ? 'title'
      : 'titles';

  return counted(count, noun);
}

/**
 * The sentence that says what deleting your account takes: which account, by the sign-in, and
 * what is on every board, in the hobbies' own words.
 *
 * `null` while the counts are on their way, and if they never arrive. The sentence then goes
 * without numbers rather than guessing, which keeps every word of it true. A board with nothing
 * on it never reaches here, and no notes are left out rather than counted as nought.
 */
export function describeDeletion(account: Account | null): string {
  if (account === null) {
    return 'This deletes your account and everything on every board.';
  }

  const named = account.signedInWith.length > 0;
  const who = named
    ? `the account you signed in to with ${spoken(account.signedInWith.map(providerName))}`
    : 'your account';

  const everything = [
    ...account.boards.map((board) => titlesOn(board.hobby, board.titles)),
    ...(account.notes > 0
      ? [counted(account.notes, account.notes === 1 ? 'note' : 'notes')]
      : []),
  ];

  if (everything.length === 0) {
    return `This deletes ${who}. There’s nothing on your boards yet.`;
  }

  // The comma only after a sign-in is named, where the clause runs long enough to want one.
  return `This deletes ${who}${named ? ',' : ''} and everything on every board: ${spoken(everything)}.`;
}
