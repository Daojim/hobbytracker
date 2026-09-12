# The board

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

## The board and its API

**Everything below `/api/auth` requires a session and answers 401 without one.** The four sign-in
routes are the only anonymous ones.

| Route | |
|---|---|
| `GET /api/auth/{provider}/start?returnUrl=` | 302 to Google or Discord. A navigation, not a fetch. A non-local `returnUrl` is a **400** |
| `GET /api/auth/{provider}/callback` | the handler's own `CallbackPath`. There is no action behind it |
| `GET /api/auth/me` | who is signed in, or **200 and a literal `null`**. Never 401 |
| `POST /api/auth/logout` | ends the session. POST, so an `<img>` cannot sign you out |
| `GET /api/games?search=&limit=` | search IGDB, upsert, return |
| `GET /api/games/{id}` | one stored game plus its log entries |
| `POST /api/games/refresh` | re-fetch every IGDB title on the board. Maintenance; no UI |
| `POST /api/games/hltb/refresh` | queue the board for HowLongToBeat. **202 with a count of what was queued**, not of what changed |
| `PUT /api/games/{mediaId}/genre` | choose the genre that colours a card, or null for automatic |
| `PUT /api/games/{mediaId}/hltb` | pin the HowLongToBeat entry by hand, or null to take the pin back |
| `GET /api/log-entries?mediaId=&status=&page=&pageSize=` | the journal, newest first |
| `POST /api/log-entries` | record a pass through a title |
| `GET PUT DELETE /api/log-entries/{id}` | |
| `POST /api/log-entries/{entryId}/notes` | write a note against a pass — an append, never an overwrite |
| `GET PUT DELETE /api/notes/{id}` | a note id is enough on its own. Rewriting does not move its date |
| `GET /api/library?hobby=&status=&year=&sort=&page=&pageSize=` | your collection / one board column |
| `GET /api/library/years?hobby=` | years with any activity — started **or** finished — newest first |
| `GET /api/library/upcoming?hobby=` | the release calendar: Backlog entries whose title is not out yet, soonest first and the undated last. **Not paged** |
| `POST /api/library/{mediaId}/status` | move a title to a board column — what a drag calls |
| `DELETE /api/library/{mediaId}` | take a title off the board — **every pass of yours** |
| `PUT /api/library/order` | store one column's manual ranking |

List endpoints return `PagedResult<T>`; search returns a bare array capped by `limit`.

**Updates are `PUT`, not `PATCH`**: a field absent from the body is *cleared*. That is the whole
reason for choosing PUT — PATCH cannot distinguish "clear the rating" from "leave it alone" without
an `Optional<T>` wrapper. `mediaId` is not replaceable; moving an entry to a different title is a
delete and a create.

**Validation returns 400, never 500.** Unknown `mediaId` is checked before insert, since a raw
foreign-key violation would be a 500; `dateCompleted < dateStarted` is caught by `IValidatableObject`
before the check constraint can throw; and ratings must be 1.0–10.0 **with at most one decimal
place**, because `numeric(3,1)` *rounds* 8.75 to 8.8 rather than rejecting it, so accepting two places
would mean the response reporting a rating the database does not hold.

### Library is not the catalog

Searching upserts every IGDB result, so `media` accumulates everything ever typed into a search box.
`/api/library` joins to `log_entries` and returns only titles you actually recorded something about —
one row per title regardless of replays. **Do not "fix" it to list all of `media`.**

**`currentStatus` is the most recent entry's status**, ordered `logged_at DESC, id DESC`: a pass is
current because it was recorded most recently, not because it happens to carry a date. `?status=`
filters on that, not on "has ever been" — a game completed in 2024 and being replayed now appears
under `InProgress` and must not also appear under `Completed`. EF turns the nested `First()` into a
LATERAL join, not N queries.

