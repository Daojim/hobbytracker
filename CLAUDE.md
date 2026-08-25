# HobbyTracker

A personal hobby-tracking and journaling app. Games first; movies, TV, anime, books and music
follow. It doubles as a portfolio piece, so structure and explainability count as much as
working code — prefer the version that is easy to justify in a review over the version that is
merely shorter.

## Where things stand

**HowLongToBeat is finished and merged** — backend, both pieces of UI and the end-to-end specs,
in PR #9. The backend was verified against the live site; the front is verified against a stub
that serves every leg of it.

**PR #10 is merged** — a card drags from its title, a save in the drawer says so, and the e2e
suite builds to its own output directory so it no longer needs your development server stopped.

**PR #11 is merged** — the redesign, in three commits cut from `main` after #10:

1. **the token layer** — every colour behind a semantic name, all 66 `dark:` variants gone,
   proved by the whole suite passing untouched;
2. **four themes and a density setting** behind one menu, top right;
3. **the Shelf re-skin in Public Sans** — cards lift on shadow, columns became wells, the rating
   turned amber, and destructive controls stopped relying on colour.

**PR #12 is merged** — the width, search and navigation work that living with the redesign at
laptop widths turned up, in three more commits:

4. **a board that works between 768 and 1600** — the cover stopped being stretched, and a card
   sizes itself from its column rather than from the window. See **The board at every width**;
5. **search above the board** rather than on a screen of its own. See **Search on the board**;
6. **a hobby nav**, with the five that do not exist yet saying *Soon*. See **The hobby nav**.

**PR #13 is merged** — search that answers with the game you meant: mods and bundles are gone,
half a title is enough to find something, and what comes back is ordered so a fan game cannot
outrank the thing it is named after. Three sections under
**IGDB integration** carry it — **Game types**, **Two questions, not one**, and
**Ranking search results** — and the last two are worth reading before touching search,
because both record rules that were tried against the live API and thrown away.

**PR #14 is merged** — auth, in five commits taken one at a time:

1. **the rail** — Google through the framework's generic `AddOAuth`, an httpOnly cookie, and a
   Google stub the real handler runs against end to end;
2. **the scoping** — `ICurrentUser` through 16 query sites, `[Authorize]` on all four
   controllers, and 19 second-user tests written red first;
3. **the frontend** — a sign-in screen, a session gate, a global 401 handler, and your name in
   the header;
4. **`user_id` became `NOT NULL`** — the development board discarded, as agreed;
5. **Discord**, which was a config block and a second link, as the design promised.

See **Auth** for all of it, and in particular **The five traps, every one of which fails
quietly** — the eager configuration read that broke 153 tests, the Vite proxy's `changeOrigin`,
and the 302-instead-of-401 that hands `fetch` a page of HTML.

**PR #15 is merged** — seven things the first days of using a signed-in board turned up, in six
commits cut from `main` after #14:

1. **the sign-in marks** — both provider links were drawn in `--accent`, which is green on the
   Shelf themes, so "Continue with Google" was a green button with no Google about it. Neutral
   now, with the provider's own mark on the left. See **The frontend** under **Auth**;
2. **the last thing you wrote, on the card** — a board row carries a preview of your most recent
   note. See **Library is not the catalog**, which has the two things that make it safe;
3. **an options menu on every card** — the `×` became a `⋯` offering the journal, the three
   columns the card is not in, and both endings, from all four columns. See **Board semantics**;
4. **remove means remove** — every pass of yours, not the newest one, so a title replayed five
   times is one press from leaving rather than five;
5. **Dropped is a drop target while collapsed**, which it had never been: the droppable ref hung
   off a card list that is not rendered when the column is shut;
6. **sign-in became a card on a full-bleed ground**, and the card menu gained *Open journal* and
   a translucent danger fill;
7. **a card shows HowLongToBeat's headline figure**, fetched rather than averaged, and
   `sort=hours` follows it. See **`comp_all` is the headline number**.

Its migration clears `hltb_checked_at` on every row, so the backfill would pick up a library it
had already checked. **That backfill has been run**, and the board carries the new number.

**PR #16 is merged** — four things, in four commits cut from `main` after #15. Three of them
were found by using the board rather than by planning to build them:

1. **HowLongToBeat's automatic lookups were broken, and are fixed — two separate faults, both
   in the search half.** The site renamed its search endpoint from `bleed` to `search/site` —
   two segments — and the pair rule refused any candidate with a slash in it, so discovery found
   nothing, fell back to a `bleed` the site had already retired, and got a 404. Underneath that,
   **a title's punctuation was being sent as part of the search terms**, which empties the search
   outright whenever the two sites disagree about a colon. Both were invisible for the same
   reason: pinning an id by hand needs no handshake and never goes near either, so the half with
   a person watching kept working. See **X may have slashes in it** and
   **A colon can empty the search**;
2. **the board is one year at a time** — one `Year` control above the whole board, opening on
   the latest year there is, with Backlog exempt and each other column filtering on the date it
   is actually about. `GET /api/library/years` answers with any activity now rather than with
   completions. See **The board is one year at a time**;
3. **the card fills its own estimate in.** A board row now says whether HowLongToBeat has been
   asked about the title yet, and a column asks again while — and only while — one of its rows
   is still waiting. Adding a game and watching the hours appear no longer needs a reload. See
   **The card waits for its own estimate**;
4. **a clear button on the search bar** — an × in the box's own corner, present only once there
   is something to clear, which hands the keyboard back to the box on its way out. See
   **Search on the board**;
5. **a phase written down rather than built** — a grid of popular games and a calendar of
   upcoming ones, so that filling the board is not always typing a title at a time. The shape is
   the user's to workshop; what is recorded is the constraint around it. See **Discovery**.

Everything is green and everything has been run: backend 325, frontend 336, Playwright 83.

Eleven plans, and **#16 has none** — it was four things asked for one at a time in a single
session, so the commits and this file are the whole record of it. The last plan is
`C:\Users\jimmy\.claude\plans\read-claude-md-to-see-wondrous-crescent.md` — the first three of
the seven above. **The other four are not in it**: they were asked for while it was being built,
and the plan was not rewritten to cover them, so it is the record of a phase that grew rather
than of one that was designed. `look-at-claude-md-to-iridescent-rain.md` is the auth phase before
it. Its one deviation is worth knowing: the frontend was
built **before** the `NOT NULL` migration rather than after, because the app is unusable in a
browser between the scoping and the sign-in screen, and confirming a one-way discard is easier
from a working board than from psql.
`read-claude-md-to-get-giggly-hoare.md` is the width, navigation and search work before it.
`fluffy-pondering-brook.md` is the redesign: tokens, four themes, the density setting and the
Shelf re-skin.
`for-the-next-part-delightful-alpaca.md` is worth reading before touching HowLongToBeat —
though see **What the plan got wrong** below, because three of its assumptions did not survive
contact with the site. The earlier five are the board's:
`project-context-i-m-building-nifty-mango.md` is the original board plan;
`i-had-a-previous-melodic-nebula.md` is the timezone and timestamp work that interrupted it;
`look-at-claude-md-and-radiant-wreath.md` is the five drawer gaps and the reasoning behind each;
`i-want-to-continue-wiggly-toucan.md` is how they were built;
`there-are-a-few-reflective-balloon.md` is the four that came after.

### Picking this up

**Nothing is half-finished, and nothing is unmerged.** `main` is at #16 and every suite is
green. **Detail and review is the next phase** — see **Phases**, and **What is worth doing next**
below it for the smaller things that have been named but not built. Five things worth knowing
before a first run:

- **Sign-in credentials are required to boot.** Google *and* Discord, in user-secrets — the host
  fails deliberately and names the missing key. See **Running it**, which also has the stub
  route for when there is no provider app to hand.
- **Use http://localhost:5173, not the API's port.** The whole sign-in has to stay on one
  origin, and the Vite proxy is what makes that true.
- **Docker has to be up before the e2e suite is.** `docker compose up -d db`, and the daemon
  itself if Docker Desktop is not running — Playwright reports a database that is not there as
  the same unhelpful "Process from config.webServer was not able to start" that a build lock
  does.
- **A `dotnet run` of your own no longer stops the suite.** See **A dev server used to block the
  e2e run** under **Tests** for what that cost and how it is held.
- **Restart the API after pulling anything.** A running `dotnet run` goes on executing the
  binary it started with. That is obvious written down and is not obvious at the time: it is
  most of why #16's HowLongToBeat repairs looked as though they had not worked, because the
  half of the feature being tested by hand — pinning an id — needs no restart to keep working.
  See **X may have slashes in it**.

### Where HowLongToBeat has got to

1. ~~Spike~~ — established that HLTB answers at all, and what shape. Throwaway, not committed;
   everything it found is written down under **HowLongToBeat** below.
2. ~~Schema~~ — `AddHltbTimes`: two more hours columns, `hltb_checked_at`, `release_year`, and
   the first check constraint on `games`.
3. ~~Display~~ — three tiers in the drawer, the estimate on a card, `sort=hours` as
   *Time to beat*. Built before any network code, so the feature was demonstrable with numbers
   set by hand in psql.
4. ~~`Integrations/Hltb/`~~ — session, client, throttle, and the 502 mapping.
5. ~~`Services/HltbMatcher`~~ — the pure matcher, and the actual work of the feature.
6. ~~Writing the numbers~~ — `HltbService`, the queue and its worker, and the two endpoints.
7. ~~The drawer's pin control~~ — `HltbPin` in the drawer header beside the genre select, and
   `setHltbId` in `useJournalEntry.ts` following `setGenre`. See **The pin control** below for
   the two places it does not do what the plan said.
8. ~~End-to-end~~ — `e2e/support/hltb-stub.mjs` on :5398 as a fourth `webServer`, and
   `e2e/hltb.spec.ts`. See **What the stub is for** below.

**Five things about search worth not re-deriving.** It debounces at 300ms because the API reaches
IGDB on *every* call by design and caches nothing — the debounce is the only thing between typing
"hollow" and six requests. And a result already in your library shows "On your board" rather than
an add button, because a second Backlog entry is not a replay but the card would render it as
one. Knowing that needs the whole library, so `libraryMediaIds()` pages to the end rather than
stopping at the API's maximum page size; capping it would offer to add your hundred-and-first
title twice. It asks IGDB for main games only, in the sense of **not mods and not bundles** —
see **Game types** below, because the reason it is a `where` clause rather than a filter over
the results is not obvious. **It asks IGDB two questions rather than one**, because IGDB's
search cannot match a prefix and "hollow k" would otherwise find nothing at all. And **it does
not hand back the order IGDB gave it**. See **Two questions, not one** and
**Ranking search results**.

**The column query key is `['library', hobby, status, { sort, year }]`** — see
`frontend/src/board/keys.ts`, which is the only place it is spelled out. The sort and the year
belong in the key and not just in the request: leaving them out serves the previous ordering
from cache and corrects itself only on the next refetch, which is a board showing one order
while claiming another. `useBoard` builds the same key to write into, so the two cannot drift.

`gameKey(mediaId)` — `['games', mediaId]` — lives there too, though the drawer is what reads it.
The board *writes* to it: a transition stamps `started_at` and can insert a whole new entry, so a
drag has to drop the drawer's copy. Two hooks spelling that key by hand is how one of them quietly
stops matching, which is exactly what happened. **A move invalidates the column *prefix*
`['library', hobby, status]`, not the fully-qualified key**, because a column has one cache entry
per sort and year and the exact key only reaches whichever one is on screen. A reorder keeps the
exact key on purpose: it writes `position`, and `manual` is the only ordering that reads it.

Decisions already made with the user, **settled — do not reopen**:

| | |
|---|---|
| Shape | Vite + React + TS SPA, client routing. Not Next.js |
| Scope | **`/board`, behind a session, plus `/signin`.** Search is a bar on the board, not a screen; `/search` redirects. No detail or year-review page yet |
| Columns | Backlog · Playing · Completed, plus Dropped as a muted 4th, collapsed by default |
| Dropped | *Move to Dropped* in a card's menu, or a drag — **collapsed or not**; drag out of the Dropped column to un-drop |
| Card corner | An **`⋯` options menu on all four columns**: the three columns it is not in, then *Remove from board*. It replaced a `×` that meant *drop* on Playing and *remove* on Backlog and was absent on the other two |
| Note on a card | The last thing you wrote about a title, **across every pass**, clamped to two lines. Every other field on a card comes from the current pass; this one deliberately does not |
| Year | **One control above the whole board**, defaulting to the latest year there is. Backlog is exempt; the other three filter on the date each is about. See **The board is one year at a time** |
| Ordering | `manual` is the default sort; dragging is enabled **only** in that mode |
| Sort control | **Per column**, not board-wide. Completed reads well by rating while Backlog stays in the order you put it in |
| Libraries | TanStack Query, dnd-kit, Tailwind v4 |
| Dev wiring | Vite proxy `/api` → `:5201`, **`changeOrigin: false`** so sign-in stays on one origin. **No CORS change needed or wanted** |
| Testing | Vitest + RTL + MSW for logic and components; Playwright for the drag |
| E2E harness | Real API and real Postgres on a **separate `hobbytracker_e2e` database**, with IGDB, HowLongToBeat and the OAuth provider stubbed. See **Tests** |
| Sessions | An **httpOnly cookie**, and every board route is `[Authorize]`d. See **Auth** |
| Timezone | `America/New_York`, server-configured, DST-following. See **Time** |
| Timestamps | `started_at` / `completed_at` / `logged_at` are instants, not dates |

Working method the user asked for and has held to since the journal: **write the failing test
first, show it red, then implement.** Not implementation followed by an offer to add tests.
## Stack

| | |
|---|---|
| API | ASP.NET Core 10 Web API (controllers, not minimal APIs) |
| Data | EF Core 10 + Npgsql 10, PostgreSQL 17 |
| Frontend | React 19 + TypeScript, Vite 8, Tailwind v4, TanStack Query, dnd-kit — **done** |
| External data | IGDB v4 (games), authenticated through Twitch |

Pinned packages: `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.3, `Microsoft.EntityFrameworkCore.Design`
10.0.11, `EFCore.NamingConventions` 10.0.1. The `dotnet-ef` CLI must match EF Core (10.0.11).

## Layout

```
/                        monorepo root
├── docker-compose.yml    local Postgres 17
├── global.json           opts dotnet test into Microsoft.Testing.Platform
├── CLAUDE.md             this file
├── frontend/             Vite + React + TS SPA
│   ├── index.html        stamps the chosen theme before the bundle loads. See The redesign
│   ├── vite.config.ts    /api proxy to :5201, and the Vitest config
│   ├── playwright.config.ts  starts three stubs, the API and Vite itself
│   ├── e2e/              drag specs, plus the IGDB, HowLongToBeat and Google stubs
│   └── src/
│       ├── api/          one module per resource, mirroring Contracts/
│       ├── lib/time.ts   instants → Eastern, pinned. Never new Date().getFullYear()
│       ├── lib/hours.ts  formatHours — display, so board/ need not reach into journal/
│       ├── board/        the board. keys.ts owns the query key, columns.ts the four columns and
│       │                 their labels, sensors.ts the drag's activation distance, useBoard the writes
│       ├── journal/      the drawer over the board — rating, platform, dates, notes, earlier passes
│       ├── search/       BoardSearch + SearchResult — the bar and strip above the board
│       ├── shell/        AppHeader, the sign-in screen, the session gate, hobbies and providers
│       ├── theme/        the four themes, the two densities, and the menu that picks them
│       └── test/         MSW server, fixtures, and the render helper
└── backend/
    ├── HobbyTracker.slnx
    ├── Directory.Packages.props   ALL package versions live here (central management)
    ├── src/HobbyTracker.Api/
    │   ├── Program.cs        composition root — DI wiring lives here, nowhere else
    │   ├── Domain/           EF entities, no attributes, no persistence concerns
    │   ├── Data/
    │   │   ├── HobbyTrackerDbContext.cs
    │   │   ├── SeedData.cs           lookup rows + their fixed ids
    │   │   ├── Configurations/       one IEntityTypeConfiguration per entity
    │   │   └── Migrations/
    │   ├── Integrations/Igdb/        IGDB client, auth, wire DTOs
    │   ├── Integrations/Hltb/        HowLongToBeat session, client, throttle, wire DTOs
    │   │                             (no Integrations/Auth: the OAuth handler is the framework's)
    │   ├── Services/                 orchestration (IGDB → database → DTO), and AuthService
    │   ├── Contracts/                what the API accepts and returns
    │   ├── Controllers/
    │   └── Infrastructure/           cross-cutting (exception handling, journal clock, JSON,
    │                                 the HowLongToBeat queue + its worker, AuthOptions,
    │                                 ICurrentUser and ExternalSignIn)
    └── tests/HobbyTracker.Api.Tests/
        ├── Infrastructure/           container fixture, host factory, fakes, TestAuthHandler
        ├── Data/  Services/  Integrations/  Endpoints/
```

The layering rule worth keeping: **IGDB wire types never leave `Integrations/Igdb`, and EF
entities never leave the service layer.** Controllers speak `Contracts/` only.

Package versions are centrally managed. Add a `PackageVersion` to
`backend/Directory.Packages.props` and a bare `PackageReference` (no `Version`) in the csproj.
`CentralPackageTransitivePinningEnabled` is on deliberately: without it the test project
resolves EF Core 10.0.4 (Npgsql's declared minimum) while the API resolves 10.0.11 via the
Design package, which does not flow across a `ProjectReference`.

## Running it

```bash
docker compose up -d db                      # Postgres on localhost:5432

# One-time: IGDB credentials. These are Twitch credentials — register an app at
# https://dev.twitch.tv/console/apps. Never put them in appsettings.json.
dotnet user-secrets set "Igdb:ClientId" "..."     --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Igdb:ClientSecret" "..." --project backend/src/HobbyTracker.Api

# One-time: sign-in credentials, one pair per provider. Both are required and the host will not
# boot without them, naming the missing key. Register the apps at
# https://console.cloud.google.com/apis/credentials and
# https://discord.com/developers/applications, each with
# http://localhost:5173/api/auth/{provider}/callback as an authorised redirect URI — the
# frontend's port, not the API's. See The five traps under Auth for why that matters.
dotnet user-secrets set "Auth:Google:ClientId" "..."      --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Google:ClientSecret" "..."  --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Discord:ClientId" "..."     --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Discord:ClientSecret" "..." --project backend/src/HobbyTracker.Api

dotnet ef database update --project backend/src/HobbyTracker.Api --startup-project backend/src/HobbyTracker.Api
dotnet run --project backend/src/HobbyTracker.Api   # http://localhost:5201

# Frontend. Needs the API running for anything to load; the proxy expects it on :5201.
cd frontend && npm install && npm run dev     # http://localhost:5173
```

**Use http://localhost:5173 rather than the API's port.** Sign-in has to stay on one origin, and
the Vite proxy is what makes that true — see **Auth**.

**No provider app to hand?** The e2e Google stub doubles as a local provider:
`node frontend/e2e/support/google-stub.mjs`, then point `Auth:Google:AuthorizationEndpoint`,
`TokenEndpoint` and `UserInfoEndpoint` at `http://localhost:5397/o/oauth2/v2/auth`, `/token` and
`/v1/userinfo` in user-secrets. `dotnet user-secrets remove` them to go back to the real thing.

`docker compose exec db psql -U admin -d hobbytracker` for a shell. Credentials are
`admin`/`password` — a localhost throwaway, which is why they sit in
`appsettings.Development.json` while the IGDB and sign-in secrets do not.

Startup **fails deliberately** if the IGDB or sign-in credentials are missing
(`ValidateOnStart`), naming the missing setting. That is the intended behaviour, not a bug to
work around.

After a migration adds a column IGDB owns, bring the library you already have up to date —
`POST /api/games/refresh`. See **Genres and colour**. HowLongToBeat has its own, which answers
immediately rather than when the work is done — `POST /api/games/hltb/refresh`. See
**HowLongToBeat**.

**Both now need a session, so a bare `curl` gets a 401.** They are `[Authorize]`d along with
everything else, deliberately — see **`[Authorize]`, and one cost accepted**. Sign in in the
browser and call them from its console, or drive `curl` with a cookie jar:

```bash
# Sign in once into a jar, then spend it. The redirect chain ends on the board.
curl -c /tmp/jar -L "http://localhost:5173/api/auth/google/start?returnUrl=/board" -o /dev/null
curl -b /tmp/jar -X POST http://localhost:5173/api/games/refresh
```

New migration:
```bash
dotnet ef migrations add <Name> \
  --project backend/src/HobbyTracker.Api --startup-project backend/src/HobbyTracker.Api \
  --output-dir Data/Migrations
```

## Tests

```bash
dotnet test --solution backend/HobbyTracker.slnx    # backend, 325 tests
cd frontend && npm test                             # frontend, 336 tests
cd frontend && npm run test:e2e                     # 83 specs in a real browser
```

Note `--solution`: the .NET 10 SDK's Microsoft.Testing.Platform mode (opted into via
`global.json`) takes it, where the old VSTest mode took a bare path.

