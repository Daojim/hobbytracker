import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  hiddenColumnsKey,
  parseHidden,
  setColumnHidden,
  useHiddenColumns,
} from './hiddenColumns';

/**
 * Which columns a board leaves off, as Settings sets it and the board reads it.
 *
 * The first preference in the app that is not CSS: a theme is an attribute on the root and
 * nothing in React has to hear it change, where a hidden column has to leave the grid, the drop
 * targets and every card's menu at once. So what is tested here is a store both the header and
 * the board subscribe to, and what it does with storage it cannot trust.
 */
describe('hidden columns', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('hides nothing on a board nobody has touched', () => {
    const { result } = renderHook(() => useHiddenColumns('games'));

    expect([...result.current]).toEqual([]);
  });

  it('remembers a hidden column for that board and no other', () => {
    const games = renderHook(() => useHiddenColumns('games'));
    const movies = renderHook(() => useHiddenColumns('movies'));

    act(() => setColumnHidden('games', 'Dropped', true));

    // Per board, because a film is rarely put on hold and a game often is: the same person can
    // want On Hold on one board and not on the other.
    expect([...games.result.current]).toEqual(['Dropped']);
    expect([...movies.result.current]).toEqual([]);
    expect(localStorage.getItem(hiddenColumnsKey('games'))).not.toBeNull();
    expect(localStorage.getItem(hiddenColumnsKey('movies'))).toBeNull();
  });

  it('brings a column back when it is shown again', () => {
    const { result } = renderHook(() => useHiddenColumns('games'));

    act(() => setColumnHidden('games', 'OnHold', true));
    act(() => setColumnHidden('games', 'Dropped', true));
    act(() => setColumnHidden('games', 'OnHold', false));

    expect([...result.current]).toEqual(['Dropped']);
  });

  it('stores what is hidden rather than what is shown, so a column added later starts visible', () => {
    // Storing the visible list would have hidden On Hold from everybody who had ever touched
    // this setting the day it arrived. A list of what somebody chose to hide says nothing about
    // a column nobody has seen yet.
    act(() => setColumnHidden('games', 'Dropped', true));

    expect(JSON.parse(localStorage.getItem(hiddenColumnsKey('games'))!)).toEqual(['Dropped']);
  });

  it('never hides Backlog, however it is asked', () => {
    // Search adds every title to Backlog, so a board without it would swallow each add without
    // a trace — and the release calendar under the board is a view of that same column.
    const { result } = renderHook(() => useHiddenColumns('games'));

    act(() => setColumnHidden('games', 'Backlog', true));
    expect([...result.current]).toEqual([]);

    expect([...parseHidden(JSON.stringify(['Backlog', 'Dropped']))]).toEqual(['Dropped']);
  });

  it.each([
    ['not JSON at all', '{nope'],
    ['JSON that is not a list', '{"Dropped":true}'],
    ['a status there is no such column for', '["Paused"]'],
  ])('falls back to hiding nothing when storage holds %s', (_, stored) => {
    // Storage outlives the code that wrote it, and a value nothing recognises is trusted by
    // nobody here — the theme's rule, for the theme's reason.
    expect([...parseHidden(stored)]).toEqual([]);
  });

  it('keeps a choice for this page even when storage refuses to keep it', () => {
    // A browser set to block site data throws on every write. The theme survives that by holding
    // its choice in state; this has to survive it too, or the checkbox would be a control that
    // silently does nothing.
    //
    // On the instance, not on Storage.prototype, and that is not a style choice: the harness
    // supplies its own storage (see test/setup.ts), which is not a Storage at all, so a spy on the
    // prototype refuses nothing — and this test passed with the fallback it exists for deleted.
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useHiddenColumns('games'));

    act(() => setColumnHidden('games', 'Dropped', true));
    expect([...result.current]).toEqual(['Dropped']);

    // And storage working again is what clears it: the page's copy is only for while it will
    // not keep one. Left behind, it would shadow storage for the rest of this file.
    vi.restoreAllMocks();
    act(() => setColumnHidden('games', 'Dropped', false));
    expect([...result.current]).toEqual([]);
  });

  it('hears a choice made in another tab', () => {
    // The storage event fires only in *other* documents, which is why the setter tells this one
    // itself — and why this is the one way another tab's change can arrive at all.
    const { result } = renderHook(() => useHiddenColumns('games'));

    act(() => {
      localStorage.setItem(hiddenColumnsKey('games'), JSON.stringify(['OnHold']));
      window.dispatchEvent(new StorageEvent('storage', { key: hiddenColumnsKey('games') }));
    });

    expect([...result.current]).toEqual(['OnHold']);
  });
});
