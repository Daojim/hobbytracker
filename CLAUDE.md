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
| `Integrations/Igdb/`, `GameCatalogService`, `IgdbRelevance`, `frontend/src/search/`, `hobbies/games.ts` | `docs/games-igdb.md` |
| `Integrations/Hltb/`, `Services/Hltb*`, `Infrastructure/Hltb*`, `board/estimates.ts`, `journal/HltbPin.tsx` | `docs/games-hltb.md` |
| `Integrations/Tmdb/`, `MovieCatalogService`, `TmdbOnMediaAdded`, `MoviesController`, `hobbies/movies.ts` | `docs/movies-tmdb.md` |
| `TvCatalogService`, `TvOnMediaAdded`, `TvController`, `Domain/TvShow.cs`, `hobbies/tv.ts` | `docs/tv-tmdb.md` |
| `Integrations/Mal/`, `AnimeCatalogService`, `MalRelevance`, `AnimeController`, `Domain/Anime.cs`, `hobbies/anime.ts` | `docs/anime-mal.md` |

**The last five are the hobbies; everything above them is the platform.** That is the axis the
split was made on, because the phase after it was a second hobby — and `docs/movies-tmdb.md` was
written as `docs/games-igdb.md`'s sibling, with no new section needed in any platform file.
`docs/tv-tmdb.md` is the films file's sibling in turn and assumes it: the provider, the client
and the attribution are shared, so it says only where television differs.

**`docs/anime-mal.md` is nobody's sibling and should be read whole.** Anime and television are
both episodic and that is where the resemblance ends: a different provider, a different client, a
pass with an episode and no season, and a card with two titles.

## What exists

Everything below is built, merged and green. Nothing is half-finished.

| | | |
|---|---|---|
| **The board** | Four columns, drag or a card's `⋯` menu, manual ranking, per-column sort, one year control over the whole board | `docs/board.md` |
| **The journal** | A drawer over the board in three ruled bands — the title, the pass, the notes. Rating, dates, dated notes, every earlier pass, and per-hobby fields | `docs/journal.md` |
| **IGDB search** | A bar above the board. Two queries merged and re-ranked, mods and bundles filtered | `docs/games-igdb.md` |
| **HowLongToBeat** | Four completion figures, a matcher that refuses rather than guesses, a queue, a backfill, and a pin for when it refuses | `docs/games-hltb.md` |
| **The release calendar** | A *Coming soon* agenda under the board, **derived from Backlog rather than stored**: a title arrives in the column on its release day with no job having run. Dates shown at the precision a publisher announced, and a nightly sweep because they slip | `docs/games-igdb.md` |
| **Films, from TMDB** | A second hobby end to end: its own board, search, detail table, and a drawer with a film's fields rather than a game's | `docs/movies-tmdb.md` |
| **Television, from TMDB** | A third hobby, on the same client and a **second source row**: seasons in a table of their own, and a pass that says which episode you are on | `docs/tv-tmdb.md` |
| **Anime, from MAL** | A fourth hobby, **one card per cour**: no seasons table, a pass with an episode and no season, a card with two titles, and a re-rank because MAL's order is wrong for a person | `docs/anime-mal.md` |
| **The design layer** | Semantic tokens, eight themes, two densities, and a board that works from 768px up | `docs/design.md` |
| **Auth** | Google and Discord, an httpOnly cookie, and every pass and note scoped to whoever wrote it | `docs/auth.md` |
| **Deployment** | One Dockerfile, a compose file, Caddy in front, and an origin the app is told rather than left to guess | `docs/deploy.md` |
| **The schema** | Table-Per-Type over a shared `Media`, an Eastern journal clock, and instants rather than dates | `docs/data-model.md` |

**Four hobbies are live**, anime included. **Detail and review is the next phase** — a title
detail page and a year in review. See **What is next**, which also lists the smaller things named
but not built.

## Start here

Five things that will otherwise cost a first run an hour.

