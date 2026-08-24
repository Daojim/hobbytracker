import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { createQueryClient } from './queryClient';
import { sessionKey } from './auth';
import { apiJson } from './client';

/**
 * What the app does when the server stops recognising it.
 *
 * There was no global error handling here at all before auth: every caller rendered
 * `error.message` where it stood, which for a 401 would paint ASP.NET's ProblemDetails in red
 * and leave you looking at a board you are not signed in to.
 */
describe('createQueryClient', () => {
  it('treats a 401 as the session having ended', async () => {
    server.use(http.get('/api/thing', () => new HttpResponse(null, { status: 401 })));

    const client = createQueryClient();
    client.setQueryData(sessionKey, { id: 1, displayName: 'Jimmy Dao' });

    await client.fetchQuery({ queryKey: ['thing'], queryFn: () => apiJson('/api/thing') })
      .catch(() => undefined);

    // Cleared rather than redirected from here. This module has no router, and writing the
    // answer the session query already owns is what makes the gate move on its own.
    expect(client.getQueryData(sessionKey)).toBeNull();
  });

  it('leaves the session alone for any other failure', async () => {
    // A 403 is the pointed case: refused, but not because the session is missing. Only a 401
    // says "I do not know who you are", and only that should end a session. A 5xx would make
    // the same point but is retried with backoff, which is a slow way to say it.
    server.use(http.get('/api/thing', () => new HttpResponse(null, { status: 403 })));

    const client = createQueryClient();
    client.setQueryData(sessionKey, { id: 1, displayName: 'Jimmy Dao' });

    await client.fetchQuery({ queryKey: ['thing'], queryFn: () => apiJson('/api/thing') })
      .catch(() => undefined);

    expect(client.getQueryData(sessionKey)).toEqual({ id: 1, displayName: 'Jimmy Dao' });
  });

  it('does not retry a request the server refused', async () => {
    // The default is three retries with backoff, which for a 401 means waiting out three
    // rejections to be told the same thing. Retrying is for a server that might yet answer.
    let attempts = 0;
    server.use(
      http.get('/api/thing', () => {
        attempts += 1;
        return new HttpResponse(null, { status: 401 });
      }),
    );

    const client = createQueryClient();

    await client.fetchQuery({ queryKey: ['thing'], queryFn: () => apiJson('/api/thing') })
      .catch(() => undefined);

    expect(attempts).toBe(1);
  });
});
