import { describe, expect, it } from 'vitest';
import type { Cell, CellObject } from 'write-excel-file/browser';
import type { ExportTitle, LogStatus } from '../api/types';
import { GAMES } from '../hobbies/games';
import { MOVIES } from '../hobbies/movies';
import type { HobbyDefinition } from '../hobbies';
import { logEntry, note } from '../test/passes';
import { exportFileName, exportSheets, type ExportSheet } from './sheets';

/** A title on the board as the API's export answers with one: a game, with one pass. */
function title(overrides: Partial<ExportTitle> = {}): ExportTitle {
  return {
    mediaId: 3003,
    title: 'Hollow Knight',
    genres: ['Adventure', 'Indie', 'Platform'],
    primaryGenre: null,
    developers: ['Team Cherry'],
    releaseDate: '2017-02-24',
    releasePrecision: 'Day',
    hltbMainStoryHours: 27,
    hltbMainExtraHours: 41.6,
    hltbCompletionistHours: 65.59,
    hltbAllStylesHours: 41.82,
    hltbId: 26286,
    passes: [logEntry({ status: 'Backlog' })],
    ...overrides,
  };
}

/** The three sheets for these titles, by name. */
function build(titles: ExportTitle[], definition: HobbyDefinition = GAMES) {
  const [games, passes, notes] = exportSheets(definition, titles);
  return { games, passes, notes, all: [games, passes, notes] };
}

const valueOf = (cell: Cell | undefined) => (cell as CellObject | null | undefined)?.value;

const headers = (sheet: ExportSheet) => (sheet.data[0] ?? []).map(valueOf);

/** One row of a sheet, by its column headers. Row 1 is the first under the header. */
function row(sheet: ExportSheet, index: number): Record<string, Cell | undefined> {
  const cells = sheet.data[index];
  if (cells === undefined) {
    throw new Error(`${sheet.sheet} has no row ${index}`);
  }

  const names = headers(sheet);
  return Object.fromEntries(cells.map((cell, column) => [String(names[column]), cell]));
}

/** What one column holds, top to bottom. */
const down = (sheet: ExportSheet, header: string) =>
  sheet.data.slice(1).map((cells) => valueOf(cells[headers(sheet).indexOf(header)]));

const day = (year: number, month: number, date: number) => new Date(Date.UTC(year, month - 1, date));

