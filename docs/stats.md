# Stats

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

**What a year of a hobby added up to**, on a page of its own under the board:
`/board/:hobby/stats/:year`, or `/all` for every year. Built on 2 October 2026 for #5 in
`docs/plans/games-board-next.md`, on the games board only, and deployed on the 3rd (PR #52). The
year in review is meant to grow from it.

| | |
|---|---|
| Where | `/board/games/stats/2026`. The bare `/board/games/stats` opens on the latest year there is; an address naming something that is not a year goes there too, replaced rather than pushed |
| The way in | **"Stats for 2026 →" on the board's year row**, carrying the year the board is showing, or `/all` under All years. On a phone too, where the row already is |
| The tiles | Finished · Completion · Vs HowLongToBeat · Rating, four across from 1280px |
| The panels | Finished each month (covers) · Ratings (a column per point) · You and HowLongToBeat (a bar per game) · Backlog (oldest first), two across from 1024px, in the board's wells |
| Hobbies | **Games only**, from `HobbyDefinition.stats`. The API answers for every hobby |
| On a share | **The owner's page, whole**, when the share shows Stats: `/share/:token/stats/:year?`, under the share's banner, in words written to nobody. See **On a share** |

Every row of that table was decided with the user on 2 October 2026: the first four questions
before anything was drawn, the rest from a private page of renders,
https://claude.ai/artifact/Cb1T1pYGFvdi35ULXn3Pq2. All twelve recommendations were taken.
`docs/design.md`, **Stats**, has what each looks like and what it was picked over.

## The two routes

| Route | |
|---|---|
| `GET /api/stats?hobby=&year=` | a year of one hobby: every finish in it, the hours compared over them, what became of what was started, and the Backlog column. No `year` is every year. **400** for an unknown hobby, and for a year outside 1–9998 |
| `GET /api/stats/years?hobby=` | the years the page can show, newest first |

`StatsDto` carries four things, and its doc comment says why each is the shape it is:

- **`finished`**: every pass in Completed whose finish is in the year, oldest first, each with its
  title, cover, the instant it was finished, its rating, your hours and the title's length. With
  no year, every pass in Completed, a finish with its date cleared included and sorted last.
- **`hours`**: a `ColumnHours`, over those finishes, by the column header's rules.
- **`completion`**: `{ finished, going, dropped }` over the passes started in the year.
- **`backlog`**: the Backlog column as the board draws it, oldest first, each with when its pass was
  made and when it last arrived in Backlog, if the history says.

## Every playthrough, not every title

**The board is about where things are now, so it shows a title once, by its latest pass. Stats
are about what happened, so every pass counts for what it did.** Decided with the user before
anything was drawn. A game finished in March and replayed in June is still a March finish, and
a game finished twice is two finishes. A year's numbers never change because of something done
later, which is what a year in review needs.

**The cost, accepted when it was chosen: the Completed column and the Stats page can disagree
about the same year.** The column counts titles whose latest pass is a finish in that year, so a
title replayed since is not in it. The stats count it. `A_finish_still_counts_in_its_year_after_the_game_is_replayed`
asserts both answers in one test, so the difference is a stated behaviour rather than a bug
somebody finds.

**The years are the page's own for the same reason.** `GET /api/library/years` is the board's,
read off current passes, so a game finished in 2024 and replayed now leaves 2024 off it.
`GET /api/stats/years` reads every pass. A pass in Backlog offers no year, because a date on one
was left there by an edit and its year would open on a page with nothing in it.

## What each number means

**Finished** is every pass in Completed with a finish in the year. Completed and nothing else: a
dropped pass can carry a finish date, since dropping leaves a completion alone, and it is not a
game you finished.

**Completion** is the share of the passes *started* in the year that are finished, beside how many
are still going (Playing and On Hold) and how many were dropped. Decided with the user over the
share of what was settled in the year, which would have needed a drop date that has only been
recorded since 1 October 2026, and over an all-time share with the backlog in it. Three rules sit
under it:

- **Started is the start, or the finish when there is no start.** Adding a title straight to
  Completed stamps a finish and nothing else, and a finish began no later than it ended.
- **A pass in Backlog has not started**, whatever date it carries: the move into Backlog clears
  both, so a date there is left over from an edit. It is in none of the three counts. That is
  the one place this is decided. The query used to filter Backlog out *as well*, and the
  test could not tell which of the two held the rule. See **Checked by putting each fault back**.
- **With nothing started there is no rate**, and the tile says *Nothing started in 2026* rather
  than 0%, which would say you finished none of it. The client works the share out, because it
  is the one that has to say that.

A year's completion can still move after the year ends: a game started in December and finished
in January raises December's year when it is finished. "Of what you started, the share finished
so far" is what the number means, and that is not a replay changing history.

**Vs HowLongToBeat** is your hours against the title's length over the finishes that have both, by
the rules Completed's header uses (see **One set of rules for hours**). The percentage is the
total of your hours over the total of theirs, as the header compares, so it agrees with it about
the same games. The chart under it is a bar per finish with both figures, sorted on the exact
ratio.

**Rating** is the mean of the ratings the year's finishes have, to the tenth, with the unrated
left out rather than counted as nought. The chart counts them at each whole point: a 9.9 is a 9,
and a 10 is its own.

**Backlog** is the Backlog column exactly as the board draws it, through the board's own query —
the current pass decides the column, and the titles waiting on the release calendar are not in it.
It is the same whatever year is asked for, because Backlog belongs to no year on the board either.

## How long a title has waited

**"In your backlog N days" when the column history says when it arrived, "added N days ago" when
it does not.** The user's own words for the ask were *"X was added to your backlog Y days ago"*.

- **The arrival is the pass's latest row in `status_changes`, if that row says Backlog.** The
  latest row, and not the latest row into Backlog: when the last move the history knows of went
  somewhere else, a write around the recorder brought the title back, and an older arrival would
  claim a wait that was interrupted. `A_title_whose_last_recorded_move_was_elsewhere_has_no_arrival_to_claim`
  holds it.
- **Otherwise the pass's `logged_at`, labelled *added***. A pass with no rows was made before
  recording began on 1 October 2026 and has not moved since. When it was made is when it went on
  your board, which for a title moved back since is *earlier* than its wait began. So the word
  claims only that.
- **A note under the list says what *added* means, and only while a title says it.** On the day it
  shipped that was nearly every title, and in time it will be none.
- **The days are counted here**, from the instant's day in the journal zone to `todayHere()`, so
  11:30pm yesterday is one day ago rather than today.

No age on Backlog cards, for now. It was rendered and not picked: at 1440 it added a line to every
Backlog card, and a card would need a date the board row does not carry.

## The server sends facts, and the client files them

**Which month a finish falls in is the journal zone's question, and the server does not ask it.**
`finished` arrives as instants, and `byMonth` in `stats/stats.ts` files them with `journalMonth`
from `lib/time.ts`, a sibling of `journalYear`. That is the UI, one of the places
`docs/data-model.md` counts, rather than a new one. Under All years, `byYear` files them by year
instead, oldest first, with the undated last.

**The year meets an instant on the clock, in both directions.** `IJournalClock.SpanOf(year)`
turns a year asked for into the instants it covers, and `IJournalClock.YearsOf(instants)` turns
stored instants into years. Both moved there from `LibraryService` when a second service needed
them, so the board's `?year=` and the Stats page's, and the board's years and the Stats page's,
are each one implementation rather than two. That is what keeps the two pages agreeing about which
year 8pm on New Year's Eve belongs to. `JournalClockTests` holds both.

**Two things do come added up**, each because it has a home on the server already: `hours`, by
the column header's rules, and `completion`, which is over passes that are mostly not finishes and
so cannot be worked out from `finished`. Everything else — the count, the months, the ratings and
the chart — the client derives from `finished`, so a headline and the chart under it are one list
counted twice, and they cannot disagree.

## One set of rules for hours

**`HoursTally.Of` is where the rules for adding up hours live**, moved out of
`LibraryService.HoursOfAsync` when the Stats page needed them too: a title with no figure is left
out and counted, never added as nought, and the comparison is over the titles that have both. The
board's headers call it over a column's titles, and the Stats page over a year's finishes.

**And the words are the header's too.** The panel's two lines are `columnHoursLines(definition,
'Completed', …)` handed the year's finishes, so *221 h played vs ~212 h to beat · over 8 games ·
1 without your hours · 7 with no estimate* is the same sentence in both places, from the same
function. A test renders both and compares them.

**A finish's length is the fifth copy of the `LengthHours` coalesce**, after the board's two
projections, `Sorted`'s Length arm and the header's sum, for the reason the fourth was a copy: a
shared expression cannot be invoked inside another in a query EF can translate.
`A_finish_carries_the_name_and_the_length_its_card_prints_for_every_hobby` holds it to the cards
for all four hobbies, and holds the name a finish carries — the one a card leads with, MAL's English
title for an anime — the same way. The backlog's name is a third copy of that coalesce, held by
`A_title_in_the_backlog_is_named_as_its_card_is`.

**The percentage is worked in hundredths**, the unit both figures are stored in: 2.01 hours against
2 is half a percent exactly, which floating point makes 0.4999999999999893 and rounds to nought.
And the size is rounded before it is given a direction, because `Math.round` takes -4.5 to -4 and
4.5 to 5. Under half a percent either way reads *The same*, never *0% longer*. The chart's order
compares two ratios as cross-products of whole hundredths, so equal ratios tie exactly and a tie
goes by title.

## On the page

- **Nothing is fetched until the year is known.** The bare address waits for the years and then
  replaces itself with the latest, so the whole history is never fetched and painted on the way.
  There is no year control while it waits, for the board's reason: it would say *All years* about
  a page that is about to open on this one. The first version had one, and the component test
  that waits for the control caught it reading *All years*.
- **The year control is the board's own `YearPicker`**, so a year it keeps on offer when the list
  has not got it — an address naming a year before the list arrives — is kept here too. Changing
  it replaces the address, so Back returns to the board rather than through every year tried.
- **A month stops at six covers and says "+2"**, and a busy year's chart shows the six quickest and
  six slowest with *Show all*. The backlog shows six with *Show all 14*, the wording the renders
  had.
- **The months reflow rather than swap.** One list: across on a wide screen, a stack per month
  with the first finish at the bottom; a row per month on a phone, where the months still to come
  are left off. A screen reader and a test meet one of each.
- **The months still to come are not dimmed**, which the renders showed with an opacity. A month's
  label is `text-muted`, held at 4.5:1 on every theme, and an opacity takes it under — the rule
  the hobby nav's *Soon* is written down for in `docs/design.md`.
- **Every chart is drawn for the eye and said in full to a screen reader.** The covers are images
  named for their titles in a list named for its month. Each bar of the comparison is a list item
  that says *18% quicker: 10.5 hours played against about 12.76 hours to beat*, and shows the hours
  on hover and on keyboard focus. The ratings are a list of the points that have any.
- **A hobby with no `stats` block has no page and no way in.** Its address goes to its board, as
  Discover's does. Turning it on for another hobby is that block in its file, and the comparison
  also needs the pass to record hours and the hobby's `columnHours` words, so films would get
  every panel but that one.

## On a share

**A share that shows Stats shows the owner's page, whole.** Decided at the #9 workshop on 4 October
2026: every finish, and what was dropped counted as a number with no titles, whichever columns the
share shows. So the only thing a share decides about Stats is whether they are on it. The page is
`/share/:token/stats/:year?`, reached by *Stats for 2026 →* on the share's year row, and a share
without Stats sends that address to the share's board, as a hobby with no Stats page sends its own
to its board. What a share is, and why its anonymous routes are safe, are `docs/auth.md`'s, under
**Sharing a board**.

- **`GET /api/shared/{token}/stats?year=` and `…/stats/years`** answer through `ISharedStats`,
  `StatsService`'s second face, which takes its owner from the caller. Every query here starts from
  `Passes(ownerId, hobby)`, so your own page passes `user.Id` and a share passes its token's owner,
  and the backlog comes from `LibraryService.BacklogAsync(ownerId, hobby)` the same way. *Stats on
  a share is the owner's page whichever columns are shown* compares the two answers byte for byte,
  with Stats the only part ticked.
- **The years are the Stats page's own**, as on yours, not the share's board's, which come from
  the columns it shows.
- **It is the board's own `Dashboard` and `StatsHeading`, handed `voice="shared"`.** The phrases
  this page writes to its owner, *of the games you started*, *You and HowLongToBeat*, *in your
  backlog*, *Back to your board* and the rest, the column header's *without your hours* among
  them, each have a second form side by side with the first. The table of all twelve, on the
  board and this page, is in `docs/design.md`, under **Sharing a board**.
- **The note on *added* is the twelfth phrase**, which the workshop's table of eleven missed and
  the renders of the built page found. On a share it reads *"Added" is the day a title went on the
  board…* and *"in the backlog"*, picked on 5 October 2026 over leaving the note off a share.

## Checked by putting each fault back

Every guard was checked by planting its fault, one at a time, against the finished feature. Each
fault turned red exactly the tests named. The share's faults, its Stats among them, are in
`docs/auth.md`, under **Sharing a board**.

**Backend**, `StatsEndpointTests` (28) and the two new `JournalClockTests`:

| Fault planted | Red |
|---|---|
| A dropped pass with a finish date counted as a finish | *only a pass in Completed is a finish* |
| Only each title's latest pass counted, as the board does | the replay case, *finished twice is two finishes*, *both playthroughs' hours* |
| A year's span in UTC | the clock's span test, and both New Year's Eve cases |
| Years read in UTC | the clock's years test, *a year is the one it was evening in* |
| A missing figure added as nought | the two hours cases |
| A finish with no start not counted as started | *a finish with no start counts as started when it finished* |
| A pass in Backlog counted as still going | *a pass in Backlog has not started*, *all years counts every pass that has left the backlog* |
| A Backlog pass's date offering a year | *a date left on a Backlog pass offers no year* |
| The latest Backlog row rather than the latest row | *a title whose last recorded move was elsewhere* |
| The release calendar's titles in the backlog | *the backlog is the column, oldest first* |
| Passes not scoped to you | *somebody else's passes never reach your stats* |
| A film's runtime unrounded | *the length its card prints, for every hobby* |
| Anime's arm left out of the length | the same case |
| A finish named by `media.title` | the same case |
| A backlog title named by `media.title` | *a title in the backlog is named as its card is* |
| The board's years | *the years include one only a replayed finish was in*, and the Backlog-date case |
| No bound on the year | both of *a year with no calendar span is refused* |
| Finishes newest first | *finishes come oldest first* |
| The backlog newest first | *the backlog is the column, oldest first* |

**The one that went red on nothing, the first time**, was *a pass in Backlog counted as still
going*. The completion query filtered Backlog out before counting, *and* the counts left it out,
so taking either away changed nothing and the test could not say which held the rule. The filter
went, and the counts are the rule.

**Frontend**: `stats/stats.test.ts` (20), `stats/StatsPage.test.tsx` (25), one each in
`lib/time.test.ts` and `lib/rating.test.ts`, and three in `board/BoardPage.test.tsx`. End to end,
`e2e/stats.spec.ts` has 3, one of them at 390px.

| Fault planted | Red |
|---|---|
| No completion rate as nought | *is nothing at all when nothing was started*, and the tile's *no completion rate … rather than 0%* |
| The percentage divided in floating point | *is exact where floating point is not*, *rounds a half the same way in both directions* |
| The signed difference rounded rather than its size | the same two |
| "0% longer" rather than *The same* | *calls it the same when it rounds to nought*, *signs the figure a bar is labelled with* |
| Timed games ordered by a floating ratio with no tie-break | *orders by the exact ratio, and by title when two are the same* |
| Months read in UTC | the arithmetic's month case and the page's |
| The month helper in UTC | the time helper's month case, and both of the above |
| The undated filed first under All years | *files every finish under its year here … with the undated last* |
| The unrated counted as nought | *leaves the unrated out*, *is nothing when nothing is rated* |
| A 10 counted with the 9s | *counts the ratings at each whole point* |
| Days waited counted in UTC | *counts the days here, so 11:30pm yesterday is yesterday* |
| "Added" said of a title the history knows | the three `waited` cases and the page's backlog wording |
| Every timed game shown in a busy year | *shows six of each in a busy year* |
| No cap on a month's covers | *stops a month at six covers* |
| The whole history fetched before the latest year | both *opens on the latest year* cases |
| A year control while the years load | the same two |
| A hobby with no Stats page kept on the page | *goes to the board itself for a hobby with no Stats page* |
| The comparison in words of its own | *compares your hours in the words Completed's header uses* |
| The note on "added" always shown | *explains "added" only when a title says it* |
| The way in on every board | *offers no stats on a board whose hobby has no Stats page yet* |
| The way in without the year | both of the board's *offers the stats* cases |

**One fault was planted badly and is worth knowing about.** *The month helper in UTC* was first
written as formatting the instant's UTC date in the journal zone, which happens to give the right
month for an evening at the end of a month — so it turned only one test red. Planted as what it
claims to be, a UTC month, it turns three.

## What the plan got wrong, or left out

- **"Aggregates scoped to the user."** Two are; the rest are facts the client counts. The months
  forced it — the server would have had to ask the journal zone which month an instant is in —
  and once the finishes are on the wire, counting them there too would be the same list in two
  shapes that could disagree.
- **"Use completed passes that have both figures."** Every *finished* pass, which with *every
  playthrough* decided is not the header's set. The two agree on the rules and not on the passes,
  and that is the difference *every playthrough* was chosen for.
- **"Older passes fall back to the pass's `logged_at`."** Right, and it is not a lower bound on
  the wait but the day the title went on your board, which is why it is worded *added*. And the
  arrival is the latest row only if that row is into Backlog, which the plan did not consider.
- **The years.** The plan's endpoint had no years of its own. The board's would have left a year
  whose only finish has been replayed off the page entirely.
- **The year's span on the clock.** `LibraryService.SpanOf` was private; a second caller moved it,
  and the list of years with it, rather than copying either.
- **The year out of range.** `?year=0` would have been a 500 from `DateTime`'s constructor. The
  Stats route is bounded. The board's `?year=` is not, and has the same hole — measured by taking
  the attribute off this route, which answered 500 for both. Noted in `docs/board.md` rather than
  fixed here.
