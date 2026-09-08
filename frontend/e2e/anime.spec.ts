import { expect, test } from '@playwright/test';
import { resetDatabase } from './support/database';
import { signIn } from './support/auth';
import { card, column, drag, entriesFor, openJournal, seed, setSort } from './support/board';

/**
 * The fourth hobby, end to end — and the first one from a provider that is neither IGDB nor
 * TMDB.
 *
 * Television stretched the platform once: it needed a control no other hobby had. Anime
 * stretches the same two seams further and in the opposite direction. Its pass carries an
 * episode and **no season**, which a check constraint refused until this phase; and its card
 * carries a **second title**, which no board row had a field for. What a spec proves that no
 * unit test can is that both survive a real browser, a real Postgres and a real HTTP round trip.
 *
 * **Nothing here waits on enrichment**, which is the other difference. MAL's search and detail
 * endpoints take the same `fields` and answer with the same node, so a card is complete the
 * moment it is *found* rather than the moment it is added — there is no IMediaAdded handler for
 * this hobby at all.
 */

test.beforeEach(async ({ page }) => {
  resetDatabase();

  await signIn(page);
  await page.goto('/board/anime');
});

test('finding an anime puts it on the board, complete, without leaving it', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search anime' }).fill('frieren');
  await page.getByRole('button', { name: 'Add Sousou no Frieren to backlog' }).click();

  await expect(page.getByText('On your board')).toBeVisible();

  const frieren = card(page, 'Sousou no Frieren');
  await expect(frieren).toBeVisible();

  // 28 episodes of 1470 seconds is 41160 seconds, 686 minutes, 11.43 hours — multiplied *and
  // converted* by Postgres in a generated column, then divided back to hours by the board. The
  // factor of sixty lives in exactly one place, and this is what says so end to end.
  await expect(frieren.getByText('~11.43 h')).toBeVisible();

  // The automatic pick has to reach past two words to get here. MAL flattens genres, themes and
  // demographics into one array, so Frieren arrives as Adventure, Award Winning, Drama, Fantasy,
  // Shounen — and `hobbies/anime.ts` paints none of Adventure's neighbours above Fantasy.
  // Shounen is a demographic and is deliberately unpainted.
  await expect(frieren.getByText('Fantasy')).toBeVisible();
});

test('a card carries the English title under the romaji one', async ({ page }) => {
  // The second stretch, at the only layer that can prove it. `media.title` holds the romaji, so
  // search, the drawer's heading and the remove confirmation all need no special case — and
  // this is the extra line the board row grew a field for.
  await seed(page.request, 'Sousou no Frieren', 'Backlog', { hobby: 'anime' });
  await page.reload();

  const frieren = card(page, 'Sousou no Frieren');
  await expect(frieren.getByText("Frieren: Beyond Journey's End")).toBeVisible();

  // And absent rather than blank where MAL has no English title, which is the ordinary case.
  await seed(page.request, 'Ping Pong the Animation', 'Backlog', { hobby: 'anime' });
  await page.reload();

  await expect(card(page, 'Ping Pong the Animation').locator('[data-subtitle]')).toHaveCount(0);
});

test('two cours of one show are two cards', async ({ page }) => {
  // The decision this whole hobby is built on, and the reason there is no `anime_seasons` table:
  // MAL numbers each cour as its own entry, so these are two ids and therefore two rows. The
  // user's words — *"I would rather have different seasons be different cards in my app, just
  // like how MAL has it."*
  await seed(page.request, 'Sousou no Frieren', 'Completed', {
    hobby: 'anime',
    completedAt: '2026-08-10',
  });
  await seed(page.request, 'Sousou no Frieren 2nd Season', 'Backlog', { hobby: 'anime' });
  await page.reload();

  await expect(column(page, 'Completed', 'anime').getByText('Sousou no Frieren')).toBeVisible();
  await expect(
    column(page, 'Backlog', 'anime').getByText('Sousou no Frieren 2nd Season'),
  ).toBeVisible();
});

