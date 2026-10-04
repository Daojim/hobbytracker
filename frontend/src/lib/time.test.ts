import { describe, expect, it } from 'vitest';
import {
  formatJournalDate,
  formatJournalDateTime,
  journalDateInput,
  journalMinute,
  journalMonth,
  journalYear,
} from './time';

// The API hands back instants. Turning one into "what day was that" is a question about a
// timezone, and the answer has to be the same one the server gives — otherwise the board says a
// game was finished on a day the year filter disagrees with.
describe('journal time', () => {
  // 01:30 UTC on the 21st is 21:30 on the 20th in New York.
  const thursdayEvening = '2026-08-21T01:30:00+00:00';

  it('renders an evening instant as the evening it was', () => {
    expect(formatJournalDate(thursdayEvening)).toBe('Aug 20, 2026');
  });

  it('is pinned to the journal zone, not the machine the browser is on', () => {
    // The proof that the pin does work: the same instant read in UTC is a different day. If
    // formatJournalDate ever starts agreeing with this, it has stopped pinning.
    const inUtc = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(thursdayEvening));

    expect(inUtc).toBe('Aug 21, 2026');
    expect(formatJournalDate(thursdayEvening)).not.toBe(inUtc);
  });

  it('keeps the time of day, which is the point of storing one', () => {
    expect(formatJournalDateTime(thursdayEvening)).toBe('Aug 20, 2026, 9:30 PM');
  });

  it('follows daylight saving rather than a fixed offset', () => {
    // 04:30 UTC in January is 23:30 the previous day, because winter is an hour further out.
    expect(formatJournalDate('2026-01-15T04:30:00+00:00')).toBe('Jan 14, 2026');
  });

  it('puts a new years eve completion in the year it happened here', () => {
    // 8pm on the 31st here is already the 1st in UTC. This must agree with the ?year= filter.
    expect(journalYear('2027-01-01T01:00:00+00:00')).toBe(2026);
  });

  it('puts an evening at the end of a month in that month here', () => {
    // 7:30pm on the 31st of January here is already February in UTC. The Stats page files a
    // finish under its month with this, and has to agree with the year it filed it under.
    expect(journalMonth('2026-02-01T00:30:00+00:00')).toBe(1);
    expect(journalMonth('2027-01-01T01:00:00+00:00')).toBe(12);
    expect(journalMonth(thursdayEvening)).toBe(8);
  });

  it('passes a missing timestamp through rather than inventing one', () => {
    expect(formatJournalDate(null)).toBeNull();
    expect(formatJournalDateTime(null)).toBeNull();
  });

  it('fills a date input with the day the instant fell on here', () => {
    // <input type="date"> wants YYYY-MM-DD, and toISOString().slice(0, 10) would give the UTC
    // day — which for an evening here is tomorrow, the original bug walking back in.
    expect(journalDateInput(thursdayEvening)).toBe('2026-08-20');
    expect(journalDateInput('2026-01-01T02:30:00+00:00')).toBe('2025-12-31');
  });

  it('has nothing to put in the input when there is no timestamp', () => {
    expect(journalDateInput(null)).toBe('');
  });

  it('gives the day and the minute an instant fell on here, on a 24-hour clock', () => {
    // What the spreadsheet's Written column is built from. The evening of the 20th, not the small
    // hours of the 21st — and in January too, which is an hour further out.
    expect(journalMinute(thursdayEvening)).toBe('2026-08-20 21:30');
    expect(journalMinute('2026-01-15T04:30:00+00:00')).toBe('2026-01-14 23:30');
  });

  it('starts the day at nought', () => {
    // A clock that ran 1 to 24 would print five past midnight as 24:05, which a spreadsheet
    // reads as the next day.
    expect(journalMinute('2026-08-21T04:05:00+00:00')).toBe('2026-08-21 00:05');
  });
});
