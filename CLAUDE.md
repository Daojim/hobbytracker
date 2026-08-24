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

**Auth is built**, on the `auth-preparations` branch, in five commits taken one at a time:

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

Everything is green and everything has been run: backend 309, frontend 312, Playwright 74.

Ten plans. The current one is
`C:\Users\jimmy\.claude\plans\look-at-claude-md-to-iridescent-rain.md` — the auth phase, and
the section below is what it turned into. Its one deviation is worth knowing: the frontend was
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

**Nothing is half-finished.** The auth work is committed on `auth-preparations` and every suite
is green; it has not been opened as a PR or merged to `main` yet. **Detail and review is the
next phase** — see **Phases**. Four things worth knowing before a first run:

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
| Dropped | close button on a **Playing** card; drag out of the Dropped column to un-drop |
| Close button | On Backlog it **removes** the title; on Playing it drops. **Hidden on Completed and Dropped** |
| Year picker | above the Completed column only; Backlog and Playing ignore it |
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
│       ├── board/        the board. keys.ts owns the query key, sensors.ts owns the drag's
│       │                 activation distance, and useBoard owns the writes
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
dotnet test --solution backend/HobbyTracker.slnx    # backend, 309 tests
cd frontend && npm test                             # frontend, 312 tests
cd frontend && npm run test:e2e                     # 74 specs in a real browser
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
| `games` | `media_id` (PK **and** FK to media), `platforms`, `developers`, `genres`, `primary_genre`, `release_year`, `hltb_main_story_hours`, `hltb_main_extra_hours`, `hltb_completionist_hours`, `hltb_id`, `hltb_checked_at` |
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

**The year filter is a range, not an `EXTRACT`.** `date_part('year', completed_at)` on a
`timestamptz` reads the session's timezone, so the same query would answer differently depending
on how the connection was opened, and a game finished at 8pm on New Year's Eve would count toward
the following year. `LibraryService.SpanOf` turns a year into `[Jan 1 here, next Jan 1 here)` and
compares instants, which is both correct and index-friendly.
`CompletionYearsAsync` cannot do that — it needs a year per row — so it selects the completed
instants and groups them in C#. Postgres can only localise a `timestamptz` through `AT TIME ZONE`,
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
| `GET /api/library/years?hobby=` | years with completions, newest first |
| `POST /api/library/{mediaId}/status` | move a title to a board column — what a drag calls |
| `DELETE /api/library/{mediaId}/current` | take a title off the board — what closing a Backlog card calls |
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


**Closing a Backlog card removes the title; closing a Playing card drops it.** Dropped is a
record of a game you started and gave up on, so it is the right ending for one you were playing
and the wrong one for one you never began — a Backlog card that moved there would be claiming a
playthrough that never happened.

`DELETE /api/library/{mediaId}/current` deletes the current pass and only that one, which covers
both endings with a single rule: a title whose only pass that was leaves the board, because the
library is titles you have logged something against; a title carrying a 2024 completion
underneath goes back to showing it. Nothing checks whether it was the last pass — `BoardQuery`
already filters on `LogEntries.Any()`, so that falls out. A new endpoint rather than reusing the
log-entry delete because a board row holds no entry id, and one read from a card rendered a
moment ago can already name a pass that stopped being current; the server re-reads.

It confirms inline on the card, because a delete is not one drag from undone. **Which card is
asking is held by `BoardPage`, not the card** — refetches remount cards, the same fact that makes
focus go back to the drawer's opener by id — and holding it above the board also means only one
card can be asking at a time, as the drawer's deletes already work.

**A card's surface carries two gestures, and the 8px activation distance is the whole of what
tells them apart.** `useBoardSensors` in `board/sensors.ts` is the one place that decides it:
under the distance the drag never begins and the click lands on whatever button was pressed;
over it dnd-kit adds a capture-phase `click` listener of its own, so the press that moved a card
cannot also open its drawer. Nothing else is needed, and the title button therefore does **not**
stop the pointer — it is most of the card's surface, and swallowing the press there left the drag
only the margins to start from. The close corner does stop it, and that difference is the point:
twenty pixels in the corner is a button and nothing else, where a hand that wobbles past the
threshold would drag the card rather than remove the title.

**The test harness mounts cards under those same sensors**, which is why they are a module rather
than a few lines inside `useBoard`. A bare `DndContext` takes dnd-kit's defaults, and those carry
no activation constraint — every press activates a drag from the first pixel and the click that
follows is swallowed. The moment the title stopped eating its own press, that made the journal
look unopenable in jsdom while working perfectly in a browser.

