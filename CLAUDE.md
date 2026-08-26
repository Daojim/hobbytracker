# HobbyTracker

A personal hobby-tracking and journaling app. Games first; movies, TV, anime, books and music
follow. It doubles as a portfolio piece, so structure and explainability count as much as working
code — prefer the version that is easy to justify in a review over the version that is merely
shorter.

**`README.md` says what the app is and why the interesting decisions were made. This file says how to
work in the repo** — what is settled, what fails quietly, and where each rule lives. Where a reason
already sits in a comment beside the code, this file states the rule and names the file rather than
repeating the argument; where a mistake would fail *silently*, the reason is here in full, because by
then it is too late to go looking.

Working method the user asked for and has held to since the journal: **write the failing test first,
show it red, then implement.** Not implementation followed by an offer to add tests. Where a rule
exists to prevent something, its test is checked by reintroducing the thing.

## What exists

Everything below is built, merged and green. Nothing is half-finished.

| | |
|---|---|
| **The board** | Four columns, drag or a card's `⋯` menu, manual ranking, per-column sort, one year control over the whole board. See **The board and its API** |
| **The journal** | A drawer over the board — rating, platform, dates, hours, dated notes, every earlier pass. See **The journal drawer** |
| **IGDB search** | A bar above the board. Two queries merged and re-ranked, mods and bundles filtered. See **IGDB and search** |
| **HowLongToBeat** | Four completion figures, a matcher that refuses rather than guesses, a queue, a backfill, and a pin for when it refuses. See **HowLongToBeat** |
| **The design layer** | Semantic tokens, seven themes, two densities, and a board that works from 768px up. See **Design system** |
| **Auth** | Google and Discord, an httpOnly cookie, and every pass and note scoped to whoever wrote it. See **Auth** |
| **Deployment** | One Dockerfile, a compose file, Caddy in front, and an origin the app is told rather than left to guess. See **Deploying it** |

**Detail and review is the next phase** — a game detail page and a year in review. See **What is
next**, which also lists the smaller things named but not built.

## Start here

Five things that will otherwise cost a first run an hour.

- **Sign-in credentials are required to boot.** Google *and* Discord. The host fails deliberately and
  names the missing key; that is `ValidateOnStart`, not a bug to work around.
- **Use http://localhost:5173, not the API's port.** The whole sign-in has to stay on one origin, and
  the Vite proxy is what makes that true. See **The five traps** under **Auth**.
- **Docker has to be up before the e2e suite is.** `docker compose up -d db`, and the daemon itself if
  Docker Desktop is not running — Playwright reports a database that is not there as the same
  unhelpful *"Process from config.webServer was not able to start"* that a build lock does.
- **A `dotnet run` of your own no longer stops the e2e suite,** but it does still stop `dotnet test`.
  See **Tests**.
- **Restart the API after pulling anything.** A running `dotnet run` goes on executing the binary it
  started with. Obvious written down, and not obvious at the time — it is most of why the
  HowLongToBeat repairs looked as though they had not worked, because the half of that feature you
  would test by hand (pinning an id) needs no restart to keep working. See **X may have slashes in
  it**.

```bash
docker compose up -d db                      # Postgres on localhost:5432

# One-time: IGDB credentials. These are Twitch credentials — register an app at
# https://dev.twitch.tv/console/apps. Never put them in appsettings.json.
dotnet user-secrets set "Igdb:ClientId" "..."     --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Igdb:ClientSecret" "..." --project backend/src/HobbyTracker.Api

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
work is done: `POST /api/games/hltb/refresh`. See **The backfill is a thing you run**.

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
│       ├── board/        keys.ts owns every query key, columns.ts the four columns,
│       │                 sensors.ts the drag's activation distance, useBoard the writes
│       ├── journal/      the drawer over the board
│       ├── search/       the bar and result strip above the board
│       ├── shell/        header, sign-in screen, session gate, hobbies, providers
│       ├── theme/        the seven themes, two densities, and the menu that picks them
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
stub** on :5398 with `Hltb__MinSecondsBetweenRequests=0` (see **Testing it**); an **OAuth
provider stub** on :5397 (see **The test harnesses**); an **IGDB stub** on :5399, which is what makes
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

## Settled — do not reopen

Decided with the user. Each is a real decision with a cost that was accepted, not a default.

| | |
|---|---|
| Shape | Vite + React + TS SPA, client routing. Not Next.js |
| Scope | **`/board`, behind a session, plus `/signin`.** Search is a bar on the board, not a screen; `/search` redirects. No detail or year-review page yet |
| Columns | Backlog · Playing · Completed, plus Dropped as a muted 4th, collapsed by default |
| Dropped | *Move to Dropped* in a card's menu, or a drag — **collapsed or not**; drag out to un-drop |
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

Three more tables live with their areas: **Design system**, **Auth** and **HowLongToBeat**.

## Schema

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

**`builder.ToTable("games", …)` in `GameConfiguration` is the entire mechanism** — mapping a
derived entity to its own table is what makes EF choose TPT. **Delete that line and EF silently
falls back to Table-Per-Hierarchy**, folding every hobby's columns into `media` behind a
discriminator. Nothing errors.

Why TPT: `Movies`, `Books` and the rest arrive as sibling detail tables, each with columns
meaningless for the others. TPH would make `media` a swamp of mostly-null columns; TPC would
duplicate the shared columns and make "everything I logged this year" a `UNION` across every
hobby. The cost, stated plainly: polymorphic queries over `Media` need a LEFT JOIN per subtype,
and inserts touch two tables. Both acceptable at personal-catalogue scale. Querying `db.Games` —
the derived `DbSet` — emits an INNER JOIN and is the cheap path.

**The PK column rename goes through the table builder**
(`ToTable("games", t => t.Property(g => g.Id).HasColumnName("media_id"))`), not
`builder.Property(...)`. `Id` is declared on `Media`, so configuring the property directly renames
the column in `media` too and leaves the base table with no `id` at all.

### Decisions that will look arbitrary later

- **`media.hobby_id` is redundant under TPT** — a row in `games` is always hobby=games. Kept on
  purpose: it lets "everything in hobby X" filter on one table instead of LEFT JOINing every
  detail table that will exist once movies do. Nothing enforces the two agree; the catalog
  service sets it from `SeedData.Hobbies`.
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
  true when it was written has to outlive the list it was chosen from.
- **Notes are rows, not a column.** `log_entries.notes` was one nullable text field, so writing a
  second thought destroyed the first — which is not a journal. `written_at` is server-stamped and
  **does not move when a note is rewritten**: the date is when you wrote it, not when you last
  fixed a typo. Cascade delete, because a note belongs to the pass it was written during.
- **`log_entries.hours_played` is per pass**, `numeric(5,2)`, for every reason `platform` is.
  Same precision as `hltb_main_story_hours`, because comparing them is the point. Named "played"
  rather than "to complete" because a pass can be `InProgress` or `Dropped`.
- **The three `hltb_*_hours` columns are `numeric(5,2)`, and null never means nought.**
  HowLongToBeat answers `0` for a game nobody has submitted a time for, which is a different
  claim from "takes no time" — `ck_games_hltb_hours_positive`, the first check constraint on
  `games`, exists to make forgetting to map that fail loudly rather than store a lie. **There is
  no upper bound in it on purpose**: `numeric(5,2)` *throws* past 999.99 rather than rounding, so
  an over-long completionist time — and they exist — has to be dropped to null in the client,
  where a constraint could not help anyway. Only that tier is lost. Any one of the three can be
  null on its own, which is ordinary rather than an error.
- **`games.hltb_checked_at` separates *never asked* from *asked, nothing matched*.** Stamped on a
  miss as well as a hit, which is the entire point of it: without that, the backfill re-asks
  about every unmatchable title on every run, for ever. It is also what makes a second backfill
  answer a count of nought, and what makes the card's poll terminate. See **The card waits for
  its own estimate**.
- **`games.release_year` exists for the matcher and nothing else.** IGDB and HowLongToBeat both
  list "Resident Evil 4" twice under exactly that title, 2005 and 2023, and nothing in the
  strings can tell them apart. Read from IGDB's `first_release_date` in **UTC**, not the journal
  zone, because it is compared against HLTB's `release_world` — a bare year belonging to no
  timezone, so localising would invent a distinction the other side cannot carry.
- **`games.genres` is `text[]`, and `games.primary_genre` is the one you chose.** Null there
  means "use the automatic pick", not "no genre" — which is why the drawer's blank option reads
  *Automatic — Platform* rather than *Not recorded*. Free text up to 50 characters, on
  `log_entries.platform`'s reasoning exactly. Stored alphabetically; IGDB's ordering is not
  meaningfulness ordering, and which one wins is decided on the client. See **Genres and colour**.
- **`rating` is `numeric(3,1)`, 1.0–10.0**, enforced by a check constraint. Decimal on purpose:
  8.5 and 9.6 are the point.
- **Lookup ids are fixed constants**, `ValueGeneratedNever()` + `HasData`. They are part of the
  schema contract, which is why `SeedData.Sources.Igdb` can be used directly instead of paying
  for a lookup query per request.
- **Only `igdb` and `manual` are seeded.** `tmdb`/`mal` get added when their integrations ship —
  a source row with no client behind it reads like a working feature.

**One cosmetic quirk, left alone deliberately.** The two TPT tables get `PK_media` / `PK_games`
while every other primary key is snake_case; `EFCore.NamingConventions` does not rewrite key names
for TPT tables. EF only uses constraint names when generating migrations, so renaming them behind
EF's back would make a future `DROP CONSTRAINT` fail.

## Time

The app records days in **`America/New_York`**, configured as `Journal:TimeZone` in
`appsettings.json` and validated at startup the way the IGDB credentials are — an unresolvable
zone id fails the boot naming the setting, rather than silently falling back to UTC. It is an IANA
id, not a fixed offset, so Eastern is UTC-4 in summer and UTC-5 in winter without anyone having to
remember which.

**Why not UTC.** UTC rolls over at 8pm Eastern in summer and 7pm in winter, so every game finished
in the evening — which is most of them — was stamped with tomorrow's date. That was a four-to-five
hour hole in every day the app is actually used.

**The rule that keeps the rest simple: an instant is stored as an instant, and a zone is applied
only where a human or a calendar question is involved.** The zone is applied in exactly three
places: `?year=`, `GET /api/library/years`, and the UI. *(A release calendar would be the fourth.
That sentence is a tripwire — update it rather than quietly falsifying it. See **Discovery**.)*

`IJournalClock` (`Infrastructure/JournalClock.cs`) wraps `TimeProvider` plus the zone. It exists
so the date rules have something to ask and something a test can stop — `FrozenTimeProvider` is
swapped in by `ApiFactory` exactly as `FakeIgdbClient` is. The transition rules stamp
`IJournalClock.Now` and never ask what day it is.

**`logged_at` is server-stamped and absent from the request contracts.** It records that an entry
was written, which is not something a caller is in a position to assert — the same reasoning that
keeps `mediaId` off the PUT body. It has a `now()` default so a row written by hand in psql is
still valid, but `LogEntryService` sets it explicitly on every insert it makes.

### Three traps, every one of which fails as a 500 or not at all

- **Npgsql will only write a `DateTimeOffset` with offset 0 to `timestamptz`.** Anything else
  throws `ArgumentException` — not a validation error, a 500. The offset is not stored regardless,
  since the column holds an instant, so everything is normalised to UTC at the boundary. This is
  why `JournalTimestampConverter` exists and why `FirstInstantOf` and the test helper `Eastern()`
  both end in `.ToUniversalTime()`.
- **`System.Text.Json` reads a bare `"2026-03-03"` into a `DateTimeOffset` as midnight *UTC*** —
  7pm on the 2nd here, which is the original bug walking back in through the API.
  `JournalTimestampConverter` reads any value carrying neither `Z` nor `±hh:mm` as that
  wall-clock moment *here*, and passes explicit offsets through untouched.
- **The year filter is a range, not an `EXTRACT`.** `date_part('year', completed_at)` on a
  `timestamptz` reads the *session's* timezone, so the same query answers differently depending on
  how the connection was opened, and a game finished at 8pm on New Year's Eve counts toward the
  following year. `LibraryService.SpanOf` turns a year into `[Jan 1 here, next Jan 1 here)` and
  compares instants, which is both correct and index-friendly. `ActivityYearsAsync` cannot do
  that — it needs a year per row — so it selects the instants and groups them in C#: Postgres can
  only localise a `timestamptz` through `AT TIME ZONE`, which is `STABLE` rather than `IMMUTABLE`
  and so cannot be indexed or put in a generated column. A few hundred rows, at this scale.

**docker-compose sets `timezone=America/New_York` on the server**, so `psql` renders timestamps in
Eastern and what you read there matches what the app shows. Convenience only — nothing is correct
because of it, and removing it breaks nothing.

## IGDB and search

IGDB v4 is authenticated through Twitch's client-credentials flow. Base URL
`https://api.igdb.com/v4/`, queries are **POST bodies in APIcalypse**, not query strings. Rate limit
is 4 requests/second. Three pieces, each with one job:

1. **`TwitchTokenProvider`** — the client-credentials flow. Singleton, caches against `expires_in`
   with 60s of skew, one refresh however many callers arrive at once. **Takes `IHttpClientFactory`
   rather than an injected `HttpClient`**: as a singleton it would otherwise pin one handler forever
   and stop seeing DNS changes.
2. **`IgdbAuthHandler`** — a `DelegatingHandler` stamping `Client-ID` and `Authorization: Bearer`,
   and on a 401 invalidating the token and replaying once. Auth lives here so the client has none.
3. **`IgdbClient`** — typed client. Builds APIcalypse, deserializes, throws `IgdbException`, which
   becomes a **502** via `IgdbExceptionHandler` — "the upstream provider is unhappy" is a different
   message to a caller than "this API is broken".

