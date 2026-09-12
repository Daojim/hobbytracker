# Television: TMDB again, seasons, and where you are

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

This is [`movies-tmdb.md`](movies-tmdb.md)'s sibling and it assumes you have read it. **The
provider is the same, the client is the same class, and the attribution already covers this** —
so what is below is only where television *differs*, and every difference is a difference between
a show and a film rather than a second opinion about how to write an integration.

Films were the phase that proved the hobby seam existed: almost every word came from games and
only the catalogue changed. Television is the phase that stretched it. Three things here had no
counterpart at all — a second source row against one provider, a child table hanging off a
detail table, and a control on the pass form that says where you are *inside* a title.

## The one fact everything follows from, again

`/search/tv` carries `id`, **`name`**, **`first_air_date`**, `poster_path`, `genre_ids`,
`popularity` and `vote_count`. No seasons, no counts, no runtime, no creators, no status.

**A show is `name` and `first_air_date` where a film is `title` and `release_date`**, and that is
the one place the two TMDB endpoints are not the same shape. `TmdbTvShow` exists rather than
reusing `TmdbMovie` for exactly that: reusing it would deserialise both fields into nulls and say
nothing about why — a title-less search result that the upsert then skips, with no error
anywhere. The e2e stub sends `name` for the same reason.

So enrichment on add, no genre-id lookup, and a one-request-per-title refresh route are all here
too, for the reasons the films file gives. What follows is the rest.

## `tmdb-tv` is a fourth source row, and this is the trap

**TMDB numbers films and shows in separate sequences.** Film 1396 and show 1396 both exist and
are unrelated. The unique index behind the upsert is on `(source_id, external_id)`, so with one
shared `tmdb` source row those two titles are the same row.

What makes it a trap rather than a bug is what happens next. `UpsertAsync` catches `23505`,
clears the change tracker and **re-reads** — a recovery written for a genuine race, and correct
for one. Here it would find the film, hand it back, and log a show onto somebody's TV board that
is silently *Breaking Bad*'s namesake film. **No error, in production or in a log.**

`SeedData.Sources.TmdbTv` is the whole fix, and every query in `TvCatalogService` filters on it.
Verified the way this repo verifies a rule: by putting the collision back and watching
`23505 … ix_media_source_id_external_id`.

**A second provider for the same hobby would be additive, not a rewrite.** `tv_shows` is keyed on
`media_id`, so a TVmaze row would be a fifth `source_lu` id writing the same columns. The one
thing that has to hold for that is the next section.

## `TvOnMediaAdded` declines by source as well as by hobby

```csharp
if (media.HobbyId != SeedData.Hobbies.Tv || media.SourceId != SeedData.Sources.TmdbTv)
```

`HltbOnMediaAdded` and `TmdbOnMediaAdded` decline by hobby alone, because each is the only
provider its hobby has. The extra clause is one line and it is the whole of what keeps a second
television provider from corrupting data: a TVmaze show would be `hobby=tv` carrying an external
id from a **different numbering**, and without the clause it would be handed to TMDB's enricher,
which would answer about whichever show happens to hold that id at TMDB and overwrite the row
with it.

Everything else about the handler is the films one. It runs **in the request**, not in a queue —
one fast documented API call, so a card is complete the moment it lands and none of
`hltbPending`'s polling apparatus applies. A failure is logged and swallowed: the log entry is
yours, the upstream metadata is not, and the row is left for `POST /api/tv/refresh` to find.

## `tv_seasons` is a table, and that was decided by building it

The journal's episode dropdown has to know how many episodes are in the season that was chosen.
Seasons were going to be `jsonb` on `tv_shows`, which is what a small immutable child list wants
to be. **EF Core 10 refuses it**: a JSON-mapped owned type on a Table-Per-Type entity throws
*"Only TPH inheritance is supported"*. That is lifted in EF 11 and this is not worth waiting for.

Two things fell out of it being a table rather than a blob, and both are wins:

- `ck_tv_seasons_season_number` (`>= 0`) and `ck_tv_seasons_episode_count` (`>= 0`) exist. A blob
  carries no constraint.
- Season 0 is real and is allowed. TMDB lists Specials alongside the rest and everybody who
  watches a show calls them Specials, so the number is `>= 0` rather than `>= 1` and the client
  labels 0 as **Specials** rather than printing it.

**`.Include(show => show.Seasons)` before writing them, at both call sites.** `ApplyDetail`
replaces the collection wholesale, and on an unloaded collection `Clear()` removes nothing while
the adds go on to collide with `pk_tv_seasons`. That surfaces as a `23505` out of
`SaveChangesAsync` — which `LogEntryService` logs and swallows, so **the pass is written, the
show stays unenriched, and the only trace is a log line**. Measured by deleting the line.

## Two runtimes, and the fallback that is the normal path

`episode_run_time` is an **array**, and it is **empty on most recent TMDB entries**. The chain is
its first value, then `last_episode_to_air.runtime`, then null.

**That fallback is load-bearing rather than defensive.** It is not a corner case being handled
politely; it is how anything made in the last few years answers. The e2e stub keeps a show whose
runtime can only be reached that way, because a catalogue where every show filled the array in
would leave the fallback untested and looking optional.

`total_runtime_minutes` is a **stored generated column** — `number_of_episodes *
episode_runtime_minutes`, multiplied by Postgres. Nothing in the app writes it, and marking it
computed is what tells EF never to name it in an INSERT (Postgres rejects a write to a generated
column outright, `42601`, so getting it wrong fails on the first search).

**So a show has two durations and they must not be called the same thing.**
`LibraryItem.lengthHours` is the whole run, and it is what a card's badge and `sort=length` both
read; the drawer's facts band says how long *one episode* is. They differ by a factor of nineteen
on a two-season show. This is why `hobbies/tv.ts` sets `lengthLabel` to **Time to watch** and not
Runtime — Runtime is spoken for on this board, and two controls a few inches apart naming wildly
different numbers with the same word is the failure that avoids.

**The badge takes a tilde where a film's refuses one.** Episodes times an *average* episode
length is an estimate, so `~14.88 h` is the same kind of claim as HowLongToBeat's number. A film's
runtime is exactly how long it is, and marking that approximate would claim less than is known.

**Null, never nought**, on the episode runtime, for the reason `movies.runtime_minutes` has it:
`ck_tv_shows_episode_runtime_positive` makes forgetting to map TMDB's 0 a loud failure rather than
a card claiming a sixty-two episode show takes no time at all.

## `air_status`, one word away from a column that already exists

TMDB's `status` is *Returning Series, Ended, Canceled, In Production, Planned, Pilot*, stored
verbatim because it is theirs to change.

**The column is `air_status`.** `log_entries.status` is where *you* are on a title — a closed
four-value vocabulary shared by every hobby — and this is where the *show* is. Two columns called
`status` on tables joined in every board query is a mistake waiting for the first person who
types the shorter name out of habit. The client's facts band calls it **Airing** for the same
reason.

**`last_air_year` is null while a show is running, and that is a fact rather than a gap.** The
drawer renders the pair as `2022–`; a run inside one year reads as `2016` once rather than
`2016–2016`. `ck_tv_shows_year_span` pins that the far end is not *before* the near one.

## The journal drawer, for a show

A show's pass is **a rating, two dates, and where you are**. Hours played and Platform are absent
exactly as they are for a film — nobody records how long an evening of television took, and the
facts band already says how long one episode runs.

| Band | Films | Shows |
|---|---|---|
| The title | director byline, genre select, **Runtime** | **creator** byline, genre select, **Run · Airing · Episode** |
| The pass | *Watching* · rating · started · watched | *Watching* · rating · **season + episode** · started · watched |
| Notes | Journal | Journal |

