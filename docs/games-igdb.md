# Games: IGDB, search and genres

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

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
- **The bar is remounted when the nav changes hobby, and the remount is the whole of what empties
  it.** `BoardPage` keys `BoardSearch` on the hobby. Without that key a term stays in the box across
  the nav and is then sent to the *other* provider, because the search is dispatched and keyed by
  hobby — measured, not argued: typing "hollow" on games and clicking Movies asks TMDB about Hollow
  Knight. **Clearing the term from inside would not have been enough.** `useDebounced` has already
  settled by the time the prop changes, so the first render under the new hobby is away to the new
  provider with the old word before any effect could run. Remounting starts the term, its debounced
  copy and the ids added since it opened empty together, which is the honest description of what a
  hobby change means to this component.
- **`BoardSearch` is tested on its own, never through `BoardPage`**, because a result's title and a
  card's title are both an `<h3>`. **One case is the exception and has to be**: the box emptying on
  a hobby change is the bar outliving the board it belongs to, which only the page can produce — it
  asserts a box's value and what each provider was asked, and no `<h3>` anywhere. For the same
  reason `e2e/support/board.ts`'s `card()` is scoped to `[data-board]` — it was a bare
  `getByRole('listitem')`, which a search result tile answers to.

`/search` redirects to the games board rather than being dropped — the address outlived the page, and
so did the bare `/board` it used to redirect to, which now redirects in turn.

## Genres and colour

Cards carry a colour bar down their left edge, from IGDB's genres. `frontend/src/hobbies/games.ts` is
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
DTO projections only — see **Query keys, ordering, and the traps** in `docs/board.md`.

**HowLongToBeat's backfill does not ride this rail, though it was expected to.** This one is
synchronous and reports what it changed, because IGDB answers 500 titles in one request; HLTB answers
one at a time behind a politeness floor of seconds, so its backfill queues and answers 202 with a
count of what was queued.

## The release calendar

**A "Coming soon" agenda under the board, holding the Backlog entries whose title is not out yet.**
Built September 2026, and it is half of what **Discovery** below was written to describe: the
calendar is done, the popular grid is not.

### It is a view of Backlog, not a fifth column

An unreleased title is a real Backlog entry. *Add to calendar* and *Add to Backlog* write the
identical row through the identical endpoint; only the button's wording differs, because the game
is not out. The calendar is those entries pulled out of the Backlog column and drawn on a time axis
below the board.

**Three things follow for free, and every one of them would otherwise be machinery:**

- **A title arrives in Backlog on its release day with nothing having run.** No job, no sweep, no
  scheduled transition. The day the date passes, the same row answers the other question.
  `a title arrives in the backlog on its release day, with nothing having run` proves it by moving
  the date rather than the row.
- **Backlog titles that are not out move to the calendar with no migration.** Same partition,
  applied the moment release dates exist.
- **The status vocabulary is untouched.** A fifth `LogStatus` was never on the table — it is one
  shared four-value enum across every hobby so cross-hobby views stay writable.

The cost, accepted: the Backlog column's count is no longer a count of Backlog rows, and one
expression has to own the word *released*.

### One expression owns "released"

`ReleaseWindow.NotOutOn(today)` in `Domain/`, and **three things ask it**: the Backlog column
excludes them, the calendar is exactly them, and the nightly sweep re-asks IGDB about exactly them.
`GameDto` asks a fourth time, in memory, so a search tile cannot disagree with the column a title
will land in.

Written out three times it would drift, and **the drift is invisible** — a title in both the column
and the calendar, or in neither, with nothing erroring. So:

- The column and the calendar are literally `p` and `Not(p)`, negated as an expression rather than
  restated. `A board row is on exactly one side of the release line` seeds one title of every shape
  and asserts the two sides partition them — which is the test that would catch a three-valued-logic
  hole, the kind that bit `ck_media_release_window` during its first draft.
- `NotOutOn<T>(today, row => row.Media)` re-points the same expression at a shape that *has* a
  media rather than being one, because EF Core cannot translate an `Invoke`.
- `ReleaseWindow.IsOut(media, today)` is the in-memory form, compiled from the same expression and
  memoised per day — a search returns up to five hundred results and compiling an expression tree
  each time is real work for an answer that changes at midnight.

**The partition applies only where a status is named**, and that is load-bearing rather than tidy.
`Filtered` also runs with no status — `ActivityYearsAsync`, `ReorderAsync`, and the un-statused
`GET /api/library` that `libraryMediaIds()` pages through. Narrow that last one and an unreleased
title drops out of the search strip's *"On your board"* set, the strip offers to add a title you
already have, and the second press writes a Backlog entry the card renders as a replay that never
happened. Nobody would trace that back to a release date.