Two quirks the code depends on: it requests **`cover.image_id`, not `cover.url`**, which is
protocol-relative and pinned to thumbnail size where the id composes at any size via `IgdbImage`;
and **there is no `developer` field on a game**, so the query pulls `involved_companies.developer`
alongside `involved_companies.company.name` and filters.

**Search hits IGDB on every call by design and caches nothing** — the frontend's 300ms debounce is
the only thing between typing "hollow" and six requests. It upserts every result into `media` +
`games`, so searching the same thing twice must not change `select count(*) from media`. The upsert
reads then writes, so two identical concurrent searches can race; the partial unique index turns that
into a `23505` rather than a duplicate row, and `GameCatalogService` catches it, clears the change
tracker, and re-reads.

### Game types

A search asks for everything **except Bundle and Mod** — `where game_type != (3,5);`, one line in
`IgdbClient`. Without it the first result for "Hollow Knight" is a *mod* of Hollow Knight, ranked
above the game itself.

- **`category` is not the field, and writing the filter against it would fail silently.** It is
  deprecated in favour of `game_type` and **no longer populated at all**, so `where category !=
  (3,5)` excludes nothing while looking right. The ids came from `/v4/game_types`, not the old enum.
- **It is in the query, not over the results.** IGDB applies `where` before `limit`, so a filter
  applied afterwards would ask for ten and hand back six.
- **It deliberately does not reach `GetGamesAsync`.** Those ids are already on somebody's board, and
  a mod logged before this existed has to stay refreshable or it silently keeps whatever IGDB said
  the day it was added, with nothing reporting the skip. Pinned by
  `IgdbClientTests.Leaves_the_backfill_able_to_refresh_anything_already_logged`.
- **The e2e stub parses the clause rather than ignoring it**, so dropping it from the client goes red
  instead of passing because the stub never had one.

**Bundle is the arguable half, and is meant to stay easy to take back.** It catches things people
genuinely play — *Halo: The Master Chief Collection*, *The Witcher 3: GOTY Edition* — and is excluded
because most bundles are shovelware pairs nobody logs. The user has said to leave the door open, so
the ids are named constants (`BundleType`, `ModType`) and re-enabling is one edit plus deleting the
half of the client test and the e2e spec that name a bundle. **Do not treat this one as settled.**

`Season` is untouched, which is a live annoyance rather than a decision: "Mario Kart" returns ten
*Mario Kart Tour: … Tour* seasons and none of the actual games. One id would fix it and has not been
asked for. See **Discovery**, where it bites much harder.

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

**IGDB's `search` is full text over whole words and does no prefix matching whatsoever** — typing
half a title, the ordinary way to use a search box, answers with nothing at all.

**The slug is what makes the prefix half work, and `name` is not.** `name ~` is *accent-sensitive*,
so `*"pokemon"*` finds only the handful of games spelled without the é and none of Nintendo's; IGDB
writes "Pokémon Sword" as the slug `pokemon-sword`, so the accent is gone before the comparison
happens. `SlugPatternOf` builds the same shape from what was typed, which doubles as the escaping —
the pattern can only hold letters, digits and hyphens, so nothing survives that could close the
APIcalypse string early. `SanitizeSearchTerm` does that by hand because it keeps spaces.

- **The slug query carries `sort total_rating_count desc;`**, and is only allowed to because it has
  no `search` in it — IGDB refuses the two together. Without a sort, *which* ten of the hundreds of
  slug matches come back is arbitrary.
- **Parallel, not sequential**, or a keystroke costs two round trips. It also means two threads hit
  `StubHttpMessageHandler` at once, which is why that takes a lock — `List.Add` losing a request
  would read as the client never having sent it.
- **A pattern under two characters is skipped**, since `*"a"*` matches most of the catalogue.
- **`GameCatalogService.SearchAsync` ranks first and cuts second.** Trimming before ranking would
  throw away the prefix matches, which are usually the good ones. The cut happens before the upsert,
  keeping the catalogue growing at one row per result somebody could have seen.

### Ranking search results

`Services/IgdbRelevance` re-orders what those two questions found. **IGDB ranks on string relevance,
and string relevance cannot tell a game from a fan game named after it.** Searching "Hollow Knight
Silksong" returns a Game Boy Color game by one person, no ratings and one platform, *above* Team
Cherry's — because the fan game's title is that exact string and the real one has a colon in it.

1. **The game more people have played comes first.** `total_rating_count + hypes`, added rather than
   chosen between because they cover different halves of a game's life: an unreleased game has no
   ratings by definition, and Silksong sat on 220 hypes and nothing else for years, which was exactly
   when it was most searched for. A fan game has neither.
2. **How well the title matches breaks the ties** — most of what orders the long tail, where nearly
   everything has no ratings at all.
3. **IGDB's own order breaks what is left**, through a stable sort.

**Two other rules were tried against the live API and are worse.** Title first and popularity second
creates the "Zelda" case: a game called exactly `Zelda` with no ratings goes straight above *The
Legend of Zelda*. A floor under that instead — so a title not containing the search text can never
outrank one that does — loses "botw", where the slug question drags in Botworld Odyssey and buries
*Breath of the Wild*; and exempting IGDB's own first pick from the floor rescues "botw" and breaks
"gta v" and "final fantasy 7". All three are pinned by tests named after what they got wrong.
**Removing the floor cost exactly one measured thing:** "Doom 3" puts *Phantasy Star III* third where
the floor had the Xbox *Doom 3* — worth less than the first place "botw" loses, and safe because the
second question tightened the candidate set.

**It cannot be done in the query** — IGDB rejects a search carrying a sort outright with a
`406 "Search is sorting on relevancy…"`. And **`total_rating_count` and `hypes` are asked for and
never stored**: they are facts about how many people have played a game today rather than facts about
the game, so a copy would go stale while answering for a ranking nobody would think to re-run.

All of it was measured against the live API rather than reasoned about — some two dozen terms,
correct as of August 2026, each case pinned by a test named after what it got wrong.

**The e2e stub is as limited as the real endpoint, deliberately.** Its `matchesTerm` requires every
token to match a **whole word**, so "hollow k" finds nothing there either and only the slug question
can answer `half a title is enough to find a game`; and it flattens punctuation on both sides,
because a raw substring test would never match "Hollow Knight: Silksong" against "Hollow Knight
Silksong". One trap the suite caught: the stub's game-type filter anchored on `where game_type` while
the slug query writes `& game_type`, so mods sailed through the second question.

### Search on the board

`BoardSearch` is a bar above the board, with results as a **horizontal strip** over it, so the column
a title will land in is on screen while you decide. A result already in your library shows *"On your
board"* rather than an add button, because a second Backlog entry is not a replay but the card would
render it as one — and knowing that needs the *whole* library, which is why `libraryMediaIds()` pages
to the end rather than stopping at the API's maximum page size. Capping it would offer to add your
hundred-and-first title twice.

- **Escape is handled on the search, not on `document`** — the journal drawer already listens there,
  and two listeners for one key is how they start disagreeing about which of them a press was for.
- **The clear × is a sibling of the `<label>`, never a child of it.** A wrapping label takes its text
  content as the input's accessible name, so a button inside makes the box announce itself as *Search
  games Clear search*, and the specs that locate it by name stop finding it.
- **It hides WebKit's own cancel button** (`[&::-webkit-search-cancel-button]:appearance-none`), or
  there are two × in the corner, one unstyled, unlabelled and invisible to every locator. jsdom
  renders neither, which is why `the box clears from its own corner` is a Playwright spec.
- **The × is present only when there is something to clear, and hands focus back to the box on its
  way out** — it unmounts the moment it works, so otherwise the keyboard is left on the document
  body. Escape deliberately does *not* move focus: it is handled on the container and can be pressed
  from a control in the strip.
- **The strip is only there when there is something to show**, and is `aria-label`led rather than
  headed — `BoardPage.test.tsx` asserts the board's four `<h2>`s as an exhaustive list.
- **`BoardSearch` is tested on its own, never through `BoardPage`**, because a result's title and a
  card's title are both an `<h3>`. For the same reason `e2e/support/board.ts`'s `card()` is scoped to
  `[data-board]` — it was a bare `getByRole('listitem')`, which a search result tile answers to.

`/search` redirects to `/board` rather than being dropped — the address outlived the page.

## The board and its API

**Everything below `/api/auth` requires a session and answers 401 without one.** The four sign-in
routes are the only anonymous ones.

| Route | |
|---|---|
| `GET /api/auth/{provider}/start?returnUrl=` | 302 to Google or Discord. A navigation, not a fetch. A non-local `returnUrl` is a **400** |
| `GET /api/auth/{provider}/callback` | the handler's own `CallbackPath`. There is no action behind it |
| `GET /api/auth/me` | who is signed in, or **200 and a literal `null`**. Never 401 |
| `POST /api/auth/logout` | ends the session. POST, so an `<img>` cannot sign you out |
| `GET /api/games?search=&limit=` | search IGDB, upsert, return |
| `GET /api/games/{id}` | one stored game plus its log entries |
| `POST /api/games/refresh` | re-fetch every IGDB title on the board. Maintenance; no UI |
| `POST /api/games/hltb/refresh` | queue the board for HowLongToBeat. **202 with a count of what was queued**, not of what changed |
| `PUT /api/games/{mediaId}/genre` | choose the genre that colours a card, or null for automatic |
| `PUT /api/games/{mediaId}/hltb` | pin the HowLongToBeat entry by hand, or null to take the pin back |
| `GET /api/log-entries?mediaId=&status=&page=&pageSize=` | the journal, newest first |
| `POST /api/log-entries` | record a pass through a title |
| `GET PUT DELETE /api/log-entries/{id}` | |
| `POST /api/log-entries/{entryId}/notes` | write a note against a pass — an append, never an overwrite |
| `GET PUT DELETE /api/notes/{id}` | a note id is enough on its own. Rewriting does not move its date |
| `GET /api/library?hobby=&status=&year=&sort=&page=&pageSize=` | your collection / one board column |
| `GET /api/library/years?hobby=` | years with any activity — started **or** finished — newest first |
| `POST /api/library/{mediaId}/status` | move a title to a board column — what a drag calls |
| `DELETE /api/library/{mediaId}` | take a title off the board — **every pass of yours** |
| `PUT /api/library/order` | store one column's manual ranking |

List endpoints return `PagedResult<T>`; search returns a bare array capped by `limit`.

**Updates are `PUT`, not `PATCH`**: a field absent from the body is *cleared*. That is the whole
reason for choosing PUT — PATCH cannot distinguish "clear the rating" from "leave it alone" without
an `Optional<T>` wrapper. `mediaId` is not replaceable; moving an entry to a different title is a
delete and a create.

**Validation returns 400, never 500.** Unknown `mediaId` is checked before insert, since a raw
foreign-key violation would be a 500; `dateCompleted < dateStarted` is caught by `IValidatableObject`
before the check constraint can throw; and ratings must be 1.0–10.0 **with at most one decimal
place**, because `numeric(3,1)` *rounds* 8.75 to 8.8 rather than rejecting it, so accepting two places
would mean the response reporting a rating the database does not hold.

### Library is not the catalog

Searching upserts every IGDB result, so `media` accumulates everything ever typed into a search box.
`/api/library` joins to `log_entries` and returns only titles you actually recorded something about —
one row per title regardless of replays. **Do not "fix" it to list all of `media`.**

**`currentStatus` is the most recent entry's status**, ordered `logged_at DESC, id DESC`: a pass is
current because it was recorded most recently, not because it happens to carry a date. `?status=`
filters on that, not on "has ever been" — a game completed in 2024 and being replayed now appears
under `InProgress` and must not also appear under `Completed`. EF turns the nested `First()` into a
LATERAL join, not N queries.

**It used to read `started_at DESC NULLS LAST`, and that was a bug on the ordinary path**: leaving
Completed for Backlog or Dropped writes an entry with no dates by rule, so it could never outrank the
completion it replaced — the card sprang back to Completed and every retry added another orphan
entry. `id` breaks ties, which is not a footnote: fixtures on a stopped clock share one `logged_at`,
so the tie-break carries the whole ordering in the test suite.

**Three places order a title's entries and all three must agree**: `LibraryService.BoardQuery`,
`LibraryService.LatestEntryFor`, and `GameCatalogService.GetAsync`. The last used to order by
`id DESC` alone, which meant the drawer could offer to edit one entry while the card reported
another. `LibraryEndpointTests.The_board_and_the_game_detail_agree_about_which_pass_is_current` pins
it so a future drift fails loudly.

**`latestNotePreview` is the one field on that row that does not come from the current pass** — it is
the most recent note across *every* pass of yours, so a replay begun this morning still shows what
you said the first time round. Two consequences, both load-bearing:

- **It carries its own `UserId` predicate.** Riding on `Latest` would have inherited `BoardQuery`'s
  scoping for free, but reaching every pass on a title reaches a *shared* title — without it a
  stranger's journal prints on your card. Notes have no user column, so it is a join.
  `UserScopingTests.Someone_elses_note_never_reaches_my_card` catches it.
- **It lives in the two terminal DTO projections and nowhere near `BoardQuery`.** A terminal subquery
  that fails to translate throws and names itself, where the same thing in `BoardQuery` empties the
  board and says nothing. `ItemAsync` needs its own copy, or a move answers with a null note.

Cut to `LibraryService.NotePreviewLength` (200) on the wire — far enough out that what a reader sees
cut is always the client's two-line clamp, which is what lets the cut answer to the card's width and
the density setting as a character count cannot.

### Board semantics

`POST /api/library/{mediaId}/status` is what dragging a card calls. The caller names only a target
column; which entry gets touched and which dates get set is decided server-side.

