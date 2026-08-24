import { expect, test } from '@playwright/test';
import { resetDatabase, psql } from './support/database';
import { signIn, signOut, whoAmI } from './support/auth';
import { column, seed } from './support/board';

/**
 * Signing in, for real.
 *
 * The backend suite hands the app a header and moves on, which leaves the entire OAuth dance —
 * the challenge, the state, PKCE, the code exchange, the user-info call — with no test above the
 * unit level. This is that test. `Auth:Google:*` point the framework's own handler at a local
 * stub, so what runs here is what runs against Google.
 *
 * The stub refuses anything malformed rather than waving it through; see google-stub.mjs for
 * which rules it enforces and why a permissive stub would be worse than none.
 */

test.beforeEach(() => {
  resetDatabase();
});

test('signing in creates an account and says who you are', async ({ page }) => {
  await signIn(page, { sub: 'google-1', email: 'jimmy@example.com', name: 'Jimmy Dao' });

  const me = await whoAmI(page.request);

  expect(me).not.toBeNull();
  expect(me!.displayName).toBe('Jimmy Dao');

  expect(psql('select count(*) from users;')).toBe('1');
  expect(psql("select provider || ':' || provider_user_id from auth_identities;"))
    .toBe('google:google-1');
});

test('signing in again is the same account, not a second one', async ({ page }) => {
  // The unique index on (provider, provider_user_id) doing its job through the whole flow. A
  // second row here would be a second empty board and no way back to the first.
  await signIn(page, { sub: 'google-1' });
  await signOut(page);
  await signIn(page, { sub: 'google-1' });

  expect(psql('select count(*) from users;')).toBe('1');
});

test('two different google accounts are two people', async ({ page }) => {
  await signIn(page, { sub: 'google-1', email: 'first@example.com', name: 'First' });
  await signOut(page);
  await signIn(page, { sub: 'google-2', email: 'second@example.com', name: 'Second' });

  expect((await whoAmI(page.request))!.displayName).toBe('Second');
  expect(psql('select count(*) from users;')).toBe('2');
});

test('nobody is signed in until they sign in', async ({ page }) => {
  // 200 and null rather than a 401, which is what lets the frontend ask this question without
  // the answer tripping its own redirect-to-sign-in.
  await page.goto('/board');

  expect(await whoAmI(page.request)).toBeNull();
});

test('signing out ends the session', async ({ page }) => {
  await signIn(page, { sub: 'google-1' });
  expect(await whoAmI(page.request)).not.toBeNull();

  await signOut(page);

  expect(await whoAmI(page.request)).toBeNull();

  // The account is still there. Signing out is not deleting yourself.
  expect(psql('select count(*) from users;')).toBe('1');
});

test('the session survives a reload', async ({ page }) => {
  // The whole reason it is a cookie rather than something held in memory: closing the tab and
  // coming back should not sign you out.
  await signIn(page, { sub: 'google-1', name: 'Jimmy Dao' });

  await page.reload();

  expect((await whoAmI(page.request))!.displayName).toBe('Jimmy Dao');
});

test('a sign-in cannot be pointed at somebody else’s site', async ({ page }) => {
  // returnUrl decides where the callback drops you, so an unchecked one is an open redirect
  // wearing a sign-in link.
  const response = await page.request.get(
    '/api/auth/google/start?returnUrl=https://evil.example/steal',
    { maxRedirects: 0 },
  );

  expect(response.status()).toBe(400);
});

test('the board is not reachable without signing in', async ({ page }) => {
  // The API refuses every column, and four red 401s is a true description of what happened and
  // a useless one to be handed. Being asked to sign in is the honest reading.
  await page.goto('/board');

  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByRole('heading', { level: 1, name: /sign in/i })).toBeVisible();
});

test('the header says who you are, and lets you leave', async ({ page }) => {
  await signIn(page, { sub: 'google-1', name: 'Jimmy Dao' });

  // Not scoped to a banner landmark: AppHeader renders inside BoardPage's <main>, and a
  // <header> nested in main is not a banner. There is exactly one of each of these anyway.
  await expect(page.getByText('Jimmy Dao')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/\/signin$/);
  expect(await whoAmI(page.request)).toBeNull();
});

test('one person’s board is not the next person’s', async ({ page }) => {
  // The scoping is proved properly in the backend suite; this is the browser end of it, and the
  // thing a person would actually notice.
  await signIn(page, { sub: 'google-1', name: 'First' });
  await seed(page.request, 'Celeste', 'Backlog');
  await page.reload();
  await expect(column(page, 'Backlog').getByRole('listitem')).toHaveCount(1);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/signin$/);

  await signIn(page, { sub: 'google-2', name: 'Second' });

  await expect(column(page, 'Backlog').getByRole('listitem')).toHaveCount(0);

  // And the catalogue is still shared: the same game is one search away, not re-fetched.
  await page.getByRole('searchbox', { name: 'Search games' }).fill('celeste');
  await expect(page.getByRole('button', { name: 'Add Celeste to backlog' })).toBeVisible();
});

test('Discord signs you in the same way Google does', async ({ page }) => {
  // A second provider is a config block and a second link, which is what the generic OAuth
  // handler bought. The stub answers Discord's user-info at its own address and in its own
  // shape — `id` and `global_name` rather than `sub` and `name` — so this is really a test that
  // ExternalSignIn reads both without a per-provider reader behind it.
  await signIn(page, { sub: 'discord-1', email: 'jimmy@example.com', name: 'Jimmy Dao' }, 'discord');

  expect((await whoAmI(page.request))!.displayName).toBe('Jimmy Dao');
  expect(psql("select provider || ':' || provider_user_id from auth_identities;"))
    .toBe('discord:discord-1');
});

test('the same person at two providers is two accounts until they are linked', async ({ page }) => {
  // Email is informational, never a login key: providers reuse addresses, and trusting one to
  // merge accounts would let anybody who can get an address at either walk into the other's
  // journal. Linking is a feature that does not exist yet; the schema is ready for it.
  await signIn(page, { sub: 'same-1', email: 'jimmy@example.com', name: 'Jimmy' });
  await signOut(page);
  await signIn(page, { sub: 'same-1', email: 'jimmy@example.com', name: 'Jimmy' }, 'discord');

  expect(psql('select count(*) from users;')).toBe('2');
  expect(psql('select count(*) from auth_identities;')).toBe('2');
});

test('the sign-in screen offers both providers', async ({ page }) => {
  await page.goto('/signin');

  await expect(page.getByRole('link', { name: /google/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /discord/i })).toBeVisible();
});