test('searching puts the first cour above the second, which MAL does not', async ({ page }) => {
  // Measured live on 7 September 2026: MAL's own order answers `frier` with *2nd Season* first.
  // The stub returns catalogue order rather than MAL's, so what this proves is that the
  // re-rank runs at all and agrees — `MalRelevanceTests` is where the disagreement itself is
  // pinned, against the real figures.
  await page.getByRole('searchbox', { name: 'Search anime' }).fill('frier');

  const results = page.getByRole('region', { name: 'Search results' });
  await expect(results.getByRole('listitem').first()).toContainText('Sousou no Frieren');
  await expect(results.getByRole('listitem').first()).not.toContainText('2nd Season');
});

test('a pass records which episode, with no season to name first', async ({ page }) => {
  // The first stretch, end to end. `ck_log_entries_episode_needs_season` forbade exactly this
  // shape until this phase — a cour is the entry, so episode 12 says everything there is to
  // say. The control is one dropdown rather than two, and it is sized from the title's own
  // episode count rather than from a season nobody can choose.
  const mediaId = await seed(page.request, 'Sousou no Frieren', 'InProgress', { hobby: 'anime' });
  await page.reload();

  await openJournal(page, 'Sousou no Frieren');
  const drawer = page.getByRole('dialog');

  await expect(drawer.getByLabel('Episode')).toBeVisible();
  await expect(drawer.getByLabel('Season')).toHaveCount(0);

  await drawer.getByLabel('Episode').selectOption('12');
  await drawer.getByRole('button', { name: 'Save' }).click();
  await expect(drawer.getByText('Saved')).toBeVisible();

  // Polled rather than read once. The board's own refetch is what the drawer waits on, and a
  // direct API read can land in the gap before the write it is asking about — the pattern
  // every other spec here already uses around entriesFor.
  await expect
    .poll(async () => (await entriesFor(page.request, mediaId))[0])
    .toMatchObject({ seasonNumber: null, episodeNumber: 12 });

  // And it reaches the card as `E12` — no season half, and no gap where one would be.
  await page.keyboard.press('Escape');
  await expect(card(page, 'Sousou no Frieren').getByText('E12')).toBeVisible();
});

test("the drawer states a cour's five facts and bylines its studio", async ({ page }) => {
  await seed(page.request, 'Sousou no Frieren', 'InProgress', { hobby: 'anime' });
  await page.reload();

  await openJournal(page, 'Sousou no Frieren');
  const drawer = page.getByRole('dialog');

  await expect(drawer.getByText('Madhouse')).toBeVisible();
  await expect(drawer.getByText('TV · 28 episodes')).toBeVisible();
  await expect(drawer.getByText('Finished · Fall 2023')).toBeVisible();

  // MAL states seconds and this is the only place that becomes minutes for a reader — 1470s is
  // 24m30s, which rounds to 25.
  await expect(drawer.getByText('25 m')).toBeVisible();

  // Out of ten, which is the scale the rating slider above it uses — the whole reason it is
  // worth a line rather than a footnote.
  await expect(drawer.getByText('9.25')).toBeVisible();
  await expect(drawer.getByText('Manga')).toBeVisible();

  // The three controls this hobby does not have, absent rather than blank.
  await expect(drawer.getByLabel('Hours played')).toHaveCount(0);
  await expect(drawer.getByLabel('Platform')).toHaveCount(0);
  await expect(drawer.getByLabel('HowLongToBeat ID')).toHaveCount(0);
});

test('a cour nobody has counted offers no episodes at all', async ({ page }) => {
  // MAL answers `num_episodes: 0` for an entry that has not aired — the announced 2027 Frieren
  // cour does — and nought there means *unknown* rather than none. Stored as nought,
  // ck_anime_counts_positive would turn this search into a 500; stored as null, the control
  // offers nothing and the card carries no length.
  await seed(page.request, 'Sousou no Frieren: Ougonkyou-hen', 'Backlog', { hobby: 'anime' });
  await page.reload();

  const unaired = card(page, 'Sousou no Frieren: Ougonkyou-hen');
  await expect(unaired).toBeVisible();
  await expect(unaired.getByText(/h$/)).toHaveCount(0);

  await openJournal(page, 'Sousou no Frieren: Ougonkyou-hen');

  const episode = page.getByRole('dialog').getByLabel('Episode');
  await expect(episode.getByRole('option')).toHaveCount(1);
});

