/**
 * The one place that talks to the API.
 *
 * Requests go to `/api/...` on the same origin the app is served from — in development Vite
 * proxies that to the API on :5201, so the browser only ever sees one origin and the API keeps
 * its deliberate absence of a CORS policy.
 */

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

/** The `ValidationProblemDetails` / `ProblemDetails` the API returns on a failure. */
interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

/**
 * A failed request, carrying enough to say what went wrong.
 *
 * The API is careful to return 400 with named field errors rather than 500 for anything a caller
 * got wrong, and 502 rather than 500 when IGDB is the problem. Collapsing all of that into
 * "request failed" on the way through would throw away the part worth showing someone.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Appends a query string, omitting anything not asked for.
 *
 * `null` and `undefined` are dropped rather than sent as empty: the board passes a year only for
 * the Completed column, and `?year=` is a different question from no year at all.
 */
export function buildPath(path: string, query?: Query): string {
  if (query === undefined) {
    return path;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return search === '' ? path : `${path}?${search}`;
}

async function request(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', query, body, signal } = options;

  const response = await fetch(buildPath(path, query), {
    method,
    signal,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(await describe(response), response.status);
  }

  return response;
}

/** Reads the problem details if there are any, and falls back to the status if not. */
async function describe(response: Response): Promise<string> {
  const problem = await readProblem(response);

  const fieldMessages = Object.values(problem?.errors ?? {}).flat();
  if (fieldMessages.length > 0) {
    return fieldMessages.join(' ');
  }

  return problem?.detail ?? problem?.title ?? `Request failed with status ${response.status}.`;
}

async function readProblem(response: Response): Promise<ProblemDetails | null> {
  // A 404 from MVC has no body at all, and a proxy failure may return HTML. Neither is worth
  // turning into a second, more confusing error than the one being reported.
  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return null;
  }
}

export async function apiJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await request(path, options);
  return (await response.json()) as T;
}

/** For the endpoints that answer 204 — reorder, and delete. */
export async function apiVoid(path: string, options: RequestOptions = {}): Promise<void> {
  await request(path, options);
}
