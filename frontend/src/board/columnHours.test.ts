import { describe, expect, it } from 'vitest';
import { columnHoursLines } from './columnHours';
import { hobbyDefinition, type HobbyDefinition } from '../hobbies';
import type { ColumnHours, LogStatus } from '../api/types';
import type { Pace } from '../lib/pace';

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

/**
 * The whole backlog at your pace, picked at the #4 workshop on 2 October 2026: a second line
 * under Backlog's, once the drawer has been told how much you play.
 */
describe('the backlog at your pace', () => {
  const twoADay: Pace = { hours: 2, per: 'day' };

  const atPace = (
    status: LogStatus,
    titles: number,
    column: ColumnHours,
    pace: Pace | null = twoADay,
    definition: HobbyDefinition = GAMES,
  ) => columnHoursLines(definition, status, { total: titles, hours: column }, pace);

  it('says how long the backlog would take, under what it adds up to', () => {
    // 1,034.47 hours at 2 a day is 518 days, which is said in months.
    expect(atPace('Backlog', 23, hours({ length: 1034.47, lengthTitles: 20 }))).toEqual([
      {
        text: '~1,034 h to beat · 3 with no estimate',
        spoken: 'About 1,034 hours to beat, 3 with no estimate',
      },
      { text: 'about 17 months at 2 h a day', spoken: 'About 17 months at 2 hours a day' },
    ]);
  });

  it('counts days while they are few', () => {
    // 61.82 hours at 2 a day: 30.9, so 31.
    expect(atPace('Backlog', 2, hours({ length: 61.82, lengthTitles: 2 }))[1]).toEqual({
      text: '31 days at 2 h a day',
      spoken: '31 days at 2 hours a day',
    });
  });

  it('reads a weekly pace as one', () => {
    expect(
      atPace('Backlog', 2, hours({ length: 61.82, lengthTitles: 2 }), { hours: 10, per: 'week' })[1]
        ?.text,
    ).toBe('44 days at 10 h a week');
  });

  it('says nothing more until it knows your pace', () => {
    expect(atPace('Backlog', 20, hours({ length: 1034.47, lengthTitles: 20 }), null)).toHaveLength(1);
  });

  it("is Backlog's alone, the queue you work through", () => {
    for (const status of ['InProgress', 'OnHold', 'Dropped'] as const) {
      expect(atPace(status, 2, hours({ length: 84, lengthTitles: 2 }))).toHaveLength(1);
    }
    expect(
      atPace(
        'Completed',
        2,
        hours({ length: 40, lengthTitles: 2, played: 30, playedLength: 40, playedTitles: 2 }),
      ),
    ).toHaveLength(2);
  });

  it('says nothing for a backlog where nothing has an estimate', () => {
    // No figure is not a figure of nought, and nought hours is not a moment's play.
    expect(atPace('Backlog', 2, hours())).toEqual([]);
  });

  it('says nothing on a board whose hobby has no words for its hours', () => {
    expect(
      atPace('Backlog', 2, hours({ length: 4.76, lengthTitles: 2 }), twoADay, hobbyDefinition('movies')),
    ).toEqual([]);
  });
});
