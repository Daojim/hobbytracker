# Games: OpenCritic and Steam

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

## What critics and players say

A game's journal carries two rows under HowLongToBeat's, in the band about the title: what
OpenCritic's critics say and what Steam's players say, each beside a link to its page. Built for #22
on 12 November 2026, from the user's words: *"if I had a game in my backlog and I wanted to quickly
take a look at the game's OpenCritic or Steam page to see what people are saying about the game."*
Not Metacritic, which the user does not read. The workshop's two rounds, with every measurement
behind them, are #22's section in `docs/plans/games-board-next.md`.

| | |
|---|---|
| What shows | **Both verdicts and both links**: `85 · Mighty · 91% recommend` beside *View on OpenCritic*, `Very Positive · 94%` beside *View on Steam* |
| Where | **The journal's top band**, two rows under HowLongToBeat's, **on every column** |
| Finding Steam's page | **From IGDB**: the `websites` row of Steam's type first, then a lone `external_games` row of Steam's source |
| Finding OpenCritic's | **From Wikidata, by IGDB's slug**, with no matching; several ids are decided by OpenCritic's names |
| Correcting | **An *OpenCritic ID* box on every game**, taking the number or a whole OpenCritic address. Steam's has none |
| Stored or asked | **The pages kept on `games` once found**; **the verdicts asked when a journal opens and kept a day** under each provider's own id |
| OpenCritic's key | **Optional.** Without it OpenCritic's row is its link alone and nothing is asked; nothing refuses to boot |
| A game with no page of its own on Steam | **No Steam row**, even where Steam sells it inside a collection |

Three providers, each behind a client of its own in `Integrations/`: **Steam**, keyless; **OpenCritic**,
through RapidAPI with a key; and **Wikidata**, keyless, which finds OpenCritic's page. IGDB is asked
one more question too. `Services/GameReviewService` does the finding, the asking and the keeping,
and `GET /api/games/{id}/reviews` and `PUT /api/games/{id}/opencritic` are its two routes.

### Measured before anything was built

The plan named a Steam route, a way to find OpenCritic's page and an OpenCritic API. **All three
changed when they were measured**, on 12 November 2026, over the user's board as #19's workshop
saved it (91 titles):

- **Steam's `store.steampowered.com/appreviews/{appid}` is deprecated, and answers every app with a
  302 to the store's home page**, whatever it is asked. Its Steamworks page names the replacement,
  `IUserReviewsService/GetAppReviews` on `api.steampowered.com`: no key, the question in `input_json`,
  the summary on the first page only. It answered all 83 apps the board names, at one request every
  two seconds, with no 429.
- **Its default is the line the store page shows an English reader**, which is why the client asks
  no language. Every language named a different verdict from the page for 8 of the board's games:
  *Monster Hunter Wilds* is Mostly Positive, 71%, in English, and Mixed, 53%, in every language.
- **OpenCritic's pages may not be read.** They carry the score, but the owner's terms (Valnet's,
  last updated 12 January 2026) forbid scraping and the automatic extraction of any content "in any
  form and by any means". A score comes through OpenCritic's API or not at all. A link is not that.
- **OpenCritic's API is sold through RapidAPI**: free, 200 requests and 25 searches a day, 4 a
  second. The app uses `/game/{id}` and never searches.
- **Wikidata ties 61 of the 91 to an OpenCritic id with no key and no matching**: one item carries
  IGDB's slug (P5794) and OpenCritic's id (P2864) both. Of the 30 it does not, 10 were not out, 11
  came out before OpenCritic did, and 9 were later versions Wikidata files under the original if at
  all. The plan's own recommendation, OpenCritic's search with a matcher, would have spent the 25
  searches a day on what Wikidata answers for nothing.

### Finding the pages

**Found the first time any journal on the game asks, and kept on `games`**: `steam_app_id` and
`opencritic_id`, with `steam_looked_for_at` and `opencritic_looked_for_at` beside them, the
`hltb_checked_at` distinction again between never asked and asked and found none. The catalogue is
shared, so a game is looked for once whoever opens it.

- **One question to IGDB, for both**: `fields slug, websites.url, websites.type, external_games.uid,
  external_games.external_game_source; where id = N;`. **`category` on either would be
  `game_type`'s trap a third time**: deprecated, left unpopulated rather than removed, so a Steam page
  looked for by it is never found while the lookup reads as correct.
  `IgdbClientTests.Never_asks_for_the_deprecated_category_on_either` holds it, and the IGDB stub serves
  `type` and `external_game_source` only when a question names them.
