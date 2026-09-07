import { expect, test } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import {
  card,
  column,
  drag,
  entriesFor,
  openJournal,
  seed,
  setSort,
  todayOnCard,
} from './support/board';

/**
 * The third hobby, end to end — and the first one that needed the platform to grow rather than
 * merely to be parameterised.
 *
 * Films proved the seam existed: every route was already the one games use, and only the
 * catalogue differed. A show stretches it. There is a control here that no other hobby has, a
 * second source row against the same provider, and a length that is an estimate where a film's
 * is exact. What a spec proves that no unit test can is that all three survive a real browser,
 * a real Postgres and a real HTTP round trip.
 *
 * Enrichment is synchronous on add, exactly as for films, so a card is complete the moment it
 * lands. The difference is what completes it: `/tv/{id}` needs no `append_to_response`, because
 * a show's creators and seasons are on its base response where a film's director is buried in
 * a crew list hundreds of entries long.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();

  await signIn(page);
  await page.goto('/board/tv');
});

test('finding a show puts it on the board, complete, without leaving it', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search TV shows' }).fill('severance');
  await page.getByRole('button', { name: 'Add Severance to backlog' }).click();

  await expect(page.getByText('On your board')).toBeVisible();

  // Search carries no counts and no runtime, so this figure exists only because `/tv/{id}` was
  // called on add. 19 episodes at 47 minutes, multiplied by Postgres in a generated column and
  // divided back to hours by the board — with the tilde a film's exact runtime refuses.
  const severance = card(page, 'Severance');
  await expect(severance).toBeVisible();
  await expect(severance.getByText('~14.88 h')).toBeVisible();

  // The genre the show's own list picks. TMDB's television vocabulary folds science fiction into
  // fantasy, so this word does not exist on the films board at all — which is the whole reason
  // the genre list is a property of the hobby rather than of the provider.
  await expect(severance.getByText('Sci-Fi & Fantasy')).toBeVisible();
});

test('a show whose runtime is only on its last episode still gets a figure', async ({ page }) => {
  // The fallback chain, and it is load-bearing rather than defensive: `episode_run_time` is
  // empty on most recent TMDB entries, so this is the normal path for anything new. The stub
  // gives The Bear an empty array and a `last_episode_to_air`, so a client that read only the
  // array would put no badge on this card at all — and nothing would say why.
  await seed(page.request, 'The Bear', 'InProgress', { hobby: 'tv' });
  await page.reload();

  // 18 episodes at 32 minutes.
  await expect(card(page, 'The Bear').getByText('~9.6 h')).toBeVisible();
});

test('the hobby nav goes to the TV board, and it is a TV board', async ({ page }) => {
  await page.goto('/board/games');
  await page.getByRole('link', { name: 'TV' }).click();

  await expect(page).toHaveURL(/\/board\/tv$/);

  await expect(page.getByRole('heading', { level: 2, name: /^Watching / })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /^Watched / })).toBeVisible();
});

test('dragging a show through the columns stamps the same dates a game would', async ({ page }) => {
  const mediaId = await seed(page.request, 'Chernobyl', 'Backlog', { hobby: 'tv' });
  await page.reload();

  await drag(page, card(page, 'Chernobyl'), column(page, 'InProgress', 'tv'));

  await expect(column(page, 'InProgress', 'tv').getByText('Chernobyl')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(page.request, mediaId))[0])
    .toMatchObject({ status: 'InProgress', completedAt: null });
  expect((await entriesFor(page.request, mediaId))[0]?.startedAt).not.toBeNull();

  // The DOM, and not just the API, before the second gesture. The move stamps a start date, so
  // the date appearing on the card is what says the refetch has landed and the card underneath
  // the pointer has stopped being replaced. Without it the second drag can begin against an
  // element React is about to remount, and dnd-kit loses the gesture with no error — the
  // same re-render race journal.spec.ts records, reached here through a slow first request
  // rather than through a click.
  await expect(card(page, 'Chernobyl').getByText(todayOnCard())).toBeVisible();

  await drag(page, card(page, 'Chernobyl'), column(page, 'Completed', 'tv'));

  await expect(column(page, 'Completed', 'tv').getByText('Chernobyl')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(page.request, mediaId))[0]?.completedAt)
    .not.toBeNull();
});

test("a show's journal is a show's: a creator, three facts, and where you are", async ({ page }) => {
  await seed(page.request, 'Severance', 'InProgress', { hobby: 'tv', startedAt: '2026-08-10' });
  await page.reload();

  await openJournal(page, 'Severance');
  const drawer = page.getByRole('dialog');

  // `created_by` off the base response — no second call and no crew list to filter.
  await expect(drawer.getByText('Dan Erickson')).toBeVisible();

  // Three facts where a film has one, each a pair that only reads as a fact together. The open
  // end on the span is the point: null `last_air_date` is what a show still running has, and
  // inventing an end would claim it had finished.
  await expect(drawer.getByText('2 seasons · 19 episodes')).toBeVisible();
  await expect(drawer.getByText('Returning Series · 2022–')).toBeVisible();
  await expect(drawer.getByText('47 m')).toBeVisible();

  // The pair no other hobby has, and the two a show does not have either.
  await expect(drawer.getByLabel('Season')).toBeVisible();
  await expect(drawer.getByLabel('Episode')).toBeVisible();
  await expect(drawer.getByLabel('Hours played')).toHaveCount(0);
  await expect(drawer.getByLabel('Platform')).toHaveCount(0);
  await expect(drawer.getByLabel('HowLongToBeat ID')).toHaveCount(0);

  await expect(drawer.getByRole('region', { name: 'Watching' })).toBeVisible();
  await expect(drawer.getByLabel('Watched')).toBeVisible();
});

test('a show that began and ended in one year says that year once', async ({ page }) => {
  await seed(page.request, 'Chernobyl', 'Completed', { hobby: 'tv', completedAt: '2026-08-10' });
  await page.reload();

  await openJournal(page, 'Chernobyl');

  await expect(page.getByRole('dialog').getByText('Ended · 2019')).toBeVisible();
});

test('a co-created show names both of them', async ({ page }) => {
  // `created_by` is a list on the column and in the DTO because shows are co-created often
  // enough that a single name would be wrong rather than merely incomplete — the film's
  // argument about directors, and the stub keeps Arcane for exactly this.
  await seed(page.request, 'Arcane', 'Completed', { hobby: 'tv', completedAt: '2026-08-10' });
  await page.reload();

  await openJournal(page, 'Arcane');

  await expect(page.getByRole('dialog').getByText('Christian Linke, Alex Yee')).toBeVisible();
});

test('choosing a season re-sizes the episode list to that season', async ({ page }) => {
  // The whole reason the drawer loads a show's seasons rather than reading the board row. The
  // Wire's are 13, 12, 12, 13 and 10, so a dropdown built from the show's total would offer
  // episode 60 of a season with ten in it — and a fixed length would be right by coincidence.
  //
  // Counted with the "Not recorded" option included, because it is one of the options: a list
  // that lost it would be a control you could set and never clear.
  await seed(page.request, 'The Wire', 'InProgress', { hobby: 'tv' });
  await page.reload();

  await openJournal(page, 'The Wire');
  const drawer = page.getByRole('dialog');

  // Nothing until a season says which episodes there are, which is what keeps the pair the API
  // refuses — an episode with no season — out of reach without a second rule to state it.
  await expect(drawer.getByLabel('Episode').getByRole('option')).toHaveCount(1);

  await drawer.getByLabel('Season').selectOption('1');
  await expect(drawer.getByLabel('Episode').getByRole('option')).toHaveCount(14);

  await drawer.getByLabel('Season').selectOption('5');
  await expect(drawer.getByLabel('Episode').getByRole('option')).toHaveCount(11);
});

test('where you are reaches the card as S3 E7, and survives a reload', async ({ page }) => {
  // The point of a TV board, and the one thing on a card that no other hobby puts there. Saved
  // on the pass rather than on the show, so a rewatch begins again — as a replay does.
  await seed(page.request, 'The Wire', 'InProgress', { hobby: 'tv' });
  await page.reload();

  await openJournal(page, 'The Wire');
  const drawer = page.getByRole('dialog');

  await drawer.getByLabel('Season').selectOption('3');
  await drawer.getByLabel('Episode').selectOption('7');
  await drawer.getByRole('button', { name: 'Save' }).click();
  await expect(drawer.getByRole('status')).toHaveText('Saved');

  await drawer.getByRole('button', { name: 'Close' }).click();
  await expect(card(page, 'The Wire').getByText('S3 E7')).toBeVisible();

  // Through the database and back, which is what separates this from a component test: two
  // nullable integer columns on `log_entries`, and a check constraint that refuses the half-pair.
  await page.reload();
  await expect(card(page, 'The Wire').getByText('S3 E7')).toBeVisible();
});

test('changing the season clears the episode rather than keeping an impossible one', async ({
  page,
}) => {
  // S1 E13 and then a switch to Specials leaves a value the dropdown cannot show. Clamping to
  // the last episode of the new season would invent a claim nobody made.
  await seed(page.request, 'Severance', 'InProgress', { hobby: 'tv' });
  await page.reload();

  await openJournal(page, 'Severance');
  const drawer = page.getByRole('dialog');

  await drawer.getByLabel('Season').selectOption('1');
  await drawer.getByLabel('Episode').selectOption('9');
  await expect(drawer.getByLabel('Episode')).toHaveValue('9');

  // Specials, which TMDB numbers 0 and lists alongside the rest — and which the column's
  // `>= 0` constraint exists for.
  await drawer.getByLabel('Season').selectOption('0');
  await expect(drawer.getByLabel('Episode')).toHaveValue('');
  await expect(drawer.getByLabel('Episode').getByRole('option')).toHaveCount(4);
});

test('the Watched column orders by the whole run, shortest first and the untimed last', async ({
  page,
}) => {
  // `sort=length` for the third time, under a third word: not Runtime, which is spoken for on
  // this board by the per-episode figure in the drawer. Null is not nought minutes, so a show
  // TMDB has no runtime for goes last — the arm that is easy to get backwards.
  await seed(page.request, 'The Wire', 'Completed', { hobby: 'tv', completedAt: '2026-08-10' });
  await seed(page.request, 'A Show Nobody Timed', 'Completed', {
    hobby: 'tv',
    completedAt: '2026-08-11',
  });
  await seed(page.request, 'Chernobyl', 'Completed', { hobby: 'tv', completedAt: '2026-08-12' });
  await page.reload();

  await setSort(page, 'Completed', 'Time to watch', 'tv');

  // 5 h 25 m, then 59 h, then the one whose `episode_run_time` is empty with no last episode to
  // fall back on — which `ApplyDetail` stores as null rather than as a show that takes no time.
  await expect
    .poll(async () =>
      column(page, 'Completed', 'tv').getByRole('heading', { level: 3 }).allTextContents(),
    )
    .toEqual(['Chernobyl', 'The Wire', 'A Show Nobody Timed']);
});

test('the three boards are separate, and a show appears on none of the others', async ({ page }) => {
  // `?hobby=` filtering three ways rather than two. The interesting half is the *source*: TMDB
  // numbers films and shows separately, so film 1396 and show 1396 both exist — one shared
  // `tmdb` source row would collide on `ix_media_source_id_external_id`, and the upsert's own
  // recovery from that collision would hand back the film. A show silently being a film is
  // worse than an error, which is why `tmdb-tv` is a fourth source row.
  await seed(page.request, 'Celeste', 'Backlog');
  await seed(page.request, 'Arrival', 'Backlog', { hobby: 'movies' });
  await seed(page.request, 'Severance', 'Backlog', { hobby: 'tv' });
  await page.reload();

  await expect(card(page, 'Severance')).toBeVisible();
  await expect(card(page, 'Arrival')).toHaveCount(0);
  await expect(card(page, 'Celeste')).toHaveCount(0);

  await page.goto('/board/movies');
  await expect(card(page, 'Arrival')).toBeVisible();
  await expect(card(page, 'Severance')).toHaveCount(0);

  await page.goto('/board/games');
  await expect(card(page, 'Celeste')).toBeVisible();
  await expect(card(page, 'Severance')).toHaveCount(0);
});
