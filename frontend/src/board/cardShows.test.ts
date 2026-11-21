import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  EVERYTHING,
  cardShowsKey,
  parseCardShows,
  setCardShows,
  useCardShows,
} from './cardShows';

/**
 * What a card shows, as ticked in Settings since #27: the last note, words and picture together,
 * and the length. Per board and per browser, the Columns group's rule for its reason.
 */
describe('what a card shows', () => {
  afterEach(() => localStorage.clear());

  it('shows everything until told otherwise, and on anything it cannot read', () => {
    expect(parseCardShows(null)).toEqual(EVERYTHING);
    expect(parseCardShows('not json')).toEqual(EVERYTHING);
    expect(parseCardShows('{"note":false}')).toEqual(EVERYTHING);
    expect(parseCardShows('["sparkles"]')).toEqual(EVERYTHING);
  });

  it('keeps what is left off rather than what is shown, so a part added later starts shown', () => {
    setCardShows('games', 'note', false);

    expect(JSON.parse(localStorage.getItem(cardShowsKey('games'))!)).toEqual(['note']);
    expect(parseCardShows(localStorage.getItem(cardShowsKey('games')))).toEqual({
      note: false,
      length: true,
    });
  });

  it('is per board, so a games card is not a films card', () => {
    setCardShows('games', 'length', false);

    expect(renderHook(() => useCardShows('games')).result.current.length).toBe(false);
    expect(renderHook(() => useCardShows('movies')).result.current).toEqual(EVERYTHING);
  });

  it('tells every reader at once, so a board hears Settings without a reload', () => {
    const { result } = renderHook(() => useCardShows('games'));
    expect(result.current.note).toBe(true);

    act(() => setCardShows('games', 'note', false));
    expect(result.current.note).toBe(false);

    act(() => setCardShows('games', 'note', true));
    expect(result.current).toEqual(EVERYTHING);
  });
});
