import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
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
        const game = (await response.json()) as { hltbAllStylesHours: number | null };
        return game.hltbAllStylesHours;
      },
      { message: `HowLongToBeat estimate for media ${mediaId}`, timeout: 20_000 },
    )
    .not.toBeNull();
}

/**
 * Waits for the worker to have *asked*, whatever the answer was.
 *
 * Read straight off `hltb_checked_at`, because separating "never asked" from "asked, nothing
 * matched" is the entire reason that column exists. A title the matcher refuses changes no other
 * field, so this is the only honest signal that the lookup has been and gone. The journal's read
 * carries the column too since the arrow beside the pin, but this reads the row, so the specs
 * that wait on it do not lean on the read some of them are testing.
 */
export async function awaitChecked(mediaId: number): Promise<void> {
  await expect
    .poll(
      () => psql(`select hltb_checked_at is not null from games where media_id = ${mediaId};`),
      { message: `HowLongToBeat lookup for media ${mediaId}`, timeout: 20_000 },
    )
    .toBe('t');
}

/**
 * One of HowLongToBeat's estimates in the drawer, found by the tier it belongs to.
 *
 * These used to be four spans reading "Main story: 8 h", so a spec could name one with a single
 * string. They are a grid of label-and-value pairs now — which is the whole point of the change,
 * since a wrapping row could separate a tier's name from its number — so a locator has to find
 * the pair and read the value out of it.
 *
 * Scoped to the dialog because the board behind carries the same headline figure on a card, and
 * `hasText` is a substring test that "Main story" and "Main + Extra" stay clear of either way.
 */
export function estimate(page: Page, tier: string): Locator {
  return page.getByRole('dialog').locator('[data-hltb-tier]').filter({ hasText: tier });
}

/**
 * Today as the journal's *Last checked* line writes a day of this year: `Nov 3`.
 *
 * The day here, for `todayOnCard`'s reason, and without the year, because the line gives one
 * only for a check in another.
 */
export function todayAsChecked(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
  }).format(new Date());
}

/**
 * Holds the journal's check at the network until the function handed back is called, so a spec
 * can look at the drawer while one runs. A check is a fetch by id, which the stub answers at
 * once, so without this there is no moment to look at.
 *
 * The check is let through to the real API afterwards, not answered here: what it brings back
 * is still the stub's, through the real client.
 */
export async function holdChecks(page: Page): Promise<() => void> {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));

  await page.route('**/api/games/*/hltb/refresh', async (route) => {
    await held;
    await route.continue();
  });

  return release;
}
