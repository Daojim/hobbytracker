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
| 1 | A board that works on a phone | S + M | **Shipped and deployed 1 October 2026** (PRs #41 and #42). **The manifest and the icon followed on 2 October 2026** (PR #48), deployed the same day. Left: the Android checks in its section |
| 2 | Record when a title changes column | M | **Shipped and deployed 1 October 2026** (PR #44). See its section |
| 3 | Hours in the column headers | S–M | **Shipped and deployed 1 October 2026** (PR #46), games only. See its section |
| 4 | "How long will it take me?" | S–M | **Shipped and deployed 2 October 2026** (PR #50), after a workshop the same day. See its section |
| 5 | Stats | M–L | **Built 2 October 2026** on the branch `stats`, after a workshop the same day. Not yet merged or deployed. See its section |
| 6 | Search your notes | S–M | Planned |
| 7 | Export the board to a spreadsheet | S–M | Planned. Workshop it with #8 |
| 8 | Delete my account | S–M | Planned. Workshop it with #7 |
| 9 | A read-only share link | M | Planned. Gained a phone question; see its section |
| 10 | `/` focuses the search box | S | Planned |

Production runs `8cac01a`, which was `main` on 2 October 2026. Deploying is the runbook in
`docs/deploy.md`.

## Suggested order (any order works)

- **#2 early.** History that isn't recorded can't be backfilled, and #5 reads it. Every day it
  waits is history lost. **Shipped 1 October 2026.**
- **#3 before #4's backlog mode and before #5.** Both reuse #3's server-side totals. **Shipped
  1 October 2026.**
- **#7 and #8 together.** They share a *Your data* group in Settings, so workshop them at the same
  time.
- **#10 is the smallest** if a quick one is wanted.
- **The rest of #1, the manifest and the icon, whenever.** It is a workshop first, then a small
  build. **Built on 2 October 2026.**

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
  recommended Shelf, and took the recommended paper.
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
  were measured with the production image before deploying, not only after.

**Check on your phone after deploying (Android):**
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

## 5. Stats · built

**Built on 2 October 2026, on the branch `stats`.** Not yet merged or deployed. The write-up is
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

## 7. Export the board to a spreadsheet · S–M

### Decide at pickup

**Recommended: CSV, one row per title, as the board shows it.** Columns:
- title
- the column, in the hobby's own words
- rating
- hours played
- platform
- started and finished, as Eastern days
- number of passes
- the four HLTB figures
- genre
- developer
- release date
- latest note

**Optional:** extra files for every pass and every note.

**XLSX** (ClosedXML, MIT, added through `Directory.Packages.props`) is the alternative if Excel's CSV
handling gets in the way.

### How it's built: the server returns facts, the client writes words

- `GET /api/library/export?hobby=` returns JSON rows with every field, including the ones the board
  row lacks: hours, platform, both dates, the tiers.
- The client builds the CSV:
  - the hobby's words from `columnLabel` and `resolveGenre` in `hobbies/`
  - the dates from `journalDateInput` in `lib/time.ts`
- That keeps the hobby's words in `hobbies/` (a Settled rule) and the time zone in the UI, so it adds
  no new zone place.
- Download it as a `Blob` named `hobbytracker-games-<todayHere()>.csv`.

### Traps

- **Add a UTF-8 BOM**, or Excel shows *PokÃ©mon*.
- **Formula injection.** Notes are free text, so any cell starting with `=`, `+`, `-`, `@`, a tab or
  a carriage return gets a leading `'`. Quote every cell.
- **Don't page the export.** Columns stop at 100, so the endpoint must return everything — no
  `MaxPageSize`, and not through `ListAsync`'s pager.

**UI (workshop):** a *Your data* group in Settings, shared with #8.

---

## 8. Delete my account · S–M

### Backend

**`DELETE /api/account` on a new `AccountController` with `[Authorize]`.**
- **Not in `AuthController`.** That controller is `[AllowAnonymous]` at class level, and
  `[AllowAnonymous]` overrides any `[Authorize]` on an action.
- Test this: an anonymous DELETE gets 401.

**Delete the `users` row and let the database cascade.**
- It cascades to `log_entries`, from there to `notes` and `status_changes`, and to `auth_identities`.
- The cascades are in `LogEntryConfiguration.cs:90`, `AuthIdentityConfiguration.cs:21` and
  `NoteConfiguration.cs:24`.
- Shared `media` and `games` rows stay.
- Then call `SignOutAsync`.

### Trap: the cookie outlives its user

- The session cookie is self-contained and has no `OnValidatePrincipal` (`Program.cs:230`).
- So another device stays signed in as a user id that no longer exists. Reads come back empty, and
  writes 500 on the foreign key.
- **Fix:** add an `OnValidatePrincipal` that looks the user up by primary key and calls
  `RejectPrincipal()` if the row is gone.

### Decide at pickup

- **The confirmation.** Recommended: inline, with counts, in `ConfirmDelete`'s style. It must say
  **every board** — games, films, TV, anime — not just this one. That needs a small read for the
  counts.
- **Backups.** Whether to mention that nightly backups keep the data until they expire. They are
  kept 14 days; see *Backups* in `docs/deploy.md`.

### Frontend

On success, do what `SessionBadge`'s sign-out does: `setQueryData(sessionKey, null)`, then
`clear()`. That lands the user on sign-in.

### Tests first

- Deleting user A removes all of A's rows and none of B's.
- Shared catalogue rows survive.
- A stale cookie gets 401 afterwards.
- An anonymous DELETE gets 401.
- e2e: sign in, add a title, delete the account, sign in again, see an empty board.

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

## 10. `/` focuses the search box · S

### Frontend

In `BoardSearch.tsx`, which owns `boxRef` (`:42`, unchanged at `df54a8b`), add a `document`
`keydown` listener for `/`.

**Ignore the key when:**
- a modifier is held
- an IME is composing (`isComposing`, read off the native event)
- focus is in an `input`, `textarea`, `select` or `contenteditable` element
- a modal dialog is open — the drawer is `aria-modal`, and its Tab trap must keep the keyboard

**Otherwise** call `preventDefault()` so the `/` isn't typed, then focus the box.

**A document listener is fine for this key.** The rule in `games-igdb.md` is about two listeners
for one key (Escape), and nothing else listens for `/`.

### Tests first (Vitest)

- `/` on the board focuses the search box.
- `/` typed into a note still types a slash.
- With the drawer open, focus doesn't move.
- Ctrl+/ is ignored.

**Optional:** a `/` hint in the placeholder.

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