test('dragging an anime through the columns stamps the same dates a game would', async ({
  page,
}) => {
  const mediaId = await seed(page.request, 'Cowboy Bebop', 'Backlog', { hobby: 'anime' });
  await page.reload();

  await drag(page, card(page, 'Cowboy Bebop'), column(page, 'InProgress', 'anime'));

  await expect(column(page, 'InProgress', 'anime').getByText('Cowboy Bebop')).toBeVisible();
  await expect
    .poll(async () => (await entriesFor(page.request, mediaId))[0])
    .toMatchObject({ status: 'InProgress', completedAt: null });
  expect((await entriesFor(page.request, mediaId))[0]?.startedAt).not.toBeNull();
});

test('the hobby nav goes to the Anime board, and it is a watching board', async ({ page }) => {
  await page.goto('/board/games');
  await page.getByRole('link', { name: 'Anime' }).click();

  await expect(page).toHaveURL(/\/board\/anime$/);

  await expect(page.getByRole('heading', { level: 2, name: /^Watching / })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /^Watched / })).toBeVisible();
});

test('the Watched column orders by the whole cour, shortest first and the untimed last', async ({
  page,
}) => {
  // `sort=length` and the card's badge read one field, whichever hobby answered it — and the
  // Length arm is the one place in this codebase where an expression that stops translating
  // breaks a sort mode rather than erroring. A fourth coalesce there is what this watches.
  await seed(page.request, 'Sousou no Frieren', 'Completed', {
    hobby: 'anime',
    completedAt: '2026-08-10',
  });
  await seed(page.request, 'Cowboy Bebop: Tengoku no Tobira', 'Completed', {
    hobby: 'anime',
    completedAt: '2026-08-11',
  });
  await seed(page.request, 'Ping Pong the Animation', 'Completed', {
    hobby: 'anime',
    completedAt: '2026-08-12',
  });
  await page.reload();

  await setSort(page, 'Completed', 'Time to watch', 'anime');

  // The film is 6911 seconds — 1.92 h — against Frieren's 11.43, and Ping Pong has no duration
  // at all, so it sorts last rather than as though it took no time.
  const titles = column(page, 'Completed', 'anime').getByRole('listitem');
  await expect(titles.nth(0)).toContainText('Cowboy Bebop: Tengoku no Tobira');
  await expect(titles.nth(1)).toContainText('Sousou no Frieren');
  await expect(titles.nth(2)).toContainText('Ping Pong the Animation');
});

test('the four boards are separate, and an anime appears on none of the others', async ({
  page,
}) => {
  // `?hobby=` filtering four ways. The interesting half is the *source*: MAL numbers its
  // catalogue independently of both TMDB sequences, so anime 1 and film 1 both exist — one
  // shared source row would collide on `ix_media_source_id_external_id`, and the upsert's own
  // recovery from that collision would hand back whichever got there first. An anime silently
  // being a film is worse than an error, which is why `mal` is a fifth source row.
  await seed(page.request, 'Celeste', 'Backlog');
  await seed(page.request, 'Arrival', 'Backlog', { hobby: 'movies' });
  await seed(page.request, 'Severance', 'Backlog', { hobby: 'tv' });
  await seed(page.request, 'Cowboy Bebop', 'Backlog', { hobby: 'anime' });
  await page.reload();

  await expect(card(page, 'Cowboy Bebop')).toBeVisible();
  await expect(card(page, 'Severance')).toHaveCount(0);
  await expect(card(page, 'Arrival')).toHaveCount(0);
  await expect(card(page, 'Celeste')).toHaveCount(0);

  await page.goto('/board/tv');
  await expect(card(page, 'Severance')).toBeVisible();
  await expect(card(page, 'Cowboy Bebop')).toHaveCount(0);

  await page.goto('/board/movies');
  await expect(card(page, 'Arrival')).toBeVisible();
  await expect(card(page, 'Cowboy Bebop')).toHaveCount(0);
});
