import { describe, expect, it } from 'vitest';
import { dateFieldValue, parseRating } from './fields';

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
