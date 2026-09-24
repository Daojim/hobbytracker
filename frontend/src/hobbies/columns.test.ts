import { describe, expect, it } from 'vitest';
import { addColumns, columnsFor } from './index';

/**
 * Where a tile can put a title: the columns of the board it belongs to, narrowed to the three a
 * title can arrive in.
 *
 * On Hold and Dropped are places a title goes *after* it has been started, so neither is on
 * offer — a pause and an abandonment are both things that happen to a game you have, not ways of
 * getting one. The API would take either; which three a tile offers is decided here, once.
 */
describe('addColumns', () => {
  it('offers Backlog, Playing and Completed, in board order', () => {
    expect(addColumns(columnsFor('games'))).toEqual([
      { status: 'Backlog', label: 'Backlog' },
      { status: 'InProgress', label: 'Playing' },
      { status: 'Completed', label: 'Completed' },
    ]);
  });

  it("calls them what the hobby calls them — a film's are Watching and Watched", () => {
    expect(addColumns(columnsFor('movies')).map((column) => column.label)).toEqual([
      'Backlog',
      'Watching',
      'Watched',
    ]);
  });

  it('never offers On Hold or Dropped', () => {
    const offered = addColumns(columnsFor('games')).map((column) => column.status);

    expect(offered).not.toContain('OnHold');
    expect(offered).not.toContain('Dropped');
  });

  it('leaves out a column the board is not drawing', () => {
    // Handed the board's columns rather than the hobby's, for the card menu's reason: offering
    // Completed on a board with Completed taken off would send the title somewhere off screen,
    // which reads as the add having lost it.
    const drawn = columnsFor('games').filter((column) => column.status !== 'Completed');

    expect(addColumns(drawn).map((column) => column.status)).toEqual(['Backlog', 'InProgress']);
  });
});
