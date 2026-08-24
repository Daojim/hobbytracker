# HobbyTracker

A personal hobby-tracking and journaling app — what you played, when, and what you thought of
it. Games first, with movies, TV, anime, books and music sharing the same schema later.

**Status: working end to end, front and back, behind a sign-in.** A kanban board with a drag, a
journal drawer over it, IGDB search, HowLongToBeat estimates, four themes, and Google/Discord
OAuth with every pass and note scoped to whoever wrote it. The next things to build are a game
detail page and a year in review — see [Roadmap](#roadmap).

---

## What it does

The board is four columns — Backlog, Playing, Completed, and Dropped kept out of the way — and a
title moves between them by drag or from the card's own options menu. Which entry a move touches
and which timestamps it stamps are decided server-side, so no client has to know which pass is
current.

Cards carry the cover, the genre they are painted as, your rating, how long the game takes, and
the last thing you wrote about it. Clicking the title opens the journal over the board: rating,
platform, dates, your hours beside HowLongToBeat's three estimates, dated notes, and every
earlier pass with its own notes below it.

Search sits above the board rather than on a screen of its own, so the column a title will land
in is visible while you decide.

Metadata comes from [IGDB](https://api-docs.igdb.com/) and is cached locally, so a journal entry
always has something stable to point at even if IGDB later moves or deletes a record.

```console
$ curl -b jar "localhost:5173/api/games?search=hollow%20knight&limit=1"
```
```json
[{
  "id": 4,
  "title": "Hollow Knight",
  "coverUrl": "https://images.igdb.com/igdb/image/upload/t_cover_big/cobfzp.jpg",
  "platforms": ["Linux", "Mac", "Nintendo Switch", "Nintendo Switch 2", "PC (Microsoft Windows)",
                "PlayStation 4", "PlayStation 5", "Wii U", "Xbox One", "Xbox Series X|S"],
  "developers": ["Team Cherry"],
  "genres": ["Adventure", "Platform"],
  "primaryGenre": null,
  "externalId": "14593",
  "source": "igdb",
  "hltbMainStoryHours": 27.0,
  "hltbMainExtraHours": 40.5,
  "hltbCompletionistHours": 64.0
}]
```

Logging a playthrough is a separate act from cataloguing the game, and a title can be logged more
than once — replays are first-class, not an overwrite.

```console
$ curl -b jar "localhost:5173/api/library?hobby=games"
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
    "lastActivity": "2026-08-15T23:47:00+00:00",
    "genres": ["Platform"],
    "primaryGenre": null,
    "hltbMainStoryHours": 8.0,
    "latestNotePreview": "that B-side nearly broke me"
  }],
  "total": 1, "page": 1, "pageSize": 25
}
```

That game was completed in June and is being replayed now. `currentStatus` reflects the *current*
pass, so it appears under `?status=InProgress` and **not** under `?status=Completed`, even though
a completed entry sits in its history. `latestNotePreview` is the one field that does not follow
that rule: it is the last thing you wrote about the title whichever pass it was during, so a
replay you have not written on yet still carries last year's thought forward.

Timestamps are instants, and the app records days in `America/New_York` — see **Time** in
`CLAUDE.md`. A value sent without an offset is read as that wall-clock moment there, not as UTC.

### Endpoints

Everything below `/api/auth` needs a session and answers **401** without one — which is where
the `-b jar` above comes from. See [Running it](#running-it-locally) for how to fill it.

| | |
|---|---|
| `GET /api/auth/{provider}/start?returnUrl=` | 302 to Google or Discord. A navigation, not a fetch |
| `GET /api/auth/me` | who is signed in, or 200 and a literal `null` — never 401 |
| `POST /api/auth/logout` | ends the session. POST, so an `<img>` cannot sign you out |
| `GET /api/games?search=&limit=` | search IGDB, cache the results, return them ranked |
| `GET /api/games/{id}` | one game plus everything you logged against it |
| `PUT /api/games/{mediaId}/genre` | choose the genre that colours a card, or null for automatic |
| `PUT /api/games/{mediaId}/hltb` | pin a HowLongToBeat entry by hand when the matcher would not guess |
| `POST /api/games/hltb/refresh` | queue the board for HowLongToBeat. Answers 202 straight away |
| `GET POST /api/log-entries` | the journal — paged, filterable by status and title |
| `GET PUT DELETE /api/log-entries/{id}` | |
| `POST /api/log-entries/{entryId}/notes` | write a note against a pass — an append, never an overwrite |
| `GET PUT DELETE /api/notes/{id}` | one note. Rewriting it does not move its date |
| `GET /api/library?hobby=&status=&year=&sort=` | your collection, or one board column |
| `POST /api/library/{mediaId}/status` | move a title between columns — what a drag calls |
| `DELETE /api/library/{mediaId}/current` | take a title off the board |
| `PUT /api/library/order` | store one column's manual ranking |

## Stack

ASP.NET Core 10 · EF Core 10 · PostgreSQL 17 · React 19 + TypeScript · Vite 8 · Tailwind v4 ·
TanStack Query · dnd-kit

Tested with xUnit v3 + Testcontainers on the backend, Vitest + Testing Library + MSW on the
front, and Playwright against a real browser for anything needing layout or a pointer.

## Running it locally

Needs the .NET 10 SDK, Node, and Docker. IGDB credentials come from a
[Twitch application](https://dev.twitch.tv/console/apps) — IGDB has no separate signup. Sign-in
needs one app per provider, each with `http://localhost:5173/api/auth/{provider}/callback` as an
authorised redirect URI: the **frontend's** port, not the API's, because the whole flow has to
stay on one origin.

```bash
docker compose up -d db

dotnet user-secrets set "Igdb:ClientId"     "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Igdb:ClientSecret" "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Google:ClientId"      "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Google:ClientSecret"  "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Discord:ClientId"     "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Discord:ClientSecret" "..." --project backend/src/HobbyTracker.Api

dotnet tool install --global dotnet-ef --version 10.0.11
dotnet ef database update --project backend/src/HobbyTracker.Api --startup-project backend/src/HobbyTracker.Api

dotnet run --project backend/src/HobbyTracker.Api    # http://localhost:5201
cd frontend && npm install && npm run dev            # http://localhost:5173
```

Then open **http://localhost:5173**, not the API's port. Startup fails deliberately, naming the
missing setting, if any of those six secrets is absent. No provider app to hand? The end-to-end
Google stub doubles as a local one — see **Running it** in `CLAUDE.md`.

To drive the API from a shell, spend a cookie:

```bash
# Sign in once into a jar, then spend it. The redirect chain ends on the board.
curl -c jar -L "localhost:5173/api/auth/google/start?returnUrl=/board" -o /dev/null
curl -b jar "localhost:5173/api/library?hobby=games"
```

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
accumulates whatever has ever been typed into a search box. `/api/library` joins to `log_entries`
and returns only what you actually recorded something about. Conflating the two would make the
home screen a list of things you never asked to keep.

**One status vocabulary across every hobby.** `Backlog · InProgress · Completed · Dropped`, for
games and books and albums alike, stored as text rather than an ordinal. Per-hobby statuses would
make cross-hobby views impossible to write, and an int ordinal means reordering the enum silently
reinterprets existing rows.

**Leaving Completed inserts a pass rather than editing one.** Replaying a game finished in 2024
must not overwrite that completion — several entries per title is the entire reason the schema is
shaped this way, and editing in place would destroy the record silently, on a gesture as casual
as a drag.

**Sessions are an httpOnly cookie, and scoping is an injected `ICurrentUser`.** Not a JWT, and
not an EF global query filter. A query filter would scope every read automatically and
invisibly — which means nobody can review it at the call site, the background HowLongToBeat
worker would have no user to scope to, and when one goes wrong the symptom is an empty board
rather than an error. Sixteen query sites carry the predicate by hand, and twenty second-user
tests were written red first, and each was checked afterwards by reverting one predicate at a
time: every one fails exactly the tests that name it and nothing else.

**HowLongToBeat's matcher refuses rather than guesses.** Two ways of refusing, because there are
two ways of being wrong: the numerals have to agree outright ("Final Fantasy VII" scores ~0.97
against "VIII" on letters alone), and the winner has to beat the runner-up by a margin, or the
two identically-titled *Resident Evil 4* entries are settled by a coin flip that looks from
outside exactly like a confident match. Calibrated against a real library, where every correct
match scored 1.0 and the closest wrong one scored 0.64. When it refuses, you pin the id by hand
in the drawer — which survives the next backfill, as typed-in hours would not.

**IGDB's own ranking cannot tell a game from a fan game named after it.** Searching "Hollow
Knight Silksong" returns a one-person Game Boy Color game *above* Team Cherry's, because the fan
game's title is that exact string and the real one has a colon in it. So results are re-ordered
by how many people have played the game before how well the title matches. Two other rules were
tried against the live API and are worse; both are pinned by tests named after what they got
wrong.

**Ratings reject two decimal places.** The column is `numeric(3,1)`, and Postgres *rounds* rather
than refusing: an accepted `8.75` is stored as `8.8`, and the response would report a rating the
database does not hold. A 400 is the honest answer.

**Updates are `PUT`, not `PATCH`.** A field absent from the body is cleared. `PATCH` cannot
separate "clear the rating" from "leave it alone" without an `Optional<T>` wrapper, and this is
the operation the app hits most.

**Every colour in the app has a semantic name, and `index.css` is the only file that names one.**
Four themes and two densities are blocks of custom properties there; no component knows a colour,
so adding a theme is a table of values and one line of TypeScript. A test checks every foreground
against every ground it sits on, across all five palette blocks — it exists because the same
mistake happened twice, once leaving muted text at 3.8:1 for the life of the board.

## Tests

```bash
dotnet test --solution backend/HobbyTracker.slnx    # backend, 314 tests
cd frontend && npm test                             # frontend, 326 tests
cd frontend && npm run test:e2e                     # 77 specs in a real browser
```

The backend suite runs in under ten seconds. Testcontainers starts a throwaway Postgres, so it
neither needs nor touches the development database. The end-to-end specs drive a real browser
against the real API on a separate `hobbytracker_e2e` database, with IGDB, HowLongToBeat and the
OAuth provider stubbed — the drag needs layout and pointer events, which jsdom has neither of.

Those three stubs are servers rather than mocks, deliberately. The OAuth one is a whole
provider — authorize, token and user-info — so the framework's real handler runs against it
unmodified, and it *enforces* the protocol: drop PKCE and five specs fail rather than passing
quietly. The HowLongToBeat one serves the home page, two bundles and the search endpoint, because
reaching that site means scraping its bundles to find out where the endpoint moved to, and none
of that has any test above the unit level otherwise.

Against real Postgres rather than an in-memory provider, because what is worth testing here is
Postgres-specific: the partial unique index behind upsert idempotency, the `23505` the upsert
recovers from, `text[]` columns, check constraints. A fake provider passes tests production
fails. Schema comes from the real migrations, not `EnsureCreated`.

Written test-first throughout — the failing test, shown red, then the code. Where a rule is meant
to prevent something, the test for it is checked by reintroducing the thing.

## Roadmap

- [x] Schema, IGDB integration, game search
- [x] Journal, library, and the test suite
- [x] React + TypeScript frontend — the kanban board and its drag, search, and the journal drawer
- [x] Notes as dated journal entries rather than one box that overwrites itself
- [x] HowLongToBeat completion times — all three of them, with a matcher that refuses rather than
      guesses, and a pin in the drawer for when it does. Verified against the live site, and
      end to end against a stub that serves every leg of the site's access shape
- [x] A real design — semantic tokens, four themes, two densities, and a board that works from
      768px up
- [x] Search that finds the game you meant, rather than the mod named after it
- [x] Google and Discord sign-in, an httpOnly cookie session, and every pass and note scoped to
      whoever wrote it
- [ ] A game detail page, and a year in review
- [ ] Movies, TV, anime, books, music — each a sibling detail table plus its source integration

Architecture and schema notes for anyone (or anything) working in the repo live in
[CLAUDE.md](CLAUDE.md).
