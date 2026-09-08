# Anime: MyAnimeList, one card per cour, and an episode with no season

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

This is [`tv-tmdb.md`](tv-tmdb.md)'s sibling in the sense that both hobbies are episodic, and it
is **not** its sibling in the way that file is `movies-tmdb.md`'s: the provider is different, the
client is a different class, and almost nothing carries over. Read this one whole.

Films proved the hobby seam existed. Television stretched it once, needing a control no other
hobby had. Anime stretched the same two seams further and in the other direction: its pass
carries an **episode with no season**, which a check constraint refused outright, and its card
carries a **second title**, which no board row had a field for. Both went in as additions to the
contract for *every* hobby rather than as branches on the slug — which is the checklist in
CLAUDE.md working rather than the checklist being wrong.

## The decision this whole file follows from

**Anime is its own hobby, not a filter on television.** Decided with the user on 7 September
2026, in their words: *"Anime is a very specific genre that should be separated"*. The
distinction is in the titles rather than in the mechanics, and the mechanics being identical is
not an argument for merging them.

**One card per cour.** `Sousou no Frieren` and `Sousou no Frieren 2nd Season` are two MAL ids and
therefore two cards. Also the user's call: *"I would rather have different seasons be different
cards in my app, just like how MAL has it."* Chosen positively rather than for want of an
alternative — MAL's detail response carries `related_anime` with typed relations, so Frieren's
`sequel` is stated outright and a merging rule is available if it is ever wanted. **A future
session should not be told it does not exist.**

Everything else here falls out of those two:

- **No seasons table.** `tv_seasons` exists because TMDB models a series as one title with many
  seasons; MAL models each cour as its own entry, so there is nothing to hang a child table off.
- **The pass has an episode and no season**, because the cour *is* the title and "episode 7" says
  everything there is to say.
- **The card needs two lines**, because MAL states romaji and English and both are worth finding
  by eye.

## The provider works in a way MAL does not document

**`X-MAL-CLIENT-ID` alone reaches the public catalogue.** Measured on 7 September 2026 against a
real client id, before any of this was written:

```
GET https://api.myanimelist.net/v2/anime?q=frieren&limit=3&fields=… → 200
GET https://api.myanimelist.net/v2/anime/52991?fields=…            → 200
```

This matters because MAL's own documentation describes **only** the OAuth2 authorization-code
flow with PKCE, which needs a human to sign in and a token refreshed — hopeless for server-side
metadata. Client-ID-only is what every third-party wrapper does and what MAL does not write down.

So **there is no auth handler in this integration at all**: one header stamped on the typed
client in `Program.cs`, no handshake, no expiry, no refresh. The TMDB static-token shape rather
than the IGDB one, and the e2e stub refuses a request without the header so that wiring is proved
rather than assumed.

**The client secret is deliberately not stored.** It signs the OAuth token exchange this app
never performs. MAL shows it again on the app's configuration page if "import my MAL list" is
ever built.

**Kitsu is a real fallback** if MAL withdraws client-ID access — measured working the same day
with no credential at all, and entry-per-cour like MAL, so the card decision survives the swap
intact. AniList was 403 and disabled by AniList themselves that day; Jikan 504'd three times over
ten minutes while MAL's own site answered 200, which is a dependency on a third party's link to a
third party.

## `mal` is a fifth source row, and it is the same trap a third time

`SeedData.Sources.Mal` is 5. MAL numbers its catalogue independently of both TMDB sequences, so
MAL anime 1 and TMDB film 1 both exist — and `media` has one unique index on
`(source_id, external_id)`.

Under a shared source those two are **one row**, and it would not even error: `UpsertAsync`'s
`23505` recovery re-reads and hands back whichever got there first. An anime that is silently a
film. This is the third statement of one fact — IGDB was the first, `tmdb-tv` the second — and it
is in CLAUDE.md's **What fails silently** for that reason.

`SeedData.Sources.NameFor` gains its arm in the same commit as the row. A source added to `Apply`
and not to `NameFor` answers `"unknown"` on every DTO that names it, and nothing errors.

## Search and detail are one shape, and that is the interesting difference

Both endpoints take the same `fields` parameter and answer with the same node. So:

- **`MalAnime` is one wire class**, where TMDB needs two. A second class here would be one shape
  copied twice with nothing to distinguish it.
- **`AnimeCatalogService` has one `Apply`**, where `TvCatalogService` has `ApplySearchResult` and
  `ApplyDetail`. There is nothing to coalesce onto an old value, because a search cannot write
  empties over what a detail call fetched — a search *is* the detail call.
