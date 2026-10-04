import type { CellObject, Row } from 'write-excel-file/browser';
import type { ExportTitle, LogEntry, Note } from '../api/types';
import { BOARD_STATUSES, resolveGenre, type HobbyDefinition } from '../hobbies';
import { HLTB_TIER_LABELS, hltbGameUrl, type HltbEstimates } from '../journal/fields';
import { formatRelease, type Day } from '../lib/release';
import { journalDateInput, journalMinute, todayHere } from '../lib/time';

/**
 * The spreadsheet a board downloads from Settings, as the sheets the writer is handed: one row per
 * title, one per pass, one per note, in the hobby's words.
 *
 * A pure function of the API's answer, so everything the file says is tested here without a file.
 * The writer itself is loaded only when the row is pressed — see `download.ts` — and the import
 * of it above is of types alone, which the build erases.
 *
 * **Every value is typed, and nothing is a formula.** What a person typed goes in as a string
 * cell, which a spreadsheet never evaluates, so a note beginning `=` is a note. Numbers go in as
 * numbers so a column adds up, and a missing one is an empty cell rather than nought. Dates go in
 * as dates, which is what makes a column of them sort.
 */

/** One sheet, in the shape the writer takes. */
export interface ExportSheet {
  sheet: string;
  /** One per column, in the writer's unit: roughly a character of the default font. */
  columns: { width: number }[];
  /** The header row, then the rows. */
  data: Row[];
  /** The header row and the title column stay put while the rest scrolls. */
  stickyRowsCount: number;
  stickyColumnsCount: number;
}

/** What day a date cell shows, and a minute: ISO, which lines up down a column and stays narrow. */
const DAY_FORMAT = 'yyyy-mm-dd';
const MINUTE_FORMAT = 'yyyy-mm-dd hh:mm';

type Cell = CellObject | null;

interface Column<T> {
  header: string;
  width: number;
  cell(row: T): Cell;
  /** Laid over every cell in the column that has a value. */
  style?: Pick<CellObject, 'align' | 'wrap'>;
}

/**
 * The parts of a wall-clock stamp — `YYYY-MM-DD`, or `YYYY-MM-DD HH:mm` — written as UTC.
 *
 * An Excel date has no zone, and the writer turns a `Date` into one by reading it in UTC. So the
 * day and time *here* go in as that same day and time in UTC, built from the parts. Built any
 * other way — from the instant itself, or `new Date(day)` — an evening completion lands on the
 * next day, because evening here is already tomorrow in UTC.
 */
const STAMP = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/;

function wallClock(stamp: string): Date {
  const match = STAMP.exec(stamp);
  if (match === null) {
    // Every stamp here comes from lib/time.ts or is a day the API sent, so this is a bug, and a
    // file with a wrong date in it is worse than no file.
    throw new Error(`Not a day or a minute: ${stamp}`);
  }

  const [, year, month, date, hour = '0', minute = '0'] = match;
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(date), Number(hour), Number(minute)),
  );
}

const text =(value: string | null | undefined): Cell =>
  value === null || value === undefined || value === '' ? null : { type: String, value };

const number = (value: number | null): Cell => (value === null ? null : { type: Number, value });

/** A calendar day: one a publisher announced, or the one an instant fell on here. */
const day = (value: Day): Cell => ({ type: Date, value: wallClock(value), format: DAY_FORMAT });

/** The day an instant fell on here — through `lib/time.ts`, like every instant the board shows. */
const dayOf = (instant: string | null): Cell => (instant === null ? null : day(journalDateInput(instant)));

/** The day and the minute an instant fell on here. */
const minuteOf = (instant: string): Cell => ({
  type: Date,
  value: wallClock(journalMinute(instant)),
  format: MINUTE_FORMAT,
});

/**
 * When it comes out, at the precision it was announced at: a date for a day, and the calendar's
 * own words for anything vaguer — `Sep 2026`, `Q1 2027`, `2026`, `TBA`.
 *
 * **Blank, not TBA, for a null precision.** That is a title nobody has asked a provider about,
 * which reads as released; `formatRelease` calls it TBA, harmlessly on the calendar, which never
 * shows one. Here it would stamp every title from before the calendar TBA.
 */