**Manual ranking** lives in `log_entries.position`, ordered `position ASC, id DESC`. New entries
take `min(position) - 1` for their column (`BoardPositions.TopOfColumnAsync`) so a title just
added appears on top and nothing gets renumbered. `PUT /api/library/order` takes the whole column
top-first rather than a move-and-index: idempotent, no off-by-one arithmetic, and ids that have
since left the column are ignored rather than rejected, because a loaded board can legitimately
be one drag out of date.

**Sorting never writes.** `sort` ∈ `manual` (default) · `added` · `title` · `rating` · `hours`
are read-only views that leave `position` untouched — which is what lets the UI enable dragging
only in manual mode and still guarantee the ranking survives a look at the alphabetical order.

`sort=hours` is HowLongToBeat's **main story** estimate, shortest first, with titles that have no
estimate last — the same treatment an unrated title gets under `sort=rating`, rather than sorting
as though nobody having timed a game meant it took no time. Main story alone, so the sort has one
meaning: *what can I finish this weekend*. It is **not** `log_entries.hours_played`, which is how
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
- **The difference is measured against Main Story alone.** Three deltas is arithmetic rather than
  a reading, and main story is what the card and the *Time to beat* sort both mean by "how long
  does this take". `parseHours` mirrors `PlaytimeHoursAttribute` on the text rather than the
  float, one decimal place further out than the rating for the same reason; the 999.99 ceiling is
  a different failure, since overflowing `numeric(5,2)` throws rather than rounding.
- **The estimate on a card is written `~27 h`** and announced as *About 27 hours to finish*. The
  tilde is doing real work: the drawer prints `31.5 h` for what a pass took *you*, so an unmarked
  number on a card for a game you have not started would read as the same kind of claim. Main
  story only — a card has room for a number, not a table. `formatHours` lives in `src/lib/hours.ts`
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
- **Writing a note invalidates only `gameKey(mediaId)`.** Unlike a save or a pass delete, nothing
  a note does shows on the card — no rating, no count of passes, no date — so the board has
  nothing to hear about.
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
- **Detail and review — next.** Game detail page and the year-in-review page.
- **Other hobbies.** Movies/TV/anime/books/music — each a new sibling detail table deriving from
  `Media`, plus its source integration (TMDB, MAL). Add the `source_lu` row with the client.

**Auth was deferred three times on purpose, and that is now history rather than guidance.** The
original brief had it second. `log_entries.user_id` was nullable, so the journal and the board
worked without a line of auth, and sequencing auth first would have left the app unable to do its
job while it was built. The column is `NOT NULL` now, and the deferral is spent.

The board is built hobby-parameterised (`/api/library?hobby=games`) even though only games
exist, so the other hobbies' boards are a routing change rather than a rewrite.

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
- **The sign-in links are bordered rather than filled, and that is a token decision.** `--accent`
  has no paired foreground, because nothing in the app has ever put text on it — the settings
  menu uses it for radio dots. Inventing `--accent-fg` would mean five new values and five new
  rows in `index.css.test.ts`, for one button.
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
| Numbers | **All three** — Main Story, Main + Extra, Completionist, under HLTB's own names |
| `sort=hours` | **Main Story only**, so the sort has exactly one meaning |
| Where | All three in the drawer; **main story alone on a card**, which has room for a number, not a table |
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
   `/api/X/init`. Today X is `bleed`; it has been `s` and `seek` before. Taking the first
   `fetch(..., {method:"POST"})` instead — the obvious reading, and what the community clients do —
   picks `/api/game/`, which answers **404**. A 404 reads as a wrong URL rather than a wrong rule,
   so it sends you hunting for a path suffix that was never there. `Hltb:FallbackSearchPath` is
   where to correct the next rename without a release.
3. `GET /api/{X}/init?<epoch-ms>` → `{"token":..., "hpKey":"ign_...", "hpVal":...}`. The token
   decodes to `<ms>::<your-ip>|<your-user-agent>|<hpKey>|<hpVal>.<hmac>`.
4. `POST /api/{X}` with `x-auth-token`, `x-hp-key`, `x-hp-val` — **and the body carrying a
   property whose *name* is the hpKey**. That last one is the trap: without it the endpoint
   answers 404, not 403, so a failed anti-bot check looks exactly like a wrong URL. A 403 means
   the token has gone off; re-run the handshake and retry **once**, which is what the site's own
   JavaScript does.

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

- **Its search endpoint is `warble`, pointedly not `bleed`.** `bleed` is what
  `Hltb:FallbackSearchPath` holds, so naming the stub's endpoint after the real one would let the
  fallback quietly cover for a pair rule that had stopped working. Checked by breaking it: strip
  the `/init` reference out of the bundle and **all eight specs fail**.
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
