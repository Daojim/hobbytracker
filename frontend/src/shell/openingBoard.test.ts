import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { OPENING_BOARD_KEY, parseOpeningBoard, setOpeningBoard, useOpeningBoard } from './openingBoard';

/**
 * Which board `/` opens on, as chosen in Settings since #27: one of the built boards, Games until
 * chosen. Per browser, as every appearance setting is.
 */
describe('the board that opens first', () => {
  afterEach(() => localStorage.clear());

  it('is Games until another is chosen', () => {
    expect(parseOpeningBoard(null)).toBe('games');
    expect(renderHook(() => useOpeningBoard()).result.current).toBe('games');
  });

  it('is any built board once chosen', () => {
    setOpeningBoard('anime');

    expect(localStorage.getItem(OPENING_BOARD_KEY)).toBe('anime');
    expect(renderHook(() => useOpeningBoard()).result.current).toBe('anime');
  });

  it('never opens a board nobody has built, nor anything it does not know', () => {
    // Storage outlives the code that wrote it, the theme's rule: and an unbuilt board would be an
    // empty board reading as broken, which is why the nav leaves Books and Music as plain text.
    expect(parseOpeningBoard('books')).toBe('games');
    expect(parseOpeningBoard('underwater-basket-weaving')).toBe('games');
  });

  it('tells every reader at once', () => {
    const { result } = renderHook(() => useOpeningBoard());

    act(() => setOpeningBoard('tv'));

    expect(result.current).toBe('tv');
  });
});
