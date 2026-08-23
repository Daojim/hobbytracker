import { defineConfig } from '@playwright/test';
import { CONNECTION_STRING } from './e2e/support/database';

const STUB_PORT = 5399;
const HLTB_STUB_PORT = 5398;
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
 * Ports are all one above the development ones, and the API builds to its own output directory,
 * so a running `npm run dev` and `dotnet run` do not have to be stopped to run this.
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
      command: 'node e2e/support/hltb-stub.mjs',
      url: `http://localhost:${HLTB_STUB_PORT}/health`,
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
        // The one thing that lets this coexist with a `dotnet run` of your own, which the ports
        // being one apart does not. Windows will not let this build overwrite
        // bin/Debug/net10.0/HobbyTracker.Api.exe while the development server is executing it,
        // and the failure arrives as MSB3027 inside a webServer Playwright only describes as
        // "Process from config.webServer was not able to start". Building somewhere else is the
        // whole fix. obj/ is deliberately still shared: the compilation is identical either way,
        // so only the copy destination differs and neither build redoes the other's work.
        //
        // It is an environment variable rather than a -p: flag because MSBuild reads the
        // environment as properties, and this command is two dotnet invocations — the chained
        // `dotnet ef database update` has nowhere to take an MSBuild flag, and would otherwise
        // build to the locked path and fail before the API was even reached.
        BaseOutputPath: 'bin/e2e/',

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

        // HowLongToBeat needs only its base URL pointed elsewhere: everything else about
        // reaching it — the endpoint's name, the handshake — is rediscovered at runtime rather
        // than configured, which is exactly why the stub has to serve all of it.
        Hltb__BaseUrl: `http://localhost:${HLTB_STUB_PORT}/`,

        // The politeness floor is two seconds a request in production, and a backfill is four
        // requests before the first title is even looked up. Nothing here needs protecting from
        // us, and a spec that waited it out would spend its whole budget being polite to a stub.
        Hltb__MinSecondsBetweenRequests: '0',
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
