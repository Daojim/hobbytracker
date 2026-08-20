# HobbyTracker

A personal hobby-tracking and journaling app. Games first; movies, TV, anime, books and music
follow. It doubles as a portfolio piece, so structure and explainability count as much as
working code — prefer the version that is easy to justify in a review over the version that is
merely shorter.

## Stack

| | |
|---|---|
| API | ASP.NET Core 10 Web API (controllers, not minimal APIs) |
| Data | EF Core 10 + Npgsql 10, PostgreSQL 17 |
| Frontend | React + TypeScript — **Phase 3, not built yet** |
| External data | IGDB v4 (games), authenticated through Twitch |

Pinned packages: `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.3, `Microsoft.EntityFrameworkCore.Design`
10.0.11, `EFCore.NamingConventions` 10.0.1. The `dotnet-ef` CLI must match EF Core (10.0.11).

## Layout

```
/                        monorepo root
├── docker-compose.yml    local Postgres 17
├── global.json           opts dotnet test into Microsoft.Testing.Platform
├── CLAUDE.md             this file
├── frontend/             empty until Phase 3
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
    │   └── Infrastructure/           cross-cutting (exception handling)
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
dotnet test --solution backend/HobbyTracker.slnx
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

Working method: **write the failing test first.** The Phase 2 endpoints were driven that way,
and the backfill suite over Phase 1 code was written before any of them, so the harness was
proven against behaviour already known to work rather than going green on its first run.

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
| `log_entries` | `id`, `user_id`, `media_id`, `status`, `rating`, `notes`, `date_started`, `date_completed` |
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
  detail table that will exist by Phase 4. Nothing enforces the two agree; the catalog service
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
| `GET /api/library?hobby=&status=&page=&pageSize=` | your collection |

**Search** queries IGDB, upserts every result into `media` + `games`, and returns them **in
IGDB's relevance order** (the database has no idea that ordering exists). It hits IGDB on every
call by design — the Phase 3 frontend debounces. Idempotent: running the same search twice must
not change `select count(*) from media`.

The upsert reads then writes, so two identical concurrent searches can race. The partial unique
index turns that into a `23505` rather than a duplicate row; `GameCatalogService` catches it,
clears the change tracker, and re-reads.

**Library is not the catalog.** Searching upserts every IGDB result, so `media` accumulates
everything ever typed into a search box. `/api/library` joins to `log_entries` and returns only
titles you actually recorded something about — one row per title regardless of replays, carrying
`currentStatus`, `entryCount` and `latestRating`. Do not "fix" it to list all of `media`.

**`currentStatus` is the most recent entry's status**, ordered `date_started DESC NULLS LAST,
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

Two mapping traps, both of which fail loudly rather than silently:

- Validation attributes go on record **primary-constructor parameters**, not `[property:]`
  targets. MVC throws `InvalidOperationException` rather than skipping them.
- `LogStatus` needs `JsonStringEnumConverter` (registered in `Program.cs`) to travel as
  `"Completed"` rather than `2`.

List endpoints return `PagedResult<T>` — `{ items, total, page, pageSize }`. Search does not: it
returns a bare array of whatever IGDB ranked, capped by `limit`.

## Phases

- **Phase 1 — done.** Schema + migration, IGDB integration, `GET /api/games`.
- **Phase 2 — done.** Log-entry CRUD, library and game-detail reads, and the test suite.
- **Phase 3.** Google/Discord OAuth and JWT issuance.
- **Phase 4.** React + TypeScript frontend.
- **Phase 5.** Movies/TV/anime/books/music — each a new sibling detail table deriving from
  `Media`, plus its source integration (TMDB, MAL). Add the `source_lu` row with the client.

**Auth was deliberately moved behind logging.** The original plan had it in Phase 2, but
`log_entries.user_id` is already nullable, so the journal works without a line of auth, and
sequencing auth first would have left the app unable to do its job throughout. When auth lands:
backfill `user_id` on existing rows, flip the column to `NOT NULL`, and scope every query in
`LogEntryService` and `LibraryService` to the current user. Treat the nullable `user_id` as
temporary, not as a design decision.

Not built yet, on purpose: auth of any kind, any hobby table besides `Games`, HowLongToBeat
ingestion (the `hltb_*` columns exist so that pass is a backfill, not a migration).

Root `README.md` is still the scaffold placeholder — worth writing before this is shown to
anyone.
