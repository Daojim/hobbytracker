import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  describeDistance,
  formatGroup,
  formatRelease,
  releaseGroup,
  releaseNote,
  releaseProgress,
} from './release';

/**
 * The calendar's vocabulary. Every case below is a claim about what a reader is shown, and the
 * two that matter most are negative: what it must never print, and which timezone it must never
 * apply.
 */
describe('formatRelease', () => {
  it('prints a day when a day was announced', () => {
    expect(formatRelease('2026-09-26', 'Day')).toBe('Sep 26, 2026');
  });

  it('prints a month when only a month was announced', () => {
    expect(formatRelease('2027-10-01', 'Month')).toBe('Oct 2027');
  });

  it('prints a quarter when only a quarter was announced', () => {
    expect(formatRelease('2027-01-01', 'Quarter')).toBe('Q1 2027');
    expect(formatRelease('2026-07-01', 'Quarter')).toBe('Q3 2026');
  });

  it('prints a year when only a year was announced', () => {
    expect(formatRelease('2027-01-01', 'Year')).toBe('2027');
  });

  it('never prints a day that was not announced', () => {
    // The negative assertion, and the only kind that catches this. IGDB states a vague date as a
    // real day — "Q1 2027" arrives as 31 March — so a formatter reading the date and ignoring
    // the precision produces something that looks entirely plausible and is a fabrication.
    const quarter = formatRelease('2027-03-31', 'Quarter');

    expect(quarter).toBe('Q1 2027');
    expect(quarter).not.toContain('31');
    expect(quarter).not.toContain('Mar');
  });

  it('says TBA for a date nobody has announced', () => {
    expect(formatRelease(null, 'Unknown')).toBe('TBA');
  });

  it('says TBA for a title nobody has asked a provider about', () => {
    // Null precision is "never asked" rather than "no date". Such a title reads as released and
    // should never reach the calendar at all — but if one does, inventing a date for it would be
    // worse than admitting there is none.
    expect(formatRelease(null, null)).toBe('TBA');
  });

  it('reads a day as itself rather than as an instant', () => {
    // The trap the whole file exists for. `new Date('2026-09-26')` parses as midnight UTC, and
    // the journal zone is behind UTC — so formatting it the way every other date in this app is
    // formatted answers "Sep 25". Reintroduce it by implementing formatRelease as
    // `dateFormat.format(new Date(day))` and watch this go red while nothing else does.
    expect(formatRelease('2026-09-26', 'Day')).toBe('Sep 26, 2026');
    expect(formatRelease('2026-01-01', 'Day')).toBe('Jan 1, 2026');
    expect(formatRelease('2027-03-01', 'Day')).toBe('Mar 1, 2027');
  });
});

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-09-15', '2026-09-26')).toBe(11);
  });

  it('counts backwards for a day already gone', () => {
    expect(daysBetween('2026-09-15', '2026-09-14')).toBe(-1);
  });

  it('counts a whole number across a daylight-saving boundary', () => {
    // 1 November 2026 is when the clocks go back here, so one of these local days is 25 hours
    // long. Done in the journal zone the subtraction would answer 30.04 days and round wrong;
    // done in UTC both sides carry the same offset and it cancels.
    expect(daysBetween('2026-10-20', '2026-11-20')).toBe(31);
    expect(daysBetween('2027-03-01', '2027-03-31')).toBe(30);
  });

  it('counts across a leap day', () => {
    expect(daysBetween('2028-02-01', '2028-03-01')).toBe(29);
  });
});

describe('describeDistance', () => {
  it('names the next two days rather than counting them', () => {
    expect(describeDistance('2026-09-15', '2026-09-15')).toBe('today');
    expect(describeDistance('2026-09-16', '2026-09-15')).toBe('tomorrow');
  });

  it('counts days while a date is close', () => {
    expect(describeDistance('2026-09-30', '2026-09-15')).toBe('in 15 days');
  });

  it('counts months once a date is far enough off that days stop meaning anything', () => {
    expect(describeDistance('2026-11-15', '2026-09-15')).toBe('in 2 months');
    expect(describeDistance('2027-06-15', '2026-09-15')).toBe('in 9 months');
  });

  it('counts years for something announced a long way out', () => {
    // "in 28 months" is a number nobody holds in their head, and it implies a precision an
    // announcement that distant never has.
    expect(describeDistance('2029-01-01', '2026-09-15')).toBe('in 2 years');
  });

  it('speaks of a date already gone in the past tense', () => {
    expect(describeDistance('2026-09-14', '2026-09-15')).toBe('yesterday');
    expect(describeDistance('2026-09-10', '2026-09-15')).toBe('5 days ago');
  });
});

describe('releaseProgress', () => {
  it('is full on the day', () => {
    expect(releaseProgress('2026-09-15', '2026-09-15')).toBe(1);
  });

  it('is empty at the horizon and beyond it', () => {
    expect(releaseProgress('2027-03-14', '2026-09-15')).toBe(0);
    expect(releaseProgress('2030-01-01', '2026-09-15')).toBe(0);
  });

  it('does not run backwards for a date already gone', () => {
    expect(releaseProgress('2020-01-01', '2026-09-15')).toBe(1);
  });

  it('has nothing to show for a date nobody has announced', () => {
    expect(releaseProgress(null, '2026-09-15')).toBeNull();
  });
});

describe('releaseGroup', () => {
  const today = '2026-09-15';

  it('gathers this month under its own heading', () => {
    expect(releaseGroup('2026-09-26', 'Day', today)).toBe('this-month');
  });

  it('gives each of the next twelve months a heading', () => {
    expect(releaseGroup('2026-11-03', 'Day', today)).toBe('2026-11');
    expect(releaseGroup('2027-06-01', 'Month', today)).toBe('2027-06');
  });

  it('gathers anything more than a year out under its year', () => {
    // Otherwise a list reaching three years out is more headings than titles.
    expect(releaseGroup('2028-04-01', 'Day', today)).toBe('2028');
  });

  it('never files a quarter under a month', () => {
    // The grouping half of "never announce more than the publisher did". A Q1 2027 title carries
    // 31 March, so a naive start-of-month grouping would head it "Mar 2027" — claiming a month
    // nobody named, and the wrong one at that.
    expect(releaseGroup('2027-03-31', 'Quarter', today)).toBe('2027');
  });

  it('never files a year under a month', () => {
    expect(releaseGroup('2027-12-31', 'Year', today)).toBe('2027');
  });

  it('puts a date nobody has announced in a bucket of its own', () => {
    expect(releaseGroup(null, 'Unknown', today)).toBe('no-date');
    expect(releaseGroup(null, null, today)).toBe('no-date');
  });
});

describe('formatGroup', () => {
  it('reads a month heading as a person would write it', () => {
    expect(formatGroup('2026-11', 'No date yet')).toBe('Nov 2026');
  });

  it('leaves a year heading as the year', () => {
    expect(formatGroup('2028', 'No date yet')).toBe('2028');
  });

  it('takes the undated heading from the hobby rather than inventing one', () => {
    expect(formatGroup('no-date', 'Nothing announced')).toBe('Nothing announced');
  });
});

describe('releaseNote', () => {
  it('says so when a title is never coming', () => {
    expect(releaseNote('Cancelled')).toBe('Cancelled');
  });

  it('says nothing for a status a date already covers', () => {
    expect(releaseNote('Rumored')).toBeNull();
    expect(releaseNote(null)).toBeNull();
  });
});
