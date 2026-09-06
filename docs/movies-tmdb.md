# Films: TMDB, search and genres

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

This is [`games-igdb.md`](games-igdb.md)'s sibling, and it is worth reading beside it: almost
every difference below is a difference between the two providers rather than between two ways of
writing an integration. Where this file says "unlike IGDB", the IGDB file says why that one is
shaped as it is.

## The one fact everything follows from

**`/search/movie` carries no runtime and names no genre.** It answers `id`, `title`,
`release_date`, `poster_path`, `genre_ids`, `popularity` and `vote_count` — and that is all.
Everything else a card and a drawer show comes from `/movie/{id}`.

So a film reaches the catalogue half-known and is completed when somebody puts it on their board.
That is not an optimisation; it is the only shape the endpoints allow. Three things in this file
are consequences of it, and none of them makes sense without it: enrichment on add, the absence
of a genre-id lookup, and a refresh route that is one request per title.

## TMDB and search

TMDB v3, over ordinary REST. Base URL `https://api.themoviedb.org/3/`, queries are **query
strings**, and the rate limit is roughly **40 requests per second** — the documented
40-per-10-seconds was retired in 2019.

**There is no `DelegatingHandler`, and that is the deviation to explain.** `IgdbAuthHandler`
exists because a Twitch token expires and a 401 has to be replayed once. TMDB's credential is a
**v4 read access token**: one static bearer, no handshake, no expiry. So `Program.cs` sets
`DefaultRequestHeaders.Authorization` in the typed client's configuring lambda and there is no
handler at all. `Integrations/Hltb/` already established that a deviation from the IGDB mirror is
fine when it is *forced* and written down.

Two pieces where games have three:

1. **`TmdbClient`** — typed client. `SearchMoviesAsync` and `GetMovieAsync`, wrapping every
   failure in `TmdbException`, which becomes a **502** via `TmdbExceptionHandler`. There is no
   token provider, for the reason above.
2. **`MovieCatalogService`** — TMDB into the database and back out as contracts.
   `GameCatalogService`'s shape including the `23505` recovery, because what is being defended
   against is identical.

Three details the code depends on:

- **`GetMovieAsync` returns null for a 404 rather than throwing.** An id TMDB has never heard of
  is a fact the caller can act on; an exception there would make a stale id indistinguishable
  from an outage.
- **The detail call sends `language=en-US`**, because TMDB's genre *names* are language-dependent.
- **Genre ids from a search are deliberately never mapped.** `/3/genre/movie/list` is never
  called: the detail response names its own genres, and storing an id would be a promise to
  remember which language it was read in.

**Search hits TMDB on every call and caches nothing**, exactly as IGDB's does, and upserts every
result into `media` + `movies`. Searching the same thing twice must not change
`select count(*) from media`; the partial unique index on `(source_id, external_id)` turns a race
into a `23505` that `MovieCatalogService` catches, clears the change tracker over, and re-reads.

**IGDB 550 and TMDB 550 are two different rows, and must be.** The unique index is on the pair,
not on `external_id` alone — `SchemaTests` pins it, because "the same number under two providers"
is the first thing a second source can break.

### Enrichment is synchronous, and that is the contrast with HowLongToBeat

`TmdbOnMediaAdded` implements `IMediaAdded`, the fan-out `LogEntryService` calls when a title is
first logged. `HltbOnMediaAdded` is the other implementation, and the two behave differently on
purpose:

| | HowLongToBeat | TMDB |
|---|---|---|
| How it runs | queued, a background worker | in the request |
| Why | a scrape needing a handshake, behind a two-second politeness floor, against a site with no obligation to answer | one fast request against a documented API |
| What the card does meanwhile | `hltbPending` is true and `Column` polls | nothing: the card is complete when it lands |
| When it fails | the queue moves on | logged and swallowed; the film is left unenriched |

**So none of `HltbPending`'s polling apparatus applies to a film**, and no code was needed to
switch it off: the field is read off `hltb_checked_at` and is already false for anything that is
not a game.

**A handler must not be able to fail the add.** The log entry is yours; the upstream metadata is
not. `LogEntryService` logs and swallows, exactly as `HltbWorker` already does — and the failure
mode is then identical either way: the row stays unenriched, and `POST /api/movies/refresh`
finds it.

`TmdbOnMediaAdded` declines by hobby id before it queries anything. `EnrichAsync` would decline a
game anyway by finding no `movies` row, but it would spend a database round trip learning it.