| Latest entry is | Target | Effect |
|---|---|---|
| not Completed | `Backlog` | edit in place; **clear both timestamps** |
| not Completed | `InProgress` | edit in place; set `started_at` = now *only if null*; clear `completed_at` |
| not Completed | `Completed` | edit in place; set `completed_at` = now |
| not Completed | `Dropped` | edit in place; **leave timestamps alone** |
| **Completed** | anything else | **insert a new entry** at the top of the target column |
| same as target | — | no-op |

**Leaving `Completed` inserts rather than edits.** Replaying a game finished in 2024 must not
overwrite that completion — preserving it is the entire reason the schema allows several entries per
title, and editing in place would destroy the record silently, on a gesture as casual as a drag.
`StatusTransitionTests` covers every row above; do not "simplify" this into a plain update.
`InProgress` sets `started_at` only when null, so picking a dropped game back up keeps the moment you
actually started it, and a pass inserted by a drag out of Completed gets a null platform and null
hours rather than inheriting the last one's.

**A card's corner is an `⋯` menu, same items from every column** — *Open journal*, the three columns
this card is not in, then *Remove from board*. `board/columns.ts` is the one list of the four;
`otherColumns` gives a card its three, never its own, because `TransitionAsync` treats a move to the
status a title already has as a silent no-op. It is called *Open journal* rather than a noun for the
thing so every other hobby gets this menu unmodified, and **it is offered in every sort mode**,
unlike the drag: a menu move writes no ranking, so there is none for it to promise.

**It replaced a `×` that meant *drop* on Playing and *remove* on Backlog and was absent on the other
two.** What was wrong was letting the column choose which ending you got, and leaving half the board
with no control at all. Dropping is still not removing. **Do not undo this.**

**Remove from board takes every pass of yours, not the current one.** Deleting only the newest was
defensible on paper and wrong in the hand: a title replayed five times was five presses from leaving
the board, and each press looked like a failure because the card came straight back in whichever
column the pass underneath sat in. Nothing checks whether it was the last pass — `BoardQuery` already
filters on `LogEntries.Any()` — and **the server re-reads** rather than trusting the caller, because
one read from a card rendered a moment ago can already name a pass that has stopped being current.
**Deleting one pass is the drawer's**, through `DELETE /api/log-entries/{id}`, where the pass is
named and its dates are on screen. It confirms inline and counts what is going, since "off your
board" alone reads like a card is being lost rather than three records.

Four things about the menu, each of which had to differ from `SettingsMenu`, the only other menu in
the app:

- **Which card is asking, and which has its menu open, are both held by `BoardPage` rather than the
  card** — refetches remount cards, the same fact that makes focus go back by id — and holding them
  above the board is also what makes one at a time fall out.
- **Escape is handled on the menu container, not on `document`** (the drawer already listens there),
  which bubbling reaches from the corner and from every item. Focus goes back to the corner **by id**
  (`cardMenuId`, beside `cardTitleId`). Outside-click stays a `document` `pointerdown` listener,
  because there is no other way to hear a press elsewhere.
- **The open card takes `relative z-10`.** `@container` on `CARD_CLASS` implies `contain: layout`,
  making every card a stacking context — so the panel was *painted under* the card below it, and
  under another column's cards at two-across widths.
- **`aria-disabled` is dropped from the card.** dnd-kit stamps it when the sortable is off, which is
  true and is not what the attribute claims on a list item — both screen readers and Playwright read
  it as disabling every control *inside* the card.

**The panel is a `role="group"` of buttons, not a `role="menu"`**, which promises arrow-key roving
focus this does not implement. The title is on the group's label and **never on an item**: the e2e
`card()` locator filters on a card's own text, so an item carrying a title would make it match any
card whose menu mentioned another card's game. *Remove from board* wears a **translucent danger fill,
not danger text** — Ember's `--danger` is one hue from its `--accent`, so a red word there reads as
the emphasised item rather than the dangerous one.

**A card's surface carries two gestures, and the 8px activation distance is the whole of what tells
them apart.** `useBoardSensors` in `board/sensors.ts` is the one place that decides it: under the
distance the drag never begins and the click lands on whatever button was pressed; over it dnd-kit
adds a capture-phase `click` listener of its own, so the press that moved a card cannot also open its
drawer. **The title therefore does not stop the pointer** — it is most of the card's surface, and
swallowing the press there left the drag only the margins to start from — where the options corner
and the open panel both do. Nothing is needed for the keyboard: dnd-kit's keyboard sensor refuses to
activate from a nested element.

**The test harness mounts cards under those same sensors**, which is why they are a module rather
than a few lines inside `useBoard`. A bare `DndContext` takes dnd-kit's defaults, which carry no
activation constraint — every press activates a drag from the first pixel and the click that follows
is swallowed, which made the journal look unopenable in jsdom while working perfectly in a browser.

### The board is one year at a time

One `Year` control above the board, **opening on the latest year there is** rather than on all of
them. A board is a record of a year, and one that opened on everything would be a wall of history for
anybody who logs more than one year of it; *All years* is one choice away. It replaced a picker inside
the Completed column's header, which was right while `completed_at` was the only date the year meant
— **a control living inside one column while narrowing three would be claiming to be about that
column.**

**The year means a different date per column, and it has to.** One predicate for all four is
unusable: Backlog and InProgress have their completion cleared by the very rules that put a title in
them, so `completed_at` board-wide leaves three columns permanently empty and reads as a broken
filter rather than a strict one.

| Column | Answers with |
|---|---|
| Backlog | **Nothing — it is exempt.** Both timestamps are cleared by the rule that puts a title there, so it belongs to no year; and it is what you drag out of while reading a past one |
| Playing | `started_at`. The transition into this column clears `completed_at` |
| Completed | `completed_at`, pointedly **not** `started_at`. A game begun in 2019 and finished in 2021 is a 2021 completion |
| Dropped | **Either.** Dropping leaves the timestamps alone, so an abandoned title carries a start, an earlier completion, or neither |
| *no column named* | Either, for Dropped's reason: with no column named there is no one date to prefer |

`LibraryService.InYear` holds the server's half and `yearFor` in `frontend/src/board/keys.ts` the
client's, which is only the Backlog exemption. Both halves are named in each other's comments, because
a column filtering on a date the client did not expect is invisible rather than loud.

**`GET /api/library/years` answers with any activity, not completions.** It had to move with the
filter: a year you began something in and finished nothing in is a year the Playing column handles
perfectly well, and while the list was completions alone the picker had no way to ask for it.

**A move invalidates the years as well as the two columns, and that is easy to miss.** A transition
stamps `started_at` or `completed_at`, so a drag is one of only two things that can bring a year into
existence — and the column keys cannot cover it, because `'years'` is not a status and no prefix of
theirs reaches it. Without that line the first title finished in a new year vanishes from the board it
was on and the year that would show it is not offered until a reload.

**The board renders nothing until the years arrive.** Deliberate rather than a missing loading state:
it opens on the latest year, so painting before they are known is a board showing every year — briefly
— with four columns refetched on the way to the one it was always going to be. `YearPicker` is
presentational, because the page has to hold that query to have anything to default to.

**One consequence worth knowing rather than fixing:** completing a game while reading a past year
makes its card leave the board, since the completion is stamped *now*. That is the filter being honest.

### Query keys, ordering, and the traps

**`frontend/src/board/keys.ts` owns every board query key**, and its comments carry the reasoning.
What a caller has to know:

- The column key is `['library', hobby, status, { sort, year }]`. **The sort and the year belong in
  the key, not just in the request** — leaving them out serves the previous ordering from cache and
  corrects itself only on the next refetch, which is a board showing one order while claiming another.
- **A move invalidates the column *prefix* `['library', hobby, status]`, not the fully-qualified
  key**, because a column has one cache entry per sort and year and the exact key only reaches
  whichever one is on screen. **A reorder keeps the exact key on purpose**: it writes `position`, and
  `manual` is the only ordering that reads it.
- `gameKey(mediaId)` is `['games', mediaId]`. The drawer reads it; **the board writes to it**, because
  a transition stamps `started_at` and can insert a whole new entry.

**Manual ranking** lives in `log_entries.position`, ordered `position ASC, id DESC`. New entries take
`min(position) - 1` for their column (`BoardPositions.TopOfColumnAsync`) so a title just added appears
on top and nothing gets renumbered. `PUT /api/library/order` takes the whole column top-first rather
than a move-and-index: idempotent, no off-by-one arithmetic, and ids that have since left the column
are ignored rather than rejected, because a loaded board can legitimately be one drag out of date.

**Sorting never writes.** `sort` ∈ `manual` (default) · `added` · `title` · `rating` · `hours` are
read-only views that leave `position` untouched, which is what lets the UI enable dragging only in
manual mode and still guarantee the ranking survives a look at the alphabetical order.

`sort=hours` is HowLongToBeat's **headline figure**, shortest first, with titles that have no estimate
last — the same treatment an unrated title gets under `sort=rating`, rather than sorting as though
nobody having timed a game meant it took no time. **It is the same field the card prints, and the two
have to keep moving together**: a column ordered shortest-first on a number none of its cards show
reads as broken. It is **not** `log_entries.hours_played`, which is how long you took on one pass. The
UI calls it **Time to beat**, because "Hours" alone reads as the hours you have put in.

Traps, all of which have bitten already:

- **Project board rows with member-init, not a constructor.** EF Core can decompose
  `new BoardRow { A = ..., B = ... }` and push later `Where`/`OrderBy` into SQL; a positional record
  is opaque to it and every filter on the projected latest entry fails to translate. **It surfaces as
  an empty library, not an obvious error.**
- **TPT downcasts live in the two terminal DTO projections only, never in `BoardQuery`.** `BoardQuery`
  is what every `Where` and `OrderBy` is pushed through, so a downcast that stops translating there
  empties the whole board with no error; confined to one place the worst case is that one thing
  breaks. `sort=hours` keeps its downcast **inside that one switch arm** in `LibraryService.Sorted`,
  and `LibraryOrderingTests` asserts the column comes back **non-empty**, because emptiness is the
  symptom.
- **Validation attributes go on record primary-constructor parameters**, not `[property:]` targets.
  MVC throws `InvalidOperationException` rather than skipping them.
- **`LogStatus` needs `JsonStringEnumConverter`** (registered in `Program.cs`) to travel as
  `"Completed"` rather than `2`.
- The three timestamp traps are in **Time** above, and all fail quietly or as a 500.

## The journal drawer

The board moves a title between columns; the drawer is where you say anything *about* it. Click a
card's title and it slides in over the board — rating, platform and the two dates, a list of dated
notes, and every earlier pass with its own notes below it. **Loaded with `getGame`**, which answers
with the game and every entry in one request; `logEntries[0]` *is* the pass the board is showing,
because the endpoint shares the board's ordering.

Settled:

- **No status control.** Dragging is the gesture that changes a column, and the rules about which
  entry that touches live on the server; a second way in would need its own copy of all of it.
- **An earlier pass's *fields* are read-only; its *notes* are not, and the pass itself can be
  deleted.** A finished playthrough is a record of something that happened, and an editable date here
  would undo that with a keystroke. The two exceptions are deliberate: a note is yours to fix, and a
  pass that never happened — the ×2 a mistaken drag to Completed and back leaves behind — is not a
  record worth keeping. Correcting a *field* on a finished pass is still a psql job.
- **Deleting confirms inline**, not `window.confirm`, which cannot be worded past the browser's own
  phrasing, cannot be styled, and has to be stubbed in every test that walks past it. Each button in
  the history names the pass it would take, because they all otherwise say the same word.
- **Deleting the last pass takes the title off the board**, and says so first.
- **Three bands, separated by a rule each**: what the game *is*, the pass you are on, and what you
  wrote during it. The same `border-line-soft` the settings menu puts between its three groups, and
  the same job — the drawer was one column of controls at one weight, where the first two are about
  entirely different things and the third writes to a different endpoint again.
- **The genre select and the HowLongToBeat pin sit in the header, not the form.** Both belong to the
  title, and `EntryForm` submits one `PUT` to the log-entry endpoint, so putting them there would
  mean writing to two. The genre select saves on change; the pin does not — see **The pin**. They
  share a **two-track grid** so their controls line up, `max-content` on the first track so the
  wider label sets the column without either naming a width — which would have been one magic
  number in two files agreeing by luck. **`HltbPin` therefore renders a label and a control as
  siblings rather than a row of its own**, and says so at its own top: a component that has to sit
  inside a particular grid is not a thing to find out from the outside.
- **Under the title is the developer, and only the developer.** It carried the platforms too while
  it was the game's one byline, but those have a control three rows down — a list of them there was
  a spec sheet where a name belongs, and the developer is the only fact on that line that appears
  nowhere else in the drawer.
- **The current pass's heading is a band heading; an earlier pass's is not.** `PassSection` takes a
  `lead` flag and the only thing it changes is the type. The current pass opens a band between two
  rules, as the header above and the notes below do, so it wears the uppercase the app already uses
  for one — the same type "Earlier passes" itself is set in. An earlier pass is a row *inside* that
  group, and matching it would nest two levels of the same shout.
- **Delete sits on the Save row, hard right, through an `actions` slot on `EntryForm`.** It used to
  sit under the form in the column every field label occupies, at the size every field label is set
  in, saying one word — so it read as a heading for whatever came next rather than as a button. A
  slot rather than a `ConfirmDelete` prop, because the form has no business knowing that deleting a
  pass exists; what it owns is the row its own button is on. That row is `flex-wrap`, since a
  confirm replaces one word with a sentence naming what it would take.
- **The rating is a slider plus a number box**, `step="0.1"` over 1.0–10.0. Stars reach nineteen
  values, which would quietly retire the decimal place `numeric(3,1)` exists for. A range input has
  no empty state, so "not rated" is said out loud — blank box, dimmed track, `aria-valuetext`, and a
  Clear button absent when there is nothing to clear. The slider carries the field's label and the
  box is **"Exact rating"**, because two controls on one value need two names. Native rather than
  `appearance-none`, which removes the thumb and leaves nothing to grab.