**It used to read `started_at DESC NULLS LAST`, and that was a bug on the ordinary path**: leaving
Completed for Backlog or Dropped writes an entry with no dates by rule, so it could never outrank the
completion it replaced — the card sprang back to Completed and every retry added another orphan
entry. `id` breaks ties, which is not a footnote: fixtures on a stopped clock share one `logged_at`,
so the tie-break carries the whole ordering in the test suite.

**Four places order a title's entries and all four must agree**: `LibraryService.BoardQuery`,
`LibraryService.LatestEntryFor`, `GameCatalogService.GetAsync`, and `HltbService.DetailAsync`.
`GetAsync` used to order by `id DESC` alone, which meant the drawer could offer to edit one entry
while the card reported another.
`LibraryEndpointTests.The_board_and_the_game_detail_agree_about_which_pass_is_current` pins it so a
future drift fails loudly.

**This was written down as three for months, and the fourth is the one that says so** —
`HltbService.DetailAsync`'s own comment reads *"three places decide which pass is current"* while
being one of them. A rule that names its call sites goes stale each time one is added, and the
miscount is invisible: a site ordering differently shows up as the drawer and the card disagreeing
about which pass is current, with nothing failing. Count them rather than trusting this sentence —
`grep -rn "OrderByDescending(entry => entry.LoggedAt)" backend/src/HobbyTracker.Api/Services/`.

**`latestNotePreview` is the one field on that row that does not come from the current pass** — it is
the most recent note across *every* pass of yours, so a replay begun this morning still shows what
you said the first time round. Two consequences, both load-bearing:

- **It carries its own `UserId` predicate.** Riding on `Latest` would have inherited `BoardQuery`'s
  scoping for free, but reaching every pass on a title reaches a *shared* title — without it a
  stranger's journal prints on your card. Notes have no user column, so it is a join.
  `UserScopingTests.Someone_elses_note_never_reaches_my_card` catches it.
- **It lives in the two terminal DTO projections and nowhere near `BoardQuery`.** A terminal subquery
  that fails to translate throws and names itself, where the same thing in `BoardQuery` empties the
  board and says nothing. `ItemAsync` needs its own copy, or a move answers with a null note.

Cut to `LibraryService.NotePreviewLength` (200) on the wire — far enough out that what a reader sees
cut is always the client's two-line clamp, which is what lets the cut answer to the card's width and
the density setting as a character count cannot.

### Board semantics

`POST /api/library/{mediaId}/status` is what dragging a card calls. The caller names only a target
column; which entry gets touched and which dates get set is decided server-side.

| Latest entry is | Target | Effect |
|---|---|---|
| not Completed | `Backlog` | edit in place; **clear both timestamps** |
| not Completed | `InProgress` | edit in place; set `started_at` = now *only if null*; clear `completed_at` |
| not Completed | `Completed` | edit in place; set `completed_at` = now |
| not Completed | `Dropped` | edit in place; set `started_at` = now *only if null*; leave `completed_at` alone |
| **Completed** | anything else | **insert a new entry** at the top of the target column |
| same as target | — | no-op |

**Leaving `Completed` inserts rather than edits.** Replaying a game finished in 2024 must not
overwrite that completion — preserving it is the entire reason the schema allows several entries per
title, and editing in place would destroy the record silently, on a gesture as casual as a drag.
`StatusTransitionTests` covers every row above; do not "simplify" this into a plain update.
`InProgress` sets `started_at` only when null, so picking a dropped game back up keeps the moment you
actually started it, and a pass inserted by a drag out of Completed gets a null platform and null
hours rather than inheriting the last one's.

**Dropping stamps a start when the pass has none**, which is the one rule in that table that adds a
fact rather than preserving one. A Backlog entry has both timestamps cleared by rule and the Dropped
column is narrowed by *either* of them, so a card dragged straight out of the queue used to leave the
board altogether — findable only under *All years*, which reads as a drag that lost the game rather
than as a filter being strict. It also agrees with what the column is for: Dropped is a game you
picked up and gave up on, and the day you gave up is the day it was on your hands. The value falls
back to the pass's own completion when there is an earlier one, because a pass can carry a finish and
no start — the drawer's form writes every field, so a game being played can be given a completion
date and left without a beginning — and `now` over that would put the start after the finish, which
`ck_log_entries_timestamp_order` answers with a 500 on a request that had nothing wrong with it. The
`Completed` arm carries the same guard facing the other way.