- **Sign-in and metadata credentials are all required to boot.** Google *and* Discord, IGDB *and*
  TMDB *and* MAL. The host fails deliberately and names the missing key; that is `ValidateOnStart`,
  not a bug to work around.
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

# One-time: MAL credentials. A client id and nothing else — register an app at
# https://myanimelist.net/apiconfig. One header, no handshake, no expiry, and so no auth handler.
# There is deliberately no client secret: it signs the OAuth exchange this app never performs.
# Client-ID-only access is undocumented by MAL and was measured working; see docs/anime-mal.md.
dotnet user-secrets set "Mal:ClientId" "..." --project backend/src/HobbyTracker.Api

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

**After a migration that adds a column a provider owns, run that provider's refresh** — `media`
rows are only ever written by a search, so a new column stays empty on the library you already have
until something goes and asks. `POST /api/games/refresh` for IGDB's columns;
`POST /api/movies/refresh` and `POST /api/tv/refresh` for TMDB's — **two routes, because films and
shows are separate source rows**; and `POST /api/anime/refresh` for MAL's. HowLongToBeat has its
own, which answers immediately rather than when the work is done: `POST /api/games/hltb/refresh`.
See **The backfill is a thing you run** in `docs/games-hltb.md`.

**The release calendar is the first time that rule has a visible symptom**, so it is worth knowing
before it looks like a bug: until `POST /api/games/refresh` has been run once, every game has a null
release window, every game therefore reads as released, and the *Coming soon* section is empty on a
board full of titles that have not come out. The nightly sweep does **not** fix this — it
deliberately asks only about titles already known to be unreleased, because sweeping the ones with
no window never terminates. See **The backfill is a thing you run, and the sweep is not** in
`docs/games-igdb.md`.

**`POST /api/anime/refresh` exists for that and only that.** The other three also recover a title
whose enrichment failed on add; anime has no enrichment step, because a MAL search already answers
with everything a detail call would.

## Stack