function released({ releaseDate, releasePrecision }: ExportTitle): Cell {
  if (releasePrecision === null) {
    return null;
  }

  return releasePrecision === 'Day' && releaseDate !== null
    ? day(releaseDate)
    : text(formatRelease(releaseDate, releasePrecision));
}

/**
 * HowLongToBeat's figures in the order the sheet gives them — the story, then more of it, then
 * everything, then the figure across every play style — headed with its own names for them.
 */
const ESTIMATES: { key: keyof HltbEstimates; width: number }[] = [
  { key: 'hltbMainStoryHours', width: 15 },
  { key: 'hltbMainExtraHours', width: 16 },
  { key: 'hltbCompletionistHours', width: 17 },
  { key: 'hltbAllStylesHours', width: 18 },
];

function sheet<T>(name: string, columns: (Column<T> | false)[], rows: readonly T[]): ExportSheet {
  const shown = columns.filter((column): column is Column<T> => column !== false);

  return {
    sheet: name,
    columns: shown.map(({ width }) => ({ width })),
    data: [
      shown.map(({ header }) => ({
        type: String,
        value: header,
        fontWeight: 'bold',
        alignVertical: 'top',
      })),

      // Top-aligned throughout, so a wrapped note does not leave the rest of its row floating in
      // the middle of a tall one.
      ...rows.map((row) =>
        shown.map((column): Cell => {
          const cell = column.cell(row);
          return cell === null ? null : { ...cell, alignVertical: 'top', ...column.style };
        }),
      ),
    ],
    stickyRowsCount: 1,
    stickyColumnsCount: 1,
  };
}

interface TitleRow {
  title: ExportTitle;
  /** The pass the card shows: the API's first. */
  current: LogEntry;
  /** The pass that put it on the board: the API's last. */
  first: LogEntry;
  /** Every note on the title, newest first. */
  notes: NoteRow[];
}

interface PassRow {
  title: ExportTitle;
  pass: LogEntry;
  /** Counted from the first: the first run is playthrough 1 however many came after it. */
  number: number;
}

interface NoteRow {
  title: ExportTitle;
  note: Note;
  number: number;
}

/**
 * Newest first, and by id between two written in the same instant — the rule the card's latest
 * note is picked by, so the sheet's latest note is the card's.
 */
const newestFirst = (a: NoteRow, b: NoteRow) =>
  Date.parse(b.note.writtenAt) - Date.parse(a.note.writtenAt) || b.note.id - a.note.id;

/**
 * The three sheets for a board, from the API's answer.
 *
 * Titles go column by column in board order, and within a column in the order the API gave them,
 * which is the column's manual ranking: a position is a place within one column, so the API's
 * order interleaves them, and a stable sort by column puts each back together.
 */
