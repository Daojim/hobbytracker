import type { HobbyDefinition, SearchHit } from '../hobbies';

/**
 * What a tile's add button says, and how it reads aloud — whether the tile is in the search strip
 * or on the Discover page's wall, so the two cannot disagree about one title.
 *
 * Both halves have to be true for the calendar's words, and they are different questions. The
 * hobby decides whether there is a calendar to add to at all; the server decides whether this
 * particular title is out. `released` is taken as given rather than re-derived from the date —
 * the board is partitioned on the server's answer, and a second copy of that rule here would be
 * free to disagree, offering the calendar for something that then lands in Backlog.
 */
export function addWords(
  hit: SearchHit,
  definition: HobbyDefinition,
): { upcoming: boolean; text: string; label: string } {
  const calendar = definition.releases;

  if (calendar !== null && hit.release !== null && !hit.release.released) {
    return { upcoming: true, text: calendar.addAction, label: calendar.describeAdd(hit.title) };
  }

  return { upcoming: false, text: 'Add', label: `Add ${hit.title} to backlog` };
}
