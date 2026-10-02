import { describe, expect, it } from 'vitest';
import { columnHoursLines } from './columnHours';
import { hobbyDefinition, type HobbyDefinition } from '../hobbies';
import type { ColumnHours, LogStatus } from '../api/types';

const GAMES = hobbyDefinition('games');

/** A column's hours, nothing in it unless a test says so. */
const hours = (overrides: Partial<ColumnHours> = {}): ColumnHours => ({
  length: null,
  lengthTitles: 0,
  played: null,
  playedLength: null,
  playedTitles: 0,
  ...overrides,
});

/** What the header prints, and what it says aloud. */
const lines = (
  status: LogStatus,
  titles: number,
  column: ColumnHours,
  definition: HobbyDefinition = GAMES,
) => columnHoursLines(definition, status, { total: titles, hours: column });

describe('columnHoursLines', () => {
  it('adds up what the cards print, and says what the sum is', () => {
    expect(lines('Backlog', 16, hours({ length: 1034.47, lengthTitles: 16 }))).toEqual([
      { text: '~1,034 h to beat', spoken: 'About 1,034 hours to beat' },
    ]);
  });

  it('counts the titles with no estimate rather than adding them in as nothing', () => {
    expect(lines('Backlog', 17, hours({ length: 1034.47, lengthTitles: 16 }))).toEqual([
      {
        text: '~1,034 h to beat · 1 with no estimate',
        spoken: 'About 1,034 hours to beat, 1 with no estimate',
      },
    ]);
  });

  it('says nothing for a column where no title has an estimate', () => {
    // "0 h" would say the column takes no time at all.
    expect(lines('Dropped', 2, hours())).toEqual([]);
  });

  it('says nothing for an empty column', () => {
    expect(lines('OnHold', 0, hours())).toEqual([]);
  });

  it('compares your hours on Completed, over the titles that have both', () => {
    expect(
      lines(
        'Completed',
        9,
        hours({ length: 94 + 29, lengthTitles: 9, played: 90, playedLength: 94, playedTitles: 7 }),
      ),
    ).toEqual([
      {
        text: '90 h played vs ~94 h to beat',
        spoken: 'You played 90 hours, against about 94 hours to beat',
      },
      {
        text: 'over 7 games · 2 without your hours',
        spoken: 'over 7 games, 2 without your hours',
      },
    ]);
  });

  it('counts the titles with no estimate on Completed too', () => {
    expect(
      lines(
        'Completed',
        10,
        hours({ length: 123, lengthTitles: 9, played: 90, playedLength: 94, playedTitles: 7 }),
      )[1],
    ).toEqual({
      text: 'over 7 games · 2 without your hours · 1 with no estimate',
      spoken: 'over 7 games, 2 without your hours, 1 with no estimate',
    });
  });

  it('says one game rather than one games', () => {
    expect(
      lines(
        'Completed',
        1,
        hours({ length: 20, lengthTitles: 1, played: 14.5, playedLength: 20, playedTitles: 1 }),
      )[1]?.text,
    ).toBe('over 1 game');
  });

  it('falls back to the total on Completed when no hours are logged at all', () => {
    // Nothing to compare is not a comparison of nothing. "0 h played" would read as a claim.
    expect(lines('Completed', 3, hours({ length: 50, lengthTitles: 3 }))).toEqual([
      { text: '~50 h to beat', spoken: 'About 50 hours to beat' },
    ]);
  });

  it('compares on Completed alone, so Playing says how long its games take', () => {
    // The user's call on 1 October 2026: Playing reads as every other column does, rather than
    // as the hours left. See #3 in docs/plans/games-board-next.md.
    expect(
      lines(
        'InProgress',
        3,
        hours({ length: 118.8, lengthTitles: 3, played: 53, playedLength: 103.8, playedTitles: 2 }),
      ),
    ).toEqual([{ text: '~119 h to beat', spoken: 'About 119 hours to beat' }]);
  });

  it('never compares for a hobby whose pass records no hours', () => {
    // Follows the pass's fields rather than the hobby's name: a pass without hours has nothing
    // to put on the other side, whatever the server happened to send.
    const unrecorded: HobbyDefinition = {
      ...GAMES,
      journal: { ...GAMES.journal, fields: { ...GAMES.journal.fields, hoursPlayed: false } },
    };

    expect(
      lines(
        'Completed',
        2,
        hours({ length: 40, lengthTitles: 2, played: 30, playedLength: 40, playedTitles: 2 }),
        unrecorded,
      ),
    ).toEqual([{ text: '~40 h to beat', spoken: 'About 40 hours to beat' }]);
  });

  it('says nothing on a board whose hobby has no words for it yet', () => {
    // Games only, for now: the user's call on 1 October 2026. The other hobbies' wording is
    // proposed in docs/plans/games-board-next.md rather than built.
    expect(
      lines('Backlog', 2, hours({ length: 4.76, lengthTitles: 2 }), hobbyDefinition('movies')),
    ).toEqual([]);
  });
});