The suite starts its own throwaway Postgres via Testcontainers, so it neither needs nor touches
the docker-compose database. It does need Docker running. A full run is under ten seconds.

**A dev server used to block the e2e run**, and the ports being one apart never saved you from it.
The Playwright harness rebuilds the API, and Windows will not let it overwrite
`bin/Debug/net10.0/HobbyTracker.Api.exe` while a `dotnet run` of your own is executing it. It
arrived as `MSB3027` buried inside a web server that Playwright described only as "Process from
config.webServer was not able to start".

**`BaseOutputPath: 'bin/e2e/'` in `playwright.config.ts` is the fix**, and it is one line with
three things worth knowing behind it:

- **It is an environment variable, not a `-p:` flag.** MSBuild reads the environment as
  properties, and that API web server is *two* dotnet invocations chained — the
  `dotnet ef database update` in front has nowhere to take an MSBuild flag, and it is the one
  that failed first.
- **`obj/` stays shared on purpose.** The compilation is identical either way, so only the copy
  destination differs; neither build redoes the other's work and the second is a copy rather than
  a rebuild.
- **`bin/e2e/` rather than a sibling `bin-e2e/`,** so the existing `[Bb]in/` rule in
  `.gitignore` already covers it.

Proven the only way worth proving: reproduced first — `dotnet run`, then `touch Program.cs`, then
a build that failed naming the locking process — and then the full suite run green **with the
development server still up**. Note the reproduction needs that `touch`: with nothing changed
MSBuild skips the copy, never attempts the locked file, and the suite passes while telling you
nothing. `dotnet build backend/src/HobbyTracker.Api` still names the locking process if some
other build ever hits this.

**`dotnet test` has no such fix, and hits the same lock.** The Playwright harness carries its
own `BaseOutputPath`; the backend suite builds the API to the default `bin/Debug` and so fails
with the same `MSB3027` whenever a `dotnet run` of yours is up. It is one environment variable
at the call site rather than a config change, because unlike the e2e run this is a thing you
type rather than a thing that runs itself:

```bash
BaseOutputPath='bin/testrun/' dotnet test --solution backend/HobbyTracker.slnx
```

Stopping the development server works just as well. Do not add this to a config file — the
default path is the right one when nothing is holding it.

Choices worth not re-litigating:

- **Real Postgres, not in-memory or SQLite.** What is worth testing here is Postgres-specific:
  the partial unique index behind upsert idempotency, the `23505` the upsert recovers from,
  `text[]` columns, check constraints. A fake provider passes tests production fails.
- **Migrations, not `EnsureCreated`.** `EnsureCreated` builds DDL from the model and skips
  migrations entirely, so anything expressed only in a migration would vanish.
- **Respawn ignores `hobby_lu` and `source_lu`, and only those.** They are migration-managed
  reference data whose ids `SeedData` exposes as compile-time constants; wiping them between
  tests shows up as baffling foreign-key failures. `users` is deliberately *not* on that
  list: each test makes its own, which is what lets one test act as two people.
- **`ApiFactory` runs under a "Testing" environment**, so `appsettings.Development.json` and
  user-secrets do not load and real IGDB credentials cannot leak into a test run.
- **No `Microsoft.NET.Test.Sdk` or `xunit.runner.visualstudio`.** Those make the project support
  VSTest as well as MTP, which is the mixed configuration the .NET 10 SDK refuses to run.
- **Shouldly, not FluentAssertions** — v8+ of the latter is Xceed-owned and "all rights
  reserved".

The frontend suite is Vitest over **MSW**, with no handlers registered by default and
`onUnhandledRequest: 'error'` — a request the test did not state is a failure, not a silent
pass-through. It covers the API client's URL building and error handling, `lib/time`'s pinning to
the journal zone, and the board's components. `src/test/library.ts` stubs a whole board in one
call, because a component test would otherwise have to state four column requests and the year
list before it could assert anything at all.

**The drag gets a real browser.** jsdom has no layout and no pointer events, so a dnd-kit
assertion there passes or fails for reasons unrelated to whether dragging a card works.
`npm run test:e2e` starts five servers itself — no manual setup beyond `docker compose up -d db`:

- **A HowLongToBeat stub** (`e2e/support/hltb-stub.mjs`) on :5398, pointed at by `Hltb__BaseUrl`
  and running with `Hltb__MinSecondsBetweenRequests=0` — the politeness floor is two seconds a
  request and nothing here needs protecting from us. See **What the stub is for**.
- **An OAuth provider stub** (`e2e/support/google-stub.mjs`) on :5397, pointed at by
  `Auth__Google__*` and `Auth__Discord__*`. It is a provider rather than an endpoint — authorize,
  token and user-info — so the framework's real handler runs against it unmodified, and it
  refuses anything malformed rather than waving it through. See **The test harnesses** under
  **Auth**.
- **An IGDB stub** (`e2e/support/igdb-stub.mjs`) on :5399. `Igdb:BaseUrl` and `Igdb:TokenUrl` are
  plain options, so pointing them at it needs no production code — and it is what makes "seed
  through the API, never IGDB" possible at all, since `media` rows are *only* ever written by a
  search. Specs seed the way a person does: search, then `POST /api/log-entries`.
- **The API** on :5202 under `ASPNETCORE_ENVIRONMENT=E2E`, so `appsettings.Development.json` and
  user-secrets do not load and real IGDB credentials cannot leak into a run — the same guard
  `ApiFactory` gets from its "Testing" environment. `--no-launch-profile` matters: without it
  `launchSettings.json` pins :5201 and quietly wins over `ASPNETCORE_URLS`.
- **Vite** on :5174 with `VITE_API_TARGET` pointed at :5202.

The migration is chained into the API's command rather than run from `globalSetup`, because
Playwright starts its web servers *first* — the API would be answering readiness checks from a
database that did not exist yet.

**A separate `hobbytracker_e2e` database, on purpose.** The specs truncate between cases, and the
development database holds the games you actually logged. One environment variable makes it
impossible for a test run to delete your backlog. Truncation leaves `hobby_lu` and `source_lu`
standing, exactly as Respawn does in the backend suite and for the same reason — but it does
take `users` and `auth_identities`, so a run starts with nobody signed up and one spec cannot
be satisfied by the sign-in of the one before it.

Working method: **write the failing test first.** The journal endpoints were driven that way,
and the backfill suite over the schema-and-search code was written before any of them, so the
harness was proven against behaviour already known to work rather than going green on its first
run.

## Schema

Table and column names are snake_case, applied by `EFCore.NamingConventions`
(`UseSnakeCaseNamingConvention()` in `Program.cs`). Explicit `ToTable()` calls still win, which
is how the lookup tables keep their `_lu` suffix.

| Table | Columns |
|---|---|
| `hobby_lu` | `id`, `name` — games, movies, tv, anime, books, music |
| `source_lu` | `id`, `name`, `base_url` (null for `manual`) |
| `media` | `id`, `hobby_id`, `source_id`, `title`, `external_id`, `cover_url` |
| `games` | `media_id` (PK **and** FK to media), `platforms`, `developers`, `genres`, `primary_genre`, `release_year`, `hltb_all_styles_hours`, `hltb_main_story_hours`, `hltb_main_extra_hours`, `hltb_completionist_hours`, `hltb_id`, `hltb_checked_at` |
| `log_entries` | `id`, `user_id` (**NOT NULL**), `media_id`, `status`, `position`, `rating`, `platform`, `hours_played`, `started_at`, `completed_at`, `logged_at` |
| `notes` | `id`, `log_entry_id`, `body`, `written_at` |
| `users` | `id`, `display_name`, `role`, `created_at` |
| `auth_identities` | `id`, `user_id`, `provider`, `provider_user_id`, `email` |

### Table-Per-Type for Media/Games

`Game` derives from `Media` and is mapped to its own table. **`builder.ToTable("games", …)` in
`GameConfiguration` is the entire mechanism** — mapping a derived entity to its own table is
what makes EF choose TPT. Delete that line and EF silently falls back to Table-Per-Hierarchy,
folding every hobby's columns into `media` behind a discriminator.

Why TPT: `Movies`, `Books` and the rest arrive as sibling detail tables, each with columns that
are meaningless for the others. TPH would make `media` a swamp of mostly-null columns; TPC would
duplicate the shared columns and make "everything I logged this year" a `UNION` across every
hobby.

The cost, stated plainly: polymorphic queries over `Media` need a LEFT JOIN per subtype, and
inserts touch two tables. Both are acceptable at personal-catalogue scale. Querying
`db.Games` — the derived `DbSet` — emits an INNER JOIN instead and is the cheap path.

Note the PK column rename in `GameConfiguration` goes through the **table builder**
(`ToTable("games", t => t.Property(g => g.Id).HasColumnName("media_id"))`), not
`builder.Property(...)`. `Id` is declared on `Media`, so configuring the property directly
renames the column in `media` too and leaves the base table with no `id` at all.

### Decisions that will look arbitrary later

- **`media.hobby_id` is redundant under TPT** — a row in `games` is always hobby=games. Kept on
  purpose: it lets "everything in hobby X" filter on one table instead of LEFT JOINing every
  detail table that will exist once movies do. Nothing enforces the two agree; the catalog service
  sets it from `SeedData.Hobbies`.
- **`external_id` is `text`, not `int`.** IGDB and TMDB use numeric ids, but `media` is
  source-agnostic and future sources may not. Null for `manual` rows.
- **Unique index on `(source_id, external_id) WHERE external_id IS NOT NULL`.** This is the
  natural key the IGDB upsert dedupes on — without it, searching "halo" twice inserts every
  result twice. Filtered because `manual` rows carry a null `external_id` and many must coexist.
- **`status` is one shared four-value enum for every hobby** (`Backlog`, `InProgress`,
  `Completed`, `Dropped`) and is stored **as text**. Do not add per-hobby status tables or
  values — cross-hobby views depend on the vocabulary being identical. Text rather than an int
  ordinal so reordering `LogStatus` can never silently reinterpret existing rows.
- **`platforms` and `developers` are Postgres `text[]`.** IGDB returns arrays for both; a single
  column would drop data. Npgsql maps `List<string>` natively — no join tables, no converter.
- **`log_entries.platform` is free text, not a foreign key to that array.** It is what you played
  *this pass* on, where `games.platforms` is what the game came out on — a replay years later is
  often somewhere else, which is the whole reason it sits on the pass. The UI offers IGDB's list
  and the server accepts anything up to 100 characters: IGDB's data changes, and a value that was
  true when it was written has to outlive the list it was chosen from. A pass inserted by a drag
  out of Completed gets a null platform rather than inheriting the last one.
- **Notes are rows, not a column.** `log_entries.notes` was one nullable text field, so writing a
  second thought destroyed the first — which is not a journal. `written_at` is server-stamped like
  `logged_at` and **does not move when a note is rewritten**: the date is when you wrote it, not
  when you last fixed a typo. Cascade delete, because a note belongs to the pass it was written
  during. The migration that carried the column across gave each note its entry's `logged_at`,
  that being the only honest date available for text with none of its own.
- **`log_entries.hours_played` is per pass**, `numeric(5,2)`, for every reason `platform` is: a
  replay is not the same length as the first run, and the number worth reading beside HLTB's
  estimate is how long *this* playthrough took. Same precision as `hltb_main_story_hours`,
  because comparing them is the point. Named "played" rather than "to complete" because a pass
  can be `InProgress` or `Dropped`, where "to complete" would be a lie. A pass inserted by a drag
  out of Completed starts with neither hours nor platform.
- **The three `hltb_*_hours` columns are `numeric(5,2)`, and null never means nought.**
  HowLongToBeat answers `0` for a game nobody has submitted a time for, which is a different
  claim from "takes no time" — `ck_games_hltb_hours_positive`, the first check constraint on
  `games`, exists to make forgetting to map that fail loudly rather than store a lie. There is no
  upper bound in it on purpose: `numeric(5,2)` *throws* past 999.99 rather than rounding, so an
  over-long completionist time — and they exist — has to be dropped to null in the client, where
  a constraint could not help anyway. Only that tier is lost; its siblings are still good numbers.
  Any one of the three can be null on its own, which is ordinary rather than an error.
- **`games.hltb_checked_at` separates *never asked* from *asked, nothing matched*.** Stamped on a
  miss as well as a hit, which is the entire point of it: without that, the backfill re-asks about
  every unmatchable title on every run, for ever. It is also what makes a second backfill answer
  `{"queued":0}`.
- **`games.release_year` exists for the matcher and nothing else.** IGDB and HowLongToBeat both
  list "Resident Evil 4" twice under exactly that title, 2005 and 2023, and nothing in the strings
  can tell them apart. Read from IGDB's `first_release_date` in **UTC**, not the journal zone,
  because it is compared against HLTB's `release_world` — a bare year belonging to no timezone,
  so localising would invent a distinction the other side cannot carry.
- **`games.genres` is `text[]`, and `games.primary_genre` is the one you chose.** Null there
  means "use the automatic pick", not "no genre" — which is why the drawer's blank option reads
  *Automatic — Platform* rather than *Not recorded*. Free text up to 50 characters, not a value
  constrained to the array beside it, on `log_entries.platform`'s reasoning exactly. `genres` is
  stored alphabetically like the other two arrays; IGDB's ordering is not meaningfulness
  ordering, and which one wins is decided on the client. See **Genres and colour**.
- **`rating` is `numeric(3,1)`, 1.0–10.0**, enforced by a check constraint. Decimal on purpose:
  8.5 and 9.6 are the point.
- **Lookup ids are fixed constants**, `ValueGeneratedNever()` + `HasData`. They are part of the
  schema contract, which is why `SeedData.Sources.Igdb` can be used directly instead of paying
  for a lookup query per request.
- **Only `igdb` and `manual` are seeded.** `tmdb`/`mal` get added when their integrations ship —
  a source row with no client behind it reads like a working feature.

### Known cosmetic quirk

The two TPT tables get `PK_media` / `PK_games` while every other primary key is snake_case
(`pk_users`, `pk_log_entries`). `EFCore.NamingConventions` does not rewrite key names for
TPT tables. Left alone deliberately: EF only uses constraint names when generating migrations,
so renaming them behind EF's back would make a future `DROP CONSTRAINT` fail. Not worth it.

## Time

The app records days in **`America/New_York`**, configured as `Journal:TimeZone` in
`appsettings.json` and validated at startup the same way the IGDB credentials are — an
unresolvable zone id fails the boot naming the setting, rather than silently falling back to UTC.
It is an IANA id, not a fixed offset, so Eastern is UTC-4 in summer and UTC-5 in winter without
anyone having to remember which.

**Why not UTC.** UTC rolls over at 8pm Eastern in summer and 7pm in winter, so every game
finished in the evening — which is most of them — was stamped with tomorrow's date. That was a
four-to-five hour hole in every day the app is actually used.

The rule that keeps the rest simple: **an instant is stored as an instant, and a zone is applied
only where a human or a calendar question is involved.** So:

- `started_at`, `completed_at` and `logged_at` are `timestamptz` holding absolute moments.
  `users.created_at` and the Twitch token expiry are instants too and were always fine.
- The transition rules stamp `IJournalClock.Now` and never ask what day it is.
- The zone is applied in exactly three places: `?year=`, `GET /api/library/years`, and the UI.

`IJournalClock` (`Infrastructure/JournalClock.cs`) wraps `TimeProvider` plus the zone. It exists
so the date rules have something to ask and something a test can stop — `FrozenTimeProvider` in
the test harness is swapped in by `ApiFactory` exactly as `FakeIgdbClient` is.

**`logged_at` is server-stamped and absent from the request contracts.** It records that an entry
was written, which is not something a caller is in a position to assert — the same reasoning that
keeps `mediaId` off the PUT body. It has a `now()` default so a row written by hand in psql is
still valid, but `LogEntryService` sets it explicitly on every insert it makes.

### Two traps this cost a while to find

