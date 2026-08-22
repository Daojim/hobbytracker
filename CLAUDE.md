# HobbyTracker

A personal hobby-tracking and journaling app. Games first; movies, TV, anime, books and music
follow. It doubles as a portfolio piece, so structure and explainability count as much as
working code — prefer the version that is easy to justify in a review over the version that is
merely shorter.

## Where things stand

**The board is complete, the drawer's five gaps are closed, and so is the round of four things
daily use turned up after them.** Backend 187 tests, frontend 177 Vitest tests, 34 Playwright
specs — all green.

Currently on branch **`living-with-the-board`**, off `journal-notes` — which is finished and
still unmerged, so open its PR before this one. Every step below is done.

**HowLongToBeat is next**, and nothing is holding it up. Its backfill rail is already built: see
`POST /api/games/refresh` under **Genres and colour**.

Six plans, all worth reading before touching this:
`C:\Users\jimmy\.claude\plans\project-context-i-m-building-nifty-mango.md` is the original board
plan; `i-had-a-previous-melodic-nebula.md` beside it is the timezone and timestamp work that
interrupted it; `look-at-claude-md-and-radiant-wreath.md` is the five drawer gaps and the
reasoning behind each; `i-want-to-continue-wiggly-toucan.md` is how they were built;
`there-are-a-few-reflective-balloon.md` is the four that came after.

1. ~~Scaffold `frontend/`~~ — Vite 8 + React 19 + TS, Tailwind v4, TanStack Query, react-router.
2. ~~API client + Vitest tests~~ — `src/api/` mirrors `Contracts/`, 32 tests over MSW.
3. ~~Board components~~ — `Column`, `Card`, `SortSelect`, `YearPicker`, and `useBoard` holding
   the writes. Each column fetches itself, which is what makes the year picker narrow Completed
   alone and a sort on one column cost nothing on the other three.
4. ~~The drag, and Playwright specs written red first~~ — dnd-kit, 8 specs in `frontend/e2e/`.
5. ~~Search page~~ — a 300ms debounced input over `searchGames()`, and a button over
   `addToBacklog()`.
6. ~~Journalling from the board~~ — a drawer over the board for rating, notes and date
   correction, plus the earlier passes read-only. See **Journalling** below.
7. ~~Four of the five drawer gaps~~ — the stale-after-a-drag caching bug, the drawer becoming a
   real dialog, deleting a pass, and the platform a pass was played on.
8. ~~Notes become dated journal entries~~ — a `notes` child table, the column migrated in and
   dropped, and a note list per pass in the drawer. The last of the five, and the contract break.
9. ~~Four things using it turned up~~ — closing from Backlog removes a title rather than
   dropping it, rating by slider, your own hours beside HowLongToBeat's, and genres colouring
   the cards. See **Genres and colour**, and the phase of the same name.

**Two things about search worth not re-deriving.** It debounces at 300ms because the API reaches
IGDB on *every* call by design and caches nothing — the debounce is the only thing between typing
"hollow" and six requests. And a result already in your library shows "On your board" rather than
an add button, because a second Backlog entry is not a replay but the card would render it as
one. Knowing that needs the whole library, so `libraryMediaIds()` pages to the end rather than
stopping at the API's maximum page size; capping it would offer to add your hundred-and-first
title twice.

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
| Scope | `/board` and `/search` only. No detail page or year-review page yet |
| Columns | Backlog · Playing · Completed, plus Dropped as a muted 4th, collapsed by default |
| Dropped | close button on a **Playing** card; drag out of the Dropped column to un-drop |
| Close button | On Backlog it **removes** the title; on Playing it drops. **Hidden on Completed and Dropped** |
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
│   ├── vite.config.ts    /api proxy to :5201, and the Vitest config
│   ├── playwright.config.ts  starts the stub, the API and Vite itself
│   ├── e2e/              drag specs, plus the IGDB stub and database helpers
│   └── src/
│       ├── api/          one module per resource, mirroring Contracts/
│       ├── lib/time.ts   instants → Eastern, pinned. Never new Date().getFullYear()
│       ├── board/        the board. keys.ts owns the query key; useBoard owns the writes
│       ├── journal/      the drawer over the board — rating, platform, dates, notes, earlier passes
│       ├── search/       SearchPage + SearchResult, over a debounced IGDB search
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

After a migration adds a column IGDB owns, bring the library you already have up to date —
`curl -X POST http://localhost:5201/api/games/refresh`. See **Genres and colour**.