- **Steam's page is the `websites` row of Steam's type (13), then a lone `external_games` row of
  Steam's source (1)**, by `Services/IgdbSteam`. 64 of the 91 had one this way, 62 through
  `external_games`. Eight named two apps there, and in every one the `websites` row was the store
  page: the other was a demo (*Until Then*), a playtest (*Nine Sols*), a Japanese release sold as an
  app of its own (three Trails games), or an old id Steam forwards. **Two apps and no store page to
  say which is no page**: never seen, and a refusal rather than a coin flip.
- **OpenCritic's page is Wikidata's, by IGDB's slug.** One id is taken. **Several**, an item carrying
  the game and its editions (*NieR: Automata*'s three, *Trails Through Daybreak*'s two), are decided
  by the one OpenCritic names as IGDB names the game, once case, accents and punctuation are set
  aside: OpenCritic writes *Nier: Automata* where IGDB writes *NieR: Automata*. It picked the game in
  both on the user's board, as taking the most top critics would have. **None or more than one named
  so is none**, stamped, and the box is for it. The names are read through the verdicts' cache, so the
  one chosen is not asked about again a moment later.
- **Without a key, several ids choose nothing and stamp nothing**: the names cannot be read, and
  not knowing yet is not a miss, so the next journal, perhaps with a key by then, looks again. Two of
  the user's titles are like that.
- **A page found is never looked for again; one found missing is, after 30 days**
  (`Reviews:RecheckAfterDays`). A game not out often has no OpenCritic id on Wikidata yet, and a
  console game can come to Steam.
- **A look that could not be made stamps nothing.** IGDB or Wikidata failing is not a look that
  found nothing; stamped, the game would go a month without its pages. Each provider's half stands
  alone here too: Wikidata failing still leaves the Steam page found.
- **A game IGDB did not supply is never looked for**, since it has no IGDB id to ask about.

**A look only ever writes into an empty slot, and that is the whole of what keeps a pin from being
overwritten.** A pin always holds a number, so no look can land on one. But a look reads the slot
before it asks Wikidata and writes after, and a number typed into the box in that second would be
written over by a condition checked in C#. So each half is one `ExecuteUpdate` with the emptiness in
its `WHERE` (`FillOpenCriticAsync`, `FillSteamAsync`), and the answer reads the game again after a
look rather than trusting what the look found. `A_look_in_flight_never_overwrites_a_pin` lands a pin
from inside the fake Wikidata call; with the condition taken out of the statement it goes red.
**There is no column saying a number was pinned** — the plan expected one, and the empty slot does
the job without one.

### What each page says

**One route, both verdicts, asked when the journal opens**: `GET /api/games/{id}/reviews` answers
the two pages and what each says — facts, not words:

```json
{ "openCriticId": 15125, "steamAppId": 1888160,
  "openCritic": { "topCriticScore": 84.91, "tier": "Mighty", "percentRecommended": 90.97 },
  "steam": { "summary": "Very Positive", "positive": 38640, "total": 41283 } }
```

- **Kept for the journal's day under the provider's own id**, in `IMemoryCache`, for at most
  `Reviews:KeepVerdictsHours` (24): `("IOpenCriticClient", 15125, day)` and `("ISteamClient",
  1888160, day)`. **Never under a person** — a score is the same for everybody, and the key names
  nothing else. Two games naming one app, *The Witcher 3* and its remaster, which on Steam is an
  update to the original, ask Steam once. What is kept is the provider's answer, as the Discover
  lists keep IGDB's; nothing here is a media id, so the e2e suite's truncating `media` between specs
  cannot make a kept answer name the wrong row.
- **Each half stands alone, so the route is a 200 whoever is unhappy.** OpenCritic's free plan is
  200 requests a day and Steam's keyless route is shared with every keyless caller, so either can be
  unhappy on a day; the one that is takes its own verdict with it and nothing else, and its row is
  its link alone. The plan said a Steam failure is "a 502 as IGDB's is", and for the clients it is: each
  throws a provider exception. The route catches them per half, because a 502 for both would have
  a spent OpenCritic allowance take Steam's verdict away too. **A failure is not kept**, since the
  entry is written only once a provider has answered; an answer of nothing is, because it is one.
