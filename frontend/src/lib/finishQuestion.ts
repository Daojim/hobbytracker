import { formatJournalDate } from './time';

/**
 * What a title leaving Completed is asked, on a card and in the journal alike: whether the finish
 * happened. Leaving Completed either replays the title or takes a mistaken finish back, and only
 * the person moving it knows which.
 *
 * Picked at the #14 workshop on 8 October 2026 over a second button on #13's sentence and over
 * two answers each with a line saying what it does: it asks the one fact that decides the answer,
 * and the day is the clue, since a finish at 3:14 this morning reads differently from one in
 * 2018. Here rather than in `journal/`, so the board need not reach into it, as `lib/hours.ts`.
 *
 * The finish is an instant, so it is named in the journal zone as every instant is. Asked with no
 * day when the pass has none: a finished pass can have its finish cleared by hand, and a card's
 * own date falls back to the start, which is no stand-in for it.
 */
export function finishQuestion(completedAt: string | null): string {
  const day = formatJournalDate(completedAt);
  return day === null ? 'Did you finish it?' : `Did you finish it on ${day}?`;
}

/** It was finished, and this is another time through: a new pass, the finished one kept. */
export const REPLAY_ANSWER = 'Yes — start a new pass';

/** It was never finished: this pass goes to the column picked, without its finish. */
export function putBackAnswer(column: string): string {
  return `No — move it to ${column}`;
}