**And it carries no hobby condition.** A film's `release_precision` is null for ever, so the first
clause leaves the movies board exactly as it was. That is what makes "no branch on the hobby slug"
true on the server *by construction*: whether a hobby has a calendar is decided by whether anything
fills its columns. The flag in `frontend/src/hobbies/` only decides whether the section renders —
and the two halves are one commit, or a hobby's unreleased titles leave Backlog with nowhere to go.

### What IGDB had to be asked for, measured

`SearchFields` gained `release_dates.date`, `release_dates.date_format.format` and
`game_status.status`. Four things about that, all measured against the live API on 11 September
2026 rather than read off a doc page.

- **`release_dates.category` is deprecated in favour of `date_format`, and `game.status` in favour
  of `game_status`. This is the `game_type` trap a second time** — see **Game types** above, which
  records the first. A deprecated twin here stops being *populated* rather than erroring, so a
  mapping written against `category` comes back absent on every row, defaults to 0, and calls every
  game day-precision while reading as perfectly correct. `Does_not_read_the_deprecated_release_date_category`
  asserts the query does not mention either.
- **Both replacements are reference endpoints whose integer ids are published nowhere**, so the
  string is what gets mapped. `/v4/date_formats` answers `YYYYMMDD`, `YYYYMM`, `YYYY`, `YYYYQ1`
  through `YYYYQ4`, `TBD` — note the spelling, which the deprecated enum documents as `YYYYMMMMDD`
  and `YYYYMMMM`. `/v4/game_statuses` answers `Released`, `Alpha`, `Beta`, **`Early Access`** with a
  space, `Offline`, `Cancelled`, `Rumored`, `Delisted`, and there is no id 1.
- **The depth-3 expansion works**, and costs: a 500-id batch grows from 549 KB to 967 KB. Accepted,
  because the alternative is a second request per game.
- **`game_status` is absent on most games.** Neither *Grand Theft Auto VI* nor *The Elder Scrolls VI*
  carries one, so null there is ordinary rather than a failure and the window is the fallback.

### The three shapes a date arrives in, and why the third is not the second

**A vague date is sent as the *last* day of its window.** *The Witcher IV* "2028" arrives as
2028-12-31; *007 First Light*'s "Q3 2026" row as 2026-09-30. This inverts the obvious assumption,
and reading either as a start would file the title a whole window late. `ReleaseWindow.For` derives
both ends from **the unit the day falls in**, which is right whichever end a provider chooses to
give and needs no bet on their convention.

**`release_dates` is one row per platform and per region.** *The Wolf Among Us 2* carries six rows
all reading 2027; *Inzoi* carries two real dates and two TBD ones. `release_dates[0]` is therefore a
coin flip that often lands on a Japan-only date or a re-release — the row that matters is whichever
one's `date` equals `first_release_date`. **A TBD row carries no `date` key at all**, rather than a
null or a nought, which is what lets the matching walk over them.

And the distinction that took a measurement to find:

| what IGDB sends | what it means | where the title goes |
|---|---|---|
| a date, with a matching `date_format` row | an announced window | its month, quarter or year |
| no date, **with** explicit `TBD` rows | announced and undated | the *No date yet* bucket |
| no date, **and no rows at all** | IGDB has nothing to say | **Backlog** — no window at all |
| a date, with no row to explain it | rows pruned from an old entry | read as a day |

The third row is the one worth knowing. A query for games with no `first_release_date` comes back
full of *Wubble Bubbles*, *Soccer Cup 2022* and *Flashy Maze* — obscure titles that shipped and
nobody filled in. Reading those as TBD would fill the calendar with shovelware nobody is waiting
for, and the nightly sweep would ask about them for ever, since nothing would ever give them a
date. So they get no window, which reads as released.

### The backfill is a thing you run, and the sweep is not

`ReleaseRefreshWorker` is the first time-driven worker in the app. It copies `HltbWorker`'s three
conventions exactly — a singleton taking `IServiceScopeFactory` and opening a scope per unit of
work, an options flag that short-circuits at startup and logs that it did, and every failure logged
and swallowed — and adds the one thing a queue-driven worker never needs: a `PeriodicTimer`.

**It sweeps the not-yet-released titles only, never the ones with no window.** That is
`games.hltb_checked_at`'s lesson exactly: without a marker saying we asked, a title IGDB has
stopped answering for is re-asked about every night, for ever. The consequence is worth stating
plainly rather than discovering: **on the day this ships the calendar is empty until
`POST /api/games/refresh` is run.** Which is what `CLAUDE.md` already tells you to do after a
migration adds a provider-owned column — this one just has a visible symptom.