- **No key, no question**: `openCritic` is null and OpenCritic is never asked.
- **OpenCritic's `-1` and empty tier are absorbed by the client**, each number on its own: *Kuro no
  Kiseki* has a score from three top critics and too few reviews for a share. A -1 that reached the
  journal would be a score of nought, rounded.

### The pin

**`PUT /api/games/{id}/opencritic` with `{ "openCriticId": n }`, or a null**, on HowLongToBeat's
shape. With a key the number is checked there and then, because the point of typing it is to learn
whether it was right: one OpenCritic does not know is a **400**, *OpenCritic has no game 99999999.*,
and the answer to a known one is kept as the verdict the journal asks for next. **Without a key it is
kept as typed** — the link is there to follow, and the score arrives with the key. A null takes the
pin back to never looked for, HowLongToBeat's rule, and the next journal looks again. **404** for a
media id that is not a game; **502** when OpenCritic cannot be read, by `OpenCriticExceptionHandler`,
the one route any of the three providers' exceptions can reach.

**The box reads a whole OpenCritic address for its number**, in the browser: `parseOpenCriticId` in
`journal/fields.ts`, beside `openCriticGameUrl`, so OpenCritic's address is known in one place. The
server takes a number. `https://opencritic.com/game/15125/anything` and its `/reviews` read as 15125;
an outlet's or a critic's page, numbered too, does not, and neither does another site's game page.
The link is the number and a dash, `https://opencritic.com/game/15125/-`: any slug serves the page and
`/game/15125` alone is a 404, which is how Wikidata writes its own links to OpenCritic.

### OpenCritic's key is optional

**The only credential the app boots without.** IGDB, TMDB, MAL and both sign-ins refuse to boot
without theirs; this one does not, because the app has something to show without it. `HasKey` on the
client says whether there is one, and asking without one throws rather than answering null, which
would read as "no such game" and have a pin refuse a good number. **The headers are the client's to
stamp, per request**, not the typed client's as TMDB's bearer is, because whether there is a key
decides whether there is a request at all.

`ApiFactory` needs no line for it, and the backend suite runs both ways: the fake has a key unless a
test takes it away. The e2e suite sets one, `OpenCritic__ApiKey`, so the real client runs and the
stub can refuse a request without RapidAPI's two headers. Deploying it is `docs/deploy.md`'s: the
compose file reads `${OPENCRITIC_API_KEY:-}` without `:?`, which is why a server missing it shows the
link alone **in silence**.

### On the page

The look is `docs/design.md`'s, **A game's critics and players**. What the drawer does:

- **`TitleDetail.reviews` and `journal.reviews` are one fact in two places**, as the HowLongToBeat
  block and its writers are: the read's two pages and whether the game is out, and the section that
  loads, pins and words. Null for films, shows and anime, and `journal.test.ts` holds the pairing. The
  words are `hobbies/games.ts`'s.
- **The pages are on the journal's read**, so the box and both links are drawn the moment the journal
  opens, while the verdicts are asked: the rows say `…` beside the links until they come.
- **The verdicts' key is `reviewsKey(hobby, mediaId, { openCriticId, steamAppId })`**, so a pin or a
  first look is a new question rather than an answer to invalidate, and an answer is only ever drawn
  beside the pages it was asked for. **It is not under `mediaKey`**, which every write of a pass
  settles: under it, each autosave would ask both providers again about a game whose pages it did not
  touch. *Asks OpenCritic and Steam nothing again when the pass is written* goes red under it.
- **The first look's answer names pages the read does not have yet**, so `useReviews` reads the title
  again when the two disagree. That moves the key, the rows say `…`, and the server answers from what
  it kept a moment ago. Two requests more, once per game ever.
- **The pin holds the box until the title has been read again** — its `onSuccess` returns the
  invalidation — or the old number's words would come back for as long as the read took.
- **The rows are keyed on the box's number**, for `HltbPin`'s reason: a refused pin leaves the number
  alone, so what was typed stays to be corrected.
- **The box commits on blur or Enter, and once.** Enter commits while the box has focus, and the
  commit disables it, which the browser reports as a blur, the event that also commits. **Only
  Firefox's blur reaches React**, so the guard in `commit` is Firefox's, and only a Firefox run can
  show it missing: `reviews.spec.ts` counts the PUTs, and **What fails quietly here** has the
  measurement.