- **There is no `IMediaAdded` handler for this hobby.** A card is complete the moment it is
  *found* rather than the moment it is added. `AnimeController` still has a refresh route, and it
  exists for one reason only: `media` rows are written by a search, so a column added by a later
  migration stays empty on the library you already have until something asks.
- **`FakeMalClient` keeps one dictionary**, where `FakeTmdbClient` keeps two. A fake with two
  shapes would invent a distinction the provider does not have and would let a bug that read the
  wrong one pass.

### The `fields` list is a silent failure waiting to happen

A node carries `id`, `title` and `main_picture` **whatever `fields` asks for**, and nothing else.
Every other column is opt-in.

So a field left out of `MalClient.Fields` deserialises to null and is **indistinguishable from a
title MAL has nothing to say about**. A column added to `anime` without a word added there fills
with nulls for ever and nothing reports it. `MalClientTests` asserts the list rather than trusting
it, and the e2e stub honours `fields` rather than answering generously.

One list for both endpoints, stated once. Two that had to agree is exactly the drift it avoids.

## Nought means unknown, in three places

MAL answers `0` rather than null for a figure nobody has filled in. Measured: the announced 2027
Frieren cour comes back with `num_episodes: 0` and `average_episode_duration: 0`, and an unrated
entry comes back with `mean: 0`.

Stored as nought, each is a lie a card would print — and worse than that, `ck_anime_counts_positive`
and `ck_anime_mean_score_range` **refuse the write**, so an ordinary search becomes a 500. The
mapping to null lives in `AnimeCatalogService.Apply`, in one shared `Positive` helper for the two
counts, and the constraints are what make forgetting it loud rather than quiet.

## `episode_runtime_seconds`, and the conversion Postgres does

MAL states one episode in **seconds** — 1470 for Frieren, which is 24m30s. `tv_shows` stores
minutes because TMDB states minutes. The column here stores seconds because MAL states seconds: a
column silently holding a different unit from its provider is the kind of thing only ever noticed
as a runtime sixty times out.

`total_runtime_minutes` is a **generated column** that multiplies and converts, exactly as
`tv_shows` has one that only multiplies. Two reasons, and the second is this hobby's own:

1. `LibraryService` reads the total in three places that must agree — both terminal projections
   and the `LibrarySort.Length` arm. Three copies of one sum is the shape things drift apart in.
2. **The factor of sixty then lives in one place.** Getting it wrong in one of three readers is a
   card claiming a cour takes 686 hours.

Integer division truncates, which costs at most a minute across a whole cour and cannot be wrong
by a factor.

## The first stretch: an episode with no season

`ck_log_entries_episode_needs_season` said `episode_number IS NULL OR season_number IS NOT NULL`,
on the argument that "episode 7" with no season says nothing. **That was true of every hobby that
existed when it was written and is false for anime.**

The constraint is gone, and so is its `LogEntryRules.EpisodeNeedsSeason` twin. Two alternatives
were considered and rejected:

- **Writing `season_number = 1` on every anime pass.** It puts a fact in the column nobody
  claimed, and every reader — the card, the drawer, a future year-in-review — then has to know to
  ignore it.
- **Making the constraint conditional on the hobby.** Not possible, and worth knowing *why*
  before an afternoon goes into it: a Postgres `CHECK` cannot contain a subquery, and the hobby
  lives two tables away on `media`. A trigger could, at the cost of a rule that no longer reads
  as one.

**The rule moved to where its other half always lived: each hobby's form.** Television's episode
dropdown is built from the chosen season's `episodeCount` and is empty until one is picked, so
behaviour there is unchanged with the database rule gone. `EntryForm` states it once more anyway,
so a pass that somehow arrived in that shape is something you can save your way out of.

There is precedent in the constraint's own former comment, which declined to bound an episode
against a show's counts because a value true when it was written must outlive the shape it came
from.

### `PassFields.progress` is three-valued

`false | 'episode' | 'season-episode'`, on the contract for every hobby. `journal.test.ts` pins it
against `HobbyDefinition.progress` being non-null — a form offering the control while nothing
formats it would put `E12` nowhere, and a card formatting one nothing can set would promise a
badge no pass can reach.

`TitleDetail.episodeCount` joins `platforms` and `seasons` as a thing **stated per hobby rather
than inferred from whatever came back**. It is what a seasonless hobby sizes its one dropdown
from. Deliberately not a synthetic one-season list: that is option two above wearing a hat,
because the pass would still write a season number.

