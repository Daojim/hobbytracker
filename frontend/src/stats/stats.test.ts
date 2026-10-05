import { describe, expect, it } from 'vitest';
import {
  againstEstimate,
  averageRating,
  byMonth,
  byYear,
  completionPercent,
  ratingCounts,
  timed,
  waited,
} from './stats';
import { finish, backlogTitle } from '../test/stats';

describe('completionPercent', () => {
  it('is the share of what was started that was finished, as a whole percent', () => {
    expect(completionPercent({ finished: 14, going: 2, dropped: 3 })).toBe(74);
  });

  it('is nothing at all when nothing was started, rather than nought', () => {
    // 0% would say you finished none of what you started. With nothing started there is no
    // share to give.
    expect(completionPercent({ finished: 0, going: 0, dropped: 0 })).toBeNull();
  });

  it('is a hundred when everything started was finished', () => {
    expect(completionPercent({ finished: 3, going: 0, dropped: 0 })).toBe(100);
  });
});

describe('againstEstimate', () => {
  it('says how much longer or quicker you were, in whole percent', () => {
    expect(againstEstimate(221.3, 212.15).words).toBe('4% longer');
    expect(againstEstimate(10.5, 12.76).words).toBe('18% quicker');
  });

  it('is exact where floating point is not', () => {
    // 2.01 against 2 is half a percent exactly, which rounds up to one. Divided in floating point
    // it comes out a hair under, at 0.49999999999998934, and rounds to nought. Worked in the
    // hundredths of an hour both figures are stored in, it is exact.
    expect(againstEstimate(2.01, 2).words).toBe('1% longer');
    expect(againstEstimate(1.99, 2).words).toBe('1% quicker');
  });

  it('rounds a half the same way in both directions', () => {
    // Math.round takes -0.5 to nought and 0.5 to one, which would make 4.5% quicker "4%" and
    // 4.5% longer "5%". The size is rounded, and then given its direction.
    expect(againstEstimate(104.5, 100).words).toBe('5% longer');
    expect(againstEstimate(95.5, 100).words).toBe('5% quicker');
  });

  it('calls it the same when it rounds to nought, rather than 0% longer', () => {
    expect(againstEstimate(100.4, 100)).toMatchObject({ direction: 'same', words: 'The same' });
  });

  it('signs the figure a bar is labelled with', () => {
    expect(againstEstimate(10.5, 12.76).signed).toBe('−18%');
    expect(againstEstimate(61.2, 49.9).signed).toBe('+23%');
    expect(againstEstimate(100, 100).signed).toBe('0%');
  });
});

describe('timed', () => {
  it('keeps the finishes with both figures, quickest against its estimate first', () => {
    const order = timed([
      finish({ title: 'Silksong', hoursPlayed: 61.2, lengthHours: 49.9 }),
      finish({ title: 'Celeste', hoursPlayed: 10.5, lengthHours: 12.76 }),
      finish({ title: 'Unlogged', hoursPlayed: null, lengthHours: 20 }),
      finish({ title: 'Unknown', hoursPlayed: 5, lengthHours: null }),
      finish({ title: 'Hollow Knight', hoursPlayed: 46, lengthHours: 41.82 }),
    ]).map((game) => game.title);

    expect(order).toEqual(['Celeste', 'Hollow Knight', 'Silksong']);
  });

  it('orders by the exact ratio, and by title when two are the same', () => {
    // 1 of 2 and 2 of 4 are both half the estimate. Compared as products of whole hundredths
    // they tie exactly, and a tie goes by name rather than by whichever float came out smaller.
    const order = timed([
      finish({ title: 'B', hoursPlayed: 2, lengthHours: 4 }),
      finish({ title: 'A', hoursPlayed: 1, lengthHours: 2 }),
    ]).map((game) => game.title);

    expect(order).toEqual(['A', 'B']);
  });
});

describe('byMonth', () => {
  it('files a finish under the month it was finished in here', () => {
    // 7:30pm on New Year's Eve here is already January in UTC.
    const months = byMonth([
      finish({ title: 'Late', completedAt: '2027-01-01T00:30:00Z' }),
      finish({ title: 'Leap', completedAt: '2026-03-01T04:59:00Z' }),
      finish({ title: 'Spring', completedAt: '2026-03-01T05:00:00Z' }),
    ]);

    expect(months).toHaveLength(12);
    expect(months[11]!.map((f) => f.title)).toEqual(['Late']);
    expect(months[1]!.map((f) => f.title)).toEqual(['Leap']);
    expect(months[2]!.map((f) => f.title)).toEqual(['Spring']);
  });
});

