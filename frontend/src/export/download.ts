import { exportLibrary } from '../api/library';
import { hobbyDefinition } from '../hobbies';
import { exportFileName, exportSheets } from './sheets';

/**
 * Builds a board's spreadsheet and hands it to the browser to save — what *Download a
 * spreadsheet* in Settings does.
 *
 * The writer is imported here, when the row is pressed, rather than at the top of a module: about
 * 20 KB gzipped that nobody pays for until they ask for a file. It is asked for beside the board's
 * answer rather than after it, so neither waits on the other. Its zipper, fflate, compresses any
 * part of the file over 160,000 bytes in a worker it starts from a `blob:` address, which the app
 * sets no Content Security Policy to refuse. One that did would need `worker-src blob:`.
 */
export async function downloadSpreadsheet(hobby: string): Promise<void> {
  const [titles, { default: writeXlsxFile }] = await Promise.all([
    exportLibrary(hobby),
    import('write-excel-file/browser'),
  ]);

  await writeXlsxFile(exportSheets(hobbyDefinition(hobby), titles)).toFile(exportFileName(hobby));
}