`hobbies/tv.ts`'s `progress.format` returns null when the season is null, commenting that an
episode with no season *"would be inventing the half that is missing"*. **That comment is correct
for television and stays.** Anime's own `format` is the one that reads `E12`, which is why the two
are not a shared function.

## The second stretch: a second title on a board row

`LibraryItemDto.Subtitle`, reached through the same `?? (row.Media as Anime)!` downcast as
everything else, in **both terminal projections and nowhere near `BoardQuery`**.

- **Named for what it is on the row, not for what anime means by it.** The field is the
  platform's and the next hobby to want one may not mean English: a book has a series, an album
  has an artist. `anime.english_title` is allowed to be specific because that column is the
  hobby's.
- **`media.title` holds the romaji**, which is MAL's own `title` and what its search matches on —
  so search, the drawer's heading and the remove confirmation all need no special case.
- Null for every other hobby and null for most anime, which are the same kind of null.

### The card refuses a subtitle that is the title

**Found by the e2e suite rather than reasoned about, and it is not a stub artefact.** MAL answers
`alternative_titles.en: "Cowboy Bebop"` for *Cowboy Bebop*, and does the same for every title
whose romaji reading is already English. Rendered blindly, those cards print their own name twice.

Compared case-insensitively and trimmed, and **never any looser than that**: `Frieren` and
`Frieren: Beyond Journey's End` are genuinely two names.

## `MalRelevance`: MAL's order is wrong for a person

MAL prefix-matches, which is why `MalClient` asks one question where `IgdbClient` asks two — `frier`,
`attack on t` and `cowboy bebo` all find the right title, and `fma` finds Fullmetal Alchemist
through a synonym. That whole problem is absent here.

The **ordering** is not. Measured live on 7 September 2026:

| Search | What MAL answers first | What it should be |
|---|---|---|
| `frier` | Sousou no Frieren **2nd Season** | Sousou no Frieren |
| `cowboy bebo` | Cowboy Bebop: **The Movie** | Cowboy Bebop |
| `steins` | Steins;Gate **Movie**, then **0**, then the series *third* | Steins;Gate |
| `mushishi` | Mushishi **Zoku Shou** | Mushishi |

The rule is `IgdbRelevance`'s, deliberately the same one:

1. **The anime more people have logged comes first** — `num_list_users`, the closest thing MAL
   publishes to "how many people mean this one". It fixes all four by wide margins: 1.5M against
   607k for Frieren, 2.1M against 416k for Bebop, 2.8M against 651k for Steins;Gate.
2. **Title tier breaks the ties**, over *every* name MAL knows an entry by — romaji, English,
   Japanese and the synonyms, because MAL matched on all of them. Scoring only `title` would give
   every result in a `fma` or `attack on t` search the same nought and throw the tie-break away.
3. **MAL's own order breaks what is left**, through a stable sort.

**Title-first was tried against the same searches and is worse**, in exactly the way
`IgdbRelevance` records as the "Zelda" case: `monster` finds a 2019 Chinese film whose English
title is precisely "Monster" and which 135 people have logged, and ranking on the title puts it
second — above *Monster Musume* and one place below the Urasawa series it is pretending to be.

`mean` is available on every node and is deliberately unused. A third signal with no case behind
it is a rule nobody can check.

## Genres: MAL flattens three taxonomies into one array

This is the good news of the provider. `genres` carries genres, themes **and** demographics
together — Frieren comes back as *Adventure, Award Winning, Drama, Fantasy, Shounen*: two genres,
a MAL tag and a demographic in one list.

So the ordered specific-before-generic rule this codebase already uses works on it directly, with
no merging step. `hobbies/anime.ts` names thirteen:

**Isekai · Iyashikei · Mecha · Psychological · Sports · Slice of Life · Horror · Romance · Comedy
· Sci-Fi · Fantasy · Action · Drama**

- **The top four are MAL *themes* rather than genres**, and that is the point of the ordering:
  they say what an evening is *like* where the broad words say what it is about. Visual Novel's
  placement argument, on a catalogue that has far more of them.
- **Thirteen, where games has eleven and the two TMDB lists have ten.** Anime genuinely carries
  more axes that mean different evenings, and cutting to ten would have to lose one of Sci-Fi or
  Fantasy, which between them cover most of the catalogue.
- **Demographics are deliberately unpainted.** Shounen, Seinen, Shoujo and Josei say who a thing
  was published for rather than what watching it is like, and a title carrying nothing else then
  paints as nothing — which is honest.
- **Six hues are the films list's**, on television's shared-vocabulary argument exactly: a horror
  is the same evening on either board, and the year-in-review page is the one screen that will put
  two hobbies together. Only the seven words anime owns outright are minted in `index.css`.