- **Hours played sits above all four of HowLongToBeat's estimates**, which are a `<dl>` in a grid:
  **two columns in the drawer, four in the modal, switching at 32rem of container.** They were four
  spans in a wrapping flex row, which has exactly one width it looks right at — the modal had it and
  the drawer never did, where three fitted and Completionist dropped to a second line under nothing,
  its name no longer above the number it belonged to. Wrapping cannot be tuned out of that: the two
  boxes differ by 200-odd pixels by design. **A `@container`, not a viewport breakpoint** — the
  drawer is `max-w-md` on a 4K monitor exactly as on a laptop — and **the `@container` is on the
  wrapper, never on the grid itself**, since a container query unit resolves against the nearest
  *ancestor* container and an element cannot query itself. That trap already cost `--card-pad` its
  `cqi`. A `<dl>` because a label and its number now share a cell, so a reflow moves the pair or
  neither. `hltbTiers` in `src/journal/fields.ts` drops the tiers nobody has submitted a time for,
  so an empty list is the whole of *never matched* — one condition instead of three. It takes the
  game rather than three loose numbers, since three nullable numbers in a row is exactly the
  argument list where two get swapped in silence.
- **The estimates are a filled blue chip, and the blue is the same on every theme.** They are
  HowLongToBeat's numbers rather than this app's, so they wear one colour whatever the app is
  wearing — the genre stripes' argument, which is why `--color-hltb` and `--color-hltb-fg` sit in the
  plain `@theme` block beside them rather than in the palettes. **The window is much narrower than it
  looks**: white on the fill has to clear 4.5:1, which caps its luminance, and the chip has to stay a
  shape on Console's near-black, which puts a floor under it. `#1f6feb` reads 4.63:1 under white and
  3.6–4.6:1 on the light and dark grounds. A friendlier, more HowLongToBeat-looking `#4a90d9` reads
  white at **3.34:1** and is simply not available while the label is white. See **A fixed chip and a
  mid-tone theme** under **Design system** for the one ground it cannot clear.
- **The difference is measured against the headline figure alone, and it sits beside your own box
  rather than in that grid.** Four deltas is arithmetic rather than a reading, and a completionist
  run held up against main story reads as wildly over when it is only over for a tier it was never
  doing. It used to be a fifth item among the estimates, which was fine while they were a row of
  spans and wrong the moment they became a block: it is a fact about you where those four are facts
  about the game.
- **The estimate on a card is written `~42 h`**, announced as *About 42 hours to finish*. The tilde is
  doing real work: the drawer prints `31.5 h` for what a pass took *you*, so an unmarked number on a
  card would read as the same kind of claim. `formatHours` lives in `src/lib/hours.ts` so `board/`
  need not reach into `journal/`.
- **It is a real dialog** — `role="dialog"`, `aria-modal`, `aria-labelledby`, closed by the backdrop
  or Escape, focus moved in on open. Tab is contained on purpose: `aria-modal` already tells a screen
  reader the board behind is inert, and letting the keyboard walk out onto it would make that promise
  false for anyone who reads by tabbing.
- **The platform select offers the game's own list** from `GameDetail.platforms` — already loaded, no
  second request — plus a blank "Not recorded". A stored value that list no longer mentions stays in
  it and stays selected.
- **Each pass is a labelled region**, which is how `Column` already solves several identically-named
  controls on one screen. The compose box is open on the pass you are on and a click behind "Add a
  note" on one that is over; **a note's controls name it by its timestamp**, and notes carry the time
  of day, because "Beat it at 9:30 PM" is the entry worth reading back where the date alone is a
  filing label.
- **`noValidate` on the form.** `step="0.1"` stays for the spinner and the mobile keypad, but native
  validation silently refuses to submit an 8.75 and shows a bubble that cannot be worded, styled or
  tested — and *why* two decimal places are refused is the part worth saying.

### The things that fail quietly here

- **Focus goes back to the card's title button by id, not by a stored element.** Refetches remount the
  card while the drawer is open, so the node captured at open time is usually detached (`cardTitleId`
  in `src/board/Card.tsx`).
- **The form is keyed on the values it was seeded from**, not on the entry's id — `entrySeed` in
  `src/journal/fields.ts`. `useState` reads its initial value once, and a transition *edits the
  current entry in place* rather than adding one, so the id holds still while the values change
  underneath; keying on the id alone left a game just dragged to Playing showing an empty Started even
  after the refetch had landed. The cost is that a refetch arriving mid-edit discards what was typed.
- **A save says "Saved", and the flag cannot live in the form.** `EntryForm` is keyed on `entrySeed`,
  so a save that changed anything remounts it — a flag set on success is destroyed by the very refetch
  that confirms it, which is why the button appeared to snap straight back to *Save*. `saved` is held
  in `EntryDrawer`, above the key, and is not read off `save.isSuccess` either: that stays true until
  the next write, where this has to stop being true the moment a field is touched, so `onEdit` clears
  it. `role="status"`, and not on a timer. One `onChange` on the `<form>` catches every field, because
  React's synthetic events propagate through the tree.
- **Its Playwright spec scopes `role="status"` to the dialog, and has to.** dnd-kit mounts a live
  region of its own to announce a drag, so the board behind carries a second `role="status"` — enough
  to fail a bare `getByRole('status')` as a strict-mode violation. The Vitest suite cannot show you
  that: it mounts the drawer without the board's `DndContext`, so the spec was green in jsdom and red
  in a browser.
- **The form submits every field, every time.** `PUT` means an absent field is *cleared*, so sending
  only what changed would wipe the rating whenever somebody corrected a date. `pick()` in
  `src/api/logEntries.ts` drops `undefined` but keeps `null`, which is what makes "cleared"
  expressible at all. Notes are outside the form, each its own row and its own write.
- **An untouched date goes back as the instant it arrived as.** The input shows a day, the column
  holds a moment; re-deriving from the day on screen would move a 21:30 start to midnight — silent
  loss on a save the user made about something else. Only an edited field is sent as a bare date
  (`dateFieldValue`).
- **The rating is validated on the input text, not the parsed number.** `8.75 * 10` is not exactly
  `87.5` in binary floating point, so counting decimal places arithmetically is a way to accept the
  one value the rule exists to reject. `parseRating` mirrors `RatingAttribute` word for word, and
  `parseHours` mirrors `PlaytimeHoursAttribute` one decimal place further out.
- **Writing a note invalidates the library as well as `gameKey(mediaId)`**, and it did not used to:
  the old rule was that nothing a note does shows on a card, true right up until a card started
  carrying the last thing you wrote. All three of `useNotes`' mutations move something on the board
  now. The bare `['library']` prefix rather than one hobby's, because that hook has no hobby.
- **The genre select is labelled through `htmlFor`/`id` like every other field.** A wrapping `<label>`
  makes the select's accessible name absorb its own option text, which made `getByLabel('Platform')`
  match two controls.

## Genres and colour

Cards carry a colour bar down their left edge, from IGDB's genres. `frontend/src/board/genres.ts` is
**one ordered list doing both jobs**: the order decides which genre a game is painted as — the first
entry it has wins — and each entry carries its own colour, so adding a genre is one line there and one
token in `index.css`. **The ordering lives on the client on purpose**: a priority list on the server
plus a palette here would be two orderings that must agree, which is the failure this codebase has
already paid for once over which pass the board calls current.

Ordered **specific before generic**, and deliberately short — `Indie`, `Arcade` and most of IGDB's
twenty-odd are absent because they say almost nothing about what an evening with the game is like.
Eleven hues is already past what anyone with common colour-vision deficiency can separate, which is
why **the card prints the genre's name as well as painting it** and why the stripe is `aria-hidden`.
Match on the trimmed, lower-cased name, so IGDB renaming a parenthetical does not silently unpaint a
genre.

**`Visual Novel` is first in the list, above even RPG**, and that placement is the one here worth
defending rather than assuming. It names the *form* rather than the subject, so a game that is one is
an evening of reading however else it is tagged; `Role-playing (RPG)` is one of IGDB's broadest words
and covers Skyrim, Diablo and Disco Elysium alike. A title carrying both is usually a visual novel
with battles in it. **One line in `GENRES` to move**, and the drawer's genre select overrides it per
title regardless.

**Its class name is the first with a hyphen in it, and the test that nearly refused it is the lesson.**
`genres.test.ts` asserted `/^bg-genre-[a-z]+$/` — a rule invented from ten names that happened to be
one word each, exactly the shape of the guard that refused HowLongToBeat's `search/site` for having a
slash in it. The rule that was actually meant is *whole literal, lower case*, and a hyphen never
violated it. Widened rather than worked around.

- **The stripe is a child of `CardFace`, not a class on `CARD_CLASS`** — `CardFace` is what the drag
  preview wears, so a child reaches it free. **It always renders, `bg-transparent` when there is
  nothing to paint**, or an ungenred card's contents would shift left of its neighbours'.
- **Every colour sits in `L ∈ [0.48, 0.75]`**, the band that stays visible against every theme's
  ground — which is why none needs a `dark:` counterpart. Lightness varies as well as hue, as a second
  axis of separation.
- **Whole literal class names.** Tailwind v4 scans source text; `` `bg-genre-${x}` `` generates nothing
  and the stripe silently renders transparent.

**The palette is settled**, repainted by the user against a live board — the set it replaced had three
pairs under 0.10 apart in OKLab, which at a 4px stripe is the same colour twice. **Measure before
changing one**: the arithmetic is written down beside the values in `index.css`, and the pair a person
notices is rarely the closest pair. The floor is Strategy against Adventure at 0.087, known and
accepted. **Visual Novel was measured before it was added**, as that rule asks: `oklch(0.64 0.19 328)`
sits 0.150 from Fighting and 0.152 from Racing, both in the comfortable band. The magenta corner was
the only room left — a cyan around hue 200 lands 0.091 from Shooter, which is the same colour twice at
stripe width.

**`POST /api/games/refresh` is the IGDB backfill**, and it has no UI — a maintenance action of the
same tier as fixing a bad `hltb_id` in psql. It re-fetches every IGDB-sourced title **in the library**
— not the catalog — through `IIgdbClient.GetGamesAsync`, a `where id = (…)` clause batched at 500,
straight back through the same upsert a search uses; a title IGDB no longer returns is simply absent
and keeps what was last known. Two traps this cost time to find: EF scaffolds a `NOT NULL text[]` with
no default and Postgres refuses that on a table with rows in it (`23502`), hence
`defaultValueSql: "'{}'"`; and the board row reaches genres through a TPT downcast in the two terminal
DTO projections only — see **Query keys, ordering, and the traps**.

**HowLongToBeat's backfill does not ride this rail, though it was expected to.** This one is
synchronous and reports what it changed, because IGDB answers 500 titles in one request; HLTB answers
one at a time behind a politeness floor of seconds, so its backfill queues and answers 202 with a
count of what was queued.

## Design system

The board wears a real design: **Shelf** — borderless cards lifting on a shadow, a warm ground,
columns as tinted wells — in **Public Sans**, with seven themes and two densities behind one menu in
the header.

| | |
|---|---|
| Look | **Shelf**, chosen from a rendered mockup rather than a description |
| Type | **Public Sans**, self-hosted through `@fontsource-variable` |
| Themes | **Seven + System**: Shelf Light, Frost, Almanac, Dusk, Shelf Dark, Console, Ember |
| Registers | **Three lights, one mid-tone, three darks.** Dusk is the mid one, and the only theme that is neither paper nor near-black |
| Red | **Ember's alone.** Not forced into the others |
| HLTB | **One blue on every theme** — the estimates are that site's numbers. See **A fixed chip and a mid-tone theme** |
| Accent | **A per-theme token.** There is no brand colour |
| Rating | **Coloured by what it says** — under 6 red, 6–8 orange, 8 and over yellow |
| Danger | **Never colour alone** — a filled chip the accent never wears |
| Density | Comfortable / Compact, a setting rather than a decision |
| Journal | **Drawer or modal**, also a setting. Same dialog either way |
| Width | The board stops widening at 2000px and puts the pixels into the cards |
| Columns | **Two across from 768px, four from 1280px.** Four at 768 left each one 168px |
| Card size | **From its column, not the window** — the cover and the title are sized in `cqi` |
| Nav | **A tab row under the header.** Games live, the other five dim and marked *Soon* |

The user's own words on red, which is the principle the whole theme layer is shaped around:

> Red doesn't have to be on everything, I would rather have one theme that I like personally
> while the other themes are well fit together, rather than forcing red to work with it.

Ember is that theme, and its surfaces are **neutral charcoal rather than red-tinted** — tinting them
was mocked up and rejected by eye, because a red ground shifts the eleven genre hues against it and those
mean something. So red appears where the app is speaking — links, focus, the current choice — and
never behind text or beneath a cover. Its accent is `#f2545b`, a true red; it began as a vermilion and
read as orange. **On Ember's near-black surface a red has to sit fairly light to clear 4.5:1 at all**
— `#ef4444` lands at 4.58 and `#e5484d` at 4.38 — so the deeper, more saturated reds are simply not
available. A fact about the ground rather than a preference, and the contrast test is what says so.

### How a theme works

**`src/index.css` is the only file in the app that names a colour.** Each theme is one block of custom
properties; `@theme inline` turns each into a utility. **The `inline` is the mechanism and not a
detail**: without it a utility resolves to whatever the variable held at build time, so no attribute
could change it at runtime. No component knows a colour, so **adding a theme is a block of values and
a line in `src/theme/theme.ts`** — there is no provider, and a component test still renders without a
wrapper.

