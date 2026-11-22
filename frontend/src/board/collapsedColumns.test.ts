import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  collapsedColumnsKey,
  parseCollapsed,
  setColumnCollapsed,
  useCollapsedColumns,
} from './collapsedColumns';

/**
 * Which columns a board shows collapsed, as each column's arrow sets it and the board reads it.
 *
 * Kept per board and per browser, as the columns taken off in Settings are, so a collapse made
 * once is not a press every visit. Dropped starts collapsed, as it always has, and once it is
 * opened it stays open.
 */
describe('collapsed columns', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('collapses Dropped alone on a board nobody has touched', () => {
    const { result } = renderHook(() => useCollapsedColumns('games'));

    expect([...result.current]).toEqual(['Dropped']);
  });

  it('remembers a collapsed column for that board and no other', () => {
    const games = renderHook(() => useCollapsedColumns('games'));
    const movies = renderHook(() => useCollapsedColumns('movies'));

    act(() => setColumnCollapsed('games', 'Completed', true));

    // Per board: collapsing Completed on Games leaves Watched open on Films.
    expect([...games.result.current]).toEqual(['Completed', 'Dropped']);
    expect([...movies.result.current]).toEqual(['Dropped']);
    expect(localStorage.getItem(collapsedColumnsKey('movies'))).toBeNull();
  });

  it('keeps Dropped open once it is opened, where nothing stored collapses it', () => {
    act(() => setColumnCollapsed('games', 'Dropped', false));

    // A fresh reader is the next visit: Dropped no longer folds itself again on every load.
    const { result } = renderHook(() => useCollapsedColumns('games'));
    expect([...result.current]).toEqual([]);
    expect(JSON.parse(localStorage.getItem(collapsedColumnsKey('games'))!)).toEqual([]);
  });

  it('stores the whole list, from what the board was showing, in board order', () => {
    // Written whole, so Dropped collapsed by default is written down with the first press on any
    // column, and a column added later starts open.
    act(() => setColumnCollapsed('games', 'Completed', true));
    act(() => setColumnCollapsed('games', 'Backlog', true));

    expect(JSON.parse(localStorage.getItem(collapsedColumnsKey('games'))!)).toEqual([
      'Backlog',
      'Completed',
      'Dropped',
    ]);
  });

  it('opens a column again when its arrow is pressed again', () => {
    const { result } = renderHook(() => useCollapsedColumns('games'));

    act(() => setColumnCollapsed('games', 'Completed', true));
    act(() => setColumnCollapsed('games', 'Completed', false));

    expect([...result.current]).toEqual(['Dropped']);
  });

  it.each([
    ['not JSON at all', '{nope', ['Dropped']],
    ['JSON that is not a list', '{"Completed":true}', ['Dropped']],
    ['a status there is no such column for, beside one there is', '["Paused","Completed"]', ['Completed']],
  ])('reads storage holding %s without trusting it', (_, stored, collapsed) => {
    // Storage outlives the code that wrote it. Anything that is not a list is read as nothing
    // stored, and a list keeps only the columns there are.
    expect([...parseCollapsed(stored)]).toEqual(collapsed);
  });

  it('keeps a choice for this page even when storage refuses to keep it', () => {
    // On the instance, not on Storage.prototype: the harness's storage is not a Storage, so a spy
    // on the prototype refuses nothing. See hiddenColumns.test.ts.
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useCollapsedColumns('games'));

    act(() => setColumnCollapsed('games', 'Completed', true));
    expect([...result.current]).toEqual(['Completed', 'Dropped']);

    vi.restoreAllMocks();
    act(() => setColumnCollapsed('games', 'Completed', false));
    expect([...result.current]).toEqual(['Dropped']);
  });

  it('hears a choice made in another tab', () => {
    const { result } = renderHook(() => useCollapsedColumns('games'));

    act(() => {
      localStorage.setItem(collapsedColumnsKey('games'), JSON.stringify(['OnHold']));
      window.dispatchEvent(new StorageEvent('storage', { key: collapsedColumnsKey('games') }));
    });

    expect([...result.current]).toEqual(['OnHold']);
  });
});
