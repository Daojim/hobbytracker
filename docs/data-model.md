# Data model and time

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

## Table-Per-Type for Media/Games

**`builder.ToTable("games", …)` in `GameConfiguration` is the entire mechanism** — mapping a
derived entity to its own table is what makes EF choose TPT. **Delete that line and EF silently
falls back to Table-Per-Hierarchy**, folding every hobby's columns into `media` behind a
discriminator. Nothing errors.

Why TPT: `Movies`, `Books` and the rest arrive as sibling detail tables, each with columns
meaningless for the others. TPH would make `media` a swamp of mostly-null columns; TPC would
duplicate the shared columns and make "everything I logged this year" a `UNION` across every
hobby. The cost, stated plainly: polymorphic queries over `Media` need a LEFT JOIN per subtype,
and inserts touch two tables. Both acceptable at personal-catalogue scale. Querying `db.Games` —
the derived `DbSet` — emits an INNER JOIN and is the cheap path.

**The PK column rename goes through the table builder**
(`ToTable("games", t => t.Property(g => g.Id).HasColumnName("media_id"))`), not
`builder.Property(...)`. `Id` is declared on `Media`, so configuring the property directly renames
the column in `media` too and leaves the base table with no `id` at all.

## Decisions that will look arbitrary later

- **`media.hobby_id` is redundant under TPT** — a row in `games` is always hobby=games. Kept on
  purpose: it lets "everything in hobby X" filter on one table instead of LEFT JOINing every
  detail table that will exist once movies do. Nothing enforces the two agree; the catalog
  service sets it from `SeedData.Hobbies`.
- **`external_id` is `text`, not `int`.** IGDB and TMDB use numeric ids, but `media` is
  source-agnostic and future sources may not. Null for `manual` rows.
- **Unique index on `(source_id, external_id) WHERE external_id IS NOT NULL`.** This is the
  natural key the IGDB upsert dedupes on — without it, searching "halo" twice inserts every
  result twice. Filtered because `manual` rows carry a null `external_id` and many must coexist.
- **`status` is one shared four-value enum for every hobby** (`Backlog`, `InProgress`,
  `Completed`, `Dropped`) and is stored **as text**. Do not add per-hobby status tables or
  values — cross-hobby views depend on the vocabulary being identical. Text rather than an int
  ordinal so reordering `LogStatus` can never silently reinterpret existing rows.
- **`platforms` and `developers` are Postgres `text[]`.** IGDB returns arrays for both; a single
  column would drop data. Npgsql maps `List<string>` natively — no join tables, no converter.
- **`log_entries.platform` is free text, not a foreign key to that array.** It is what you played
  *this pass* on, where `games.platforms` is what the game came out on — a replay years later is
  often somewhere else, which is the whole reason it sits on the pass. The UI offers IGDB's list
  and the server accepts anything up to 100 characters: IGDB's data changes, and a value that was
  true when it was written has to outlive the list it was chosen from.
- **Notes are rows, not a column.** `log_entries.notes` was one nullable text field, so writing a
  second thought destroyed the first — which is not a journal. `written_at` is server-stamped and
  **does not move when a note is rewritten**: the date is when you wrote it, not when you last
  fixed a typo. Cascade delete, because a note belongs to the pass it was written during.
- **`log_entries.hours_played` is per pass**, `numeric(5,2)`, for every reason `platform` is.
  Same precision as `hltb_main_story_hours`, because comparing them is the point. Named "played"
  rather than "to complete" because a pass can be `InProgress` or `Dropped`.
- **The three `hltb_*_hours` columns are `numeric(5,2)`, and null never means nought.**
  HowLongToBeat answers `0` for a game nobody has submitted a time for, which is a different
  claim from "takes no time" — `ck_games_hltb_hours_positive`, the first check constraint on
  `games`, exists to make forgetting to map that fail loudly rather than store a lie. **There is
  no upper bound in it on purpose**: `numeric(5,2)` *throws* past 999.99 rather than rounding, so
  an over-long completionist time — and they exist — has to be dropped to null in the client,
  where a constraint could not help anyway. Only that tier is lost. Any one of the three can be
  null on its own, which is ordinary rather than an error.
- **`games.hltb_checked_at` separates *never asked* from *asked, nothing matched*.** Stamped on a
  miss as well as a hit, which is the entire point of it: without that, the backfill re-asks
  about every unmatchable title on every run, for ever. It is also what makes a second backfill
  answer a count of nought, and what makes the card's poll terminate. See **The card waits for
  its own estimate** in `docs/games-hltb.md`.
- **`games.release_year` exists for the matcher and nothing else.** IGDB and HowLongToBeat both
  list "Resident Evil 4" twice under exactly that title, 2005 and 2023, and nothing in the
  strings can tell them apart. Read from IGDB's `first_release_date` in **UTC**, not the journal
  zone, because it is compared against HLTB's `release_world` — a bare year belonging to no
  timezone, so localising would invent a distinction the other side cannot carry.