**Dropped sits last, and this board has had it both ways.** `BOARD_STATUSES` in
`frontend/src/hobbies/index.ts` is the one list the order comes from, so a hobby can rename a
column and cannot reorder the board out from under the drag. It ran Backlog · Playing · Completed ·
Dropped until 29 August 2026, when Dropped moved to the front on this argument: the titles in it
*left* the progression rather than finished it, so a muted well ahead of Backlog sits off the path
the eye takes across a board it reads left to right, which is what a column collapsed by default
wants anyway. **That argument is still sound, and nine days of living with it settled the question
the other way** — it moved back to the far right on 7 September 2026. Neither position is provable;
what decided it was use, which is the only evidence either of them was ever going to get.

**Moving it is one line, and two tests are what say so.** `otherColumns` filters the same list, so
a card's menu follows the board without a second ordering to keep in step — which is why *Move to
Dropped* is the last of a card's three moves again, above the one item that is not a move. Nothing
else moved either time: every e2e locator names its column rather than its position. What goes red
is `BoardPage.test.tsx`'s exhaustive list of the four `<h2>`s, in all three hobbies, and three of
`Card.test.tsx`'s four menu-order rows — the Dropped card's row is the one that reads the same
whichever end the column is at.

**A card's corner is an `⋯` menu, same items from every column** — *Open journal*, the three columns
this card is not in, then *Remove from board*. `columnsFor` in `frontend/src/hobbies/` is the one
list of the four, per hobby; `otherColumns` gives a card its three, never its own, because
`TransitionAsync` treats a move to the status a title already has as a silent no-op. It is called
*Open journal* rather than a noun for the thing, so every hobby gets this menu unmodified, and
**it is offered in every sort mode**, unlike the drag: a menu move writes no ranking, so there is
none for it to promise.

**It replaced a `×` that meant *drop* on Playing and *remove* on Backlog and was absent on the other
two.** What was wrong was letting the column choose which ending you got, and leaving half the board
with no control at all. Dropping is still not removing. **Do not undo this.**

**Remove from board takes every pass of yours, not the current one.** Deleting only the newest was
defensible on paper and wrong in the hand: a title replayed five times was five presses from leaving
the board, and each press looked like a failure because the card came straight back in whichever
column the pass underneath sat in. Nothing checks whether it was the last pass — `BoardQuery` already
filters on `LogEntries.Any()` — and **the server re-reads** rather than trusting the caller, because
one read from a card rendered a moment ago can already name a pass that has stopped being current.
**Deleting one pass is the drawer's**, through `DELETE /api/log-entries/{id}`, where the pass is
named and its dates are on screen. It confirms inline and counts what is going, since "off your
board" alone reads like a card is being lost rather than three records.

Four things about the menu, each of which had to differ from `SettingsMenu`, the only other menu in
the app:

- **Which card is asking, and which has its menu open, are both held by `BoardPage` rather than the
  card** — refetches remount cards, the same fact that makes focus go back by id — and holding them
  above the board is also what makes one at a time fall out.
- **Escape is handled on the menu container, not on `document`** (the drawer already listens there),
  which bubbling reaches from the corner and from every item. Focus goes back to the corner **by id**
  (`cardMenuId`, beside `cardTitleId`). Outside-click stays a `document` `pointerdown` listener,
  because there is no other way to hear a press elsewhere.
- **The open card takes `relative z-10`.** `@container` on `CARD_CLASS` implies `contain: layout`,
  making every card a stacking context — so the panel was *painted under* the card below it, and
  under another column's cards at two-across widths.