- **Npgsql will only write a `DateTimeOffset` with offset 0 to `timestamptz`.** Anything else
  throws `ArgumentException` — not a validation error, a 500. The offset is not stored regardless,
  since the column holds an instant, so everything is normalised to UTC at the boundary. This is
  why `JournalTimestampConverter` exists and why `FirstInstantOf` and the test helper `Eastern()`
  both end in `.ToUniversalTime()`.
- **`System.Text.Json` reads a bare `"2026-03-03"` into a `DateTimeOffset` as midnight *UTC*** —
  7pm on the 2nd here, which is the original bug walking back in through the API.
  `JournalTimestampConverter` reads any value carrying neither `Z` nor `±hh:mm` as that wall-clock
  moment *here*, and passes explicit offsets through untouched.

**The year filter is a range, not an `EXTRACT`.** It is also four rules rather than one — see
**The board is one year at a time** — but every one of them compares instants.
`date_part('year', completed_at)` on a
`timestamptz` reads the session's timezone, so the same query would answer differently depending
on how the connection was opened, and a game finished at 8pm on New Year's Eve would count toward
the following year. `LibraryService.SpanOf` turns a year into `[Jan 1 here, next Jan 1 here)` and
compares instants, which is both correct and index-friendly.
`ActivityYearsAsync` cannot do that — it needs a year per row — so it selects the instants
and groups them in C#. Postgres can only localise a `timestamptz` through `AT TIME ZONE`,
which is `STABLE` rather than `IMMUTABLE` and so cannot be indexed or put in a generated column.
At personal-catalogue scale that is a few hundred rows.

**docker-compose sets `timezone=America/New_York` on the server**, so `psql` renders timestamps in
Eastern and what you read there matches what the app shows. That is convenience only — nothing is
correct because of it, and removing it breaks nothing.

## IGDB integration

IGDB v4 is authenticated through Twitch's client-credentials flow. Base URL
`https://api.igdb.com/v4/`, queries are **POST bodies in APIcalypse**, not query strings.
Rate limit is 4 requests/second.

Three pieces, each with one job:

1. **`TwitchTokenProvider`** — the client-credentials flow. Singleton, caches the token against
   its `expires_in` (tokens last ~60 days) with 60s of skew. A `SemaphoreSlim` guards the
   refresh so a burst triggers one token fetch, not one each. Takes `IHttpClientFactory` rather
   than an injected `HttpClient`: as a singleton it would otherwise pin one handler forever and
   stop seeing DNS changes.
2. **`IgdbAuthHandler`** — a `DelegatingHandler` that stamps `Client-ID` and
   `Authorization: Bearer` on every request, and on a 401 invalidates the token and replays
   once. Auth lives here so the client has none, and every future IGDB endpoint is
   authenticated for free.
3. **`IgdbClient`** — typed client. Builds APIcalypse, deserializes, throws `IgdbException`.

`IgdbException` becomes a **502** via `IgdbExceptionHandler`, not a 500 — "the upstream
provider is unhappy" is a different message to a caller than "this API is broken".

Two IGDB quirks the code depends on:
- It requests `cover.image_id`, not `cover.url`. `url` returns protocol-relative and pinned to
  thumbnail size; the id composes cleanly at any size via `IgdbImage`.
- There is no `developer` field on a game. Involvement is a join carrying role flags, so the
  query pulls `involved_companies.developer` alongside `involved_companies.company.name` and
  filters.

### Game types

A search asks for everything **except Bundle and Mod** — `where game_type != (3,5);`, one line
in `IgdbClient`. Without it the first result for "Hollow Knight" is a *mod* of Hollow Knight,
ranked above the game itself; "Celeste" returns three mods, two of them the same title twice.

Four things behind that one line, each of which cost something to establish:

- **`category` is not the field, and writing the filter against it would fail silently.** It is
  deprecated in favour of `game_type` and **no longer populated at all** — asking for it comes
  back absent on every row, so `where category != (3,5)` excludes nothing while looking right.
- **The ids came from `/v4/game_types`, not from the old enum.** They happen to agree — 0 Main
  Game, 1 DLC, 2 Expansion, 3 Bundle, 4 Standalone Expansion, 5 Mod, 6 Episode, 7 Season,
  8 Remake, 9 Remaster, 10 Expanded Game, 11 Port, 12 Fork, 13 Pack / Addon, 14 Update — but
  agreeing by inspection is a different thing from agreeing by assumption.
- **It is in the query, not over the results.** IGDB applies `where` before `limit`, so a
  filter applied afterwards would ask for ten and hand back six. Live, the filtered search
  still returns a full ten, backfilled with further matches, in the same relevance order.
- **It deliberately does not reach `GetGamesAsync`.** Those ids are already on somebody's
  board. A mod logged before this existed has to stay refreshable, or it silently keeps
  whatever IGDB said the day it was added, for ever, with nothing reporting the skip.
  `IgdbClientTests.Leaves_the_backfill_able_to_refresh_anything_already_logged` pins that.

**Bundle is the arguable half, and is meant to stay easy to take back.** It catches things
people genuinely play: *Halo: The Master Chief Collection* and *The Witcher 3: Game of the
Year Edition* are both filed as bundles. It is excluded because most bundles are shovelware
pairs nobody logs, and the user has said to leave the door open rather than settle it. So the
ids are named constants — `BundleType` and `ModType` in `IgdbClient` — and re-enabling is one
edit: drop `BundleType` from the clause, and delete the half of the client test and the e2e
spec that name a bundle. **Do not treat this one as settled.**

`Season` is untouched, which is a live annoyance rather than a decision: "Mario Kart" returns
ten *Mario Kart Tour: … Tour* seasons and none of the actual games. Adding `7` to the clause
would fix it and has not been asked for.

**The e2e stub honours the clause rather than ignoring it.** `igdb-stub.mjs` carries a mod and
a bundle in its catalogue, both matching "hollow", and parses `where game_type != (...)` — so
`a mod and a bundle never reach the strip` goes red if the clause is ever dropped from the
client, instead of passing because the stub never had one.

### Two questions, not one

`IgdbClient.SearchGamesAsync` sends **two queries in parallel** and merges them. Neither can be
dropped, and the reason is measured rather than argued:

| typed | `search` | `where slug ~ *"…"*` |
|---|---|---|
| `hollow k` | **nothing** | Hollow Knight, Silksong, Godmaster |
| `pokemon s` | Pokemon Topaz, Name That Pokemon | **Sword, Silver, Sapphire, Stadium** |
| `botw` | **Breath of the Wild** | Botworld Odyssey, RobotWar |
| `gta v` | **Grand Theft Auto V** | nothing |
| `final fantasy 7` | **Final Fantasy VII** | nothing |

**IGDB's `search` is full text over whole words and does no prefix matching whatsoever.** Typing
half a title — the ordinary way to use a search box — answers with nothing at all, or with junk
that happens to contain a whole word you typed. That is not a limitation worth passing on.

**The slug is what makes the prefix half work, and `name` is not.** `name ~` is
*accent-sensitive*, so `*"pokemon"*` finds only the handful of games actually spelled without the
é and none of Nintendo's. IGDB writes "Pokémon Sword" as the slug `pokemon-sword`, so the accent
is already gone before the comparison happens. `SlugPatternOf` builds the same shape from what was
typed: lower case, accents folded, every run of anything else a single hyphen.

That doubles as the escaping — the pattern can only hold letters, digits and hyphens, so nothing
survives that could close the APIcalypse string early. `SanitizeSearchTerm` has to do that job by
hand because it keeps spaces.

Three details worth not rediscovering:

- **The slug query carries `sort total_rating_count desc;`**, and is only allowed to because it
  has no `search` in it — IGDB refuses the two together. Without a sort, *which* ten of the
  hundreds of slug matches come back is arbitrary.
- **Parallel, not sequential.** Two round trips one after the other would double what a keystroke
  costs. It also means two threads hit `StubHttpMessageHandler` at once, which is why that now
  takes a lock — `List.Add` losing a request would read as the client never having sent it.
- **A pattern under two characters is skipped.** `*"a"*` matches most of the catalogue, so a
  one-letter search would answer with the ten most-rated games containing an "a".

The merged set can hold up to twice the limit, so `GameCatalogService.SearchAsync` **ranks first
and cuts second** — trimming before ranking would throw away the prefix matches, which are usually
the good ones. The cut also happens before the upsert, which keeps the catalogue growing at the
rate it always did: one row per result somebody could actually have seen.

### Ranking search results

`Services/IgdbRelevance` re-orders what those two questions found. Filtering mods and bundles was
only part of the problem: **IGDB ranks on string relevance, and string relevance cannot tell a
game from a fan game named after it.** Searching "Hollow Knight Silksong" returns a Game Boy Color
game by one person, no ratings and one platform, *above* Team Cherry's — because the fan game's
title is that exact string and the real one has a colon in it. No amount of title matching fixes
that; the fan game is genuinely the better string match.

The rule is three lines:

1. **The game more people have played comes first.** `total_rating_count + hypes`, added rather
   than chosen between because they cover different halves of a game's life: an unreleased game
   has no ratings by definition, and Silksong sat on 220 hypes and nothing else for years, which
   was exactly when it was most searched for. A fan game has neither.
2. **How well the title matches breaks the ties** — and that is most of what orders the long tail,
   because nearly everything down there has no ratings at all. It is what puts "Celeste Witch"
   above "The Mystery of the Mary Celeste".
3. **IGDB's own order breaks what is left**, through a stable sort.

**Two other rules were tried against the live API and are worse.** Ordering by title first and
popularity second creates the "Zelda" case: there is a game called exactly `Zelda` with no ratings
at all, and it goes straight above *The Legend of Zelda* — the same bug wearing a different hat.
Putting a floor under that instead, so a title not containing the search text can never outrank
one that does, then loses "botw": the slug question drags in Botworld Odyssey and RobotWar and the
floor buries *Breath of the Wild* beneath them. Exempting IGDB's own first pick from that floor
rescues "botw" and breaks "gta v" and "final fantasy 7", by promoting that pick above equally
unmatched results with sixty times the ratings. All three are pinned by tests named after what
they got wrong.

**The floor was in for a while and its removal costs exactly one measured thing:** "Doom 3" puts
*Phantasy Star III: Generations of Doom* third, where the floor had the Xbox *Doom 3*. A third
place is worth less than the first place "botw" loses. What makes it safe to drop is the second
question — the candidate set is tight enough now that a famous game is rarely in it by accident.
"Celeste Classic 2", "Celeste Witch" and "Hollow Knight Godmaster" each come back with a single
candidate.

**It cannot be done in the query.** IGDB rejects a search carrying a sort outright:
`406 "Search is sorting on relevancy and therefore sort is not applicable on search"`.

`total_rating_count` and `hypes` are **asked for and never stored**. They are facts about how many
people have played a game today rather than facts about the game, so a copy would go stale while
answering for a ranking nobody would think to re-run.

Measured against the live API rather than reasoned about. All correct as of August 2026:
*pokemon s*, *hollow k*, *mario ka*, *zeld*, *botw*, *gta v*, *final fantasy 7*, *Hollow Knight*,
*Hollow Knight Silksong*, *Silksong*, *Zelda*, *Celeste*, *Celeste Classic 2*, *Celeste Witch*,
*Halo 3*, *Doom*, *Mario Kart 8*, *Elden Ring*, *Elden Ring GB*, *Final Fantasy VII Rebirth*,
*Outer Wilds*, *Stardew Valley*.

**The e2e stub is as limited as the real endpoint, deliberately.** Its `matchesTerm` requires
every token to match a **whole word**, so "hollow k" finds nothing there either and only the slug
question can answer `half a title is enough to find a game`. It flattens punctuation on both sides
for the same reason the ranking does — a raw substring test would never match "Hollow Knight:
Silksong" against "Hollow Knight Silksong", and the colon between them is the entire point. The
ranking spec was checked by disabling `Rank` and watching the fan game come back to the top.

One trap the suite caught: the stub's game-type filter used to anchor on `where game_type`, and
the slug query writes `& game_type`. Mods sailed through the second question while the first was
still filtering them.

## API

**Everything below `/api/auth` requires a session**, and answers **401** without one — see
**Auth**. The four sign-in routes are the exception, and are the only anonymous ones.

| Route | |
|---|---|
| `GET /api/auth/{provider}/start?returnUrl=` | 302 to Google or Discord. A navigation, not a fetch. A non-local `returnUrl` is a **400** |
| `GET /api/auth/{provider}/callback` | the handler's own `CallbackPath`. There is no action behind it |
| `GET /api/auth/me` | who is signed in, or **200 and a literal `null`**. Never 401 — see **Auth** |
| `POST /api/auth/logout` | ends the session. POST, so an `<img>` cannot sign you out |
| `GET /api/games?search=&limit=` | search IGDB, upsert, return |
| `GET /api/games/{id}` | one stored game plus its log entries |
| `POST /api/games/refresh` | re-fetch every IGDB title on the board. Maintenance; no UI |
| `POST /api/games/hltb/refresh` | queue the board for HowLongToBeat. **202 with a count of what was queued**, not of what changed. Maintenance; no UI |
| `PUT /api/games/{mediaId}/genre` | choose the genre that colours a card, or null for automatic |
| `PUT /api/games/{mediaId}/hltb` | pin the HowLongToBeat entry by hand, or null to take the pin back. The only correction the feature offers |
| `GET /api/log-entries?mediaId=&status=&page=&pageSize=` | the journal, newest first |
| `POST /api/log-entries` | record a pass through a title |
| `GET /api/log-entries/{id}` | |
| `PUT /api/log-entries/{id}` | full replacement |
| `DELETE /api/log-entries/{id}` | |
| `POST /api/log-entries/{entryId}/notes` | write a note against a pass — an append, never an overwrite |
| `GET PUT DELETE /api/notes/{id}` | a note id is enough on its own. Rewriting does not move its date |
| `GET /api/library?hobby=&status=&year=&sort=&page=&pageSize=` | your collection / one board column |
| `GET /api/library/years?hobby=` | years with any activity — started **or** finished — newest first |
| `POST /api/library/{mediaId}/status` | move a title to a board column — what a drag calls |
| `DELETE /api/library/{mediaId}` | take a title off the board — **every pass of yours**, which is what *Remove from board* calls |
| `PUT /api/library/order` | store one column's manual ranking |

**Search** queries IGDB, upserts every result into `media` + `games`, and returns them **in
IGDB's relevance order** (the database has no idea that ordering exists). It hits IGDB on every
call by design — the frontend debounces. Idempotent: running the same search twice must
not change `select count(*) from media`.

The upsert reads then writes, so two identical concurrent searches can race. The partial unique
index turns that into a `23505` rather than a duplicate row; `GameCatalogService` catches it,
clears the change tracker, and re-reads.

**Library is not the catalog.** Searching upserts every IGDB result, so `media` accumulates
everything ever typed into a search box. `/api/library` joins to `log_entries` and returns only
titles you actually recorded something about — one row per title regardless of replays, carrying
`currentStatus`, `entryCount` and `latestRating`. Do not "fix" it to list all of `media`.

**`latestNotePreview` is the one field on that row that does not come from the current pass.**
Everything else — the status, the rating, the count, the date — is `Latest`; this is the most
recent note across *every* pass of yours, so a replay begun this morning still shows what you
said the first time round. Two consequences, both load-bearing:

- **It carries its own `UserId` predicate.** Riding on `Latest` would have inherited
  `BoardQuery`'s scoping for free, but reaching every pass on a title reaches a *shared* title —
  without it a stranger's journal prints on your card. Notes have no user column, so it is a join,
  as every query in `NoteService` is. `UserScopingTests.Someone_elses_note_never_reaches_my_card`
  is the one that catches it.
- **It lives in the two terminal DTO projections and nowhere near `BoardQuery`** — `ListAsync` and
  `ItemAsync`, the licence the genre and HLTB downcasts already took. It matters more here: a
  terminal subquery that fails to translate throws and names itself, where the same thing in
  `BoardQuery` empties the board and says nothing. `ItemAsync` needs its own copy, or a move
  answers with a null note that populates on the next refetch.

It is cut to `LibraryService.NotePreviewLength` (200) on the wire, and the field says *preview*
because of it. A note may be 4000 characters and a board is four columns of a hundred rows. The
cap sits far enough out that what a reader sees cut is always the client's two-line clamp — which
is what lets the cut answer to the card's width and the density setting, as a character count
cannot.

**`currentStatus` is the most recent entry's status**, ordered `logged_at DESC, id DESC`: a pass
is current because it was recorded most recently, not because it happens to carry a date.
`?status=` filters on that, not on "has ever been" — a game completed in 2024 and being replayed
now appears under `InProgress` and must not also appear under `Completed`. EF turns the nested
`First()` into a LATERAL join, not N queries.

This used to read `started_at DESC NULLS LAST, id DESC`, on the reasoning that an entry saying
when it happened is better evidence than a later one that does not. **That was a bug**, and an
ordinary-path one: leaving Completed for Backlog or Dropped writes an entry with no dates by
rule, so it could never outrank the completion it replaced. The card sprang back to Completed
and every retry added another orphan entry. Only Completed → Playing escaped it, because that
rule stamps `started_at`. `logged_at` is server-stamped on every insert and `NOT NULL` with a
`now()` default, so it is always there to order by; `id` breaks ties, which is not a footnote —
fixtures on a stopped clock share one `logged_at`, so the tie-break carries the whole ordering
in the test suite.

**Three places order a title's entries** and all three must agree: `LibraryService.BoardQuery`,
`LibraryService.LatestEntryFor`, and `GameCatalogService.GetAsync`. The last one used to order by
`id DESC` alone, which meant the drawer could offer to edit one entry while the card reported
another. `LibraryEndpointTests.The_board_and_the_game_detail_agree_about_which_pass_is_current`
pins it so a future drift fails loudly.

**Updates are `PUT`, not `PATCH`**: a field absent from the body is *cleared*. That is the whole
reason for choosing PUT — PATCH cannot distinguish "clear the rating" from "leave it alone"
without an `Optional<T>` wrapper. `mediaId` is not replaceable; moving an entry to a different
title is a delete and a create.

**Validation returns 400, never 500.** Unknown `mediaId` is checked before insert (a raw
foreign-key violation would be a 500). `dateCompleted < dateStarted` is caught by
`IValidatableObject` before the check constraint can throw. Ratings must be 1.0–10.0 **with at
most one decimal place** — `numeric(3,1)` *rounds* 8.75 to 8.8 rather than rejecting it, so
accepting two places would mean the response reporting a rating the database does not hold.

List endpoints return `PagedResult<T>` — `{ items, total, page, pageSize }`. Search does not: it
returns a bare array of whatever IGDB ranked, capped by `limit`.

