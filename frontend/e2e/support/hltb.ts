import { expect, type APIRequestContext } from '@playwright/test';
import { psql } from './database';

/**
 * Waiting for HowLongToBeat, which nothing a person does waits for.
 *
 * That is the design rather than an inconvenience: adding a title replies at once and a worker
 * catches up behind it, because at a politeness floor of seconds per request no HTTP request
 * should be held open for the answer. A spec therefore has to wait the way a person does — by
 * looking again — and these are the two things worth waiting for.
 */

/** Waits for a title to come back with an estimate. */
export async function awaitEstimate(
  request: APIRequestContext,
  mediaId: number,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await request.get(`/api/games/${mediaId}`);
        const game = (await response.json()) as { hltbMainStoryHours: number | null };
        return game.hltbMainStoryHours;
      },
      { message: `HowLongToBeat estimate for media ${mediaId}`, timeout: 20_000 },
    )
    .not.toBeNull();
}

/**
 * Waits for the worker to have *asked*, whatever the answer was.
 *
 * Read straight off `hltb_checked_at`, because separating "never asked" from "asked, nothing
 * matched" is the entire reason that column exists and nothing on the wire carries it. A title
 * the matcher refuses changes no other field, so this is the only honest signal that the lookup
 * has been and gone.
 */
export async function awaitChecked(mediaId: number): Promise<void> {
  await expect
    .poll(
      () => psql(`select hltb_checked_at is not null from games where media_id = ${mediaId};`),
      { message: `HowLongToBeat lookup for media ${mediaId}`, timeout: 20_000 },
    )
    .toBe('t');
}