New migration:
```bash
dotnet ef migrations add <Name> \
  --project backend/src/HobbyTracker.Api --startup-project backend/src/HobbyTracker.Api \
  --output-dir Data/Migrations
```

## Tests

```bash
dotnet test --solution backend/HobbyTracker.slnx    # backend, 187 tests
cd frontend && npm test                             # frontend, 177 tests
cd frontend && npm run test:e2e                     # 34 specs in a real browser
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
| `games` | `media_id` (PK **and** FK to media), `platforms`, `developers`, `genres`, `primary_genre`, `hltb_main_story_hours`, `hltb_id` |
| `log_entries` | `id`, `user_id`, `media_id`, `status`, `position`, `rating`, `platform`, `hours_played`, `started_at`, `completed_at`, `logged_at` |
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

## API

| Route | |
|---|---|
| `GET /api/games?search=&limit=` | search IGDB, upsert, return |
| `GET /api/games/{id}` | one stored game plus its log entries |
| `POST /api/games/refresh` | re-fetch every IGDB title on the board. Maintenance; no UI |
| `PUT /api/games/{mediaId}/genre` | choose the genre that colours a card, or null for automatic |
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
- **Hours played sits beside HowLongToBeat's estimate**, and says *No HowLongToBeat estimate yet*
  until that phase lands — `hltbMainStoryHours` has been on the wire since the schema shipped and
  read by nothing until now. `parseHours` mirrors `PlaytimeHoursAttribute` on the text rather
  than the float, one decimal place further out than the rating for the same reason; the 999.99
  ceiling is a different failure, since overflowing `numeric(5,2)` throws rather than rounding.
- **The genre select is in the header, not the form.** Genre belongs to the title and the form
  submits one `PUT` to the log-entry endpoint, so putting it there would mean writing to two.
  It saves on change. Its blank option names the automatic pick rather than saying "Not
  recorded", because null means *use that one*. Labelled through `htmlFor`/`id` like every other
  field — a wrapping `<label>` makes the select's accessible name absorb its own option text,
  which made `getByLabel('Platform')` match two controls.
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
known. **HowLongToBeat's backfill rides this same rail.**

**Two traps this cost time to find.** EF scaffolds a `NOT NULL text[]` with no default, and
Postgres refuses that on a table with rows in it — `23502`, proven against the real database
before `defaultValueSql: "'{}'"` went in. And the board row reaches genres through a **TPT
downcast added to the two terminal DTO projections only**; `BoardQuery` is untouched, because
that projection is what every `Where` and `OrderBy` on `Latest` is pushed through and when it
stops translating the symptom is an *empty library* rather than an error.

## Phases

Phases are referred to **by name, not by number**, anywhere outside this list. The order has now
changed twice — auth deferred, then HowLongToBeat brought forward — and each reorder silently
invalidated every "by Phase 4" scattered through the code. "once movies exist" stays true however
the list is shuffled.

- **Schema and search — done.** Schema + migration, IGDB integration, `GET /api/games`.
- **The journal — done.** Log-entry CRUD, library and game-detail reads, and the test suite. Its
  UI arrived later, with the board — see **Journalling**.
- **The board — done.** Kanban board frontend: transitions, manual ordering, year filtering and
  the Eastern timezone work on the backend; components, the drag, the search page and the
  journal drawer on the front, with Playwright specs against a real browser. The five gaps found
  by using the drawer — staleness, the dialog, deleting a pass, per-pass platform, and notes as
  dated entries — were unfinished board-phase work and are all closed.
- **Living with the board — done.** Four things daily use turned up once the drawer was finished:
  closing from Backlog removes a title rather than dropping it, rating by slider, your own hours
  beside HowLongToBeat's, and genres from IGDB colouring the cards. Unfinished board-phase work,
  the same as the five drawer gaps, and it built HowLongToBeat's backfill rail a phase early.
- **HowLongToBeat.** Completion times, and the `sort=hours` they unlock. See below. **Next, with
  nothing ahead of it.**
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
| Fetching | On add to the board, plus a backfill pass for what is already there — the rail exists, see **Genres and colour** |

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

**`log_entries.hours_played` is not this number and does not unlock this sort.** Yours is how long
*you* took on one pass; `sort=hours` means "how long does this take", which is a property of the
title and still null on every row. `LibrarySort` stays as it is until HLTB ships.
