import { journalDateInput } from '../lib/time';
import type { LogEntry } from '../api/types';

/**
 * The two form fields whose rules are worth stating away from the markup.
 */

/**
 * How long a pass sits unsaved before it writes itself.
 *
 * There is no Save button: a pass is a handful of small corrections and a button between each of
 * them and the record is a step nobody wants. The cost of that is a write per change, and this
 * is what buys it back — "8.5" is three keystrokes and one decision, and the first of the three
 * is a bare 8, which is a rating the server would accept and store.
 *
 * Half a second, because it has to outlast the gap between two keys and must not outlast the
 * reader's attention: a confirmation that arrives after they have looked away is one they will
 * never see, and the drawer can be closed by then.
 */
export const AUTOSAVE_MS = 500;

/** Mirrors RatingAttribute on the server, word for word, so both sides say the same thing. */
export const RATING_RULE = 'Rating must be between 1.0 and 10.0, with at most one decimal place.';


/**
 * Where the slider's handle rests when nothing has been rated.
 *
 * A range input has no empty state — it always holds a number — so "not rated" is carried by the
 * text box being blank and by the slider's aria-valuetext, not by the handle's position. It sits
 * at the bottom of the scale rather than the middle because a handle in the middle reads as a
 * deliberate 5.5.
 */
export const UNRATED_THUMB = 1;

export type ParsedRating =
  | { value: number | null; error?: undefined }
  | { value?: undefined; error: string };

/**
 * Reads the rating box.
 *
 * Tested against the input text rather than the parsed number on purpose: `8.75 * 10` is not
 * exactly `87.5` in binary floating point, so counting decimal places arithmetically is a way to
 * accept the one value this rule exists to reject. The column is `numeric(3,1)` and Postgres
 * *rounds* rather than refusing, so an accepted 8.75 would be stored as 8.8 and reported back as
 * a rating the database does not hold.
 */
export function parseRating(input: string): ParsedRating {
  const trimmed = input.trim();

  // Empty is "not rated yet", which is always allowed. It is not zero.
  if (trimmed === '') {
    return { value: null };
  }

  if (!/^\d+(\.\d)?$/.test(trimmed)) {
    return { error: RATING_RULE };
  }

  const value = Number(trimmed);
  return value >= 1 && value <= 10 ? { value } : { error: RATING_RULE };
}


/** Mirrors PlaytimeHoursAttribute on the server, so both sides refuse the same numbers. */
export const HOURS_RULE =
  'Hours played must be greater than 0 and at most 999.99, with at most two decimal places.';

/**
 * Reads the hours box.
 *
 * Tested against the text for the same reason as {@link parseRating}, one decimal place further
 * out: the column is numeric(5,2) and Postgres rounds rather than refusing, so a 12.345 counted
 * arithmetically would be accepted and then stored as something else. The ceiling is a separate
 * failure — overflowing numeric(5,2) throws rather than rounding.
 */
export function parseHours(input: string): ParsedRating {
  const trimmed = input.trim();

  // Empty is "not recorded", and is how a number already written down is taken back. Not nought:
  // nought hours played is not a fact about anything.
  if (trimmed === '') {
    return { value: null };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { error: HOURS_RULE };
  }

  const value = Number(trimmed);
  return value > 0 && value <= 999.99 ? { value } : { error: HOURS_RULE };
}

/** Mirrors the Range on SetHltbIdRequest, so both sides refuse the same ids. */
export const HLTB_ID_RULE = 'A HowLongToBeat ID is a whole number, 1 or greater.';

/**
 * Reads the HowLongToBeat id box.
 *
 * Read off the text like {@link parseRating} and {@link parseHours}, though for a different
 * reason: those exist because Postgres rounds a number it cannot hold, where this exists
 * because there is nothing to learn from asking. Pinning is the one route that holds the caller
 * while the server reads a website, so an id that cannot be one should not cost that.
 *
 * The ceiling is int.MaxValue because the server binds this to an int — anything larger fails
 * in the model binder, with a worse message than the rule that could have caught it here.
 */
