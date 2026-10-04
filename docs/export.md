# The spreadsheet

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

**Everything on a board, as an Excel workbook you keep**, from one row in Settings. Built on
4 October 2026 for #7 in `docs/plans/games-board-next.md`, on the games board only, and deployed
the same day (PR #61).

| | |
|---|---|
| Where | **A row in a *Your data* group after Columns** in Settings: a download glyph, *Download a spreadsheet*, and what the file holds under it |
| What | **Three sheets.** Games has a row per title, as its card shows it. Playthroughs has a row per pass, and Notes a row per note, newest first |
| Which titles | **Everything on the board**: every column, those taken off in Settings included, every year, and the calendar's titles. The year control and Settings decide what you see, not what you have |
| The file | `hobbytracker-games-2026-10-04.xlsx`, named for the board and the day it was made here |
| Hobbies | **Games only**, from `HobbyDefinition.export`. The API answers for every hobby |

Every row of that table was decided with the user on 4 October 2026, in two rounds, the second
from a private page of renders of the real panel: https://claude.ai/artifact/DGc5UdVXGsyeDNBgbSsxSU.
Every choice was the recommendation but one: *All genres* and the HowLongToBeat link joined the
Games sheet over it. `docs/design.md`, **Your data**, has what the row looks like and what it was
picked over.

## The route

| Route | |
|---|---|
| `GET /api/library/export?hobby=` | every title on your board, with every pass of yours and every note, in the board's order. **Not paged.** **400** for an unknown hobby |

`LibraryService.ExportAsync` asks twice.

- **The titles come through the board's own query**, `BoardQuery`, with no column and no year
  named. So nothing the board narrows is narrowed: the release partition applies only where a
  column is named, which is what leaves the calendar's titles in. They come in the order
  `Sorted`'s Manual arm ranks a column in, the arm the board itself uses. Which column comes first
  is the client's to say (`BOARD_STATUSES`), so a position here is a place within one column, and
  the client puts the columns back together.
- **The passes are one query**: every one of yours against those titles, with their notes,
  `logged_at DESC, id DESC`. **It carries its own `UserId` predicate**, because the titles are
  shared and a query keyed on their ids alone reaches a stranger's replays — and puts one first
  when it is the newest. The order is the rule the board calls a pass current by, so a title's
  first pass is the one its card shows. That makes it one more site that orders a title's passes
  and has to agree with the rest; `A_titles_first_pass_is_the_one_its_card_shows` holds it to the
  board with two passes logged in one instant.
- **A pass is `LogEntryDto`**, the journal's own shape, which also puts each pass's notes newest
  first: the one place that order is written down.
- **The catalogue's half is a card's where a card has one**: the name it leads with, and its
  genres, from copies of the coalesces both board projections build. EF cannot reuse an expression
  inside another, so `Every_hobbys_title_is_named_and_painted_as_its_card_is` holds the copies to
  the board's own answer for all four hobbies. Then what only the games sheet prints: the
  developers, the release window, HowLongToBeat's four figures and its id. Those are a game's, and
  null for a title of any other hobby. All of it is TPT downcasts, so terminal and nowhere near
  `BoardQuery`.

**Before the route existed, a request to it answered 405, not 404.** ASP.NET's method policy turns
a GET away from the `{mediaId:int}` POST and DELETE templates at that address before their `int`
constraint is tried. A literal segment outranks them once it is there.

## The server sends facts, and the client writes words

**Stats' split** (`docs/stats.md`), for its reason. What a status is called, which genre stands for
a title, what a release window reads as and which day an instant fell on here each have a home in
`frontend/src/hobbies/` or `lib/` already. The sheets are built from those, not from a second copy
on the server that could disagree with the board. `export/sheets.ts` is a pure function from the
API's answer to the sheets the writer is handed, so everything the file says is tested without a
file.

**The words are the hobby's, and the columns follow what the hobby already says.**
`HobbyDefinition.export` holds the words: what the file holds, the three sheets' names, and the
noun that numbers a title's passes. Which columns there are is stated elsewhere already: *Hours
played* and *Platform* where `PassFields` has them, and HowLongToBeat's four figures and its link
where `JournalSection.setHltbId` says HowLongToBeat has something to correct, which its comment
calls the same fact as `TitleDetail.hltb`. So a films block would bring Films, Viewings and
Watching and none of a game's columns, with no condition added anywhere, and a films-shaped
definition in `sheets.test.ts` holds that. *Developers* is the one column that does not follow: it
is the API's `developers`, which only a game has.

## The workbook

| Sheet | Columns, in order |
|---|---|
| Games | Title, Status, Rating, Hours played, Platform, Started, Finished, Added, Playthroughs, Genre, All genres, Developers, Released, HLTB main story, HLTB main + extra, HLTB completionist, HLTB all play styles, HowLongToBeat, Latest note |
| Playthroughs | Title, Playthrough, Status, Rating, Hours played, Platform, Started, Finished, Notes |
| Notes | Title, Playthrough, Written, Note |

- **Games are in board order**: the columns as `BOARD_STATUSES` lays them out, and each column as
  it is ranked by hand. The calendar's titles are Backlog entries, so they sit in Backlog's run,
  by position. Playthroughs follows the same order of titles.
- **A Games row is its card.** Status, rating, hours, platform and the two dates are the current
  pass's. *Status* is `columnLabel`, *Genre* is `resolveGenre`, and *Added* is the first pass's
  `logged_at`, the only date a Backlog row has. So a replay under way shows no rating however well
  the first run did; that run is on the next sheet.
- **Released is a date cell when the precision is `Day`**, and the calendar's words otherwise
  (`Sep 2026`, `Q1 2027`, `2026`, `TBA`), right-aligned so the column reads as one. **Blank for a
  null precision.** See the traps.
- **Numbers are numbers**: ratings, hours, the four figures and the counts. A missing figure is an
  empty cell, never nought. A count is a number however small: a pass with no notes says 0.
- **Passes are numbered from the first.** The API sends them newest first, so the first run is
  playthrough 1 however many came after it, on the passes sheet and against each note.
- **Notes are newest first across the whole board**, two written in one instant told apart by id,
  as the card's latest note is. *Latest note* on the Games sheet is that same newest note, across
  every pass and whole. A card's is cut to 200 characters on the wire and two lines on screen.
- **The header row is bold and frozen, the Title column is frozen, and every column has the
  workshop's width.** Every cell is top-aligned, so a wrapped note does not leave its row's other
  cells floating in the middle. Only *Note* wraps.
- **The tier names are HowLongToBeat's own**, from `HLTB_TIER_LABELS` in `journal/fields.ts`, which
  `hltbTiers` reads too. `hltbTiers` itself could not be reused: it drops the figures nobody has
  submitted, and the sheet wants every column on every row. The address is `hltbGameUrl` beside it,
  which the drawer's *View on HowLongToBeat* builds from as well.

## Traps

- **Text is text.** Every value a person typed goes in as a `String` cell, which a spreadsheet
  never evaluates, and that is the whole of why a note beginning `=` or `-` is safe in this format.
  Nothing is ever `type: 'Formula'`; the link is a plain address for that reason. Read in
  write-excel-file's source: a `String` is written as a shared string, `t="s"`, and only
  `'Formula'` writes `<f>`.
- **`formatRelease` answers *TBA* for a null precision.** The calendar never shows such a title, so
  it is harmless there. In a sheet it would stamp every title from before the calendar *TBA*, where
  null means *reads as released*. `released` in `sheets.ts` writes a blank cell for null, and *TBA*
  only for `Unknown`.
- **A date cell is the wall-clock parts here, written as UTC.** An Excel date has no zone, and the
  writer turns a `Date` into a serial with `getTime() / day + 25569` — UTC, read in its source. So
  `wallClock` builds the day and minute here with `Date.UTC(...)` from the parts `lib/time.ts`
  gives. Built from the instant instead, an evening finish lands on the next day.
- **A minute here has its own helper**, `journalMinute` beside `journalDateInput`. It is assembled
  from `formatToParts`, because `en-CA` writes a day and a time as `2026-08-21, 00:05`, comma and
  all, and on `hourCycle: 'h23'`. This Node's ICU answered `h23` for `hour12: false` as well; the
  cycle is stated rather than left to a locale.
- **Read back, a minute comes out a millisecond short.** Measured in a file the app downloaded:
  a note written at 14:59 read back as `14:58:59.999`, from the exact serial `46299.62430555555`.
  The drift is the reader's, so `export.spec.ts` compares to the minute.
- **Notes are capped at 4,000 characters**, and a cell holds 32,767, so nothing is cut.
- **Don't page the export.** Columns stop at 100, and `More_than_a_page_of_titles_all_come_back`
  says this does not.

## The row

`SettingsMenu`'s *Your data* group. The row is rendered only for a hobby with an `export` block.
The group itself is on every board since #8 put *Delete my account…* under the row, because an
account is every board's (`docs/auth.md`, **Deleting an account**). The look is
`docs/design.md`'s.

- **A `useMutation`, held by the menu rather than the panel**, so closing the panel while the file
  is being made loses neither the file nor the state the row comes back to.
- **It reads *Preparing…* and is held still by `aria-disabled`, not `disabled`.** A real browser
  takes focus off a control the moment it is disabled, which would leave the keyboard at the top
  of the page with the file still coming. `docs/games-hltb.md` had already measured that, and that
  jsdom does not. A press while it works is simply not acted on. *The keyboard stays on the row* in
  `export.spec.ts` is the test, and planting `disabled` turns it red.
- **The line under the row becomes the alert when it fails**, in `text-danger` with
  `role="alert"`, rather than a second line beside it. It is a new element, keyed, so it is
  announced as it arrives, and the row's description goes with it. A failed request and a writer
  that refuses read the same, and the row works again when pressed again.
- **The writer is loaded when the row is pressed**: `import('write-excel-file/browser')` in
  `export/download.ts`, beside the request rather than after it. The build puts it in a chunk of
  its own, `browser-*.js`, at 19.70 kB gzipped, and nothing of it in the main bundle. Its zipper,
  fflate, deflates any part of the file over 160,000 bytes in a worker started from a `blob:`
  address, and anything smaller in place. The app sets no Content Security Policy to refuse that;
  one that did would need `worker-src blob:`.
- **The file is named with `todayHere()`**, the release calendar's idea of today, so a file made at
  11pm is named for the day it was made here.

## Checked by putting each fault back

Every guard was checked by planting its fault, one at a time, against the finished feature, and
each turned red exactly the tests named.

**Backend**, `LibraryExportTests` (11):

| Fault planted | Red |
|---|---|
| Passes not scoped to you | *nothing of anybody else's comes back* |
| Paged as a column is | *more than a page of titles all come back* |
| The board's year applied | *every column, every year and the calendar*, and every case whose passes carry no date in this year, which is nine of the eleven |
| The calendar's titles left on the calendar | *every column, every year and the calendar* |
| Ordered by title rather than by hand | *titles come in the order the board ranks them by hand* |
| Passes ordered by id alone | *a title's first pass is the one its card shows* |
| Passes ordered by `logged_at` alone | the same |
| Passes oldest first | the same, and *every title comes back with every pass and every note* |
| A title named by `media.title` | *every hobby's title is named and painted as its card is* |
| Films' genres left out | the same |
| Notes left behind | *every title … every note*, and *nothing of anybody else's* |
| Never asked read as unannounced | *a title nobody has asked a provider about has no release precision* |
| Two figures swapped | *each title carries what the catalogue says about it* |
| No check on the hobby | *an unknown hobby is refused* |
| Open to anybody | *nobody signed in gets a 401*, which got a 500 from `ICurrentUser` |

**Frontend**: `export/sheets.test.ts` (16), six new in `theme/SettingsMenu.test.tsx`, and two in
`lib/time.test.ts`:

| Fault planted | Red |
|---|---|
| Status as the wire value rather than the column's name | *takes a Games row from the current pass*, and the films-shaped board's |
| A Games row from the oldest pass | *takes a Games row from the current pass*, and *lists every note newest first*, whose first row then becomes another title |
| *Added* from the current pass | *takes a Games row from the current pass* |
| Titles in the API's order, not laid out by column | *lays the titles out column by column* |
| *TBA* for a title nobody has asked about | *leaves Released blank* |
| Released in words for a day too | *writes Released as a date for a day* |
| A day cell holding the instant | *keeps an evening here on its own day*, and the current-pass case |
| *Written* holding the instant | *keeps an evening here on its own day, and a note on its own minute* |
| A missing number written as nought | the numbers case, the current-pass case and the numbering case |
| Text beginning `=` written as a formula | *writes whatever was typed as text* |
| Notes oldest first | the newest-first case, the numbering case, and the typed-text case's note rows |
| Notes in one instant by id ascending | the newest-first case, and the typed-text case |
| Passes numbered from the newest | *numbers each title's passes from the first* |
| A note numbered by its pass's place in the API's list | the same |
| Hours on every hobby's sheet | *builds a board of another hobby from its own words and its own fields* |
| HowLongToBeat on every hobby's sheet | the same |
| *Latest note* from the current pass alone | *lists every note newest first, and puts the newest on its card's row* |
| Nothing frozen | *freezes the header and the titles* |
| Notes not wrapped | the same |
| The row on every board | *is not offered on a board whose hobby has no spreadsheet yet* |
| A press while preparing starts another | *reads Preparing… while it works, and takes no second press* |
| Never says *Preparing…* | the same |
| The failure beside the line rather than in its place | *says so when it fails, and works again* |
| The failure not announced | that case, and *fails the same way when the file cannot be written* |
| A clock that runs 1 to 24 | *starts the day at nought* |
| The minute read in UTC | both `journalMinute` cases, and the sheets' evening case |

**End to end**, `e2e/export.spec.ts` (2), which reads the downloaded file with read-excel-file:

| Fault planted | Red |
|---|---|
| Held still by `disabled` rather than `aria-disabled` | *the keyboard stays on the row while the file is made* |
| Text beginning `=` written as a formula | *the row downloads the board as a workbook of three sheets* |
| A day cell holding the instant | the same |
| *Written* holding the instant | the same |

Both specs were red first against `main`'s Settings panel, which has no row to press. **The
reader's types call a date cell's value the `Date` constructor**, where it hands back an instance,
so the spec checks for one before it reads the minute.

## What the plan got wrong, or left out

- **"`data-model.md`'s count of places the zone is applied is updated."** The count stays four.
  The export applies the zone in `lib/time.ts`, which is the third place, the UI, exactly as the
  Stats page's months are. `data-model.md` now says so beside them.
- **"The row is disabled."** It is, to anything that reads ARIA and to a press, and it looks it.
  It is not the `disabled` attribute, for the focus reason under **The row**.
- **"The tier names in the headers are `hltbTiers`' own."** They are, but not through
  `hltbTiers`, which drops missing figures and leads with All play styles. The names moved into
  `HLTB_TIER_LABELS`, which both read, and the address into `hltbGameUrl`, which `HltbPin` builds
  its link from now.
- **The columns follow the hobby.** The plan listed the games sheet's columns, which is what the
  games board gets. The hours, platform and HowLongToBeat columns follow `PassFields` and
  `setHltbId`, so the next hobby's block brings its own words and no game's columns, by the rule
  that games-only behaviour follows the data.
- **"Its browser build compresses in a `blob:` worker."** Only a part of the file over 160,000
  bytes; anything smaller is deflated in place. Either way nothing refuses it.
- **The order of a title's passes is one more site.** The plan did not count it. The grep
  `docs/board.md` asks for found seven sites before it, where CLAUDE.md said six:
  `HltbService.DetailAsync` had been left off that count. There are eight now, and CLAUDE.md names
  them.
