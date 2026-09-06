# Games: HowLongToBeat

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

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
invalidates `['library', hobby]` as well as `mediaKey(hobby, mediaId)`, because the card carries that figure
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

