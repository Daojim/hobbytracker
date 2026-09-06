# HobbyTracker

A personal hobby-tracking and journaling app. Games first; movies, TV, anime, books and music
follow. It doubles as a portfolio piece, so structure and explainability count as much as working
code — prefer the version that is easy to justify in a review over the version that is merely
shorter.

**Three documents, and they do different jobs.** `README.md` says what the app is and why the
interesting decisions were made. **This file says how to work in the repo** — what is settled, what
fails quietly, and *which file holds the rest*. **`docs/` is one file per area**, read when the work
touches that area; the map below says which.

Working method the user asked for and has held to since the journal: **write the failing test first,
show it red, then implement.** Not implementation followed by an offer to add tests. Where a rule
exists to prevent something, its test is checked by reintroducing the thing.

## Where a session records what it learned

**In the `docs/` file for the area it touched.** This file changes only when the map gains a file, a
*settled* decision changes, the boot sequence changes, or a new trap earns a line in **What fails
silently**. If none of those four is true, this is the wrong file to append to.

The rule is here because the alternative was measured. On 25 August this file was cut from 172,464
characters to 124,573 — and eight days later it was back to 160,858, because there was exactly one
place to append and every session appended there. **Splitting only helps for as long as the appends
go to the split files.**

## The map

`docs/` is **referenced, not `@`-imported** — an import is inlined at session start, which would
organise the files and save nothing. Nothing below is loaded until something opens it, so **open the
file before editing the code it covers.** Keyed on the path about to be touched, which is the one
thing always known before an edit:

| Touching | Read first |
|---|---|
| `Domain/`, `Data/`, a migration, anything about timestamps or what year a row is in | `docs/data-model.md` |
| `LibraryService`, `LibraryController`, `frontend/src/board/` | `docs/board.md` |
| `frontend/src/journal/`, `LogEntryService`, `NoteService` | `docs/journal.md` |
| `frontend/src/index.css`, `src/theme/`, anything about colour, contrast or width | `docs/design.md` |
| `AuthService`, `AuthController`, `Program.cs`'s auth block, `frontend/src/shell/` | `docs/auth.md` |
| `Dockerfile`, `deploy/`, `PublicOriginMiddleware` | `docs/deploy.md` |
| `Integrations/Igdb/`, `GameCatalogService`, `IgdbRelevance`, `frontend/src/search/`, `board/genres.ts` | `docs/games-igdb.md` |
| `Integrations/Hltb/`, `Services/Hltb*`, `Infrastructure/Hltb*`, `board/estimates.ts`, `journal/HltbPin.tsx` | `docs/games-hltb.md` |

**The last two are the hobby; everything above them is the platform.** That is the axis the split
was made on, because the next phase is a second hobby — so `docs/games-igdb.md` is the shape
`docs/movies-tmdb.md` will take, and the platform files should need no new sections for it.

## What exists

Everything below is built, merged and green. Nothing is half-finished.

| | | |
|---|---|---|
| **The board** | Four columns, drag or a card's `⋯` menu, manual ranking, per-column sort, one year control over the whole board | `docs/board.md` |
| **The journal** | A drawer over the board in three ruled bands — the game, the pass, the notes. Rating, platform, dates, hours, dated notes, every earlier pass | `docs/journal.md` |
| **IGDB search** | A bar above the board. Two queries merged and re-ranked, mods and bundles filtered | `docs/games-igdb.md` |
| **HowLongToBeat** | Four completion figures, a matcher that refuses rather than guesses, a queue, a backfill, and a pin for when it refuses | `docs/games-hltb.md` |
| **The design layer** | Semantic tokens, eight themes, two densities, and a board that works from 768px up | `docs/design.md` |
| **Auth** | Google and Discord, an httpOnly cookie, and every pass and note scoped to whoever wrote it | `docs/auth.md` |
| **Deployment** | One Dockerfile, a compose file, Caddy in front, and an origin the app is told rather than left to guess | `docs/deploy.md` |
| **The schema** | Table-Per-Type over a shared `Media`, an Eastern journal clock, and instants rather than dates | `docs/data-model.md` |

**Detail and review is the next phase** — a game detail page and a year in review. See **What is
next**, which also lists the smaller things named but not built.

## Start here

Five things that will otherwise cost a first run an hour.