- **`games.genres` is `text[]`, and `games.primary_genre` is the one you chose.** Null there
  means "use the automatic pick", not "no genre" — which is why the drawer's blank option reads
  *Automatic — Platform* rather than *Not recorded*. Free text up to 50 characters, on
  `log_entries.platform`'s reasoning exactly. Stored alphabetically; IGDB's ordering is not
  meaningfulness ordering, and which one wins is decided on the client. See **Genres and colour**
  in `docs/games-igdb.md`.
- **`rating` is `numeric(3,1)`, 1.0–10.0**, enforced by a check constraint. Decimal on purpose:
  8.5 and 9.6 are the point.
- **Lookup ids are fixed constants**, `ValueGeneratedNever()` + `HasData`. They are part of the
  schema contract, which is why `SeedData.Sources.Igdb` can be used directly instead of paying
  for a lookup query per request.
- **Only `igdb` and `manual` are seeded.** `tmdb`/`mal` get added when their integrations ship —
  a source row with no client behind it reads like a working feature.

**One cosmetic quirk, left alone deliberately.** The two TPT tables get `PK_media` / `PK_games`
while every other primary key is snake_case; `EFCore.NamingConventions` does not rewrite key names
for TPT tables. EF only uses constraint names when generating migrations, so renaming them behind
EF's back would make a future `DROP CONSTRAINT` fail.

## Time

The app records days in **`America/New_York`**, configured as `Journal:TimeZone` in
`appsettings.json` and validated at startup the way the IGDB credentials are — an unresolvable
zone id fails the boot naming the setting, rather than silently falling back to UTC. It is an IANA
id, not a fixed offset, so Eastern is UTC-4 in summer and UTC-5 in winter without anyone having to
remember which.

**Why not UTC.** UTC rolls over at 8pm Eastern in summer and 7pm in winter, so every game finished
in the evening — which is most of them — was stamped with tomorrow's date. That was a four-to-five
hour hole in every day the app is actually used.

**The rule that keeps the rest simple: an instant is stored as an instant, and a zone is applied
only where a human or a calendar question is involved.** The zone is applied in exactly three
places: `?year=`, `GET /api/library/years`, and the UI. *(A release calendar would be the fourth.
That sentence is a tripwire — update it rather than quietly falsifying it. See **Discovery** in
`docs/games-igdb.md`.)*

`IJournalClock` (`Infrastructure/JournalClock.cs`) wraps `TimeProvider` plus the zone. It exists
so the date rules have something to ask and something a test can stop — `FrozenTimeProvider` is
swapped in by `ApiFactory` exactly as `FakeIgdbClient` is. The transition rules stamp
`IJournalClock.Now` and never ask what day it is.

**`logged_at` is server-stamped and absent from the request contracts.** It records that an entry
was written, which is not something a caller is in a position to assert — the same reasoning that
keeps `mediaId` off the PUT body. It has a `now()` default so a row written by hand in psql is
still valid, but `LogEntryService` sets it explicitly on every insert it makes.

### Three traps, every one of which fails as a 500 or not at all

- **Npgsql will only write a `DateTimeOffset` with offset 0 to `timestamptz`.** Anything else
  throws `ArgumentException` — not a validation error, a 500. The offset is not stored regardless,
  since the column holds an instant, so everything is normalised to UTC at the boundary. This is
  why `JournalTimestampConverter` exists and why `FirstInstantOf` and the test helper `Eastern()`
  both end in `.ToUniversalTime()`.
- **`System.Text.Json` reads a bare `"2026-03-03"` into a `DateTimeOffset` as midnight *UTC*** —
  7pm on the 2nd here, which is the original bug walking back in through the API.
  `JournalTimestampConverter` reads any value carrying neither `Z` nor `±hh:mm` as that
  wall-clock moment *here*, and passes explicit offsets through untouched.
- **The year filter is a range, not an `EXTRACT`.** `date_part('year', completed_at)` on a
  `timestamptz` reads the *session's* timezone, so the same query answers differently depending on
  how the connection was opened, and a game finished at 8pm on New Year's Eve counts toward the
  following year. `LibraryService.SpanOf` turns a year into `[Jan 1 here, next Jan 1 here)` and
  compares instants, which is both correct and index-friendly. `ActivityYearsAsync` cannot do
  that — it needs a year per row — so it selects the instants and groups them in C#: Postgres can
  only localise a `timestamptz` through `AT TIME ZONE`, which is `STABLE` rather than `IMMUTABLE`
  and so cannot be indexed or put in a generated column. A few hundred rows, at this scale.

**docker-compose sets `timezone=America/New_York` on the server**, so `psql` renders timestamps in
Eastern and what you read there matches what the app shows. Convenience only — nothing is correct
because of it, and removing it breaks nothing.