export function parseHltbId(input: string): ParsedRating {
  const trimmed = input.trim();

  // Empty is a request in its own right: take the pin back. That puts the title back to
  // never-having-been-asked, so the next backfill looks at it again — which is the point.
  if (trimmed === '') {
    return { value: null };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { error: HLTB_ID_RULE };
  }

  const value = Number(trimmed);
  return value >= 1 && value <= 2_147_483_647 ? { value } : { error: HLTB_ID_RULE };
}

export interface HltbTier {
  label: string;
  hours: number;
}

/**
 * HowLongToBeat's three estimates, in its order and under its names, with the ones nobody has
 * submitted a time for left out.
 *
 * Takes the game rather than three loose numbers on purpose: three nullable numbers in a row is
 * exactly the argument list where two get swapped and nothing complains.
 *
 * Dropping the empty tiers rather than rendering them as a dash is what keeps missing data from
 * reading as a broken row — a game with a main-story time and no completionist time is ordinary.
 * It also gives the drawer one condition to check instead of three: an empty list is the whole
 * of "never matched".
 */
export interface HltbEstimates {
  hltbAllStylesHours: number | null;
  hltbMainStoryHours: number | null;
  hltbMainExtraHours: number | null;
  hltbCompletionistHours: number | null;
}

export function hltbTiers(game: HltbEstimates): HltbTier[] {
  return [
    // HowLongToBeat own name for it, and first because it is the figure the site leads with
    // and the one the card carries. The three below break it down.
    { label: 'All play styles', hours: game.hltbAllStylesHours },
    { label: 'Main story', hours: game.hltbMainStoryHours },
    { label: 'Main + Extra', hours: game.hltbMainExtraHours },
    { label: 'Completionist', hours: game.hltbCompletionistHours },
  ].filter((tier): tier is HltbTier => tier.hours !== null);
}
/**
 * What to send for a date field.
 *
 * A date input shows a day, but the column holds an instant. Re-deriving the value from the day
 * on screen would move a 21:30 start to midnight — silent data loss on a save the user made
 * about something else entirely. So an untouched field goes back exactly as it came, and only an
 * edited one is sent as a bare date, which the server reads as that wall-clock moment here.
 */
export function dateFieldValue(input: string, original: string | null): string | null {
  if (input === journalDateInput(original)) {
    return original;
  }

  return input === '' ? null : input;
}

/** Every value the form holds, in the shape the inputs hold it — text, as an input and a select do. */
export interface PassValues {
  rating: string;
  platform: string;
  hours: string;
  season: string;
  episode: string;
  started: string;
  completed: string;
}

/**
 * What a form seeded from this pass would be holding.
 *
 * The form takes these rather than being rebuilt on a React key, which is what it did while
 * there was a Save button to press: a key change is a new set of DOM nodes, and a form that
 * writes itself is refetched half a second after every keystroke — so the field being typed
 * into would lose the keyboard on each write. Assigning the same values to the inputs that
 * already hold them costs a render and changes nothing on screen.
 *
 * A transition *edits the current entry in place* rather than adding one, so the id holds still
 * while the values change underneath — which is why there is no shortcut through `entry.id`
 * here. Opening a *different* pass is a different form, and the drawer's key says so.
 */
export function passValues(entry: LogEntry): PassValues {
  return {
    rating: entry.rating === null ? '' : String(entry.rating),
    platform: entry.platform ?? '',
    hours: entry.hoursPlayed === null ? '' : String(entry.hoursPlayed),
    season: entry.seasonNumber === null ? '' : String(entry.seasonNumber),
    episode: entry.episodeNumber === null ? '' : String(entry.episodeNumber),
    started: journalDateInput(entry.startedAt),
    completed: journalDateInput(entry.completedAt),
  };
}

/**
 * Those seven values as one thing to compare.
 *
 * Both questions the form asks about them are about all seven at once — is there anything the
 * server has not been told, and does the pass on screen still say what the inputs say — so
 * comparing them a field at a time is seven chances to leave one out. That is the bug the old
 * `entrySeed` was written for in its own words: a field missing from the seed was a field a
 * refetch could not correct on screen.
 */
export function valuesKey(values: PassValues): string {
  return [
    values.rating,
    values.platform,
    values.hours,
    values.season,
    values.episode,
    values.started,
    values.completed,
  ].join('|');
}