**It is switched off in two places and the second is easy to miss.** `ApiFactory` removes it from
the test host, through a `RemoveHostedService<T>` helper so the third worker somebody adds is one
line rather than eight nobody copies. And `playwright.config.ts` sets `ReleaseRefresh__Enabled` to
false — which `HltbWorker` has never needed, because nothing enqueues unless a spec adds a title. A
timer needs no invitation: left on, it would wake five minutes into a run and rewrite the release
windows the specs are asserting on, presenting as a flake in a spec that never mentions IGDB.

### The stub grew dates, and that was the largest single cost

`igdb-stub.mjs` sent no release data at all. The moment the client asked for some, every stub game
became *announced and undated*, left Backlog, and took most of the board and journal specs with
it — failing with nothing anywhere naming a release date. So **every catalogue entry carries a past
day-precision date**, and that is load-bearing rather than decoration.

Three upcoming fixtures were added, one of each shape: *Silksong II* three months out to the day,
*Hades III* a quarter eighteen months out, and *Celeste 64* with explicit TBD. They are dated
relative to the run rather than pinned, because a fixed date stops being in the future. **The
quarter fixture computes its date and its label from the same day** — written separately, a date
drifting into the next quarter went on carrying the previous quarter's label, and the stub asserted
a shape the real API never produces. It cost one round to notice.

One fixture is deliberately *without* a precision: IGDB prunes `release_dates` from older entries
while keeping `first_release_date`, and that shape has to read as a day.

**A catalogue name that prefixes another is a locator hazard.** "Celeste 64" makes a search for
"Celeste" answer with two tiles, one of them unreleased, and Playwright's `hasText` is a substring
match — so a spec filtering on a title that is also a prefix will silently pick the wrong tile.
Name the tile by its heading, or search something unambiguous.

## Discovery: a grid of what is popular

**Half of this shipped as the release calendar above; what is left is the popular grid, and it is
still not designed.** The user has asked for the phase to exist and said the shape needs
workshopping. One thing is known: **popular games are a grid of cover art.** Everything below is
constraint the codebase already carries, gathered so none of it has to be rediscovered. **None of it
is a decision.** The reason for the phase: a search box asks you to already know what you want, and
filling a board — especially filling one *backwards*, which is what the year control now exists for
— is mostly the other problem.

**What is already true, and bears on it:**

- **The popularity numbers are never stored**, so a popular grid is a live query by construction and
  a stored "top games" table is the thing this codebase has already decided against once. `hypes` is
  the unreleased half. See **Ranking search results**.
- **The catalogue grows by search, and only by search**, so whether *browsing* writes rows at all is
  a real decision: forty covers idly scrolled would grow `media` faster than every search ever
  typed. The cheap answer is that browsing upserts nothing and only adding does — but that is not
  how the search strip works today, and the two should probably agree.
- **"On your board" already exists and has to be reused**, and knowing it needs the *whole* library,
  which is why `libraryMediaIds()` pages to the end. A grid puts far more tiles on screen. The
  release calendar has already made this sharper: that list is also what the Backlog partition must
  not narrow.
- **`Season` finally bites here, and this is the phase that should settle it** — seasons and
  episodes are precisely what a "coming soon" list fills with, and the calendar has not settled it.
  See **Game types**, and note **Bundle** is the arguable half left easy to take back.
- **Nothing here caches, and this is where that stops being free.** A grid is several queries for
  data that changes daily rather than per-keystroke. IGDB's limit is 4 requests a second.
- **Covers compose at any size already** — `IgdbImage` builds from `cover.image_id`, so a grid can
  ask for a larger one without a new field or a migration, and 5:7 is already the app's poster
  ratio.
- **Games only, whatever it looks like.** IGDB is the only source with a client behind it.

**What has to be workshopped**, phrased as the questions rather than as answers:

- **A screen of its own, a strip like search, or a panel over the board?** `/search` was already
  retired *into* the board once, and the reasoning — the column a title is about to land in should
  be on screen while you decide — pulls against a full-page grid, though perhaps less hard for
  browsing. The calendar answered the same question by sitting under the board.
- **Popular by what, over what window?** `total_rating_count` and `hypes` are what the ranking uses;
  IGDB also has a `popularity_primitives` endpoint nothing here has touched.
- **Where a title lands when added from it.** Backlog with no dates is the honest default for
  something unplayed, and is what search and the calendar both already do.