- **Sign-in and metadata credentials are all required to boot.** Google *and* Discord, IGDB *and*
  TMDB. The host fails deliberately and names the missing key; that is `ValidateOnStart`, not a bug
  to work around.
- **Use http://localhost:5173, not the API's port.** The whole sign-in has to stay on one origin, and
  the Vite proxy is what makes that true. See **The five traps** in `docs/auth.md`.
- **Docker has to be up before the e2e suite is.** `docker compose up -d db`, and the daemon itself if
  Docker Desktop is not running — Playwright reports a database that is not there as the same
  unhelpful *"Process from config.webServer was not able to start"* that a build lock does.
- **A `dotnet run` of your own no longer stops the e2e suite,** but it does still stop `dotnet test`.
  See **Tests**.
- **Restart the API after pulling anything.** A running `dotnet run` goes on executing the binary it
  started with. Obvious written down, and not obvious at the time — it is most of why the
  HowLongToBeat repairs looked as though they had not worked, because the half of that feature you
  would test by hand (pinning an id) needs no restart to keep working. See **X may have slashes in
  it** in `docs/games-hltb.md`.

```bash
docker compose up -d db                      # Postgres on localhost:5432

# One-time: IGDB credentials. These are Twitch credentials — register an app at
# https://dev.twitch.tv/console/apps. Never put them in appsettings.json.
dotnet user-secrets set "Igdb:ClientId" "..."     --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Igdb:ClientSecret" "..." --project backend/src/HobbyTracker.Api

# One-time: TMDB credentials. One token, not a pair — TMDB's v4 read access token, from
# https://www.themoviedb.org/settings/api. No handshake and no expiry, which is why there is
# no auth handler behind it where IGDB has one.
dotnet user-secrets set "Tmdb:AccessToken" "..." --project backend/src/HobbyTracker.Api

# One-time: sign-in credentials, one pair per provider. Both are required. Register the apps at
# https://console.cloud.google.com/apis/credentials and
# https://discord.com/developers/applications, each with
# http://localhost:5173/api/auth/{provider}/callback as an authorised redirect URI — the
# frontend's port, not the API's.
dotnet user-secrets set "Auth:Google:ClientId" "..."      --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Google:ClientSecret" "..."  --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Discord:ClientId" "..."     --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Discord:ClientSecret" "..." --project backend/src/HobbyTracker.Api

dotnet ef database update --project backend/src/HobbyTracker.Api --startup-project backend/src/HobbyTracker.Api
dotnet run --project backend/src/HobbyTracker.Api   # http://localhost:5201

cd frontend && npm install && npm run dev           # http://localhost:5173
```

**No provider app to hand?** The e2e Google stub doubles as a local provider:
`node frontend/e2e/support/google-stub.mjs`, then point `Auth:Google:AuthorizationEndpoint`,
`TokenEndpoint` and `UserInfoEndpoint` at `http://localhost:5397/o/oauth2/v2/auth`, `/token` and
`/v1/userinfo` in user-secrets. `dotnet user-secrets remove` them to go back to the real thing.

`docker compose exec db psql -U admin -d hobbytracker` for a shell. Credentials are `admin`/`password`
— a localhost throwaway, which is why they sit in `appsettings.Development.json` while the IGDB and
sign-in secrets do not.

**Every route is `[Authorize]`d, so a bare `curl` gets a 401** — including the two maintenance refresh
routes. Sign in in the browser and call them from its console, or drive `curl` with a cookie jar:

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

**After a migration that adds a column IGDB owns, run `POST /api/games/refresh`** — `media` rows are
only ever written by a search, so a new column stays empty on the library you already have until
something goes and asks. HowLongToBeat has its own, which answers immediately rather than when the
work is done: `POST /api/games/hltb/refresh`. See **The backfill is a thing you run** in
`docs/games-hltb.md`.

## Stack

| | |
|---|---|
| API | ASP.NET Core 10 Web API (controllers, not minimal APIs) |
| Data | EF Core 10 + Npgsql 10, PostgreSQL 17 |
| Frontend | React 19 + TypeScript, Vite 8, Tailwind v4, TanStack Query, dnd-kit |
| External data | IGDB v4 (games) through Twitch; HowLongToBeat by scrape |

