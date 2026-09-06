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
- **`BoardSearch` is tested on its own, never through `BoardPage`**, because a result's title and a
  card's title are both an `<h3>`. For the same reason `e2e/support/board.ts`'s `card()` is scoped to
  `[data-board]` — it was a bare `getByRole('listitem')`, which a search result tile answers to.

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

## Discovery: a grid of what is popular, a calendar of what is coming

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
  it would be **the fourth place the journal zone is applied**. **Time** in `docs/data-model.md`
  currently says three; that
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

