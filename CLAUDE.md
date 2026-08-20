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
├── CLAUDE.md             this file
├── frontend/             empty until Phase 3
└── backend/
    ├── HobbyTracker.Api.csproj
    ├── Program.cs        composition root — DI wiring lives here, nowhere else
    ├── Domain/           EF entities, no attributes, no persistence concerns
    ├── Data/
    │   ├── HobbyTrackerDbContext.cs
    │   ├── SeedData.cs           lookup rows + their fixed ids
    │   ├── Configurations/       one IEntityTypeConfiguration per entity
    │   └── Migrations/
    ├── Integrations/Igdb/        IGDB client, auth, wire DTOs
    ├── Services/                 orchestration (IGDB → database → DTO)
    ├── Contracts/                what the API returns
    ├── Controllers/
    └── Infrastructure/           cross-cutting (exception handling)
```

The layering rule worth keeping: **IGDB wire types never leave `Integrations/Igdb`, and EF
entities never leave the service layer.** Controllers speak `Contracts/` only.

## Running it

```bash
docker compose up -d db                      # Postgres on localhost:5432

# One-time: IGDB credentials. These are Twitch credentials — register an app at
# https://dev.twitch.tv/console/apps. Never put them in appsettings.json.
dotnet user-secrets set "Igdb:ClientId" "..."     --project backend
dotnet user-secrets set "Igdb:ClientSecret" "..." --project backend

dotnet ef database update --project backend --startup-project backend
dotnet run --project backend                 # http://localhost:5201
```

`docker compose exec db psql -U admin -d hobbytracker` for a shell. Credentials are
`admin`/`password` — a localhost throwaway, which is why they sit in
`appsettings.Development.json` while the IGDB secrets do not.

Startup **fails deliberately** if the IGDB credentials are missing (`ValidateOnStart`), naming
the missing setting. That is the intended behaviour, not a bug to work around.

New migration:
```bash
dotnet ef migrations add <Name> --project backend --startup-project backend --output-dir Data/Migrations
```

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

`GET /api/games?search={title}&limit={n}`

Queries IGDB, upserts every result into `media` + `games`, returns them **in IGDB's relevance
order** (the database has no idea that ordering exists). This hits IGDB on every call by
design — the Phase 3 frontend debounces. Idempotent: running the same search twice must not
change `select count(*) from media`.

The upsert reads then writes, so two identical concurrent searches can race. The partial unique
index turns that into a `23505` rather than a duplicate row; `GameCatalogService` catches it,
clears the change tracker, and re-reads.

## Phases

- **Phase 1 — done.** Schema + migration, IGDB integration, `GET /api/games`.
- **Phase 2.** Google/Discord OAuth and JWT issuance; `Log_Entries` CRUD once real users exist.
  `users.id` is already nullable on `log_entries` to allow the transition.
- **Phase 3.** React + TypeScript frontend.
- **Phase 4.** Movies/TV/anime/books/music — each a new sibling detail table deriving from
  `Media`, plus its source integration (TMDB, MAL). Add the `source_lu` row with the client.

Not built yet, on purpose: auth of any kind, `Log_Entries` endpoints, any hobby table besides
`Games`, HowLongToBeat ingestion (the `hltb_*` columns exist so that pass is a backfill, not a
migration).

Root `README.md` is still the scaffold placeholder — worth writing before this is shown to
anyone.