- **`aria-disabled` is dropped from the card.** dnd-kit stamps it when the sortable is off, which is
  true and is not what the attribute claims on a list item — both screen readers and Playwright read
  it as disabling every control *inside* the card.

**The panel is a `role="group"` of buttons, not a `role="menu"`**, which promises arrow-key roving
focus this does not implement. The title is on the group's label and **never on an item**: the e2e
`card()` locator filters on a card's own text, so an item carrying a title would make it match any
card whose menu mentioned another card's game. *Remove from board* wears a **translucent danger fill,
not danger text** — Ember's `--danger` is one hue from its `--accent`, so a red word there reads as
the emphasised item rather than the dangerous one.

**A card's surface carries two gestures, and the 8px activation distance is the whole of what tells
them apart.** `useBoardSensors` in `board/sensors.ts` is the one place that decides it: under the
distance the drag never begins and the click lands on whatever button was pressed; over it dnd-kit
adds a capture-phase `click` listener of its own, so the press that moved a card cannot also open its
drawer. **The title therefore does not stop the pointer** — it is most of the card's surface, and
swallowing the press there left the drag only the margins to start from — where the options corner
and the open panel both do. Nothing is needed for the keyboard: dnd-kit's keyboard sensor refuses to
activate from a nested element.

**The test harness mounts cards under those same sensors**, which is why they are a module rather
than a few lines inside `useBoard`. A bare `DndContext` takes dnd-kit's defaults, which carry no
activation constraint — every press activates a drag from the first pixel and the click that follows
is swallowed, which made the journal look unopenable in jsdom while working perfectly in a browser.

**A column tints from dnd-kit's `over`, not from its own `useDroppable().isOver`, and the difference
is the whole of why an occupied column used to feel closed.** `isOver` is true only when `over` *is*
that droppable — but `over` is whatever the cursor is nearest, and inside a column that is almost
always one of its cards, because a column with anything in it is mostly cards. So the tint appeared
on the empty strip below the last card and nowhere else, and the empty strip is where people learned
to aim. **The drop was never blocked**: `onDragEnd` has always read the target status off whatever is
under the cursor, and a card carries `{ status }` in its sortable data exactly as the column does in
its droppable data. One comparison against that answers "would a drag land here" without caring which
kind of thing replied. It stays true while reordering inside one column, which is correct — that is
where the card is going to land. Pinned by two e2e cases, one dropping onto the middle of a stack and
one asserting the tint mid-gesture with the button still down; the second was red and the first was
green before the change, which is what said the defect was the answer rather than the drop.

### The board is one year at a time

One `Year` control above the board, **opening on the latest year there is** rather than on all of
them. A board is a record of a year, and one that opened on everything would be a wall of history for
anybody who logs more than one year of it; *All years* is one choice away. It replaced a picker inside
the Completed column's header, which was right while `completed_at` was the only date the year meant
— **a control living inside one column while narrowing three would be claiming to be about that
column.**

**The year means a different date per column, and it has to.** One predicate for all four is
unusable: Backlog and InProgress have their completion cleared by the very rules that put a title in
them, so `completed_at` board-wide leaves three columns permanently empty and reads as a broken
filter rather than a strict one.

| Column | Answers with |
|---|---|
| Backlog | **Nothing — it is exempt.** Both timestamps are cleared by the rule that puts a title there, so it belongs to no year; and it is what you drag out of while reading a past one |
| Playing | `started_at`. The transition into this column clears `completed_at` |
| Completed | `completed_at`, pointedly **not** `started_at`. A game begun in 2019 and finished in 2021 is a 2021 completion |
| Dropped | **Either.** A drop stamps a start when the pass has none and leaves a completion alone, so an abandoned title carries a start, an earlier completion, or both. Only a pass written straight through `POST /api/log-entries` carries neither |
| *no column named* | Either, for Dropped's reason: with no column named there is no one date to prefer |

`LibraryService.InYear` holds the server's half and `yearFor` in `frontend/src/board/keys.ts` the
client's, which is only the Backlog exemption. Both halves are named in each other's comments, because
a column filtering on a date the client did not expect is invisible rather than loud.

