import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebounced } from './useDebounced';

describe('useDebounced', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts out with the value it was given', () => {
    const { result } = renderHook(() => useDebounced('hollow', 300));

    expect(result.current).toBe('hollow');
  });

  it('holds a change back until the typing stops', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounced(value, 300), {
      initialProps: { value: 'h' },
    });

    rerender({ value: 'hollow' });
    expect(result.current).toBe('h');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('hollow');
  });

  it('reports only where the typing landed, not every keystroke on the way', () => {
    // Search reaches IGDB on every call by design, so the debounce is the only thing standing
    // between one query and six.
    const { result, rerender } = renderHook(({ value }) => useDebounced(value, 300), {
      initialProps: { value: '' },
    });

    for (const value of ['h', 'ho', 'hol', 'holl', 'hollo', 'hollow']) {
      rerender({ value });
      act(() => vi.advanceTimersByTime(100));
    }

    expect(result.current).toBe('');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('hollow');
  });
});
