import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';
import { windowOfWidth } from '../test/media';

describe('useMediaQuery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('answers what it was told to where there is nothing to ask', () => {
    // jsdom, which has no matchMedia. Every component test before the phone layout rendered the
    // board side by side, and they still do because this is what the board says a window
    // without media queries gets.
    const { result } = renderHook(() => useMediaQuery('(min-width: 48rem)', true));

    expect(result.current).toBe(true);
  });

  it('answers the query', () => {
    windowOfWidth(390);

    const { result } = renderHook(() => useMediaQuery('(min-width: 48rem)', true));

    expect(result.current).toBe(false);
  });

  it('follows the window when it crosses the line', () => {
    // A phone turned sideways, or a desktop window dragged narrow. The board has to change
    // layout as it happens rather than on the next reload.
    const window = windowOfWidth(390);
    const { result } = renderHook(() => useMediaQuery('(min-width: 48rem)', true));

    act(() => window.resize(1024));
    expect(result.current).toBe(true);

    act(() => window.resize(767));
    expect(result.current).toBe(false);
  });
});