- **`system` stores no attribute**, rather than the string `"system"`. A literal there would match no
  palette block *and* would stop `:root:not([data-theme])` matching, so the OS preference would be
  ignored twice over.
- **`color-scheme` is per theme, not once on `:root`.** It is the only thing that themes a range
  input's track, and the rating slider is one — a dark theme under a light OS would otherwise put a
  light track on a dark drawer, visible only inside the drawer.
- **Genre colours are content, not chrome**, and stay in a plain `@theme`: they mean the same thing
  whatever the app is wearing. The `bg-genre-*` class names are load-bearing — `Card.test.tsx` asserts
  on them, the only styling assertion in the suite. **The five `--color-brand-*` values sit in that
  same block** on the same argument, Google's blue meaning Google in every theme. **Note the
  constraint on the names**: `index.css.test.ts` reads tokens with `/^\s*(--[a-z-]+):/`, so a token
  containing a **digit** is silently skipped rather than reported.
- **Whether a card has a border is a token too** — shadow does almost nothing against Console's deep
  ground, so Console keeps an outline and the others do not, which would otherwise have needed a
  component to know which theme it was in.
- **The journal's drawer/modal setting is a `@custom-variant`, not a second component.** Both are one
  dialog with one focus trap; only the box changes. Putting it on the root attribute rather than in
  React state is what lets the menu change it without shared state.
- **Rating tones are whole class names** — `ratingTone` in `src/lib/rating.ts` returns
  `text-rating-low` and its siblings in full, never an interpolated `text-rating-${tone}`.
- **Light themes cannot have a yellow.** Nothing yellow enough to be called that clears 4.5:1 on
  near-white, so Shelf Light's high band is a dark gold; the ramp still reads red → orange → gold.
- **An unrecognised stored value falls back** instead of being trusted. Storage outlives the code that
  wrote it, so a theme dropped later would leave the root stamped with a value nothing answers —
  unstyled text on an unstyled ground, the least diagnosable failure available.

### The things that fail quietly, and what holds them

Each is invisible in development and each has a test that was checked by breaking it.

- **The pre-paint script in `index.html`.** It stamps the attributes before the bundle loads, or the
  page renders in the default palette and swaps — the flash every themed app gets wrong once, and
  invisible locally where the bundle is warm. It cannot import `theme.ts`, so it repeats the keys as
  literals and `theme.test.ts` asserts the copies still match. It is also the *only* thing that
  applies a stored preference: `useTheme` deliberately does not, so a broken script is a failing test
  rather than a flash. `e2e/theme.spec.ts` blocks the module and asserts the attribute is stamped
  anyway; delete the script and three specs go red.
- **`system` and Shelf Dark say the same thing twice**, because CSS cannot alias a media query to a
  selector. `index.css.test.ts` compares the two blocks declaration by declaration.
- **Contrast.** `index.css.test.ts` checks `fg`, `muted`, `accent`, `rating` and `danger` against every
  ground they sit on across all eight palette blocks, plus the chip's label against its own fill —
  eighty assertions, and a theme adds ten of them by existing. It exists because the same mistake
  happened twice: `text-neutral-500` sat at
  **3.8:1** on the dark theme for the life of the board, and then `--danger-fg` was set near-white on
  every theme, which is right where the fill is a deep red and **2.07:1** where the fill is a light
  salmon. **The fill and its ink move in opposite directions per theme.**
- **`localStorage` is not in the test globals by default.** jsdom implements it, but Node 22+ declares
  the name itself and the environment will not overwrite a global that already exists — so it is
  present and answers to nothing. `src/test/setup.ts` supplies one, and the condition asks whether the
  thing can *store* rather than whether it is `undefined`, which was the bug in the first attempt.
- **Screenshots are how a visual claim gets checked.** A throwaway spec under `e2e/` that seeds a
  board, switches theme and writes PNGs is worth writing again whenever this area changes — it is what
  caught the unreadable chip. Do not commit it. **Wait after switching theme before you shoot**:
  `Column` carries `transition-colors`, so a column's well animates to the new palette while the
  cards and the page ground switch instantly. A shot taken straight after the click catches every
  well one theme behind, which looks exactly like a token that failed to apply — and telling those
  two apart costs far more than the half-second the wait costs.
- **A new theme has two lists to join, and only one of them fails loudly.** `THEMES` in
  `src/theme/theme.ts` is what the menu reads; the pre-paint script in `index.html` carries its own
  literal copy and stamps *nothing* for a name outside it — deliberately, since that is also how an
  unknown stored value falls back to the system palette. So a theme missing from the second list is
  offered, chosen, stored, and then repainted after the bundle mounts on every load: the flash the
  script exists to prevent, on the one theme nobody would test for it. `theme.test.ts` reads
  `index.html` and holds it now; it was written for this change and caught exactly that.

### A fixed chip and a mid-tone theme cannot both clear 3:1

Worth writing down because it looks like a colour that was picked badly and is not — it is arithmetic,
and it will come back for any future theme in that register.

The HowLongToBeat chip is one fill on every theme. Carrying white text caps its luminance at 0.177,
and 3:1 from there needs a ground **above 0.630 or below 0.026**. Everything between is unreachable,
for any blue, light or dark. Dusk's ground is **0.058** — squarely in the gap, because that is what a
mid-tone theme *is*. So the chip reads 2.10:1 there against 3.6–4.6:1 everywhere else.

`index.css.test.ts` therefore asserts the chip against the **lightest and darkest** grounds in the app
rather than against each theme in turn. Per-theme would have quietly encoded "this app may not have a
mid-tone theme", which is a rule nobody agreed to; the extremes still catch a fill drifting towards
either end, which is the failure that was actually worth catching. The chip's own label reads 4.63:1
on it regardless, and on Dusk it separates by saturation as much as by brightness.

### The board at every width

Between 768px and 1600px the cards were squished and the cover art read as a thin sliver — **two
defects stacked, each hiding the other**.

**The cover was being stretched, not merely drawn small.** `CARD_CLASS` is a flex row with no
`items-*`, so the default `align-items: stretch` took the cover's height — an `aspect-ratio` only
decides a height when the height is free, and stretch takes it — and `object-cover` then cropped a
vertical strip out of a portrait. Measured at 768px it was **40×95 for a box asking to be 5:7**.
`items-start` is the whole fix; the genre stripe is unaffected because it asks for the full height
itself with `self-stretch`. **And the size ladder had no rung where one was needed**: everything from
a phone to a 1279px laptop shared one 40px cover, while four columns started at 768, leaving each one
168px and about **32px of title**. So the board turns four columns across at **1280**, and the cover
and the title size themselves in **`cqi` against the card**.

- **`@container` is on `CARD_CLASS`, not on `Column`.** That class is what the drag preview wears, and
  the preview renders outside every column — a container on the column would shrink a card at the
  moment it was picked up. Same reasoning that puts the genre stripe inside `CardFace`.
- **`--card-pad` and `--card-gap` deliberately did not join them.** Container query units resolve
  against the nearest *ancestor* container, never the element's own, so a `cqi` in the card's own
  padding would quietly measure the viewport — and it would be circular even if it worked, since `cqi`
  reads the content box and the padding is what decides it.
- **The e2e suite had no viewport.** It was inheriting Chromium's 1280×720 — exactly the four-column
  breakpoint, and one scrollbar pixel from laying the board out as two. Pinned at 1440×900 in
  `playwright.config.ts`; `e2e/layout.spec.ts` overrides it per describe block.
- **`e2e/layout.spec.ts` is the only layer that can check any of this**, since jsdom has no box model.
  The cover carries a `data-cover` hook because an `<img alt="">` has no role — the same reason
  `data-genre-stripe` exists — and the stub omits covers on purpose, so what the spec measures is the
  placeholder, which wears the same classes and had the same bug.

Left alone: at around 1280 the **Completed column's header wraps** its sort select onto a second line,
so its cards start lower than its neighbours'. Pre-existing, clears by 1440.

### The hobby nav

`<nav aria-label="Hobbies">` under the header, built from `src/shell/hobbies.ts`. Adding movies is a
`ready` flag there plus a route — the header itself does not change.

- **The six slugs are copies of `SeedData.Apply`'s and must stay copies.** They are what `?hobby=` is
  filtered on, and `LibraryController` answers **400** for anything not in `hobby_lu`. There is no
  `/api/hobbies` to read them from, which is why `THEMES` is a literal list too.
- **The five unbuilt ones are plain text**, not disabled links and not disabled buttons: there is
  nothing behind them to operate, and a disabled control claims it would work under some other
  condition. Each also says *Soon* in words.
- **Dim is `text-muted` and nothing further.** `opacity-60` was the first attempt and was wrong — every
  theme's `--muted` is picked to clear 4.5:1 against its own surface, and fading it takes it back
  under, silently, because `index.css.test.ts` checks the tokens rather than what a component does to
  them afterwards.
- **Games is a `NavLink`**, so `aria-current="page"` comes free and stays right once there is more than
  one of them to be current. `boardPath()` is the one place that has to learn `/board/:hobby`.
- **Exactly one `SettingsMenu`, and it has to stay that way.** `useTheme` holds its state locally —
  themes are CSS, so there is no provider — so a second menu would read storage once on mount and then
  keep drawing the old choice. `AppHeader.test.tsx` pins it.

`renderWithProviders` takes a **`route` option**, defaulting to `/board`. Its `MemoryRouter` had no
`initialEntries`, so the location was always `/` and `aria-current` could not be asserted at all.

## Auth

Google and Discord sign-in, an httpOnly cookie session, and every pass and note scoped to the
person who wrote it.

| | |
|---|---|
| Session | **An httpOnly cookie**, self-contained and encrypted. Not a JWT, and no sessions table |
| Mechanism | **The framework's generic `AddOAuth`**, not the `AddGoogle` package and not hand-rolled |
| Providers | **Google and Discord**, both required at boot |
| Accounts | **Anyone can sign up.** Real multi-user, one board each |
| Scoping | **An injected `ICurrentUser`**, not an EF global query filter |
| Existing data | **Discarded** when `user_id` became `NOT NULL`. The catalogue rows stayed |

### A provider is a config block

`Integrations/` has no `Auth/` folder, because there is no client to write: both Cookies and OAuth
are in the shared framework, which keeps the `state` parameter, the correlation cookie, PKCE and the
code exchange, and leaves us reading user-info and finding-or-creating the user. **A third provider
is two lines in `Program.cs`'s `Provider` local function, five values in `appsettings.json`, and a
line in `frontend/src/shell/providers.tsx`.**

- **One string does three jobs** — `AuthProviders.Google` is the OAuth scheme name, the `{provider}`
  route segment, and the value in `auth_identities.provider`. A mapping between them is a table that
  can disagree with itself, and the disagreement reads as one person collecting two boards.
- **`ExternalSignIn` reads both providers with no per-provider reader** — Google says `sub`/`name`,
  Discord `id`/`global_name` falling back to `username`. A short alias list is the whole difference.
- **Endpoints are settings, not constants**, for the reason `Igdb:BaseUrl` is: it lets the e2e suite
  point the *real* handler at a stub. Credentials go in **user-secrets**.
- **`ValidateDataAnnotations` does not recurse into nested option objects.** A `[Required]` on
  `AuthProviderOptions.ClientId` would look right and validate nothing, so `ValidateAuthOptions`
  checks the blocks by hand — which is also what lets a failed boot name `Auth:Google:ClientId`.

### The five traps, every one of which fails quietly

Each was found by running the thing, not by reading it.

- **The OAuth options must be resolved from the container, not read at build time.**
  `builder.Configuration` is still being assembled while `Program.cs` runs, so a value captured there
  misses any source added afterwards — which is exactly what `ApiFactory` does. It surfaced as **all
  153 endpoint tests 500ing on an empty ClientId**. The cookie's expiry and every provider's
  credentials resolve `IOptions` inside their configuring lambda, as `IgdbClient` already did.
- **The Vite proxy's `changeOrigin` is `false`, and that is load-bearing.** ASP.NET builds the OAuth
  redirect URI out of the incoming `Host`, so rewriting it sends the provider back to the API's own
  port — where the correlation cookie set on the app's port is not sent, and a session cookie would
  land somewhere the app cannot read.
- **`OnRedirectToLogin` is overridden to a 401.** Without it an unauthenticated API call gets a 302
  to a login page, fetch follows it, and the caller gets 200 and a lump of HTML, then fails parsing
  JSON miles from the cause.
- **`CorrelationCookie.SameSite` defaults to `None`**, which browsers refuse without `Secure`, so the
  flow fails on plain-http localhost naming nothing useful. `Lax` is enough — the callback is a
  top-level navigation — and the session cookie is `Lax` and **not `Strict`**, which would withhold
  it on exactly that navigation.
- **`Ok(null)` is a 204, not a 200 with a null body** (`HttpNoContentOutputFormatter`), and the caller
  then parses an empty string as JSON. `GET /api/auth/me` uses `JsonResult`.

**`/api/auth/me` answers 200 and null on purpose.** It is the frontend's "am I signed in" probe, so a
401 there would trip the very handler that redirects on a 401 — the query would send you to sign in
on the strength of its own answer. It is also **the Playwright readiness URL**, which has to stay
reachable before anybody has signed in. `returnUrl` is a **400** when not local rather than quietly
dropped; `Url.IsLocalUrl` catches `//evil.example`, which passes a naive leading-slash test.

### Scoping: an injected `ICurrentUser`, and why not a query filter

An EF `HasQueryFilter` would scope every read automatically, including the note queries that have no
user column. It is the wrong choice here: **it is invisible at the call site**, so nobody can review
it while reading the query; **a filter going wrong empties the board rather than erroring**;
`PostgresFixture.CreateDbContext()` builds a context by hand with no container to read a user out of;
and `HltbWorker` resolves a scope with no `HttpContext`, so its context would scope to nobody where
injection lets a path that needs no user simply never ask.