Pinned: `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.3, `Microsoft.EntityFrameworkCore.Design`
10.0.11, `EFCore.NamingConventions` 10.0.1. The `dotnet-ef` CLI must match EF Core (10.0.11).

**All package versions live in `backend/Directory.Packages.props`** — add a `PackageVersion` there and
a bare `PackageReference` (no `Version`) in the csproj. `CentralPackageTransitivePinningEnabled` is on
deliberately: without it the test project resolves EF Core 10.0.4 (Npgsql's declared minimum) while
the API resolves 10.0.11 via the Design package, which does not flow across a `ProjectReference`.

## Layout and conventions

```
/                        monorepo root
├── Dockerfile            two targets: the API, and Caddy serving the built SPA
├── .dockerignore         keeps a Windows bin/ and node_modules out of the build context
├── docker-compose.yml    local Postgres 17
├── deploy/               compose.yml, Caddyfile, .env.example, scripts/backup.sh
├── global.json           opts dotnet test into Microsoft.Testing.Platform
├── frontend/
│   ├── index.html        stamps the chosen theme before the bundle loads. See Design system
│   ├── vite.config.ts    /api proxy to :5201, and the Vitest config
│   ├── playwright.config.ts  starts three stubs, the API and Vite itself
│   ├── e2e/              specs, plus the IGDB, HowLongToBeat and OAuth stubs
│   └── src/
│       ├── api/          one module per resource, mirroring Contracts/
│       ├── lib/time.ts   instants → Eastern, pinned. Never new Date().getFullYear()
│       ├── lib/hours.ts  formatHours — display, so board/ need not reach into journal/
│       ├── lib/useWheelStep.ts  a non-passive wheel listener; React's onWheel cannot cancel
│       ├── lib/useOverlayHistory.ts  the drawer's openness as a history entry, so Back closes it
│       ├── board/        keys.ts owns every query key, columns.ts the four columns,
│       │                 sensors.ts the drag's activation distance, useBoard the writes
│       ├── journal/      the drawer over the board
│       ├── search/       the bar and result strip above the board
│       ├── shell/        header, sign-in screen, session gate, hobbies, providers
│       ├── theme/        the eight themes, two densities, and the menu that picks them
│       └── test/         MSW server, fixtures, and the render helper
└── backend/
    ├── Directory.Packages.props   ALL package versions (central management)
    ├── src/HobbyTracker.Api/
    │   ├── Program.cs        composition root — DI wiring lives here, nowhere else
    │   ├── Domain/           EF entities, no attributes, no persistence concerns
    │   ├── Data/             DbContext, SeedData, Configurations/, Migrations/
    │   ├── Integrations/Igdb/   client, auth handler, wire DTOs
    │   ├── Integrations/Hltb/   session, client, throttle, wire DTOs
    │   │                        (no Integrations/Auth: the OAuth handler is the framework's)
    │   ├── Services/         orchestration (IGDB → database → DTO), and AuthService
    │   ├── Contracts/        what the API accepts and returns
    │   ├── Controllers/
    │   └── Infrastructure/   cross-cutting: exception handlers, the journal clock, JSON,
    │                         the HowLongToBeat queue + worker, AuthOptions, ICurrentUser
    └── tests/HobbyTracker.Api.Tests/
        ├── Infrastructure/   container fixture, host factory, fakes, TestAuthHandler
        └── Data/  Services/  Integrations/  Endpoints/
```

**The layering rule worth keeping: IGDB wire types never leave `Integrations/Igdb`, and EF entities
never leave the service layer.** Controllers speak `Contracts/` only.

Table and column names are snake_case, applied by `EFCore.NamingConventions`
(`UseSnakeCaseNamingConvention()` in `Program.cs`). Explicit `ToTable()` calls still win, which is how
the lookup tables keep their `_lu` suffix.

## Tests

```bash
dotnet test --solution backend/HobbyTracker.slnx    # backend
cd frontend && npm test                             # frontend
cd frontend && npm run test:e2e                     # a real browser
```

Note `--solution`: the .NET 10 SDK's Microsoft.Testing.Platform mode (opted into via `global.json`)
takes it, where the old VSTest mode took a bare path. The backend suite starts its own throwaway
Postgres via Testcontainers, so it neither needs nor touches the docker-compose database — but it does
need Docker running. A full run is under ten seconds.

**A dev server blocks a build, and the ports being one apart never saves you.** Windows will not let a
build overwrite `bin/Debug/net10.0/HobbyTracker.Api.exe` while a `dotnet run` of yours is executing
it. It arrives as `MSB3027` buried inside a web server that Playwright describes only as *"Process
from config.webServer was not able to start"*. **`BaseOutputPath: 'bin/e2e/'` in
`playwright.config.ts` already holds the e2e run**, and three things sit behind that one line:

- **It is an environment variable, not a `-p:` flag.** MSBuild reads the environment as properties,
  and that API web server is *two* dotnet invocations chained — the `dotnet ef database update` in
  front has nowhere to take an MSBuild flag, and it is the one that fails first.
- **`obj/` stays shared on purpose.** The compilation is identical either way, so only the copy
  destination differs and the second build is a copy rather than a rebuild. `bin/e2e/` rather than a
  sibling `bin-e2e/`, so the existing `[Bb]in/` rule in `.gitignore` already covers it.
- **Reproducing the lock needs a `touch`.** With nothing changed MSBuild skips the copy, never
  attempts the locked file, and the suite passes while telling you nothing.

**`dotnet test` has no such fix and hits the same lock** — one environment variable at the call site,
because unlike the e2e run this is a thing you type rather than a thing that runs itself. Stopping the
dev server works just as well, and the default path is the right one when nothing is holding it, so do
not put this in a config file:

```bash
BaseOutputPath='bin/testrun/' dotnet test --solution backend/HobbyTracker.slnx
```

Choices worth not re-litigating:

- **Real Postgres, not in-memory or SQLite.** What is worth testing here is Postgres-specific: the
  partial unique index behind upsert idempotency, the `23505` the upsert recovers from, `text[]`
  columns, check constraints. A fake provider passes tests production fails.
- **Migrations, not `EnsureCreated`**, which builds DDL from the model and skips migrations entirely,
  so anything expressed only in a migration would vanish.
- **Respawn ignores `hobby_lu` and `source_lu`, and only those.** They are migration-managed reference
  data whose ids `SeedData` exposes as compile-time constants; wiping them between tests shows up as
  baffling foreign-key failures. **`users` is deliberately not on that list**: each test makes its own,
  which is what lets one test act as two people.
- **`ApiFactory` runs under a "Testing" environment**, so `appsettings.Development.json` and
  user-secrets do not load and real IGDB credentials cannot leak into a run.
- **No `Microsoft.NET.Test.Sdk` or `xunit.runner.visualstudio`.** Those make the project support VSTest
  as well as MTP, which is the mixed configuration the .NET 10 SDK refuses to run.
- **Shouldly, not FluentAssertions** — v8+ of the latter is Xceed-owned and "all rights reserved".

The frontend suite is Vitest over **MSW**, with no handlers registered by default and
`onUnhandledRequest: 'error'` — a request the test did not state is a failure, not a silent
pass-through. `src/test/library.ts` stubs a whole board in one call, because a component test would
otherwise have to state four column requests and the year list before it could assert anything.

**The drag gets a real browser.** jsdom has no layout and no pointer events, so a dnd-kit assertion
there passes or fails for reasons unrelated to whether dragging a card works. `npm run test:e2e`
starts five servers itself — no manual setup beyond `docker compose up -d db`: a **HowLongToBeat
stub** on :5398 with `Hltb__MinSecondsBetweenRequests=0` (see **Testing it** in
`docs/games-hltb.md`); an **OAuth provider stub** on :5397 (see **The test harnesses** in
`docs/auth.md`); an **IGDB stub** on :5399, which is what makes
"seed through the API, never IGDB" possible at all, since `media` rows are *only* ever written by a
search; **the API** on :5202 under `ASPNETCORE_ENVIRONMENT=E2E`; and **Vite** on :5174 with
`VITE_API_TARGET` pointed at :5202. Two things about that wiring fail quietly:

- **`--no-launch-profile` matters** — without it `launchSettings.json` pins :5201 and quietly wins over
  `ASPNETCORE_URLS`.
- **The migration is chained into the API's command rather than run from `globalSetup`**, because
  Playwright starts its web servers *first*: the API would be answering readiness checks from a
  database that did not exist yet.

**A separate `hobbytracker_e2e` database, on purpose.** The specs truncate between cases and the
development database holds the games you actually logged; one environment variable makes it impossible
for a test run to delete your backlog. Truncation leaves `hobby_lu` and `source_lu` standing, exactly
as Respawn does — but it does take `users` and `auth_identities`, so a run starts with nobody signed up
and one spec cannot be satisfied by the sign-in of the one before it.

**Do not pipe a suite through `tail` — the exit code you get back is `tail`'s.** A run that
reports success while a spec failed is worse than no run at all, and this cost a merge: `npm run
test:e2e | tail -40` came back green with one spec red. Redirect to a file and echo `$?`, or let
the command exit on its own. Both suites are long enough that the temptation is real.

**`journal.spec.ts`'s "a replay starts empty" can go red under full-suite load, and it is a flake.**
It fails inside `writeNote` with *"element was detached from the DOM, retrying"* — a React
re-render race between the locator resolving and the click, not a logic failure. It has passed
alone and in a full re-run since. If it recurs, the fix is waiting for the drawer to settle in
`e2e/support/board.ts`, not anything in `NoteList`.

**`journal.spec.ts`'s "clicking away from the drawer closes it" is a second one, and it is worse.**
The backdrop click does not close the drawer, and the assertion sits there watching it for ten
seconds. **Measured rather than assumed**, on a machine busy with something else: 6 passes to 7
failures over thirteen runs of that spec alone; **1 failure in 3 with the `/board/:hobby` work
reverted**, so it is not that change's doing; and **0 failures in 8** when the same test body is
copied verbatim into a file of its own. That last number is the useful one — it says the cause is
not the click, the timing or the history entry, all of which a probe showed behaving correctly.
Do not "fix" it by adding a wait before the click: a copy with no wait passed 4 of 4.

## Settled — do not reopen

Decided with the user. Each is a real decision with a cost that was accepted, not a default.

| | |
|---|---|
| Shape | Vite + React + TS SPA, client routing. Not Next.js |
| Scope | **`/board/:hobby`, behind a session, plus `/signin`.** Search is a bar on the board, not a screen; `/board` and `/search` both redirect to the games board. No detail or year-review page yet |
| Columns | **Dropped first**, then Backlog · Playing · Completed. `board/columns.ts` is the one list, and the card's menu reads it too |
| Dropped | A muted well **ahead of** the progression rather than after it, collapsed by default. *Move to Dropped* in a card's menu, or a drag — **collapsed or not**; drag out to un-drop |
| Card corner | An **`⋯` options menu on all four columns**: the three columns it is not in, then *Remove from board* |
| Note on a card | The last thing you wrote about a title, **across every pass**, clamped to two lines. Every other field on a card comes from the current pass; this one deliberately does not |
| Year | **One control above the whole board**, defaulting to the latest year there is. Backlog is exempt; the other three filter on the date each is about |
| Ordering | `manual` is the default sort; dragging is enabled **only** in that mode |
| Sort control | **Per column**, not board-wide. Completed reads well by rating while Backlog stays in the order you put it in |
| Libraries | TanStack Query, dnd-kit, Tailwind v4 |
| Dev wiring | Vite proxy `/api` → `:5201`, **`changeOrigin: false`** so sign-in stays on one origin. **No CORS change needed or wanted** |
| Testing | Vitest + RTL + MSW for logic and components; Playwright for the drag |
| E2E harness | Real API and real Postgres on a **separate `hobbytracker_e2e` database**, with IGDB, HowLongToBeat and the OAuth provider stubbed |
| Sessions | An **httpOnly cookie**, and every board route is `[Authorize]`d |
| Timezone | `America/New_York`, server-configured, DST-following |
| Timestamps | `started_at` / `completed_at` / `logged_at` are instants, not dates |

Three more tables live with their areas: `docs/design.md`, `docs/auth.md`, `docs/games-hltb.md`.

## What fails silently

Each of these is invisible while it is happening — an empty board, a green suite over broken code, a
500 on a request that had nothing wrong with it. **The reason in full lives in the file named beside
it**; what is here is the tripwire, and a tripwire only has to fire *before* the mistake rather than
explain it.

A trap earns a line here if hitting it does **not** require already working in its own area. The rest
— some seventy of them — stay in their own file, and **The map** is what reaches them. Three more are
stated in full further down rather than indexed, because their sections are in this file: the build
lock and the `tail` exit code under **Tests**, and restarting the API after a pull under **Start
here**.

| | |
|---|---|
| **Project board rows with member-init, not a positional record.** EF can decompose `new BoardRow { A = … }` and push a later `Where`/`OrderBy` into SQL; a positional record is opaque to it and every filter on the projected latest entry fails to translate — **surfacing as an empty library, not an error** | `docs/board.md` |
| **TPT downcasts live in the two terminal DTO projections only, never in `BoardQuery`.** Every `Where` and `OrderBy` is pushed through `BoardQuery`, so a downcast that stops translating there **empties the whole board with no error** | `docs/board.md` |
| **Validation attributes go on record primary-constructor parameters**, not `[property:]` targets — MVC throws `InvalidOperationException` rather than skipping them | `docs/board.md` |
| **The sort and the year belong in the query key**, not only in the request. Left out, the cache serves the previous ordering and corrects itself only on the next refetch — a board showing one order while claiming another. A move invalidates the column *prefix* and `'years'`, never the fully-qualified key | `docs/board.md` |
| **`builder.ToTable("games", …)` is the entire mechanism that makes EF choose Table-Per-Type.** Delete that line and EF **silently** falls back to Table-Per-Hierarchy, folding every hobby's columns into `media` behind a discriminator. Nothing errors | `docs/data-model.md` |
| **Npgsql writes only an offset-0 `DateTimeOffset` to `timestamptz`.** Anything else throws `ArgumentException` — a 500, not a validation error | `docs/data-model.md` |
| **`System.Text.Json` reads a bare `"2026-03-03"` as midnight *UTC*** — 7pm on the 2nd here, which is the original timezone bug walking back in through the API | `docs/data-model.md` |
| **The year filter is a range, never an `EXTRACT`.** `date_part('year', …)` on a `timestamptz` reads the *session's* timezone, so the same query answers differently depending on how the connection was opened | `docs/data-model.md` |
| **Tailwind v4 scans source text**, so an interpolated class name generates nothing and the element renders unstyled rather than failing — `` `bg-genre-${x}` `` paints a transparent stripe | `docs/design.md` |
| **A new theme has more lists to join than it looks**, and the one that fails quietly stamps nothing: the theme is offered, chosen, stored, and then repainted after the bundle mounts on every load — the flash the pre-paint script exists to prevent, on the one theme nobody would test for it | `docs/design.md` |
| **`log_entries` and `notes` are yours; `media`, `games` and the lookup tables are shared and must stay shared.** Scoping is an injected `ICurrentUser` at sixteen call sites rather than a query filter, and a missed one shows as a stranger's data on your board, never as an error | `docs/auth.md` |
| **Options captured from `builder.Configuration` while `Program.cs` runs miss any source added afterwards** — which is exactly what `ApiFactory` does. It surfaced once as all 153 endpoint tests 500ing on an empty ClientId | `docs/auth.md` |
| **Data Protection falls back to keys held only in memory when its directory is not writable**, and says so in a log line nobody is reading at the time — so every redeploy signs everybody out | `docs/deploy.md` |
| **`media` rows are only ever written by a search**, so a column added by a migration stays empty on the library you already have until something asks. `POST /api/games/refresh` for IGDB's columns, `POST /api/games/hltb/refresh` for HowLongToBeat's — **neither has any UI, and this has now caught people twice** | `docs/games-hltb.md` |
| **A stub that mirrors only today's shape cannot warn you about tomorrow's.** HowLongToBeat's search endpoint became a two-segment path and a guard refused it; the suite stayed green because the stub was a single segment for as long as the site was | `docs/games-hltb.md` |

## Schema

The tables and their columns. **Why they are shaped this way** — Table-Per-Type and the one line
that makes EF choose it, the decisions that will look arbitrary later, and the Eastern journal clock
— is `docs/data-model.md`.

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

## What is next

**Phases are referred to by name, not by number**, anywhere outside this list. The order has changed
twice — auth deferred, then HowLongToBeat brought forward — and each reorder silently invalidated
every "by Phase 4" scattered through the code. "Once movies exist" stays true however the list is
shuffled.

- [x] **Schema and search** — schema + migration, IGDB integration, `GET /api/games`.
- [x] **The journal** — log-entry CRUD, library and game-detail reads, the test suite.
- [x] **The board** — transitions, manual ordering, the year filter, the Eastern clock, the drag, the drawer.
- [x] **HowLongToBeat** — four figures, a matcher that refuses, the queue, `sort=hours`, the pin, a stub of the whole site.
- [x] **The redesign** — semantic tokens, themes, two densities, the Shelf re-skin, every width, the hobby nav.
- [x] **Auth** — Google and Discord, an httpOnly cookie, sixteen query sites scoped, `user_id NOT NULL`.
- [x] **Living with it** — the last note on a card, the `⋯` menu, removing that removes, a year over the whole board.
- [x] **Deployment** — the origin pin, one Dockerfile, the tunnel behind a profile, keys that outlive the container.
- [x] **A polish pass** — three more themes, a Visual Novel genre, the estimates as a grid, the drawer's three bands.
- [x] **Blood Red, and a note box that answers Enter** — an eighth theme whose *ground* is the colour, and Enter sends.
- [x] **Back closes the drawer, and a drop says when** — the journal's openness as a history entry; Dropped stamps a start.
- [ ] **Detail and review — next.** A game detail page and a year-in-review page.
- [ ] **Filling the board without searching — named, not designed.** See **Discovery** in `docs/games-igdb.md`.
- [ ] **Other hobbies.** Movies/TV/anime/books/music — each a sibling detail table deriving from
      `Media`, plus its source integration (TMDB, MAL). Add the `source_lu` row with the client.

**A completed phase gets one line, because what it *learned* is in the `docs/` file for the area
it touched** — that is the growth rule at work, applied to this list. `README.md`'s roadmap is the
same history written for a reader rather than for a session.

**Auth was deferred three times on purpose, and that is now history rather than guidance.** The
original brief had it second, but `log_entries.user_id` was nullable, so sequencing auth first would
have left the app unable to do its job while it was built. The column is `NOT NULL` now, and the
deferral is spent. The board is built hobby-parameterised (`/api/library?hobby=games`) even though
only games exist, so the other hobbies' boards are a routing change rather than a rewrite.

### The seams a second hobby has to pass through

Audited 5 September 2026 and written down so the movies session does not re-derive it. **The
platform is already generic; what names games is a short and known list.**

**Already generic, and needs nothing.** `?hobby=` is a plain lookup against `hobby_lu`
(`LibraryService.HobbyExistsAsync`), so **`?hobby=movies` is a legal request today** and answers an
empty page. `LogEntryService`, `NoteService`, `BoardPositions`, all three of their controllers, the
whole auth stack, `JournalClock`, every file in `frontend/src/lib/` and `frontend/src/theme/`, and
`api/{library,logEntries,notes}.ts` carry no game concept at all. `SeedData` already seeds all six
hobby rows — only a TMDB **source** row is missing. `DatabaseTestBase.GivenNonGameMediaAsync` already
rehearses "a hobby with no detail table", and `LibraryEndpointTests` uses it.

**Where the generic layer still names games.** The list below is what is left after *the platform
stops naming games*, which closed the five that were pure parameterisation — the route, the query
keys, the search key, the shared board row, and the enrich hook. **What remains needs a second
hobby to exist before it can be written**, which is why it was left:

| | |
|---|---|
| `LibraryService` | five `(row.Media as Game)` downcasts across the two terminal projections, plus the `LibrarySort.Length` arm. Each wants a `?? (row.Media as Movie)!` beside it, in those three places and **nowhere near `BoardQuery`** |
| `Contracts/LibraryItemDto` | `HltbPending` is the last game-only field, and it is meant to be — it is read off `hltb_checked_at` and is already `false` for anything that is not a game |
| `BoardSearch.tsx` | imports `searchGames` directly; `SearchResult` is typed to `Game`. The key is hobby-scoped already, so what is left is the dispatch |
| `EntryDrawer.tsx` / `EntryForm.tsx` | the genre select and `HltbPin` are gated on the detail having loaded rather than on hobby, and the form always renders Hours played and Platform — which a film's pass is not supposed to have at all |
| `board/genres.ts` | one IGDB list, and its field is literally named `igdb` |
| `board/columns.ts` + `EntryDrawer`'s `STATUS_LABEL` | two copies of `InProgress → "Playing"` |
| `board/SortSelect.tsx` | *Time to beat* is the games label for `sort=length` |
| `Card.tsx` | says *playthroughs*, and formats a length in hours |
| `Column.tsx` | polls on `hltbPending` unconditionally, through `board/estimates.ts`. Harmless — the flag is false for a film — but the code path is games-shaped |
| `index.css` | the eleven `--color-genre-*` tokens and `--color-hltb*` are games-only values in the one shared stylesheet |

**Closed by *the platform stops naming games*, so do not go looking for them:** `/board/:hobby` with
`/board` redirecting (`App.tsx`, `boardPath`, `isReadyHobby`); `mediaKey(hobby, id)` replacing
`gameKey`, with the drawer handed its hobby; `['search', hobby, term]`; `LibraryItemDto.LengthHours`
replacing `HltbAllStylesHours` and `sort=hours` becoming `sort=length`; and `IMediaAdded` replacing
the unguarded `hltbQueue.Enqueue` in `LogEntryService.CreateAsync`.

**One thing that is not a seam but will look like one:** the rule that a title's entries order
`logged_at DESC, id DESC` is written out at four call sites that must agree, with no shared helper —
a movies detail service would be the fifth. See **Library is not the catalog** in `docs/board.md`.

### Small things, named so they are not rediscovered

- **Sweep up titles with no headline figure when the worker starts.** The first thing to pick up. See
  **The backfill is a thing you run** in `docs/games-hltb.md`, including the reason it was not
  simply done.
- **Linking a second provider to an existing account.** The schema has been ready since the first
  migration — `auth_identities` is unique on `(provider, provider_user_id)` and many rows may point at
  one user — and a test pins that two identities give one board. What does not exist is the deliberate
  act. Until it does, **the same person at two providers is two accounts**, which is correct rather
  than a gap. **Email is informational and never a login key**, because providers reuse addresses and
  trusting one to merge accounts would let anybody who can get an address at either walk into the
  other's journal.
- **`Auth:AllowNewAccounts` does not exist, and sign-up is wide open.** Correct while this ran on
  localhost; on a public hostname it means anybody who finds the address gets an account. The
  *scoping* is sound — nineteen tests, each checked red — so nobody reads anybody else's journal.
  The exposure is resources: unbounded rows into `media`, the IGDB quota against a 4 req/s limit,
  and unbounded HowLongToBeat lookups **from whatever address the app is deployed on**, at a site
  with a documented history of blocking unofficial clients. That last one is the real risk. Until
  the setting exists the gate belongs *in front of* the app rather than in it. Design when it is
  wanted: a bool on `AuthOptions`, checked in `AuthService.SignInAsync` **before creating a user**
  so existing accounts keep working while it is off, and flippable by environment variable without
  a rebuild. One wrinkle — throwing inside `OnCreatingTicket` surfaces as a 500, and a refusal
  wants a real error path.
- **`Season` is not in the game-type filter**, so "Mario Kart" returns ten *Mario Kart Tour: … Tour*
  seasons and none of the actual games. One id in one clause. Nobody has asked for it.
- **`users.role` is read by nothing.** It defaults to `"user"` and exists for a day that has not come.

## The plan archive

Each phase before the most recent was planned in a file under `C:\Users\jimmy\.claude\plans\`. Those
are **machine-local and outside the repo** — useful history on this machine, absent everywhere else,
and none of them is a source of truth. This file is.

**One of them is not history: `deploying-on-ppserver.md`.** It is current, and it is the source of
truth for how this app is hosted — where it runs, what has to be built first, and which hosting
approaches were already ruled out and why. **Read it before proposing any deployment**; several
obvious ones have been considered and rejected for stated reasons, and re-proposing them is repeated
work. It stays machine-local deliberately, because it describes a private machine: **do not copy it
into this repo, and do not publish it anywhere.**

**A second one is not history either, while the movies branch is open:
`movies-from-tmdb-handoff.md`.** It says where PR 2 got to, what is uncommitted, what breaks right
now, and the order the rest should be done in — the drawer, the genre palette workshop, the e2e
stub, the docs. Read it beside `read-claude-md-and-whatever-cuddly-papert.md`, which is the plan it
is executing. **Delete both when movies merge**; a stale handoff is worse than none.

One is worth a warning if you open it: `for-the-next-part-delightful-alpaca.md`, the HowLongToBeat
plan. Three of its assumptions did not survive contact with the site — it has an `HltbSessionHandler`
mirroring `IgdbAuthHandler`, which is impossible given the body-borne credential; it assumes fetching
by id needs the same handshake, which needs none; and it argues `release_year` was needed to stop
remasters being matched by coin flip, where the ambiguity margin already refuses those safely.
