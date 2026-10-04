import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { deleteAccount, getAccount } from './account';

describe('getAccount', () => {
  it('asks what the account holds, every board at once', async () => {
    server.use(
      http.get('/api/account', () =>
        HttpResponse.json({
          signedInWith: ['google'],
          boards: [{ hobby: 'games', titles: 36 }],
          notes: 41,
        }),
      ),
    );

    expect(await getAccount()).toEqual({
      signedInWith: ['google'],
      boards: [{ hobby: 'games', titles: 36 }],
      notes: 41,
    });
  });
});

describe('deleteAccount', () => {
  it('sends a DELETE, which no link or image can', async () => {
    let method: string | undefined;
    server.use(
      http.delete('/api/account', ({ request }) => {
        method = request.method;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await deleteAccount();

    expect(method).toBe('DELETE');
  });
});
