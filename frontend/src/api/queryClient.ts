import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';
import { sessionKey } from './auth';

/**
 * The app's query client.
 *
 * A function rather than a value so a test can drive it, because the interesting behaviour here
 * is what happens when the server stops recognising the browser — and before auth there was no
 * global error handling at all. Every caller rendered `error.message` where it stood, which for
 * a 401 would paint the API's ProblemDetails in red on a board you are not signed in to.
 */
export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          // Written rather than invalidated, and no redirect from here. This module has no
          // router; the session query already owns the answer to "who is signed in", so
          // correcting it is what makes the gate move on its own.
          client.setQueryData(sessionKey, null);
        }
      },
    }),

    defaultOptions: {
      queries: {
        // The board is a single-user view of data only this browser changes, so refetching on
        // every window focus is noise. Mutations invalidate what they touched instead.
        refetchOnWindowFocus: false,
        staleTime: 30_000,

        // The default is three attempts with backoff, which for anything the server refused
        // outright means waiting out three rejections to be told the same thing. Retrying is
        // for a server that might yet answer.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500)
          && failureCount < 3,
      },
    },
  });

  return client;
}