describe('byYear', () => {
  it('files every finish under its year here, oldest first, with the undated last', () => {
    const years = byYear([
      finish({ title: 'Undated', completedAt: null }),
      finish({ title: 'Eve', completedAt: '2025-01-01T00:30:00Z' }),
      finish({ title: 'Now', completedAt: '2026-05-01T16:00:00Z' }),
    ]);

    expect(years.map(({ year, finishes }) => [year, finishes.map((f) => f.title)])).toEqual([
      [2024, ['Eve']],
      [2026, ['Now']],
      [null, ['Undated']],
    ]);
  });
});

describe('averageRating', () => {
  it('is the mean of the ratings there are, to the tenth', () => {
    expect(averageRating([finish({ rating: 7 }), finish({ rating: 8 }), finish({ rating: 8 })])).toBe(7.7);
  });

  it('rounds a half up, as a rating is read', () => {
    expect(averageRating([finish({ rating: 8 }), finish({ rating: 8.5 })])).toBe(8.3);
  });

  it('leaves the unrated out rather than counting them as nought', () => {
    expect(averageRating([finish({ rating: 9 }), finish({ rating: null })])).toBe(9);
  });

  it('is nothing when nothing is rated', () => {
    expect(averageRating([finish({ rating: null })])).toBeNull();
  });
});

describe('ratingCounts', () => {
  it('counts the ratings at each whole point, 1 to 10', () => {
    const counts = ratingCounts([
      finish({ rating: 10 }),
      finish({ rating: 9.9 }),
      finish({ rating: 9 }),
      finish({ rating: 6 }),
      finish({ rating: 5.9 }),
      finish({ rating: null }),
    ]);

    expect(counts).toEqual([0, 0, 0, 0, 1, 1, 0, 0, 2, 1]);
  });
});

describe('waited', () => {
  it('says how long a title has been in the backlog when the history knows', () => {
    const arrived = (instant: string) => backlogTitle({ inBacklogSince: instant });

    expect(waited(arrived('2026-10-02T14:00:00Z'), 'own', '2026-10-02')).toBe('in your backlog since today');
    expect(waited(arrived('2026-10-01T14:00:00Z'), 'own', '2026-10-02')).toBe('in your backlog 1 day');
    expect(waited(arrived('2026-09-12T14:00:00Z'), 'own', '2026-10-02')).toBe('in your backlog 20 days');
  });

  it('says when it was added when that is all there is', () => {
    const added = (instant: string) => backlogTitle({ loggedAt: instant, inBacklogSince: null });

    expect(waited(added('2026-10-02T14:00:00Z'), 'own', '2026-10-02')).toBe('added today');
    expect(waited(added('2026-10-01T14:00:00Z'), 'own', '2026-10-02')).toBe('added 1 day ago');
    expect(waited(added('2025-11-03T17:00:00Z'), 'own', '2026-10-02')).toBe('added 333 days ago');
  });

  it('says the backlog on a share, which is nobody’s to call yours', () => {
    const arrived = (instant: string) => backlogTitle({ inBacklogSince: instant });
    const added = (instant: string) => backlogTitle({ loggedAt: instant, inBacklogSince: null });

    expect(waited(arrived('2026-10-02T14:00:00Z'), 'shared', '2026-10-02')).toBe(
      'in the backlog since today',
    );
    expect(waited(arrived('2026-09-12T14:00:00Z'), 'shared', '2026-10-02')).toBe(
      'in the backlog 20 days',
    );

    // "Added" is about nobody in particular already, so it reads the same in both voices.
    expect(waited(added('2026-10-01T14:00:00Z'), 'shared', '2026-10-02')).toBe('added 1 day ago');
  });

  it('counts the days here, so 11:30pm yesterday is yesterday', () => {
    // 11:30pm on 1 October here is already the 2nd in UTC.
    const title = backlogTitle({ inBacklogSince: '2026-10-02T03:30:00Z' });

    expect(waited(title, 'own', '2026-10-02')).toBe('in your backlog 1 day');
  });
});
