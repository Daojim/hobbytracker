import { describe, expect, it } from 'vitest';
import {
  HOURS_RULE,
  dateFieldValue,
  formatHours,
  parseHours,
  parseRating,
} from './fields';

describe('dateFieldValue', () => {
  const instant = '2026-08-21T01:30:00+00:00'; // 21:30 on the 20th here

  it('sends the original instant back when the field was not touched', () => {
    // The form shows a day, but the column holds a moment. Re-deriving the instant from the
    // date the input is showing would move a 21:30 start to midnight — silent data loss on a
    // save the user made about something else entirely.
    expect(dateFieldValue('2026-08-20', instant)).toBe(instant);
  });

  it('sends a bare date when the field was edited', () => {
    // The API reads a value carrying neither Z nor an offset as that wall-clock moment here,
    // which is exactly what picking a day in a date input means.
    expect(dateFieldValue('2026-08-19', instant)).toBe('2026-08-19');
  });

  it('clears the field when it is emptied', () => {
    expect(dateFieldValue('', instant)).toBeNull();
  });

  it('stays null when there was nothing there to begin with', () => {
    expect(dateFieldValue('', null)).toBeNull();
  });

  it('sets a date on a field that had none', () => {
    expect(dateFieldValue('2026-08-19', null)).toBe('2026-08-19');
  });
});

describe('parseRating', () => {
  it('reads a rating with one decimal place', () => {
    expect(parseRating('8.5')).toEqual({ value: 8.5 });
    expect(parseRating('10')).toEqual({ value: 10 });
  });

  it('treats an empty box as unrated rather than as zero', () => {
    expect(parseRating('')).toEqual({ value: null });
    expect(parseRating('   ')).toEqual({ value: null });
  });

  it('refuses two decimal places, because the column would round them', () => {
    // numeric(3,1) rounds 8.75 to 8.8 rather than rejecting it, so an accepted 8.75 would mean
    // the response reporting a rating the database does not hold.
    expect(parseRating('8.75').error).toBeTruthy();
  });

  it.each(['0.5', '11', '-2', 'abc'])('refuses %s', (input) => {
    expect(parseRating(input).error).toBeTruthy();
  });
});

describe('parseHours', () => {
  it('takes a length of time to two decimal places', () => {
    expect(parseHours('31.5')).toEqual({ value: 31.5 });
    expect(parseHours('12.25')).toEqual({ value: 12.25 });
    expect(parseHours('8')).toEqual({ value: 8 });
  });

  it('reads empty as not recorded, which is not nought', () => {
    expect(parseHours('')).toEqual({ value: null });
    expect(parseHours('  ')).toEqual({ value: null });
  });

  it('refuses a third decimal place, which the column would round away', () => {
    // numeric(5,2) stores 12.345 as 12.35, so accepting it means reporting back a number the
    // database does not hold. The rating's rule, one place further out.
    expect(parseHours('12.345').error).toBe(HOURS_RULE);
  });

  it.each(['0', '-3', '1000', 'abc', '1e3'])('refuses %s', (input) => {
    expect(parseHours(input).error).toBe(HOURS_RULE);
  });

  it('accepts the largest number the column holds, and refuses the next one', () => {
    expect(parseHours('999.99')).toEqual({ value: 999.99 });
    expect(parseHours('1000').error).toBe(HOURS_RULE);
  });
});

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
