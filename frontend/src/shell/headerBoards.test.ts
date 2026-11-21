import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  HEADER_BOARDS_KEY,
  parseHeaderBoards,
  setHeaderBoard,
  useHeaderBoards,
} from './headerBoards';

/**
 * Which boards the nav under the header names, as ticked in Settings since #27: any of the six,
 * Books and Music among them, so the nav shows the boards you use. Per browser.
 */
describe('the boards in the header', () => {
  afterEach(() => localStorage.clear());

  it('takes nothing off until told to, and nothing it does not know', () => {
    expect(parseHeaderBoards(null).size).toBe(0);
    expect(parseHeaderBoards('not json').size).toBe(0);
    expect(parseHeaderBoards('["chess"]').size).toBe(0);
  });

  it('keeps what is taken off rather than what is shown, so a board built later is named', () => {
    setHeaderBoard('music', false);
    setHeaderBoard('books', false);

    // In the nav's order, so what is stored reads the way the nav does.
    expect(JSON.parse(localStorage.getItem(HEADER_BOARDS_KEY)!)).toEqual(['books', 'music']);
    expect([...parseHeaderBoards(localStorage.getItem(HEADER_BOARDS_KEY))]).toEqual([
      'books',
      'music',
    ]);
  });

  it('puts a board back, and tells every reader at once', () => {
    setHeaderBoard('tv', false);
    const { result } = renderHook(() => useHeaderBoards());
    expect(result.current.has('tv')).toBe(true);

    act(() => setHeaderBoard('tv', true));

    expect(result.current.has('tv')).toBe(false);
  });
});
