# HobbyTracker

A personal hobby-tracking and journaling app. Games first; movies, TV, anime, books and music
follow. It doubles as a portfolio piece, so structure and explainability count as much as
working code — prefer the version that is easy to justify in a review over the version that is
merely shorter.

## Where things stand

**Backend complete, 132 tests green. The board is built and draggable: 65 Vitest tests and 8
Playwright drag specs green. The search page is the current job.**

Currently on branch **`board-components`**, branched off `hltb-priority` rather than `main` —
that branch's phase-reorder commit touches the same paragraphs this work does, and PR #2 was
open for it at the time. Steps 1 to 4 below are done.

Three plans, all worth reading before touching this:
`C:\Users\jimmy\.claude\plans\project-context-i-m-building-nifty-mango.md` is the original board
plan; `i-had-a-previous-melodic-nebula.md` beside it is the timezone and timestamp work that
interrupted it; `look-at-claude-md-and-radiant-wreath.md` is the board components and the drag.

1. ~~Scaffold `frontend/`~~ — Vite 8 + React 19 + TS, Tailwind v4, TanStack Query, react-router.
2. ~~API client + Vitest tests~~ — `src/api/` mirrors `Contracts/`, 32 tests over MSW.
3. ~~Board components~~ — `Column`, `Card`, `SortSelect`, `YearPicker`, and `useBoard` holding
   the writes. Each column fetches itself, which is what makes the year picker narrow Completed
   alone and a sort on one column cost nothing on the other three.
4. ~~The drag, and Playwright specs written red first~~ — dnd-kit, 8 specs in `frontend/e2e/`.
5. **Search page.** `searchGames()` and `addToBacklog()` are already built and tested; the page
   is a debounced input over the first and a button over the second. `SearchPage` is still the
   placeholder and should be replaced wholesale, not extended.

**The column query key is `['library', hobby, status, { sort, year }]`** — see
`frontend/src/board/keys.ts`, which is the only place it is spelled out. The sort and the year
belong in the key and not just in the request: leaving them out serves the previous ordering
from cache and corrects itself only on the next refetch, which is a board showing one order
while claiming another. `useBoard` builds the same key to write into, so the two cannot drift.

Decisions already made with the user, **settled — do not reopen**:

| | |
|---|---|
| Shape | Vite + React + TS SPA, client routing. Not Next.js |
| Scope | `/board` and `/search` only. No detail page or year-review page yet |
| Columns | Backlog · Playing · Completed, plus Dropped as a muted 4th, collapsed by default |
| Dropped | close button on a card; drag out of the Dropped column to un-drop |
| Close button | **hidden on Completed and Dropped cards** — meaningless on both |
| Year picker | above the Completed column only; Backlog and Playing ignore it |
| Ordering | `manual` is the default sort; dragging is enabled **only** in that mode |
| Sort control | **Per column**, not board-wide. Completed reads well by rating while Backlog stays in the order you put it in |
| Libraries | TanStack Query, dnd-kit, Tailwind v4 |
| Dev wiring | Vite proxy `/api` → `:5201`. **No CORS change needed or wanted** |
| Testing | Vitest + RTL + MSW for logic and components; Playwright for the drag |
| E2E harness | Real API and real Postgres on a **separate `hobbytracker_e2e` database**, with IGDB stubbed. See **Tests** |
| Timezone | `America/New_York`, server-configured, DST-following. See **Time** |
| Timestamps | `started_at` / `completed_at` / `logged_at` are instants, not dates |

Working method the user asked for and has held to since the journal: **write the failing test
first, show it red, then implement.** Not implementation followed by an offer to add tests.
## Stack

| | |
|---|---|
| API | ASP.NET Core 10 Web API (controllers, not minimal APIs) |
| Data | EF Core 10 + Npgsql 10, PostgreSQL 17 |
| Frontend | React 19 + TypeScript, Vite 8, Tailwind v4, TanStack Query, dnd-kit — **the board, done** |
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
│   ├── vite.config.ts    /api proxy to :5201, and the Vitest config
│   ├── playwright.config.ts  starts the stub, the API and Vite itself
│   ├── e2e/              drag specs, plus the IGDB stub and database helpers
│   └── src/
│       ├── api/          one module per resource, mirroring Contracts/
│       ├── lib/time.ts   instants → Eastern, pinned. Never new Date().getFullYear()
│       ├── board/        the board. keys.ts owns the query key; useBoard owns the writes
│       ├── search/       SearchPage — placeholder
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
    │   ├── Services/                 orchestration (IGDB → database → DTO)
    │   ├── Contracts/                what the API accepts and returns
    │   ├── Controllers/
    │   └── Infrastructure/           cross-cutting (exception handling, journal clock, JSON)
    └── tests/HobbyTracker.Api.Tests/
        ├── Infrastructure/           container fixture, host factory, fakes
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

