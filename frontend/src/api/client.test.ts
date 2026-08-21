import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { ApiError, apiJson, apiVoid, buildPath } from './client';

describe('buildPath', () => {
  it('leaves a path with no query alone', () => {
    expect(buildPath('/api/library')).toBe('/api/library');
  });

  it('drops parameters that were not asked for', () => {
    // The board sends a year only for the Completed column. A literal "year=undefined" would be
    // a 400, and "year=" would be a different question from not asking.
    expect(buildPath('/api/library', { hobby: 'games', year: undefined, status: null }))
      .toBe('/api/library?hobby=games');
  });

  it('encodes values', () => {
    expect(buildPath('/api/games', { search: 'zelda & link' }))
      .toBe('/api/games?search=zelda+%26+link');
  });

  it('keeps a zero, which is a real value', () => {
    expect(buildPath('/api/library', { page: 0 })).toBe('/api/library?page=0');
  });
});

describe('apiJson', () => {
  it('returns the parsed body', async () => {
    server.use(http.get('/api/thing', () => HttpResponse.json({ id: 7 })));

    await expect(apiJson<{ id: number }>('/api/thing')).resolves.toEqual({ id: 7 });
  });

  it('surfaces a validation problem as a message rather than "request failed"', async () => {
    server.use(
      http.post('/api/log-entries', () =>
        HttpResponse.json(
          {
            title: 'One or more validation errors occurred.',
            status: 400,
            errors: { completedAt: ['completedAt cannot be earlier than startedAt.'] },
          },
          { status: 400 },
        ),
      ),
    );

    const error = await apiJson('/api/log-entries', { method: 'POST', body: {} })
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).message).toContain('completedAt cannot be earlier than startedAt.');
  });

  it('keeps the field a validation error was about, not just its text', async () => {
    // A form wants to put "at most one decimal place" against the rating box rather than at the
    // top of the drawer. The message is still built from these, so nothing that reads it breaks.
    server.use(
      http.put('/api/log-entries/1', () =>
        HttpResponse.json(
          {
            title: 'One or more validation errors occurred.',
            status: 400,
            errors: { rating: ['Rating must be between 1.0 and 10.0.'] },
          },
          { status: 400 },
        ),
      ),
    );

    const error = (await apiJson('/api/log-entries/1', { method: 'PUT', body: {} }).catch(
      (thrown: unknown) => thrown,
    )) as ApiError;

    expect(error.fieldErrors).toEqual({ rating: ['Rating must be between 1.0 and 10.0.'] });
  });

  it('reports a 404 without pretending it parsed a body', async () => {
    server.use(http.get('/api/games/999', () => new HttpResponse(null, { status: 404 })));

    const error = await apiJson('/api/games/999').catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });

  it('reports the 502 the API returns when IGDB is unhappy', async () => {
    // Distinct from a 500 on purpose upstream — "the provider is unhappy" is a different thing
    // to tell someone than "this app is broken", so it must survive the client.
    server.use(
      http.get('/api/games', () =>
        HttpResponse.json({ title: 'IGDB request failed.', status: 502 }, { status: 502 }),
      ),
    );

    const error = await apiJson('/api/games', { query: { search: 'halo' } })
      .catch((thrown: unknown) => thrown);

    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).message).toContain('IGDB request failed.');
  });
});

describe('apiVoid', () => {
  it('accepts a 204 with no body', async () => {
    server.use(http.put('/api/library/order', () => new HttpResponse(null, { status: 204 })));

    await expect(apiVoid('/api/library/order', { method: 'PUT', body: {} })).resolves.toBeUndefined();
  });

  it('still throws on a failure', async () => {
    server.use(http.delete('/api/log-entries/1', () => new HttpResponse(null, { status: 404 })));

    await expect(apiVoid('/api/log-entries/1', { method: 'DELETE' })).rejects.toBeInstanceOf(ApiError);
  });
});