| | |
|---|---|
| API | ASP.NET Core 10 Web API (controllers, not minimal APIs) |
| Data | EF Core 10 + Npgsql 10, PostgreSQL 17 |
| Frontend | React 19 + TypeScript, Vite 8, Tailwind v4, TanStack Query, dnd-kit |
| External data | IGDB v4 (games) through Twitch; HowLongToBeat by scrape; TMDB v3 (**films and shows**, two source rows) on a static bearer; MAL v2 (anime) on a client id alone |

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
│       ├── lib/release.ts  release DAYS, which are not instants — a publisher's calendar
│       │                 day belongs to no zone. Never new Date('2026-09-26')
│       ├── lib/hours.ts  formatHours and formatMinutes — display, so board/ need not reach
│       │                 into journal/
│       ├── lib/useWheelStep.ts  a non-passive wheel listener; React's onWheel cannot cancel
│       ├── lib/useOverlayHistory.ts  the drawer's openness as a history entry, so Back closes it
│       ├── hobbies/      ONE FILE PER HOBBY — every word a person reads, the genre list,
│       │                 search dispatch, and which fields a pass of that kind has
│       ├── board/        keys.ts owns every query key, sensors.ts the drag's activation
│       │                 distance, useBoard the writes
│       ├── journal/      the drawer over the board
│       ├── search/       the bar and result strip above the board
│       ├── shell/        header, sign-in screen, session gate, hobbies, providers
│       ├── theme/        the eight themes, two densities, and the menu that picks them
│       └── test/         MSW server, fixtures, and the render helper
└── backend/
    ├── Directory.Packages.props   ALL package versions (central management)
    ├── Directory.Build.props      keeps bin/ and obj/ out of the source globs whatever
    │                              BaseOutputPath is. Not optional — see Tests
    ├── src/HobbyTracker.Api/
    │   ├── Program.cs        composition root — DI wiring lives here, nowhere else
    │   ├── Domain/           EF entities, no attributes, no persistence concerns
    │   ├── Data/             DbContext, SeedData, Configurations/, Migrations/
    │   ├── Integrations/Igdb/   client, auth handler, wire DTOs
    │   ├── Integrations/Hltb/   session, client, throttle, wire DTOs
    │   ├── Integrations/Tmdb/   client, image helper, wire models for films AND shows — no auth
    │   │                        handler, because a v4 read token never expires. (And no
    │   │                        Integrations/Auth: the OAuth handler is the framework's)
    │   ├── Integrations/Mal/    client, options, ONE wire model — search and detail answer the
    │   │                        same node, so there is nothing for a second one to say. No auth
    │   │                        handler and no image helper: a client id never expires, and MAL
    │   │                        sends full cover URLs where TMDB sends bare paths
    │   ├── Services/         orchestration (provider → database → DTO), and AuthService
    │   ├── Contracts/        what the API accepts and returns
    │   ├── Controllers/
    │   └── Infrastructure/   cross-cutting: exception handlers, the journal clock, JSON,
    │                         the HowLongToBeat queue + worker, AuthOptions, ICurrentUser
    └── tests/HobbyTracker.Api.Tests/
        ├── Infrastructure/   container fixture, host factory, fakes, TestAuthHandler
        └── Data/  Services/  Integrations/  Endpoints/
```

**The layering rule worth keeping: a provider's wire types never leave its own `Integrations/`
folder, and EF entities never leave the service layer.** Controllers speak `Contracts/` only.

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
need Docker running. A full run is about twenty seconds, and `npm run test:e2e` about two and a
half minutes end to end.

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
- **`backend/Directory.Build.props` is what keeps the trick from eating the machine, and it is not
  optional.** The SDK excludes only `$(BaseOutputPath)**` from the default globs — so the moment
  that points at `bin/e2e/`, the sibling `bin/testrun/` becomes ordinary Content and the build
  **copies it into the output**. The next run does it in the other direction, and it compounds.
  See **A build that gets slower every time you run it** below.

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
starts seven servers itself — no manual setup beyond `docker compose up -d db`: a **HowLongToBeat
stub** on :5398 with `Hltb__MinSecondsBetweenRequests=0` (see **Testing it** in
`docs/games-hltb.md`); an **OAuth provider stub** on :5397 (see **The test harnesses** in
`docs/auth.md`); an **IGDB stub** on :5399, a **TMDB stub** on :5396 and a **MAL stub** on :5395,
which are what make "seed through the API, never the provider" possible at all, since `media` rows
are *only* ever written by a search; **the API** on :5202 under `ASPNETCORE_ENVIRONMENT=E2E`; and
**Vite** on :5174 with `VITE_API_TARGET` pointed at :5202. Two things about that wiring fail
quietly:

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

### A build that gets slower every time you run it

**Fixed on 6 September 2026 by `backend/Directory.Build.props`. Kept because the symptom was
misdiagnosed twice, and the second misdiagnosis is in this file's own history.**

For weeks the e2e suite's API `webServer` would blow through its ten-minute timeout. It was
blamed on the machine and on a live virus scanner. **It was neither.** The build was slow because
**each run made the next one slower**, and nothing anywhere said so.

The SDK excludes `$(BaseOutputPath)**` from the default Compile/Content/None globs. That is
sufficient while `BaseOutputPath` is its default `bin/` — but **two things here override it**, the
e2e run to `bin/e2e/` and `dotnet test` to `bin/testrun/`, both to dodge the build lock above. With
it pointed at `bin/e2e/`, the sibling `bin/testrun/` is no longer excluded, so it is globbed as
ordinary Content and **copied into the output**. The next run, pointed the other way, copies the
now-larger tree back. It doubles.

What that had reached, measured before the fix:

| | |
|---|---|
| `bin/` across the two projects | **289,490 files, 1.68 GB** |
| Nesting | `bin/e2e/…/bin/testrun/…/bin/e2e/…` **twenty-five levels deep** |
| A *no-op* incremental build | **3m21s** — 37.9s in `DefineStaticWebAssets`, 23.2s in `_CopyOutOfDateSourceItemsToOutputDirectory`, both just walking the pile |
| The same build, after | **7.6s** |
| `npm run test:e2e`, start to finish | **timed out at 10m** → **2m37s, 100 specs** |

**What made it hard to see.** Every symptom pointed somewhere else. Playwright reports a slow
`webServer` the same way it reports a missing database. `git status` is clean throughout, because
`bin/` is ignored. The build genuinely is compute-bound, so "the machine is busy" fits. And it is
*intermittent by construction* — it only crosses the ten-minute line once the pile is big enough,
which is why it worked, then flaked, then failed reliably.

**The measurement that broke it open was `-clp:PerformanceSummary`.** CPU sampling had already
ruled out the virus scanner — the build processes burned ~1s of CPU per second of wall clock,
which is compute-bound, where AV interference looks like *low* CPU and high wall time. The
performance summary then named `DefineStaticWebAssets` and the copy target, and Static Web Assets
has no business taking 38 seconds in an API with no `wwwroot`.

**If a build here is ever mysteriously slow, count the files in `bin/` before anything else.**

```bash
find backend/src/HobbyTracker.Api/bin -type f | wc -l    # ~200 is right; 100,000 is the fault
```

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
Do not "fix" it by adding a wait before the click: a copy with no wait passed 4 of 4. **It did not
recur across four full-suite runs on 6 September**, including two while a build was running, so it
is genuinely intermittent rather than steadily worsening — but the measurements above stand and
this note stays until something explains them.

## Settled — do not reopen

Decided with the user. Each is a real decision with a cost that was accepted, not a default.

| | |
|---|---|
| Shape | Vite + React + TS SPA, client routing. Not Next.js |
| Scope | **`/board/:hobby`, behind a session, plus `/signin`.** Search is a bar on the board, not a screen; `/board` and `/search` both redirect to the games board. No detail or year-review page yet |
| Columns | Backlog · Playing · Completed, **then Dropped last** — **and the labels are the hobby's**: a film or a show is Watching and Watched. `columnsFor` in `hobbies/` is the one list, and the card's menu and the drawer both read it |
| A hobby's words | **`frontend/src/hobbies/`, one file per hobby.** Column labels, the length label and its format, the pass noun, the genre list, search dispatch, which fields a pass has, and how it says where you are in one. Never a branch on the slug |
| Anime | **Its own hobby, from MAL, and one card per cour** — Frieren and Frieren 2nd Season are two cards because they are two MAL ids. Anime does not appear in a TV search; **the Movies board is deliberately left alone**, and that asymmetry is intended. A film reads fine on two boards; a series with episode progress on two boards is the confusing case. `docs/anime-mal.md` |
| An anime's name | **The English title leads and the romaji one sits under it** — card, drawer and search tile alike, and `sort=title` files it under the name on screen. It shipped the other way round and was reversed the same day, so the code-shaped argument for romaji-first is a temptation rather than a finding: `media.title` still holds the romaji, because that is what a MAL search matches on. Presentation only, and nothing is stored twice. `docs/anime-mal.md` |
| Where you are | The season-and-episode pair is **television's**; anime has the episode alone, because the cour *is* the entry. `PassFields.progress` is `false \| 'episode' \| 'season-episode'`, and **the database no longer holds the rule** — `ck_log_entries_episode_needs_season` is gone, and each hobby's form holds it instead |
| Dropped | A muted well **at the far right**, after the progression, collapsed by default. It spent 29 August to 7 September 2026 ahead of Backlog and came back; the argument on both sides is in `docs/board.md`. *Move to Dropped* in a card's menu, or a drag — **collapsed or not**; drag out to un-drop |
| Card corner | An **`⋯` options menu on all four columns**: the three columns it is not in, then *Remove from board* |
| Note on a card | The last thing you wrote about a title, **across every pass**, clamped to two lines. Every other field on a card comes from the current pass; this one deliberately does not |
| Year | **One control above the whole board**, defaulting to the latest year there is. Backlog is exempt; the other three filter on the date each is about |
| Coming soon | **A view of Backlog, under the board — not a fifth status and not a fifth column.** An unreleased title is a real Backlog entry, so release day needs no job: the same row starts answering the other question. Shown at the precision a publisher announced, never a day nobody named. Games only, because IGDB is the only provider asked for a release window — and that is a fact about providers, not a branch on the slug. `docs/games-igdb.md` |
| Ordering | `manual` is the default sort; dragging is enabled **only** in that mode |
| Sort control | **Per column**, not board-wide. Completed reads well by rating while Backlog stays in the order you put it in |
| Libraries | TanStack Query, dnd-kit, Tailwind v4 |
| Dev wiring | Vite proxy `/api` → `:5201`, **`changeOrigin: false`** so sign-in stays on one origin. **No CORS change needed or wanted** |
| Testing | Vitest + RTL + MSW for logic and components; Playwright for the drag |
| E2E harness | Real API and real Postgres on a **separate `hobbytracker_e2e` database**, with IGDB, TMDB, MAL, HowLongToBeat and the OAuth provider stubbed |
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
| **A new *required* variable in `deploy/compose.yml` does not reach a deployment that already exists.** `.env` lives on the server and is gitignored, so `${NEW_THING:?…}` fails at interpolation — before compose picks a profile or looks at a service — and nothing starts. Loud, and it leaves the running site up; the quiet version is the same variable without `:?` | `docs/deploy.md` |
| **Overriding `BaseOutputPath` un-excludes every *other* output directory from the source globs**, so the build copies its siblings into itself and compounds every run. It reached 289,490 files and 1.68 GB, nesting twenty-five deep, and presented only as a build that got slower — `git status` stays clean, because `bin/` is ignored. `backend/Directory.Build.props` holds it; delete those two lines and one build reproduces it | **Tests**, above |
| **`media` rows are only ever written by a search**, so a column added by a migration stays empty on the library you already have until something asks. `POST /api/games/refresh`, `POST /api/movies/refresh`, `POST /api/games/hltb/refresh` — **none has any UI, and this has now caught people twice** | `docs/games-hltb.md` |
| **A `TitleDetail` field a hobby leaves empty and one it has no idea of look identical**, which is why `journal.fields` is stated rather than inferred: an unenriched game has no platforms either, and it still wants the select. Inferring it hides the control on a title that was merely not fetched yet | `docs/movies-tmdb.md` |
| **TMDB numbers films and shows separately, so one shared `tmdb` source row makes film 1396 and show 1396 the same row.** In production that would not even error: `UpsertAsync`'s `23505` recovery re-reads and hands back the film, and a show is silently a film. `tmdb-tv` is a **fourth source row**, `mal` a **fifth**, and a second provider for an existing hobby needs one too | `docs/tv-tmdb.md` |
| **A MAL node carries `id`, `title` and `main_picture` whatever `fields` asks for, and nothing else.** A column added to `anime` without a word added to `MalClient.Fields` fills with nulls for ever — and a null there is **indistinguishable from a title MAL has nothing to say about**. `MalClientTests` asserts the list rather than trusting it | `docs/anime-mal.md` |
| **MAL answers `0`, not null, for a figure nobody has filled in** — an unaired cour's episode count and duration, an unrated title's mean. Nought is not merely a lie a card would print: `ck_anime_counts_positive` and `ck_anime_mean_score_range` **refuse the write**, so an ordinary search becomes a 500 | `docs/anime-mal.md` |
| **A stub that mirrors only today's shape cannot warn you about tomorrow's.** HowLongToBeat's search endpoint became a two-segment path and a guard refused it; the suite stayed green because the stub was a single segment for as long as the site was | `docs/games-hltb.md` |
| **A null `media.release_precision` means *no window is known* and must read as *released*.** Every row that existed before the release calendar carries it. Get it backwards and the migration empties every user's Backlog column on deploy day — no error, no log line, just a board with its queue gone. It is `games.hltb_checked_at`'s distinction, and `Unknown` is the *different* claim that a provider was asked and says the title is announced but undated | `docs/data-model.md` |
| **A release date is a day and must never go through the journal zone.** `new Date('2026-09-26')` is midnight *UTC*, so rendering one the way every other date in this app is rendered shows the 25th — the `System.Text.Json` trap above, arriving from the other side of the wire. Days live in `lib/release.ts`; `lib/time.ts` is instants | `docs/data-model.md` |

## Schema

The tables and their columns. **Why they are shaped this way** — Table-Per-Type and the one line
that makes EF choose it, the decisions that will look arbitrary later, and the Eastern journal clock
— is `docs/data-model.md`.

| Table | Columns |
|---|---|
| `hobby_lu` | `id`, `name` — games, movies, tv, anime, books, music |
| `source_lu` | `id`, `name`, `base_url` (null for `manual`) |
| `media` | `id`, `hobby_id`, `source_id`, `title`, `external_id`, `cover_url`, `release_date`, `release_end`, `release_precision`, `release_status`. **The four release columns are here rather than on `games` deliberately** — the board *filters* on them, and a TPT downcast in a filter position empties it with no error |
| `games` | `media_id` (PK **and** FK to media), `platforms`, `developers`, `genres`, `primary_genre`, `release_year`, `hltb_all_styles_hours`, `hltb_main_story_hours`, `hltb_main_extra_hours`, `hltb_completionist_hours`, `hltb_id`, `hltb_checked_at` |
| `movies` | `media_id` (PK **and** FK to media), `release_year`, `runtime_minutes`, `genres`, `primary_genre`, `directors` |
| `tv_shows` | `media_id` (PK **and** FK to media), `first_air_year`, `last_air_year`, `air_status`, `number_of_seasons`, `number_of_episodes`, `episode_runtime_minutes`, `total_runtime_minutes` (**generated**), `genres`, `primary_genre`, `creators` |
| `tv_seasons` | `media_id` + `season_number` (composite PK), `name`, `episode_count`, `air_date` |
| `anime` | `media_id` (PK **and** FK to media), `english_title`, `media_type`, `episode_count`, `episode_runtime_seconds` (**MAL's own unit**), `total_runtime_minutes` (**generated**, and it converts), `start_season`, `start_year`, `air_status`, `source_material`, `genres`, `primary_genre`, `studios`, `mean_score`. **No seasons table** — a cour is its own MAL entry |
| `log_entries` | `id`, `user_id` (**NOT NULL**), `media_id`, `status`, `position`, `rating`, `platform`, `hours_played`, `season_number`, `episode_number`, `started_at`, `completed_at`, `logged_at` |
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
- [x] **The platform stops naming games** — `/board/:hobby`, `mediaKey(hobby, id)`, `LengthHours`
      replacing the HowLongToBeat headline on a board row, and `IMediaAdded` in place of an
      unguarded enqueue. No feature; the existing suite is what said it worked.
- [x] **Films, from TMDB** — a `movies` table, a TMDB integration with no auth handler, enrichment
      on add rather than in a queue, `frontend/src/hobbies/` holding every word a hobby owns, and a
      drawer whose fields are the hobby's.
- [x] **Television, from TMDB** — a third hobby on the same client and a **second source row**;
      `tv_seasons` as a table because EF refuses JSON on a TPT entity; a pass that says which
      episode you are on, on the card as well as in the drawer.
- [x] **Anime, from MAL** — its own hobby rather than a filter on television, **one card per
      cour**, and a fifth source row. The platform stretched twice and both stretches went in as
      additions to every hobby's contract: `ck_log_entries_episode_needs_season` was dropped and
      `PassFields.progress` became three-valued, because a cour *is* the entry; and
      `LibraryItemDto.Subtitle` gave the board row a second title. No `IMediaAdded` handler,
      because a MAL search answers everything a detail call would.
- [ ] **Detail and review — next.** A title detail page and a year-in-review page.
- [x] **The release calendar** — a *Coming soon* agenda under the board, and the first half of
      *filling the board without searching*. Not a fifth status and not a fifth column: the same
      Backlog rows read the other way round, which is the whole of why release day needs no job.
      Four `media.release_*` columns rather than `games.*`, because the board filters on them;
      one expression owning the word *released*, negated for the other half; and IGDB's
      `date_format` and `game_status`, which are the deprecated-twin trap a second time.
- [ ] **Filling the board without searching — half done.** The calendar shipped; the grid of what
      is popular has not. See **Discovery: a grid of what is popular** in `docs/games-igdb.md`.
- [ ] **The hobbies after it.** Books and music — each a sibling detail table deriving from
      `Media`, plus its source integration. Add the `source_lu` row with the client, and a file
      in `frontend/src/hobbies/`.

**A completed phase gets one line, because what it *learned* is in the `docs/` file for the area
it touched** — that is the growth rule at work, applied to this list. `README.md`'s roadmap is the
same history written for a reader rather than for a session.

**Auth was deferred three times on purpose, and that is now history rather than guidance.** The
original brief had it second, but `log_entries.user_id` was nullable, so sequencing auth first would
have left the app unable to do its job while it was built. The column is `NOT NULL` now, and the
deferral is spent.

### What a fifth hobby has to do

**Television went through this list on 7 September 2026 and it held. Anime went through it the
same day and it held again**, which is the more useful of the two runs: television is TMDB twice
and anime is a provider nothing here had seen. Nothing in `board/`, `search/` or the platform
needed touching either time. What *did* change both times was `PassFields` and `TitleDetail`,
because each hobby had an idea no other one has — which is the list working rather than the list
being wrong. Both rows are marked below.

**Anime found three things this list did not say, and they are now in it:**

- **A provider may need no enrichment at all.** MAL's search and detail endpoints answer the same
  node, so there is no `IMediaAdded` handler and a card is complete the moment it is *found*.
  The Enrichment row already said "if the provider needs a second call"; it is worth knowing that
  one of four does not.
- **A hobby may need a field on the *board row*.** `LibraryItemDto.Subtitle` was the first
  addition there since television's progress pair, and it goes in through the same downcast in
  both projections.
- **A hobby may need a rule *removed*.** `ck_log_entries_episode_needs_season` was true of every
  hobby that existed when it was written and false for the fourth.

| | |
|---|---|
| Schema | A `Domain/<Thing>.cs` deriving from `Media`, and a configuration copying `MovieConfiguration` — **including `ToTable(...)`, which is the entire mechanism that makes EF choose TPT.** A `SeedData.Sources` id, its `NameFor` arm and its `HasData` row; `hobby_lu` already carries all six hobbies |
| Backend | An `Integrations/<Provider>/` client and exception handler, a catalog service on `MovieCatalogService`'s shape (the `23505` catch included), a controller, and the `Program.cs` block — **resolving `IOptions` inside the configuring lambda**, never from `builder.Configuration` |
| `LibraryService` | One more `?? (row.Media as <Thing>)!` beside the existing pair, in **both terminal projections and the `LibrarySort.Length` arm — and nowhere near `BoardQuery`**. Nulling only `ItemAsync` fails the move-and-list-agree test and nothing else, which reads as drag flicker. **`LibrarySort.Title` carries a downcast too**, added when anime's English title became the name a card leads with — so `Sorted` now has two arms a hobby can need and `BoardQuery` still has none. **The four `release_*` fields need nothing** — they are on `media`, so both projections read them plainly, which is the argument for putting a shared fact on the shared table rather than filing it by provider |
| Frontend | `api/<thing>.ts`, its two types, one file in `hobbies/`, and `ready: true` in `shell/hobbies.ts`. **Nothing else in `board/`, `journal/` or `search/` should need touching** — if it does, that is the finding, and it is a finding worth having rather than a failure. TV's was `PassFields.progress`; anime's widened that same field to three values and added `TitleDetail.episodeCount` and `LibraryItemDto.Subtitle`. All four went into the contract for every hobby rather than branching on the slug |
| The flip | **`index.css`'s tokens and `ready: true` are one atomic commit.** `palette.test.ts` fails in both directions — hues with the hobby unbuilt fail *are all spoken for*, and the hobby built with unpainted genres fails *paints every genre it names*. `App.test.tsx`'s "a hobby nobody has built" example has to move to a still-unbuilt slug, and it does **not** fail when it should: it passes for the wrong reason |
| Enrichment | An `IMediaAdded` implementation if the provider needs a second call. Decline by hobby id first, and never let a failure take the log entry with it |
| Tests | A fake client, an `ApiFactory` entry (**a missing required option refuses to boot the whole suite**), a `Given<Thing>Async`, an e2e stub serving *every* endpoint the client calls, and one case in `StatusTransitionTests` |

**Two things are still true of the platform and are worth not rediscovering.**

- **`BoardPositions.TopOfColumnAsync` is scoped to `(status, user)` and not to hobby.** A film
  taking `min(position) - 1` lowers a floor the games board shares — and moves nothing, because
  only the *relative* order inside a column is ever read. Its own comment says so. Do not change it.
- **A title's entries order `logged_at DESC, id DESC` at six call sites that must agree, with no
  shared helper.** `MovieCatalogService.EntriesFor` was the fourth and `AnimeCatalogService`'s the
  sixth. See **Library is not the catalog** in `docs/board.md`.

### Small things, named so they are not rediscovered

- **Hiding the Dropped column, per board.** Asked for on 7 September 2026, in the same breath as
  moving it back to the far right, and deliberately not designed yet. The open question is what
  *per board* means: a fact about the hobby, like `columnLabel` — a films board that simply never
  has one — or a preference somebody sets and the browser remembers, like the theme and the
  journal's box. The second is the likelier reading and the more expensive one. `BOARD_STATUSES`
  is what the grid, the drop targets and `otherColumns` all derive from, so a hidden column has to
  leave a card's menu with it, or *Move to Dropped* offers a move to somewhere that is not on
  screen — and a title already sitting in a hidden column needs an answer before, not after.
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
  TMDB's against roughly 40 req/s, and unbounded HowLongToBeat lookups **from whatever address the
  app is deployed on**, at a site with a documented history of blocking unofficial clients. That
  last one is the real risk. Until the setting exists the gate belongs *in front of* the app rather
  than in it. Design when it is wanted: a bool on `AuthOptions`, checked in
  `AuthService.SignInAsync` **before creating a user** so existing accounts keep working while it
  is off, and flippable by environment variable without a rebuild. One wrinkle — throwing inside
  `OnCreatingTicket` surfaces as a 500, and a refusal wants a real error path.
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

**`anime-as-its-own-hobby.md` is now history**, and its contents live in `docs/anime-mal.md` —
the decisions, the provider measurements, and the two stretches it predicted. The phase shipped on
7 September 2026, the day after the file was written. Two things it got wrong are worth knowing if
anybody opens it: it expected the genre palette to be workshopped with the user (it was picked,
at the user's request), and it left the search re-rank's rules open where they are now measured
and pinned.

One is worth a warning if you open it: `for-the-next-part-delightful-alpaca.md`, the HowLongToBeat
plan. Three of its assumptions did not survive contact with the site — it has an `HltbSessionHandler`
mirroring `IgdbAuthHandler`, which is impossible given the body-borne credential; it assumes fetching
by id needs the same handshake, which needs none; and it argues `release_year` was needed to stop
remasters being matched by coin flip, where the ambiguity margin already refuses those safely.