`ICurrentUser.Id` **throws** when nobody is signed in — every path that reads it is behind
`[Authorize]`, so reaching it anonymously is a wiring mistake, and a 500 naming it beats a board
quietly scoped to nobody. `IsSignedIn` exists for the background paths.

**The rule: `log_entries` and `notes` are yours; `media`, `games` and the lookup tables are shared and
must stay shared.** Two people searching "Hollow Knight" get the same row — that is the point of the
upsert, and of `hltb_id` being stored once rather than per account.

Sixteen sites, of which three were subtler than the rest:

- **`LibraryService.BoardQuery` reaches `log_entries` three times, not once** — the `Any` filter, the
  `EntryCount`, and the `Latest` projection. Scoping only the first leaves the count including
  strangers' replays and `Latest` able to pick a stranger's entry; **`Latest` decides the column, so
  the symptom is your own Backlog title sitting under Completed.** Un-scoping `Latest` alone also
  breaks reordering, because `ReorderAsync` renumbers through `row.Latest`.
- **`NoteService` has no column to filter** — all six queries reach through `n.LogEntry!.UserId`.
  That is what makes a note id enough on its own at the API.
- **`BoardPositions.TopOfColumnAsync` is `static` and takes the context**, so it is out of reach of
  injection and takes a `userId`. Left alone, one person's backlog decides where another's new cards
  land.

**Left unscoped deliberately:** `GameCatalogService.RefreshLibraryAsync` and
`HltbService.BackfillAsync` — both select on "any user has logged this" and write only shared
columns. Both carry a comment, because they read like missed sites. **404 rather than 403**
throughout: whether somebody else's pass exists is itself their business.

`Endpoints/UserScopingTests.cs` is 19 cases, all red before the scoping, each checked afterwards by
reverting **one** predicate at a time so every one fails exactly the tests that name it. **A scoping
test that was never red proves nothing.**

**`[Authorize]` is on all four controllers, `GamesController` included** — the catalogue is shared but
not public, and an anonymous search is free IGDB traffic plus an unbounded write into `media`. That
puts the two maintenance refresh routes behind a session, accepted rather than worked around.

### The frontend

- **The gate is a route wrapper**, `RequireSession`, not a check inside `BoardPage` — without one the
  board answers 401 for each of its four columns and paints four red messages.
- **It renders nothing while the session is in flight rather than guessing.** Guessing "signed out"
  flashes the sign-in screen at a signed-in person on every reload; removing the guard fails three
  tests, not one.
- **The session is a query, not a context.** There is no `createContext` anywhere in this codebase:
  the theme layer gets to be local state precisely because a component never asks what theme it is
  in, which is exactly what a session is not. TanStack dedupes, so the gate and the header asking
  separately is one request.
- **A 401 anywhere clears the session rather than surfacing as red text.** `createQueryClient` writes
  null to the session key rather than redirecting, because that module has no router and the session
  query already owns the answer. Nothing 4xx is retried. **`credentials: 'include'`** changes nothing
  today, and is there so the day the origins diverge is not also the day sign-in stops working.
- **Providers are a literal list** in `shell/providers.tsx`, and **each is a link, not a button** —
  signing in is a top-level navigation answered with a 302 that fetch cannot usefully follow.
- **The sign-in links are neutral, with the provider's own mark on the left** — the bordered-control
  idiom the app already wears, full colour only inside the mark. Drawing them in the accent made
  *Continue with Google* a green button with no Google about it, and `--accent` has no paired
  foreground, so a filled button would have meant inventing `--accent-fg` as five values and five new
  contrast rows. The marks are the first SVG in the codebase, both `aria-hidden` and
  `focusable="false"` so each link's accessible name stays exactly `Continue with Google`.
- **The ground is the whole viewport and the screen is a card on it** — `bg-sunken` sat on a
  `max-w-sm` `<main>` at first, so the theme's ground was a 384px strip with the browser's own colour
  either side. **`AppHeader` has no `banner` landmark** and never did: it renders inside `BoardPage`'s
  `<main>`, and a `<header>` nested in `main` is not a banner.

### `user_id` is `NOT NULL`, and what that cost

The development board was **discarded**, re-confirmed immediately before it ran rather than on the
strength of a decision taken earlier; `media` and `games` were untouched, so every title is one
search away. Two things had to change with the column:

- **`DeleteBehavior.SetNull` became `Cascade`.** EF refuses `SetNull` against a non-nullable foreign
  key and fails **model validation at boot**, not at runtime. Deleting an account now takes its
  journal with it, which is the honest reading.
- **The scaffolded `defaultValue: 0` was removed from the migration.** It would have emitted an
  `UPDATE` turning every unowned pass into user 0 *and* left a `DEFAULT 0` behind, so an insert
  omitting the owner would silently claim to be somebody. Without it the migration is a bare
  `SET NOT NULL` that fails immediately and says why. Checked with `ef migrations script`.

### The test harnesses

**The backend suite signs a test in by header**, through `TestAuthHandler`, registered only under the
"Testing" environment — so nothing production authenticates with is what those tests trust. The
division is deliberate: they are about authorization and scoping, and the OAuth dance that decides
*who you are* is proved end to end against the stub instead. `DatabaseTestBase` creates a user after
the reset and signs `Client` in as them, which is why the tests that predate ownership needed no
edit; `ClientFor(userId)` gives a second person and `AnonymousClient` none.

**`e2e/support/google-stub.mjs` is a provider, not an endpoint** — authorize, token and user-info,
with the real handler running against it unmodified — and it **enforces the protocol rather than
decorating it**. No `code_challenge` is a **400**, so turning PKCE off fails five specs rather than
passing quietly; a `code_verifier` that does not hash to it is a 400, the wrong `client_secret` a
401, user-info without its bearer a 401, and a code works exactly once. It serves **Discord's shape
at Discord's address** too, so the specs prove `ExternalSignIn` reads both rather than reading a
shape the stub was told to produce. `POST /__identity` chooses who signs in next, which is what makes
the two-user specs expressible.

**Every spec signs in in its `beforeEach`, and seeds through `page.request`.** Playwright's standalone
`request` fixture keeps its own cookie jar, so signing the page in leaves the seeding anonymous.

## HowLongToBeat

Every card carries how long the game takes, and the drawer carries all three of HowLongToBeat's
numbers beside how long *you* took.

| | |
|---|---|
| Numbers | **The headline figure plus all three tiers** — All Play Styles, Main Story, Main + Extra, Completionist, under HLTB's own names |
| `sort=hours` | **The headline figure**, the same one the card prints, so the column agrees with itself |
| Where | All four in the drawer; **the headline figure alone on a card** |
| Matching | Auto-accept above a threshold *and* a margin; below either, **write nothing** |
| Correcting | **In the drawer, by pinning an id.** Not psql, and not typed-in hours |
| Fetching | Queued on add to the board, plus a backfill for what is already there |

### HLTB is not an API, and that is the whole design problem

IGDB is documented, authenticated and versioned. HowLongToBeat is a website with an internal endpoint
that unofficial clients wrap and that has broken those clients for months at a stretch. **Treat a
break as expected**: stored numbers persist, a title added during an outage shows nothing, and
`Hltb:Enabled` turns the worker off without a release.

**The access shape**, established by spike and correct as of August 2026. All of it is rediscovered
at runtime rather than configured, because all of it moves:

1. `GET /` → the Next.js bundles under `/_next/static/chunks/*.js`.
2. **The pair rule**: the search endpoint is whichever `/api/X` is *also* referenced as
   `/api/X/init`. Today X is **`search/site`**; it has been `s`, `seek` and `bleed` before. Taking
   the first `fetch(..., {method:"POST"})` instead — the obvious reading, and what the community
   clients do — picks `/api/game/`, which answers **404**, and a 404 reads as a wrong URL rather than
   a wrong rule. `Hltb:FallbackSearchPath` is where to correct the next rename without a release, and
   it has to be **kept current to be worth anything**.
3. `GET /api/{X}/init?<epoch-ms>` → `{"token":..., "hpKey":"ign_...", "hpVal":...}`. The token decodes
   to `<ms>::<your-ip>|<your-user-agent>|<hpKey>|<hpVal>.<hmac>`.
4. `POST /api/{X}` with `x-auth-token`, `x-hp-key`, `x-hp-val` — **and the body carrying a property
   whose *name* is the hpKey.** Without it the endpoint answers 404, not 403, so a failed anti-bot
   check looks exactly like a wrong URL. A 403 means the token has gone off: re-run the handshake and
   retry **once**, as the site's own JavaScript does.

**`User-Agent` and `Referer` are both load-bearing, measured rather than guessed** — the handshake
answers `403 Access Denied` without either and 200 with both, where `Accept` and `Origin` make no
difference. **The token bakes the User-Agent in**, so the string used at the handshake and at the
search must be identical, which is why `HltbClient.Identify` stamps it per request instead of the
typed client's DI configuration. That coupling lived in two files once, and only the real site could
tell you they had drifted.

**Fetching a pinned id needs no handshake at all.** `GET /game/{id}` carries the record in the JSON
Next.js embeds, at `props.pageProps.game.data.game[0]` — one level deeper than the search's `data`.
An unknown id answers 404, which is an answer rather than a failure. This is why a matched title
stays refreshable on a day the search endpoint has been renamed.

**Three wire quirks are absorbed at the boundary** so nothing above `Integrations/Hltb` knows them:
times arrive in **seconds**; `0` means nobody has submitted one, not that the game is instant; and
`release_world` is an integer year from the search but a date string from the page, which is why
`HltbGameJson.ReleaseWorld` is a `JsonElement` — typing it either way makes the other throw.

#### X may have slashes in it, and assuming otherwise broke the whole feature

`bleed` became **`search/site`** — two segments. Every name the site had used until then was a single
word, so the pair rule refused any candidate with a slash in it, on no evidence beyond the three
examples in front of it. Discovery then found nothing, fell back to `Hltb:FallbackSearchPath` — which
still said `bleed`, a name already retired — and that answered 404. **Two ways of being wrong, one
behind the other**, and the log line naming the fallback was the only clue.

**What made it expensive to notice is that it takes out exactly half the feature.** Pinning an id
needs no handshake and never goes near discovery, so the correction path went on working while every
automatic lookup failed — in a background worker that logs and swallows. The symptom is "new games
stop getting times, but typing the id still works", and that sentence names the culprit precisely:
**the handshake, and nothing else, is what the two paths do differently.**

The guard is gone, and candidates are **ordered before one is chosen** so a bundle offering more than
one pair resolves the same way twice.
`HltbSessionTests.Finds_a_search_endpoint_whose_name_has_more_than_one_segment` pins the two-segment
shape, and `hltb-stub.mjs` serves `warble/site` rather than `warble`. That the stub was a single word
for as long as the site was is exactly how the suite stayed green while the app was broken — **a stub
that mirrors only today's shape cannot warn you about tomorrow's.**

#### A colon can empty the search, so the terms are cleaned first

`SearchAsync` split the title on spaces and sent the pieces as they were. **HowLongToBeat matches
each term against its own title literally**, so punctuation the two sites disagree about does not
cost you a worse result — it costs you every result:

| sent | candidates |
|---|---|
| `Dragon Quest III HD-2D Remake` | 1 — the game, `comp_all` 42.32 |
| `Dragon Quest III: HD-2D Remake` | **0** |

**Nothing downstream can recover from that.** The matcher is handed an empty list and correctly
refuses; `hltb_checked_at` is stamped on the miss, exactly as designed; and the title is never asked
about again until the recheck window passes. A refusal that should have been a match is
indistinguishable from a genuine one. IGDB and HLTB disagree about colons, hyphens and apostrophes
constantly, so this is the ordinary case rather than an edge.

`TermsOf` folds accents and turns everything that is not a letter or a digit into a space — **safe as
well as necessary**, measured rather than assumed: ten real titles run against the live site both
ways, nine identical, and the colon rescued. **It deliberately does not call `HltbMatcher`'s
normalisation**, which looks like the same job: that one folds roman numerals to digits, right when
comparing two strings already in hand and **wrong in a query, because the site writes "III" and
matches nothing for "3"**. `Folds_the_accents_but_leaves_the_numerals_alone` says so.

#### `comp_all` is the headline number, and it is fetched rather than worked out

It is what the site prints at the top of a game page and what a card and `sort=hours` both show, and
it is **not a function of the three tiers**. Measured on game 26286 (Hollow Knight), page says
**42 Hours**:

| field | seconds | hours | |
|---|---|---|---|
| `comp_all` | 150,549 | **41.82** | what the page shows |
| `comp_main` | 97,204 | 27.00 | |
| `comp_plus` | 149,763 | 41.60 | |
| `comp_100` | 236,141 | 65.59 | |
| `comp_all_avg` | 160,697 | 44.64 | the mean of the three |
| `comp_all_med` | 140,400 | 39.00 | their median |

HLTB publishes the mean and the median under their own names, so averaging the tiers produces a
number that is on the payload, under a different name, and is not the one the page shows.
`comp_all_count` equals the three tier counts added together, so the headline is a fourth statistic
over every submission. **Do not compute this.**

### Two deviations from the IGDB mirror, both forced

`HltbSession` is `TwitchTokenProvider`'s shape exactly — singleton, one refresh however many callers
arrive at once, invalidated from outside. Nothing expires it on a timer: the token's lifetime is
HLTB's to know, so any guess fails either by refusing a good token or keeping a stale one. But:

- **The 403 retry lives in `HltbClient`, not in a `DelegatingHandler`.** The credential is partly in
  the request *body*, so a handler replaying a 403 would resend the stale one and fail the very check
  it was retrying for. **Identity is stamped per request** for the same family of reasons.