dotnet ef database update --project backend/src/HobbyTracker.Api --startup-project backend/src/HobbyTracker.Api
dotnet run --project backend/src/HobbyTracker.Api   # http://localhost:5201

# Frontend. Needs the API running for anything to load; the proxy expects it on :5201.
cd frontend && npm install && npm run dev     # http://localhost:5173
```

`docker compose exec db psql -U admin -d hobbytracker` for a shell. Credentials are
`admin`/`password` — a localhost throwaway, which is why they sit in
`appsettings.Development.json` while the IGDB secrets do not.

Startup **fails deliberately** if the IGDB credentials are missing (`ValidateOnStart`), naming
the missing setting. That is the intended behaviour, not a bug to work around.

New migration:
```bash
dotnet ef migrations add <Name> \
  --project backend/src/HobbyTracker.Api --startup-project backend/src/HobbyTracker.Api \
  --output-dir Data/Migrations
```

## Tests

```bash
dotnet test --solution backend/HobbyTracker.slnx    # backend, 132 tests
cd frontend && npm test                             # frontend, 65 tests
cd frontend && npm run test:e2e                     # the drag, 8 specs in a real browser
```

Note `--solution`: the .NET 10 SDK's Microsoft.Testing.Platform mode (opted into via
`global.json`) takes it, where the old VSTest mode took a bare path.

The suite starts its own throwaway Postgres via Testcontainers, so it neither needs nor touches
the docker-compose database. It does need Docker running. A full run is under ten seconds.

Choices worth not re-litigating:

- **Real Postgres, not in-memory or SQLite.** What is worth testing here is Postgres-specific:
  the partial unique index behind upsert idempotency, the `23505` the upsert recovers from,
  `text[]` columns, check constraints. A fake provider passes tests production fails.
- **Migrations, not `EnsureCreated`.** `EnsureCreated` builds DDL from the model and skips
  migrations entirely, so anything expressed only in a migration would vanish.
- **Respawn ignores `hobby_lu` and `source_lu`.** They are migration-managed reference data
  whose ids `SeedData` exposes as compile-time constants; wiping them between tests shows up as
  baffling foreign-key failures.
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
`npm run test:e2e` starts three servers itself — no manual setup beyond `docker compose up -d db`:

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
standing, exactly as Respawn does in the backend suite and for the same reason.

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
| `games` | `media_id` (PK **and** FK to media), `platforms`, `developers`, `hltb_main_story_hours`, `hltb_id` |
| `log_entries` | `id`, `user_id`, `media_id`, `status`, `position`, `rating`, `notes`, `started_at`, `completed_at`, `logged_at` |
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

## API

| Route | |
|---|---|
| `GET /api/games?search=&limit=` | search IGDB, upsert, return |
| `GET /api/games/{id}` | one stored game plus its log entries |
| `GET /api/log-entries?mediaId=&status=&page=&pageSize=` | the journal, newest first |
| `POST /api/log-entries` | record a pass through a title |
| `GET /api/log-entries/{id}` | |
| `PUT /api/log-entries/{id}` | full replacement |
| `DELETE /api/log-entries/{id}` | |
| `GET /api/library?hobby=&status=&year=&sort=&page=&pageSize=` | your collection / one board column |
| `GET /api/library/years?hobby=` | years with completions, newest first |
| `POST /api/library/{mediaId}/status` | move a title to a board column — what a drag calls |
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

**`currentStatus` is the most recent entry's status**, ordered `started_at DESC NULLS LAST,
id DESC`: a replay under way beats an old completion, a dated entry beats an undated one, and
the id breaks ties. `?status=` filters on that, not on "has ever been" — a game completed in
2024 and being replayed now appears under `InProgress` and must not also appear under
`Completed`. EF turns the nested `First()` into a LATERAL join, not N queries.

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

**Manual ranking** lives in `log_entries.position`, ordered `position ASC, id DESC`. New entries
take `min(position) - 1` for their column (`BoardPositions.TopOfColumnAsync`) so a title just
added appears on top and nothing gets renumbered. `PUT /api/library/order` takes the whole column
top-first rather than a move-and-index: idempotent, no off-by-one arithmetic, and ids that have
since left the column are ignored rather than rejected, because a loaded board can legitimately
be one drag out of date.

**Sorting never writes.** `sort` ∈ `manual` (default) · `added` · `title` · `rating` are
read-only views that leave `position` untouched — which is what lets the UI enable dragging only
in manual mode and still guarantee the ranking survives a look at the alphabetical order.
`sort=hours` deliberately does not exist while `hltb_main_story_hours` is null on every row.

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

## Phases

Phases are referred to **by name, not by number**, anywhere outside this list. The order has now
changed twice — auth deferred, then HowLongToBeat brought forward — and each reorder silently
invalidated every "by Phase 4" scattered through the code. "once movies exist" stays true however
the list is shuffled.

- **Schema and search — done.** Schema + migration, IGDB integration, `GET /api/games`.
- **The journal — done.** Log-entry CRUD, library and game-detail reads, and the test suite.
- **The board — in progress.** Kanban board frontend. Backend done (transitions, ordering, year
  filtering, and the Eastern timezone/timestamp work). The board itself is done: components, the
  drag, and Playwright specs against a real browser. **Only the search page remains.**
- **HowLongToBeat.** Completion times, and the `sort=hours` they unlock. See below.
- **Auth.** Google/Discord OAuth and JWT issuance.
- **Detail and review.** Game detail page and the year-in-review page.
- **Other hobbies.** Movies/TV/anime/books/music — each a new sibling detail table deriving from
  `Media`, plus its source integration (TMDB, MAL). Add the `source_lu` row with the client.

**Auth keeps being deliberately deferred, three times now.** The original brief had it second.
`log_entries.user_id` is already nullable, so both the journal and the board work without a
line of auth, and sequencing auth first would have left the app unable to do its job while it
was built. This is a considered choice, not an oversight — do not propose bringing it forward
without asking.

When auth does land: backfill `user_id` on existing rows, flip the column to `NOT NULL`, and
scope every query in `LogEntryService` and `LibraryService` to the current user. Treat the
nullable `user_id` as temporary, not as a design decision.

The board is built hobby-parameterised (`/api/library?hobby=games`) even though only games
exist, so the other hobbies' boards are a routing change rather than a rewrite.

### HowLongToBeat, moved ahead of the other hobbies

Decided with the user, **settled — do not reopen**:

| | |
|---|---|
| Position | Straight after the board, ahead of auth. `sort=hours` lands with data behind it |
| Numbers | **Main Story only.** Uses the column that exists; no migration, and `sort=hours` has one meaning |
| Matching | Auto-accept above a confidence threshold; **below it, leave null** |
| Fetching | On add to the board, plus a backfill pass for what is already there |

It is genuinely a backfill: `games.hltb_main_story_hours` (`numeric(5,2)`) and `games.hltb_id`
already exist, `GameDto` and `GameDetailDto` already expose them, and `GameCatalogService`
deliberately leaves both alone when it upserts from IGDB — so re-searching a game cannot wipe its
hours.

**HLTB is not an API, and this is the thing to design around.** IGDB is documented,
authenticated, and versioned. HLTB is a website with an internal endpoint that unofficial clients
wrap and that has broken those clients repeatedly. Establish the current access shape with a
spike *before* planning the rest — it is the only real unknown in the feature. Then isolate it
behind `IHltbClient` in `Integrations/Hltb/`, mirroring `IIgdbClient`, so the blast radius when it
breaks is one folder. Nothing a user does should ever block on it, and `HltbException` should
become a 502 the way `IgdbException` does.

`hltb_id` is what makes that survivable: a confident match is stored once and never looked up
again, so an outage costs new games only.

**Matching is the work; fetching is not.** IGDB and HLTB disagree about titles constantly —
remasters, anniversaries, subtitle punctuation. A wrong number is worse than no number here,
because the whole point is answering "can I finish this before the weekend is out". So a match
below the threshold writes nothing and the card simply shows no hours, which is honest. Correction
for a bad match arrives with the detail page; until then, a wrong `hltb_id` is fixed in psql.

**Do not fetch at search time.** Searching IGDB returns up to 500 results and upserts every one;
a lookup per result would be slow and rude to a service that never agreed to serve us.

`sort=hours` stays absent from `LibrarySort` until this ships. A sort control that visibly does
nothing is worse than an absent one.
