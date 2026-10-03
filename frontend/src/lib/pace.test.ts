import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  daysToFinish,
  describePace,
  describeSpan,
  formatNeeded,
  formatPace,
  hasFinishAhead,
  hoursLeft,
  hoursNeeded,
  paceKey,
  parsePace,
  parsePaceInput,
  setPace,
  setPlayStyle,
  usePace,
} from './pace';
import type { LogStatus } from '../api/types';

/**
 * Your pace, and what it says about a title. The arithmetic is decided by arithmetic, so it is
 * pinned here to the number; the words were picked from renders on 2 October 2026, and are
 * pinned to the letter.
 */

const twoADay = { hours: 2, per: 'day' } as const;

describe('hoursLeft', () => {
  it('is the estimate less what you have played', () => {
    expect(hoursLeft(27, 14)).toBe(13);
  });

  it('is the whole estimate for a game not begun', () => {
    expect(hoursLeft(20, null)).toBe(20);
  });

  it('never goes below nothing', () => {
    expect(hoursLeft(21, 31)).toBe(0);
  });

  it('is exact to the hundredth an hour is stored at', () => {
    // 41.8 - 14 is 27.799999999999997 in floating point.
    expect(hoursLeft(41.8, 14)).toBe(27.8);
    expect(hoursLeft(27, 24.9)).toBe(2.1);
  });
});

describe('daysToFinish', () => {
  it('rounds a part-day up to the day it finishes on', () => {
    expect(daysToFinish(13, twoADay)).toBe(7);
  });

  it('counts a week of play as a seventh of it a day', () => {
    expect(daysToFinish(13, { hours: 10, per: 'week' })).toBe(10);
  });

  it('is exact where floating point is not', () => {
    // 2.1 / 0.7 is 3.0000000000000004, which rounds up to a fourth day nobody needs. Counted in
    // hundredths of an hour, the unit the database stores both figures in, it is 3.
    expect(daysToFinish(2.1, { hours: 0.7, per: 'day' })).toBe(3);
    expect(daysToFinish(4.2, { hours: 9.8, per: 'week' })).toBe(3);
  });

  it('is nothing when nothing is left', () => {
    expect(daysToFinish(0, twoADay)).toBe(0);
  });
});

describe('hoursNeeded', () => {
  it('spreads what is left over the days until the date', () => {
    expect(hoursNeeded(13, 44, 'day')).toBeCloseTo(0.2955, 3);
  });

  it('says it as a week of play when the pace is weekly', () => {
    expect(hoursNeeded(13, 44, 'week')).toBeCloseTo(2.068, 3);
  });
});

describe('describeSpan', () => {
  it('counts days while they are few', () => {
    expect(describeSpan(1)).toBe('1 day');
    expect(describeSpan(44)).toBe('44 days');
  });

  it('says more when you are already on the way', () => {
    expect(describeSpan(7, true)).toBe('7 more days');
    expect(describeSpan(1, true)).toBe('1 more day');
  });

  it('counts months once days stop meaning anything, and never one of them', () => {
    // 45 days is a month and a half; "about 1 month" would undersell it, and "1 months" is the
    // release calendar's own slip at exactly this length.
    expect(describeSpan(45)).toBe('about 2 months');
    expect(describeSpan(102, true)).toBe('about 3 more months');
    expect(describeSpan(518)).toBe('about 17 months');
  });

  it('counts years to the half once they are the unit', () => {
    expect(describeSpan(548)).toBe('about 1.5 years');
    expect(describeSpan(949)).toBe('about 2.5 years');
  });
});

describe('formatPace', () => {
  it('writes your pace as you would say it', () => {
    expect(formatPace(twoADay)).toBe('2 h a day');
    expect(formatPace({ hours: 10, per: 'week' })).toBe('10 h a week');
    expect(formatPace({ hours: 1.25, per: 'day' })).toBe('1.25 h a day');
  });

  it('says minutes under an hour', () => {
    expect(formatPace({ hours: 0.5, per: 'day' })).toBe('30 min a day');
  });

  it('reads aloud in words', () => {
    expect(describePace(twoADay)).toBe('2 hours a day');
    expect(describePace({ hours: 1, per: 'day' })).toBe('1 hour a day');
    expect(describePace({ hours: 0.5, per: 'day' })).toBe('30 minutes a day');
    expect(describePace({ hours: 10, per: 'week' })).toBe('10 hours a week');
  });
});

describe('formatNeeded', () => {
  it('says minutes under an hour, rounded to the minute', () => {
    expect(formatNeeded(0.2955, 'day')).toBe('18 min a day');
  });

  it('says hours to the tenth from an hour up', () => {
    expect(formatNeeded(1.159, 'day')).toBe('1.2 h a day');
    expect(formatNeeded(2.068, 'week')).toBe('2.1 h a week');
  });

  it('calls a whisker under an hour an hour', () => {
    expect(formatNeeded(0.999, 'day')).toBe('1 h a day');
  });

  it('never asks for nought minutes', () => {
    expect(formatNeeded(0.004, 'day')).toBe('1 min a day');
  });
});