### Board semantics

`POST /api/library/{mediaId}/status` is what dragging a card calls. The caller names only a
target column; which entry gets touched and which dates get set is decided server-side, so no
client has to know which entry is current.

| Latest entry is | Target | Effect |
|---|---|---|
| not Completed | `Backlog` | edit in place; **clear both timestamps** |
| not Completed | `InProgress` | edit in place; set `started_at` = now *only if null*; clear `completed_at` |
| not Completed | `Completed` | edit in place; set `completed_at` = now |
| not Completed | `Dropped` | edit in place; **leave timestamps alone** |
| **Completed** | anything else | **insert a new entry** at the top of the target column |
| same as target | — | no-op |

**Leaving `Completed` inserts rather than edits.** Replaying a game finished in 2024 must not
overwrite that completion — preserving it is the entire reason the schema allows several entries
per title, and editing in place would destroy the record silently, on a gesture as casual as a
drag. `StatusTransitionTests` covers every row above; do not "simplify" this into a plain update.

`InProgress` sets `started_at` only when null, so picking a dropped game back up keeps the moment
you actually started it. Every timestamp is an instant, stamped from `IJournalClock.Now`; which
calendar day that turns out to be is a question only the reader asks. See **Time**.


**A card's corner is an `⋯` menu, and it offers the same things from every column.** *Open
journal*, then a rule, then three moves — the columns this card is not in — then a rule, then
*Remove from board*. The journal item is a second door to the drawer the title already opens,
and worth having because the title is the one gesture on a card that shares its surface with the
drag. It is called *Open journal* rather than a noun for the thing so that every other hobby
gets this menu unmodified. `board/columns.ts` is
the one list of the four columns and their labels, and `otherColumns` is what a card asks for its
three; never its own, because `TransitionAsync` treats a move to the status a title already has
as a silent no-op.

**It replaced a `×`, and that is a reversal worth understanding rather than undoing.** The `×`
meant *drop* on a Playing card and *remove* on a Backlog one, and was absent on Completed and
Dropped — the reasoning being that Dropped is a record of a game you started and gave up on, so
it is the wrong ending for one you never began, and that finishing something cannot be given up
on. All of that is still true about the *endings*; what was wrong was letting the column choose
which ending you got, and leaving half the board with no control at all. Both are offered
everywhere now, and dropping is still not removing.

The menu exists because dragging is the only other way to move a card, and dragging from the
bottom of a forty-title Backlog to Completed is a scroll and a hold. **It is offered in every
sort mode**, unlike the drag: a menu move writes no ranking, so there is none for it to promise.

**Remove from board takes every pass of yours, not the current one**, and that is a change rather
than a restatement. Deleting only the newest was defensible on paper and wrong in the hand: a
title replayed five times was five presses from leaving the board, and each press looked like a
failure because the card came straight back in whichever column the pass underneath sat in.
`DELETE /api/library/{mediaId}` replaced `DELETE /api/library/{mediaId}/current` for it.

**Deleting one pass is still possible and is the drawer's**, through `DELETE /api/log-entries/
{id}`, where the pass is named and its dates are on screen. A board card is one row per title and
has no vocabulary for which pass you meant — which is the whole reason the two live apart now.

It reaches a completion, which the `×` never could. Not a new capability, since the drawer has
always deleted any pass including a finished one, but a shorter road to it — which is why the
confirm stayed, and why it counts what is going: "off your board" alone reads like a card is
being lost rather than three records.

`DELETE /api/library/{mediaId}/current` deletes the current pass and only that one, which covers
both endings with a single rule: a title whose only pass that was leaves the board, because the
library is titles you have logged something against; a title carrying a 2024 completion
underneath goes back to showing it. Nothing checks whether it was the last pass — `BoardQuery`
already filters on `LogEntries.Any()`, so that falls out. A new endpoint rather than reusing the
log-entry delete because a board row holds no entry id, and one read from a card rendered a
moment ago can already name a pass that stopped being current; the server re-reads.

It confirms inline on the card, because a delete is not one drag from undone. Choosing *Remove
from board* closes the menu and opens that confirm, so the question is not put behind the thing
that asked it. **Which card is asking is held by `BoardPage`, not the card** — refetches remount
cards, the same fact that makes focus go back to the drawer's opener by id — and holding it above
the board also means only one card can be asking at a time, as the drawer's deletes already work.

**Which card has its menu open is held there too, for that reason exactly**, and one open menu at
a time falls out of it. Three more things about the menu, each of which had to be different from
`SettingsMenu`, the only other menu in the app:

- **Escape is handled on the menu container, not on `document`.** The drawer already listens
  there, and `BoardSearch` records why a second listener for one key is how two of them start
  disagreeing. Bubbling reaches the container from the corner and from every item, which is
  everywhere focus can be while it is open. Focus goes back to the corner **by id** —
  `cardMenuId`, beside `cardTitleId` and for its reason.
- **Outside-click is still a `document` `pointerdown` listener**, because there is no other way
  to hear a press elsewhere, and unlike Escape there is no second listener to disagree with. It
  doubles as what closes the menu when a drag starts on another card.
- **The open card takes `relative z-10`.** `@container` on `CARD_CLASS` implies `contain: layout`,
  which makes every card a stacking context — so the panel was *painted under* the card below it,
  and under another column's cards at two-across widths. Nothing clips it: no column or card sets
  `overflow`. `z-10` leaves the drawer's `z-20` and the settings menu's `z-30` above it.

**`aria-disabled` is dropped from the card**, and this is the second half of the `role="listitem"`
override below it. dnd-kit stamps it when the sortable is off, which is true and is not what the
attribute claims on a list item — both screen readers and Playwright read it as disabling every
control *inside* the card, which outside manual sort is the title and the options corner. The e2e
spec that used to assert it as a stand-in for "dragging is not on offer" now attempts the drag,
which is what it was claiming all along.

**The panel is a `role="group"` of buttons, not a `role="menu"`.** That role promises arrow-key
roving focus, and taking it without the keyboard contract is worse than a set of buttons that
behaves as it announces. The title is on the group's label and **never on an item**: the e2e
`card()` locator filters on a card's own text, so an item carrying a title would make it match
any card whose menu mentioned another card's game.

***Remove from board* wears a translucent danger fill, not danger text.** `bg-danger/10` at rest,
`bg-danger/25` under the cursor, and the label stays `--fg` at both. Red *text* was the first
attempt and is the mistake written down twice already: Ember's `--danger` (`#ff8e7a`) is one hue
from its `--accent` (`#f2545b`), so a red word there reads as the emphasised item rather than the
dangerous one. A fill is a shape the accent never wears — the rule the danger chip already
follows — and deepening it under the cursor makes the thing that destroys something the thing
that reddens as you reach for it. The label keeps `--fg` because that pairing is proven on every
surface and a tint this light moves the ground too little to spend it.

**A card's surface carries two gestures, and the 8px activation distance is the whole of what
tells them apart.** `useBoardSensors` in `board/sensors.ts` is the one place that decides it:
under the distance the drag never begins and the click lands on whatever button was pressed;
over it dnd-kit adds a capture-phase `click` listener of its own, so the press that moved a card
cannot also open its drawer. Nothing else is needed, and the title button therefore does **not**
stop the pointer — it is most of the card's surface, and swallowing the press there left the drag
only the margins to start from. The options corner does stop it, and that difference is the
point: twenty pixels in the corner is a button and nothing else, where a hand that wobbles past
the threshold would drag the card rather than open its menu. The open panel stops the pointer as
well, so a press on an item is never the start of a drag. Nothing is needed for the keyboard:
dnd-kit's keyboard sensor refuses to activate from a nested element, so Space and Enter on the
corner and on the items are already safe.

**The test harness mounts cards under those same sensors**, which is why they are a module rather
than a few lines inside `useBoard`. A bare `DndContext` takes dnd-kit's defaults, and those carry
no activation constraint — every press activates a drag from the first pixel and the click that
follows is swallowed. The moment the title stopped eating its own press, that made the journal
look unopenable in jsdom while working perfectly in a browser.

### The board is one year at a time

One `Year` control above the board, and it **opens on the latest year there is** rather than on
all of them. A board is a record of a year, the year you are in is the one you are adding to, and
a board that opened on everything would be a wall of history for anybody who logs more than one
year of it. *All years* is still there and is one choice away.

It replaced a picker that sat in the Completed column's header and narrowed that column alone.
That was right while `completed_at` was the only date the year meant, and stopped being right the
moment the point was to read a past year rather than to filter one column of it. **A control
living inside one column while narrowing three would be claiming to be about that column.**

**The year means a different date per column, and it has to.** One predicate for all four was the
obvious version and is unusable: Backlog and InProgress have their completion cleared by the very
rules that put a title in them, so `completed_at` board-wide leaves three columns permanently
empty and reads as a broken filter rather than a strict one.

| Column | Answers with |
|---|---|
| Backlog | **Nothing — it is exempt.** Both timestamps are cleared by the rule that puts a title there, so it belongs to no year; and it is what you drag out of while reading a past one |
| Playing | `started_at`. The transition into this column clears `completed_at`, so a start is the only date it has |
| Completed | `completed_at`, pointedly **not** `started_at`. A game begun in 2019 and finished in 2021 is a 2021 completion |
| Dropped | **Either.** Dropping leaves the timestamps alone on purpose, so an abandoned title carries a start, a completion from an earlier pass, or neither |
| *no column named* | Either, for Dropped's reason: with no column named there is no one date to prefer, and "active in that year" is the only reading that does not quietly privilege one of the four |

`LibraryService.InYear` holds the server's half and `yearFor` in `frontend/src/board/keys.ts`
holds the client's, which is only the Backlog exemption — the column asks for a year or it does
not, and the server decides what one means. Both halves are named in each other's comments,
because a column filtering on a date the client did not expect is invisible rather than loud.

**`GET /api/library/years` answers with any activity now, not completions.** It had to move with
the filter: a year you began something in and finished nothing in is a year the Playing column
handles perfectly well, and while the list was completions alone the picker had no way to ask for
it. Both dates, off the same projection the columns filter on, so the picker can never offer a
year that is empty in every column at once.

**A move invalidates the years as well as the two columns**, and that is easy to miss. A
transition stamps `started_at` or `completed_at`, so a drag is one of only two things that can
bring a year into existence — and the column keys cannot cover it, because `'years'` is not a
status and no prefix of theirs reaches it. Without that line the first title finished in a new
year vanishes from the board it was on and the year that would show it is not offered until a
reload. `yearsKey` is in `keys.ts` with the others for exactly the reason they are.

**The board renders nothing until the years arrive.** That is deliberate rather than a missing
loading state: it opens on the latest year, so painting before they are known is a board showing
every year — briefly, and then not — with four columns refetched on the way to the one it was
always going to be. `YearPicker` held this same rule for this same reason while it owned the
query, and it is now presentational, because the page has to hold that query to have anything to
default to and two components reasoning about one loading state is how they start disagreeing.

**One consequence worth knowing rather than fixing.** Completing a game while reading a past year
makes its card leave the board — the completion is stamped *now*, so it belongs to this year, not
the one on screen. That is the filter being honest, and it was already true of the Completed
column's own picker; it is only more visible now that the year governs the whole board.

**Manual ranking** lives in `log_entries.position`, ordered `position ASC, id DESC`. New entries
take `min(position) - 1` for their column (`BoardPositions.TopOfColumnAsync`) so a title just
added appears on top and nothing gets renumbered. `PUT /api/library/order` takes the whole column
top-first rather than a move-and-index: idempotent, no off-by-one arithmetic, and ids that have
since left the column are ignored rather than rejected, because a loaded board can legitimately
be one drag out of date.

**Sorting never writes.** `sort` ∈ `manual` (default) · `added` · `title` · `rating` · `hours`
are read-only views that leave `position` untouched — which is what lets the UI enable dragging
only in manual mode and still guarantee the ranking survives a look at the alphabetical order.

`sort=hours` is HowLongToBeat's **headline figure** — `hltb_all_styles_hours` — shortest first,
with titles that have no estimate last, the same treatment an unrated title gets under
`sort=rating` rather than sorting as though nobody having timed a game meant it took no time.

**It is the same field the card prints, and the two have to keep moving together.** Both were
main story first; a column ordered shortest-first on a number none of its cards show reads as
broken, whichever number is the better one. It is **not** `log_entries.hours_played`, which is how
long you took on one pass; that is a fact about a playthrough where this is a property of the
title. The UI calls it **Time to beat**, named for the question rather than the column, because
"Hours" alone reads as the hours you have put in.

Its TPT downcast lives **inside that one switch arm** in `LibraryService.Sorted`, never on
`BoardRow` in `BoardQuery`. `BoardQuery` is what every `Where` and `OrderBy` is pushed through, so
a downcast that failed to translate there would empty the whole board; confined to one arm the
worst case is that one mode breaks. `LibraryOrderingTests` asserts the column comes back
**non-empty**, because emptiness is the symptom.

### Traps, all of which have bitten already

- **Project board rows with member-init, not a constructor.** EF Core can decompose
  `new BoardRow { A = ..., B = ... }` and push later `Where`/`OrderBy` into SQL; a positional
  record is opaque to it and every filter on the projected latest entry fails to translate.
  It surfaces as an *empty library*, not an obvious error. See `LibraryService.BoardQuery`.
- **`LibraryService.BoardQuery` and `LatestEntryFor` must order identically.** If they drift,
  the board moves one entry and then displays a different one.
- Validation attributes go on record **primary-constructor parameters**, not `[property:]`
  targets. MVC throws `InvalidOperationException` rather than skipping them.
- `LogStatus` needs `JsonStringEnumConverter` (registered in `Program.cs`) to travel as
  `"Completed"` rather than `2`.
- Timestamps have their own set, in **Time** above: Npgsql accepts only offset-0 `DateTimeOffset`
  values, `System.Text.Json` reads a bare date as UTC, and `date_part` on a `timestamptz` follows
  the session's timezone. All three fail quietly or as a 500 rather than as anything informative.

## Journalling

The board moves a title between columns; the drawer is where you say anything *about* it. Click a
card's title and it slides in over the board — rating, platform and the two dates, a list of dated
notes, and every earlier pass with its own notes below it.

It exists because the journal was finished as an API and unreachable as an app: log-entry CRUD
was built and tested, and the only thing the frontend ever called was `addToBacklog`. The card
had rendered a rating behind a star since the board shipped, and nothing could set one.

**Loaded with `getGame`**, which answers with the game and every entry in one request — the shape
it was built for. `logEntries[0]` *is* the pass the board is showing, because the endpoint now
shares the board's ordering; the drawer does not re-derive it.

Decisions worth not re-litigating:

- **No status control.** Dragging is the gesture that changes a column, and the rules about which
  entry that touches and which timestamps it stamps live on the server. A second way in would
  need its own copy of all of it.
- **An earlier pass's *fields* are read-only; its *notes* are not, and the pass itself can be
  deleted.** A finished playthrough is a record of something that happened, the schema goes to
  real trouble to keep it, and an editable date here would undo that with a keystroke. The two
  exceptions are deliberate and different: a note is yours to fix, because a journal with a typo
  frozen into it helps nobody; and a pass that never happened — the ×2 a mistaken drag to
  Completed and back leaves behind — is not a record worth keeping. Correcting a *field* on a
  finished pass is still a psql job.
- **Deleting confirms inline**, a Delete that becomes "Really delete?" beside a Cancel. Not
  `window.confirm`, which cannot be worded past the browser's own phrasing, cannot be styled, and
  has to be stubbed in every test that walks past it. Each button in the history names the pass it
  would take, because they all otherwise say the same word.
- **Deleting the last pass takes the title off the board**, and says so before it happens. The
  library is titles you have logged something against, so the card goes with the pass; the drawer
  closes rather than being left describing nothing.
- **It is a real dialog** — `role="dialog"`, `aria-modal`, named through `aria-labelledby`, closed
  by the backdrop or Escape, focus moved in on open and back to the card's title button on close.
  Tab is contained on purpose: `aria-modal` already tells a screen reader the board behind is
  inert, and letting the keyboard walk out onto it would make that promise false for anyone who
  reads by tabbing. Focus goes back **by id, not by a stored element** — refetches remount the
  card while the drawer is open, so the node captured at open time is usually detached. See
  `cardTitleId` in `src/board/Card.tsx`.
- **The platform select offers the game's own list**, from `GameDetail.platforms` — already
  loaded, no second request — plus a blank "Not recorded". A stored value that list no longer
  mentions stays in it and stays selected. See the schema note on `log_entries.platform`.
- **The rating is a slider plus a number box**, `step="0.1"` over 1.0–10.0. Stars were the
  obvious alternative and reach nineteen values, which would quietly retire the decimal place
  `numeric(3,1)` exists for. Two pieces of state for one value, in `EntryForm`: `rating` is the
  value, still text so the 8.75 rule applies to what was typed; `thumb` is only where the handle
  sits and **moves only when the text parses**, because typing 8.75 passes through `"8."` and
  `"8.75"`, both refused, and a handle derived from the text would be thrown to the far left on
  each of them on the way past. A range input has no empty state, so "not rated" is said out
  loud — blank box, dimmed track, `aria-valuetext`, and a Clear button that is absent when there
  is nothing to clear. The slider carries the field's label; the box is **"Exact rating"**,
  because two controls on one value need two names. Native rather than `appearance-none`, which
  removes the thumb and leaves nothing to grab, and `color-scheme: light dark` on `:root` so the
  track follows the theme everything else already follows.
- **Hours played sits beside all three of HowLongToBeat's estimates**, one `<span>` each rather
  than one assembled string — they wrap independently on a narrow drawer, and a test can name the
  tier it means. `hltbTiers` in `src/journal/fields.ts` drops the tiers nobody has submitted a
  time for rather than printing a dash beside them, because a game with a main-story time and no
  completionist time is ordinary rather than a broken row. That also gives the drawer one
  condition instead of three: an empty list is the whole of *never matched*, which is what keeps
  *No HowLongToBeat estimate yet* honest now that there are three ways to have nothing. It takes
  the game rather than three loose numbers, since three nullable numbers in a row is exactly the
  argument list where two get swapped in silence.
- **The difference is measured against the headline figure alone.** Four deltas is arithmetic
  rather than a reading, and this is what the card and the *Time to beat* sort both mean by "how
  long does this take" — it followed them here from Main Story and should keep following them. It
  is the better comparison on its own terms too: a completionist run held up against main story
  reads as wildly over, when it is only over for a tier it was never doing. `parseHours` mirrors
  `PlaytimeHoursAttribute` on the text rather than the float, one decimal place further out than the rating for the same reason; the 999.99 ceiling is
  a different failure, since overflowing `numeric(5,2)` throws rather than rounding.
