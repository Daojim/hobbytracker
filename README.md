# HobbyTracker

A personal hobby-tracking and journaling app — what you played, when, and what you thought of
it. Games first, with movies, TV, anime, books and music sharing the same schema later.

**Status: backend API, working end to end.** No frontend and no auth yet — see
[Roadmap](#roadmap). The schema, the IGDB integration, the journal, and an 88-test suite are
built and green.

---

## What it does

Search pulls metadata from [IGDB](https://api-docs.igdb.com/) and caches it locally, so a
journal entry always has something stable to point at even if IGDB later moves or deletes a
record.

```console
$ curl "localhost:5201/api/games?search=hollow%20knight&limit=1"
```
```json
[{
  "id": 4,
  "title": "Hollow Knight",
  "coverUrl": "https://images.igdb.com/igdb/image/upload/t_cover_big/cobfzp.jpg",
  "platforms": ["Linux", "Mac", "Nintendo Switch", "Nintendo Switch 2", "PC (Microsoft Windows)",
                "PlayStation 4", "PlayStation 5", "Wii U", "Xbox One", "Xbox Series X|S"],
  "developers": ["Team Cherry"],
  "externalId": "14593",
  "source": "igdb"
}]
```

Logging a playthrough is a separate act from cataloguing the game, and a title can be logged
more than once — replays are first-class, not an overwrite.

```console
$ curl "localhost:5201/api/library"
```
```json
{
  "items": [{
    "mediaId": 14,
    "title": "Celeste",
    "hobby": "games",
    "currentStatus": "InProgress",
    "entryCount": 2,
    "latestRating": null,
    "lastActivity": "2026-08-15T23:47:00+00:00"
  }],
  "total": 1, "page": 1, "pageSize": 25
}
```

That game was completed in June and is being replayed now. `currentStatus` reflects the
*current* pass, so it appears under `?status=InProgress` and **not** under `?status=Completed`,
even though a completed entry sits in its history.

Timestamps are instants, and the app records days in `America/New_York` — see **Time** in
`CLAUDE.md`. A value sent without an offset is read as that wall-clock moment there, not as UTC.

### Endpoints

| | |
|---|---|
| `GET /api/games?search=&limit=` | search IGDB, cache the results, return them |
| `GET /api/games/{id}` | one game plus everything logged against it |
| `GET POST /api/log-entries` | the journal — paged, filterable by status and title |
| `GET PUT DELETE /api/log-entries/{id}` | |
| `POST /api/log-entries/{entryId}/notes` | write a note against a pass |
| `GET PUT DELETE /api/notes/{id}` | one note. Rewriting it does not move its date |
| `GET /api/library?hobby=&status=` | your collection |
| `POST /api/games/hltb/refresh` | queue the board for HowLongToBeat. Answers 202 straight away |
| `PUT /api/games/{mediaId}/hltb` | pin a HowLongToBeat entry by hand when the matcher would not guess |

## Stack

ASP.NET Core 10 · EF Core 10 · PostgreSQL 17 · xUnit v3 + Testcontainers

React + TypeScript will consume this API in a later phase.

## Running it locally

Needs the .NET 10 SDK and Docker. IGDB credentials come from a
[Twitch application](https://dev.twitch.tv/console/apps) — IGDB has no separate signup.

```bash
docker compose up -d db

dotnet user-secrets set "Igdb:ClientId"     "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Igdb:ClientSecret" "..." --project backend/src/HobbyTracker.Api

dotnet tool install --global dotnet-ef --version 10.0.11
dotnet ef database update --project backend/src/HobbyTracker.Api --startup-project backend/src/HobbyTracker.Api

dotnet run --project backend/src/HobbyTracker.Api    # http://localhost:5201
```

`backend/src/HobbyTracker.Api/HobbyTracker.Api.http` has ready-made requests for every endpoint.
Startup fails deliberately, naming the missing setting, if the IGDB credentials are absent.

## Design notes

The decisions here that were actually decisions, and what each one costs.

**Table-Per-Type inheritance for media.** `media` holds one row per title whatever the hobby;
`games` is a detail table whose primary key doubles as its foreign key back. Movies and books
arrive later as sibling tables. Table-Per-Hierarchy would make `media` a swamp of mostly-null
columns as hobbies accumulate; Table-Per-Class would duplicate the shared columns and turn
"everything I logged this year" into a `UNION` across every hobby. The cost of TPT is a LEFT
JOIN per subtype on polymorphic queries, and inserts touching two tables — acceptable at
personal-catalogue scale, and the reason querying the derived `DbSet` (an INNER JOIN) is the
cheap path.

**A partial unique index is what makes search idempotent.** `media (source_id, external_id)
WHERE external_id IS NOT NULL` is the natural key the IGDB upsert dedupes on — without it,
searching "halo" twice inserts every result twice. It is filtered because hand-entered titles
carry a null `external_id` and many must coexist. Two concurrent identical searches race; the
index turns that into a `23505` rather than a duplicate row, and the loser re-reads.

**The library is not the catalog.** Searching upserts every result as a side effect, so `media`
accumulates whatever has ever been typed into a search box. `/api/library` joins to
`log_entries` and returns only what you actually recorded something about. Conflating the two
would make the home screen a list of things you never asked to keep.

**One status vocabulary across every hobby.** `Backlog · InProgress · Completed · Dropped`, for
games and books and albums alike, stored as text rather than an ordinal. Per-hobby statuses
would make cross-hobby views impossible to write, and an int ordinal means reordering the enum
silently reinterprets existing rows.

**IGDB auth is a pipeline concern, not the client's.** A singleton token provider caches the
Twitch app token against its expiry behind a semaphore, so a burst of searches triggers one
token fetch rather than one each. A `DelegatingHandler` stamps the headers and, on a 401,
refreshes and replays exactly once — a second 401 is bad credentials, not a stale token. The
client itself contains no auth code, so every IGDB endpoint added later is authenticated free.

**Ratings reject two decimal places.** The column is `numeric(3,1)`, and Postgres *rounds*
rather than refusing: an accepted `8.75` is stored as `8.8`, and the response would report a
rating the database does not hold. A 400 is the honest answer.

**Updates are `PUT`, not `PATCH`.** A field absent from the body is cleared. `PATCH` cannot
separate "clear the rating" from "leave it alone" without an `Optional<T>` wrapper, and this is
the operation the app hits most.

## Tests

```bash
dotnet test --solution backend/HobbyTracker.slnx    # backend, 251 tests
cd frontend && npm test                             # frontend, 210 tests
cd frontend && npm run test:e2e                     # 45 specs in a real browser
```

The backend suite runs in under ten seconds. Testcontainers starts a throwaway Postgres, so it
neither needs nor touches the development database. The end-to-end specs drive a real browser
against the real API, on a separate `hobbytracker_e2e` database with IGDB stubbed — the drag
needs layout and pointer events, which jsdom has neither of.

Against real Postgres rather than an in-memory provider, because what is worth testing here is
Postgres-specific: the partial unique index behind upsert idempotency, the `23505` the upsert
recovers from, `text[]` columns, check constraints. A fake provider passes tests production
fails. Schema comes from the real migrations, not `EnsureCreated`.

Written test-first, and the suite covering pre-existing behaviour was written *before* any new
feature, so the harness was proven against code already known to work rather than going green on
its first run.

## Roadmap

- [x] Schema, IGDB integration, game search
- [x] Journal, library, and the test suite
- [x] React + TypeScript frontend — the kanban board and its drag, search, and the journal drawer
- [x] Notes as dated journal entries rather than one box that overwrites itself
- [x] HowLongToBeat completion times — all three of them, with a matcher that refuses rather than
      guesses, and a pin in the drawer for when it does. Verified against the live site, and
      end to end against a stub that serves every leg of the site's access shape
- [ ] Google/Discord OAuth and JWT — `log_entries.user_id` is nullable until then, deliberately:
      the column already existed, so the journal shipped without waiting on auth
- [ ] Movies, TV, anime, books, music — each a sibling detail table plus its source integration

Architecture and schema notes for anyone (or anything) working in the repo live in
[CLAUDE.md](CLAUDE.md).