Its floor is Isekai against Mecha at 0.103, then Iyashikei against Sci-Fi at 0.107. Both clear
the 0.087 this palette already accepts between Strategy and Adventure, and thirteen hues is two
more than anything else here has had to fit.

## Keeping anime off the television board

Asked for directly: *"I would rather not have anime results when searching in the TV board"*.

**The rule is `original_language == "ja"` AND genres contain 16 (Animation)**, applied in
`TmdbClient.SearchTvAsync`. Both halves are needed: Japanese live-action is not animation and
stays, Western animation is not Japanese and stays.

**It cannot be a query**, which is the opposite of what [`games-igdb.md`](games-igdb.md) says to
do and is not a choice. TMDB's `/search/tv` accepts only `query`, `first_air_date_year`,
`include_adult`, `language`, `page` and `year` — checked against the parameter table on
7 September 2026. So it is applied to the response, **before `Take(limit)`**: TMDB pages at
twenty, so cutting what is left of a page it already sent costs nothing, where filtering after
the cut would ask for five and show none.

It lives in the client rather than in `TvCatalogService` because genre 16 and an ISO 639-1 code
are TMDB's vocabulary rather than the app's, and wire facts stay inside `Integrations/Tmdb/`.

**Two failure modes are accepted rather than discovered later.** A donghua is `zh` and stays on
the television board; an anime whose original language TMDB records as something else stays too.
Both are rare. The exact alternative is TMDB's own *anime* keyword, 210024, which costs a
`/tv/{id}/keywords` call per result — an N+1 on every keystroke, not worth it for the handful of
rows it would move.

**The Movies board is deliberately left alone, and that asymmetry is intended.** An anime film
stays findable on Movies *as well as* Anime: a film is self-contained and reads fine on two
boards, and it is a series with episode progress on two boards that this closes. Do not "fix" it
into consistency.

**There was no migration step.** The user had no anime logged on the TV board on 7 September
2026, confirmed. The rule only has to keep anime out from here on. If that turns out to be wrong,
the move is: re-add from MAL, re-log by hand.

## Testing it

The backend suite uses `FakeMalClient` and needs no network. `AnimeEndpointTests` covers the
routes, `AnimeBoardTests` the projections, `MalClientTests` the wire boundary and
`MalRelevanceTests` the ordering — the last two with no container at all.

**`ApiFactory` needs `Mal:ClientId`.** A missing required option refuses to boot the *whole
suite* rather than the one hobby that needed it, which is the loud failure and the good one — but
it is loud a long way from its cause.

The e2e stub is on **:5395** and enforces `X-MAL-CLIENT-ID`, so a header dropped from the typed
client's configuring lambda fails a spec rather than passing one. It matters more than the TMDB
bearer does, because MAL does not document that a client id alone works: the day they withdraw
it, this is the wiring that has to be re-proved.

**The stub honours `fields`** rather than answering generously, which is the whole of what makes
the list above testable end to end. Its catalogue is chosen so nothing passes for the wrong
cause: two cours of Frieren plus the unaired third with `num_episodes: 0`, a title with no
English name, a film, and one nobody has timed.

**It returns catalogue order rather than MAL's**, deliberately. Mirroring MAL's would be testing
the stub; mirroring the *fixed* order would let the re-rank be deleted with every spec still
green. `anime.spec.ts` asserts the pair where the two orders disagree, and `MalRelevanceTests` is
where the disagreement itself is pinned against the real figures.

## What was not built, and why

- **No `related_anime`.** MAL states typed relations — `sequel`, `side_story`, `other` — and
  merging cours into one card is therefore *possible*. It is not wanted: the card-per-cour
  decision was made positively. The field is worth remembering rather than acting on.
- **No throttle.** MAL advertises no rate-limit headers at all, so there is nothing to back off
  towards, and a 429 is named explicitly rather than retried. That follows the precedent for
  official APIs here: IGDB has a documented 4 req/s limit and no throttle either, relying on the
  client-side debounce. `HltbThrottle` exists because HowLongToBeat is a *scrape* of a site with a
  history of blocking unofficial clients. **If MAL ever starts refusing, a floor between requests
  on `HltbThrottle`'s shape is the fix**, not a retry.
- **No "import my MAL list".** It is the one thing that would need the OAuth flow and therefore
  the client secret. The app registration's redirect URL was shaped for it —
  `https://hobbytracker.daojim.me/api/auth/mal/callback` — so it is already right if it is ever
  built.