- **The estimate on a card is written `~42 h`** and announced as *About 42 hours to finish*. The
  tilde is doing real work: the drawer prints `31.5 h` for what a pass took *you*, so an unmarked
  number on a card for a game you have not started would read as the same kind of claim. The
  headline figure only — a card has room for a number, not a table — and it is what the site
  itself leads with, where main story would be one tier chosen out of four by us. `formatHours` lives in `src/lib/hours.ts`
  rather than `journal/fields.ts` so that `board/` need not reach into `journal/` to format one.
- **The genre select is in the header, not the form.** Genre belongs to the title and the form
  submits one `PUT` to the log-entry endpoint, so putting it there would mean writing to two.
  It saves on change. Its blank option names the automatic pick rather than saying "Not
  recorded", because null means *use that one*. Labelled through `htmlFor`/`id` like every other
  field — a wrapping `<label>` makes the select's accessible name absorb its own option text,
  which made `getByLabel('Platform')` match two controls.
- **The HowLongToBeat id sits in the header too**, for the genre select's reason exactly: it
  belongs to the title, not to a pass. It is the feature's only correction, and the *View on
  HowLongToBeat* link beside it is how you check the numbers belong to the game you meant — which
  is why no column stores the matched title. It does **not** save on change the way the genre
  select does; see **The pin control** under **HowLongToBeat**.
- **A save says "Saved", and the flag cannot live in the form.** `EntryForm` is keyed on
  `entrySeed`, so a save that changed anything remounts it — a flag set on success is destroyed
  by the very refetch that confirms it, which is why the button appeared to snap straight back to
  *Save* with nothing to show for it. `saved` is held in `EntryDrawer`, above the key. Not read
  off `save.isSuccess` either: that stays true until the next write, where this has to stop being
  true the moment a field is touched. The test for it was checked by moving the flag into the form
  and watching it go red.
- **It is not on a timer**, and that is the whole design. It claims "what you are looking at is
  what the server has", which stops being true on the next edit rather than a few seconds after
  the write — so it is cleared by `onEdit` and is never a stale promise about a form that has
  changed since. The transition a fade would have given comes free from the button, which reads
  *Saving…* in between and takes the message away while it does. `role="status"` so it is
  announced: a confirmation only sighted readers get is half a confirmation, and this drawer is a
  real dialog for that reason. One `onChange` on the `<form>` catches every field, because React's
  synthetic events propagate through the tree — the notes box is outside the form and its own
  write, so it rightly does not reach it.
- **Its Playwright spec scopes `role="status"` to the dialog, and has to.** dnd-kit mounts a live
  region of its own to announce a drag, so the board behind the drawer carries a second
  `role="status"` — empty except mid-drag, and enough to fail a bare `getByRole('status')` as a
  strict-mode violation. The Vitest suite cannot show you that: it mounts the drawer without the
  board's `DndContext` around it, so the locator resolves uniquely there and the spec was green
  in jsdom and red in a browser. Same shape as `commit()` under **The pin control** — the unit
  suite and the browser disagree, and the browser is the one that is right.
- **The form submits every field, every time.** `PUT` means an absent field is *cleared* — that
  is the whole reason it is PUT — so sending only what changed would wipe the rating whenever
  somebody corrected a date. Notes are outside it — each is its own row and its own write,
  so this form cannot clear them and does not try. `pick()` in `src/api/logEntries.ts` drops
  `undefined` but keeps `null`, which is what makes "cleared" expressible at all.
- **Each pass is a labelled region**, which is how `Column` already solves several
  identically-named controls on one screen, and what lets a test or a screen reader say *which*
  pass it means. The compose box is open on the pass you are on and a click behind "Add a note" on
  one that is over — notes can be added to any pass, including a finished one, but a write box on
  every row of the history would drown it.
- **A note's controls name it by its timestamp**, for the same reason a pass's delete names the
  pass: several rows carrying the same two words is nothing to a reader who cannot see them.
- **Notes carry the time of day**, through `formatJournalDateTime` — built and tested since the
  timezone work and called by nothing until now. "Beat it at 9:30 PM" is the entry worth reading
  back; the date alone is a filing label.
- **Writing a note invalidates the library as well as `gameKey(mediaId)`**, and it did not used
  to. The old rule was that nothing a note does shows on a card — no rating, no count of passes,
  no date — which was true right up until a card started carrying the last thing you wrote about
  a title. All three of `useNotes`' mutations move something on the board now. The bare
  `['library']` prefix rather than one hobby's, because that hook has no hobby: it is opened from
  a card and knows only a media id.
- **The form is keyed on the values it was seeded from**, not on the entry's id — `entrySeed` in
  `src/journal/fields.ts`. `useState` reads its initial value once, and a transition *edits the
  current entry in place* rather than adding one, so the id holds still while the values change
  underneath. Keying on the id alone left a game just dragged to Playing showing an empty Started
  even after the refetch had landed. The cost is that a refetch arriving mid-edit discards what
  was typed; it can only arrive after a save of your own or after a drag, and the drawer covers
  the board while it is open.
- **An untouched date goes back as the instant it arrived as.** The input shows a day, the column
  holds a moment. Re-deriving the value from the day on screen would move a 21:30 start to
  midnight — silent loss on a save the user made about something else. Only an edited field is
  sent as a bare date, which the server reads as that wall-clock moment here. `dateFieldValue` in
  `src/journal/fields.ts`.
- **The rating is validated on the input text, not the parsed number.** `8.75 * 10` is not
  exactly `87.5` in binary floating point, so counting decimal places arithmetically is a way to
  accept the one value the rule exists to reject. Mirrors `RatingAttribute` word for word.
- **`noValidate` on the form.** `step="0.1"` stays for the spinner and the mobile keypad, but
  native validation silently refuses to submit an 8.75 and shows a bubble that cannot be worded,
  styled or tested — and *why* two decimal places are refused is the part worth saying.

`ApiError.fieldErrors` is populated at last. The third constructor argument had been there from
the start and nothing ever passed it, so it was always `{}` — invisible, because the message is
assembled from the same errors. The form is the first caller that wants them per-field.

## Genres and colour

Cards carry a colour bar down their left edge, from IGDB's genres. `frontend/src/board/genres.ts`
is **one ordered list doing both jobs**: the order decides which genre a game is painted as — the
first entry it has wins — and each entry carries its own colour, so adding a genre is one line
there and one token in `index.css`.

**The ordering lives on the client on purpose.** A priority list on the server plus a palette here
would be two orderings that must agree, which is the failure this codebase has already paid for
once over which pass the board calls current. Here they are the same array.

Ordered **specific before generic**, and deliberately short. `Indie`, `Arcade` and most of IGDB's
twenty-odd are absent because they say almost nothing about what an evening with the game is
like. Ten hues is already past what anyone with common colour-vision deficiency can separate,
which is why **the card prints the genre's name as well as painting it** and why the stripe is
`aria-hidden`. Match on the trimmed, lower-cased name, so IGDB renaming a parenthetical does not
silently unpaint a genre.

- **The stripe is a child of `CardFace`, not a class on `CARD_CLASS`.** `CardFace` is what the
  drag preview wears, so a child reaches it free; a class on the box would need applying at two
  call sites.
- **It always renders, `bg-transparent` when there is nothing to paint.** A stripe that vanished
  would shift an ungenred card's contents left of its neighbours' and make a mixed column ragged.
- **Every colour sits in `L ∈ [0.48, 0.75]`**, the band that stays visible against both
  `bg-white` and `dark:bg-neutral-900` — which is why none of them needs a `dark:` counterpart.
  Lightness varies as well as hue, as a second axis of separation.
- **Whole literal class names.** Tailwind v4 scans source text; `` `bg-genre-${x}` `` generates
  nothing and the stripe silently renders transparent.
- A chosen genre the palette does not paint still shows its **name**, with no colour. That is one
  line away from being painted if it keeps happening.

**`POST /api/games/refresh` is the backfill**, and it has no UI — a maintenance action of the
same tier as fixing a bad `hltb_id` in psql:

```bash
curl -X POST http://localhost:5201/api/games/refresh
```

`media` rows are only ever written by a search, so a column added to the schema stays empty on
the library you already have until something goes and asks. It re-fetches every IGDB-sourced
title **in the library** — not the catalog, which accumulates every result of every search ever
typed — through `IIgdbClient.GetGamesAsync`, a `where id = (…)` clause rather than a search,
batched at 500. It runs straight back through the same upsert a search uses, so a refreshed row
and a searched one are written by the same code, including its care about the columns IGDB does
not own. A title IGDB no longer returns is simply absent from the results and keeps what was last
known.

**HowLongToBeat's backfill does *not* ride this rail, though it was expected to.** This one is
synchronous and reports what it changed, because IGDB answers 500 titles in one request. HLTB
answers one at a time behind a politeness floor of seconds, so its backfill queues instead and
answers 202 with a count of what was queued — a different shape, a different route, and a
different result type on purpose. See **HowLongToBeat**.

**Two traps this cost time to find.** EF scaffolds a `NOT NULL text[]` with no default, and
Postgres refuses that on a table with rows in it — `23502`, proven against the real database
before `defaultValueSql: "'{}'"` went in. And the board row reaches genres through a **TPT
downcast added to the two terminal DTO projections only**; `BoardQuery` is untouched, because
that projection is what every `Where` and `OrderBy` on `Latest` is pushed through and when it
stops translating the symptom is an *empty library* rather than an error.

## The redesign

Built on `design-tokens`. The board wears a real design now: **Shelf** — borderless cards
lifting on a shadow, a warm ground, columns as tinted wells — in **Public Sans**, with four
themes and two densities behind one menu in the header.

Decided with the user, **settled — do not reopen**:

| | |
|---|---|
| Look | **Shelf**, chosen from a rendered mockup rather than a description |
| Type | **Public Sans**, self-hosted through `@fontsource-variable` |
| Themes | **Four + System**: Shelf Light, Shelf Dark, Console, Ember |
| Red | **Ember's alone.** Not forced into the others |
| Accent | **A per-theme token.** There is no brand colour |
| Rating | **Coloured by what it says** — under 6 red, 6–8 orange, 8 and over yellow |
| Danger | **Never colour alone** — a filled chip the accent never wears |
| Density | Comfortable / Compact, a setting rather than a decision |
| Journal | **Drawer or modal**, also a setting. Same dialog either way |
| Width | The board stops widening at 2000px and puts the pixels into the cards |
| Columns | **Two across from 768px, four from 1280px.** Four at 768 left each one 168px |
| Card size | **From its column, not the window** — the cover and the title are sized in `cqi` |
| Nav | **A tab row under the header.** Games live, the other five dim and marked *Soon* |
| Search | **A bar above the board**, results as a strip, present only once you have typed |

The user's own words on red, which is the principle the whole theme layer is shaped around:

> Red doesn't have to be on everything, I would rather have one theme that I like personally
> while the other themes are well fit together, rather than forcing red to work with it.

Ember is that theme, and its surfaces are **neutral charcoal rather than red-tinted**. Tinting
them was mocked up and rejected by eye: a red ground shifts the ten genre hues against it, and
those mean something. So red appears where the app is speaking — links, focus, the current
choice — and never behind text or beneath a cover.

Its accent is `#f2545b`, a true red — it began as a vermilion and read as orange. **On Ember's
near-black surface a red has to sit fairly light to clear 4.5:1 at all**: `#ef4444` lands at
4.58 and `#e5484d` at 4.38, so the deeper, more saturated reds are simply not available here.
That is a fact about the ground rather than a preference, and the contrast test is what says so.

**The genre palette is settled**, repainted by the user against a live board. The set it
replaced had three pairs under 0.10 apart in OKLab — Platform/Puzzle, Fighting/Racing and
Simulator/Puzzle — which at a 4px stripe is the same colour twice. Measure before changing one:
the arithmetic is written down beside the values in `index.css`, and the pair a person notices
is rarely the closest pair. The floor is Strategy against Adventure at 0.087, known and accepted.

### How a theme works

`src/index.css` is **the only file in the app that names a colour**. Each theme is one block of
custom properties; `@theme inline` turns each into a utility. The `inline` is the mechanism and
not a detail: without it a utility resolves to whatever the variable held at build time, so no
attribute could change it at runtime.

No component knows a colour, so **adding a theme is a block of values and a line in
`src/theme/theme.ts`** — there is no provider, and a component test still renders without a
wrapper.

- **`system` stores no attribute**, rather than the string `"system"`. A literal there would
  match no palette block *and* would stop `:root:not([data-theme])` matching, so the OS
  preference would be ignored twice over.
- **`color-scheme` is per theme, not once on `:root`.** It is the only thing that themes a range
  input's track, and the rating slider is a range input — a dark theme under a light OS would
  otherwise put a light track on a dark drawer, visible only inside the drawer.
- **Genre colours are content, not chrome**, and stay in a plain `@theme`. They say which genre a
  game is, so they mean the same thing whatever the app is wearing. The `bg-genre-*` class names
  are load-bearing: `Card.test.tsx` asserts on them and it is the only styling assertion in the
  suite.
- **The five `--color-brand-*` values sit in that same plain block**, on that same argument:
  Google's blue means Google in every theme. They are the sign-in marks and nothing else, they
  are invisible to `index.css.test.ts` (which enumerates the palette blocks, and that block has
  no `--surface`), and they are what keeps this file the only one in the app naming a colour.
  Note the constraint on the names: `index.css.test.ts` reads tokens with `/^\s*(--[a-z-]+):/`,
  so a token containing a **digit** is silently skipped rather than reported.
- **Whether a card has a border is a token too.** Shadow does almost nothing against Console's
  deep ground, so Console keeps an outline and the warm themes and Ember do not. That would
  otherwise have needed a component to know which theme it was in.
- **The journal's drawer/modal setting is a `@custom-variant`, not a second component.** Both are
  one dialog with one focus trap; only the box changes, so `modal:` utilities on the panel do the
  whole of it. Putting it on the root attribute rather than in React state is also what lets the
  menu change it without shared state — `useTheme` holds its state locally, so two callers of it
  would not have heard each other.
- **Rating tones are whole class names.** `ratingTone` in `src/lib/rating.ts` returns
  `text-rating-low` and its siblings in full, never an interpolated `text-rating-${tone}` —
  Tailwind scans the source as text and an interpolated name generates nothing at all.
- **Light themes cannot have a yellow.** Nothing yellow enough to be called that clears 4.5:1 on
  near-white, so Shelf Light's high band is a dark gold. The ramp still reads red → orange →
  gold, which is what the bands are for.
- **An unrecognised stored value falls back** instead of being trusted. Storage outlives the code
  that wrote it, so a theme dropped later would leave the root stamped with a value nothing
  answers — unstyled text on an unstyled ground, the least diagnosable failure available.

### The three things that fail quietly, and what holds them

Each of these is invisible in development and each has a test that was checked by breaking it.

- **The pre-paint script in `index.html`.** It stamps the attributes before the bundle loads, or
  the page renders in the default palette and swaps — the flash every themed app gets wrong once,
  and invisible locally where the bundle is warm. It cannot import `theme.ts`, so it repeats the
  keys as literals, and `theme.test.ts` reads the file and asserts the copies still match. It is
  also the *only* thing that applies a stored preference: `useTheme` deliberately does not, so a
  broken script is a failing test rather than a flash. `e2e/theme.spec.ts` blocks the module and
  asserts the attribute is stamped anyway; delete the script and three specs go red.
- **`system` and Shelf Dark say the same thing twice**, because CSS cannot alias a media query to
  a selector. `index.css.test.ts` compares the two blocks declaration by declaration.
- **Contrast.** `index.css.test.ts` checks `fg`, `muted`, `accent`, `rating` and `danger` against
  every ground they sit on across all five palette blocks, plus the chip's label against its own
  fill — forty assertions. It exists because the same mistake happened twice: `text-neutral-500`
  sat at **3.8:1** on the dark theme for the life of the board, and then `--danger-fg` was set
  near-white on every theme, which is right where the fill is a deep red and **2.07:1** where the
  fill is a light salmon. The fill and its ink move in opposite directions per theme.

### Two things worth knowing before touching it

- **`localStorage` is not in the test globals by default.** jsdom implements it, but Node 22+
  declares the name itself and the environment will not overwrite a global that already exists —
  so it is present and answers to nothing. `src/test/setup.ts` supplies one, and the condition
  asks whether the thing can *store* rather than whether it is `undefined`, which was the bug in
  the first attempt at that same check.
- **Screenshots are how a visual claim gets checked.** A throwaway spec under `e2e/` that seeds a
  board, switches theme and writes PNGs is worth writing again whenever this area changes — it is
  what caught the unreadable chip. Do not commit it.

### The board at every width

Between 768px and 1600px the cards were squished and the cover art read as a thin sliver. That
was **two defects stacked, and each hid the other**.

**The cover was being stretched, not merely drawn small.** `CARD_CLASS` is a flex row with no
`items-*`, so the default `align-items: stretch` took the cover's height — an `aspect-ratio` only
decides a height when the height is free, and stretch takes it — and `object-cover` then cropped a
vertical strip out of a portrait. The narrower the column, the more the title wrapped, the taller
the card, the thinner the cover. Measured at 768px it was **40×95 for a box asking to be 5:7**.
`items-start` is the whole fix. The genre stripe is unaffected because it asks for the full height
itself with `self-stretch`.

**And the size ladder had no rung where one was needed.** `--cover` stepped up at 1280 and 1920
only, so everything from a phone to a 1279px laptop shared one 40px value — while four columns
started at 768, which left each one 168px. After the well, the card, the stripe and the cover that
is about **32px of title**, so every name became a stack of broken words.

So the board turns four columns across at **1280** rather than 768, two before that, and the cover
and the title size themselves in **`cqi` against the card**. Cover widths across 640–1920 went
from a flat 40/48 to 80/72/80/80/58/67/75/80, and every ratio measures 1.40.

- **`@container` is on `CARD_CLASS`, not on `Column`.** That class is what the drag preview wears,
  and the preview renders outside every column — a container on the column would shrink a card at
  the moment it was picked up. Same reasoning that puts the genre stripe inside `CardFace`.
- **`--card-pad` and `--card-gap` deliberately did not join them.** Container query units resolve
  against the nearest *ancestor* container, never the element's own, so a `cqi` in the card's own
  padding would quietly measure the viewport — and it would be circular even if it worked, since
  `cqi` reads the content box and the padding is what decides it. `--card-gap` is applied by the
  column, outside every card, so it has no card container in scope either. Those two keep the
  width ladder; the media queries at 1280 and 1920 are all that is left of it.