describe('exportSheets', () => {
  it("names the sheets and their columns in the hobby's words", () => {
    const { games, passes, notes, all } = build([title()]);

    expect(all.map((sheet) => sheet.sheet)).toEqual(['Games', 'Playthroughs', 'Notes']);
    expect(headers(games)).toEqual([
      'Title',
      'Status',
      'Rating',
      'Hours played',
      'Platform',
      'Started',
      'Finished',
      'Added',
      'Playthroughs',
      'Genre',
      'All genres',
      'Developers',
      'Released',
      'HLTB main story',
      'HLTB main + extra',
      'HLTB completionist',
      'HLTB all play styles',
      'HowLongToBeat',
      'Latest note',
    ]);
    expect(headers(passes)).toEqual([
      'Title',
      'Playthrough',
      'Status',
      'Rating',
      'Hours played',
      'Platform',
      'Started',
      'Finished',
      'Notes',
    ]);
    expect(headers(notes)).toEqual(['Title', 'Playthrough', 'Written', 'Note']);
  });

  it('builds a board of another hobby from its own words and its own fields', () => {
    // Nothing here names games: a films board with an export block would say Films and
    // Viewings, call the column Watching, and have no hours, platform or HowLongToBeat columns,
    // because a film's pass records neither and HowLongToBeat says nothing about films.
    const films: HobbyDefinition = {
      ...MOVIES,
      export: {
        holds: 'Every film, viewing and note on this board, as an Excel file.',
        sheets: { titles: 'Films', passes: 'Viewings', notes: 'Notes' },
        pass: 'Viewing',
      },
    };

    const { games, passes, all } = build(
      [title({ title: 'Arrival', passes: [logEntry({ status: 'InProgress' })] })],
      films,
    );

    expect(all.map((sheet) => sheet.sheet)).toEqual(['Films', 'Viewings', 'Notes']);
    expect(valueOf(row(games, 1).Status)).toBe('Watching');
    expect(headers(games)).toContain('Viewings');
    expect(headers(passes)).toContain('Viewing');

    for (const sheet of all) {
      for (const absent of ['Hours played', 'Platform', 'HLTB main story', 'HowLongToBeat']) {
        expect(headers(sheet)).not.toContain(absent);
      }
    }
  });

  it('lays the titles out column by column, keeping the order each column is ranked in', () => {
    // The API answers in the board's manual order, which interleaves the columns: a position is
    // a place within one column. The sheet takes the columns in board order and keeps the API's
    // order inside each.
    const at = (name: string, status: LogStatus) =>
      title({ title: name, passes: [logEntry({ status })] });

    const { games, passes } = build([
      at('Celeste', 'Completed'),
      at('Outer Wilds', 'Backlog'),
      at('Pokémon Scarlet', 'Dropped'),
      at('Hollow Knight: Silksong', 'InProgress'),
      at('Witchbrook', 'Backlog'),
      at('Stardew Valley', 'OnHold'),
      at('Mega Man 2', 'Completed'),
    ]);

    const boardOrder = [
      'Outer Wilds',
      'Witchbrook',
      'Hollow Knight: Silksong',
      'Stardew Valley',
      'Celeste',
      'Mega Man 2',
      'Pokémon Scarlet',
    ];
    expect(down(games, 'Title')).toEqual(boardOrder);
    expect(down(passes, 'Title')).toEqual(boardOrder);
  });

  it('takes a Games row from the current pass, as the card does', () => {
    // The replay under way is the card; the finish before it is history, and is on the next
    // sheet. So the rating is the replay's — none yet — not the 9 the first run earned.
    const replay = logEntry({
      id: 2,
      status: 'InProgress',
      rating: null,
      hoursPlayed: 21.5,
      platform: 'PC',
      startedAt: '2026-09-12T16:00:00+00:00',
      loggedAt: '2026-09-12T16:00:00+00:00',
    });
    const firstRun = logEntry({
      id: 1,
      status: 'Completed',
      rating: 9,
      hoursPlayed: 38.5,
      platform: 'Nintendo Switch',
      startedAt: '2026-06-02T16:00:00+00:00',
      completedAt: '2026-07-15T16:00:00+00:00',
      loggedAt: '2026-08-22T16:00:00+00:00',
    });

    const cells = row(build([title({ passes: [replay, firstRun] })]).games, 1);

    expect(cells.Status).toMatchObject({ value: 'Playing' });
    expect(cells.Rating).toBeNull();
    expect(cells['Hours played']).toMatchObject({ type: Number, value: 21.5 });
    expect(cells.Platform).toMatchObject({ type: String, value: 'PC' });
    expect(cells.Started).toMatchObject({ type: Date, value: day(2026, 9, 12) });
    expect(cells.Finished).toBeNull();
    // When it first went on the board: the oldest pass, not the one under way.
    expect(cells.Added).toMatchObject({ type: Date, value: day(2026, 8, 22) });
    expect(cells.Playthroughs).toMatchObject({ type: Number, value: 2 });
  });

  it("says what the catalogue says, in the board's words", () => {
    const cells = row(
      build([
        title({
          genres: ['Adventure', 'Indie', 'Platform'],
          primaryGenre: null,
          developers: ['Team Cherry', 'Another Studio'],
        }),
      ]).games,
      1,
    );

    // The genre the card is painted as — the hobby's automatic pick, as nobody chose one.
    expect(cells.Genre).toMatchObject({ type: String, value: 'Platform' });
    expect(cells['All genres']).toMatchObject({ value: 'Adventure, Indie, Platform' });
    expect(cells.Developers).toMatchObject({ value: 'Team Cherry, Another Studio' });
    expect(cells.HowLongToBeat).toMatchObject({
      type: String,
      value: 'https://howlongtobeat.com/game/26286',
    });
  });

  it('paints a row with the genre that was chosen, as the card is painted', () => {
    const cells = row(build([title({ primaryGenre: 'Adventure' })]).games, 1);

    expect(cells.Genre).toMatchObject({ value: 'Adventure' });
  });

  it('writes Released as a date for a day, and in the calendar’s words otherwise', () => {
    const released = (overrides: Partial<ExportTitle>) =>
      row(build([title(overrides)]).games, 1).Released;

    expect(released({ releaseDate: '2019-05-28', releasePrecision: 'Day' })).toMatchObject({
      type: Date,
      value: day(2019, 5, 28),
      format: 'yyyy-mm-dd',
      align: 'right',
    });
    expect(released({ releaseDate: '2026-09-01', releasePrecision: 'Month' })).toMatchObject({
      type: String,
      value: 'Sep 2026',
      align: 'right',
    });
    expect(released({ releaseDate: '2027-01-01', releasePrecision: 'Quarter' })).toMatchObject({
      value: 'Q1 2027',
      align: 'right',
    });
    expect(released({ releaseDate: '2026-01-01', releasePrecision: 'Year' })).toMatchObject({
      value: '2026',
    });
    expect(released({ releaseDate: null, releasePrecision: 'Unknown' })).toMatchObject({
      value: 'TBA',
    });
  });

  it('leaves Released blank for a title nobody has asked a provider about', () => {
    // Not TBA, which is what formatRelease says for it. The calendar never shows such a title, so
    // that is harmless there; here it would stamp every title from before the calendar TBA, when
    // a null precision means it reads as released.
    const { games } = build([title({ releaseDate: null, releasePrecision: null })]);

    expect(row(games, 1).Released).toBeNull();
  });

  it('writes numbers as numbers, and a missing one as an empty cell rather than nought', () => {
    const { games, passes } = build([
      title({
        hltbMainStoryHours: 27,
        hltbMainExtraHours: null,
        hltbCompletionistHours: 65.59,
        hltbAllStylesHours: null,
        hltbId: null,
        passes: [logEntry({ status: 'Completed', rating: 8.5, hoursPlayed: null })],
      }),
    ]);
    const cells = row(games, 1);

    expect(cells.Rating).toMatchObject({ type: Number, value: 8.5 });
    expect(cells['Hours played']).toBeNull();
    expect(cells['HLTB main story']).toMatchObject({ type: Number, value: 27 });
    expect(cells['HLTB main + extra']).toBeNull();
    expect(cells['HLTB completionist']).toMatchObject({ type: Number, value: 65.59 });
    expect(cells['HLTB all play styles']).toBeNull();
    expect(cells.HowLongToBeat).toBeNull();

    // A count is a number however small: no notes is nought notes, not a figure nobody gave.
    expect(row(passes, 1).Notes).toMatchObject({ type: Number, value: 0 });
  });

  it('writes whatever was typed as text, a leading = or - included', () => {
    // A string cell is never a formula, which is the whole of why a note beginning = is safe in
    // this format. Nothing here is a formula, and nothing typed is anything but a string.
    const { games, notes, all } = build([
      title({
        title: '=HYPERLINK("http://example.test")',
        passes: [
          logEntry({
            platform: '+cmd',
            notes: [note({ id: 9, body: '=SUM(A1:A9)' }), note({ id: 8, body: '- Mantis Lords' })],
          }),
        ],
      }),
    ]);

    expect(row(games, 1).Title).toMatchObject({
      type: String,
      value: '=HYPERLINK("http://example.test")',
    });
    expect(row(games, 1).Platform).toMatchObject({ type: String, value: '+cmd' });
    expect(row(notes, 1).Note).toMatchObject({ type: String, value: '=SUM(A1:A9)' });
    expect(row(notes, 2).Note).toMatchObject({ type: String, value: '- Mantis Lords' });

    for (const sheet of all) {
      for (const cells of sheet.data) {
        for (const cell of cells) {
          expect((cell as CellObject | null)?.type).not.toBe('Formula');
        }
      }
    }
  });

  it('keeps an evening here on its own day, and a note on its own minute', () => {
    // 9:30pm on 20 August here is 01:30 on the 21st in UTC. An Excel date has no zone and the
    // writer reads a Date in UTC, so the cell is the wall-clock time here written as UTC.
    const evening = '2026-08-21T01:30:00+00:00';
    const { games, notes } = build([
      title({
        passes: [
          logEntry({
            status: 'Completed',
            startedAt: evening,
            completedAt: evening,
            loggedAt: evening,
            notes: [note({ writtenAt: evening })],
          }),
        ],
      }),
    ]);

    const cells = row(games, 1);
    expect(cells.Started).toMatchObject({ value: day(2026, 8, 20) });
    expect(cells.Finished).toMatchObject({ value: day(2026, 8, 20), format: 'yyyy-mm-dd' });
    expect(cells.Added).toMatchObject({ value: day(2026, 8, 20) });
    expect(row(notes, 1).Written).toMatchObject({
      type: Date,
      value: new Date(Date.UTC(2026, 7, 20, 21, 30)),
      format: 'yyyy-mm-dd hh:mm',
    });
  });

  it('numbers each title’s passes from the first, on the passes sheet and against each note', () => {
    // The API sends passes newest first. The first run is playthrough 1 however many came after.
    const { passes, notes } = build([
      title({
        passes: [
          logEntry({
            id: 2,
            status: 'Completed',
            notes: [note({ id: 21, body: 'Second time', writtenAt: '2026-09-01T23:30:00+00:00' })],
          }),
          logEntry({
            id: 1,
            status: 'Completed',
            rating: 7,
            notes: [note({ id: 11, body: 'First time', writtenAt: '2026-08-22T01:00:00+00:00' })],
          }),
        ],
      }),
    ]);

    expect(row(passes, 1)).toMatchObject({ Playthrough: { value: 1 }, Rating: { value: 7 } });
    expect(row(passes, 2)).toMatchObject({ Playthrough: { value: 2 }, Rating: null });
    expect(row(passes, 1).Notes).toMatchObject({ value: 1 });

    expect(row(notes, 1)).toMatchObject({
      Playthrough: { value: 2 },
      Note: { value: 'Second time' },
    });
    expect(row(notes, 2)).toMatchObject({
      Playthrough: { value: 1 },
      Note: { value: 'First time' },
    });
  });

  it('lists every note on the board newest first, and puts the newest on its card’s row', () => {
    // Across titles and across passes. Two written in the same instant are told apart by id,
    // newest first, as the card's latest note is.
    const { games, notes } = build([
      title({
        title: 'Hollow Knight',
        passes: [
          logEntry({
            id: 2,
            notes: [
              note({ id: 6, body: 'Pantheon 5 still beats me', writtenAt: '2026-09-02T00:00:00+00:00' }),
            ],
          }),
          logEntry({
            id: 1,
            status: 'Completed',
            notes: [
              note({ id: 7, body: 'Mantis Lords first try', writtenAt: '2026-09-02T00:00:00+00:00' }),
              note({ id: 3, body: 'Logged from memory', writtenAt: '2026-08-22T01:00:00+00:00' }),
            ],
          }),
        ],
      }),
      title({
        title: 'Celeste',
        passes: [
          logEntry({
            notes: [note({ id: 4, body: 'Farewell is brutal', writtenAt: '2026-08-30T00:00:00+00:00' })],
          }),
        ],
      }),
    ]);

    expect(down(notes, 'Note')).toEqual([
      'Mantis Lords first try',
      'Pantheon 5 still beats me',
      'Farewell is brutal',
      'Logged from memory',
    ]);
    expect(down(notes, 'Title')).toEqual(['Hollow Knight', 'Hollow Knight', 'Celeste', 'Hollow Knight']);
    expect(row(games, 1)['Latest note']).toMatchObject({ value: 'Mantis Lords first try' });
  });

  it('freezes the header and the titles, sizes every column, and wraps only the notes', () => {
    const { notes, all } = build([title({ passes: [logEntry({ notes: [note()] })] })]);

    for (const sheet of all) {
      expect(sheet.stickyRowsCount).toBe(1);
      expect(sheet.stickyColumnsCount).toBe(1);
      expect(sheet.columns).toHaveLength(headers(sheet).length);
      expect(sheet.columns.every((column) => column.width > 0)).toBe(true);

      for (const header of sheet.data[0] ?? []) {
        expect(header).toMatchObject({ type: String, fontWeight: 'bold' });
      }
    }

    expect(row(notes, 1).Note).toMatchObject({ wrap: true });
    expect(row(notes, 1).Title).not.toHaveProperty('wrap');
  });

  it('builds the sheets with nothing in them for an empty board', () => {
    expect(build([]).all.map((sheet) => sheet.data.length)).toEqual([1, 1, 1]);
  });
});

describe('exportFileName', () => {
  it('names the file after the board and the day it was made here', () => {
    expect(exportFileName('games', '2026-10-04')).toBe('hobbytracker-games-2026-10-04.xlsx');
  });
});
