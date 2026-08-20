import { describe, expect, it } from 'vitest';
import { formatJournalDate, formatJournalDateTime, journalYear } from './time';

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

  it('passes a missing timestamp through rather than inventing one', () => {
    expect(formatJournalDate(null)).toBeNull();
    expect(formatJournalDateTime(null)).toBeNull();
  });
});