### Ranking: not ported, and that was a decision

`IgdbRelevance` exists because IGDB's `search` does no prefix matching at all and cannot tell a
game from a fan game named after it. **Neither problem has been shown to exist here**, so
`MovieCatalogService.SearchAsync` keeps TMDB's own order and says so in a comment.

**Two things were meant to be measured against the live API and have not been.** They need a
`Tmdb:AccessToken`, and there was none in user-secrets when this file was written:

- Does TMDB search find a film from **half its title**? (The question that forced IGDB's second
  slug query.) The e2e stub currently assumes **yes** and matches on a substring — which mirrors
  what TMDB is documented to do, and is the deliberate difference from the IGDB stub's
  whole-word matching. **If the live API turns out to behave otherwise, the stub is what is
  wrong**, and it is lying in the more dangerous direction: a spec that half-types a title would
  pass here and fail in production.
- What does `search/movie` return for a title with **a colon in it**? `Blade Runner 2049` is in
  the stub catalogue for exactly this reason, so there is something to ask it against.

Write the answers here when they are known, and drop this section's hedge.

### Search on the board

The bar above the board is the same component games use — `search/BoardSearch.tsx` — dispatching
through `hobbies/`. What differs is what a result *says*: a game's two lines are its platforms
and its developers, a film's are its **year and its director**.

**The director's line is empty on a search result, and that is correct.** The year is on TMDB's
search response and the director is not, so the second line fills in when the film is added and
`/movie/{id}` answers. `SearchResult` takes a `SearchHit` with a `byline: string[]` rather than a
typed `Game` for this reason: it is handed lines to print, not a shape to interpret.

## Genres and colour

TMDB has nineteen genres. **Ten are named in `frontend/src/hobbies/movies.ts`**, in the order that
decides which one a film is painted as — the first entry a film has, wins.

> Documentary · Animation · Horror · Science Fiction · Thriller · Crime · Romance · Comedy ·
> Action · Drama

**Documentary and Animation lead because they name the *form* rather than the subject.** That is
`Visual Novel`'s argument from the games list applied to film: a documentary is a documentary
whatever it is about. **Drama is last** because TMDB puts it on about half of everything, so it
says the least about what an evening is like.

Nine are left out. Family, History, Music, Mystery, TV Movie, War and Western are either too rare
on one person's board to spend a hue on or say little about the evening; Adventure overlaps Action
almost entirely in TMDB's tagging. **Fantasy is the one worth adding first** if ten proves too
few — it is a genuinely different evening from Science Fiction, and it was held back only because
eleven hues is already past what colour alone can carry, which is why a card prints the genre's
name as well as painting it.

**The palette is a workshop step, not a code step.** `docs/design.md` asks that a hue be
*measured* in OKLab against its neighbours before it is added, and the ten were rendered as real
4px stripes on a real board in all eight themes, with every pair's separation printed, before any
value was written down. See **Genre colour** in `docs/design.md` for the bands and the games
palette's accepted 0.087 floor.

`Genre.stripe` is `string | null`, and null is a real state rather than a stub: the name resolves,
the automatic pick works, the drawer's select is populated, and the stripe renders the transparent
placeholder an ungenred title already gets. That is what made the palette a separate step rather
than a blocker.

**Which genre stands for a film is the user's, and TMDB never overwrites it.** `ApplyDetail` does
not touch `primary_genre` — the one field on a film that is a decision rather than a fact, exactly
as it is on a game. A maintenance route nobody ran deliberately must not undo it.

## The refresh route

`POST /api/movies/refresh` re-fetches every TMDB title anybody has logged, and answers with how
many changed.

**It is one request per film.** IGDB's refresh is `where id = (…)` batched at 500; TMDB has no
batch-by-id endpoint at all. `RefreshCeiling` is 5,000 and bounds the *work* rather than the size
of a request. It stays synchronous because it is fast per title, not because it is few requests.

**It is not scoped to the signed-in user**, and that reads like a missed scoping site and is not
one: it selects on "anybody has logged this" and writes only shared columns.
`GameCatalogService.RefreshLibraryAsync` carries the same note for the same reason. See
**What is yours** in `docs/auth.md`.

**Like IGDB's, it has no UI.** `media` rows are only ever written by a search, so a column added
by a migration stays empty on the library you already have until something asks. This has caught
people twice — see **What fails silently** in `CLAUDE.md`.