- **The throttle does stay a handler**, rate limiting being a transport concern — but **its state is a
  singleton beside it**, since `IHttpClientFactory` rebuilds the chain every couple of minutes and a
  timestamp on the handler would reset on a schedule nothing in that file controls. Politeness, not
  compliance: HLTB publishes no rate limit, only a history of blocking unofficial clients.

### Matching is the work; fetching is not

`Services/HltbMatcher` is pure and static, and it is the piece most likely to need a new case. Two
ways of refusing, because there are two ways of being wrong:

- **The numerals must agree outright** — "Final Fantasy VII" against "VIII" scores ~0.97 on letters
  alone, so no threshold could separate them. **Roman numerals are folded during *normalisation***
  rather than only where numerals are compared: doing it in one place and not the other made the two
  rules disagree, refusing a "VII" to "7" match the file had already decided was correct. And
  **single L, C, D and M are excluded** from the roman set — they are legal numerals, and reading
  them as such turns "L.A. Noire" into "50 a noire", which then stops matching "LA Noire".
- **The winner must beat the runner-up by `AmbiguityMargin`**, or the two "Resident Evil 4" entries —
  same title, 2005 and 2023, both scoring 1.0 — are settled by a coin flip that looks from outside
  exactly like a confident match.
- **The year is a tie-breaker and only that — it can never refuse a lone candidate.** It used to,
  and the failure was invisible from the outside: HowLongToBeat files a re-release under the entry
  for the *original* and dates that entry from the original's release, so "Paper Mario: The
  Thousand-Year Door" came back as a single candidate dated 2004 against IGDB's 2024, scored **1.0**
  on the title, and was thrown away at **0.7**. The arithmetic is the whole story — the threshold
  leaves 0.1 of headroom and the penalty starts at 0.2 for a two-year gap, so *any* gap past a
  single year was a disqualification wearing a penalty's clothes, and every remake and re-release
  was refused. `PenalisedForYear` is applied only where there is more than one candidate, which is
  what the code's own comment always claimed it did. Resident Evil 4 is unaffected: two candidates
  is exactly when the year is supposed to speak.

**Calibrated against the real library, not guessed.** Every correct match scored **1.0**, the closest
wrong one **0.64**, so `MatchThreshold` 0.9 and `AmbiguityMargin` 0.05 both have room. Seven of eight
matched; the eighth, **Pokémon Scarlet**, scored 0.577 and was refused — HLTB models the paired
release as one "Pokémon Scarlet and Violet" entry and IGDB does not, and no rule here can invent that
mapping. **That refusal is correct, and it is exactly what the pin is for.** Normalising is otherwise
conservative: diacritics folded, punctuation flattened, a leading "The" dropped. Stripping subtitles
or the word "edition" is how a matcher becomes confident about the wrong game.

### Nothing a person does waits on HowLongToBeat

Adding a title writes its log entry, drops the id in a bounded `Channel`, and replies.
`POST /api/games/hltb/refresh` does the same for the whole library and answers **202** with a count of
what was **queued** — a `QueuedResult`, deliberately not `RefreshResult`, because `Refreshed` counts
rows the IGDB upsert touched where this counts work not yet begun. `HltbWorker` drains the queue, a
DI scope per title, logging and swallowing every failure; a title that fails keeps its null
`hltb_checked_at` so the next backfill finds it, and the queue drops the newest when full, because it
is a convenience rather than a ledger.

**`HltbService` is deliberately not part of `GameCatalogService`, and never goes through its
`ApplyMetadata`**, whose contract — its own comment, and two tests — is that an IGDB refresh cannot
touch the `hltb_*` columns.

**Storing the matched id is load-bearing, and was missed on the first pass.** A confident match writes
`hltb_id`, and every later refresh fetches *that id* instead of searching and matching again; without
it every backfill quietly becomes a full re-match, and the numbers can drift onto a different game
because a title was edited or the rules were tightened. It pointedly does **not** write the title
back — HLTB's name for a game is often not IGDB's, so that would let a lookup rename a card.

### The card waits for its own estimate

Adding a title replies before the lookup has begun — the design, not a shortcut — so the hours land
some seconds after the card is on screen, and nothing told the board. **`LibraryItemDto.HltbPending`**
lets a row say "no estimate, and one may still be coming" apart from "no estimate, and none is", so a
column asks again while, and only while, one of its own rows is waiting. A settled board makes no
requests at all.

**It is read off `hltb_checked_at`, and that is the whole of what makes looping on it safe** — the
column is stamped on a refusal exactly as on a match, so a title HLTB has never heard of stops being
pending with nothing to show for it. Polling on "the hours are null" would poll for ever on every
unmatchable title, and a real library has several.

- **The projection is `row.Media is Game && …`, not `(row.Media as Game) != null && …`.** EF elides
  the second as always true, so every film comes back pending and the movies board polls for an
  answer nobody is bringing. `is Game` becomes the TPT join's own null check. Pinned by
  `A_board_row_for_something_that_is_not_a_game_is_never_waiting`.
- **It is in both terminal DTO projections.** A transition answers with the row it just wrote and the
  board caches that, so a disagreement would tell the board to stop waiting for a live lookup.
- **`refetchInterval` is a function, not a number.** TanStack calls it to schedule each next ask, so a
  number computed during render is read once and never revised — a refetch that changes nothing does
  not re-render.
- **There is a budget, `ESTIMATE_POLL_BUDGET_MS`.** `hltb_checked_at` stays null when `Hltb:Enabled`
  is off or the site is refusing us, so "still pending" is not by itself a promise that the waiting
  ends. It restarts whenever the set of waiting titles changes.

**Not covered, and deliberately:** the drawer's three tiers do not refresh while it is open. The pin
writes synchronously and refetches, so the path a person waits on is already immediate.

### The backfill is a thing you run, and that keeps catching people

**To build: `HltbWorker` should sweep up titles with no numbers when it starts.** The next thing worth
doing in this area, written down because it has now bitten twice.

`media` rows are only ever written by a search, so a column added to the schema is empty on the
library you already have until something asks — and the only thing that asks is
`POST /api/games/hltb/refresh`, which has no UI, sits behind `[Authorize]`, and nobody would think to
run. Adding `hltb_all_styles_hours` took every card's estimate away until it was run by hand; the
migration clearing `hltb_checked_at` made the backfill *able* to pick those rows up, and still nothing
picked the backfill up. It should enqueue the same set `BackfillAsync` selects — library titles whose
`hltb_checked_at` is null or older than `Hltb:RecheckAfterDays`. Everything else already exists.

**Three things to get right, and the reason this was not simply done:**

- **It makes the app reach HowLongToBeat without being asked**, and this is a site that would rather
  not be read by a program — which is why the backfill is explicit today. `Hltb:Enabled` must gate the
  sweep as it gates the worker, and **the sweep must be its own setting besides**: somebody running
  this locally to look at the board should not become traffic.
- **`ApiFactory` removes `HltbWorker` from the host entirely**, because left in it looks titles up on
  a background thread while tests assert about the rows it is writing. A sweep run from the worker
  inherits that; one run from anywhere else does not, and would flake the suite in a way that reads
  as a database problem.
- **It must not re-ask on every restart.** `hltb_checked_at` is stamped on a miss for exactly this
  reason, so the selection is already correct — but a sweep makes a restart loop expensive in a way a
  manual backfill never was.

Until it exists: **after any migration that adds an `hltb_*` column, run the backfill**, and say so in
the same breath as the migration. One line from the browser console while signed in:

```js
await fetch('/api/games/hltb/refresh', { method: 'POST' }).then(r => r.json())
```

### The pin is the only correction, and that is enough

`PUT /api/games/{mediaId}/hltb` takes an id or a null. It covers both ways of being wrong — a match
that found the wrong game and one that found nothing are both fixed by naming the right id — and
unlike typed-in hours it survives the next backfill, because a stored id is what every refresh
fetches. It fetches **there and then** rather than queueing, because the point of typing an id is to
learn whether it was right, so an id HLTB does not know is a **400 naming it** rather than a stored
pin that silently answers nothing; this is the one route anybody waits on, and so the only one
`HltbExceptionHandler`'s 502 can reach. The *View on HowLongToBeat* link beside it is how you check
the numbers belong to the game you meant — which is why no column stores the matched title.
**Clearing a pin resets the title to never-having-been-asked**, not to asked-and-found-nothing:
leaving a stamp behind would stop the backfill ever looking again.

`HltbPin` sits in the drawer header beside the genre select; `setHltbId` in `useJournalEntry.ts`
invalidates `['library']` as well as `gameKey(mediaId)`, because the card carries the headline figure
and *Time to beat* orders on it. Three things about it are deliberate:

- **It is a text box, not a number input.** An id is an identifier rather than a quantity, so a
  spinner that nudges it by one lands on an unrelated game — but the real reason is worse: **a number
  input reports an unparseable value as an *empty string*, and empty here means *take the pin
  back***, so a typo would silently clear a good id and reset `hltb_checked_at` with it.
  `inputMode="numeric"` keeps the mobile keypad.
- **It commits on blur or Enter, not on change** — "9134" passes through 9, 91 and 913 on the way,
  and this is the one route that holds the caller while the server reads a website. An unchanged
  value is not sent at all.
- **`commit()` returns early while a pin is in flight, and jsdom cannot show you why.** Enter commits
  while the box still has focus, and the commit disables it — which a real browser reports as a blur,
  which is the same event that commits, so without the guard one pin is two upstream lookups. **jsdom
  does not implement "disabling a focused element blurs it"**, so the Vitest suite passes either way;
  the Playwright specs are what run that path.

The component is keyed on `detail.hltbId` for `EntryForm`'s reason, which also gives the error path
what it needs free: a refused pin leaves the stored id alone, so what was typed stays in the box.

### Testing it, and the thing tests cannot tell you

`ApiFactory` swaps `IHltbClient` for `FakeHltbClient` and `IHltbQueue` for `FakeHltbQueue`, and
**removes `HltbWorker` from the host entirely**.

**A throwaway harness that runs the real `HltbSession` and `HltbClient` against howlongtobeat.com is
worth writing again whenever this area is touched.** Stubs verified every part of the access shape
above and were green while the real site refused three times in a row: no `Referer` on the handshake,
a User-Agent that only DI supplied, and a fabricated fixture for the game page that had `data` as an
array. **Do not commit it, and do not make the suite depend on the network.**

`e2e/support/hltb-stub.mjs` exists because the backend suite fakes `IHltbClient` outright, leaving the
whole access shape with no test above the unit level. So the stub is a **site**, not an endpoint: home
page, two bundles, the handshake, the search and the game page, with the real `HltbSession`/
`HltbClient` running against it unmodified. `Hltb:BaseUrl` is the only thing pointed at it. Four
choices, each of which stops a spec passing for the wrong reason:

- **Its search endpoint is `warble/site`, pointedly not whatever `Hltb:FallbackSearchPath` holds**, or
  the fallback quietly covers for a pair rule that has stopped working. Checked by breaking it: strip
  the `/init` reference out of the bundle and **all eight specs fail**.
- **The bundle carries a decoy.** `/api/game` is referenced from a POST fetch and is the first one a
  reader meets — what the community clients take, and what answers 404 on the real site. It is there
  so "take the first POST fetch" fails this suite rather than passing it.
- **The identity checks are enforced, not decorative.** No User-Agent or no Referer is a 403, a search
  under a different User-Agent than the token was issued to is a 403, and a search without the
  hpKey-named body property is a **404**, not a 403, because that is what the real endpoint does and
  the wrong status is the trap.
- **The search takes a moment** — `SEARCH_DELAY_MS` 600ms on the search alone, the by-id fetch still
  instant. It answered instantly once, which let the refetch that follows an add win a race it always
  loses in production, so the spec asserting the card fills itself in passed whether or not the board
  ever looked again. With the delay, removing the poll fails the spec.

The stub's catalogue disagrees with IGDB's on purpose: Stardew Valley is missing, and Anthem is filed
as "Anthem: Legion of Dawn", which scores about 0.29 against IGDB's bare "Anthem" and is correctly
refused — which makes the pin's specs about something real. **Adding a title already queues a
lookup**, so most specs need only wait; `awaitEstimate` and `awaitChecked` in `e2e/support/hltb.ts`
are that wait. **`estimate(page, tier)` beside them is how a spec names one of the four numbers**,
and it is there because the alternative scattered: the tiers used to be spans reading
`Main story: 8 h`, so nine assertions across `hltb.spec.ts` and `journal.spec.ts` each hard-coded
that string, and turning them into label-and-value pairs broke all nine at once. Worse, it broke
them *silently for a commit* — the change came with a new `layout.spec.ts` case and running that
file alone proved nothing about the two that actually named tiers. **After changing markup the
drawer shares, run the whole e2e suite rather than the spec that looks related.** The backfill spec blanks the columns in psql first, because a title predating the
feature is a state the app cannot reach, and `awaitChecked` reads `hltb_checked_at` straight out of
Postgres, since a refused match changes no other field and nothing on the wire carries that column.

## Deploying it

Two containers behind one origin: **Caddy serves the built SPA and proxies `/api` to Kestrel**,
which is the topology development already has through the Vite proxy. That is the whole reason to
prefer it over teaching the API to serve static files — the browser sees one origin either way,
which is the property the `SameSite=Lax` httpOnly cookie and the deliberate absence of CORS both
rest on.

| | |
|---|---|
| Images | **One `Dockerfile`, two targets** — `api` (aspnet:10) and `web` (Caddy plus `frontend/dist`) |
| Compose | `deploy/compose.yml` — `api`, `db`, `caddy`, and `cloudflared` **behind a profile** |
| Redeploy | `deploy/scripts/deploy.sh` — **run, never automatic.** Pushing deploys nothing |
| Config | **Everything site-specific is an environment variable.** `deploy/.env.example` names them all |
| Origin | **Pinned from configuration**, not read off `X-Forwarded-*` |
| Migrations | Run themselves, **in Production only** |
| Session keys | Persisted to a bind mount, or every redeploy signs everybody out |
| Database | Publishes **no port at all**, not even on loopback |

