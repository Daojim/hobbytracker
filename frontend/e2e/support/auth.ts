import type { Page, APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';

const GOOGLE_STUB = 'http://localhost:5397';

/** Who the stub will say signed in. Everything but `sub` is cosmetic. */
export interface StubIdentity {
  sub?: string;
  email?: string;
  name?: string;
}

/**
 * Signs the browser in through the whole real flow: our start endpoint, the provider's
 * authorize, our callback, the token exchange and the user-info call. Nothing is short-circuited
 * — the point of the stub is that the framework's handler runs exactly as it does against Google.
 *
 * Note it is `page` that ends up signed in, not the standalone `request` fixture: the session is
 * a cookie, and those two have separate cookie jars. Anything seeding through the API afterwards
 * has to go through `page.request`.
 */
export async function signIn(
  page: Page,
  who: StubIdentity = {},
  provider = 'google',
): Promise<void> {
  await page.request.post(`${GOOGLE_STUB}/__identity`, { data: who });

  await page.goto(`/api/auth/${provider}/start?returnUrl=/board`);

  // /board, not /board/games: the address a returnUrl names is the one the app has always
  // handed out, and it redirects. Waiting for where it lands is what keeps that redirect from
  // quietly disappearing — a sign-in that stopped on /board would leave a blank page.
  await expect(page).toHaveURL(/\/board\/games$/);
}

/** Ends the session, as the sign-out control will. */
export async function signOut(page: Page): Promise<void> {
  const response = await page.request.post('/api/auth/logout');
  expect(response.ok(), 'sign out').toBeTruthy();
}

/** Who the API thinks is signed in, or null. */
export async function whoAmI(
  request: APIRequestContext,
): Promise<{ id: number; displayName: string } | null> {
  const response = await request.get('/api/auth/me');
  expect(response.ok(), 'ask who is signed in').toBeTruthy();

  return response.json();
}
