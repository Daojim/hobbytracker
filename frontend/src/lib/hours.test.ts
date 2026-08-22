import { describe, expect, it } from 'vitest';
import { formatHours } from './hours';

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