**`deploy/.env` is where a deployment actually lives, and it is gitignored.** No hostname, no host
path and no secret is committed — this repository is public, and a compose file naming a private
machine's directory layout is a thing that cannot be taken back. The committed file is generic;
`.env` is what turns it into a deployment.

### One omission, three failures

Behind a proxy that terminates TLS the request reaches Kestrel as **plain HTTP, on whatever host
the proxy used**. Three separate things read `Request.Scheme` and `Request.Host`, and all three are
wrong at once:

- The OAuth handler builds an `http://` **redirect URI, which Google refuses** for any host but
  localhost. Sign-in is dead, and the refusal arrives on the provider's own page rather than in any
  log of ours.
- `CookieSecurePolicy.SameAsRequest` sees HTTP and issues the **session cookie without `Secure`**.
- `UseHttpsRedirection` thinks every request needs redirecting, **and loops**.

`PublicOrigin:Url` closes all three. `PublicOriginMiddleware` sets the scheme and host from it, and
**is inert when the setting is absent** — which is development and both test harnesses, so nothing
else in the suite is quietly running against an origin it never mentioned.

- **Pinned from configuration rather than read from `X-Forwarded-*`.** Forwarded headers have to be
  *trusted* to be believed, which means a `KnownProxies` list, which behind a tunnel is a container
  address that changes whenever the container does. A pin depends on nothing the network is doing —
  and the app really does have exactly one public address, so stating it is honest rather than a
  workaround.
- **It runs before `UseHttpsRedirection`, and that ordering is load-bearing.** That middleware
  decides from `Request.IsHttps`; `UseAuthentication` — where the callback's token exchange has to
  send *the same* `redirect_uri` the challenge sent — is later still. Being ahead of the first puts
  it ahead of both.
- **Pinning the origin disables the app's own HTTPS redirect, so the edge has to do it.**
  `UseHttpsRedirection` decides from `Request.IsHttps`, which the pin has already set true — so a
  request that genuinely arrived over plain HTTP is never redirected, and nothing in the app can
  tell. The proxy in front is the only party left that can still see the real scheme, and it has to
  be told to redirect (Cloudflare calls it *Always Use HTTPS*; it is off by default). Left off, the
  failure is silent and total: the page loads perfectly over `http://`, sign-in runs the entire
  OAuth dance, and then the session cookie — marked `Secure`, because the pin says the scheme is
  https — is dropped by the browser on arrival. You land back on the sign-in screen having done
  everything right, with nothing anywhere reporting a problem.
- **The challenge leg cannot catch a misplacement, and that is worth knowing rather than
  rediscovering.** `Challenge()` is issued from `AuthController`, which runs after the whole
  pipeline, so the redirect URI comes out right wherever the pin sits. It is the *callback* leg that
  breaks — late, after a sign-in has appeared to work. So `PublicOriginTests` pins the ordering
  through the redirect case instead, and that test was checked by moving the call one line down and
  watching it go red.
- **A malformed value fails the boot naming `PublicOrigin:Url`**, the guard `Journal:TimeZone` and
  the sign-in credentials already get. **A path is refused too**: the callback is built from the
  scheme, the host and the handler's own `CallbackPath`, so a value carrying one would be silently
  losing a segment.

### The things that fail quietly here

- **Data Protection keys have to outlive the container.** The session cookie is self-contained and
  encrypted with them, and a container filesystem goes with the container — so without somewhere
  durable, every redeploy signs **everybody** out, and there are a lot of redeploys.
  `DataProtection:KeyRingPath` is the setting; `SetApplicationName` sits beside it because keys are
  found by application name, so a rename orphans the ring exactly as losing the directory would.
- **That directory has to be writable by whoever the container runs as, and it is not an error when
  it is not.** Data Protection falls back to keys held only in memory and says so in a log line
  nobody is reading at the time. The compose file sets `user:` for this and for nothing else.
- **`AllowedHosts` has to keep `localhost` on the list, and forgetting it misdirects.** The compose
  file binds Caddy to `127.0.0.1` as the local debugging handle, and a request arriving that way
  carries `Host: localhost` — which the public hostname alone rejects with a bare 400 *"Invalid
  Hostname"* from host filtering, before any of this application runs. **Static files keep working**,
  because Caddy answers those itself and never reaches the API, so the symptom is a board that loads
  perfectly and an API that refuses every call on it. Only somebody already on the host can send that
  header, since the port is published nowhere else, so allowing it costs nothing.
- **Migrations are guarded to Production.** Both test harnesses already apply them their own way —
  `PostgresFixture` for the backend suite, a `dotnet ef database update` chained into the API's own
  command for Playwright — so an unguarded `Database.Migrate()` is a third caller racing them.
- **`cloudflared` is behind a compose profile.** `docker compose up -d` brings up an app answering
  on loopback and nowhere else; publishing it takes `--profile tunnel`, which somebody has to type.
  **It also sits on the app's own network and no other**, which is a stronger guarantee than a
  careful ingress list, because it holds even when the ingress is wrong.
- **A required variable inside a profiled service would block the whole file.** Compose interpolates
  everything before working out which services a profile selects, so `TUNNEL_TOKEN` is deliberately
  *not* marked required with `:?` — it would refuse to start the app at all until the tunnel existed.
- **`.dockerignore` must exclude `bin/` and `obj/`.** They hold Windows build output that would be
  copied over the restore the SDK stage just did inside the image, and the result is a publish
  mixing two platforms' artefacts rather than an error.
- **The three native npm dependencies resolve on Linux from a Windows lockfile**, checked rather
  than assumed: `@rolldown/binding`, `@tailwindcss/oxide` and `lightningcss` all ship per-platform
  binaries, and `package-lock.json` records every variant including `linux-x64-gnu`. `npm ci` is
  what keeps that true — `npm install` would rewrite the lockfile in the image.
- **`index.html` must never be cached and `/assets/*` always should.** Vite fingerprints everything
  under `assets`, so those files never change content; `index.html` is what names the current
  bundle, so a held copy pins a browser to the previous deployment with nothing saying so.

**Redeploying is `scripts/deploy.sh` on the server, and it is a thing you run.** Pushing to GitHub
does not deploy anything — there is no CI, no webhook and no watcher, deliberately. A rebuild drops
the app for a few seconds, and deploying every push unattended spends the review a pull request was
for. The script refuses a clone with local edits, reports the commits it moved through, and fails
loudly if the API does not answer afterwards, because *up* is not the same as *answering*.

Two things in it are less obvious than they look. **It copies `compose.yml` out of the clone before
deploying**, since the file the server reads is a copy and a change in the repository reaches it no
other way. And **the whole body is wrapped in a function**, because the script overwrites itself
with the newer copy as its last act — bash reads a script incrementally as it runs, so wrapping is
what forces the file to be parsed before any of it executes.

**Restart after pulling**, as ever — `docker compose up -d --build`, never a bare `git pull`. A
running container goes on executing the image it started with.

**Where a deployment is not code**: moving nameservers, creating the tunnel, registering the
production redirect URIs on both provider apps, and writing `.env`. None of those live here.

## What is next

**Phases are referred to by name, not by number**, anywhere outside this list. The order has changed
twice — auth deferred, then HowLongToBeat brought forward — and each reorder silently invalidated
every "by Phase 4" scattered through the code. "Once movies exist" stays true however the list is
shuffled.

- [x] **Schema and search** — schema + migration, IGDB integration, `GET /api/games`.
- [x] **The journal** — log-entry CRUD, library and game-detail reads, the test suite.
- [x] **The board** — transitions, manual ordering, year filtering and the Eastern timezone work on
      the backend; components, the drag, search and the journal drawer on the front.
- [x] **HowLongToBeat** — all four figures, the matcher, the queue, `sort=hours`, the pin, and a stub
      that serves every leg of the site's access shape.
- [x] **The redesign** — semantic tokens, four themes, a density setting, the Shelf re-skin, a board
      that works at every width, search moved onto it, and a hobby nav.
- [x] **Auth** — Google and Discord, an httpOnly cookie, sixteen query sites scoped, `user_id NOT
      NULL`.
- [x] **Living with it** — the things daily use turned up: the last note on the card, an options menu
      so a move is not a drag, removing that removes, two HowLongToBeat repairs, a year control over
      the whole board, and a card that fills in its own estimate.
- [x] **Deployment** — an origin the app is told rather than left to guess, one Dockerfile with two
      targets, a compose file with the tunnel behind a profile, session keys that outlive the
      container, and migrations that run themselves in Production. See **Deploying it**. What is not
      code — nameservers, the tunnel, the provider redirect URIs, `.env` — is deliberately not here.
- [x] **Three more themes and a chip** — a Visual Novel genre, HowLongToBeat's four estimates as a
      grid of blue chips that reads in the drawer as well as the modal, and three themes in registers
      the app had none of: two more lights and its first mid-tone. See **Design system**, which now
      also records why a fixed chip and a mid-tone ground cannot both clear 3:1.
- [ ] **Detail and review — next.** A game detail page and a year-in-review page.
- [ ] **Filling the board without searching — named, not designed.** See **Discovery**.
- [ ] **Other hobbies.** Movies/TV/anime/books/music — each a sibling detail table deriving from
      `Media`, plus its source integration (TMDB, MAL). Add the `source_lu` row with the client.

**Auth was deferred three times on purpose, and that is now history rather than guidance.** The
original brief had it second, but `log_entries.user_id` was nullable, so sequencing auth first would
have left the app unable to do its job while it was built. The column is `NOT NULL` now, and the
deferral is spent. The board is built hobby-parameterised (`/api/library?hobby=games`) even though
only games exist, so the other hobbies' boards are a routing change rather than a rewrite.

### Small things, named so they are not rediscovered

- **Sweep up titles with no headline figure when the worker starts.** The first thing to pick up. See
  **The backfill is a thing you run**, including the reason it was not simply done.
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

### Discovery: a grid of what is popular, a calendar of what is coming

**Not designed yet, and that is the point of writing it down now.** The user has asked for the phase
to exist and said plainly that the shape still needs workshopping. Two things are known: **popular
games are a grid of cover art**, and **upcoming games are a calendar**. Everything below is constraint
the codebase already carries, gathered so none of it has to be rediscovered while the design is being
had. **None of it is a decision.** The reason for the phase: a search box asks you to already know
what you want, and filling a board — especially filling one *backwards*, which is what the year
control now exists for — is mostly the other problem.

**What is already true, and bears on it:**

- **The popularity numbers are never stored**, so a popular grid is a live query by construction and a
  stored "top games" table is the thing this codebase has already decided against once. **`hypes` is
  the unreleased half** and is what an *upcoming* view runs on, since an unreleased game has no
  ratings by definition. See **Ranking search results**.
- **`first_release_date` is already read, in UTC, on purpose — and a calendar must not reuse that.**
  `games.release_year` takes it in UTC because it is compared against HowLongToBeat's bare
  `release_world` year, which belongs to no timezone. A calendar is a human question about *days*, so
  it would be **the fourth place the journal zone is applied**. **Time** currently says three; that
  sentence is a tripwire and should be updated rather than quietly falsified.
- **The catalogue grows by search, and only by search**, so whether *browsing* writes rows at all is a
  real decision: forty covers idly scrolled would grow `media` faster than every search ever typed.
  The cheap answer is that browsing upserts nothing and only adding does — but that is not how the
  search strip works today, and the two should probably agree.
- **"On your board" already exists and has to be reused**, and knowing it needs the *whole* library,
  which is why `libraryMediaIds()` pages to the end. A grid puts far more tiles on screen.
- **`Season` finally bites here, and this is the phase that should settle it** — seasons and episodes
  are precisely what a "coming soon" list fills with. See **Game types**, and note **Bundle** is the
  arguable half left easy to take back.
- **Nothing here caches, and this is where that stops being free.** A calendar spanning months is
  several queries for data that changes daily rather than per-keystroke, so a cache is worth having
  for the first time in this codebase. IGDB's limit is 4 requests a second.
- **Covers compose at any size already** — `IgdbImage` builds from `cover.image_id`, so a grid can ask
  for a larger one without a new field or a migration, and 5:7 is already the app's poster ratio.
- **Adding while reading a past year already works**: a title added from anywhere lands in Backlog
  with no dates, and Backlog is exempt from the year.
- **Games only, whatever it looks like.** IGDB is the only source with a client behind it.

**What has to be workshopped**, phrased as the questions rather than as answers:

- **A screen of its own, a strip like search, or a panel over the board?** `/search` was already
  retired *into* the board once, and the reasoning — the column a title is about to land in should be
  on screen while you decide — pulls against a full-page grid, though perhaps less hard for browsing.
- **Popular by what, over what window?** `total_rating_count` and `hypes` are what the ranking uses;
  IGDB also has a `popularity_primitives` endpoint nothing here has touched.
- **What the calendar's unit is** — a month, a quarter, the rest of the year — and what a day carrying
  eleven releases is supposed to look like.
- **Whether the calendar is a way of adding at all**, or only of looking. A game that is not out yet
  is a real Backlog entry, so it probably is.
- **Where a title lands when added from either surface.** Backlog with no dates is the honest default
  for something unplayed, and is what search already does.

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

One is worth a warning if you open it: `for-the-next-part-delightful-alpaca.md`, the HowLongToBeat
plan. Three of its assumptions did not survive contact with the site — it has an `HltbSessionHandler`
mirroring `IgdbAuthHandler`, which is impossible given the body-borne credential; it assumes fetching
by id needs the same handshake, which needs none; and it argues `release_year` was needed to stop
remasters being matched by coin flip, where the ambiguity margin already refuses those safely.