- **The e2e suite had no viewport.** It was inheriting Chromium's 1280×720, which is exactly the
  new four-column breakpoint and one scrollbar pixel from laying the board out as two. Pinned at
  1440×900 in `playwright.config.ts`; `e2e/layout.spec.ts` overrides it per describe block.
- **`e2e/layout.spec.ts` is the only layer that can check any of this.** jsdom has no box model,
  so a height read there is whatever the stylesheet last said. The cover carries a `data-cover`
  hook because an `<img alt="">` has no role — the same reason `data-genre-stripe` exists. The
  stub omits covers on purpose, so what the spec measures is the placeholder, which wears the same
  classes and had the same bug.

The one thing left alone: at around 1280 the **Completed column's header wraps** its year picker
and sort select onto a second line, so its cards start lower than its neighbours'. It is
pre-existing, it clears by 1440, and it wraps as a tidy right-aligned pair. Truncating the control
labels to avoid it would cost more than it saves.

### Search on the board

Search used to be its own screen, so adding a game was a round trip away from the thing you were
adding it to. `BoardSearch` is a bar above the board now, and results arrive as a **horizontal
strip** over it, so the column a title will land in is on screen while you decide.

- **The strip is only there when there is something to show.** An idle box is a bar and nothing
  else, so the board keeps its full height until you ask; it comes back when the box is cleared or
  Escape is pressed.
- **Escape is handled on the search, not on `document`.** The journal drawer already listens at
  the document, and two listeners for one key is how they start disagreeing about which of them a
  press was meant for.
- **The clear × is a sibling of the `<label>`, never a child of it.** A wrapping label takes its
  text content as the input's accessible name, so a button inside makes the box announce itself
  as *Search games Clear search* — and the specs that locate it by name stop finding it.
- **It hides WebKit's own cancel button**, through
  `[&::-webkit-search-cancel-button]:appearance-none`. Chrome draws one inside a `type="search"`
  box as soon as it has content, so without that rule there are two × in the corner, one of them
  unstyled, unlabelled and invisible to every locator. jsdom renders neither, which is why
  `the box clears from its own corner` is a Playwright spec.
- **It is present only when there is something to clear**, and it moves focus to the box on its
  way out. The button unmounts the moment it works, so without that the keyboard is left on the
  document body. Escape deliberately does *not* move focus: it is handled on the container and so
  can be pressed from a control in the strip, where dragging focus back to the box would be
  moving it somewhere nobody asked for.
- **The strip is `aria-label`led, not headed.** `BoardPage.test.tsx` asserts the board's four
  `<h2>`s as an exhaustive list, so a section heading here would have failed it. The landmark is
  worth having; the `<h2>` is not.
- **`BoardSearch` is tested on its own, never through `BoardPage`.** A result's title and a card's
  title are both an `<h3>`, so "in the order IGDB ranked it" would be reading the board's cards
  too if there were a board in the document.
- **A result is a poster tile**, not a wide row: the strip runs sideways and a row turned on its
  side is unreadable. Same 5:7 the cards use, fixed width so the tiles keep a rhythm.
- **`/search` redirects to `/board`** rather than being dropped — the address outlived the page.
- `e2e/support/board.ts`'s **`card()` is scoped to `[data-board]`** now. It was a bare
  `getByRole('listitem')`, which a search result tile answers to; the failure would have been a
  strict-mode violation in the `board`, `journal` and `hltb` specs rather than in search.

One thing that was checked rather than assumed: MSW runs with `onUnhandledRequest: 'error'`, so
the library-ids query the board now fires on mount could have failed every board test. It does
not, because `boardServer()` already answers the status-less `GET /api/library` and search never
fires while the box is empty.

Everything worth not re-deriving about search itself is unchanged and still above: the 300ms
debounce, `enabled: settled !== ''`, and `libraryMediaIds()` paging to the end.

### The hobby nav

`<nav aria-label="Hobbies">` under the header, built from `src/shell/hobbies.ts`. Adding movies is
a `ready` flag there plus a route — the header itself does not change.

- **The six slugs are copies of `SeedData.Apply`'s and must stay copies.** They are what `?hobby=`
  is filtered on, and `LibraryController` answers **400** for anything not in `hobby_lu`. There is
  no `/api/hobbies` to read them from, which is why `THEMES` is a literal list too.
- **The five unbuilt ones are plain text**, not disabled links and not disabled buttons. There is
  nothing behind them to operate, and a disabled control claims it would work under some other
  condition — so there is nothing to focus and nothing announced as operable.
- **Dim is `text-muted` and nothing further.** `opacity-60` was the first attempt and was wrong:
  every theme's `--muted` is picked to clear 4.5:1 against its own surface, and fading it takes it
  back under — silently, because `index.css.test.ts` checks the tokens rather than what a
  component does to them afterwards. Each tab also says *Soon* in words, which is the rule the
  destructive controls already follow.
- **Games is a `NavLink`**, so `aria-current="page"` comes free and stays right once there is more
  than one of them to be current. `boardPath()` is the one place that has to learn `/board/:hobby`
  when the second hobby lands.
- **The `h1` is the app now, not the hobby**, because the nav is what says which hobby you are on.
- **Exactly one `SettingsMenu`, and it has to stay that way.** `useTheme` holds its state locally —
  themes are CSS, so there is no provider — so a second menu would read storage once on mount and
  then keep drawing the old choice. `AppHeader.test.tsx` pins it.

`renderWithProviders` grew a **`route` option**, defaulting to `/board`. Its `MemoryRouter` had no
`initialEntries`, so the location was always `/` and `aria-current` could not be asserted at all.
That was the one place the test harness could not reach the behaviour being added.

## Phases

Phases are referred to **by name, not by number**, anywhere outside this list. The order has now
changed twice — auth deferred, then HowLongToBeat brought forward — and each reorder silently
invalidated every "by Phase 4" scattered through the code. "once movies exist" stays true however
the list is shuffled.

- **Schema and search — done.** Schema + migration, IGDB integration, `GET /api/games`.
- **The journal — done.** Log-entry CRUD, library and game-detail reads, and the test suite. Its
  UI arrived later, with the board — see **Journalling**.
- **The board — done.** Kanban board frontend: transitions, manual ordering, year filtering and
  the Eastern timezone work on the backend; components, the drag, search (a screen of its own at
  the time) and the journal drawer on the front, with Playwright specs against a real browser.
  The five gaps found by using the drawer — staleness, the dialog, deleting a pass, per-pass
  platform, and notes as dated entries — were unfinished board-phase work and are all closed.
- **Living with the board — done.** Four things daily use turned up once the drawer was finished:
  closing from Backlog removes a title rather than dropping it, rating by slider, your own hours
  beside HowLongToBeat's, and genres from IGDB colouring the cards. Unfinished board-phase work,
  the same as the five drawer gaps. It was expected to have built HowLongToBeat's backfill rail a
  phase early; it did not, because HLTB's has to be a queue rather than a request — but it did
  prove the TPT downcast and the migration-on-a-populated-table traps that HLTB then hit too.
- **HowLongToBeat — done.** All three completion times, the matcher, the queue, the endpoints,
  `sort=hours`, the drawer's pin control, and an end-to-end stub that serves every leg of the
  site's access shape so the real code path runs against it. See **HowLongToBeat** below for
  everything the spike established, and **What the stub is for** for why the specs are green
  for the right reason.
- **The redesign — done.** Semantic tokens, four themes, a density setting and the Shelf
  re-skin in Public Sans, then a board that works at every width, search moved onto it, and a
  hobby nav. The scope grew three times with the user: it began as tokens and appearance, gained
  themes, a settings menu, a density preference and a webfont, and then gained the layout and
  navigation work that living with it turned up. See **The redesign**.
- **Auth — done.** Google and Discord through the framework's generic OAuth handler, an httpOnly
  cookie session, `[Authorize]` on every controller, and 16 query sites scoped so one person sees
  nothing of another's. Five commits: the rail, the scoping, the frontend, the `NOT NULL`
  migration, and the second provider. See **Auth**.
- **Living with auth — done**, merged as #15. Seven things the first days of using a signed-in
  board turned up: sign-in that looks like sign-in, the last thing you wrote showing on the card,
  an options menu so a move is not a drag, removing that removes, a Dropped column you can drop
  into while it is shut, and the card carrying the number HowLongToBeat itself leads with.
  Two settled decisions were reversed in it, both reopened by the user deliberately: the `×` that
  meant a different thing per column and was absent on two of them, and `DELETE …/current`, which
  took one pass per press. See **Board semantics**, **Library is not the catalog**,
  **`comp_all` is the headline number** and **Auth**.
- **Living with the board, again — done**, as #16. Two HowLongToBeat repairs that had
  stopped every automatic lookup, a year control over the whole board, a card that fills in its
  own estimate, and a clear button on the search. Three of the four were found by using the app
  rather than by planning to build them, which is the same shape as the phase before it. See
  **X may have slashes in it**, **A colon can empty the search**, **The board is one year at a
  time** and **The card waits for its own estimate**.
- **Detail and review — next.** Game detail page and the year-in-review page.
- **Filling the board without searching — named, not designed.** Two ways in that are not a
  search box: a **grid of cover art** for what is popular, and a **calendar** for what is coming.
  Both exist because typing one title at a time is currently the only way anything reaches the
  board. **The shape is deliberately unsettled** — the user has said outright that it still needs
  workshopping — so what is written down is the half already known. See **Discovery** below.
- **Other hobbies.** Movies/TV/anime/books/music — each a new sibling detail table deriving from
  `Media`, plus its source integration (TMDB, MAL). Add the `source_lu` row with the client.

**Auth was deferred three times on purpose, and that is now history rather than guidance.** The
original brief had it second. `log_entries.user_id` was nullable, so the journal and the board
worked without a line of auth, and sequencing auth first would have left the app unable to do its
job while it was built. The column is `NOT NULL` now, and the deferral is spent.

### What is worth doing next, and is not a phase

Small enough to sit inside whatever is being built, named here so they are not rediscovered.
Each has a fuller entry where the code lives; this is the index.

- **Sweep up titles with no headline figure when the worker starts.** The first thing to pick up.
  See **The backfill is a thing you run, and that keeps catching people** under
  **HowLongToBeat** — including the reason it was not simply done.
- **Linking a second provider to an existing account.** The schema has been ready since the first
  migration; what does not exist is the deliberate act. Until it does, the same person at two
  providers is two accounts, which is correct rather than a gap. See **What is left** under
  **Auth**.
- **Decide the production origin**, before this ships rather than after. The cookie is cheap only
  because the app and the API share one through the Vite proxy. See **What is left** under
  **Auth**, which also has the Data Protection key problem beside it.
- **`Season` is not in the game-type filter**, and "Mario Kart" therefore returns ten
  *Mario Kart Tour: … Tour* seasons and none of the actual games. One id in one clause. Nobody
  has asked for it. See **Game types**.
- **`users.role` is read by nothing.** It defaults to `"user"` and exists for a day that has not
  come.

The board is built hobby-parameterised (`/api/library?hobby=games`) even though only games
exist, so the other hobbies' boards are a routing change rather than a rewrite.

### Discovery: a grid of what is popular, a calendar of what is coming

**Not designed yet, and that is the point of writing it down now.** The user has asked for the
phase to exist and said plainly that the shape still needs workshopping. Two things are known:
**popular games are a grid of cover art**, and **upcoming games are a calendar**. Everything
below is constraint the codebase already carries, gathered so that none of it has to be
rediscovered while the design is being had. **None of it is a decision.**

The reason for the phase is simple enough to state: a search box asks you to already know what
you want. Filling a board — especially filling one *backwards*, which is what the year control
now exists for — is mostly the other problem.

**What is already true, and bears on it:**

- **IGDB already hands over the popularity numbers, and they are deliberately never stored.**
  `total_rating_count` and `hypes` are asked for on every search and thrown away, because they
  are facts about how many people have played a game *today* rather than facts about the game. A
  popular grid is therefore a live query by construction, and a stored "top games" table is the
  thing this codebase has already decided against once. See **Ranking search results**.
- **`hypes` is the unreleased half, and is already load-bearing.** An unreleased game has no
  ratings by definition — Silksong sat on 220 hypes and nothing else for years, which was exactly
  when it was most searched for. That is the signal an *upcoming* view runs on, and the ranking
  rules already understand it.
- **`first_release_date` is already read, in UTC, on purpose — and a calendar must not reuse
  that.** `games.release_year` takes it in UTC rather than the journal zone because it is
  compared against HowLongToBeat's bare `release_world` year, which belongs to no timezone. A
  calendar is a human question about *days*, so it would be the fourth place the journal zone is
  applied. **Time** currently says three; that sentence is a tripwire and should be updated
  rather than quietly falsified.
- **The catalogue grows by search, and only by search.** `media` rows are written by the IGDB
  upsert, so whether *browsing* writes rows at all is a real decision rather than a detail: forty
  covers idly scrolled would grow `media` faster than every search ever typed. The cheap answer
  is that browsing upserts nothing and only adding does — but that is not how the search strip
  works today, and the two should probably agree.
- **"On your board" already exists and has to be reused.** A result already in your library shows
  that rather than an add button, because a second Backlog entry is not a replay but the card
  would render it as one. Knowing it needs the *whole* library, which is why
  `libraryMediaIds()` pages to the end rather than stopping at the API's maximum page size. A
  grid puts far more tiles on screen than the strip does and needs the same rule.
- **`Season` finally bites here, and this is the phase that should settle it.**
  `where game_type != (3,5)` drops mods and bundles; seasons are untouched, which is why
  "Mario Kart" returns ten *Mario Kart Tour: … Tour* seasons and none of the actual games. That
  is a live annoyance in search and a much worse one in a release calendar, where seasons and
  episodes are precisely what a "coming soon" list fills with. See **Game types** — and note
  **Bundle** is the arguable half that was left easy to take back.
- **Nothing here caches, and this is where that stops being free.** Search reaches IGDB on every
  call by design; the 300ms debounce is the only thing between typing "hollow" and six requests.
  A calendar spanning months is several queries for data that changes daily rather than
  per-keystroke, so a cache is worth having for the first time in this codebase. IGDB's limit is
  4 requests a second.
- **Covers compose at any size already.** `IgdbImage` builds from `cover.image_id` rather than
  `cover.url`, which is pinned to thumbnail size — so a grid can ask for a larger one without a
  new field or a migration. 5:7 is already the app's poster ratio, on the cards and on the search
  strip's tiles.
- **Adding while reading a past year already works.** A title added from anywhere lands in
  Backlog with no dates, and Backlog is exempt from the year — so a card added while the board is
  showing 2019 does not vanish. See **The board is one year at a time**.
- **Games only, whatever it looks like.** IGDB is the only source with a client behind it, and
  the nav says *Soon* for the other five.

**What has to be workshopped**, phrased as the questions rather than as answers:

- **A screen of its own, a strip like search, or a panel over the board?** `/search` was already
  retired *into* the board once, and the reasoning — the column a title is about to land in
  should be on screen while you decide — pulls against a full-page grid. It may pull less hard
  for browsing than it did for searching.
- **Popular by what, over what window?** `total_rating_count` and `hypes` are what the ranking
  uses; IGDB also has a `popularity_primitives` endpoint nothing here has touched.
- **What the calendar's unit is** — a month, a quarter, the rest of the year — and what a day
  carrying eleven releases is supposed to look like.
- **Whether the calendar is a way of adding at all**, or only of looking. A game that is not out
  yet is a real Backlog entry, so it probably is.
- **Where a title lands when added from either surface.** Backlog with no dates is the honest
  default for something unplayed, and is what search already does.

## Auth

**Done.** Google and Discord sign-in, an httpOnly cookie session, and every pass and note scoped
to the person who wrote it. Five commits, each green on its own — the rail, the scoping, the
frontend, the `NOT NULL` migration, and Discord.

Decided with the user, **settled — do not reopen**:

| | |
|---|---|
| Session | **An httpOnly cookie**, self-contained and encrypted. Not a JWT, and no sessions table |
| Mechanism | **The framework's generic `AddOAuth`**, not the `AddGoogle` package and not hand-rolled |
| Providers | **Google and Discord**, both required at boot |
| Accounts | **Anyone can sign up.** Real multi-user, one board each |
| Scoping | **An injected `ICurrentUser`**, not an EF global query filter |
| Existing data | **Discarded.** 16 passes and 3 notes went; the 414 catalogue rows stayed |

### A provider is a config block

`Integrations/` has no `Auth/` folder, because there is no client to write. Both
`Microsoft.AspNetCore.Authentication.Cookies` and `.OAuth` are in the shared framework, so
nothing joined `Directory.Packages.props`. The framework keeps the parts worth not hand-writing —
the `state` parameter, the correlation cookie, PKCE, the code exchange — and leaves the two that
are ours: reading user-info, and finding or creating the user.

There is no first-party Discord package, so `AddGoogle` would have meant two shapes for one job.
Instead `Program.cs` has a `Provider` local function, and a provider is a scheme name, a set of
scopes and five settings. **A third one is two lines there, five values in `appsettings.json`,
and a line in `frontend/src/shell/providers.ts`.**

- **One string does three jobs.** `AuthProviders.Google` is the OAuth scheme name, the
  `{provider}` segment of the sign-in route, and the value stored in `auth_identities.provider`.
  A mapping between them would be a table that can disagree with itself, and the disagreement
  reads as one person signing in twice and collecting two boards.
- **`ExternalSignIn` reads both providers with no per-provider reader.** Google says `sub` and
  `name`; Discord says `id` and `global_name`, falling back to `username`. A short list of
  aliases is the entire difference, and a class per provider would be ceremony.
- **Endpoints are settings, not constants**, for the reason `Igdb:BaseUrl` is: it is what lets
  the e2e suite point the *real* handler at a stub. Credentials go in **user-secrets**.
- **`ValidateDataAnnotations` does not recurse into nested option objects.** A `[Required]` on
  `AuthProviderOptions.ClientId` would look right and validate nothing at all, so
  `ValidateAuthOptions` checks the blocks by hand — which is also what lets a failed boot name
  `Auth:Google:ClientId` rather than say the section is invalid.

### The five traps, every one of which fails quietly

Each of these was found by running the thing, not by reading it.

