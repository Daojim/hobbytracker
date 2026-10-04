# The games board, before the other hobbies

Written 1 October 2026 at the user's request. A feature is built on the **games board first** and
taken to the other hobbies afterwards. The ten below are planned so a session can pick up **any
one, in any order**, when the user names it. CLAUDE.md's **What is next** points here.

**This file lives in the repo.** It began in `~/.claude/plans/`, which Claude Code sweeps after 30
days; the hosting plan was lost from there, so this one moved on 1 October 2026. See **The plan
archive** in CLAUDE.md.

Each section is a plan unless it says it shipped. **Decide at pickup** marks the user's choices,
with a recommendation that is not yet a decision. `file:line` references drift, so search for the
named symbol if a line has moved. Lines were read at `162db83` unless a section says otherwise.

## Where things stand

| # | Feature | Size | Status |
|---|---|---|---|
| 1 | A board that works on a phone | S + M | **Shipped and deployed 1 October 2026** (PRs #41 and #42). **The manifest and the icon followed on 2 October 2026** (PR #48), deployed the same day. **Installed on the user's Android phone, and reported working, on 4 October 2026.** Nothing left |
| 2 | Record when a title changes column | M | **Shipped and deployed 1 October 2026** (PR #44). See its section |
| 3 | Hours in the column headers | S–M | **Shipped and deployed 1 October 2026** (PR #46), games only. See its section |
| 4 | "How long will it take me?" | S–M | **Shipped and deployed 2 October 2026** (PR #50), after a workshop the same day. See its section |
| 5 | Stats | M–L | **Shipped 2 October 2026 and deployed on the 3rd** (PR #52), after a workshop the same day. See its section |
| 6 | Search your notes | S–M | Planned |
| 7 | Export the board to a spreadsheet | S–M | **Shipped and deployed 4 October 2026** (PR #61), the day it was workshopped: a three-sheet workbook from a row in Settings. See its section |
| 8 | Delete my account | S–M | **Shipped and deployed 4 October 2026** (PR #63), the day it was workshopped: a tinted warning in Settings that asks for the word *delete*, and a session check that signs every other device out. See its section |
| 9 | A read-only share link | M | Planned. Gained a phone question; see its section |
| 10 | `/` focuses the search box | S | **Shipped and deployed 4 October 2026** (PR #58). See its section |

Production runs `c28548c`'s code, which was `main` on 4 October 2026. Everything merged since is
docs. Deploying is the runbook in `docs/deploy.md`.

## Suggested order (any order works)

- **#2 early.** History that isn't recorded can't be backfilled, and #5 reads it. Every day it
  waits is history lost. **Shipped 1 October 2026.**
- **#3 before #4's backlog mode and before #5.** Both reuse #3's server-side totals. **Shipped
  1 October 2026.**
- **#7 and #8 together.** They share a *Your data* group in Settings, so workshop them at the same
  time. **#7 was workshopped alone on 4 October 2026**, with #8's row drawn into the group as a
  placeholder, so the group's layout is settled and #8's own choices are not. **#7 was built and
  deployed the same day. #8 was workshopped, built and deployed later that day**, into the row #7
  drew.
- **#10 is the smallest** if a quick one is wanted. **Shipped 4 October 2026.**
- **The rest of #1, the manifest and the icon, whenever.** It is a workshop first, then a small
  build. **Built on 2 October 2026, and checked on an Android phone on 4 October.**

## Rules every plan below follows

- Read the `docs/` file that CLAUDE.md's map names before touching the code it covers.
- **Write the failing test first and show it red.** Where a rule exists to prevent something, check
  its test by putting the fault back.
- **Anything decided by eye gets rendered options and a pick before any value goes into code.** See
  the memory *Workshop visual choices before building*. **How #1's was run** is in #1 below, and it
  is the pattern to reuse.
- **Never branch on the hobby slug.** Games-only behaviour follows the data — `TitleDetail.hltb`,
  `PassFields.hoursPlayed` — so each feature extends to the other hobbies later with no new
  conditions.
- `data-model.md` counts four places the journal time zone is applied. A feature that adds a fifth
  updates that sentence.
- Columns are paged at 100 titles. Anything that needs a whole column aggregates on the server or
  pages to the end. Never compute it from one page.
- **The board has two layouts now.** Below Tailwind's `md` it is one column at a time under a
  switcher pinned to the top (`SIDE_BY_SIDE` in `board/grid.ts`, read through
  `lib/useMediaQuery.ts`). A column that is not shown is not mounted. **Anything that adds to the
  board, a column header or a new page says where it goes at 390px**, and renders it there in its
  workshop. See `docs/design.md`, *On a phone*.
- **Phone tests.**
  - In Vitest, use `windowOfWidth(390)` from `src/test/media.ts`. jsdom has no `matchMedia`, so a
    test without it is quietly a desktop test.
  - In Playwright, use the *on a phone* block in `board.spec.ts` (390×844, `hasTouch`,
    `isMobile`), with `holdAndDrag`, `swipeUp` and `segment()` from `e2e/support/board.ts`.
  - **Never `Input.synthesizeScrollGesture`**: headless Chromium accepts it and moves nothing.
  - **Ask about installing with `channel: 'chromium'`.** Playwright's default headless shell
    has none of Chrome's install machinery, and `Page.getInstallabilityErrors` answers nothing
    there whatever the manifest says. See `e2e/install.spec.ts`.
- **A column's request is `columnQuery` in `Column.tsx`.** Anything else that needs a column's
  answer shares it — the switcher's counts already do — rather than asking again under another key.
- **A new drop target goes through `boardCollisions`** (`board/collisions.ts`). If it is pinned, or
  does not otherwise scroll with the page, it has to be measured live as the switcher's segments
  are. dnd-kit moves every target it measured by however far the page scrolls. See
  `docs/board.md`, *Carrying a card onto the phone's switcher*.
- **Deploying** follows `docs/deploy.md`. A request to deploy is not a request to merge.

---

## 1. A board that works on a phone · shipped, and the icon built

**Shipped and deployed on 1 October 2026.** The user reported everything working afterwards.

- **Part A, PR #41: a swipe that starts on a card scrolls the page.** A mouse drags from 8px as
  before. A finger holds still for 250ms to pick a card up. Write-up: `docs/board.md`, *A finger on
  a card*.
- **Part B, PR #42: one column at a time under a pinned, segmented switcher** that counts every
  column and takes a dropped card. It was picked from four layouts rendered at 390px. Write-ups:
  `docs/design.md`, *On a phone*, and `docs/board.md`, *Carrying a card onto the phone's
  switcher*.

**What the original plan got wrong.** Kept here because a session reading an old copy should know:

- It drove a swipe with `Input.synthesizeScrollGesture`, which headless Chromium ignores. That test
  would have been red before the fix and after it.
- It missed that the card's corner, open menu and remove confirm stopped `pointerdown` alone. A
  finger held on `⋯` would have dragged the card while the jsdom spy, also on `pointerdown`, stayed
  green.
- It treated the switcher's segments as a simple option. Building them took two fixes:
  - segments are measured live, because dnd-kit moves droppables with the page scroll;
  - autoscroll stops while a card is over one.

  Both were found by measuring in a browser.

### The web manifest and the home-screen icon · built 2 October 2026

**Shipped and deployed on 2 October 2026** (PR #48). Production serves the manifest as
`application/manifest+json` and every icon as what it says, through the tunnel, and
`icon-512.png` arrives as a real 512px PNG rather than the page. No migration and no new
variable. Write-ups:
`docs/design.md`, *The icon, and the bar above the page*, and `docs/deploy.md` for what Caddy
serves.

**Decided at the workshop, from renders.** The page is private:
https://claude.ai/artifact/3qjCooCBbvsFa7QiqcNctF.
- **The icon is Covers, on warm paper**: two pieces of box art, the front one ticked off, on Shelf
  Light's ground. Four drawings were rendered on four grounds. The user picked Covers over the
  recommended Shelf, and took the recommended paper. *Redrawn on 3 October 2026 as a journal with
  the hobbies stuck on its cover, on the same paper. See `design.md`.*
- **The bar above the page follows the theme**, as recommended. Each theme's bar is its ground.
- **The user's phone is Android**, which decides the checks below.

**Built.**
- `frontend/icons/`: `icon.svg` and `icon-maskable.svg`, and `render.mjs`. `npm run icons` runs it
  to draw the PNGs and the `.ico` into `public/` with Playwright's Chromium.
- `frontend/public/`: `manifest.webmanifest`, `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`,
  `icon-192.png`, `icon-512.png` and `icon-maskable-512.png`.
- `index.html`: the four links, System's two `theme-color` tags, and the pre-paint script writing
  a chosen theme's tag ahead of them. `applyTheme` rewrites that tag when the theme changes.
- The manifest says `display: "standalone"` and `start_url: "/board"`, with `scope` and `id`
  both `/`.

**Tests.** `src/manifest.test.ts` has 9 and `theme.test.ts` gained 3. `e2e/install.spec.ts` has 2
and `theme.spec.ts` gained 2. Each guard was checked by planting its fault:

| Fault planted | Red |
|---|---|
| Ember's ground changed in `index.css` alone | *gives the bar above the page each theme's ground* |
| `applyTheme` no longer moves the bar | *moves the bar when a theme is chosen* |
| The pre-paint script no longer writes the bar | *the bar above the page follows the chosen theme, before the bundle too*, at the reload |
| `icon-512.png` deleted | *names icons that are PNGs of the size it says* |
| The plain 512px icon left out of the manifest | *names plain icons at 192px and 512px*. Chrome itself does not mind |
| `display: "browser"` | *Chrome reads the manifest*, with `manifest-display-not-supported` |
| Only the maskable icon | *Chrome reads the manifest*, with `manifest-missing-suitable-icon` |

**What the plan got wrong, or left out:**
- **"Pick one colour or have the pre-paint script set it."** The script covers a load, not a theme
  chosen after one, so `applyTheme` moves the bar too. System is two fixed tags with media queries
  rather than script, so it follows the device's scheme as that changes.
- **"If it breaks, `display: "minimal-ui"` is the fallback"** no longer holds on an iPhone. iOS 26
  opens every site added to the Home Screen as a web app, with or without a manifest, and leaves
  that to the person adding it. That is in WebKit's notes for Safari 26.0. The fallback still holds
  on Android.
- **`theme_color` on an iPhone.** Several developers report that Safari 26 ignores the tag. What
  would follow the theme there is painting the root with `--sunken`, which is not built. See
  `design.md`.
- **"An e2e test that the manifest parses"** needed full Chromium, because the headless shell
  answers installability with nothing. See the rule under *Phone tests*.
- **"Check Caddy's caching."** Nothing to change. The manifest and the icons already get
  `no-cache`, so a phone picks up a changed icon on its next request. That and the content types
  were measured with the production image before deploying, not only after. *True of Caddy and
  not of the public origin, measured when the journal icon was deployed on 3 October 2026:
  Cloudflare serves the icons with four hours. See `deploy.md`.*

**Done on 4 October 2026.** The user installed it on their Android phone and reported it working.
These are the checks they were given:
1. Install it from Chrome's menu. The launcher crops the icon to its shape without cutting into
   the drawing.
2. Open it from the icon. The splash is paper with the icon on it.
3. The status bar is the theme's ground, and changes when the theme does in Settings.
4. Open a title's journal and press Back. The journal closes, and the app stays open.
5. Sign out, then sign in with Google from the installed app, and again with Discord. Each lands
   on the board, signed in, inside the app's own window. If it does not, `display: "minimal-ui"`
   is the fallback on Android.

**For other people's iPhones**, signing in from the home screen is the thing to try. It can be
tried on the live site already, because iOS 26 opens anything added to the Home Screen as a web
app.

### How the workshop was run, to reuse

1. **The real components, behind a throwaway query switch** (`?phone=a|b|c|d`) read in
   `BoardPage`. **`/board` redirects and drops the query**, so shots go to `/board/games?…`.
2. **A throwaway Playwright spec**, `e2e/zz-shots.spec.ts`, never committed. It seeds a realistic
   board through the API and writes PNGs into the session scratchpad: the first screen, the whole
   page, and a second state per option (a tab chosen, scrolled, swiped, unfolded). A full-page
   shot in mobile emulation came out at the wrong width for a sideways-scrolling strip; use the
   first screen there.
3. **One private Artifact page**, with phone-sized frames that scroll like a screen, notes per
   option, and the recommendation at the top. It was republished with an *As built* section
   afterwards: https://claude.ai/artifact/RaXdQnpkcQPt7bXSbrmT9w.
4. **The prototype saved as a patch in the scratchpad and reverted** before any test was written,
   so nothing of it reached a commit.

**For something drawn rather than laid out, as the icon was**, there were no components to put
behind a switch. The drawings were written as SVG by a script in the scratchpad, from the app's
own palettes. A contact sheet was rendered and looked at before anything was shown, and two of the
first four drawings were redrawn and one replaced on the strength of it. The drawings then went
live onto one private Artifact page: the matrix of drawings and grounds, home screens, Android's
masks, true 16px rasters on a canvas, and a ground switch over all of it. The final SVGs in
`frontend/icons/` were written out by hand from the picked drawing.

---

## 2. Record when a title changes column · shipped

**Shipped and deployed on 1 October 2026** (PR #44). Production applied the migration on start and
had no rows until the first move after it. Write-ups: `docs/data-model.md`, *A pass's history*,
and `docs/board.md`, *Board semantics*.

- **`status_changes`**: `from_status` → `to_status` at `changed_at`, one row each time a pass
  arrives in a column. `from_status` is null when the pass was made. Rows cascade with their pass,
  so *Remove from board* and a deleted account take them too.
- **One `SaveChangesInterceptor`, `StatusHistoryRecorder`**, as recommended. Its comment says why
  this is the opposite of `auth.md`'s trade. It records a pass whose `Status` differs from what was
  loaded, not just any pass that changed: the drawer's autosave and a reorder both save passes that
  did not change column.
- **Shuffles merge when written, inside a ten-minute `SettleWindow`.** The user chose this on 1
  October 2026, over keeping raw rows or a two-minute window. A round trip deletes the row, and only
  the pass's latest row is ever folded.
- **No backfill.**

**Tests.** `Endpoints/StatusHistoryTests.cs` has 14, and `Data/SchemaTests.cs` has 3 more. All go
through the API except the account cascade, which has no route until #8. Each guard was checked by
planting its fault, and each fault turned red exactly the tests that name it:

| Fault planted | Red |
|---|---|
| No interceptor | 12 |
| A recorder that fires on any change to a pass | the two *records nothing* cases |
| No fold | 4 |
| No round-trip delete | 2 |
| A restricting foreign key | the 3 cascades |

**What the plan got wrong, or left out:**

- **The ship date.** The plan had readers treat a missing history as "unknown before <ship date>".
  No global date is needed. Every pass made since recording began has exactly one made-row, and a
  fold cannot delete it, so a pass without one predates recording. `data-model.md` still records the
  date, for people.
- **The reorder.** The plan listed a `PUT` that keeps the same status, but not its twin: a reorder
  saves every card in a column and moves none of them. Both are tested now.
  `ck_status_changes_is_a_change`, which the plan didn't have, makes a recorder that gets this wrong
  fail as a 500 instead of storing *Playing to Playing*.
- **The e2e reset.** Its truncate list says it is an honest inventory, but it hadn't named `anime`
  since that table arrived. It now names `anime` and `status_changes`.

**For #5, which reads this first:**

- *When did this title leave Completed?* That is the replay's made-row. The finished pass gets no
  row.
- A fold moves a made-row's `changed_at` to where the pass settled, so the time a pass was *made* is
  still `logged_at`.
- Scope through `log_entries.user_id`, as `NoteService` does.

---

## 3. Hours in the column headers · shipped

**Shipped and deployed on 1 October 2026** (PR #46), on the games board only. Production serves
the bundle carrying the header's wording, with no migration and no new variable. Write-ups:
`docs/board.md`, *Hours in the column headers*, for what the line says and how it is added up,
and `docs/design.md`, under the same name, for where it sits.

**What the user asked for**, kept because everything below answers it: every column shows the
total of HowLongToBeat's All Styles figure, Completed instead shows your logged hours against it,
and Playing could show what's left.

**Decided at the workshop, from renders.** The workshop page is private:
https://claude.ai/artifact/ScUneftqX567UHqNQehWwZ.
- **A muted line of its own under each heading.** The two placements in the heading's row
  wrapped every column's sort control, even at 1440.
- **On a phone, the same line beside the sort control**, where the hidden heading was, rather than
  under each segment's count.
- **Playing says *to beat*, like every other column.** What's left was rendered beside it,
  `~66 h left of ~119 h to beat`, and not chosen.
- **Games only for now.** The wording proposed for the other three is under *Noted for the other
  hobbies* below.
- The comparison counts only titles that have both figures, as recommended:
  `90 h played vs ~94 h to beat · over 7 games · 2 without your hours`.

**Built.**
- `GET /api/library` answers with `LibraryPage`, which extends `PagedResult` with `ColumnHours`,
  added up over the whole filtered column. On the column's response rather than a route of its
  own, as recommended.
- `HobbyDefinition.columnHours` holds the words, and is `null` for films, TV and anime.
  `board/columnHours.ts` decides what each column says.

**Tests.** `Endpoints/ColumnHoursTests.cs` has 10. On the frontend, `columnHours.test.ts` has 11,
`hours.test.ts` 3 more, `Column.test.tsx` 3 and `BoardPage.test.tsx` 1, and `hltb.spec.ts` has one
end to end. Fourteen faults were put back one at a time, each turning red the tests that name it.
The table is in `docs/board.md`.

**What the plan got wrong, or left out:**

- **"Formatted with the hobby's `formatLength`."** That is two decimal places, right for one title
  and wrong for a column: `~1034.47 h`. Totals have a formatter of their own, `totalHours`: whole
  hours with the thousands marked, and a tenth under ten so a short Playing column does not read
  `~0 h`.
- **"Show the totals in the `<h2>`."** The heading names the column's region, so the hours sit
  outside it.
- **The fourth copy.** The plan offered a shared expression or a test pinning the copies. It is the
  test, because a shared expression saves one copy of four and needs expression plumbing the
  projections still could not use. What the plan did not say is that **the copy has to round each
  title as the projections do**, or the total drifts from the cards by a fraction of a minute a
  title. The test's runtimes are chosen to catch that.
- **The optimistic move.** Not in the plan. The count moves at once and the hours wait for the
  refetch, because a card carries its length and not your hours.
- **The segments' accessible name.** Hours under a segment's count change its name to
  "Backlog 17~1,034 h", and `segment()` in `e2e/support/board.ts` matches on that name. One more
  reason that option lost.
- **"Without your hours" counts titles that have an estimate and none of your hours.** A title
  with no estimate is counted as that instead, so the two counts never overlap.
- **The spoken comparison first said "21 hours played"**, and the e2e suite caught it:
  `getByLabel('Hours played')` matches an `aria-label` by substring, and found the header behind
  the drawer instead of the drawer's input. It says "You played 21 hours" now. See `design.md`.

**For #4 and #5, which read this:**

- The Backlog total is `hours.length` on the Backlog column's answer, over every title in it, with
  the calendar's left out. #4's whole-backlog mode can read it from there.
- The counting rules live in `LibraryService.HoursOfAsync`: a missing figure is counted, never
  added as nought, and a comparison is over the titles that have both.

---

## 4. "How long will it take me?" · built

**Shipped and deployed on 2 October 2026** (PR #50), after a workshop the same day. Production
serves a new bundle carrying the quiz's words, each counted 0 in the old one, with no migration
and no new variable. The API was recreated anyway, on new .NET base images, as `docs/deploy.md`
says can happen. Write-ups: `docs/journal.md`, *How long will it take me?*, for the drawer; `docs/board.md`, under
*Hours in the column headers* and the card menu, for the board; and `docs/design.md`, under the
same name, for the look.

**What the user asked for**, kept because everything below answers it: say how much you play a
day or a week and which play style, and the app says how many days that takes and roughly when
you'd finish, counting from the hours already played. And anything similar: the reverse, "to
finish by Nov 15, play about 1.2 h a day", and the whole backlog, "~1,300 h of backlog at 10 h a
week is about 2.5 years".

**Decided at the workshop, from renders.** The workshop page is private:
https://claude.ai/artifact/N51sC3ibyABT34ErMf6Vk1.
- **The quiz, the user's own idea, over the recommendation.** A link under the estimates, *How
  long will it take me?*, asks *How much do you play?* (five quick picks, or *Other…*) and *How
  will you play it?* (*Just the story*, *The story and some extras*, *Everything*, *However it
  goes*, each beside its tier and figure). Then it answers: *7 more days — you'd finish around
  Oct 9.* It is remembered per board and per browser, so the next game is one press to its
  answer. A card's `⋯` menu opens it too, as *How long for me?*. The recommendation was every tier
  answering with its own date under its chip, after asking the pace once. The plan's inline
  calculator, a sentence of controls always under the estimates, was the third option rendered.
- **The whole backlog is a second line under Backlog's hours**, as recommended: `about 17 months
  at 2 h a day`, once a pace is known.
- ***Finish by a date instead* stays**, as recommended. It turns the answer around: *To finish by
  [date], play about 18 min a day.*
- **Backlog, Playing and On Hold show it**, as recommended. A Completed or Dropped pass has nothing
  left to finish.
- **Two small departures from the renders**, both when you are past the estimate: the line under
  the answer leaves the pace out, and there is no *Finish by a date instead*, because there is
  nothing left to finish.

**Built.**
- `lib/pace.ts`: the pace, the arithmetic and the words. It covers hours left, days to finish,
  hours needed by a date, spans (`7 more days`, `about 17 months`), and the per-board store under
  `hobbytracker.pace.<hobby>`.
- `lib/preferenceStore.ts`: the `useSyncExternalStore` store that lived inside
  `board/hiddenColumns.ts`, moved out when the pace became a second preference two components
  share. Hidden columns use it with no change in behaviour, and their tests pass as before.
- `lib/release.ts` gained `addDays`, and `formatDayShort`, which writes `Oct 9` and adds the year
  only when it is not this one.
- `journal/HowLong.tsx` is the quiz, rendered by `EntryForm` under the estimates. The tiers from
  `hltbTiers` gained a `key`, the field each figure comes from, which is what the quiz remembers
  as your play style.
- `board/columnHours.ts` takes the pace, and `Column` reads it from the store. `Card`'s menu
  offers *How long for me?*. `BoardPage` tells the drawer which door it came through on every
  opening.

**Tests.** `lib/pace.test.ts` has 36 and `HowLong.test.tsx` 18. `release.test.ts` gained 7,
`EntryDrawer.test.tsx` 10, `Card.test.tsx` 7, `columnHours.test.ts` 7, `BoardPage.test.tsx` 2,
`Column.test.tsx` 1 and `fields.test.ts` 1, and two of `fields.test.ts`'s were updated for the
key. `e2e/how-long.spec.ts` has 2. Every guard was checked by planting its fault, and each fault
turned red exactly the tests that name it:

| Fault planted | Red |
|---|---|
| Days divided in floating point | *is exact where floating point is not* |
| Hours left subtracted in floating point | *is exact to the hundredth an hour is stored at* |
| Months without the floor of two | *counts months once days stop meaning anything, and never one of them* |
| A stored pace trusted | *trusts nothing it cannot read as a pace* |
| `addDays` built from `new Date(day)` and read in the journal zone | all four `addDays` cases |
| `addDays` in local time | *lands on the right day across the clock change on 1 November* |
| The year on every finish date | `formatDayShort`'s two, and five of the quiz's answers |
| No page copy when storage refuses | the refusal cases of the pace store, the quiz and the hidden columns |
| The pace read once rather than subscribed to | the column's *hears a new one*, and the store's two |
| Asked on every pass | *does not ask on a Completed pass*, and on a Dropped one |
| The question's changes reaching the pass's form | *leaves Saved alone while you answer it* |
| Focus left where the pressed button was | *keeps the keyboard in the question* |
| Another style guessed for a game without yours | *offers only the ways to play that this game has a figure for* |
| *More* on a game not begun | *counts a game not begun from the start* |
| Nought days rather than past it | *says you are past it* |
| Counted from today rather than tomorrow | six of the quiz's answers |
| The drawer not passing the card's question on | *opens at the question when the card asked how long* |
| The menu item without the pass's hours | *does not ask how long about a film* |
| The menu item without an estimate | *does not ask how long about a game with no estimate* |
| The menu item on every column | the Completed and Dropped cases |
| The menu item opening the journal shut | the card's case and both of `BoardPage`'s |
| The pace line on every column | *is Backlog's alone* |
| The question left open for the next title | *opens the journal shut on the question from the title* |
| The column not handing the pace on | the column's *hears a new one* |

**What the plan got wrong, or left out:**

- **"Pure functions in `journal/pace.ts`."** They are in `lib/pace.ts`. The Backlog line reads
  the pace too, and `board/` should not reach into `journal/`, which is `lib/hours.ts`'s reason.
- **"Remember the pace per browser."** Per board as well, as hidden columns are, because an
  evening of anime is not an evening of games. The play style is remembered with it, which the
  plan did not mention and the quiz needs.
- **"Through `lib/storage.ts`."** Through a store, because the pace is given in the drawer over
  the board and the Backlog line has to hear it then. That store already existed inside
  `hiddenColumns.ts`, and it is shared now rather than copied.
- **The arithmetic.** `⌈remaining ÷ hours per day⌉` is right, but not in floating point: 2.1 ÷ 0.7
  is 3.0000000000000004 there, which rounds up to a fourth day nobody needs. It is done in
  hundredths of an hour, the unit both figures are stored in.
- **"`todayHere()` plus that many days"** means days count from tomorrow, which the workshop page
  said out loud. 2 h left at 2 h a day finishes tomorrow, and the answer never promises a day
  early.
- **The pass's form hears the question.** The quiz sits inside `EntryForm`, whose one `onChange`
  takes "Saved" away when anything inside it changes. The quiz stops its own changes there.
- **Focus.** Each answer takes the button that gave it off the screen, and focus fell to the
  board behind the drawer. The question takes the keyboard as it moves on.
- **A play style this game has no figure for.** When the style you gave last time has no figure
  here, the quiz asks the style again rather than guessing another tier.
- **The ladder of spans.** Days, then months, then years is the release calendar's, which says
  "in 1 months" at exactly 45 days. Here months start at two, and years go to the half.
- **The space in a button's accessible name.** The style buttons were first written with the
  switcher's `{' '}` between their halves. Measured, it is not needed: see *On a phone* in
  `docs/design.md`.

---

## 5. Stats · shipped

**Shipped on 2 October 2026 and deployed just after midnight on the 3rd** (PR #52). No
migration and no new variable. Both images were rebuilt and recreated, the API first, and the
public site serves a new bundle carrying the page's words, each counted 0 in the one before it.
Both new routes answered 404 before the deploy and 401 after it, without a session. The write-up is
`docs/stats.md`, a new area file: what each number means, why the page counts playthroughs, the
two routes, and every fault planted. The look is `docs/design.md`, **Stats**. The workshop page
is private: https://claude.ai/artifact/Cb1T1pYGFvdi35ULXn3Pq2.

**What the user asked for**, kept because everything below answers it: "X was added to your
backlog Y days ago", the user's completion time against HowLongToBeat, and completion rate — and
was open to more.

**Decided before the renders**, with the user, all four as recommended:
- **Where:** a page under the board, `/board/:hobby/stats/:year`. Settled **Scope** changed with it.
- **What:** the three asks, plus finished per month and ratings. Genres and platforms, the
  oldest in Playing and the backlog at your pace were offered and not taken.
- **Completion rate:** of the passes started in the year, the share finished, beside finished,
  still going and dropped. A finish with no start counts as started when it finished.
- **Counting:** every playthrough, so a year's numbers never change because of a later replay.
  The Completed column can then show a different count, because it shows each title once.

**Decided at the workshop, from renders**, all eight as recommended:
- **A dashboard**: four tiles (finished, completion, against HowLongToBeat, rating), then
  panels two across in the board's wells. The report layout, one centred sheet, was 1,937px tall
  at 1440 against the dashboard's 1,140px.
- **Completion is a bar**: finished in the accent, still going a lighter step of it, dropped
  apart, with a legend in words. It sits inside its tile.
- **Finished each month is covers**, a stack per month, capped at six with "+N". On a phone, a
  row per month.
- **Against HowLongToBeat is a bar per timed game either side of the estimate**, sorted, so the
  quickest and slowest are the two ends. Six of each in a busy year, with Show all.
- **Ratings are a column per whole point, 1 to 10**, in the tones a card's rating wears.
- **The backlog is a list, oldest first**: six, then Show all. "In your backlog N days" when the
  history knows when a title last arrived there, "added N days ago" when it does not.
- **No age on Backlog cards, for now.** It added a line to every card at desktop widths.
- **The way in is "Stats for 2026 →" on the year's row** of the board, carrying the year.

**One departure from the renders:** the months still to come are not dimmed. The renders faded
them with an opacity, which takes `text-muted` under 4.5:1. See `docs/design.md`.

**Built.**
- `GET /api/stats` and `GET /api/stats/years`, in `StatsService` and `StatsController`. The
  backlog is `LibraryService.BacklogAsync`, through the board's own query.
- `IJournalClock.SpanOf` and `YearsOf`, moved out of `LibraryService`, and `HoursTally`, moved
  out of `HoursOfAsync` — each now one method called from two routes.
- `frontend/src/stats/`: the page, its four panels, and `stats.ts`, the arithmetic, done in
  hundredths. `HobbyDefinition.stats` holds the words, games only. `journalMonth` in
  `lib/time.ts` and `ratingFill` in `lib/rating.ts`.

**Tests.** `StatsEndpointTests` has 28 and `JournalClockTests` gained 2; the frontend gained 50,
across `stats.test.ts`, `StatsPage.test.tsx`, `time.test.ts`, `rating.test.ts` and
`BoardPage.test.tsx`; `e2e/stats.spec.ts` has 3. Forty faults were planted one at a time, nineteen
behind the API and twenty-one in front of it, and the tables are in `docs/stats.md`. One went red on
nothing the first time — a guard written twice — and one was planted badly; both are written up
there.

**What the plan got wrong, or left out** is in `docs/stats.md` under the same heading: the
aggregates that became facts, the years the page needed of its own, and a year out of range.

---

## 6. Search your notes · S–M

**What.** Find the note where the user wrote about that boss fight, and open that title's journal.

### Backend

**Route:** `GET /api/notes/search?q=&hobby=` on `NotesController`. Its routes are `notes/{id:int}`,
so `notes/search` doesn't collide.

**`NoteService.SearchAsync`:**
- Scoped through `n.LogEntry.UserId`, like every query there.
- Newest first, capped at 50.
- Returns the title, media id, `writtenAt` and the body.

**Use `ILIKE`, not full-text search.**
- Escape `%`, `_` and `\`.
- `sendOnEnter` already handles IME composition because notes get written in Japanese and Korean.
  Postgres's `english` configuration would mangle that text, and no configuration splits Japanese
  into words.
- At this scale no index is needed. `pg_trgm` is the upgrade if one ever is.

**Decide at pickup (workshop):**
- a *Titles | My notes* switch on the search bar, or a box of its own
- client-side highlighting of the match
- a result opens the drawer through the board's existing `openJournal`

### Tests first

- Another user's note never matches.
- `50%` matches literally.
- Matching is case-insensitive.
- A Japanese substring matches.
- An empty `q` returns 400.

---

## 7. Export the board to a spreadsheet · shipped

**Shipped and deployed on 4 October 2026** (PR #61), the day it was workshopped. No migration and
no new variable. Both images were rebuilt and recreated, the API first. The public site serves a
new bundle carrying the row's words, each counted 0 in the one before it, and the route answers
401 without a session where it answered 405. The write-up is `docs/export.md`, a new area file:
the route, the three sheets, the traps, and every fault planted. The look is `docs/design.md`, **Your data**. The workshop page is private:
https://claude.ai/artifact/DGc5UdVXGsyeDNBgbSsxSU. Every choice there was the recommendation except
one, which is marked.

**What the workshop changed.** This section recommended CSV, one row per title, with extra files
for passes and notes as an option. The workshop made it a workbook of three sheets. The export
sits beside *Delete my account*, and one row per title would keep the latest note and lose every
other one. XLSX carries three tables in one file, and its cells are typed, so the CSV traps this
section used to list (the byte-order mark, formula injection) no longer arise.

### Decided before the renders

- **What it holds:** three sheets. Games has one row per title, as the board shows it.
  Playthroughs has one row per pass, and Notes one row per note. Column history from
  `status_changes` was offered as a fourth sheet and not taken.
- **Format:** an Excel workbook, `.xlsx`.
- **Which titles:** everything on the board. That is every year, every column including any taken
  off in Settings, and the calendar's unreleased titles. The year control and Settings decide what
  you see, not what you have.

### Decided from the renders

- **The button is a row in a *Your data* group after Columns**, the same as every other row in
  the panel. It shows a download glyph and *Download a spreadsheet*, with *Every game, playthrough
  and note on this board, as an Excel file.* under it in `text-muted`. While it works the row is
  disabled and reads *Preparing…*. If it fails, the line under it becomes `role="alert"` in
  `text-danger`: *Couldn't make the spreadsheet. Try again.* A bordered button and a row showing
  the file name were rendered and not chosen. At 224px the file name was cut to
  `hobbytracker-games-2…`.
- **Dates are ISO**: `yyyy-mm-dd`, and `yyyy-mm-dd hh:mm` for a note's time. They are real date
  cells either way. ISO lines up and is narrower. The app's own `Oct 4, 2026` was rendered beside
  it.
- **Every optional column goes on the Games sheet.** Latest note and Added were recommended. **All
  genres and the HowLongToBeat link were added by the user, over the recommendation.**
- **The link is a plain address**, `https://howlongtobeat.com/game/<hltb_id>`, written as text.
  That was chosen over a `HYPERLINK` formula, and over a real hyperlink written by a custom writer
  feature. The file holds no formulas at all.
- **The writer is write-excel-file** (4.1.1, MIT, one dependency: fflate), loaded with a dynamic
  `import()` when the row is pressed. It measured 20 KB gzipped, and 19.70 kB in the build. The
  alternatives were our own writer on fflate (4 KB, plus about 150 lines to own) and ExcelJS
  (4.4.0, nine dependencies, last released October 2023, 252 KB).
- **#8's row is drawn below the export** as a placeholder, in the card menu's tinted style
  (`bg-danger/10`), so the group is laid out once. #8's own choices are still open.

**Measured at the workshop, and again in the built panel.** At 1440×900 the group's heading
starts 744px down, so the export row is on the first screen. The workshop's panel was 902px tall
with #8's row; the built one is 870px without it. On a 390×844 phone the export row is the last
thing on the first screen, and the page scrolls to the rest. The pinned switcher stays behind the
panel.

### Built

- **`GET /api/library/export?hobby=`**, in `LibraryService.ExportAsync`: every title through the
  board's own query with no column and no year named, in the board's manual order, and every pass
  of yours against them with its notes, newest first. `ExportTitleDto` carries the catalogue's
  facts; a pass is `LogEntryDto`, the journal's own shape.
- **`frontend/src/export/`**: `sheets.ts`, the three sheets as a pure function of the API's answer,
  and `download.ts`, which loads the writer when the row is pressed. `HobbyDefinition.export` holds
  the words: what the file holds, the sheets' names, and the noun numbering a title's passes. It
  is null for films, TV and anime.
- **The *Your data* group in `SettingsMenu`**: the row, *Preparing…*, and the failure line.
- **`lib/time.ts` gained `journalMinute`**, the day and the minute here, beside
  `journalDateInput`. **`journal/fields.ts` gained `HLTB_TIER_LABELS` and `hltbGameUrl`**, which
  the drawer's estimates and *View on HowLongToBeat* now read too.
- **write-excel-file 4.1.1 is a dependency**, in a chunk of its own. **read-excel-file 9.3.10 is
  a devDependency**, so the e2e spec can read the downloaded file back.
- **#8's row is not built**, as asked. Until it is, the group holds the export alone. It was built
  later the same day; see #8.

### Tests

`LibraryExportTests` has 11. On the frontend, `export/sheets.test.ts` has 16,
`SettingsMenu.test.tsx` gained 6 and `lib/time.test.ts` 2, and `e2e/export.spec.ts` has 2, both
reading the file the browser downloaded. Every test was red first: the backend on a route that did
not exist, the frontend on a module that did not, and the e2e specs against `main`'s Settings
panel. Then forty-five faults were planted one at a time — fifteen behind the API, twenty-six in
front of it and four end to end — and each turned red exactly the tests that name it. The three
tables are in `docs/export.md`.

### What the plan got wrong, or left out

In full in `docs/export.md`, under the same heading. In short:

- **The zone's count stays four.** The plan said it would be updated for a fifth place. The export
  applies the zone in `lib/time.ts`, which is the UI's place, as the Stats page's months do.
- **"The row is disabled"** is `aria-disabled`, not the `disabled` attribute, which in a real
  browser takes focus off the row and leaves the keyboard at the top of the page. Planting
  `disabled` turns an e2e case red.
- **The tier names come from `HLTB_TIER_LABELS`, not `hltbTiers`**, which drops the figures
  nobody has submitted and leads with All play styles.
- **The columns follow the hobby**: hours and platform where `PassFields` has them, and
  HowLongToBeat's where `setHltbId` is set, so the next hobby's block brings no game's columns.
- **The writer's worker starts only past 160,000 bytes**; smaller parts are deflated in place.
- **The order of a title's passes is an eighth site.** The plan did not count it, and counting
  found that CLAUDE.md's six had left out `HltbService.DetailAsync`.

---

## 8. Delete my account · built

**Shipped and deployed on 4 October 2026** (PR #63), the day it was workshopped. No migration and
no new variable: the cascades it rests on have been in the schema since `user_id` became
`NOT NULL`. Both images were rebuilt and recreated, the API first, and no base image had moved.
The public site serves a new bundle carrying the warning's and the card's words, each counted 0
in the one before it, and a stylesheet carrying the root's ground. `GET` and `DELETE
/api/account` answer 401 without a session, where they answered 404. The write-up is `docs/auth.md`, **Deleting an account**: the routes, the cascade, the
session check, and every fault planted. The look is `docs/design.md`, **Deleting your account**,
and the page's ground is **The page's ground** beside it. The workshop page is private:
https://claude.ai/artifact/8XuDTEL1gehXenA1CUiwFd. Every choice there was the recommendation.

**What the workshop changed.** This section recommended an inline confirm with counts, in
`ConfirmDelete`'s style: two presses. The workshop made it a word to type, because this is the one
delete in the app that reaches past the board you are looking at, and the app cannot undo it.

### Decided before the renders

- **A word to type**: the filled button does nothing until the field says *delete*. Two presses,
  as every other delete in the app works, was the alternative.
- **The backups are mentioned**: *The nightly backups keep a copy for about two weeks, then that
  goes too.* `BACKUP_RETAIN_DAYS` is 14 by default and the dumps are pruned with `-mtime +14`, so a
  deleted account lasts in them 14 to 15 days, and the warning says *about two weeks* rather than
  a number the server's `.env` can change.
- **The sign-in screen says it is done**, and that signing in again starts a new, empty account.

### Decided from the renders

- **The warning is tinted**: the row keeps its name and its tint and opens into it. The warning in
  the row's place on the panel's ground was rendered beside it.
- **The counts are a sentence** in each hobby's word, *36 games, 9 films, 4 shows, 2 anime and 41
  notes*, over a list a board a line.
- **The sign-in is named**: *the account you signed in to with Google*, over *your account*. The
  same person at Google and at Discord is two accounts.
- **The sign-in card's heading reads *Account deleted*** (C), over the line in place of the intro
  (A) and a notice above *Sign in* (B).

### Built

- **`GET /api/account` and `DELETE /api/account`** on a new `[Authorize]` `AccountController`, in
  `AccountService`. The summary is facts: each board's titles (a title once, however many passes),
  every note, and the providers. The delete is one `ExecuteDelete` on `users`, and the database
  cascades the rest.
- **`SessionValidator`** on the cookie scheme's `OnValidatePrincipal`: one primary-key lookup per
  request carrying a cookie, which rejects and signs out a session whose account is gone.
- **`frontend/src/account/`**: `DeleteAccount.tsx` (the tinted row and its warning), `warning.ts`
  (the sentence, a pure function) and `useDeleteAccount.ts` (the delete, held by the menu).
  `HobbyDefinition.titleNoun` gives every hobby its word for a title, and `PROVIDERS` gained a
  `name` for a sentence to use.
- **The *Your data* group is on every board**, and the spreadsheet's row stays where its hobby
  has an `export` block.
- **The sign-in card reads *Account deleted*** when a delete brings it there, and takes the
  keyboard.
- **The page root carries the theme's ground.** Found in the renders; see below.

### Tests

`AccountEndpointTests` has 11. On the frontend, `account/warning.test.ts` has 10 and
`api/account.test.ts` 2. `theme/SettingsMenu.test.tsx` gained 14, and one spreadsheet case
changed now that the group is on every board. `shell/SignInPage.test.tsx` gained 5, and
`index.css.test.ts` 2 a palette. End to end, `e2e/account.spec.ts` has 4 and `layout.spec.ts`
gained 1.

Every test was red first. The backend's were red on routes that did not exist, and the two
stale-session cases then stayed red on the finished routes, for the plan's own reason: a read
answered 200 and a write 500. The frontend's were red on modules that did not exist and a panel
with no row. The e2e specs were red against `main`'s Settings panel, and the ground's against a
root with no background. Then 38 faults were planted one at a time: 14 behind the API, 21 in front
of it and 3 end to end. Each turned red exactly the tests that name it. The tables are in
`docs/auth.md`.

### What the plan got wrong, or left out

- **"Recommended: inline, with counts, in ConfirmDelete's style."** A word to type, from round one.
- **"A stale cookie gets 401" needed a host that reads cookies.** The backend suite signs in by
  header and never reaches the cookie scheme's events, so `AccountEndpointTests.CookieHost` puts
  the cookie scheme back as the default and seals a ticket with the host's own format.
- **`/api/auth/me` already answered null for a deleted account**, because `MeAsync` finds no row.
  A second device that reloads lands on sign-in with or without the session check; only its API
  calls show the difference, so the tests assert on those.
- **The counts needed words the hobbies did not have.** "A small read for the counts" became
  `HobbyDefinition.titleNoun` on all four hobbies, and a name on each provider.
- **The page's ground stopped where the board did.** Over a short board the Settings panel ran
  past `main` onto the browser's own colour: 75px of white under an empty games board on a phone
  before this feature, 269px with the warning open. The root carries `--sunken` now.
- **`danger` on the tint measured 4.24:1 on Dusk**, so the failure line sits under the warning on
  the panel's ground, where the renders had it inside. `index.css.test.ts` holds the text that
  does sit on the tint.
- **The counts arrive after the warning has scrolled into view**, and their two lines pushed the
  buttons back under a 900px window's fold. It scrolls again when they land. The first e2e test
  missed it, because an empty account's sentence is about as long as the one without numbers.
- **"Do what `SessionBadge`'s sign-out does"** is close but not exact. The delete navigates first,
  carrying `{ accountDeleted: true }` so the card can say so, then clears the cache and writes the
  session as null, in that order, so the cache is left holding the truth.

---

## 9. A read-only share link · M

**What.** One revocable link to the games board, for friends and for portfolio reviewers. Today a
reviewer can't see anything without making an account.

### Decide at pickup

**What a share shows.**
- Recommended: covers, titles, columns, ratings and progress.
- **Leave note previews out**: `LatestNotePreview` is null on the share path, because notes are a
  private journal.

**Which columns.** Hidden columns are a per-browser setting the server never sees. Either:
- show all five, with Dropped collapsed, or
- store a column list on the share.

**Whether the share offers the year picker.**

### Backend

**Table `board_shares`:**
- `id`
- `user_id` — cascade on delete
- `hobby_id`
- `token_hash` — unique; the SHA-256 of 16 random bytes. The URL carries the raw token, base64url.
- `created_at`
- `revoked_at`

**Owner routes (`[Authorize]`):**
- create — the URL is shown once
- list
- revoke

**Anonymous routes**, on their own `[AllowAnonymous]` controller:
- `GET /api/shared/{token}/library`, `/years` and `/upcoming`.
- An unknown token and a revoked token give the same 404.

**Keep scoping visible at the call site.**
- Refactor `LibraryService`'s *read* paths so `BoardQuery` takes an explicit owner id. The signed-in
  methods pass `user.Id`; the share passes the token's user.
- **Never swap `ICurrentUser` for the share request.** Any write path it could reach would then act
  *as* the owner.
- `ICurrentUser.Id` throwing when nobody is signed in is the backstop.

### Frontend

- A route at `/share/:token`, outside `RequireSession`.
- Read-only columns render `CardFace` with no handlers, exactly as the drag preview does today.
- No search, no drawer, no Discover.
- In Settings: *Share this board* — create, copy, revoke. Workshop the look.
- **On a phone, since #1:** a shared board needs the same one-column-at-a-time layout: the
  `SIDE_BY_SIDE` media query and `ColumnSwitcher`. **A share must offer no drop target.** The
  switcher's segments call `useDroppable`, so check at pickup whether it renders sensibly outside
  a `DndContext` — dnd-kit's contexts have defaults — or needs a variant without droppables. Its
  counts come from `columnQuery`, which reads the signed-in library, so the share needs its own
  query for them.

### Tests first

- The share shows only the owner's titles.
- No notes appear.
- A revoked or unknown token gives 404.
- The anonymous controller has no write routes.
- Deleting the account kills the share.
- At 390px, the share is one column at a time and nothing on it can be dragged.

**Docs to update:**
- `auth.md`: the deliberate anonymous route, and why it's safe.
- CLAUDE.md's Settled **Scope** and **Sessions** rows.

---

## 10. `/` focuses the search box · shipped

**Shipped and deployed 4 October 2026** (PR #58). `/` takes the keyboard to the search box from
anywhere on the board, and the slash is not typed into it. Write-up: `docs/games-igdb.md`, *Search
on the board*.

It is a `document` `keydown` listener in `BoardSearch.tsx`, which owns `boxRef`. It does nothing:
- **with Ctrl, Alt or Meta held.** Shift is allowed. `key` is already the character the keyboard
  made, and German and French keyboards type `/` with Shift.
- **in an `input`, `textarea` or `select`.** That includes the box itself, so *Fate/stay night* can
  be searched for.
- **while anything is `aria-modal`**, which today means the journal. This is asked of the
  document rather than of the focused element, because focus can fall out of an open drawer onto
  the body.
- **while a card is being carried.** dnd-kit marks the sortable in hand `aria-pressed`. This rule
  was not in the plan; see below.

Otherwise it calls `preventDefault()` and then focuses the box. Without `preventDefault()` the
keypress follows focus into the box and types the slash there. **Nothing changes at 390px.** A
phone types only into fields, and the rule leaves fields alone.

**Not built: the optional `/` hint in the placeholder.** How it looks is a visual choice, so it
needs a workshop first. A phone has no `/` key to press, so a hint should only show on desktop.

### Tests

`BoardSearch.test.tsx` gained 9, `BoardPage.test.tsx` 2, and `e2e/search.spec.ts` 1. The carried
card's test is the Playwright one, because the drag gets a real browser. What it guards against is
a dnd-kit drop and a dnd-kit focus restore, and both were measured in Chromium. A keyboard pick-up
does start in jsdom, which a probe showed, so jsdom was not the obstacle. Each guard was checked by
planting its fault:

| Fault planted | Red |
|---|---|
| No `preventDefault()` | the two that press `/` from the page; the box held `/` |
| Shift counted as a modifier | *answers a slash typed with Shift held* |
| Ctrl, Alt or Meta unchecked, each planted alone | that modifier's case, and no other |
| No field rule | *types a slash into the box*, and the three *elsewhere on the page* |
| `textarea` or `select` left off the list, each alone | that field's case, and no other |
| No modal rule | *keeps / from taking the keyboard out of the journal*, while focus is in the drawer |
| The modal rule asked of the focused element, not the document | the same test, once focus is on the body |
| Neither the field rule nor the modal rule | those six, and *lets a note have its slashes* |
| No carried-card rule | *`/` leaves the keyboard with a card that is being carried* |
| The carried-card rule matching any card, not the one in hand | the same spec, once the card is put down |

### Where the build departed from the plan

- **A carried card was missing from the plan, and it was the one real hole.** Measured in Chromium
  against the first build: during a keyboard drag, `/` moved focus to the box with the card still
  in hand. Typing "a b" left "a" in the box. The space dropped the card, dnd-kit gave focus back
  to it, and the "b" went nowhere. **Tab cannot cause this.** dnd-kit counts Tab as a drop, so
  focus stays on the card.
- **Two things the plan listed are not in the code**, and neither could be given a test that means
  anything:
  - **`isComposing`.** An IME only composes in a field, and the field rule already refuses those.
    The only event that would test the check alone is one no browser sends.
  - **`contenteditable`.** Nothing in the app is editable that way, and jsdom has no
    `isContentEditable`, so its test would pass without testing anything. If such an element is
    ever added, it joins the list with a Playwright test.
- **"A modifier is held"** became Ctrl, Alt and Meta. Shift is not on it, for the reason above.
- **The plan's note test is held by two rules at once.** The journal is modal and the note is a
  field, so it goes red only with both rules planted. Each rule also has a test of its own.

**Measured in Chromium and left as it is.** `/` leaves an open `⋯` menu or the Settings panel
open, as Tab off a menu's last item does: neither closes when the keyboard leaves it, only on a
press elsewhere or Escape. That has one consequence worth knowing. With Settings open, an Escape
pressed in the box clears the search **and** closes Settings, which sends focus to the Settings
button. `Card.tsx` already notes that Settings catches Escape at the document, unlike the card
menu. The fix would be to catch it on the panel's container, as the card menu does. Not done here.

---

## Noted for the other hobbies (no plans, as the user asked)

**Hours in the column headers on films, TV and anime.** #3 built them for games only, by the
user's choice on 1 October 2026, and asked for the other hobbies' suggestions to be kept here.
- The API already adds up every hobby's columns. Turning a hobby on is its `columnHours` block in
  `frontend/src/hobbies/` and nothing else.
- The wording proposed at the workshop: `23 h 40 m of film`, `~312 h of TV`, `~48 h of anime`. A
  film's runtime is exact, so it has no tilde and is written as a card writes a runtime. **Not
  *to watch***, which reads wrong on Watched, a column of things already watched.
- None of them gets Completed's comparison: their passes record no hours
  (`PassFields.hoursPlayed` is false).

**Import a MAL list.**
- MAL's list statuses map one-to-one onto the five columns, and MAL ids are exact.
- **Unmeasured:** a *public* list may be readable with the client id alone
  (`GET /users/{name}/animelist`). `anime-mal.md` assumes it needs OAuth. Measure before planning.

**+1 episode on Watching cards (TV and anime).**
- Anime stops at `episodeCount`.
- TV needs each season's episode count, which the board row doesn't carry.
- **On a phone since #1**, a Watching card is under the switcher like any other, and a +1 button
  on it must keep its press from the drag. Spread `NOT_A_DRAG` from `Card.tsx`, as the `⋯` corner
  does.

**The spreadsheet on films, TV and anime.** #7 built it for games only.
- The API already answers every hobby's export. Turning one on is its `export` block in
  `frontend/src/hobbies/`, and a films board would say Films and Viewings.
- The hours, platform and HowLongToBeat columns follow `PassFields` and `setHltbId`, so they leave
  a films sheet on their own.
- **Two things would not.** *Developers* is the API's `developers`, a game's, so a films sheet
  would want the directors there, which the export does not send yet. And a TV or anime pass says
  where you are, its season and episode, which no column holds yet.
