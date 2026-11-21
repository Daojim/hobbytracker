import { useMemo } from 'react';
import { preferenceStore } from '../lib/preferenceStore';

/**
 * What a card shows, as ticked in Settings since #27: the last note, its words and its picture
 * together, and the length. Two boxes, the user's pick over a third for the picture apart.
 *
 * Per board and per browser, as the Columns group is beside it, and for its reasons: a film's
 * runtime may be worth a glance where a game's estimate is not, and nothing about how a card looks
 * belongs on the server. So a share draws its cards whole: the server never knows a browser's
 * choice, and a visitor's choice is about their own board.
 *
 * A store rather than an attribute, `board/hiddenColumns.ts`'s rule: the card reads it, and the
 * card is a sibling of the Settings that writes it, so both subscribe to `lib/preferenceStore.ts`
 * and the board hears a box ticked without a reload.
 */

/** The parts a card can leave off. The note is its words and its picture, one part. */
export const CARD_PARTS = ['note', 'length'] as const;

export type CardPart = (typeof CARD_PARTS)[number];

export type CardShows = Readonly<Record<CardPart, boolean>>;

/** A card as it always was, and as a share draws every card. */
export const EVERYTHING: CardShows = { note: true, length: true };

const PREFIX = 'hobbytracker.card.';

export const cardShowsKey = (hobby: string) => `${PREFIX}${hobby}`;

const isPart = (value: unknown): value is CardPart => CARD_PARTS.includes(value as CardPart);

/**
 * What storage says is left off, trusting none of it, and kept as a list of what is left off
 * rather than of what is shown, so a part added later starts shown: the Columns group's rule. An
 * unrecognised value shows everything, the theme's rule for the theme's reason.
 */
export function parseCardShows(stored: string | null): CardShows {
  if (stored === null) {
    return EVERYTHING;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return EVERYTHING;
  }

  if (!Array.isArray(parsed)) {
    return EVERYTHING;
  }

  const off = new Set(parsed.filter(isPart));
  return { note: !off.has('note'), length: !off.has('length') };
}

const store = preferenceStore(PREFIX);

/** What this board's cards show, kept current as it changes here or in another tab. */
export function useCardShows(hobby: string): CardShows {
  // Parsed after, from the raw string: a fresh object per read would re-render for ever.
  const stored = store.useValue(cardShowsKey(hobby));
  return useMemo(() => parseCardShows(stored), [stored]);
}

/** Puts a part on this board's cards, or leaves it off. */
export function setCardShows(hobby: string, part: CardPart, shown: boolean): void {
  const key = cardShowsKey(hobby);
  const now = parseCardShows(store.read(key));
  const next = { ...now, [part]: shown };

  // In the card's order, so what is stored reads the way a card does.
  store.write(key, JSON.stringify(CARD_PARTS.filter((each) => !next[each])));
}