describe('hasFinishAhead', () => {
  it.each<[LogStatus, boolean]>([
    ['Backlog', true],
    ['InProgress', true],
    ['OnHold', true],
    ['Completed', false],
    ['Dropped', false],
  ])('%s: %s', (status, expected) => {
    // A Completed or Dropped pass has nothing left to finish. Picked at the workshop.
    expect(hasFinishAhead(status)).toBe(expected);
  });
});

describe('parsePaceInput', () => {
  it('takes hours a day or a week', () => {
    expect(parsePaceInput('1.5', 'week')).toEqual({ value: { hours: 1.5, per: 'week' } });
    expect(parsePaceInput(' 24 ', 'day')).toEqual({ value: { hours: 24, per: 'day' } });
  });

  it('refuses what cannot be a pace, and says why', () => {
    for (const text of ['', '0', '-1', '25', 'two', '1.255']) {
      expect(parsePaceInput(text, 'day')).toEqual({
        error: 'More than 0 and at most 24 hours a day, with at most two decimal places.',
      });
    }

    expect(parsePaceInput('169', 'week')).toEqual({
      error: 'More than 0 and at most 168 hours a week, with at most two decimal places.',
    });
  });
});

describe('parsePace', () => {
  it('reads back what was kept', () => {
    expect(parsePace('{"hours":2,"per":"day","style":"hltbMainStoryHours"}')).toEqual({
      pace: twoADay,
      style: 'hltbMainStoryHours',
    });
  });

  it('trusts nothing it cannot read as a pace', () => {
    // Storage outlives the code that wrote it, so anything unrecognised is nothing said yet —
    // the theme's rule, for the theme's reason.
    const nothing = { pace: null, style: null };
    expect(parsePace(null)).toEqual(nothing);
    expect(parsePace('not json')).toEqual(nothing);
    expect(parsePace('[2,"day"]')).toEqual(nothing);
    expect(parsePace('{"hours":-2,"per":"day"}')).toEqual(nothing);
    expect(parsePace('{"hours":2,"per":"fortnight"}')).toEqual(nothing);
    expect(parsePace('{"hours":"2","per":"day"}')).toEqual(nothing);
  });

  it('keeps a pace whose style it cannot read', () => {
    expect(parsePace('{"hours":2,"per":"day","style":7}')).toEqual({ pace: twoADay, style: null });
  });
});

describe('the pace store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('remembers a pace per board, so a games pace is not a pace for anything else', () => {
    setPace('games', twoADay);

    expect(renderHook(() => usePace('games')).result.current.pace).toEqual(twoADay);
    expect(renderHook(() => usePace('anime')).result.current.pace).toBeNull();
    expect(localStorage.getItem(paceKey('games'))).not.toBeNull();
  });

  it('keeps the play style when the pace changes, and the pace when the style does', () => {
    setPace('games', twoADay);
    setPlayStyle('games', 'hltbMainStoryHours');
    setPace('games', { hours: 10, per: 'week' });

    expect(renderHook(() => usePace('games')).result.current).toEqual({
      pace: { hours: 10, per: 'week' },
      style: 'hltbMainStoryHours',
    });
  });

  it('tells every reader at once, so the board hears an answer given in the drawer', () => {
    const { result } = renderHook(() => usePace('games'));
    expect(result.current.pace).toBeNull();

    act(() => setPace('games', twoADay));

    expect(result.current.pace).toEqual(twoADay);
  });

  it('keeps the pace for this page when storage will not keep it', () => {
    // On the instance, not on Storage.prototype: the harness's localStorage implements Storage
    // without being one, so a spy on the prototype refuses nothing and this would pass with the
    // fallback deleted. See the trap in docs/design.md.
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    setPace('games', twoADay);
    setPlayStyle('games', 'hltbMainStoryHours');

    expect(renderHook(() => usePace('games')).result.current).toEqual({
      pace: twoADay,
      style: 'hltbMainStoryHours',
    });

    // And storage working again is what clears the page's copy. Left behind, it would shadow
    // storage for the rest of this file.
    vi.restoreAllMocks();
    setPace('games', { hours: 1, per: 'day' });
    localStorage.clear();
    expect(renderHook(() => usePace('games')).result.current.pace).toBeNull();
  });

  it('hears a pace given in another tab', () => {
    const { result } = renderHook(() => usePace('games'));

    act(() => {
      localStorage.setItem(paceKey('games'), JSON.stringify({ hours: 3, per: 'day' }));
      window.dispatchEvent(new StorageEvent('storage', { key: paceKey('games') }));
    });

    expect(result.current.pace).toEqual({ hours: 3, per: 'day' });
  });
});
