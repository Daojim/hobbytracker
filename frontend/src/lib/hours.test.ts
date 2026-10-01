import { describe, expect, it } from 'vitest';
import { formatHours, formatRuntime, totalHours } from './hours';

describe('formatHours', () => {
  it('drops a trailing nought rather than writing 31.0 h', () => {
    expect(formatHours(31)).toBe('31 h');
    expect(formatHours(31.5)).toBe('31.5 h');
    expect(formatHours(12.25)).toBe('12.25 h');
  });

  it('has nothing to say about a number that was never recorded', () => {
    expect(formatHours(null)).toBeNull();
  });
});

describe('formatRuntime', () => {
  it('reads a runtime the way a person says one', () => {
    // 116 minutes, which is what the server sends as 1.93 hours. Recovering the exact minute
    // from two decimal places is the whole reason the board row can carry one length field for
    // both hobbies.
    expect(formatRuntime(1.93)).toBe('1 h 56 m');
  });

  it('drops the hour when there is not one', () => {
    // "0 h 48 m" is a way of saying 48 minutes that nobody uses.
    expect(formatRuntime(0.8)).toBe('48 m');
  });

  it('says a whole number of hours without pretending to minutes it does not have', () => {
    expect(formatRuntime(2)).toBe('2 h 0 m');
  });

  it('recovers the exact minute for every runtime a film plausibly has', () => {
    // The claim the shared length field rests on: minutes -> hours at two decimal places ->
    // minutes is lossless, because the rounding error is at most 0.3 of a minute.
    for (let minutes = 1; minutes <= 300; minutes += 1) {
      const hours = Number((minutes / 60).toFixed(2));
      const [, h = '0', m = '0'] = /(?:(\d+) h )?(\d+) m/.exec(formatRuntime(hours)) ?? [];

      expect(Number(h) * 60 + Number(m)).toBe(minutes);
    }
  });
});

describe('totalHours', () => {
  it('reads a column of titles added up in whole hours, with the thousands marked', () => {
    // A card says ~41.82 h, because one game is worth the precision. Seventeen of them added
    // up is not: 1,034.47 claims an accuracy no estimate behind it has.
    expect(totalHours(1034.47)).toBe('1,034');
    expect(totalHours(41.8)).toBe('42');
    expect(totalHours(10.4)).toBe('10');
  });

  it('keeps a tenth under ten hours, where it is a real part of the answer', () => {
    // A Playing column of one short game would otherwise read "~0 h", which says the column
    // takes no time at all.
    expect(totalHours(4.46)).toBe('4.5');
    expect(totalHours(0.4)).toBe('0.4');
    expect(totalHours(9.94)).toBe('9.9');
  });

  it('drops a trailing nought rather than writing 4.0', () => {
    expect(totalHours(4)).toBe('4');
    expect(totalHours(9.96)).toBe('10');
  });
});