### Testing it

`ApiFactory` swaps all three clients for fakes (`FakeReviewClients.cs`) whatever a test names,
defaulting to fakes of their own, so no test can reach a provider. IGDB's fake answers the new
question from `StoreLinks`, and `FakeIgdbClient.Links` builds one the way IGDB shapes it.

**Each provider has a stub in the e2e suite**, started with the others, because every game's journal
asks the reviews route when it opens — every spec that opens one reaches all three. Each stub refuses
what its provider would:

- **`steam-stub.mjs`** parses `input_json`, answers an unknown app with `{"response":{}}`, and **answers
  a question naming a language in every language**, with other numbers and, for Hollow Knight, another
  word, so a client that starts asking for every language turns the spec red.
- **`opencritic-stub.mjs`** refuses a request without the e2e key (401) or naming another host (403),
  and answers an unknown number with OpenCritic's own 400.
- **`wikidata-stub.mjs`** parses the slug out of the SPARQL and refuses a request whose User-Agent does
  not name the app, as Wikimedia does.
- **IGDB's stub** gives five fixtures Steam pages — Hollow Knight's store page beside a second app, so
  only the store page first finds the game — and adds *NieR: Automata*, with three OpenCritic ids.

**Hollow Knight's stub verdicts are Armored Core VI's from the workshop's renders**, so its rows are as
wide as the picked shots' and `reviews.spec.ts` measures the picked line counts: OpenCritic's row two
lines in the drawer at 1440 and from 1536, one in the modal, three on a phone; Steam's one. It counts
flex lines, as the workshop's shots did once a first count read one line as three.

**The built rows differ from the picked prototype by no pixel**, in all 32 of the shots it was picked
from — six titles, the drawer at 1440 in Shelf Light and Dark and from 1536, the modal, and a phone in
both — with the same line counts and words. Shot by `workshop.local/opencritic-steam/compare-built.mjs`
on the app's own Vite with nothing swapped. **In Playwright's Firefox every row's line count is the
same in all 32**; the band at 390 is 16px narrower there, which is desktop Firefox's scrollbar inside
the drawer, since Firefox has no mobile emulation.

### What fails quietly here

- **OpenCritic answers an id it does not know with a 400**, "An unknown error has occurred", and
  counts it against the day's allowance. The client reads a 400 (and a 404) as no such game; **a 403 is
  a key RapidAPI refuses, and must not be read the same way**, or a bad key would refuse every pin in
  words. `A_refused_key_is_the_provider_unhappy_and_not_an_unknown_game` holds the line.
- **Steam answers an app it does not know with a 200 and an empty `response`.** No status says so;
  the missing `query_summary` does.
- **A Steam share is rounded in the journal and floored on Steam's page.** The workshop's pick says
  rounded, and the store page said 93% for *Armored Core VI* where the API's counts make 93.6%. Of the
  54 verdicts with a share on the user's board, 22 read one point higher in the journal than on the
  page the link opens. **Rounded stays**: the user confirmed it on 13 November 2026, told of the
  difference.
- **A Wikidata item can carry an edition's id beside the game's**, and taking the first would link a
  Game of the YoRHa Edition with a score of 91 for a game whose own is 89.
- **The API's `IMemoryCache` outlives every e2e spec**, so a verdict asked in one spec is answered from
  the cache in the next. Harmless while the stubs' answers never change between specs; a spec that
  counted requests to a stub would be counting whatever the specs before it left.
- **Chromium and Firefox blur a disabled box at different moments, and React sees only Firefox's.**
  Measured on 13 November 2026 with a bare input and nothing else: Chromium 151 fires `blur` and
  `focusout` inside the `disabled = true` assignment itself, and Firefox 153 a microtask after it.
  React DOM switches its own event dispatch off for the length of a commit (`_enabled`, set false in
  `commitBeforeMutationEffects` in 19.2.8), and the box is disabled by a commit, so Chromium's blur is
  dropped and Firefox's is handed to `onBlur`. **With the guard in `ReviewRows.commit` taken out,
  `reviews.spec.ts` stays 11 green in Chromium and goes red in Firefox on two PUTs.** The default e2e
  run is Chromium's alone, so it cannot see the guard go; `--browser=firefox` can. `HltbPin` has the
  same guard for the same reason, and no spec counts its pins.