export function exportSheets(
  definition: HobbyDefinition,
  titles: readonly ExportTitle[],
): [titles: ExportSheet, passes: ExportSheet, notes: ExportSheet] {
  const words = definition.export;
  if (words === null) {
    // Only a hobby with words for the file has a row to press.
    throw new Error(`The ${definition.slug} board has no spreadsheet.`);
  }

  const { fields } = definition.journal;
  const status = (pass: LogEntry) => definition.columnLabel[pass.status];

  // The figures and the link are HowLongToBeat's, and a hobby it says nothing about has the pin's
  // half of the same fact set to null — see JournalSection.setHltbId.
  const estimated = definition.journal.setHltbId !== null;

  const byTitle: TitleRow[] = titles
    .flatMap((title) => {
      const count = title.passes.length;
      const [current, first] = [title.passes[0], title.passes[count - 1]];

      // A title is on the board because it has a pass, so one without is not on it: there is no
      // card to take a row from.
      if (current === undefined || first === undefined) {
        return [];
      }

      const notes = title.passes
        .flatMap((pass, index) => pass.notes.map((note) => ({ title, note, number: count - index })))
        .sort(newestFirst);

      return [{ title, current, first, notes }];
    })
    .sort(
      (a, b) => BOARD_STATUSES.indexOf(a.current.status) - BOARD_STATUSES.indexOf(b.current.status),
    );

  const passRows: PassRow[] = byTitle.flatMap(({ title }) =>
    [...title.passes].reverse().map((pass, index) => ({ title, pass, number: index + 1 })),
  );

  const noteRows: NoteRow[] = byTitle.flatMap(({ notes }) => notes).sort(newestFirst);

  const titleColumns: (Column<TitleRow> | false)[] = [
    { header: 'Title', width: 40, cell: ({ title }) => text(title.title) },

    // A row is its card: everything from here to Finished is the current pass's.
    { header: 'Status', width: 11, cell: ({ current }) => text(status(current)) },
    { header: 'Rating', width: 7, cell: ({ current }) => number(current.rating) },
    fields.hoursPlayed && {
      header: 'Hours played',
      width: 12,
      cell: ({ current }) => number(current.hoursPlayed),
    },
    fields.platform && { header: 'Platform', width: 16, cell: ({ current }) => text(current.platform) },
    { header: 'Started', width: 11, cell: ({ current }) => dayOf(current.startedAt) },
    { header: 'Finished', width: 11, cell: ({ current }) => dayOf(current.completedAt) },

    // When it went on the board, which is the only date a Backlog row has.
    { header: 'Added', width: 11, cell: ({ first }) => dayOf(first.loggedAt) },
    { header: words.sheets.passes, width: 12, cell: ({ title }) => number(title.passes.length) },

    // The genre the card is painted as, chosen or automatic, and then every one the provider gave.
    {
      header: 'Genre',
      width: 18,
      cell: ({ title }) => text(resolveGenre(definition.genres, title.genres, title.primaryGenre)),
    },
    { header: 'All genres', width: 30, cell: ({ title }) => text(title.genres?.join(', ')) },
    { header: 'Developers', width: 26, cell: ({ title }) => text(title.developers?.join(', ')) },

    // Right-aligned, so a column holding both dates and words reads as one.
    { header: 'Released', width: 11, style: { align: 'right' }, cell: ({ title }) => released(title) },

    ...ESTIMATES.map(
      ({ key, width }): Column<TitleRow> | false =>
        estimated && {
          header: `HLTB ${HLTB_TIER_LABELS[key].toLowerCase()}`,
          width,
          cell: ({ title }) => number(title[key]),
        },
    ),

    // A plain address rather than a link, so the file holds no formulas at all.
    estimated && {
      header: 'HowLongToBeat',
      width: 40,
      cell: ({ title }) => (title.hltbId === null ? null : text(hltbGameUrl(title.hltbId))),
    },

    // What the card's two lines are cut from, whole: the newest note across every pass.
    { header: 'Latest note', width: 44, cell: ({ notes }) => text(notes[0]?.note.body) },
  ];

  const passColumns: (Column<PassRow> | false)[] = [
    { header: 'Title', width: 40, cell: ({ title }) => text(title.title) },
    { header: words.pass, width: 11, cell: ({ number: counted }) => number(counted) },
    { header: 'Status', width: 11, cell: ({ pass }) => text(status(pass)) },
    { header: 'Rating', width: 7, cell: ({ pass }) => number(pass.rating) },
    fields.hoursPlayed && { header: 'Hours played', width: 12, cell: ({ pass }) => number(pass.hoursPlayed) },
    fields.platform && { header: 'Platform', width: 16, cell: ({ pass }) => text(pass.platform) },
    { header: 'Started', width: 11, cell: ({ pass }) => dayOf(pass.startedAt) },
    { header: 'Finished', width: 11, cell: ({ pass }) => dayOf(pass.completedAt) },
    { header: words.sheets.notes, width: 7, cell: ({ pass }) => number(pass.notes.length) },
  ];

  const noteColumns: Column<NoteRow>[] = [
    { header: 'Title', width: 40, cell: ({ title }) => text(title.title) },
    { header: words.pass, width: 11, cell: ({ number: counted }) => number(counted) },
    { header: 'Written', width: 17, cell: ({ note }) => minuteOf(note.writtenAt) },

    // Exactly as typed, line breaks and all, so it wraps; a note is at most 4,000 characters and a
    // cell holds 32,767, so nothing is cut.
    { header: 'Note', width: 70, style: { wrap: true }, cell: ({ note }) => text(note.body) },
  ];

  return [
    sheet(words.sheets.titles, titleColumns, byTitle),
    sheet(words.sheets.passes, passColumns, passRows),
    sheet(words.sheets.notes, noteColumns, noteRows),
  ];
}

/** `hobbytracker-games-2026-10-04.xlsx`: the board, and the day it was made here. */
export function exportFileName(hobby: string, today: Day = todayHere()): string {
  return `hobbytracker-${hobby}-${today}.xlsx`;
}