## The journal drawer, for a film

A film's pass is **a rating and two dates**. Hours played and Platform are *absent* rather than
relabelled or disabled: "your time" on a film is the runtime, which is a fact about the film and
not about the evening, and what it was watched on is not worth a control.

| Band | Games | Films |
|---|---|---|
| The title | developer byline, genre select, `HltbPin` | **director** byline, genre select, **Runtime** |
| The pass | *Playing* · rating · hours + 4 HLTB tiers · platform · started · completed | ***Watching*** · rating · started · **watched** |
| Notes | Journal | Journal |

Three things about how that is built are worth knowing before changing it:

- **`EntryForm` takes an explicit field set**, not a hobby. Stated rather than inferred from the
  values, because "no platforms listed" and "a hobby with no such idea" would otherwise look
  identical — an unenriched game has no platforms either, and it still wants the select.
- **A field this hobby does not have submits `null`**, not whatever it was seeded with. PUT clears
  an absent field, and a film's pass never holds hours or a platform, so a row that somehow has
  one is corrected by the next save rather than carrying a value with no control to see it by.
- **The runtime sits in the header band, not under the pass.** The four HowLongToBeat chips sit
  beside *Hours played* because comparing them is the entire point; a film has nothing to compare
  against, so its runtime is a fact about the film like the director is.

**The finished date takes the column's name** — Completed on a game, Watched on a film — because
the move into that column is what stamps it. *Started* needs no such thing: a film you have
started watching is one you started.

**The pin and the estimate tiers are gone together, off one null.** `TitleDetail.hltb` is one
nullable block carrying the four figures and the stored id, because they arrive together or not at
all; `hobbies/movies.ts` sets it to null and `journal.setHltbId` to null in the same file. A hobby
that wired one half of that pair fails loudly at the mutation rather than posting a film to
`/api/games`.

## Attribution — required, and not yet done

TMDB's API terms require the line

> This product uses the TMDB API but is not endorsed or certified by TMDB.

in an About or Credits area, and constrain use of their logo. The app has no About section. **The
line belongs in the `SettingsMenu` footer and in `README.md`**, and it is one line either way.
This is flagged rather than decided, and it is a requirement rather than a courtesy.

## Testing it

**`FakeTmdbClient`** is modelled line for line on `FakeIgdbClient`: `Calls`, `Results`
(OrdinalIgnoreCase) plus `DefaultResults`, a self-clearing `ThrowOnNextCall`, `ById` with
`IdLookups`, and a `static Movie(...)` factory.

**`ApiFactory` sets `["Tmdb:AccessToken"] = "test-tmdb-token"`.** Without it `ValidateOnStart`
refuses to boot and *every* endpoint test fails, not only the film ones — the same shape as the
trap in `docs/auth.md` about options captured from `builder.Configuration`.

**The e2e stub serves both endpoints, and enforces the bearer.** Both, because a stub that mirrors
only today's shape cannot warn you about tomorrow's — CLAUDE.md records what that cost with
HowLongToBeat. The bearer, because `e2e/support/tmdb-stub.mjs` is the **only** place the token
wiring is exercised end to end: remove the `Authorization` header from the typed client and a spec
goes red instead of nothing happening.

Two things in the stub are deliberate and easy to "fix" wrongly:

- **It matches on a substring where the IGDB stub matches whole words.** That is the difference
  between the two search endpoints, not an oversight — see **Ranking** above, including the caveat
  that it is currently an assumption.
- **Two non-directors sit in front of the directors in every `credits.crew` list.** A byline built
  by taking `crew[0]` would otherwise be right by luck.

A film with `runtime: 0` is in the catalogue too. TMDB writes 0 rather than omitting the field for
a film nobody has timed, `ApplyDetail` maps it to null, and `ck_movies_runtime_positive` is what
makes forgetting that a loud failure rather than a card claiming a film takes no time.

**`StatusTransitionTests` moves a film through the columns**, which is the cheapest and highest-
value proof that the transition rules carry no game concept.

**Two existing tests changed hobby rather than meaning.**
`LibraryEndpointTests.A_board_row_for_something_that_is_not_a_game_*` seeded
`GivenNonGameMediaAsync(SeedData.Hobbies.Movies, …)`; once films had a detail table that state was
unreachable for them, so they seed `Books` now and mean exactly what they meant before.