**`GET /api/library/years` answers with any activity, not completions.** It had to move with the
filter: a year you began something in and finished nothing in is a year the Playing column handles
perfectly well, and while the list was completions alone the picker had no way to ask for it.

**A move invalidates the years as well as the two columns, and that is easy to miss.** A transition
stamps `started_at` or `completed_at`, so a drag is one of only two things that can bring a year into
existence — and the column keys cannot cover it, because `'years'` is not a status and no prefix of
theirs reaches it. Without that line the first title finished in a new year vanishes from the board it
was on and the year that would show it is not offered until a reload.

**The board renders nothing until the years arrive.** Deliberate rather than a missing loading state:
it opens on the latest year, so painting before they are known is a board showing every year — briefly
— with four columns refetched on the way to the one it was always going to be. `YearPicker` is
presentational, because the page has to hold that query to have anything to default to.

**One consequence worth knowing rather than fixing:** completing a game while reading a past year
makes its card leave the board, since the completion is stamped *now*. That is the filter being honest.

### A second thing that narrows a column

**The Backlog column answers without the titles that are not out yet.** They are not gone: they are
on the release calendar under the board, which is the same rows read the other way round. The whole
of that feature is in `docs/games-igdb.md` under **The release calendar**; what belongs here is the
three things it does to the board.

**It applies only where a status is named, and only to Backlog.** `Filtered` also runs with no
status — `ActivityYearsAsync`, `ReorderAsync`, and the un-statused `GET /api/library` that
`libraryMediaIds()` pages through to build the search strip's *"On your board"* set. Narrow that and
an unreleased title drops out of it, the strip offers to add a title you already have, and the second
press writes a Backlog entry the card renders as a replay that never happened. It sits in the status
switch beside `InYear` for exactly that reason. Every other column holds titles you have already
started, and whether those are out is not a question worth asking — it would hide an early build
somebody is deliberately recording.

**The other three hobbies need no flag, and that is the non-obvious half.** The predicate carries no
hobby condition at all. A film's `release_precision` is null for ever, because TMDB is not asked for
one, so the first clause leaves the movies board exactly as it was. Whether a hobby has a calendar is
decided by whether anything fills its columns — not by a list of slugs — which is what makes "no
branch on the hobby slug" true on the server by construction rather than by discipline.
`HobbyDefinition.releases` decides only whether the *section renders*. **Filling a hobby's release
columns and setting that flag are one commit**, or its unreleased titles leave Backlog with nowhere
to be shown.

**The column and the calendar are one expression, negated.** `ReleaseWindow.NotOutOn` is the single
definition of "not out yet" in the app, and the two halves are literally `p` and `Not(p)` rather than
two predicates that look alike. Two hand-written ones would drift, and the drift is invisible: a
title in both places or in neither, with nothing erroring. `A board row is on exactly one side of the
release line` seeds one title of every shape and asserts the partition — which is the test that
catches a three-valued-logic hole, the kind that got into `ck_media_release_window`'s first draft.

**The section renders outside `data-board`**, and that is not cosmetic: `card()` in
`e2e/support/board.ts` is scoped there precisely so a search result cannot answer to it, and a
calendar row must not either. It also sits outside the `years !== undefined` gate, because everything
on it is in the future and Backlog is exempt from the year anyway.

### Query keys, ordering, and the traps

**`frontend/src/board/keys.ts` owns every board query key**, and its comments carry the reasoning.
What a caller has to know:

- The column key is `['library', hobby, status, { sort, year }]`. **The sort and the year belong in
  the key, not just in the request** — leaving them out serves the previous ordering from cache and
  corrects itself only on the next refetch, which is a board showing one order while claiming another.
- **A move invalidates the column *prefix* `['library', hobby, status]`, not the fully-qualified
  key**, because a column has one cache entry per sort and year and the exact key only reaches
  whichever one is on screen. **A reorder keeps the exact key on purpose**: it writes `position`, and
  `manual` is the only ordering that reads it.