The facts are three because each is a pair that only reads as a fact together: seasons say little
without the episode count, and a status says nothing about *when* without the year span. All
three are dropped entirely rather than printed with a dash, on the film runtime's rule — a show
only ever searched for has none of them, and a dash would read as a fact about the show rather
than about the request.

**The creator line is empty on a search result and that is correct.** `/search/tv` carries no
`created_by`, so the second byline fills in when the show is added — the film's missing-director
case exactly. It is also **routinely empty after enrichment**: TMDB carries no creator at all for
most documentaries and most non-US productions.

### The two dropdowns

`PassFields.progress` and `HobbyDefinition.progress` are **two halves of one fact** and
`journal.test.ts` pins the pairing: `fields.progress` is true if and only if `progress !== null`.
That is `setHltbId` ↔ `hltb`'s rule applied to the second half-and-half thing a hobby has. Wiring
the control without the formatter puts `S3 E7` nowhere; wiring the formatter without the control
promises a badge no pass can reach.

Four things about the pair the existing code dictates:

- **The episode list is sized from the season that was chosen**, which is the entire reason the
  drawer loads seasons rather than reading the board row. A list built from the show's *total*
  would offer episode 60 of a season with ten in it.
- **Changing the season clears the episode.** S1 E13 and then a switch to Specials leaves a value
  the dropdown cannot show; clamping to the last episode of the new season would invent a claim
  nobody made.
- **The episode list is empty until a season is chosen.** Not disabled — an empty list says the
  same thing and needs no second rule — and it is what keeps the pair the API refuses out of
  reach through the UI at all.
- **A stored season the show has stopped listing survives**, on the platform select's rule: a
  value that was true when it was chosen has to outlive the list it came from.

**`ck_log_entries_episode_needs_season` states it in the database too**, and the form checks it
before sending, beside the completed-before-started rule and for its reason: the reader would
rather know now, and the server states it before a check constraint can turn it into a 500.

**Progress lives on the pass, not on the show.** Two nullable ints on `log_entries`, so a rewatch
begins again — as a replay does. `passValues` includes both, because that is what the form
re-seeds from and a field left out of it is one a refetch cannot correct on screen.

### It shows on the card too

`S3 E7` beside the rating. Being partway through is the point of a TV board — a film is watched
or it is not, and a show is a thing you are three seasons into.

**Gated on `hobby.progress` and never on the values being non-null**, which is the right way
round: a game whose pass somehow carried a season still prints nothing, because a games card has
no word for it. `LibraryItemDto` carries the pair for every hobby and the card asks the hobby
whether it formats them.

Season 0 prints as `Specials E3` rather than `S0 E3`, because the dropdown says Specials where it
is chosen and a card reading `S0` would be the one place in the app calling it something nobody
says.

## Genres: TMDB's *other* list

TMDB has two genre vocabularies and they are not the same one. The television list **folds
science fiction into fantasy and action into adventure, and has no Horror and no Thriller at
all**. A show read against the films list would come back unpainted for exactly the words
television uses most, which is the sharpest argument yet for the list being a property of the
hobby rather than of the provider.

Ten of sixteen are named, specific before generic:

> Documentary · Animation · Reality · Sci-Fi & Fantasy · Crime · Mystery · War & Politics ·
> Comedy · Action & Adventure · Drama

Kids, Family, News, Soap, Talk and Western are left out — rare on one person's board, or saying
little about the evening.

**Seven of the ten hues are the films palette's, deliberately.** A documentary is the same evening
on either board, and the year-in-review page — the one screen that will put two hobbies together —
is where a divergence would show. Only `reality`, `mystery` and `war-politics` are new tokens;
Sci-Fi & Fantasy points at `bg-genre-science-fiction` and Action & Adventure at `bg-genre-action`.
`mystery` deliberately carries the same values as `thriller`: a board is one hobby, so the two are
never read against each other.

