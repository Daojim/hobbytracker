/**
 * Who a page's words are written to.
 *
 * Your board and your Stats page talk to you: *My order*, *the games you started*, *in your
 * backlog*. A share is read by somebody else, to whom "you" would mean themselves, so **a share
 * addresses nobody**, in one set of words whether the owner's name is on it or not. Decided
 * phrase by phrase at the #9 workshop on 4 October 2026, in the table in
 * `docs/plans/games-board-next.md`.
 *
 * **A voice is taken by a page and handed down**, rather than each component asking where it is.
 * A phrase that addresses the owner is written both ways, side by side, as a {@link Voiced} pair,
 * so the two can be read against each other and neither can be left out: a pair missing one is a
 * type error, where a share quietly saying "your" is not.
 */
export type Voice = 'own' | 'shared';

/** One phrase in both voices: to the board's owner, and to nobody. */
export type Voiced<T> = Readonly<Record<Voice, T>>;