- **`upcomingKey(hobby)` is `['library', hobby, 'upcoming']`, and it sits where a status sits** —
  beside `'years'` and the search strip's `'ids'`. That placement is what makes it reachable from the
  `['library', hobby]` prefix an add, a remove and a drawer write all settle on, and unreachable from
  the narrower `['library', hobby, from]` a move uses. **So a move has to name it, exactly as it has
  to name `'years'`.** The calendar is the other half of the Backlog column, and a card's menu can
  move a title out of it and back; settle only the two column keys and the section goes on showing a
  title that is no longer waiting, until something unrelated happens to refetch.
- `mediaKey(hobby, mediaId)` is `['media', hobby, mediaId]` — one title's journal. The drawer reads
  it; **the board writes to it**, because a transition stamps `started_at` and can insert a whole new
  entry. It was `gameKey(mediaId)`, keyed on the id alone: media ids are unique across hobbies, so
  that was not wrong, but two hobbies' detail endpoints answer different shapes and sharing a cache
  entry between them is a thing that goes wrong once and is very hard to see afterwards. **The
  drawer is handed its hobby by the board** rather than working it out, which it needs anyway to
  know which fields a pass of that kind has.

**Manual ranking** lives in `log_entries.position`, ordered `position ASC, id DESC`. New entries take
`min(position) - 1` for their column (`BoardPositions.TopOfColumnAsync`) so a title just added appears
on top and nothing gets renumbered. `PUT /api/library/order` takes the whole column top-first rather
than a move-and-index: idempotent, no off-by-one arithmetic, and ids that have since left the column
are ignored rather than rejected, because a loaded board can legitimately be one drag out of date.

**Sorting never writes.** `sort` ∈ `manual` (default) · `added` · `title` · `rating` · `length` are
read-only views that leave `position` untouched, which is what lets the UI enable dragging only in
manual mode and still guarantee the ranking survives a look at the alphabetical order.

`sort=length` is **how long the title takes**, shortest first, with titles that have no figure last —
the same treatment an unrated title gets under `sort=rating`, rather than sorting as though nobody
having timed a game meant it took no time. **It is the same field the card prints, and that is not a
convention either of them has to remember**: both read `LibraryItemDto.LengthHours`, so there is
nothing for them to drift apart over. A column ordered shortest-first on a number none of its cards
show reads as broken.

**What that field means is the hobby's, and the name stopped saying "games" deliberately.** For a
game it is HowLongToBeat's headline figure; for a film it is the runtime. It is **not**
`log_entries.hours_played`, which is how long you took on one pass. The label is the hobby's too —
games call it **Time to beat**, because "Hours" alone reads as the hours you have put in.

Traps, all of which have bitten already:

- **Project board rows with member-init, not a constructor.** EF Core can decompose
  `new BoardRow { A = ..., B = ... }` and push later `Where`/`OrderBy` into SQL; a positional record
  is opaque to it and every filter on the projected latest entry fails to translate. **It surfaces as
  an empty library, not an obvious error.**
- **TPT downcasts live in the two terminal DTO projections only, never in `BoardQuery`.** `BoardQuery`
  is what every `Where` and `OrderBy` is pushed through, so a downcast that stops translating there
  empties the whole board with no error; confined to one place the worst case is that one thing
  breaks. `sort=length` keeps its downcast **inside that one switch arm** in `LibraryService.Sorted`,
  and `LibraryOrderingTests` asserts the column comes back **non-empty**, because emptiness is the
  symptom.
- **Validation attributes go on record primary-constructor parameters**, not `[property:]` targets.
  MVC throws `InvalidOperationException` rather than skipping them.
- **`LogStatus` needs `JsonStringEnumConverter`** (registered in `Program.cs`) to travel as
  `"Completed"` rather than `2`.
- The three timestamp traps are in **Time** in `docs/data-model.md`, and all fail quietly or as
  a 500.