- **The OAuth options must be resolved from the container, not read at build time.**
  `builder.Configuration` is still being assembled while `Program.cs` runs, so a value captured
  there misses any source added afterwards — which is exactly what `ApiFactory` does. It
  surfaced as **all 153 endpoint tests 500ing on an empty ClientId**. `IgdbClient` already
  resolves `IOptions` inside its configuring lambda for this reason; the cookie's expiry and
  every provider's credentials now do the same.
- **The Vite proxy's `changeOrigin` is `false`, and that is load-bearing.** ASP.NET builds the
  OAuth redirect URI out of the incoming `Host`, so rewriting it sends the provider back to the
  API's own port — an origin where the correlation cookie set on the app's port is not sent, and
  where a session cookie would land somewhere the app cannot read. The whole sign-in has to stay
  on one origin, which is the same property the cookie depends on in production.
- **`OnRedirectToLogin` is overridden to a 401.** Without it the framework answers an
  unauthenticated API call with a 302 to a login page; fetch follows it and the caller gets 200
  and a lump of HTML, then fails while parsing JSON, miles from the cause.
- **`CorrelationCookie.SameSite` defaults to `None`**, which browsers refuse without `Secure`, so
  the flow fails on plain-http localhost with a correlation error naming nothing useful. `Lax` is
  enough: the callback is a top-level navigation. The session cookie is `Lax` for the same
  reason, and **not `Strict`**, which would withhold it on exactly that navigation.
- **`Ok(null)` is a 204, not a 200 with a null body.** `HttpNoContentOutputFormatter` turns a
  null `ObjectResult` into no body at all, and the caller then parses an empty string as JSON.
  `GET /api/auth/me` uses `JsonResult`.

### `/api/auth/me` answers 200 and null, on purpose

It is the frontend's "am I signed in" probe, so a 401 there would trip the very handler that
redirects on a 401 — the query would send you to sign in on the strength of its own answer. It is
also **the Playwright readiness URL**, which has to stay reachable before anybody has signed in;
the board route it used before would 401 forever, and Playwright reports that as a server that
never started.

`returnUrl` is refused with a **400** when it is not local, rather than quietly dropped: a link
carrying a foreign one is either an attack or a bug, and both are worth hearing about.
`Url.IsLocalUrl` is what catches `//evil.example`, which passes a naive leading-slash test and is
a URL with no scheme rather than a path.

### Scoping: an injected `ICurrentUser`, and why not a query filter

An EF `HasQueryFilter` on `LogEntry` would scope every read automatically, including the note
queries that have no user column to filter on. It is the wrong choice here, and the reasons are
worth keeping:

- **It is invisible at the call site.** A scoping rule nobody can see while reading the query is
  one nobody can review.
- **A filter going wrong empties the board rather than erroring** — the silent failure this
  codebase has already paid for twice, over the TPT downcast and the projected `BoardRow`.
- **`PostgresFixture.CreateDbContext()` builds a context by hand**, with no container to read a
  filter's user out of.
- **`HltbWorker` resolves a scope with no `HttpContext`.** With a filter its context scopes to
  nobody; with injection, the paths that do not need a user simply never ask.

`ICurrentUser.Id` **throws** when nobody is signed in. Every path that reads it sits behind
`[Authorize]`, so reaching it anonymously is a wiring mistake, and a 500 naming it beats a board
quietly scoped to nobody. `IsSignedIn` exists for the background paths.

**The rule: `log_entries` and `notes` are yours; `media`, `games` and the lookup tables are
shared and must stay shared.** Two people searching "Hollow Knight" get the same row — that is
the point of the upsert, and of `hltb_id` being stored once rather than per account.

Sixteen sites, of which three were subtler than the rest:

- **`LibraryService.BoardQuery` reaches `log_entries` three times, not once** — the `Any` filter,
  the `EntryCount`, and the `Latest` projection. Scoping only the first leaves the count
  including strangers' replays and `Latest` able to pick a stranger's entry; `Latest` decides the
  column, so the symptom is your own Backlog title sitting under Completed. Un-scoping `Latest`
  alone also breaks reordering, because `ReorderAsync` renumbers through `row.Latest`.
- **`NoteService` has no column to filter.** All six queries reach through `n.LogEntry!.UserId`.
  That is what makes a note id enough on its own at the API: the route needs no entry, but the
  query still has to ask whose entry it was written during.
- **`BoardPositions.TopOfColumnAsync` is `static` and takes the context as a parameter**, so it
  is out of reach of injection and takes a `userId` instead. Left alone, one person's backlog
  decides where another's new cards land.

**Left unscoped deliberately:** `GameCatalogService.RefreshLibraryAsync` and
`HltbService.BackfillAsync`. Both select on "any user has logged this" and both write only shared
columns, so that is the right set for a maintenance sweep. Both carry a comment, because they
read like missed sites.

**404 rather than 403** throughout: whether somebody else's pass exists is itself their business.

`Endpoints/UserScopingTests.cs` is the suite that matters — 19 cases, all red before the scoping,
and each checked afterwards by reverting **one** predicate at a time. Every one fails exactly the
tests that name it and nothing else. A scoping test that was never red proves nothing.

### `[Authorize]`, and one cost accepted

On all four controllers, `GamesController` included: the catalogue is shared but it is not
public, and an anonymous search is free IGDB traffic plus an unbounded write into `media`.

**That puts the two maintenance refresh routes behind a session, so a bare `curl` no longer
works.** Accepted rather than worked around — a role exemption for two routes would be a second
authorization concept for no gain. Use a cookie jar, or the browser.

### The frontend

- **The gate is a route wrapper**, `RequireSession`, not a check inside `BoardPage`. Without one
  the board answers 401 for each of its four columns and paints four red messages, which is a
  true description of what happened and a useless one to be handed.
- **It renders nothing while the session is in flight rather than guessing.** Guessing "signed
  out" for that moment flashes the sign-in screen at a signed-in person on every reload, and
  removing the guard fails three tests, not one.
- **The session is a query, not a context.** There is no `createContext` anywhere in this
  codebase. The theme layer gets to be local state precisely because "a component never asks what
  theme it is in", which is exactly what a session is not. TanStack dedupes, so the gate and the
  header asking separately is one request — and `renderWithProviders` needed no change at all.
- **A 401 anywhere clears the session rather than surfacing as red text.** There was no global
  error handling before this. `createQueryClient` writes null to the session key rather than
  redirecting, because that module has no router and the session query already owns the answer.
  Nothing 4xx is retried either; the default three attempts meant waiting out three rejections to
  be told the same thing.
- **`credentials: 'include'`** changes nothing today, since same-origin requests already carry
  the cookie. It is there so the day the origins diverge is not also the day sign-in silently
  stops working.
- **Providers are a literal list** in `shell/providers.ts`, for the reason `THEMES` and `HOBBIES`
  are: there is no endpoint, and inventing one would mean the server describing its own
  configuration to a client that only needs to draw two links.
- **Each provider is a link, not a button.** Signing in is a top-level navigation answered with a
  302 that fetch cannot usefully follow.
- **The sign-in links are neutral, with the provider's own mark on the left** — `bg-surface`
  behind `border-line` with `text-fg` on it, which is the bordered-control idiom the rest of the
  app already wears, and full colour only inside the mark. That is what every site offering this
  does, and it is also the cheap answer here: `--accent` has no paired foreground, because
  nothing in the app has ever put text on it — the settings menu uses it for radio dots — so a
  filled button would have meant inventing `--accent-fg` as five new values and five new rows in
  `index.css.test.ts`. `--fg` on `--surface` is already asserted on every palette. Drawing the
  links in the accent instead, which is what this did first, made *Continue with Google* a green
  button with no Google about it.
- **The two marks are the first SVG in the codebase**, inline for the reason the webfont is
  self-hosted. Both carry `aria-hidden` and `focusable="false"`, so each link's accessible name
  stays exactly `Continue with Google` and the four assertions that match on it needed no change.
  `providers.ts` became `providers.tsx` so a mark can sit beside the label it belongs to, and a
  third provider is still one entry there.
- **The ground is the whole viewport and the screen is a card on it.** `bg-sunken` sat on a
  `max-w-sm` `<main>` at first, so the theme's ground was a 384px strip down the middle with the
  browser's own colour either side of it — most obvious on Ember, where the strip was near-black
  and the margins were not. The card is `bg-surface` and so are the two links on it, separated by
  their borders: giving them a different fill would make them the only raised thing in an app
  whose controls are all outlines.
- **`AppHeader` has no `banner` landmark**, and never did: it renders inside `BoardPage`'s
  `<main>`, and a `<header>` nested in `main` is not a banner. The specs locate the name and the
  sign-out control directly. Making it a real banner is a layout change nobody has asked for.

### `user_id` is `NOT NULL`, and what that cost

The development board was **discarded**, re-confirmed immediately before it ran rather than on
the strength of a decision taken earlier: 16 passes across 13 titles and 3 notes, all unowned and
so already invisible to a signed-in account. `media` and `games` were untouched, so every one of
those titles is one search away.

Two things had to change with the column:

- **`DeleteBehavior.SetNull` became `Cascade`.** EF refuses `SetNull` against a non-nullable
  foreign key and fails **model validation at boot**, not at runtime. Deleting an account now
  takes its journal with it, which is the honest reading — a pass with no owner cannot exist, so
  there is nothing to leave behind.
- **The scaffolded `defaultValue: 0` was removed from the migration.** It would have emitted an
  `UPDATE` turning every unowned pass into user 0 *and* left a `DEFAULT 0` on the column, so an
  insert omitting the owner would silently claim to be somebody. Without it the migration is a
  bare `SET NOT NULL` that fails immediately and says why. Checked with `ef migrations script`:
  three statements, no `UPDATE`, no `DEFAULT`.

### The test harnesses

**The backend suite signs a test in by header**, through `TestAuthHandler`, registered only under
the "Testing" environment — so nothing production authenticates with is what those tests trust.
The division is deliberate: they are about authorization and scoping, and the OAuth dance that
decides *who you are* is proved end to end against the stub instead. `DatabaseTestBase` creates a
user after the reset and signs `Client` in as them, which is why the 270 tests that predate
ownership needed no edit; `ClientFor(userId)` gives a second person and `AnonymousClient` none.

**`e2e/support/google-stub.mjs` is a provider, not an endpoint** — authorize, token and
user-info, with the real handler running against it unmodified. It **enforces the protocol rather
than decorating it**, which is the whole reason it is worth having:

- no `code_challenge` on the authorize request is a **400**, so turning PKCE off fails the suite
  rather than passing quietly — checked by doing exactly that, which fails five specs;
- a `code_verifier` that does not hash to it is a 400, the wrong `client_secret` is a 401,
  user-info without its bearer is a 401, and a code works exactly once;
- it serves **Discord's shape at Discord's address** as well, so the specs prove `ExternalSignIn`
  reads both rather than reading a shape the stub was told to produce. Writing that turned up a
  mangled bearer regex in the stub itself, which it duly reported as a failed sign-in.

`POST /__identity` chooses who signs in next, which is what makes the two-user specs expressible
at all.

**Every spec signs in in its `beforeEach`, and seeds through `page.request`.** Playwright's
standalone `request` fixture keeps its own cookie jar, so signing the page in leaves the seeding
anonymous — a trap worth not rediscovering. `resetDatabase()` truncates `users` and
`auth_identities` too, so a run starts with nobody signed up.

### What is left

- **Linking a second provider to an existing account.** The schema has been ready since the first
  migration — `auth_identities` is unique on `(provider, provider_user_id)` and many rows may
  point at one user — and a test pins that two identities give one board. What does not exist is
  the deliberate act: signing in with Google and then attaching Discord. Until it does, **the
  same person at two providers is two accounts**, and that is correct rather than a gap. Email is
  informational and never a login key, because providers reuse addresses and trusting one to
  merge accounts would let anybody who can get an address at either walk into the other's journal.
- **The production origin.** The cookie is cheap only because the app and the API share one
  origin through the proxy. Keeping that true in production is the cheap path; the alternative is
  `SameSite=None` plus the CORS policy this codebase has deliberately avoided. **Still undecided,
  and worth deciding before this ships rather than after.**
- **Data Protection keys.** The self-contained cookie is encrypted with them. On Windows they
  persist under `%LOCALAPPDATA%`, so development is fine, but an ephemeral container filesystem
  signs everyone out on every restart.
- **`users.role` is still unused.** It defaults to `"user"` and nothing reads it.

## HowLongToBeat

Every card carries how long the game takes, and the drawer carries all three of HowLongToBeat's
numbers beside how long *you* took. Decided with the user, **settled — do not reopen**:

| | |
|---|---|
| Numbers | **The headline figure plus all three tiers** — All Play Styles, Main Story, Main + Extra, Completionist, under HLTB's own names |
| `sort=hours` | **The headline figure**, the same one the card prints, so the column agrees with itself |
| Where | All four in the drawer; **the headline figure alone on a card**, which has room for a number, not a table |
| Matching | Auto-accept above a threshold *and* a margin; below either, **write nothing** |
| Correcting | **In the drawer, by pinning an id.** Not psql, and not typed-in hours |
| Fetching | Queued on add to the board, plus a backfill for what is already there |

### HLTB is not an API, and that is the whole design problem

IGDB is documented, authenticated and versioned. HowLongToBeat is a website with an internal
endpoint that unofficial clients wrap and that has broken those clients for months at a stretch —
the best-known Python one was dead from late 2024 into 2025. Treat a break as expected: stored
numbers persist, a title added during an outage simply shows nothing, and `Hltb:Enabled` turns the
worker off without a release.

**The access shape, established by spike and correct as of August 2026.** All of it is
rediscovered at runtime rather than configured, because all of it moves:

1. `GET /` → the Next.js bundles under `/_next/static/chunks/*.js`.
2. **The pair rule**: the search endpoint is whichever `/api/X` is *also* referenced as
   `/api/X/init`. Today X is **`search/site`**; it has been `s`, `seek` and `bleed` before.
   Taking the first `fetch(..., {method:"POST"})` instead — the obvious reading, and what the
   community clients do — picks `/api/game/`, which answers **404**. A 404 reads as a wrong URL
   rather than a wrong rule, so it sends you hunting for a path suffix that was never there.
   `Hltb:FallbackSearchPath` is where to correct the next rename without a release, and it has
   to be **kept current to be worth anything** — see **X may have slashes in it** below.
3. `GET /api/{X}/init?<epoch-ms>` → `{"token":..., "hpKey":"ign_...", "hpVal":...}`. The token
   decodes to `<ms>::<your-ip>|<your-user-agent>|<hpKey>|<hpVal>.<hmac>`.
4. `POST /api/{X}` with `x-auth-token`, `x-hp-key`, `x-hp-val` — **and the body carrying a
   property whose *name* is the hpKey**. That last one is the trap: without it the endpoint
   answers 404, not 403, so a failed anti-bot check looks exactly like a wrong URL. A 403 means
   the token has gone off; re-run the handshake and retry **once**, which is what the site's own
   JavaScript does.

#### X may have slashes in it, and assuming otherwise broke the whole feature

The rename that actually happened, and the shape of a failure worth recognising again.

`bleed` became **`search/site`** — two segments. Every name the site had used until then was a
single word, so the pair rule refused any candidate with a slash in it, on no evidence beyond the
three examples in front of it. Discovery then found nothing at all, fell back to
`Hltb:FallbackSearchPath` — which still said `bleed`, a name the site had already retired — and
that answered 404. **Two ways of being wrong, one behind the other**, and the log line naming the
fallback was the only clue the first had happened.

**What made it expensive to notice is that it takes out exactly half the feature.** Pinning an id
by hand needs no handshake and never goes near discovery, so the correction path went on working
while every automatic lookup failed — in a background worker that logs and swallows, which is
right and which also means nothing reaches a screen. The symptom a person sees is "new games stop
getting times, but typing the id still works", and that sentence names the culprit precisely: the
handshake, and nothing else, is what the two paths do differently.

So: **the guard is gone, and candidates are ordered before one is chosen** so a bundle offering
more than one pair resolves the same way twice. Nothing has ever offered more than one; it is a
tie-break rather than a preference. `HltbSessionTests.Finds_a_search_endpoint_whose_name_has_more_than_one_segment`
pins the two-segment shape, and `hltb-stub.mjs` now serves `warble/site` rather than `warble`,
so the e2e rail proves a multi-segment name end to end. That the stub was a single word for as
long as the site was is exactly how the suite stayed green while the app was broken — **a stub
that mirrors only today's shape cannot warn you about tomorrow's.**

Verified against the live site rather than reasoned about: the fixed rule finds `search/site` in
today's bundle, `/api/search/site/init` answers 200, and the search POST comes back with Hollow
Knight at `comp_all` 150,544. Correct as of 24 August 2026.

#### A colon can empty the search, so the terms are cleaned first

The second half of the same outage, and the one that would still have been there after the
endpoint was found again.

`SearchAsync` split the title on spaces and sent the pieces as they were. **HowLongToBeat
matches each term against its own title literally**, so a piece of punctuation the two sites
disagree about does not cost you a worse result — it costs you every result:

| sent | candidates |
|---|---|
| `Dragon Quest III HD-2D Remake` | 1 — the game, `comp_all` 42.32 |
| `Dragon Quest III: HD-2D Remake` | **0** |

**Nothing downstream can recover from that.** The matcher is handed an empty list and correctly
refuses; `hltb_checked_at` is stamped on the miss, exactly as designed; and the title is then
never asked about again until the recheck window passes. A refusal that should have been a match
is indistinguishable from Pokémon Scarlet's genuine one.

IGDB and HowLongToBeat disagree about colons, hyphens and apostrophes constantly, so this is the
ordinary case rather than an edge. `TermsOf` folds accents and turns everything that is not a
letter or a digit into a space. **Safe as well as necessary**, measured rather than assumed: ten
real titles were run against the live site both ways, nine were identical, and the colon was
rescued. A term carrying no punctuation is unchanged by it.

**It deliberately does not call `HltbMatcher`'s normalisation**, which looks like the same job.
That one folds roman numerals to digits — right when comparing two strings already in hand, and
wrong in a query, because the site writes "III" and matches nothing for "3". It also lower-cases
and drops a leading "The". The two are near neighbours that must not be merged, and
`Folds_the_accents_but_leaves_the_numerals_alone` is the test that says so.

Verified through the real client and the real matcher against the live site: Dragon Quest III
with and without the colon both resolve to 92790 at 42.32 hours, and Marvel's Spider-Man: Miles
Morales, NieR: Automata, Clair Obscur: Expedition 33, Silent Hill 2 (the 2024 one, separated from
the 2001 one by the release year) and Astro Bot all match. Pokémon Scarlet is still refused, and
still correctly — HowLongToBeat has it only as "Pokémon Scarlet and Violet".

