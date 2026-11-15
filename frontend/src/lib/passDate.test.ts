import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatPassDate,
  parseYear,
  passDateAfterWord,
  thisYearHere,
  yearRule,
} from './passDate';

describe('formatPassDate', () => {
  it('prints a day as the day it was here, as a card always has', () => {
    // 02:30 UTC on New Year's Day is 21:30 on the 31st here.
    expect(formatPassDate('2026-01-01T02:30:00+00:00', null)).toBe('Dec 31, 2025');
  });

  it('prints a year kept as a year alone, as the calendar prints a year', () => {
    // Round three's pick: "2019" on a card, never "Jan 1, 2019", a day nobody named.
    expect(formatPassDate(null, 2019)).toBe('2019');
  });

  it('is nothing for a pass with neither', () => {
    expect(formatPassDate(null, null)).toBeNull();
  });
});

describe('passDateAfterWord', () => {
  it('runs a day on from a word as it is', () => {
    expect(passDateAfterWord('2024-11-02T18:00:00+00:00', null)).toBe('Nov 2, 2024');
  });

  it('gives a year *in*, so a heading reads "Completed in 2019"', () => {
    expect(passDateAfterWord(null, 2019)).toBe('in 2019');
  });

  it('is nothing for a pass with neither', () => {
    expect(passDateAfterWord(null, null)).toBeNull();
  });
});

describe('yearRule', () => {
  it('says the whole rule in one line, the user’s pick at the #24 build', () => {
    expect(yearRule(2026)).toBe('A year from 1900 to 2026.');
  });
});

describe('parseYear', () => {
  it('reads a year that has happened, from 1900 to this one', () => {
    expect(parseYear('2019', 2026)).toEqual({ value: 2019 });
    expect(parseYear('1900', 2026)).toEqual({ value: 1900 });
    expect(parseYear('2026', 2026)).toEqual({ value: 2026 });
    expect(parseYear(' 2019 ', 2026)).toEqual({ value: 2019 });
  });

  it('reads an empty box as no year, which is not a year of nought', () => {
    expect(parseYear('', 2026)).toEqual({ value: null });
    expect(parseYear('   ', 2026)).toEqual({ value: null });
  });

  it('refuses a year before 1900 or after this one, in the rule’s words', () => {
    expect(parseYear('1899', 2026)).toEqual({ error: 'A year from 1900 to 2026.' });
    expect(parseYear('2027', 2026)).toEqual({ error: 'A year from 1900 to 2026.' });
  });

  it('refuses anything that is not four digits', () => {
    // Full-width digits are what a Japanese keyboard types, and are not a year the server reads.
    for (const text of ['20', '219', '20190', '2019a', '-2019', '2019.0', '２０１９']) {
      expect(parseYear(text, 2026)).toEqual({ error: 'A year from 1900 to 2026.' });
    }
  });
});

describe('thisYearHere', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is the year it is here, which 8pm on New Year’s Eve still is', () => {
    // 1am on New Year's Day in UTC is still the old year here, so next year has not happened yet.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-01-01T01:00:00Z'));

    expect(thisYearHere()).toBe(2026);
    expect(parseYear('2027')).toEqual({ error: 'A year from 1900 to 2026.' });
  });
});
