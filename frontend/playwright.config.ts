import { defineConfig } from '@playwright/test';
import { CONNECTION_STRING } from './e2e/support/database';

const STUB_PORT = 5399;
const API_PORT = 5202;
const WEB_PORT = 5174;

/**
 * The drag gets a real browser.
 *
 * jsdom has no layout and no pointer events, so a dnd-kit assertion there passes or fails for
 * reasons that have nothing to do with whether dragging a card works. The drag is the feature,
 * so it is tested against a real browser, the real API and real Postgres — with only IGDB
 * replaced, because it is the one participant that never agreed to serve a test suite.
 *
 * Ports are all one above the development ones, so a running `npm run dev` and `dotnet run` do
 * not have to be stopped to run this.
 */
export default defineConfig({
  testDir: './e2e',

  // One database, truncated between cases. Parallel workers would be reordering each other's
  // columns halfway through an assertion.
  fullyParallel: false,
  workers: 1,

  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env['CI'] === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },

  webServer: [
    {
      command: 'node e2e/support/igdb-stub.mjs',
      url: `http://localhost:${STUB_PORT}/health`,
      reuseExistingServer: true,
    },
    {
      // --no-launch-profile, or launchSettings.json pins :5201 and quietly wins over
      // ASPNETCORE_URLS, leaving the tests talking to whatever is on the development port.
      // The migration is chained in rather than run from globalSetup, which Playwright does not
      // reach until after its servers are up — the API would be answering readiness checks from
      // a database that did not exist yet.
      command:
        'node e2e/support/prepare-database.mjs && dotnet run --project ../backend/src/HobbyTracker.Api --no-launch-profile',
      url: `http://localhost:${API_PORT}/api/library/years?hobby=games`,
      reuseExistingServer: true,
      timeout: 240_000,
      env: {
        // Not "Development": that would load appsettings.Development.json and user-secrets,
        // which is where the real IGDB credentials and the real database live. The backend
        // suite keeps them out the same way, with its own "Testing" environment.
        ASPNETCORE_ENVIRONMENT: 'E2E',
        ASPNETCORE_URLS: `http://localhost:${API_PORT}`,
        ConnectionStrings__HobbyTracker: CONNECTION_STRING,
        Igdb__ClientId: 'e2e',
        Igdb__ClientSecret: 'e2e',
        Igdb__BaseUrl: `http://localhost:${STUB_PORT}/v4/`,
        Igdb__TokenUrl: `http://localhost:${STUB_PORT}/oauth2/token`,
      },
    },
    {
      command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: true,
      env: { VITE_API_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