**`User-Agent` and `Referer` are both load-bearing, measured rather than guessed.** The handshake
answers `403 {"error":"Access Denied"}` without either and 200 with both; `Accept` and `Origin`
make no difference. The token bakes the User-Agent in, so the string used at the handshake and at
the search must be identical — which is why `HltbClient.Identify` stamps it per request instead of
the typed client's DI configuration doing it. That coupling lived in two files once, and only the
real site could tell you they had drifted.

**Fetching a pinned id needs no handshake at all.** `GET /game/{id}` carries the record in the
JSON Next.js embeds, at `props.pageProps.game.data.game[0]` — one level deeper than the search's
`data`, whose siblings there are `relationships`, `userReviews`, `platformData`. An unknown id
answers 404, which is an answer rather than a failure. This is why a matched title stays
refreshable on a day the search endpoint has been renamed.

**Three wire quirks are absorbed at the boundary** so nothing above `Integrations/Hltb` knows
them: times arrive in **seconds**; `0` means nobody has submitted one, not that the game is
instant; and `release_world` is an integer year from the search but a date string from the page,
which is why `HltbGameJson.ReleaseWorld` is a `JsonElement` — typing it either way makes the other
endpoint throw.

**`comp_all` is the headline number, and it is fetched rather than worked out.** It is what the
site prints at the top of a game page and what a card and `sort=hours` both show, and it is not
a function of the three tiers. Measured on game 26286 (Hollow Knight), where the page says
**42 Hours**:

| field | seconds | hours |
|---|---|---|
| `comp_all` | 150,549 | **41.82** |
| `comp_main` | 97,204 | 27.00 |
| `comp_plus` | 149,763 | 41.60 |
| `comp_100` | 236,141 | 65.59 |
| `comp_all_avg` | 160,697 | 44.64 |
| `comp_all_med` | 140,400 | 39.00 |

The mean of the three tiers is 44.6 and their median is 39 — and HLTB publishes both of those,
as `comp_all_avg` and `comp_all_med`. So averaging the tiers would have produced a number that
is on the payload, under a different name, and is not the one the page shows. `comp_all_count`
equals the three tier counts added together, so it is the same submissions aggregated some other
way; whatever that way is, it is theirs to know. **Do not compute this.**

### Two deviations from the IGDB mirror, both forced

`Integrations/Hltb/` mirrors `Integrations/Igdb/` where it can. `HltbSession` is
`TwitchTokenProvider`'s shape exactly — singleton, one refresh however many callers arrive at
once, invalidated from outside. Nothing expires it on a timer: the token's lifetime is HLTB's to
know, so any guess fails either by refusing a good token or keeping a stale one, and the 403 is
the only honest signal.

But **the 403 retry lives in `HltbClient`, not in a `DelegatingHandler`**. The credential is
partly in the request *body*, so a handler replaying a 403 would resend the stale one and fail the
very check it was retrying for; rewriting request JSON inside a handler is worse than the coupling
it would avoid.

And **identity is stamped per request**, as above.

The **throttle** does stay a handler, because rate limiting genuinely is a transport concern. Its
state is a singleton beside it: keeping the timestamp on the handler quietly does not work, since
`IHttpClientFactory` rebuilds the chain every couple of minutes and the floor would reset on a
schedule nothing in that file controls. It is politeness, not compliance — HLTB publishes no rate
limit, only a history of blocking unofficial clients.

### Matching is the work; fetching is not

`Services/HltbMatcher` is pure and static, and it is the piece most likely to need a new case.
Two ways of refusing, because there are two ways of being wrong:

- **The numerals must agree outright.** "Final Fantasy VII" against "Final Fantasy VIII" scores
  ~0.97 on letters alone, so no threshold could separate them. Roman numerals are folded to digits
  during *normalisation* rather than only where numerals are compared — doing it in one place and
  not the other made the two rules disagree, refusing a "VII" to "7" match the file had already
  decided was correct. Single **L, C, D and M are excluded** from the roman set on purpose: they
  are legal numerals, and reading them as such turns "L.A. Noire" into "50 a noire", which then
  stops matching "LA Noire".
- **The winner must beat the runner-up by `AmbiguityMargin`.** Otherwise the two "Resident Evil 4"
  entries — same title, 2005 and 2023, both scoring 1.0 — are settled by a coin flip that looks
  from outside exactly like a confident match.

**Calibrated against the real library, not guessed.** Every correct match scored **1.0**; the
closest wrong one scored **0.64**. So `MatchThreshold` 0.9 and `AmbiguityMargin` 0.05 both have
room to spare. Seven of eight titles matched. The eighth, **Pokémon Scarlet**, scored 0.577 and was
refused — HowLongToBeat models the paired release as one "Pokémon Scarlet and Violet" entry and
IGDB does not, and no rule here can invent that mapping. That refusal is correct, and it is
exactly what the pin is for.

Normalising is conservative: diacritics folded, punctuation flattened, a leading "The" dropped,
and nothing else. Stripping subtitles or the word "edition" is how a matcher becomes confident
about the wrong game.

### Nothing a person does waits on HowLongToBeat

Adding a title to the board writes its log entry, drops the id in a bounded `Channel`, and
replies. `POST /api/games/hltb/refresh` does the same for the whole library and answers **202**
with a count of what was **queued** — a `QueuedResult`, deliberately not `RefreshResult`, because
`Refreshed` counts rows the IGDB upsert touched where this counts work not yet begun, and sharing
a type for those two numbers is how the difference stops being noticed. At a two-second floor,
fifty titles is minutes; no HTTP request should be held open for that.

`HltbWorker` drains the queue, a DI scope per title, logging and swallowing every failure —
nobody is waiting on it, and a title that fails keeps its null `hltb_checked_at` so the next
backfill finds it. The queue drops the newest when full for the same reason: it is a convenience,
not a ledger.

**`HltbService` is deliberately not part of `GameCatalogService`, and never goes through its
`ApplyMetadata`.** That method's contract — its own comment, and two tests — is that an IGDB
refresh cannot touch the `hltb_*` columns. A separate service keeps that true by construction.

### The card waits for its own estimate

Adding a title replies before the lookup has begun — that is the design, not a shortcut — so the
hours land on the row some seconds after the card is already on screen. Nothing told the board.
The only things that refetched a column were a drag, a note or a reload, so the ordinary way to
discover your estimate had arrived was to go and do something unrelated to it.

**`LibraryItemDto.HltbPending` is what the board needed and did not have.** It lets a row say
"no estimate, and one may still be coming" apart from "no estimate, and none is". A column then
asks again while, and only while, one of its own rows is waiting — so a settled board makes no
requests at all, and the column holding the new card is the only one that does.

**It is read off `hltb_checked_at`, and that is the whole of what makes looping on it safe.**
The column is stamped on a refusal exactly as it is on a match — which is the reason it exists —
so a title HowLongToBeat has never heard of stops being pending with nothing to show for it.
Polling on "the hours are null" instead would poll for ever on every unmatchable title, and a
real library has several: Pokémon Scarlet is one.

Four things worth not rediscovering:

- **The projection is `row.Media is Game && …`, not `(row.Media as Game) != null && …`.** EF
  elides the second as always true, so every film comes back pending and the movies board polls
  for an answer nobody is bringing. `is Game` becomes the TPT join's own null check, which is the
  question actually being asked. It cost a red test to find, and that test is
  `A_board_row_for_something_that_is_not_a_game_is_never_waiting`.
- **It is in both terminal DTO projections**, `ListAsync` and `ItemAsync`, on the licence the
  genre and HLTB downcasts already took and never in `BoardQuery`. A transition answers with the
  row it just wrote and the board puts that straight into the cache, so if the two disagreed a
  drag would tell the board to stop waiting for a title still being looked up.
- **`refetchInterval` is a function, not a number.** TanStack calls it to schedule each next ask,
  so the budget is re-read against the clock every time. A number computed during render is read
  once and never revised, because a refetch that changes nothing does not re-render.
- **There is a budget, `ESTIMATE_POLL_BUDGET_MS`.** `hltb_checked_at` stays null when
  `Hltb:Enabled` is off or the site is refusing us, so "still pending" is not by itself a promise
  that the waiting ends. Without the budget a board in that state asks for the rest of the
  session. It restarts whenever the set of waiting titles changes, so a game added while the last
  one is still being looked up is not left on the tail end of somebody else's clock.

**The stub had to start taking a moment for any of this to be testable.** `hltb-stub.mjs`
answered a search instantly, which let the refetch that follows an add win a race it always loses
in production — so the spec asserting the card fills itself in passed whether or not the board
ever looked again. Checked by removing the poll and watching it pass. `SEARCH_DELAY_MS` is 600ms
on the search alone; the by-id fetch still answers at once, because that is the one route
somebody is genuinely waiting on. With the delay in place, removing the poll fails the spec.

**Not covered, and deliberately:** the drawer. Its three tiers do not refresh themselves while it
is open. The pin control writes synchronously and refetches, so the path a person waits on is
already immediate, and a dialog that repaints under the reader is worse than one that does not.

### The backfill is a thing you run, and that keeps catching people

**To build: `HltbWorker` should sweep up titles with no numbers when it starts.** This is the
next thing worth doing in this area, and it is written down here because it has now bitten twice.

The shape of the problem. `media` rows are only ever written by a search, so a column added to
the schema is empty on the library you already have until something goes and asks — and the only
thing that asks is `POST /api/games/hltb/refresh`, which has no UI, sits behind `[Authorize]`,
and nobody would think to run. Adding `hltb_all_styles_hours` therefore took every card's estimate
away until it was run by hand. The migration clearing `hltb_checked_at` was necessary but not
sufficient: it made the backfill *able* to pick those rows up, and still nothing picked the
backfill up.

What it should do: on startup, enqueue the same set `BackfillAsync` selects — library titles
whose `hltb_checked_at` is null or older than `Hltb:RecheckAfterDays`. The queue, the worker, the
politeness floor and the swallow-and-log are all already there; this is a `BackgroundService`
starting the thing that already exists, not a new path.

**Three things to get right, and the reason this was not simply done:**

- **It makes the app reach HowLongToBeat without being asked**, and this is a site that would
  rather not be read by a program. That is why the backfill is explicit today. `Hltb:Enabled`
  must gate the sweep as it gates the worker, and the sweep must be its own setting besides —
  somebody running this locally to look at the board should not become traffic.
- **`ApiFactory` removes `HltbWorker` from the host entirely**, because left in it looks titles
  up on a background thread while tests assert about the rows it is writing. A sweep that runs
  from the worker inherits that, which is right; a sweep that runs from anywhere else does not,
  and would make the suite flake in a way that reads as a database problem.
- **It must not re-ask on every restart.** `hltb_checked_at` is stamped on a miss as well as a
  hit for exactly this reason, so the selection above is already correct — but a sweep makes a
  restart loop expensive in a way a manual backfill never was, and the recheck window is the only
  thing standing between a crash-loop and a few hundred requests.

Until it exists: **after any migration that adds an `hltb_*` column, run the backfill**, and say
so in the same breath as the migration. It is one line from the browser console while signed in,
and CLAUDE.md is where somebody would look for it:

```js
await fetch('/api/games/hltb/refresh', { method: 'POST' }).then(r => r.json())
```

**Storing the matched id is load-bearing, and was missed on the first pass.** A confident match
writes `hltb_id`, and every later refresh fetches *that id* instead of searching and matching
again. Without it every backfill quietly becomes a full re-match, and the numbers can drift onto a
different game because a title was edited or the rules were tightened. `HltbService.Apply` owns
it. It pointedly does **not** write the title back: HLTB's name for a game is often not IGDB's —
the entire reason a matcher exists — so that would let a lookup rename a card.

### The pin is the only correction, and that is enough

`PUT /api/games/{mediaId}/hltb` takes an id or a null. It covers both ways of being wrong — a
match that found the wrong game and one that found nothing are both fixed by naming the right id —
and unlike typed-in hours it survives the next backfill, because a stored id is what every refresh
fetches. It is also exactly what `Game.HltbId`'s doc comment always said the column was for.

It fetches **there and then** rather than queueing, because the point of typing an id is to learn
whether it was right, so an id HLTB does not know is a **400 naming it** rather than a stored pin
that silently answers nothing. This is the one route anybody waits on, and so the only one
`HltbExceptionHandler`'s 502 can reach.

**Clearing a pin resets the title to never-having-been-asked**, not to asked-and-found-nothing.
The numbers were wrong; leaving a stamp behind would stop the backfill ever looking again and the
card would stay blank for good.

### The pin control

`HltbPin` sits in the drawer header beside the genre select, on the same reasoning: both belong
to the title, and `EntryForm` submits one PUT to a different endpoint. `setHltbId` in
`useJournalEntry.ts` follows `setGenre` and invalidates `['library']` as well as
`gameKey(mediaId)`, because the card carries main-story hours and *Time to beat* orders on it.

Two things about it are **not** what the plan said, and both are deliberate:

- **It is a text box, not a number input.** An id is an identifier rather than a quantity: a
  spinner that nudges it by one lands on an unrelated game. The real reason is worse than that,
  though — a number input reports an unparseable value as an *empty string*, and empty here means
  *take the pin back*, so a typo would silently clear a good id and reset `hltb_checked_at` with
  it. `inputMode="numeric"` keeps the mobile keypad. `parseHltbId` mirrors the server's
  `Range(1, int.MaxValue)` on the text, as `parseRating` and `parseHours` do — here because there
  is nothing to learn from asking, rather than because Postgres would round it.
- **It commits on blur or Enter, not on change.** The genre select beside it saves on change
  because a choice from a list is complete the moment it is made; "9134" passes through 9, 91 and
  913 on the way, and this is the one route that holds the caller while the server reads a
  website. An unchanged value is not sent at all, so tabbing past the box costs nothing.

**`commit()` returns early while a pin is in flight, and jsdom cannot show you why.** Enter
commits while the box still has focus, and the commit disables it — which a real browser reports
as a blur, which is the same event that commits. Without the guard one pin is two upstream
lookups, the second on a value `hltbId` has not caught up with yet. jsdom does not implement
"disabling a focused element blurs it", so the Vitest suite passes either way; the Playwright
specs are what actually run that path.

The component is keyed on `detail.hltbId` for `EntryForm`'s reason — `useState` reads its initial
value once — which also gives the error path what it needs for free: a refused pin leaves the
stored id alone, so the key does not change and what was typed stays in the box to be corrected.

### What the plan got wrong

Worth knowing before trusting
`C:\Users\jimmy\.claude\plans\for-the-next-part-delightful-alpaca.md`:

- It had an `HltbSessionHandler` mirroring `IgdbAuthHandler`. **Impossible** — see the body-borne
  credential above.
- It assumed fetching by id needed the same handshake. It needs none.
- It argued `release_year` was needed to stop remasters being matched by coin flip. The
  **ambiguity margin already refuses that safely**; the year converts refusals into correct
  matches, so it is a coverage improvement rather than a safety requirement. It earns its place
  anyway — the live check shows Resident Evil 4 resolving with a year and refusing without one.

### Testing it, and the thing tests cannot tell you

Stubs verified every one of the above and were green while the real site refused three times in a
row: no `Referer` on the handshake, a User-Agent that only DI supplied, and a fabricated fixture
for the game page that had `data` as an array. **A throwaway harness that runs the real
`HltbSession` and `HltbClient` against howlongtobeat.com is worth writing again** whenever this
area is touched — it is the only thing that can catch any of that. Do not commit it, and do not
make the suite depend on the network.

`ApiFactory` swaps `IHltbClient` for `FakeHltbClient` and `IHltbQueue` for `FakeHltbQueue`, and
**removes `HltbWorker` from the host entirely**. Left in, it would look up titles on a background
thread while tests assert about the rows it is writing.

### What the stub is for

`e2e/support/hltb-stub.mjs` exists because the backend suite fakes `IHltbClient` outright, which
leaves the whole access shape — the bundle scrape, the pair rule, the handshake, the body-borne
key — with no test above the unit level. So the stub is a *site*, not an endpoint: it serves the
home page, two bundles, the handshake, the search and the game page, and the real
`HltbSession`/`HltbClient` run against it unmodified. `Hltb:BaseUrl` is the only thing pointed
at it, because everything else about reaching HLTB is rediscovered at runtime rather than
configured — which is exactly what makes this worth running.

Three deliberate choices, each of which is what stops a spec passing for the wrong reason:

- **Its search endpoint is `warble/site`, pointedly not whatever `Hltb:FallbackSearchPath`
  holds.** Naming the stub's endpoint after the real one would let the fallback quietly cover for
  a pair rule that had stopped working. Checked by breaking it: strip the `/init` reference out
  of the bundle and **all eight specs fail**. It is two segments because the real one is two
  segments — it was a single word here for as long as it was a single word on the site, which is
  precisely how this suite stayed green through the rename that broke every automatic lookup in
  the app. See **X may have slashes in it**.
- **The bundle carries a decoy.** `/api/game` is referenced from a POST fetch and is the first
  one a reader meets — the obvious reading, what the community clients take, and what answers 404
  on the real site. It is there so "take the first POST fetch" fails this suite rather than
  passing it.
- **The identity checks are enforced, not decorative.** No User-Agent or no Referer is a 403, and
  a search sent under a different User-Agent than the token was issued to is a 403 as well —
  because the token bakes it in. Those are two of the three things that were green against stubs
  while the real site refused. A search without the body property whose *name* is the hpKey gets
  a **404**, not a 403, because that is what the real endpoint does and the wrong status is the
  whole trap.

The stub's catalogue disagrees with IGDB's on purpose. Stardew Valley is missing altogether;
Anthem is filed as "Anthem: Legion of Dawn", which scores about 0.29 against IGDB's bare "Anthem"
and is correctly refused — Pokémon Scarlet's situation, and what makes the pin's specs about
something real rather than about a number nobody needed.

**Adding a title already queues a lookup**, so most specs need only wait; `awaitEstimate` and
`awaitChecked` in `e2e/support/hltb.ts` are that wait. The backfill spec has to blank the columns
in psql first, because a title that predates the feature is a state the app has no way to reach.
`awaitChecked` reads `hltb_checked_at` straight out of Postgres, since a refused match changes no
other field and nothing on the wire carries that column — which is the same reason it exists.

**`log_entries.hours_played` is not this number and does not unlock this sort.** Yours is how long
*you* took on one pass; `sort=hours` means "how long does this take", which is a property of the
title.
