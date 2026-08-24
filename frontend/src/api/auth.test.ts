import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { getMe, signOut } from './auth';

describe('getMe', () => {
  it('answers with whoever is signed in', async () => {
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ id: 4, displayName: 'Jimmy Dao' })),
    );

    expect(await getMe()).toEqual({ id: 4, displayName: 'Jimmy Dao' });
  });

  it('reads a null body as nobody, rather than throwing', async () => {
    // The API answers 200 and a literal null when there is no session — deliberately, so that
    // asking the question does not itself look like a failure. A 204 here would hand the client
    // an empty string to parse and fail somewhere far less obvious.
    server.use(http.get('/api/auth/me', () => HttpResponse.json(null)));

    expect(await getMe()).toBeNull();
  });
});

describe('signOut', () => {
  it('posts, so that loading an image cannot end your session', async () => {
    let method: string | undefined;
    server.use(
      http.post('/api/auth/logout', ({ request }) => {
        method = request.method;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await signOut();

    expect(method).toBe('POST');
  });
});