**The finding worth keeping from the workshop.** The first pass of *all three* candidate palettes
failed, on the same pair. War & Politics reads naturally as olive, which puts a **third**
near-neutral between Documentary and Drama — and ten hues have room for two, not three. TMDB's
television genres have no Horror, so the deep-red corner was unclaimed; War & Politics took it and
every option then cleared the floor. The chosen one measures 0.1144; the two that measure better
are in the plan archive with what they cost in meaning.

## The refresh route

`POST /api/tv/refresh`, and everything the films route's section says applies unchanged: one
request per title because TMDB has no batch-by-id endpoint, a `RefreshCeiling` of 5,000 bounding
the work, not scoped to the signed-in user because it writes only shared columns, and **no UI**.

`media` rows are only ever written by a search, so a column added by a migration stays empty on
the library you already have until something asks. This has now caught people twice.

## Testing it

`FakeTmdbClient` gained `SearchTvAsync` and `GetTvAsync` on its existing shape, and `ApiFactory`
needed nothing new — the access token was already there for films, which is the first dividend of
one client rather than two.

**The e2e stub grew a TV catalogue and two routes rather than a seventh server.** There is one
`Tmdb:BaseUrl` and one bearer, so a second port would be unreachable: films and shows are the same
host to the same client. `/3/tv/(\d+)$` is **anchored**, as the film route is —
`/3/tv/5003/season/1` is a real TMDB endpoint this app does not call, and an unanchored pattern
would answer it with the whole show.

Its six shows are each there for a stated reason, and dropping any of them turns a spec into one
that passes for the wrong cause:

| Fixture | What it makes provable |
|---|---|
| `episode_run_time: []` with a `last_episode_to_air` | the fallback chain runs, rather than being assumed |
| no runtime anywhere | untimed sorts **last** — null is not nought minutes |
| a season 0 | Specials are offered, labelled, and allowed by the constraint |
| uneven seasons, 13 · 12 · 12 · 13 · 10 | the episode dropdown re-sizes rather than being coincidentally right |
| still running | the year span reads `2022–` rather than `2022–undefined` |
| began and ended in one year | the span says that year once |

`e2e/support/board.ts` gains `tv` **by hand**, per that file's own comment: the label map is a
deliberate second copy of the app's, so a rename shows up as a locator finding nothing rather than
as a spec agreeing with the app because it *is* the app.

**One TV spec needs a gate the films one does not.** The drag test waits for the start date to
appear on the card between the two gestures. The API having the transition is not the DOM having
it, and a gesture begun against an element React is about to remount is lost with no error — the
same re-render race `journal.spec.ts` records, reached here through a slow first request rather
than through a click. It failed once cold and passed on every repeat; four in a row with the gate.

## Two judgement calls, recorded because they will look odd

- **`CreateLogEntryRequest` and `UpdateLogEntryRequest` default their two new parameters to
  `null`, and they are the only defaulted parameters on those records.** They are meaningless for
  two of the three hobbies, and the alternative was nine positional nulls at 38 call sites. It
  changes nothing on the wire: an absent JSON field binds to null either way, which is what PUT
  means by cleared.
- **The schema landed as one commit rather than two.** The EF model snapshot is cumulative, so
  splitting `tv_shows` from the `log_entries` columns would have left an intermediate commit whose
  snapshot disagreed with its own migrations.

## What was not built, and why

- **TVmaze was measured and rejected.** No creator field at all, thin anime coverage (*Frieren*
  was 2 of 10 results), empty season names. Its real wins are a reliable `averageRuntime` and a
  one-call episode list. **Revisit only if TMDB's runtimes disappoint in practice** — a second
  source row against the same `tv_shows` table is additive, which is what `TvOnMediaAdded`'s
  source check is protecting.
- **A card is a whole series, not a season.** Season-per-card was considered and rejected: a
  rewatch is a new pass, exactly as a replay is.
- **No networks or streamers column.** Offered and declined.
- **No per-episode records, no air schedules, no Service field on the pass.**
