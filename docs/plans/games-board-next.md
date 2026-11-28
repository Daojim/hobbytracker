# The games board, before the other hobbies

Written 1 October 2026 at the user's request. A feature is built on the **games board first** and
taken to the other hobbies afterwards. The ten below are planned so a session can pick up **any
one, in any order**, when the user names it. An eleventh, a bug in the release calendar, was added
on 4 October 2026, and a twelfth and a thirteenth, both about the journal, on 7 October 2026. A
fourteenth and a fifteenth followed on 8 October 2026, after a mistaken finish cost a pass its
notes. A sixteenth and a seventeenth, a picker for the backlog and a Discover list from your
ratings, were added on 23 October 2026 from suggestions the user picked. An eighteenth, pictures
in notes, was added on 30 October 2026 at the user's request, and a nineteenth and a twentieth,
an estimate that catches up and the titles a column's header leaves out, on 3 November 2026. A
twenty-first, the titles behind a rating on the Stats page, followed on 4 November 2026, and a
twenty-second, a game's OpenCritic and Steam pages, came out of #17's workshop on 7 November 2026.
A twenty-third and a twenty-fourth were asked for on 8 November 2026, the morning #17 shipped:
hiding a game from Discover, and adding a game finished long ago without inventing its dates.
Five more were asked for on 14 November 2026: a journal opened from the Stats page, a roomier
picker, Settings rearranged, a theme of your own, and collapsing a column. A thirtieth, the README
refreshed once those five are built, was asked for on 20 November 2026. Four more followed on
25 November 2026: the installed app's bottom bar, a bug measured on the user's Android phone; a
queue for adding many games at once; month and week views of the release calendar; and a better
sign-in page. A thirty-fifth, a column's Load more, came out of #32's workshop on 27 November
2026, to be built before it. CLAUDE.md's **What is next** points here.

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
| 6 | Search your notes | M | **Shipped 9 October 2026 and deployed on the 10th** (PR #76), the day it was picked up and workshopped: a *Titles \| Notes* switch beside the box, every word in any order, a card per title, and a note opening its journal at the note with its words marked in the accent, the user's pick over bold. See its section |
| 7 | Export the board to a spreadsheet | S–M | **Shipped and deployed 4 October 2026** (PR #61), the day it was workshopped: a three-sheet workbook from a row in Settings. See its section |
| 8 | Delete my account | S–M | **Shipped and deployed 4 October 2026** (PR #63), the day it was workshopped: a tinted warning in Settings that asks for the word *delete*, and a session check that signs every other device out. See its section |
| 9 | A read-only share link | M | **Shipped and deployed 5 October 2026** (PR #65), the day after its workshop: a Sharing row in Settings that opens a dialog of boxes, and the board under a banner for anybody holding the link, with nobody signed in. See its section |
| 10 | `/` focuses the search box | S | **Shipped and deployed 4 October 2026** (PR #58). See its section |
| 11 | A release window that has begun | S + S | **Shipped and deployed 23 October 2026** (PR #78), the day it was picked up and workshopped: only a day counts down, and a window sits at the last day it could come out, under a heading of its own. The order was not in the plan. See its section |
| 12 | The journal from a search result | S | **Shipped and deployed 7 October 2026** (PR #68), the day it was asked for and workshopped: a result on your board opens its journal from its name, in the accent. See its section |
| 13 | A column dropdown in the journal | M | **Shipped and deployed 7 October 2026** (PR #70), the day it was planned and workshopped: the pass's heading moves the title, and leaving Completed asks first. The race with the autosave was reproduced red before the fix. See its section |
| 14 | Put a finished pass back | S–M | **Shipped and deployed 8 October 2026** (PR #72), the day it was found and workshopped: leaving Completed asks *Did you finish it?*, in the journal and on the card, and *No* moves the pass itself. See its section |
| 15 | Deleting a pass keeps its notes | S | **Shipped and deployed 9 October 2026** (PR #74), the day it was picked up and workshopped: the notes move to the current pass, and every confirm that deletes notes says so. See its section |
| 16 | What should I play next? | M | **Shipped and deployed 25 October 2026** (PR #80), the day it was workshopped, two days after it was planned: one panel with *Suggest three* and *Spin*, four bands in hours, genres left out, covers on a wheel, *Not this one*, and a *Pick* button in Backlog's header, the user's pick. The real backlog was read first, and holds six games. See its section |
| 17 | A Discover list from your ratings | M | **Shipped and deployed 8 November 2026** (PR #93), built tests first the day after its workshop, after the full e2e suite went 220 green: seeds rated 8 and up by their latest finish, a version asking about its original, the board and every original of a board title left out, and nothing with fewer than 10 ratings, ordered by how many seeds name a game. A tab *From your ratings*, last, and each tile saying "Because you rated …" up to three lines, the user's pick over "Like …". Built against the live API through the client, it made the workshop's 220 titles with the same reasons, and the page differs from the picked prototype by no pixel. See its section |
| 18 | Pictures in notes | M–L | **Shipped and deployed 31 October 2026** (PR #84), built the day before, the day it was planned and workshopped, tests first, all seven steps. A picture pasted, dropped or picked into a note, shrunk to a 1920 edge as WebP and sent with the words, a note that is a picture alone, a collage, a lightbox Back closes, and on the card the newest note's first picture 28px tall, the user's pick. Kept in Postgres, four to a note, 1 GB an account but the admin's. Measured in Chromium and in Firefox. See its section |
| 19 | An estimate that catches up | S–M | **Shipped and deployed 3 November 2026** (PR #87), built tests first the day it was planned and workshopped, at the user's request, after the full e2e suite went 213 green. A circular arrow beside the journal's ID box, turning while it checks, on every game; *Last checked Sep 11* under the row on a game with no figures; and the backfill run on a timer by its own 30-day rule. Three of the user's picks were over the recommendation. See its section |
| 20 | The titles a column's header leaves out | S–M | **Shipped and deployed 4 November 2026** (PR #89), built tests first the day after it was planned and workshopped beside #19, after the full e2e suite went 215 green. A count in a header, in the accent (the user's pick), opens a list of covers and names under the whole header at the column's width, and a title in it opens its journal, at Hours played from the list without your hours. Your board's columns only. See its section |
| 21 | The titles behind a rating on the Stats page | S | **Shipped and deployed 7 November 2026** (PR #91), built tests first the day it was workshopped in two rounds on the user's real finishes, after the full e2e suite went 217 green. Each rated column is a button with its count in the accent and a tab under the open one, opening the finishes rated there in the panel, two across, each with its exact rating, the user's pick. Nothing opens from a row, and a share's chart is as it was. No server change. See its section |
| 22 | A game's OpenCritic and Steam pages | M | **Shipped and deployed 13 November 2026** (PR #95), built tests first on the 12th, the day it was workshopped, after the full e2e suite went 231 green, the 220 before and 11 new. Two rows in the journal under HowLongToBeat's, OpenCritic's top critics, tier and share who recommend it (the user's pick) and Steam's word and share positive, each beside a link to its page, and an *OpenCritic ID* box to pin one. Measured first: Steam's review route is deprecated and its keyless replacement answered all 83 apps; OpenCritic's pages may not be read, and its API takes a key, optional here; Wikidata gives 61 of the board's 91 an OpenCritic id with no matching. The built rows match the picked renders to the pixel, and the Enter guard on the box proved to be Firefox's. `OPENCRITIC_API_KEY` went in the server's `.env` before the deploy. See its section |
| 23 | Hide a game from Discover | S–M | **Shipped and deployed 14 November 2026** (PR #97), built tests first on the 13th, the day it was workshopped, after the full e2e suite went 236 green, the 231 before and 5 new. An eye struck through on the cover's corner, under the pointer, with the keyboard and always on a phone, hides that one IGDB entry, never its series or its versions, from all five lists and never from a search, kept per account. A plain card with Undo where the tile was for the rest of the visit; *1 hidden* on the page opening the list. Applied after the shared cache, never in its question or key, so every list now asks IGDB for twice the wall, the user's pick when the build asked. Four of the workshop's thirteen picks were the user's over the recommendation. The built page differs from the picked prototype by no pixel at 1440, 1280 and 768. See its section |
| 24 | A game you finished long ago | M | **Shipped and deployed 14 November 2026** (PR #99), workshopped and built tests first the same day. **Planned 8 November 2026**, at the user's request: adding a finished game you remember only by its year, and perhaps its hours, without a made-up day and without it landing in this year. **Workshop begun 14 November 2026**: round one, in words, took eight choices, every one the recommendation. A year kept as a year, years only, the ✓ asking *When did you finish it?* with an optional hours box, and the journal's Started and Finished each gaining a year mode, on every board and every pass. Round two, the same day, took three looks, every one the recommendation: the question over the tile, the last year already in its box, and a Day \| Year switch beside each date's label. **Round three, the same day, took eight, every one the recommendation**: *Completed in 2019* after a word and the year alone on a card, a year's undated finishes after December behind a rule, a year with no days as that group alone, All years a row per year at every width, *Started in* and *Finished in* columns in the spreadsheet, the panel's *In · Add · or · Today · I don't remember*, *When did you watch it?* on a film alone, and *Cannot be earlier than Started.* **Built the same day, tests first**, with ten more choices asked at the build, every one the recommendation; the full e2e suite went 253 green, the 236 before and 17 new, and the built pieces differ from the picked prototypes by no pixel in 26 states. See its section |
| 25 | A journal from the Stats page | S–M | **Planned 14 November 2026**, at the user's request: a cover in a year's months, and a row in #21's list of a rating's games, open that title's journal. **Reverses #21's *nothing opened from a row***. The drawer's moves are the board's, so the work is lifting them out of `BoardPage`. Not on a share. **Shipped and deployed 20 November 2026** (PR #101), built tests first the day it was picked up and workshopped. Round one, four questions in words, and round two, three looks rendered on the user's finishes, took every recommendation: a cover rings in the accent, a rating's row is a button with its name in the accent, a phone keeps today's 32px covers. The board's drawer, whole, with its way in lifted out of `BoardPage`; a move landing last in its column, as from the board's journal; and every write that can change a finish settling the page, which fixed a Stats page that kept its old numbers for 30 seconds. See its section |
| 26 | The picker, roomier | S | **Planned 14 November 2026**, at the user's request: #16's panel centred and wider on a desktop, its wheel larger, and each length chip saying *5 games* on a line of its own above its hours. *Leave out* unchanged. **Workshopped 20 November 2026**, every pick the recommendation: 576 wide in one column with a 400 wheel, centred from `md`, the count in grey on a line of its own, and on a phone 16px from the top, because the taller chips put the panel 19px off a 390 × 844 screen. **Shipped and deployed 21 November 2026** (PR #103), built tests first the same night: the full e2e suite went 259 green, the 257 before and 2 new, and the desktop specs 4 of 4 in Firefox. See its section |
| 27 | Settings, rearranged | M–L | **Planned 14 November 2026**, at the user's request, a workshop first: the themes out of the top of the panel into a place of their own, **Modal as the journal's default**, and new settings to choose from, listed whole in its section. **Workshopped 21 November 2026 in two rounds of renders**, and it grew: the themes leave Settings for a palette button in the header, Settings becomes a dialog behind a gear, seven settings are added, a phone keeps the full-screen journal whichever is chosen, and two bugs on main found by the renders are fixed in the same branch. Four picks were the user's over the recommendation (where the themes go, the two icons, 768px, Your data at the foot), and five of the seven additions were ones recommended against. **Shipped and deployed 21 November 2026** (PR #105), built tests first the same day, a commit per step and one per addition: the full e2e suite went 269 green, the 259 before and 10 new, Vitest 1,601, every fault put back turned its cases red, the keyboard held in Firefox as in Chromium, and the built header, palette and dialog differ from the picked prototype by no pixel. See its section |
| 28 | A theme of your own | M | **Planned 14 November 2026**, at the user's request, a workshop first and **after #27**: a theme made from one of the eight, how much of it a person picks, and what happens to a colour that cannot be read. **Workshopped 21 November 2026 in two rounds**, round one in words and round two in renders, all thirteen picks the recommendation: three colours of your own (the ground, the card and the accent) with the other 17 worked out as the theme it is made from works them out, a warning under a colour that cannot be read, one theme kept per browser and stamped before the bundle, *Your own · From Shelf Dark* as a tenth choice in the palette's list, and a panel beside the board with no scrim, so the board repaints as you pick, half the screen on a phone. Measured first: 20 tokens a theme, 17 pairs a warning checks, and a prototype pre-paint script that painted a kept theme with no bundle in Chromium and Firefox. **Shipped and deployed 22 November 2026** (PR #107), built tests first on the 21st and 22nd, a commit per step: the full e2e suite went 275 green, the 269 before and 6 new, Vitest 1,674, every fault put back turned its cases red, the keyboard and the live repaint held in Firefox, and the built list and panel differ from the picked prototype by no pixel in 22 states. See its section |
| 29 | Collapsing a column | S | **Planned 14 November 2026**, at the user's request: an arrow beside every column's heading, side by side, that collapses its cards and keeps its heading, hours and drop target, as Dropped already does. Remembered per board, recommended. **Workshopped 22 November 2026 in two rounds, all eleven picks the recommendation**: every column, Backlog too, remembered per board and per browser with Dropped collapsed until opened, *Collapse Completed* / *Expand Completed*, side by side only, nothing in Settings, a share folding every column for the visit; Dropped's shape, the journal's chevron before the heading, and the calendar's *Hide* turned into the same arrow. At 1440 the page with Completed collapsed goes from 4,940px to 2,400. **Built the same day, tests first**, a commit per step: the full e2e suite went 278 green, the 275 before and 3 new, Vitest 1,692, every fault put back turned its cases red, the drops and the keyboard held in Firefox, and the built board differs from the picked prototype by no pixel in 16 states. **Shipped and deployed 22 November 2026** (PR #109): frontend and docs only, Caddy alone recreated, and the stylesheet the local build's byte for byte. See its section |
| 30 | The README, refreshed | S–M | **Planned 20 November 2026**, at the user's request, **after #25 to #29**: shots that open bigger on GitHub, which none does today because each is a `<picture>`, a wheel larger than its 360px GIF shown at 300, and whatever else the workshop finds behind. **Workshopped 22 November 2026 in two rounds**, measured on GitHub's own repo page: the wheel rendered 88px wide on a desktop and 25 on a phone, its cell's doing, and the user's *etc.* was that the pictures were not appealing beside well-made repos. So every shot became a close crop framed on a soft backdrop of Shelf's own colours, the hero the board with a phone over its corner, each still a light and dark pair GitHub picks between by fragment so a press opens the reader's own theme, and the wheel a 656px GIF in its own column. The share link and Settings join the tour, the user's picks over a theme of your own. Every pick but that one was the recommendation. **Shipped 22 November 2026** (PR #111), built the same day, test first: `src/readme.test.ts` holds the pairs and the one picture, and nine faults put back each turned it red. On the pushed branch's own page, in Chrome and Firefox, light and dark, every still opened its own file in the reader's theme, and a reader downloads 5.0 MB against 3.0 today. No deploy: the README is GitHub's. See its section |
| 31 | The installed app's bottom bar ignores the theme | S | **Planned 25 November 2026**, at the user's request: a bug, measured that day on the user's Android phone. With Dusk chosen and the app closed and reopened, the status bar at the top is Dusk's ground and the navigation bar at the bottom is the manifest's `theme_color`, Shelf Light's, which a stored setting cannot change. First whether anything newer changes that, then a manifest that follows the theme, one fixed colour, or leaving it and saying why. `docs/design.md` gains the measurement whichever is picked. **Checked 27 November 2026 in Chromium's source**: Chrome 153 is what paints the bar from the manifest, from the installed app's own copy, and nothing newer lets the page reach it. **(a) picked, every pick the recommendation**: a manifest per theme, System keeping today's and a theme of your own its base's. **Built the same day, tests first**: the full e2e suite went 279 green, the 278 before and 1 new, Vitest 1,706, every fault put back turned its cases red, and the pre-paint script held in Firefox. **Shipped and deployed 27 November 2026** (PR #113): frontend and docs only, api and caddy both recreated because `aspnet:10.0` had moved, the stylesheet the local build's byte for byte, and every manifest served as one and the commit's bytes. **On the user's phone the same evening, a fresh install wore the theme at the bottom**; an installed app's update to a new theme is yet to be seen. See its section |
| 32 | A queue for adding many games at once | L | **Planned 25 November 2026**, at the user's request, a workshop first: a list kept apart from the board, filled from search or from a pasted list of names matched against IGDB and never guessed, then a selection added to one column in one go, Completed with #24's year or *I don't remember*. The app's first multi-select, and where the queue lives is the workshop's to propose. A rating, hours and anything done in bulk to titles already on the board come later. **Workshopped 27 November 2026, every pick the recommendation**, 26 of them: round one in words, then the user's own pasted list run live through the app's search, which picked the rule (a name or one of IGDB's alternative names, then the part after the colon, a tie asked: seven of the nine matched, none wrong), then round two in renders and four follow-ups. A page of its own at `/board/:hobby/queue`, found lines into the queue at once, a box on every row with Shift-click, the bar under the heading and at a phone's foot, a fourth quarter on every tile, *Open your queue* under the search box. **Load more on a column first, as #35, so this build waits for it.** See its section |
| 35 | A column's Load more | S–M | **Planned 27 November 2026, at #32's workshop**, the user's pick: a *Load more* under a column past 100 titles, on Discover's shape, built as its own PR **before #32**. Completed holds 75 under All years. What a drag does in a column partly loaded is its main question. **Workshopped 28 November 2026** on branch `column-load-more`, all seven picks the recommendation. Round one in words: the server numbers what a drag did not send after what it did, which also ends the interleave a year's drags left under All years, found in the production copy; the next 100 a press; the same button on a share; nothing while folded, its pages kept. Round two in renders, with a column staged past 100 from the production copy: today's *Showing 100 of N* over Discover's *Load more*, at its own width on a phone, and nothing once every page is in. **Built 28 November 2026, tests first**, a commit per step, with one more pick asked at the build, a share's keyboard on the first new card's name, the recommendation: the backend suite went 1,151 green, Vitest 1,721, every fault put back turned its cases red but one jsdom cannot see, which the e2e suite holds in Chromium; the full e2e suite went 283 green, the 279 before and 5 new, with #24's known flake the one red; the desktop cases pass in Firefox; and every shot of the picked states is the prototype's byte for byte. On branch `column-load-more`, not yet a PR. See its section |
| 33 | Month and week views of the release calendar | M | **Planned 25 November 2026**, at the user's request: a month view, and perhaps a week view, as a choice beside the *Coming soon* agenda, with a place for the titles no day fits. A week view only if the user's real calendar has enough exact days, and a phone considered from the start. See its section |
| 34 | A better sign-in page | S–M | **Planned 25 November 2026**, at the user's request, a workshop first, in renders: the sign-in page saying what the app is before asking anyone to sign in, from the README's shots, and a sentence that no longer says *a game*. The neutral buttons, the full-bleed ground and *Account deleted* stay. See its section |

Production runs `cb0eb5d`'s code, which was `main` on 27 November 2026. Deploying is the runbook in
`docs/deploy.md`.

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
- **#17's look, whenever, and before the rest of #17.** It is a measurement rather than a build,
  the user asked to see it, and it decides whether #17 is built at all. **Looked at on 7 November
  2026, and it said build.**
- **#31 first of the four.** It is a measurement and then a small decision, and the user's phone
  has taken the measurement already: what is left is whether anything newer changes it, then one
  of three. **Checked, picked and built on 27 November 2026: (a).**
- **#32 is the biggest, and a workshop before anything.** Where the queue lives, how a selection
  works on a phone, and what the paste box says about a name it cannot settle are all for renders.
  **Its build waits for #35**, the user's pick at its workshop on 27 November 2026.
- **#35 before #32's build**: a history entered through the queue takes Completed past 100 under
  All years. **Built 28 November 2026**, on `column-load-more` from `queue-for-adding-many`, so
  #32's build can start from it.
- **#33 and #34 are independent**, of each other and of #32. #33 begins by reading the user's real
  calendar, which decides whether a week view is drawn at all.

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
- **A word on the board or the Stats page that addresses the owner takes a voice.** A share shows
  both pages to somebody else, so a new phrase with *you*, *your* or *my* in it is a `Voiced` pair
  (`lib/voice.ts`), with a share's form beside it. `SharedBoardPage.test.tsx` and
  `SharedStatsPage.test.tsx` read each page whole for those words. See #9.
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
  would follow the theme there is painting the root with `--sunken`, which #8 did on 4 October
  2026 for a reason of its own. On an iPhone it is still unmeasured. See `design.md`.
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

## 6. Search your notes · shipped

**Shipped 9 October 2026 and deployed on the 10th** (PR #76), the day it was picked up, after two
rounds of questions the same day. No migration and no new variable. Both images were rebuilt and
recreated, the API first. The public site serves a new bundle carrying the bar's words and the
results' rules, each counted 0 in the one before it, and the route answers 401 without a session
where it answered an empty 404. The plan below is as it was written. What was decided and built
follows it, from **Decided at pickup** on.

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

### Decided at pickup

Asked on 9 October 2026, before anything was drawn. All four were the session's
recommendations. Two of them widen the plan (every word, and opening at the note), and the
grouping is a question the plan did not ask.

| Choice | Picked | Against |
|---|---|---|
| Where it lives | **A switch on the bar, *Titles \| Notes*.** One box, and the word typed stays when the switch flips. The box's name and placeholder follow the switch | a box of its own beside the bar; one box searching both, which sends a phrase from a note to IGDB and answers it with a strip of unrelated games above the notes |
| A query of several words | **Every word, in any order**, each matched literally, so `50%` is still `50%`. Japanese, written without spaces, is one word however long | the exact phrase, the plan's wording |
| What a result opens | **The journal, at that note**: scrolled to it and marked, an earlier pass's note included. Closing hands the keyboard back to the result | the journal at its top, as a card opens it |
| Several notes on one title | **Under their title**, titles ordered by their newest match. The server's list stays flat and newest first, and the board groups it | one row per note, newest first, a title repeated for each |

Given rather than asked:
- **Every board gets it.** `BoardSearch` is every hobby's, so holding it to games would be a
  branch on the slug, as #12 found.
- **Each board searches its own notes** (`hobby=`), so a result always opens in that board's
  drawer.
- **`ILIKE`**, newest first, capped at 50, as planned.

### Decided from the renders

Shot from the real components behind a throwaway `?sw=`/`?nr=`/`?hl=`/`?nm=` switch, Vite alone,
with every `/api/` request answered in the browser from the #13 workshop's staged board, and notes
written so that *boss* matches five notes on three games. One private page:
https://claude.ai/artifact/PBqDz6PzyGfJkrU942oAzR. Three picks were the recommendations; the
match was the user's, over bold.

| Choice | Picked | Against |
|---|---|---|
| The switch | **A, beside the box**: the phone switcher's segments in small, 60×28. The box is 530px at 1440 rather than 576, and 216px at 390 rather than 358 | B, tabs above the box, 30px taller at every width and reading as a second row of tabs; C, inside the box, 47×24 in 12px type |
| The results | **A, a card per title with its cover, in a grid**: three across at 1440, two from 768, one on a phone | B, one column of text with no covers; C, the title strip's sideways form, about 32 characters a line |
| The match | **A, the accent at 25% behind each word**, the user's pick. `fg` on it is 5.48:1 or better, and it stands 1.41–1.72:1 off the card. **On Ember that is red behind text**, which `design.md` ruled out, and the page said so in bold beside the option | B, bold, the recommendation; C, an underline in the accent, which is what a link looks like here |
| The note in the journal | **B, a 2px bar of the accent beside it**, until the journal closes | A, the note tinted with the accent at 10%; C, a ring that fades after two seconds |

Found before the pick: **the drop tint cannot mark a match.** `--drop`, the colour a column takes
under a held card, sits 1.02:1 from the card's surface on Dusk and Blood Red, and on Dusk a
tinted word showed no mark at all. It was the first thing rendered, and the page kept those shots.

Said on the page as what will be built, and not objected to: the box is *Search your notes* in
Notes, with *Search your notes…* in it; *Nothing in your notes matched “x”.*; at 50, *The 50 most
recent. Another word narrows it.*; Discover's line hides in Notes; **the switch starts on Titles
every time the board loads**; `/`, Escape and × work in either mode.

### Built

No migration and no new variable. The write-ups are **Searching your notes** in
`docs/journal.md` (the server and the journal), **Search on the board** in `docs/games-igdb.md`
(the bar), and **Searching your notes** in `docs/design.md` (the looks and their numbers).

- **The server.** `GET /api/notes/search?q=&hobby=` on `NotesController`, beside `notes/{id:int}`
  without meeting it. `NoteService.SearchAsync` adds one `ILIKE` per word, each escaped with the
  escape character first, scoped to your passes and to the board, newest first with the id as the
  tie-break. It takes fifty-one and keeps fifty, so `NoteSearchResult.More` says when there were
  more without counting them. Each match carries the title as a card names it, the anime's romaji
  under its English one, and the cover. The controller refuses a blank `q`, one over 200
  characters, and a board missing or unknown, the last through `ILibraryService.HobbyExistsAsync`,
  the library's own check.
- **The bar.** `BoardSearch` has the switch, a radio group named *Search in*, beside the box in a
  `max-w-2xl` row. Two queries, of which only the switch's is enabled. The notes' is keyed
  `noteSearchKey` under `['library', hobby]`. The box's name and placeholder follow the switch,
  Discover's line hides in Notes, and `onOpenNote` is required, taking the words with the note.
- **The results.** `search/NoteResults.tsx` groups the flat list into a card per title, each note
  a button with an id of its own, `noteResultId`. `lib/match.ts` has `wordsOf`, `matchRuns` and
  `snippetOf`, and `lib/Marked.tsx` has `MATCH_MARK` and `Marked`. They are in `lib/` because the
  journal marks the same words.
- **The journal.** `EntryDrawer` takes `atNote`, and once the title has loaded gives the note the
  keyboard and scrolls it into view, after `useModalPanel` has given it to the panel. `NoteList`
  takes `found`: that note is `aria-current`, focusable, wears the bar, and marks its words.
- **The board.** `BoardPage` holds `atNote` and sets it on every opening. `openJournalFrom` takes
  its options as an object now, and the note's door hands the keyboard back by `noteResultId`.

### Tests

Written first and shown red, the server and the client separately, each against its contract
alone: the two records on the server, and on the client the new modules' names with empty bodies.

- **The backend gained `NoteSearchTests`, 24 cases**, every one red against the route that did not
  exist yet, at its 404. 803 in all.
- **Vitest gained 70 cases and three files**: `lib/match.test.ts` (20), `lib/Marked.test.tsx`,
  `search/NoteResults.test.tsx` (7), one in `api/notes.test.ts`, 11 in `BoardSearch.test.tsx`, 6
  in `EntryDrawer.test.tsx`, 5 in `BoardPage.test.tsx`, and 18 in `index.css.test.ts`, two on each
  of the nine palettes. Of the 67 written before the build, 60 were red and 7 were guards, green
  as guards should be: nothing marked with no words, a short note shown from its start, and the
  journal opened by another door marking nothing. 1,175 in 59 files.
- **The e2e suite gained three specs** in `search.spec.ts`, all red first at the switch that was
  not there: a note opening its journal at the note on an earlier pass, under twelve newer notes,
  wholly on screen and focused; the words staying when the switch flips back; and the switch
  beside the box inside the phone's gutter.
- **Three guards were added while planning the faults**, green against the build and each red
  only with its own fault (F10, F16 and F22 below): the notes asked nothing from Titles, the
  journal opened twice with the title cached, and a card opened after a note.

The finished build ran 803 backend cases, 1,175 Vitest cases in 59 files and 201 e2e specs, all
green, and typechecks. The first full e2e run had one red: *clicking away from the drawer closes
it, and so does Escape*, the flake CLAUDE.md measures under **Tests**, at its Escape half as in
#15, during a run that had Vitest beside it. Alone it then passed 10 of 10 on this branch, and a
second full run with nothing beside it was green, 201 of 201 in 5.5 minutes.

Each fault was planted alone by a script that restored the file byte for byte, with hashes
compared afterwards. Backend faults ran the whole backend suite, frontend faults the eight Vitest
files #6 touched (456 cases), and the two marked *in a browser* the three new specs.

| Fault planted | Red |
|---|---|
| B1. The search without the user | *Another_persons_note_never_matches* alone, of 803 |
| B2. The search without the board | *A_note_on_another_board_never_matches* alone |
| B3. Words not escaped | the three *What_LIKE_reads_as_a_pattern* cases |
| B4. The escape character escaped last | the `50%` and `a_b` cases, whose escapes were escaped in turn |
| B5. The whole search as one phrase | *Every_word…* and *An_ideographic_space…* |
| B6. Words split on a plain space alone | *An_ideographic_space_separates_words_too* alone |
| B7. No cap on what comes back | *At_most_fifty…* alone |
| B8. Fifty exactly called more | *Fifty_exactly_is_not_more* alone |
| B9. Ordered by id alone | *The_newest_note_comes_first_across_titles* alone |
| B10. No tie-break | *Notes_written_at_the_same_moment…* alone |
| B11. An anime named by its romaji | *An_anime_is_named_the_way_its_card_names_it* alone |
| B12. A blank search let through, the check weakened to `IsNullOrEmpty` | **nothing**: MVC's binder hands a query of spaces over as null, so it is still refused. Kept as `IsNullOrWhiteSpace`, which says the rule rather than leaning on a binder setting, and the controller says why |
| B12b. No check that the search says something | the three *A_search_for_nothing_is_refused* cases |
| B13. No limit on the length | *…two_hundred_characters…* alone |
| B14. Any board name let through | the unknown board alone; a missing one is still refused |
| F1. Words read as a pattern | the four *reads … as the characters it is* cases whose characters mean something to a regular expression. `50%` does not |
| F2. The shorter of two words tried first | *marks the longer of two words…* alone |
| F3. A snippet cut between the halves of an emoji | *never starts halfway through a character…* alone |
| F4. A snippet from the first word's match only | *starts from the first match of any word…* alone |
| F5. A note's line breaks kept in a result | *gives a short note whole, on one line* alone |
| F6. Words split on a plain space alone | *splits a search on whatever whitespace…* alone |
| F7. A card per note rather than per title | *lists the notes under their titles…* alone |
| F8. No space between a note's date and its text | **only a text check, not the name**, which it was written for: an accessible name keeps a block apart from what follows it, in jsdom and in a browser. So the space and its comment came out, and the check reads the date running into the ellipsis |
| F9. IGDB asked from Notes | *…and asks IGDB nothing* alone |
| F10. Your notes asked from Titles | *asks your notes nothing while it searches titles* alone, added for it. Every other case in the bar's file stayed green with the requests refused, which is the MSW trap now in CLAUDE.md |
| F11. The note opened without its words | 2, the bar's and the page's |
| F12. Discover's offer left up in Notes | *takes Discover's offer away…* alone |
| F13. The box keeps the titles' name in Notes | 12, every case that finds the box by its name in Notes |
| F14. The results cached outside the library's prefix | *shows a note rewritten in the journal…* alone |
| F15. The note given the keyboard again on every refetch | **nothing at first**: the case's server answered the refetch with the same title, and the cache kept the old object, so the effect never ran again. It answers with the rating saved now, as the API does, and goes red alone |
| F16. The note's effect before the panel's | *takes the keyboard to the note found when its title is already in the cache* alone, added for it |
| F17. The note never scrolled to | 2 in the drawer's file. In a browser, *a note found opens its journal at the note, in view…* at `toBeInViewport` |
| F18. The note never given the keyboard | 4 |
| F19. The words marked in every note | *marks the words it was found by, in that note alone* alone |
| F20. The note found not marked | 8 |
| F21. The note's door handing the keyboard back by the title | 2 |
| F22. A note found once kept for the next door | *marks nothing in a journal opened from its card…* alone, added for it |
| F23. The mark painted with the drop tint, `bg-drop/100` | the tint standing off the card, on all nine palettes |
| F24. A fainter mark, the accent at 10% | the same nine |
| F25. A mark that is no token at an opacity, `bg-drop` | all eighteen, because the class no longer says what to measure |
| E2. The switch under the box, *in a browser* | *the switch sits beside the box…* on a phone, and nothing else |

### What the plan got wrong, or left out

- **The drop tint cannot mark a match.** The plan named highlighting but no look, and the obvious
  one failed on Dusk. The renders found it before the pick, and `index.css.test.ts` now reads the
  mark's class to measure it on every theme.
- **"Capped at 50" needed a way to say so.** Fifty results with no sign of a fifty-first read as
  everything there is. The server takes one more than it keeps.
- **Opening at the note is three things the plan did not list**: the words go with it, so the
  journal can mark them; the keyboard goes to it, after the panel's own; and its door needs an id
  by the note, since one title can have several notes found.
- **The result carries more than the plan said**: the cover, for the card, and the anime's second
  title, which every other place a card's name appears already shows.
- **The board is required.** The plan's route had `hobby=` without saying what its absence means.
  A search across boards would find notes no drawer on this board can open.
- **MSW refuses an unasked-for request without failing the test.** So a bar that also searched
  your notes while on Titles stayed green until a case asserted the notes were asked nothing. It
  was added while planning the faults, with two more that were green against the build and went
  red only with their fault: the journal opened twice with the title cached, where the panel and
  the note take the keyboard in one commit, and a card opened after a note, which must mark nothing.

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

## 9. A read-only share link · shipped

**What.** One revocable link to the games board, for friends and for portfolio reviewers, who
until now could see nothing without making an account.

**Shipped and deployed on 5 October 2026** (PR #65), the day after it was workshopped. **One
migration**, `AddBoardShares`: a new table, with nothing to backfill because no board is shared
until its owner makes a link. No new variable. Both images were rebuilt and recreated, the API
first, and no base image had moved. The migration applied itself as the new API started, so
production's newest is `AddBoardShares` where it was `AddStatusChanges`. The public site serves a
new bundle carrying the share's words, each counted 0 in the one before it, and a stylesheet
carrying the dialog's `padding-top:12vh`. `GET /api/share` answers 401 without a session, where it
answered 404, and `GET /api/shared/{token}` answers the controller's own 404,
`application/problem+json`, where it answered an unmatched route's empty one. The write-up is
`docs/auth.md`, **Sharing a
board**: the routes, why the anonymous half is safe, and every fault planted. The look and the
words are `docs/design.md`, **Sharing a board**. A shared column and its years are
`docs/board.md`, **A share of the board**, Stats on a share is `docs/stats.md`, **On a share**,
and the table is in `docs/data-model.md`. The workshop page is private:
https://claude.ai/artifact/XF8FycrBBp5tE6bqkLaTUj, and so is the page of four states rendered from
the built app on 5 October: https://claude.ai/artifact/Ud6QkNxqDzfAXQnKJxmeY3. Every choice was
the recommendation except the top of a shared page, which is marked.

**What the workshop changed.** This section offered a fixed share: covers, titles, columns,
ratings and progress, the URL shown once, and no Stats. The user asked to choose what a share
shows, as Settings chooses a board's columns, so every part but Backlog became a box. The link
became copyable at any time, and Stats went on.

### Decided before the renders

- **What a share is:** the board, Coming soon and Stats, read-only. No search, no Discover, no
  journal and no Settings.
- **Every part but Backlog is a box**, stored with the share: Playing, On Hold, Completed, Dropped,
  Coming soon and Stats. Backlog always shows. **Stats is whole.** It shows every finish and counts
  what was dropped, as a number with no titles, whichever columns are ticked.
- **Notes never**, whatever is ticked. No route a share reaches selects from `notes`, and a test
  holds that.
- **Your name is a box, off until ticked**, with the name printed beside it. It is
  `users.display_name`: fixed at first sign-in, and the part of an email before the @ when the
  provider sent no name.
- **The year control**, opening on the latest year, as the board's does.
- **One link per board, copyable from Settings at any time.** Stopping kills the address, and
  sharing again makes a new one.
- **The visitor's own theme.** A share has no theme menu, and nothing about the owner's theme is
  stored.

### Decided from the renders

- **The top of a share is a banner, C. The user picked it over the recommended heading, A.** A
  strip across the top reads *A board shared from HobbyTracker. It's read-only.*, with *Make your
  own →* at its end. Under it, the heading is *Jimmy Dao's games* with the name ticked and *Games*
  without. **The banner never carries the name**, so it appears once. That was settled after the
  renders, because C with the name in both read it twice. The first card sits 206px down at
  1440 × 900 and 295px down at 390 × 844.
- **Settings gets a Sharing group after Columns, holding one row that opens a dialog.** The row
  reads *Share this board…*.
  - **Before a link exists**, the dialog shows *No link yet*, the boxes and *Make the link*.
    Opening it makes nothing. The boxes start from what this browser's board shows, with Coming
    soon and Stats on and the name off.
  - **Once shared**, it shows the address and Copy, the columns beside the rest, *Stop sharing*
    and *Done*. A box writes as it is ticked, with no Save.
  - It is 448 × 402 before a link exists and 448 × 394 after, and 414px tall on a phone.
  - The alternatives put a second Columns list straight under the panel's own. Kept open in the
    panel, they made it 1337px tall; opened from a row, 1413px.
- **Stopping asks first**: *Stop sharing? The link stops working for everyone who has it.*, in the
  delete tint, with a filled *Stop sharing* and Cancel. In the dialog it takes the footer's place.
- **A shared column keeps its sort control**, and the manual order is called *Board order* there,
  since it is not the visitor's.
- **A share addresses nobody.** Eleven phrases on the board and the Stats page are written to the
  owner, and a share uses one set of words whether the name is on it or not:

  | On your board | On a share |
  |---|---|
  | My order | Board order |
  | of the 8 games you started in 2026 | of the 8 games started in 2026 |
  | over 6 games you logged hours for | over 6 games with hours logged |
  | You and HowLongToBeat | Hours against HowLongToBeat |
  | over the 6 you rated | over the 6 rated |
  | in your backlog 42 days | in the backlog 42 days |
  | 1 without your hours | 1 without hours logged |
  | Back to your board | Back to the board |
  | Nothing to compare yet: log your hours on a game you finish. | Nothing to compare yet. |
  | Nothing on your board is waiting to come out. | Nothing on this board is waiting to come out. |
  | Read aloud: *You played 213 hours, against about 218 hours to beat* | *213 hours played, against about 218 hours to beat* |

- **A link that doesn't work** gets one card for unknown and stopped alike: *This link doesn't open
  a board*, *Whoever shared it may have stopped sharing, or part of the address may be missing.*
  and *Make your own board*. Rendered and not asked about.
- **The data credits sit at the foot of a share**, because a visitor has no Settings.

### Found while rendering

- **`ColumnSwitcher` renders outside a `DndContext`**, on dnd-kit's defaults, which answers this
  section's open question. With no drag context there is nothing on a share to drop onto. Its counts
  still come from `columnQuery`, which reads the signed-in library, so the share needs its own query
  for them.
- **The release calendar says "276 days ago" for a title that isn't out.** This is older than #9.
  A window stored at year, quarter or month precision begins on its first day, and `UpcomingRow`
  measures the distance from `releaseDate` without checking the precision. On 4 October 2026,
  Witchbrook (*2026*, stored as 1 January to 31 December) read *2026 · 276 days ago* with its wait
  bar full. It shows on a board and on a share alike. It is #11.

### Decided from renders of the built app

Four states the workshop never drew, rendered from the built app on 5 October 2026 and picked
there. All four were the recommendation.

1. **A twelfth phrase written to the owner**, which the table of eleven missed: the note under
   the Stats page's backlog. On a share: *"Added" is the day a title went on the board. Since 1
   October 2026 the board records when a title arrives in Backlog, and says "in the backlog" for
   those.* Picked over leaving it off a share.
2. **A write in the dialog that fails** says so in the spreadsheet row's failure line, `text-xs
   text-danger` and `role="alert"`, above the footer: *Couldn’t make the link. Try again.*,
   *Couldn’t change what the link shows. Try again.* or *Couldn’t stop sharing. Try again.* A box
   that fails springs back to what the link shows. Picked over saying nothing.
3. **While they work**, the buttons read *Making the link…* and *Stopping…*, held by
   `aria-disabled`. Picked over buttons that only dim.
4. **A share that cannot be reached** (a 5xx or no connection, not the 404) gets the dead link's
   card with *This board didn’t load*, *HobbyTracker couldn’t be reached just now. The link itself
   may be fine.* and *Try again*, which asks again. Picked over the app's red error line on an
   empty page.

**Taken from this section's words over the workshop's mock**, and shown on the same page under
*As built*: the address field shows the whole address, scheme included, which is exactly what Copy
copies; Dropped starts ticked when this browser's board shows it; Backlog's *at your pace* line is
left off a share, because the pace is the visitor's; and a share's Coming soon does not remember
being folded, or it would fold the visitor's own too.

### Built

- **`board_shares`**, migration `20261005053507_AddBoardShares`. `parts` is a `text[]` of
  `SharePart` names (`InProgress`, `OnHold`, `Completed`, `Dropped`, `Upcoming`, `Stats`; Backlog
  is not a part). It is unique on `token`, which is `varchar(22)`, and on `(user_id, hobby_id)`. It
  cascades from `users` and restricts to `hobby_lu`.
- **`ShareService`**, which is both `IShareService` (the owner's, through `ICurrentUser`) and
  `IShareLookup`. `FindAsync(token)` answers an `OpenShare` with its name chosen in the query:
  `share.ShowsName ? DisplayName : null`. `OpenShare.Shows(column)` answers off for a column added
  later.
- **`ShareController`**, `[Authorize]`, at `/api/share?hobby=`. `GET` answers a `JsonResult` that
  can be `null`. `POST` answers 201, or 409 when the insert's 23505 names
  `ix_board_shares_user_id_hobby_id`. `PUT` and `DELETE` answer 404 when the board has no link.
- **`SharedController`**, `[AllowAnonymous]`, at `/api/shared/{token}`, with `library`, `years`,
  `upcoming`, `stats` and `stats/years`. `library` requires `status`, and it and `stats` bound
  `year` to 1–9998. Every refusal is the same `NotFound()`. It holds `IShareLookup`,
  `ISharedLibrary` and `ISharedStats`, and nothing else.
- **`LibraryService`**: `BoardQuery(int ownerId)`, with the signed-in methods passing `user.Id`.
  The column's projection is `CardsWith(note)`, spliced by a `Rebind` visitor, with
  `LatestNoteOf(ownerId)` in the slot for a board and `NoNote`, a constant null, for a share.
  `ItemAsync` keeps its own copy, so the docs' count of projections holds. `BacklogAsync(ownerId,
  hobby)` and `YearsOfAsync(ownerId, hobby, columns?)`. `ISharedLibrary`'s three reads are explicit
  interface implementations.
- **`StatsService`** is both `IStatsService` and `ISharedStats`, with the owner explicit through
  `Passes(ownerId, hobby)`.
- **`Program.cs`** registers each class under both of its interfaces, and **`LogStatus.cs`** names
  `OpenShare.Shows` as a fourth place a new status needs a decision.
- **`lib/voice.ts`**: `Voice = 'own' | 'shared'` and `Voiced<T>`. All twelve phrases are pairs,
  side by side: `SortSelect`'s *My order*; games' `columnHours.withoutPlayed` and
  `describeCompared`, and `releases.empty`; `StatsPage`'s `WORDS`; `RatingSpread`'s line, `waited`
  in `stats.ts`, and `BacklogList`'s note.
- **`HobbyDefinition.share`**, for games only: the heading, what the dialog says sharing does, and
  the credits at a share's foot.
- **`board/Column.tsx`** is split into `Column` (yours) and `ColumnFrame` (the frame both wear),
  with `ColumnRequest`. `ColumnSwitcher` takes `requestFor`. `ComingSoon` takes `query`, `voice`,
  `remembers` and an optional `onOpen`, and exports `upcomingQuery`. `ALL_MANUAL` and the share's
  query keys are in `board/keys.ts`.
- **`lib/useModalPanel.ts`**, moved out of `EntryDrawer`: the keyboard follows the panel in, Tab
  stays inside, and Escape closes it.
- **`api/share.ts`**, **`api/shared.ts`**, and **`share/`**: `paths.ts` and `queries.ts`;
  `SharedFrame` (the banner, the heading and the credits) and `DeadLink`; `SharedColumn`;
  `SharedBoardPage`, with `Unreachable` and `isNotFound`, and `SharedStatsPage`; `SharingRow`; and
  `ShareDialog`, which writes one box at a time and sends the latest boxes next.
- **The routes** are in `App.tsx`, outside `RequireSession`, and Settings holds the row and the
  dialog. `e2e/support/database.ts` names `board_shares` in its TRUNCATE.

### Tests

`ShareEndpointTests` has 16 and `SharedBoardTests` 15, with `Infrastructure/SqlRecorder.cs` to
assert on what a route read: 750 backend tests, from 719. On the frontend `share/` has 52
(`ShareDialog.test.tsx` 22, `SharedBoardPage.test.tsx` 21, `SharedStatsPage.test.tsx` 9),
`SortSelect`, `columnHours`, `stats`, `ComingSoon` and `App` gained 8 between them, and
`index.css.test.ts` two rows a palette: 1034 frontend tests, from 956. End to end,
`e2e/share.spec.ts` has 4, and the whole suite of 190 passed.

The backend's tests were red first, on routes that did not exist, as were the frontend's first
cases, on modules that did not. The cases for the four states picked on 5 October were written
after their code, because the code had to exist to be rendered, so each was checked red by
planting the alternative that was not picked. Then every guard was checked by putting its fault
back, one at a time against the finished feature: 35 behind the API, 45 in front of it and 4 end
to end, each red on exactly the tests that name it, bar one that was rightly red on nothing. The
tables are in `docs/auth.md`, under **Sharing a board**.

### What the plan got wrong, or left out

- **"The dialog: making a link, a box written as it is ticked, Copy, and Stop asking first."**
  Four states were in neither the plan nor the workshop: a twelfth phrase written to the owner, a
  write that fails, a write on its way, and a share that cannot be reached. Rendered from the
  built app and picked on 5 October.
- **The switcher had to be told where a column's answer comes from.** It took `columnQuery`
  itself, which reads the signed-in library, so it takes `requestFor` now. And `columnQuery`
  returns a plain `ColumnRequest`, because TanStack types `queryFn` against the exact key and a
  `queryOptions` result will not widen to a request type two sources share.
- **EF 10 prunes a conditional on a captured value before writing SQL.** So `showNotes ? note :
  null`, with the flag captured, sends no `notes` at all, and planting it turned nothing red, as it
  should not. The version of that fault that reaches the database is a condition on the row, and
  only the SQL recorder sees it, because the answers are identical. `NoNote` does not rely on the
  pruning.
- **Two faults the plan's list of tests did not cover turned nothing red** when they were planted:
  a share's calendar remembering its fold, which would fold the visitor's own calendar, and a
  share's answers cached under the board's keys, which an owner following *Make your own* would
  see as note-less cards on their own board. Each has a test now.
- **The phone case end to end measured only what a gesture did.** A card made carriable, with
  nothing to hear the drop, moves nothing, so it passed. It now counts what dnd-kit registers on a
  share, which is nothing.
- **The Sharing group moved *Your data* down 107px.** On a 1440 × 900 window the spreadsheet's
  row now ends 3px under the fold and the delete row is below it, where #7 and #8 measured both on
  the first screen. Measured in the built panel; see `docs/design.md`, **Your data**.
- **The banner's link was the first accent ink on `well`.** Measured on every theme at 5.37:1 at
  its lowest, on Ember, and `index.css.test.ts` holds it now, with accent on `sunken`.
- **A fourth place a new `LogStatus` needs a decision**, `OpenShare.Shows`, and two docs' counts
  of those places were already stale: `docs/board.md` and `docs/data-model.md` both said two.

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

## 11. A release window that has begun · shipped

**Shipped and deployed 23 October 2026** (PR #78), the day it was picked up, after a workshop the
same day. No migration and no new variable. Both images were rebuilt and recreated, the API first,
and no base image had moved. The public site serves a new bundle carrying the quarter's heading and
the cancelled title's rule, each counted 0 in the one before it, and the running API carries
`ByLastPossibleDay` where `ByReleaseDate` was. The plan below is as it was written. What was
decided and built follows it, from **Decided from the renders** on.

**What.** The *Coming soon* calendar under the board says how far off each title is. For a title
announced only as a year, a quarter or a month, it measures from the window's first day. Once that
day has passed, the row says the title came out days ago, though it isn't out. Found on
4 October 2026 while rendering #9: Witchbrook, announced for *2026*, read *2026 · 276 days ago*,
with its wait bar full.

**Why it happens.**
- `ReleaseWindow.For` turns a vague date into the whole window, and `GameCatalogService` writes
  its first day to `media.release_date` (`ReleaseDate = window.Start`) and its last to
  `release_end`. That is right, and nothing stored needs to change: whether a title is out is
  decided from the last day, by `ReleaseWindow.NotOutOn`.
- `UpcomingRow` in `board/ComingSoon.tsx` hands `item.releaseDate` to `describeDistance` and
  `releaseProgress` and never tells either the precision. The label (`formatRelease`) and the group
  heading (`releaseGroup`) do read it, which is why *2026* is right and the distance beside it is
  not.
- So every vague window whose first day has passed reads *N days ago*, with a full bar. *2026*
  does all year, *Q4 2026* from 1 October, and *October 2026* from the 1st.
- **No test caught it, because the fixture has a shape the API never sends.** `upcomingItem` in
  `ComingSoon.test.tsx` sets `releaseEnd` to the same day as `releaseDate`, and its quarter case
  passes `'2027-03-31'`, the window's *last* day. The API sends the first.

**Where it shows:** the calendar on your board, and a share's calendar once #9 is built.

### Decide at pickup

These are words people read, so render them before picking.
- **What a begun window says in place of a distance.** Recommended: nothing. The label alone,
  *2026*, already says what is known. The alternatives are the window in words (*due this year*,
  *this quarter*, *this month*) or a count to the window's last day, which is a day nobody
  announced.
- **What its bar shows.** Recommended: no bar. The bar says how far along a wait is, and for a
  begun window nobody knows. A full bar says it is over.
- **Whether a window not yet begun keeps counting to its first day.** *Q1 2027 · in 3 months* is
  when the window opens, not when the game comes out.

### Tests first

- **Fix the fixture first.** `upcomingItem` builds the window the API sends: `releaseDate` the
  first day of the unit, and `releaseEnd` the last, by precision. The quarter case becomes
  1 January to 31 March 2027. The existing cases have to stay green on the corrected shape, or one
  of them was passing on the wrong one.
- A year, a quarter and a month whose window has begun never print *ago*, and show what the pick
  says. Red before the fix.
- A day-precision title still reads *in 12 days*, *tomorrow* and *today*.
- A window not yet begun reads what the pick says.
- **Put the fault back.** With the distance read off `releaseDate` alone again, the begun cases
  go red.

### Decided from the renders

Shot from the real calendar behind throwaway `?begun=`, `?ahead=`, `?bar=`, `?cancel=` and
`?group=` switches, with Vite alone, every `/api/` request answered in the browser, and the clock
pinned to 23 October 2026. The titles, covers and windows were the local catalogue's 43 unreleased
games. Four windows it had no example of were staged on real titles, and the page said so: Kena as
October 2026, Tides of Annihilation as Q4 2026, Judas as November 2026, and Little Devil Inside as
9 December 2026 and cancelled. Each option was shot under both orders, the first-day one and the
last-day one, because the order changed how two of them read. It all went on one private page:
https://claude.ai/artifact/VxWb95empNvurbRX4FtZpQ. One round, four questions, and every pick was
the recommendation. Two of the questions were not in the plan.

| Choice | Picked | Against |
|---|---|---|
| A window that has begun | **Its label alone, and no bar**, the plan's recommendation: *2026*, *Q4 2026*, *Oct 2026* | the window in words, *due this year*, which repeats the heading above it once a window heads itself; *within 2 months*, counted to the window's last day, a day nobody named, with a two-tone bar |
| A window not yet begun | **Its label alone, and no bar.** A count and a bar belong to a day | counting to its first day, as before, which said *2027 · in 2 months* about a whole year and ran backwards down a list ordered by last day; a range, *in 2–14 months*, with a two-tone bar faint for most of its length |
| A cancelled title with a date | **No count and no bar:** *Dec 9, 2026 · Cancelled* | leaving it counting toward a date that is not coming |
| Where a window sits | **At its last day, in #11.** The narrowest first when several close on one day, and **a quarter under a heading of its own** while its last month has one | the first day, with window headings ahead of the days they cover, which repeats nothing but leads the list with its vaguest titles; leaving the order to a #16 |

Found in the renders before the questions were asked:
- **Seven titles read *2027 · in 2 months*.** That is the plan's third question with the real
  catalogue's answer.
- **A window on its first day read *today*:** *Q4 2026 · today* on 1 October. Begun includes the
  day a window opens, and the plan's *ago* test would not have caught it.
- **A cancelled title counted down**, with its bar filling, because the calendar keeps a cancelled
  title whatever its date.
- **Headings repeated.** The local catalogue's calendar read *2027, Jan 2027, Feb 2027, 2027*, a
  Q2 window filed under its year after February. The staged windows opening on 1 October split
  the top into *2026, This month, 2026, This month*. React logged *Encountered two children with
  the same key* for each.
- **A month read sooner than a day inside it:** *Nov 2026 · in 9 days* above *Nov 5, 2026 · in 13
  days*, with a fuller bar.

### Built

- **`countsDown(precision, status)`** in `lib/release.ts`: a day, and not cancelled. `UpcomingRow`
  asks it before `describeDistance` and `releaseProgress`, and draws no bar when there is nothing
  to fill one with. Neither of those two changed.
- **`releaseGroup` gives a quarter the key `2027-Q1`** while the month it closes on is inside the
  twelve months that have headings of their own, and its year beyond. `formatGroup` reads the key
  as the label does, *Q1 2027*. The twelve is now `OWN_HEADING_MONTHS`, since two precisions share
  it.
- **`LibraryService.ByLastPossibleDay`** replaces `ByReleaseDate`: `release_end`, then
  `release_date` descending, then the title, with the undated last as before. No migration, and no
  downcast.
- **Comments that called a vague date the window's last day** described IGDB's shape, not the
  API's, in `formatRelease`, `isRecentRelease`, `release.test.ts` and `ReleasePrecision`. They
  describe what the API sends now.

### Tests

The fixture came first, as planned. `upcomingItem` in `ComingSoon.test.tsx` builds the window the
API sends, through `windowAround`, the test's copy of `ReleaseWindow.For`. All 17 existing cases
stayed green on the corrected shape before anything new was written.

Then 13 cases red against the code before the change. Six are in `ComingSoon.test.tsx`: a begun
window, a window on its first day, a window not yet begun, a cancelled title, *never repeats a
heading*, and the quarter's heading in the existing *never prints a day that was not announced*.
Seven are in `release.test.ts`: four for `countsDown` and three for the quarter's heading. Two new
cases are guards and were green before: a day still counts down in words and in its bar, and a
quarter past the horizon still joins its year. The backend's
`Orders_by_the_first_possible_day_with_the_undated_last` became
`Orders_by_the_last_possible_day_with_the_undated_last`, and
`Puts_the_narrowest_window_first_when_several_close_on_one_day` is new. Both were red.

The finished build ran 804 backend cases, 1,188 Vitest cases in 59 files and 201 e2e specs, all
green, the e2e suite in 5.6 minutes. None of the e2e specs needed changing: they read the
calendar's titles and its last heading, and neither moved.

Each fault was planted alone against the finished build by a script that restored the file byte
for byte, compared afterwards. Frontend faults ran the two Vitest files, and backend faults ran
`ComingSoonTests`.

| Fault planted | Red |
|---|---|
| The distance read off `releaseDate` alone again, the plan's fault | 5: begun, first day, not begun, cancelled, and *never prints a day that was not announced* |
| The bar drawn for every dated row again | 3: begun, not begun, cancelled |
| A cancelled title counted again | 2: `countsDown`'s case and the row's |
| A quarter filed under its year again | 4: three on the quarter's heading, and *never repeats a heading* |
| A quarter's horizon measured from its first month | *gathers a quarter under its year once its last month is past the horizon* alone |
| The calendar ordered on the first day again | both order cases |
| No narrowest first among windows closing on one day | *Puts_the_narrowest_window_first_when_several_close_on_one_day* alone |

### What the plan got wrong, or left out

- **It asked about the words and the bar, and missed the order.** Ordered on the first day, the
  list repeated its headings. The case #11 is about made that worse, since two windows opening on
  one day split a heading in two. Nothing showed it until a list held a quarter, a later month and
  a year at once, and the local catalogue did.
- **It said the label and the heading were right.** The label was. The heading was right for any
  one title and wrong for a list, because a quarter's year heading could appear twice.
- **It left the window not yet begun open**, and the real catalogue settled it: seven titles read
  *in 2 months* about the whole of 2027.
- **Begun includes the first day**, and on that day the row said *today*. A test pins it now.
- **A cancelled title was the same fault in another shape**, and the same rule fixes it.

---

## 12. The journal from a search result · shipped

**Shipped and deployed 7 October 2026** (PR #68), the day it was asked for, after a workshop the
same day. The plan below is as it was written; what the build decided and found follows it, from
**Decided from the renders** on.

**What.** A title in the search strip that is already on your board opens its journal when its
name is clicked, as a card's name does. Asked for on 7 October 2026: search for a game, add it,
and write about it without going to find its card.

**How it fits.**
- `BoardPage` already opens the drawer from two places, a card and a *Coming soon* row. The strip
  becomes a third, through the same `openJournal`.
- The strip already knows which column each result is in, from `useAddToBoard().statusOf`. It
  learns a new title's column only once the server has answered the add (`onSuccess`), so a title
  cannot open a journal before its pass exists.
- A title that is not on your board stays text. There is no pass to open.
- Every board gets it, because `BoardSearch` is every hobby's. Holding it to games would be a
  branch on the slug.

**Focus on the way out has to be per door.** `BoardPage` hands focus back to
`cardTitleId(mediaId)`, which is right for a card only. A tile needs an id of its own, because a
title on your board is often a card as well. So `openedFrom` holds the id of the element to go
back to, and each door says which.

**Found while planning: the calendar's door already loses the keyboard.** Its title button has no
id, and a calendar title is not a card, so closing a journal opened from *Coming soon* hands focus
to nothing. This was read from the code, and its test goes red before any change. The per-door id
fixes it in the same change.

### Decide at pickup

- **How an openable title looks on the strip.** A card's title is plain at rest and underlined on
  hover. On the strip, titles that open and titles that do not sit side by side. Render it first.
- **The Discover wall.** Its tiles (`WallTile`) are on a page with no drawer. Recommended: not now.

### Tests first

- `SearchResult.test.tsx`: a title on your board is a button that opens its journal, and one that
  is not on it is text.
- `BoardSearch.test.tsx`: a title added from the strip opens its journal straight away.
- `BoardPage.test.tsx`: the strip's title opens the drawer; closing it hands focus to the tile
  rather than to the card with the same title; and closing one opened from the calendar hands
  focus back to the calendar row. The last is red before any change.
- `e2e/search.spec.ts`: search, add, open the journal from the strip, Escape, and focus is on the
  tile.
- **Put the faults back:** the tile handing focus to `cardTitleId`, and the title as a button
  while it is not on your board.

### Decided from the renders

Three looks, A, B and C, were shot from the real app: at 1440 and 390, at rest, under the pointer
and with keyboard focus, and on all eight themes. They were put on one private page with the
contrast measured in the browser: https://claude.ai/artifact/F7cNF6poVAme3CD8iBWYCL. The strip
was staged from the #9 workshop's sample board, four titles on your board and four not, because
Docker was down and the IGDB stub has no covers.

| Choice | Picked | Against |
|---|---|---|
| How a name that opens looks | **B, the accent**, the user's pick | A, a card's plain name, which was the recommendation; C, a dotted underline |
| The Discover wall | **Not now**, the recommendation | the same on Discover, whose page would need a drawer of its own |

Accent on the tile measured 5.11:1 on Ember up to 9.11:1 on Console. On Ember the accent is red,
so a name that opens reads like a warning there. The page and the option both said so before the
pick.

### Built

- **`SearchResult`.** On your board, the name is a button inside the `<h3>`, with
  `text-left text-accent hover:underline` and `id={resultTitleId(mediaId)}`. The two-line clamp
  moved off the heading and onto a span inside the button. A name not on your board is unchanged.
- **`onOpen` is required** on `SearchResult` and on `BoardSearch`. The strip only ever sits over a
  board, and a board always has a journal, so an optional prop would have existed for the tests
  alone.
- **`BoardPage`.** `openedFrom` holds an element's id rather than a media id.
  `openJournalFrom(returnTo, mediaId, askHowLong)` is the one way in, and each of the three doors
  names its element: `cardTitleId`, `calendarTitleId` and `resultTitleId`.
- **`ComingSoon`.** The row's button carries `calendarTitleId`, which is the calendar fix.

### Tests

`SearchResult.test.tsx` gained 3 cases and changed 1. `BoardSearch.test.tsx` gained 2, changed 1,
and passes `onOpen` on its 23 renders. `BoardPage.test.tsx` gained 3, and its two mounted-twice
cases now count cards on the board (see below). `e2e/search.spec.ts` gained 1. Each fault was
planted alone, against the finished build:

| Fault planted | Red |
|---|---|
| The strip's door hands focus back by `cardTitleId` | *hands focus back to the search result, not the card*, and no other |
| The name a button whether or not the title is on your board | *leaves the name as text*, and four older tile cases that count a tile's buttons |
| The calendar row without its id | *hands focus back to the calendar row*, which was also red before any change |
| The clamp back on the heading | *wears the accent on a name that opens, and keeps it to two lines* |
| The name without the accent | the same case |
| A move leaving the views of both columns in the cache | *does not bring a moved card back*, counted on the board |
| A removal leaving them | *does not bring a removed card back*, counted on the board |

The e2e case could not be shown red first, because Docker was down while the tests were written.
It was checked afterwards by planting the first fault: with the strip's door handing focus back
by `cardTitleId`, *a game just added opens its journal from the strip* fails at `toBeFocused()`,
since the keyboard goes to the card behind. The full suite, 191 specs, passed on the finished
build.

### What the plan got wrong, or left out

- **The clamp.** The plan did not see it coming. Measured in Chromium before the build, a button
  inside today's clamped heading ran Zelda's name to three lines, because a button lays out as an
  inline-block. jsdom has no layout, so the Vitest case reads the structure, with the measurement
  in its comment.
- **Two existing tests counted the strip's tile as a card.** `BoardPage.test.tsx`'s mounted-twice
  cases counted every button on the page with the title's name, and one of them types into the
  strip. Once the name was a button, it counted 2 with the board right. Both now count inside
  `[data-board]` through `cardsNamed`, and both still go red without the fix they guard.
- **The contrast was already covered.** `index.css.test.ts` asserts `accent` on `surface` on every
  theme, and the tile is `surface`. It gained a comment naming the use.

---

## 13. A column dropdown in the journal · shipped

**Shipped and deployed 7 October 2026** (PR #70), the day it was planned, after a workshop the
same day. The plan below is as it was written. What was decided and built follows it, from
**Decided at pickup** on.

**What.** In the drawer, the current pass's heading (the column's name, above the rating) becomes
a control that moves the title to another column. Asked for on 7 October 2026.

**It reverses a settled decision, and the reason for that decision has gone.**
- `docs/journal.md` lists *No status control* as settled, and the comment above `EntryForm`
  repeats it. Dragging is the gesture, the rules about which pass a move touches live on the
  server, and a second way in would need its own copy of them.
- The card's `⋯` menu has since become a second way in without a copy. It calls the drag's own
  mutation, `useBoard().move`, and the server applies the transition table. The dropdown should be
  a third caller of that mutation, which also refreshes the columns, the years, the calendar and
  the strip's chips. Both places need to say why the decision changed.

**The autosave can undo a move.** This was read from the code and has not been run.
- Every autosave `PUT` carries the status: `pick()` in `api/logEntries.ts` writes it, and
  `EntryForm` sends `status: entry.status`. It carries every date as the form holds it.
- The form re-seeds from a refetched pass only when nothing is owed, so a move made while an edit
  is pending leaves the form holding the old dates.
- Type a rating, then pick Playing on a Backlog pass within half a second:
  - If the board's refetch lands first, the timer sends the old, empty Started against a pass whose
    start the move has just stamped. `dateFieldValue('', stamped)` is `null`, so the save clears
    the start. A Playing pass with no start is in no year, so the card leaves the board for the
    year being shown.
  - If the save goes first, it sends the old status, and the server moves the pass back while the
    board shows it moved.
- The likely fix is to send whatever is owed and wait for it before moving, then let the form
  re-seed from the moved pass.

**Leaving Completed starts a new pass.** The transition table inserts rather than edits, so
picking Playing on a Completed pass makes a replay: the form empties, and the finished pass drops
to *Earlier passes*. A drag does the same. In the drawer, though, the control sits on that pass's
own heading, so it reads as correcting the pass rather than replaying the title.

**Other cases:**
- **A column taken off in Settings** is not offered, but a pass in one must still show it as
  chosen. #12 makes that reachable: a title in a hidden column has no card, and its search tile
  can now open its journal. The platform select already keeps a value its list no longer has.
- **A title not out yet.** A tile offers it only *Add to calendar*, and a calendar row has no
  menu, so nothing today moves one out of Backlog. The dropdown would be the first thing that can.
- ***How long will it take me?*** goes when the pass reaches Completed or Dropped
  (`hasFinishAhead`).
- **Every hobby**, in its own words (Watching, Watched), from `columnLabel`.

### Decide at pickup

- **What another column does to a Completed pass:** a replay as a drag makes one, with wording
  that says so, or behind a confirmation.
- **The look.** The heading shares `BAND_HEADING` with *Journal*, because matching is the point of
  them, and a control in its place breaks that. Render it first, at 390px as well.
- **What a title that is not out yet is offered.**

### Tests first

- **The race, reproduced red before any fix:** a rating typed, then a move within the delay. Both
  survive, with the dates the move stamped.
- A move calls the move route, not the `PUT`. `boardServer().transitions` records it.
- A pass in a hidden column shows that column as chosen, and the column is offered nowhere else.
- From Completed: the drawer shows the new pass, and the finished one is under *Earlier passes*.
- e2e: a move from the drawer puts the card in its new column, and a reload keeps it there.
- **Put the faults back:** the move sent through the `PUT`, and the move made without waiting for
  the pending save.

### Decided at pickup

| Choice | Picked | Against |
|---|---|---|
| Another column on a Completed pass | **Ask first**, the recommendation: the drawer says a new pass starts and the finished one stays under *Earlier passes*, before anything moves | the replay said in the options; said afterwards; no control on a Completed pass |
| A title not out yet | **Every column**, the recommendation. The board already keeps an early build outside Backlog on purpose (*A second thing that narrows a column* in `docs/board.md`), and leaving Backlog takes it off the calendar | Backlog and Dropped only; no control |
| The pass while a move is on its way. **Not in the plan**: found reading the code | **Read-only**, the recommendation: anything owed is sent first, then the move, and nothing can be typed until the moved pass is back | editable, with what is typed held and sent afterwards, which loses it if the drawer is closed mid-move |

Read from the code before the questions were asked:
- **The `PUT` writes whatever status it is sent** (`LogEntryService.UpdateAsync`), so the plan's
  reading of the race holds.
- **The plan's fix leaves one hole.** A value the rules refuse, held across a move, blocks the
  re-seed, so the next write sends the old empty Started and clears the start the move stamped. So
  the form re-seeds field by field: a field not touched since the server last agreed takes the
  server's value.
- **Nothing can correct a Completed pass's column in place.** Leaving Completed always inserts, from
  any door, and the drawer's control is no exception.

### Decided from the renders

Three forms of the control were shot from the real drawer behind a throwaway `?col=` switch, Vite
alone with every `/api/` request answered in the browser: at rest, under the pointer, with keyboard
focus, opened, with a column taken off in Settings, on five themes, at 390px, and in the modal. They
went on one private page with the measurements: https://claude.ai/artifact/KnyaXyhZBd4GTj8V77TTKE.

| Choice | Picked | Against |
|---|---|---|
| The control | **A, the heading is the control**, the recommendation: the column's name with a chevron opens a list of the board's columns, the current one ticked | B, the heading unchanged with a *Move* button at the end of its row; C, the phone switcher's segments in its place |
| The confirm on a Completed pass | **A tinted box**, the user's pick | a line in the shape of the Delete confirm, which was the recommendation |
| While a move is on its way | **The pass dims**, beside *Moving…*, the recommendation | *Moving…* alone |

- **A changes nothing at rest:** its row is 16px and Rating sits 44px under the rule, exactly as
  today's heading, at 1440 and at 390. B added 4px and C 16px.
- **A native `<select>` was ruled out by measurement.** In Chromium 151 on Windows, four presses of
  ↓ on a closed select fired four `change` events, Playing, On Hold, Completed and Dropped. Every
  change here is a move, so arrowing past Completed would stamp a completion on the way.
- **The tick wears the accent, which is red on Ember.** The page said so before the pick.

### The race, reproduced red before the fix

The control was built first with the move made straight away, as the menu makes one, and both
orders the plan described were then shown red in `BoardPage.test.tsx`, against a fake that keeps
the passes the way the API does. A rating of 8.5 typed, and Playing picked from Backlog inside the
half second the form holds it:

| Order | The one save sent | The server was left with |
|---|---|---|
| The move's refetch lands first | `InProgress`, 8.5, Started `null` | Playing, 8.5, **no start**: in no year, so off the board |
| The save goes first (the move's answer held back) | `Backlog`, 8.5, Started `null` | **Backlog**: the move undone, under a board showing it moved |

### Built

- **`journal/ColumnControl.tsx`, new.** The heading is a button named *Column: Playing*, with the
  column's name inside it in a span carrying the region's label id, and a drawn chevron. It opens a
  `role="group"` named *Move to*, the card menu's pattern, of the board's columns, with the current
  one `aria-current` and ticked in the accent, and a hidden current column added to the list in
  board order. Escape stops at its container and hands the keyboard back, and a press elsewhere
  closes it, both as the card's menu does. While a move is on its way it names where the title is
  going, says *Moving…* beside itself, and is `aria-disabled`.
- **`EntryDrawer`.** `columns` and `onMove` are required props from `BoardPage`, as #12 made
  `onOpen` required. `PassSection` is handed its heading as a function of the region's id, and the
  `lead` flag is gone. The Completed question is `NewPassQuestion`, the tinted box: its yes takes
  the keyboard and is described by the question. A failed move says *Not moved.* and the reason
  under the heading. `moveTo` runs the order: `flush()`, await `writes`, `onMove`. Every save goes
  through `savePass`, on `mutateAsync`, and is chained into `writes`.
- **`EntryForm`.** A `ref` handle with `flush()`. `moving` holds it still: a capture-phase gate on
  change events at the `<form>`, and checks in the ×, the rating wheel and the hours wheel, with
  `aria-busy`, `opacity-50` and `pointer-events-none`. `agreed` holds the seven values rather than
  one string, and the re-seed takes the pass's value for each field not touched since, run when the
  pass changes.
- **`useBoard`.** `moveAndWait` is the move as a promise, and `onSettled` returns the title's
  refetch, so the move is not over until a journal open on it has the moved pass.
- **A hold on the autosave timer during a move was written and taken out.** Once the form sends what
  it owes first and takes no edit until the move is over, nothing valid can be owed mid-move, and no
  test could show the hold doing anything. Planting the flush's removal (F03 below) is what showed
  where it would have mattered.
- **The tick is drawn, where the renders showed a `✓` glyph.** The glyph comes from a fallback font,
  which differs from phone to phone, and the chevron beside it was drawn already.

### Tests

`EntryDrawer.test.tsx` gained 15 cases in *EntryDrawer, moving the title*, and its six existing
renders take the board's two props through `fromBoard(hobby)`. `BoardPage.test.tsx` gained 7 in
*BoardPage, moving a title from its journal*, on `passesOnServer`, the fake that keeps a title's
passes as the API does, with `transition` copying `TransitionAsync`'s table. `journal.spec.ts`
gained 3: a move kept through a reload, the race against the real API, and a replay from the
journal with its question. The full suites passed on the finished build: 1064 Vitest cases, 194
e2e specs and the backend's 756.

Each fault was planted alone against the finished build, by a script that restored the file byte
for byte, with checksums compared afterwards. The unit cases ran for every row, the e2e cases for
the rows that say *in a browser*:

| Fault planted | Red |
|---|---|
| The move sent through the `PUT` | 13 cases, among them *moves through the move route, never the PUT*, both races and the refused rating; in a browser, *a move from the journal puts the card in its new column*, at Started, since a `PUT` stamps nothing |
| The move made without waiting for writes in flight | *sends what it owes before it moves, and moves only once that write has been answered*, and no other |
| The move made without sending what is owed first | the save-first race and the ordering case. **Not the refetch-first race**, which the field-by-field re-seed makes safe on its own; nor, in a browser, the e2e race, for the same reason, since a local API always answers the refetch first |
| The re-seed all or nothing again | *keeps the start a move stamped while a refused rating waits to be corrected* |
| In a browser, the code before the fix: the move made at once, and the all-or-nothing re-seed | *a rating typed just before a move from the journal is kept*: Started stayed empty |
| No gate on change events while a move is on its way | *dims the pass and says Moving… until the move is over, and takes nothing meanwhile* |
| The ×, the rating wheel or the hours wheel not held, one at a time | the same case, each time |
| A second move offered while one is on its way | the same case |
| The move not waiting for the journal's refetch | *holds the pass still until the journal has the moved pass under it* |
| The heading naming where the pass was, mid-move | that case, and *dims the pass…* |
| A Completed pass moved without asking | *asks before…*, *leaves a Completed pass where it is when the question is cancelled* and *starts a new pass from a Completed one when told*; in a browser, *another column on a finished pass asks first* |
| The board's list ignored, every column offered | *offers no column taken off in Settings* |
| A hidden current column left out of the list | *still names a column taken off in Settings while the pass is in it* |
| Escape in the list reaching the drawer | *closes the list on Escape and hands the keyboard back, leaving the drawer open* |
| The keyboard not handed back after a pick | *hands the keyboard back to the heading once the move is made* |
| The question not taking the keyboard | *asks before another column starts a new pass from a Completed one…* |
| A failed move saying nothing | *says so when a move fails, and still names the column the pass is in* |

- **The hidden-column row was planted by accident first.** The plant meant to offer every column
  was written `X ?? cond ? a : b`, which parses as `(X ?? cond) ? a : b`: it planted the other
  fault, and the case for that one caught it. Both rows are kept; the intended one was planted
  again.
- **The e2e race could not be shown red first**, because the fix was in before it was written. It
  was shown red by planting the code before the fix. **Its first version reloaded straight after
  Close**, and planting the move made at once turned it red for that reason instead: the rating was
  still owed, and the reload aborted the write a close sends. It now waits for *Moving…* to go and
  the dialog to say *Saved*, which is `CLAUDE.md`'s warning about a reload racing a drag, arriving
  from the journal.

### What the plan got wrong, or left out

- **Its fix was right as far as it went, and three things more were needed.** "Send whatever is
  owed and wait for it before moving" left a refused value held across a move, which blocked the
  re-seed until the field-by-field one replaced it. "Wait for it" had to mean every write still in
  flight, because two can be. And the drawer's hold had to last until the journal's refetch, so
  the board's move had to wait for that refetch too.
- **What the pass does while a move is on its way was not in it.** It was found reading the code,
  and asked before any code: read-only.
- **It said *dropdown*, and a native one is unusable here,** measured: see *Decided from the
  renders*.
- **Escape inside the drawer was not in it.** The drawer closes on an Escape heard at the
  `document`, so the list has to stop its own.
- ***Moving…* is a second `role="status"` in the dialog.** `passSaved` in the e2e support expects
  one, so no spec may wait for *Saved* mid-move. Written into `docs/journal.md`.

---

## 14. Put a finished pass back · shipped

**Shipped and deployed 8 October 2026** (PR #72), the day it was found, after a workshop the same
day. The plan below is as it was written. What was decided and built follows it, from **Decided
at pickup** on.

**What.** Moving a title out of Completed gets a second answer besides a new pass: *it was never
finished*, which puts this pass in the column picked and clears its finish date. Asked for on
8 October 2026.

**What happened.** A game in Playing, started 17 September with nine notes, was moved to Completed
by mistake at 03:14 Eastern on 8 October 2026. At 09:08 it was moved back to Playing, and the pass
under *Earlier passes* was then deleted to tidy up. That was the real pass, and its notes went with
it. They were put back from the nightly backup the same morning; see *Backups* in
`docs/deploy.md`.

**Why nothing could undo it.**
- **A move into Completed edits the pass, and a move out of it inserts one.**
  `LibraryService.TransitionAsync` sets the status in place for every move but one leaving
  Completed, which adds a new pass so that a replay cannot overwrite a finished playthrough. So the
  mistake turned the real pass Completed, and the move back started a blank pass above it.
- **The drawer then offered two deletes, and each loses something.** The blank pass is current,
  and the real one sits under *Earlier passes*. Deleting the blank one leaves the real one in
  Completed, and *nothing anywhere corrects a Completed pass's column in place*
  (`docs/journal.md`). Deleting the real one takes its notes, which is #15.
- **`docs/journal.md` gave this exact case as the reason a pass can be deleted**: *a pass that
  never happened — the ×2 a mistaken drag to Completed and back leaves behind*. Of the two, the
  one that never happened is the blank one, and deleting it fixes nothing. That bullet now says so.

**It reverses a settled decision, as #13 did.** The insert protects a finished playthrough from a
replay, and the comment above it says editing in place *would silently destroy the completion
record*. A second answer keeps the replay as the default, so that still holds, and makes the
correction something asked for. The comment and `docs/journal.md` both need to say why the rule
changed.

### Decide at pickup

- **Where the second answer goes.** Recommended: in #13's tinted box, beside *Start new pass*,
  worded as a correction, such as *Not finished — move it back*. Render it, at 390px too.
- **Whether a drag gets one.** A drag does not ask (*Leaving Completed asks first* in
  `docs/journal.md`). Recommended: an *Undo* after any move, which also catches a slip into
  Dropped, since a mistaken drag is the likeliest way in. The alternatives are a question on a
  drag out of Completed, or the drawer alone.
- **What the history says.** The correction goes through tracked entities, so
  `StatusHistoryRecorder` writes *Completed → Playing*. A slip undone within ten minutes folds away
  already; one undone hours later leaves both rows. Recommended: keep both, since both moves were
  made.
- **How the API is told.** Recommended: a flag on the move route, so the rules stay in
  `TransitionAsync`, rather than a route of its own.

### Tests first

- A pass moved to Completed and put back keeps its id, its start, its platform, its hours and its
  notes, and loses its finish date. Red before the change.
- Without the flag, leaving Completed still starts a new pass.
- A finish put back is no longer counted on the Stats page.
- e2e: Playing to Completed by mistake, put back from the journal, and after a reload there is one
  pass, in Playing, with its notes.
- **Put the faults back:** the correction made as a replay, and the replay made as a correction.
  Each turns its own case red.

### Decided at pickup

Asked on 8 October 2026, before anything was drawn. All three were the session's
recommendations, and two of them overturned the plan's.

| Choice | Picked | Against |
|---|---|---|
| A move out of Completed on the board | **The card asks first.** A drag or a `⋯` menu move out of Completed leaves the card where it is and asks the journal's question on the card, where Remove's confirm sits. It reverses *a drag does not ask* in `docs/journal.md` | an *Undo* after every move, the plan's recommendation; the journal alone |
| What the history says | **The mistaken finish is erased.** A put-back folds into the row that recorded the finish, whatever its age, as a shuffle inside ten minutes already does | both rows kept, the plan's recommendation |
| How the API is told | **A flag on the move route**, the plan's recommendation too | a route of its own |

Read from the code before the questions were asked:
- **An *Undo* is not a move back.** Undoing a replay has to delete the new pass, where a move back
  to Completed would mark the blank pass finished and leave two finishes. Undoing a move into
  Backlog has to put the start back, where a move to Playing stamps today. So an *Undo* needs a
  restore of its own, and it still misses a mistake noticed hours later, which this one was.
- **Keeping both rows restarts a Backlog wait.** Stats takes *in your backlog N days* from the
  pass's latest row, if that row says Backlog (`LibraryService`, the Backlog projection), so a
  Backlog title finished by mistake and put back hours later would read 0 days.
- **What a put-back does to the dates**, decided without asking. The pass keeps its id, start,
  platform, hours, rating and notes. The finish is cleared, then the target column's own rule
  applies, so Backlog clears the start as well. Dropped's rule leaves a finish alone, so for a
  put-back the finish is cleared first. It is offered for every column the question is asked
  about.
- **Stats needs nothing.** *Finished* counts passes in Completed with a finish in the year, so a
  pass put back leaves it by the same write.

### Decided from the renders

Three forms of the question were shot from the real drawer and the real card behind a throwaway
`?pb=` switch, Vite alone with every `/api/` request answered in the browser, on a staged board
where *Hollow Knight: Silksong* was moved to Completed by mistake at 3:14 that morning. They went
on one private page with the measurements: https://claude.ai/artifact/AYZjBfGjKjoy4b6Fpx4iWQ. Both
picks were the recommendations.

| Choice | Picked | Against |
|---|---|---|
| The question | **C, it asks what happened**: *Did you finish it on Oct 8, 2026?* with *Yes — start a new pass*, *No — move it to Playing* and *Cancel*. 72px in the drawer, the same as #13's box | A, one more button (*Never finished*) on today's sentence; B, two answers each with a line saying what it does, 184px |
| Where the card asks | **A row of its own** under the card's contents, the card's full width: 210px at 1440 | in place of the details row, where *Remove from board* asks: 111px beside the cover, so both answers wrapped |

- **The first shots put the card's question where *Remove from board* asks**, which is what the
  morning's pick said. At 1440 that is the column beside the cover, 111px wide, so every answer
  wrapped. The full-width row was shot as a second place before anything was shown.
- **The words are the same on the card and in the drawer.** The renders shortened the card's to
  *Yes — new pass* and *No — move to Playing*; the full-width row has room for the drawer's.
- **The card needs the finish date itself.** A card's `lastActivity` is `CompletedAt ??
  StartedAt`, and a Completed pass can have its finish date cleared by hand, since only the order
  of the two dates is validated. So `LibraryItemDto` gains `CompletedAt`, and the question says
  *Did you finish it?* with no date when there is none.

### Built

- **The server.** `StatusTransitionRequest` takes `NotFinished`, and `TransitionAsync` moves a
  finished pass in place when it is set: the finish is cleared, then the target column's own rule
  runs. Cleared first because Dropped's rule leaves a finish alone, and would keep the one being
  taken back and fall back to it for a start. The flag means nothing to a pass that is not
  finished. `LibraryItemDto.CompletedAt` is new, in both terminal projections.
- **The history.** `StatusHistoryRecorder` knows a put-back by what it is, a pass leaving Completed
  in place, which the board does for nothing else. It folds into the row that recorded the finish
  whatever its age, and writes nothing when no row recorded one. No signal passes from the service
  to the recorder, so the rewrite route takes a finish back the same way. Stats needed nothing.
- **The words** are `lib/finishQuestion.ts`'s, one set for both doors: `finishQuestion`,
  `REPLAY_ANSWER` and `putBackAnswer`.
- **The journal.** `FinishQuestion` replaces `NewPassQuestion`, with a second answer and both
  answers described by the question. `onPutBack` is a required prop beside `onMove`, and `moveTo`
  is handed the move to send, so a put-back takes the order every move takes.
- **The board.** `useBoard` holds `leaving`, and `moveOrAsk` turns a drag or a menu move out of
  Completed into a question; `replay`, `putBack` and `stay` answer it, and `putBackAndWait` is the
  journal's. `Card` takes `leaving: CardLeaving` and draws the question as a full-width row, which
  is what `flex-wrap` on `CARD_CLASS` is for. `BoardPage` hands the keyboard to the first answer,
  by `cardAnswerId`, when the question starts, rather than the card taking it on mount.
- **Every e2e spec that took a finished card out of Completed meant a replay**, eight of them across
  `board.spec.ts` and `journal.spec.ts`, and each now answers *Yes* through `answerFinished`.

### Tests

Written first and shown red, server and client separately: 14 backend cases red against the code
before the change, and 18 Vitest cases. The backend gained 15: five in `StatusTransitionTests`,
six in `StatusHistoryTests` (one of them, *a replay still leaves the finish where it was*, a guard
that was green before and stays green), two in `StatsEndpointTests` and two in
`LibraryEndpointTests`. The client gained `lib/finishQuestion.test.ts`, the drawer's put-back cases
in `EntryDrawer.test.tsx`, *BoardPage, a card leaving Completed*, the card's own cases in
`Card.test.tsx` and the request's in `api/library.test.ts`. The e2e suite gained three: a finish
put back by a drag, by a finger on a phone's segment, and from the journal, each read back after a
reload or from the API.

Each fault was planted alone against the finished build by a script that restored the file byte
for byte, with hashes compared afterwards. The rows marked *in a browser* also ran the three new
specs.

| Fault planted | Red |
|---|---|
| The put-back made as a replay: the flag ignored by the server | 11: the five put-back cases, four in the history and both in Stats. Not the rewrite route's case, which never sends the flag |
| The replay made as a put-back: leaving Completed always editing in place | 14 replay cases across the three files, among them *A_replay_still_leaves_the_finish_where_it_was* and *A_finish_still_counts_in_its_year_after_the_game_is_replayed* |
| The finish not cleared before the column's own rule | the two Dropped cases, and no other |
| The history folding a put-back only inside the ten-minute window | 5: four history cases, the rewrite route's among them, and the Backlog wait in Stats |
| A put-back with no recorded finish still writing a row | *A_finish_the_history_never_saw_is_put_back_without_a_row* alone |
| The column's projection without the finish | *A_card_carries_its_finish_apart_from_its_last_activity* alone |
| The moved card's projection without it | *A_moved_card_carries_its_finish_as_the_column_does* alone |
| A board move out of Completed made without asking | 9 in `BoardPage.test.tsx`: seven of the card's cases, and the two year cases that answer *Yes*. *Asks nothing of a card leaving any other column* stays green, as it should. In a browser, the drag and the phone's segment |
| The card's *No* sent as a replay | *puts the pass back when it was never finished*; in a browser, the drag and the phone's segment |
| The journal's *No* sent as a replay | 3: the drawer's put-back case, its order case, and the board's journal put-back; in a browser, the journal's spec |
| The journal's *No* sent at once, outside the order a move is made in | *puts a pass back in the order a move is made, sending what it owes first* alone |
| The card's question dated by its last activity | *asks without a day when the finish has been cleared, never naming the start instead* |
| The question's day read in UTC | *names the day here rather than in UTC* |
| The question's answers left to start a drag | both press cases in `Card.test.tsx` |
| The keyboard not handed to the card's question | the asking case, and the Escape case, whose key is pressed where the keyboard is |
| *Cancel* not handing the keyboard back to the corner | the cancel case |
| The flag never sent | 3: the request's case and both put-back cases in `BoardPage.test.tsx` |
| Escape not heard by the card's question | the card's Escape case and the board's |
| Every card asking, not only the one moved | *asks on the card that was moved and on no other*, written when the fault list showed nothing else would catch it |

### What the plan got wrong, or left out

- **Its recommendation for the board, an *Undo* after every move**, was not a move back, and could
  not have caught the mistake it was found from. See *Decided at pickup*.
- **Keeping both history rows**, its other recommendation, restarts a Backlog wait.
- **The card's date is not the finish**, so the card needed one of its own.
- **Dropped keeps a finish**, so the put-back clears it before the column's rule runs.
- **Stats needed no code.** Its test was red until the put-back existed and green from the same
  write.
- **dnd-kit stops every click on the page until 50ms after a drop**: its sensor takes its click
  listener off on a timeout (`AbstractPointerSensor.detach`, 6.3.1). The first e2e run had three
  specs red that answered the question the moment `drag()` returned, and green the one that checked
  the card first. A person cannot click that fast. `answerFinished` presses until the question
  goes.

---

## 15. Deleting a pass keeps its notes · shipped

**Shipped and deployed 9 October 2026** (PR #74), the day it was picked up, after a workshop the
same day. The plan below is as it was written. What was decided and built follows it, from
**Decided at pickup** on.

**What.** Deleting one pass of a title that has another moves its notes to the pass that stays,
with their dates unchanged, and the confirm says so. Asked for on 8 October 2026, from the case in
#14: nine notes went with a pass, and the confirm never mentioned them.

**Why it happens.**
- **The notes go by cascade.** `NoteConfiguration` sets `OnDelete(Cascade)`, because *a note
  belongs to the pass it was written during*. `LogEntryService.DeleteAsync` removes the pass and
  nothing else, and the database takes the notes in the same statement, so nothing in the service
  sees them go.
- **The confirm does not say so.** `ConfirmDelete` takes a `warning`, documented as *what deleting
  costs beyond it*, and the Delete on an earlier pass passes `null` (the *Earlier passes* list in
  `EntryDrawer.tsx`). Over nine notes it said *Really delete?* and nothing else. The current pass
  warns only when it is the only one.

**What stays as it is.** Removing a title from the board deletes every pass
(`LibraryService.RemoveFromBoardAsync`) and still takes the notes, and says so first. So does
deleting the only pass, which is the same thing from the drawer. The cascade stays for both, and
for deleting an account.

**Considered and not chosen: notes that belong to the title.** A note could carry `user_id` and
`media_id`, with its pass a nullable tag that a delete sets to null. That keeps every note through
any delete, and is the literal form of what was asked. It costs a migration, moves the scoping of
notes off the pass (*`log_entries` and `notes` are yours* in CLAUDE.md), needs a place in the
drawer for a note with no pass, and changes the export. That is the same protection as moving
them, for much more, and it does nothing for #14.

### Decide at pickup

- **Which pass gets the notes.** Recommended: the one the board shows, `logEntries[0]`, which is
  the current pass in the drawer. The alternative is the pass next to it in time, which keeps a
  note nearer the playthrough it was written in.
- **The words, rendered.** For example *Its 9 notes move to the current pass.* The confirm keeps
  its shape, and only its `warning` changes.
- **Whether to offer deleting the notes too.** Recommended: no. A note can still be deleted on its
  own, and a second button in the confirm is a second way to lose them.

### Tests first

- Deleting an earlier pass moves its notes to the pass that stays, with `written_at` unchanged, in
  the same transaction as the delete. Red against today's code.
- Deleting the only pass, and removing the title from the board, still delete the notes.
- Notes move only between one person's passes of one title. Another user's pass of the same title
  is never chosen.
- The confirm gives the count when a pass has notes, and says nothing extra when it has none.
- **Put the fault back:** the delete without the move, which turns the first case red.

### Decided at pickup

Asked on 9 October 2026, before anything was drawn. All four were the session's
recommendations. The last two widen the plan. Reading the code found that the plan's
*What stays as it is* left two confirms that still delete notes without saying so.

| Choice | Picked | Against |
|---|---|---|
| Which pass gets the notes | **The current pass**, the one the board shows, of the passes that stay. Deleting the current pass itself hands them to the next one, which becomes current | the pass next to it in time, which differs only when a title has three passes or more |
| Deleting the notes too | **No. They always move.** A note can still be deleted on its own | a second button in the confirm, and a flag on the delete route |
| The only pass | **Its confirm counts the notes it takes**, though they still go | the plan's *What stays as it is*, which left the words alone |
| The card's *Remove from board* | **Says *and its notes* on a title with one pass that has any.** The card has no count, but `latestNotePreview` says whether there is a note. Two passes or more already say *and their notes* | the card left as it is |

Read from the code before the questions were asked:
- **The current pass's Delete loses notes too.** Its warning is `null` whenever an earlier pass
  exists, so a replay deleted with notes on it said *Really delete?* and nothing else. The plan
  named the earlier pass's Delete only.
- **The receiving pass is a ninth place that orders a title's passes**, `logged_at DESC, id
  DESC`. *Library is not the catalog* in `docs/board.md` counts them.

### Decided from the renders

Shot from the real drawer and the real card behind a throwaway `?dw=` switch, Vite alone with
every `/api/` request answered in the browser, on the #13 workshop's staged board. *Hollow
Knight: Silksong* had the real pass, with nine notes, under the blank one a mistaken *Yes*
started. *Hollow Knight* had a replay with three notes over a finish, and *The Witcher 3* one pass
with six. They went on one private page with the measurements:
https://claude.ai/artifact/PcxX2GZoGxMKtT9Ljn2Z4o. All three picks were the recommendations.

| Choice | Picked | Against |
|---|---|---|
| The words for a move | **A:** *Its 9 notes move to the current pass.* Deleting the current pass, the receiving pass is named the way the Delete buttons name passes: *Its 3 notes move to the Completed pass from Jul 4, 2026.* One note: *Its note moves to…* | B, *…move to the Playing pass*, which reads wrong when the deleted pass and the current one share a column; C, *Its 9 notes are kept*, which does not say where |
| Where the confirm sits | **A confirm with something to say takes a line of its own, and says it on a line above both buttons.** 46px while it asks, against 22px for the buttons alone | the confirm on its own line, which still left *Cancel* alone on a phone; in the row, as today |
| The only pass | **a:** *The only pass — deleting it takes X off your board, and its 6 notes.* The card's order | b, *…takes X and its 6 notes off your board* |

- **The layout question came from the renders, not the plan.** An earlier pass's Delete is one
  item in the row that holds its rating, hours and platform, so a sentence there ran straight on
  from them whenever it fitted beside them: *31.5 h Switch 2 Its 9 notes move to the current
  pass.* That happened with A in the 512px drawer from 1536px and in the 672px modal, and with C
  even in the 448px drawer. On a phone, A and B left *Cancel* on a line by itself.
- **The rule needs no hobby and no pass in it.** It is `ConfirmDelete`'s: a warning is a line of
  its own. A confirm with none, a note's or a pass with no notes, keeps today's shape.

### Built

- **The server.** `LogEntryService.DeleteAsync` loads the pass with its notes and finds the pass
  that keeps them: the current one of those that stay, yours and of this title, ordered `logged_at
  DESC, id DESC`. It re-points the notes, then removes the pass, in one save. With no pass left,
  the cascade takes the notes as before. No migration, and the route's contract is unchanged.
- **EF needed no help, measured rather than assumed.** Re-pointing tracked notes and then removing
  their pass does not cascade to them, and the save sends the note updates ahead of the delete in
  one command: `UPDATE notes …; UPDATE notes …; DELETE FROM log_entries …`, read back from a
  throwaway test. So there is no `DetectChanges` call and no explicit transaction.
- **The words** are `deleteWarning` in `EntryDrawer.tsx`, beside `labelFor`, which now names a
  pass through `passName`, so the pass that keeps the notes is named the way its own Delete is.
  `deleteProps` takes the pass rather than its id and carries the warning, so both Deletes get one.
- **The layout** is `ConfirmDelete`'s. With a warning, the confirm is `basis-full` in whatever row
  holds it and the warning is `basis-full` above the buttons. Without one nothing changes.
- **The card.** `describeRemoval` takes `hasNotes`, and `Card` passes `latestNotePreview !== null`.
  It is one more branch in each of the four hobby files, since a single pass's sentence names no
  pass noun.

### Tests

Written first and shown red, server and client separately. The backend gained
`DeletingAPassTests`, eight cases, five of them red against the code before the change. The other
three are guards: the only pass still takes its notes, your only pass never hands them to a
stranger's pass of the same game, and a delete the database refuses leaves them where they were.
The client gained eight cases in `EntryDrawer.test.tsx`, one in `Card.test.tsx` and
`hobbies/removal.test.ts`, nine across the four hobbies. Eleven were red before the change, and
the three that say nothing extra were green, as guards should be. The e2e suite gained one spec,
#14's morning with the *Yes* given. At 1600 it measures where the confirm's sentence and buttons
sit, deletes the real pass, and reads both notes back after a reload.

The finished build ran 779 backend cases, 1,105 Vitest cases in 56 files, and 198 e2e specs, all
green. The first full e2e run had one red: *clicking away from the drawer closes it, and so does
Escape*, the flake CLAUDE.md measures under **Tests**. It failed at its Escape half (line 350),
not at the backdrop click the note describes. Alone it then passed 14 of 15 times on this branch,
failing only the first run after the full suite, and 5 of 5 on `main`. A second full run was
green.

Each fault was planted alone against the finished build by a script that restored the file byte
for byte, with hashes compared afterwards. Backend faults ran the whole backend suite, frontend
faults the three Vitest files, and the rows marked *in a browser* the new spec.

| Fault planted | Red |
|---|---|
| The delete without the move, the plan's fault | the five move cases, and nothing else in 779. In a browser, the spec, at the notes read back after the reload |
| The move saved apart from the delete | *A_delete_that_fails_leaves_the_notes_where_they_were* alone |
| The pass that stays chosen without the user | *Notes_move_only_between_your_own_passes_of_one_title* and *Your_only_pass_takes_its_notes_even_when_somebody_else_has_the_same_game* |
| The pass that stays chosen without the title | *Notes_move_only_between_your_own_passes_of_one_title* alone |
| The pass that stays ordered by id alone | *The_notes_go_to_the_pass_the_board_calls_current_and_not_the_one_beside_it* alone |
| The oldest pass that stays, rather than the current one | the same case alone |
| The pass being deleted counted among those that stay | *Deleting_the_current_pass_hands_its_notes_to_the_one_that_becomes_current* alone |
| A pass that has another saying nothing again | 4: both passes' words, the undated pass and the singular |
| Every pass that keeps the notes called *the current pass* | 2: the current pass deleted, dated and undated |
| One note said in the plural | *says one note in the singular* alone |
| The only pass's one note said in the plural | *says the only pass's one note in the singular* alone |
| The only pass not counting its notes | 2: the count and its singular |
| A pass with no notes saying something anyway (*Its 0 notes…*) | *adds nothing to the confirm of a pass with no notes* alone |
| The card not told whether there are notes | *says its notes go with it when its only pass has some* alone |
| One hobby, anime, without the notes in its Remove | *on anime, says the notes go too…* alone |
| The confirm left in the pass's row | nothing in Vitest, which has no layout. In a browser, the spec: *the sentence runs on from the hours*, its top 16px above the hours' bottom |
| The sentence sharing a line with the buttons | nothing in Vitest. In a browser, the spec: *the buttons sit beside the sentence* |

### What the plan got wrong, or left out

- **The current pass's Delete lost notes too.** The plan named the earlier pass's. The current
  pass warned only when it was the only one, so a replay deleted with notes on it said nothing.
- **Two confirms would still have deleted notes without saying so:** the only pass's, which the
  plan's *What stays as it is* left alone, and the card's *Remove from board* on a title with one
  pass. Both say so now, by the user's pick.
- **The receiving pass is a ninth place that orders a title's passes**, which the counts in
  `docs/board.md` and CLAUDE.md had to learn.
- **The layout was not a question the plan asked.** It said the confirm keeps its shape and only
  its warning changes. The renders showed that the shape was the problem once the warning had
  words in it.
- **"In the same transaction" needed a test of its own.** A command interceptor refuses the
  delete, and the notes must still be on the pass. It is green against the code before the change
  too, and red only for a move saved apart from the delete, which is the fault it exists for.

---

## 16. What should I play next? · shipped

**Planned 23 October 2026**, from suggestions the user picked that day, and **workshopped, built
and deployed on 25 October 2026** (PR #80). The plan below is as it was written. What was decided
and built follows it, from **Decided at pickup** on.

**What.** A picker over Backlog, for the evening nothing on it stands out. Two optional factors
narrow it: **how long you want to play** (an evening, a weekend, a few weeks) and **a genre to
leave out**, as in *not another RPG*. With neither set it is **a complete random choice**, and that
one lands with **a spin of a wheel**. The factors were the session's suggestion; the random choice
and the wheel were the user's own.

**It is reached for, never offered.** The board is kept for leisure, so nothing here suggests a
game unasked, nudges a title for having waited, or keeps a record of what was picked. The picker
answers when it is asked and says nothing otherwise.

**What it builds on.** Everything it reads is already on a board row.
- **The length is the card's**: `lengthHours`, which for a game is HowLongToBeat's All Styles
  figure, the one Backlog's header adds up. When "How long will it take me?" has been told a pace
  (`usePace`, per board and per browser), the length is in days at that pace, from
  `daysToFinish` in `lib/pace.ts`, as Backlog's second line works it out. Without one it is in
  hours.
- **The genre is the one the card is painted as**: `resolveGenre` in `hobbies/index.ts`. A genre
  chosen in the drawer wins over IGDB's order, so *not another RPG* leaves out what the board
  shows as an RPG.
- **The whole column, never a page.** A column loads 100 cards (`COLUMN_PAGE_SIZE`). Paging
  `listColumn` with `status: 'Backlog'` to the end, as `libraryStatuses()` pages the library,
  needs no backend change. The Backlog request already leaves the calendar's titles out, so a game
  that is not out yet is never offered.
- **Moving the pick is the board's own move**, from `useBoard`, so *Start playing* stamps the start
  a drag into Playing would.

**Not on a share.** Backlog shows on every share, through `ColumnFrame`, the frame both kinds of
board draw. So the way in goes in `Column`, which only your own board draws, or somewhere else only
your board has. Kept off a share, its words need no `Voiced` pair.

### Decide at pickup

Most of this is decided by eye, so render it first, at 390px as well as side by side.

- **One panel or two modes.** Recommended: one panel, with the two factors above two buttons,
  *Suggest three* and *Spin*. With no factors set, *Spin* is the complete random choice. With some
  set, the wheel holds only what matches, and *Suggest three* draws three of the matches at
  random. The alternative keeps them apart: a guided picker that answers with three, and a
  separate *Surprise me* that spins over everything.
- **The wheel.** A backlog of a hundred makes a hundred slivers, with no room on any of them for a
  cover. Recommended: **eight titles drawn at random from the whole backlog**, each slice carrying
  its cover, and the spin lands on one of them. Every title still has the same chance: eight in n
  to be drawn, then one in eight to be landed on. Also worth rendering: every title as a slice in
  its genre's colour, with the cover shown once it stops; and a reel of covers that spins and
  slows, which suits any backlog but is not a wheel.
- **Where the way in sits.** Recommended: Backlog's header, beside the sort control, which is
  where the column's hours already sit on a phone. The alternative is a sentence under the empty
  search box beside Discover's, *Not sure what to play?*, which would put what to add and what to
  play side by side.
- **What a second spin does.** Recommended: it leaves out the title the last one landed on, while
  there are two or more titles to choose from. A second spin that lands on the same game reads as
  broken.
- **What a pick offers.** Recommended: *Start playing*, which moves it; its name, which opens its
  journal as a name does everywhere else; and *Spin again*.
- **The lengths in words, and where each stops.** A title with no estimate is only ever under *Any
  length*, and the panel counts how many it left out, by the header's rule that a title with no
  figure is counted rather than treated as short.
- **Whether to show how long each title has waited.** Recommended: not at first. It is not on a
  board row. `LibraryService.BacklogAsync`, which the Stats page reads, has it, but using it would
  need a route of its own and one more copy of the `LengthHours` coalesce, which **What a fifth
  hobby has to do** in CLAUDE.md would then have to list.

### Things to get right

- **The pick is made before the wheel turns.** The code chooses, and the wheel is told where to
  land. That makes the result testable with an injected random source, and lets reduced motion
  skip the spin and show the same pick.
- **Nothing in the app reads `prefers-reduced-motion` yet**, so there is no precedent to copy.
  Under it the pick shows straight away. `windowOfWidth` in `src/test/media.ts` throws on any
  query but `min-width`, so the tests need it to answer this one too.
- **To a screen reader the wheel is decoration.** The pick is announced in a live region, and the
  keyboard goes to *Start playing*.
- **Back closes it, as it closes the journal** (`useOverlayHistory`), which matters on the Android
  phone the board is used from. If it is a dialog, its keyboard is `useModalPanel`'s, as the
  journal's and the share dialog's are.
- **If the slices wear genre colours, write every class name out in full.**
  `` `fill-genre-${x}` `` generates nothing and paints a transparent slice (CLAUDE.md, **What
  fails silently**).
- **Games first**, from a `HobbyDefinition` block beside `stats` and `export`, with its words in
  `hobbies/`. A films board would ask what to watch.

### Tests first

- **A backlog of 101 titles can land on the 101st.** Red if the picker reads only the column's
  first page.
- A given random value picks the title it names, and across every value each title has the same
  chance.
- At a pace, a title inside the chosen length is in and one outside it is out. With no pace the
  lengths are in hours. A title with no estimate is only under *Any length*, and it is counted.
- Leaving out RPG leaves out a title painted RPG, including one whose genre was chosen in the
  drawer over IGDB's first.
- When nothing matches, the panel says so and offers to widen the search. It never spins an empty
  wheel.
- Under reduced motion the pick shows with no spin, and it is the same pick the same random value
  gives with motion.
- A second spin never lands on the first one's title while there are two titles or more.
- *Start playing* moves the title to Playing through the board's own move.
- `SharedBoardPage` renders no way in.
- e2e, under `page.emulateMedia({ reducedMotion: 'reduce' })`: spin, press *Start playing*, and the
  card is in Playing after a reload. **Wait for the move to land before reloading.** A spec in
  `journal.spec.ts` is thought to fail by reloading on the optimistic move (CLAUDE.md, **Tests**).
- **Put the fault back:** read the first page instead of the whole column, then drop the
  reduced-motion check. Each turns its own test red.

### Decided at pickup

Asked on 25 October 2026, before anything was drawn, as four questions with sketches. All four
were the session's recommendations.

| Choice | Picked | Against |
|---|---|---|
| The panel | **One panel, two buttons**: the two factors on top, then *Suggest three* and *Spin*. With nothing set, *Spin* is the complete random choice | two doors, a guided picker and a separate *Surprise me* with no filters; the wheel alone, with no shortlist |
| How long | **Occasions, in hours**: an evening, a weekend, a few weeks, each a band of the `~` figure a card prints, so any card can be checked against a chip. **The pace stays out of the bands**: it is a daily average, and a weekend's play is not two average days. It appears beside a pick instead | sizes in hours, *Short*, *Medium*, *Long*; days at your pace, which would differ between a phone and a desk because the pace is per browser |
| The genre | **Leave genres out**: every genre in the Backlog as a chip with its count, as many left out as you like, by the genre the card is painted as | one genre only, which narrows a small backlog to nothing; a chip cycling *any*, *only* and *out* |
| Where the bands stop | **From the real backlog**, read from production, read-only, with the user's permission | the numbers alone; typical figures |

**What production said, on 25 October 2026.** The local database had two titles in Backlog, too
few to set a band by, so one read-only query over SSH read user 1's games board:
- **The Backlog column holds six games.** There are 21 Backlog passes, and fifteen of those
  titles are not out yet, so they are on the calendar.
- **Five have an estimate, and all five take 28 hours or more**: 28.37, 29.15, 48.07, 67.64 and
  130.78. The sixth, *Final Fantasy Resonance*, came out on 22 October and has none yet.
- **Five are painted RPG** and one Shooter.

So an evening and a weekend held nothing under the plan's bands, leaving out RPG left one game,
and all six fit on a wheel of eight. Every render was staged with these six. The other columns,
and ten more games for a bigger backlog, came from the local catalogue.

### Decided from the renders

Shot from the real board and a throwaway panel behind `?way=`, `?wheel=`, `?result=`, `?again=`,
`?three=` and `?bands=` switches, Vite alone with every `/api/` request answered in the browser,
at 1440 and 390 with each wheel's spin recorded on a phone. The page is private:
https://claude.ai/artifact/3LYP8bU2xKYVu9TZDJ7PH3. Five of the six picks were the
recommendations. The way in was the user's.

| Choice | Picked | Against |
|---|---|---|
| The wheel | **Covers on the wheel**: up to eight slices, each with its cover and the card's genre stripe as an arc on the rim. With more than eight in the draw, eight are drawn at random whenever the draw changes, and the line above the wheel says so | every game a slice in its genre's colour, which on this backlog is five green slices and one blue; a reel of covers, the shortest panel, 599px after a spin against 763, but not a wheel |
| A landed spin | **A row under the wheel**, which stays where it stopped with the slice outlined: the cover, the name, which opens the journal, the length and genre, the time at your pace, *Start playing*, and the second spin. 763px, which ends 13px above the foot of a 390 × 844 phone | a card over a faded wheel, 595px, which hides where it stopped |
| A second spin | ***Not this one***: the game leaves the draw until the panel closes, and the line says *5 of 6 in the draw*. **Over the plan's recommendation** | *Spin again*, keeping every slice and refusing only the game just landed on, which lets three spins land on one game, another, and the first again |
| Suggest three | **Rows**: the cover, the name, the length and genre, the time at your pace, and *Start playing* in words. 581px | tiles, three covers across, where on a phone the names wrap to three lines and the pace has no room |
| Where the bands stop | **Four, with *A long haul***: under 5 h, 5 to 20, 20 to 50, and 50 or more. This backlog splits 0, 0, 3 and 2. The chips take a second row, 46px | the plan's three, under 4 h, 4 to 15, and 15 or more, on one row, which put all five in *A few weeks* |
| The way in | **Backlog's header**: a die and *Pick* beside the sort control, on your board only. **The user's pick, over the recommended sentence under the search box.** Backlog's heading wraps at 1280 and 1440, which starts its cards 28px lower, and 24px on a phone. It fits on one line at 1920 | *Not sure what to play? Spin your backlog* under the search box, 0px on a desktop and 20px on a phone; a link on the year row, where both links break over two lines on a phone |

**Found while rendering**, before the page went up:
- **The first easing curve had a tail so flat** that the reel looked stopped about a second before
  `transitionend`, and the result arrived late. The build uses easeOutCubic,
  `cubic-bezier(0.33, 1, 0.68, 1)`: 4 seconds for the wheel.
- **An odd number of slices puts two of one tone side by side**, the first and the last, which
  the three-slice render shows. The build needs something to keep them apart.
- **A left-out genre was first drawn filled**, as a chosen length is, so *chosen* and *left out*
  looked alike. It is struck through on `sunken` instead.

### Built

Built on 25 October 2026, tests first, and **shipped and deployed the same evening** (PR #80):
the full e2e suite went 204 green first, the 201 before and `pick.spec.ts`'s three. The write-up
is `docs/board.md`, **What should I play next?**, with its table of faults put back, and the look
is `docs/design.md`'s, under the same name.

- **`frontend/src/pick/`**: `draw.ts`, the arithmetic, `Wheel.tsx`, `PickPanel.tsx`, and
  `PickButton.tsx` for Backlog's header. `wholeColumn` in `api/library.ts` and `wholeColumnKey`
  in `board/keys.ts`. `HobbyDefinition.picker`, with games' words and bands, and `Genre.short`
  for the chips' *RPG*. `Column` hands its frame an `action`, which a share's column never has.
- **Two shared pieces learned something.** `useModalPanel` takes `active`, so a panel the journal
  covers takes no keys. `windowOfWidth` answers `prefers-reduced-motion`, which nothing asked
  before. And `boardServer` in `src/test/library.ts` now pages as the API does when a page size
  is asked for, which is what let the 101st title be tested at all.
- **Tests**: 21 in `draw.test.ts` and 20 in `PickPanel.test.tsx`, two for `wholeColumn` in
  `library.test.ts`, one in `SharedBoardPage.test.tsx`, and three in `e2e/pick.spec.ts`. They
  were shown red before the code existed, 18 failing and `draw.test.ts` unable to load, with
  three kinds of exception, each checked by putting its fault back instead. Two assert that
  something is absent, on a films board and on a share, and passed until there was something to
  be absent. The three below, and the e2e spec, were written after the code.
- **Three cases were added during the build** for promises the plan made and no case held: Escape
  in the journal a pick opened closes the journal alone; a title moved from that journal is out of
  the draw when you come back; and closing hands the keyboard back to *Pick*.

**Where the build departs from the picks, and why:**
- **A `line-soft` hairline between slices**, which the renders did not have, for the odd count
  found while rendering. It is faint enough that the picked look is unchanged at six.
- **The button is named *Pick*** and the question is its description and tooltip. Named by the
  question, as first written, a voice saying "Pick" would not find it.
- ***Start playing* on a phone shows Playing afterwards**, or the pick only seems to vanish from
  Backlog. `pick.spec.ts` holds it.
- **A pick's name opens the journal over the panel**, and Back from the journal comes back to the
  pick. The plan said only that the name opens the journal, as a name does everywhere else.
- **When *Not this one* has emptied the draw**, the empty state offers *Put them back* rather
  than *Clear the filters*, and either puts everything back.
- **The wheel lands on a timer too**, at 4.25 seconds, in case its `transitionend` never comes, so
  the panel cannot be left spinning.
- **How long each title has waited is not shown**, as the plan recommended and the leisure rule
  agrees: nothing here counts a wait.

**Not checked**: an iPhone, as ever, and the spin on Jimmy's own Android phone, which is the first
thing to try after a deploy.

---

## 17. A Discover list from your ratings · shipped

**Planned 23 October 2026**, from suggestions the user picked that day. **Looked at and
workshopped on 7 November 2026**: the look said build it, with four changes to the plan that its
measurements found, and every choice was made the same day: round one in words (**Decided at
pickup**), round two from renders (**Decided from the renders**). **Built on 8 November 2026** in
a session of its own, tests first, and **shipped and deployed at about 01:40 Eastern the same
day** (PR #93); see **Built**, **Tests**, **What the plan got wrong, or left out** and **The
deploy, and what it left**, below **Tests first**.

**What.** A fifth tab on Discover whose list is yours. The four lists now are the same for
everybody. This one starts from the games you rated highest, asks IGDB for each one's
`similar_games`, and shows what comes back, less what is already on your board. Each tile can say
why it is there: *Because you rated Hollow Knight 9.5*.

**The look.** Ask IGDB with the user's real ratings and render the wall it would make. Read it as
the other four lists were read before any was chosen (**What IGDB has, measured** in
`docs/games-igdb.md`): whether the top of it is good, how far down it holds up, and what it fills
with. If it is poor, #17 stops there, and that is a finding worth writing down. **Done on
7 November 2026**, below. This paragraph said the development database holds the games actually
logged; it does not, and #16 found two Backlog titles there. The real board is production's.

**Checked on 23 October 2026, in IGDB's documentation.** `similar_games` is a current field on
`/games`, an array of game ids, and not one of the deprecated twins. Its neighbour `collection` is
one, deprecated for `collections`, which matters only if a rule about series is ever wanted.

**How it works**, as the look and the workshop settled it:
- **Seeds**: every title whose latest finished pass is rated **8 or more**, by its IGDB id
  (`media.external_id`). A title finished twice seeds by its latest finish, whatever an earlier
  one was rated.
- **Two questions**, both measured live on 7 November 2026 in the shape below.
  - **The first is about every title on your board**, not only the seeds:
    `fields similar_games, parent_game, parent_game.similar_games; where id = (…)`, 500 ids a
    request. It gives each seed's own ten, each title's original where IGDB names one, and that
    original's ten nested inside it, so asking about originals costs no request of its own.
  - **A seed that is a version of another game brings its original's ten**, not its own. A seed
    with no `parent_game` brings its own.
  - **The second asks for the games those name**, in one `where id = (…)` carrying `Discoverable`
    and `total_rating_count >= 10`, which is Popular now's second question with a floor. The floor
    in the query kept exactly the ids a local filter kept. An empty `where id = ()` is an
    APIcalypse syntax error, so a list with nothing to ask about never asks.
- **Ranked by how many of your seeds name a game**, then by how many people rated it
  (`total_rating_count`).
- **Left out**: every title on your board, from any column, Dropped included, **and every board
  title's `parent_game`**, which is the same game under another id. It is the first Discover list
  that reads your board, so it is one more `ICurrentUser` call site to scope (CLAUDE.md, **What
  fails silently**).
- **Nothing with fewer than 10 ratings**, and no score is trusted: the user does not want the list
  to rest on IGDB's scores. See **The look**.
- **Upserted on every view, like every list.** The cache holds IGDB's answer and never rows.
- **With the user's board**, this offers 220 games, about five pages of 48, opening *Horizon Zero
  Dawn, Scarlet Nexus, Ravenswatch, Metal Gear Solid V, Ghost of Tsushima, Death Stranding, Devil
  May Cry 5* and *Metal Gear Rising*.

### The look, 7 November 2026

The user's games board as read from production on 3 November 2026
(`frontend/workshop.local/estimates/board.json`, saved by #19's workshop): 91 titles, 63 rated,
every rated one finished, none finished twice. IGDB was asked on 7 November. The page, with every
choice below as a switch over the real answers: https://claude.ai/artifact/UyZDw3d1XMDM22ef8onRTS.
The scripts and the answers are in `frontend/workshop.local/discover/`, which git ignores.

- **Every game has exactly ten `similar_games`**, never fewer. The 63 named 403, every one a main
  game, so `Discoverable` took nothing off. 21 were on the board.
- **Your own games came back under other ids.** 30 of the 91 titles are ports, remasters,
  remakes, expansions or expanded editions, and IGDB files each under an id of its own, naming the
  game it comes from as its **`parent_game`**. `version_parent` was empty on all 30. Ten of those
  parents were offered: *Castlevania: Aria of Sorrow, Symphony of the Night, Dawn of Sorrow,
  Circle of the Moon, Order of Ecclesia* and *Akumajou Densetsu*, *Ghost Trick* (2010), *Granblue
  Fantasy: Versus*, *Metal Gear Solid 3* (Delta's original) and *Marvel's Spider-Man* (2018), whose
  standalone expansion Miles Morales is on the board. Leaving out every board title's parent took
  all ten off, and comparing names found none it missed.
- **A version's own list is often poor, and its original's is better.** For the 19 rated titles
  with a parent, their own lists held 66 games with 50 or more ratings out of 190 and their
  originals' held 124. *Paper Mario: The Thousand-Year Door* went 0 to 10 and *Symphony of the
  Night* 0 to 9: the remake's ten were mostly online and mobile games (*Big Time, Black Clover
  Mobile, Blue Protocol, MU Legend*), six shared with Symphony of the Night's. Four go the other
  way: *Ghost Trick* 5 to 2, *NieR Replicant* 4 to 0, *Persona 3 Reload* 7 to 5, *Lies of P:
  Overture* 5 to 4.
- **The plan's order opened with IGDB's hubs**, games it calls similar to everything: across all
  63, *Scarlet Nexus* was named by 12, *Genji: Dawn of the Samurai* (2005, 18 ratings) by 9 and
  *Towerborne*, with no ratings at all, by 7. Most of that came from the versions' lists. From 8
  and up with originals asked, *Towerborne* falls from 2nd to 46th and *Godfall* from 6th to 39th.
- **Few games are named twice**: at 8 and up as the plan wrote it, 205 of 262 were named by one
  seed, so the second key orders most of the list.
- **It moves only when a rating does.** `similar_games` is fixed for a game, where the other four
  lists are recalculated daily.
- **IGDB's scores were set aside, by the user's choice.** A floor on IGDB's score was the look's
  first proposal, and the user would rather not rest anything on IGDB's ratings, since people read
  OpenCritic, Metacritic or Steam. What IGDB has instead, measured: it links **neither Metacritic
  nor OpenCritic** (its external sources are stores and sites: Steam, GOG, the PlayStation Store,
  Xbox, GiantBomb and the like); its critics' average, `aggregated_rating`, rests on a median of 5
  reviews a game on this list and on 1 for *Ravenswatch*'s 90; and **PopScore's Steam "reviews"
  (popularity types 6 to 8) are popularity values, not counts**, so dividing them gives *Hollow
  Knight* 84% where Steam says Overwhelmingly Positive. A floor on how many people rated a game
  judges whether it is known rather than whether it is good, and that is what was picked. An
  outside score became #22.

### Decided at pickup

Round one, 7 November 2026, as four questions and then two, each with the list it makes. Every
pick was the recommendation.

| choice | picked | against |
|---|---|---|
| build it | yes | stop at the look |
| seeds | finished titles rated **8 and up**, 38 of the user's 63 | 9 and up (15 titles), 8.5 and up (20), any rating (63) |
| a title finished twice | **its latest finished pass's rating** | its highest |
| order | **how many of your seeds name a game**, then how many people rated it | best known first, which read as *Grand Theft Auto V, God of War, BioShock Infinite* |
| floor | **fewer than 10 ratings**, no score | IGDB's critics' score under 75 (154 offered); fewer than 50 ratings, which takes *Ravenswatch* (17) too; nothing (263, 43 of them under 10 ratings) |
| your games under other ids | **every board title's `parent_game` left out** | keep a standalone expansion's base game, which would offer *Marvel's Spider-Man* at #4; show them, as the plan did |
| a version seed | **asks about its original** | both lists, which brings *Godfall* back at #5; the version logged |
| on your board | **left out**, every column | the ✓ chip the other lists use |
| an outside score | **not in #17**: planned as #22 | — |

### Decided from the renders

Round two, 7 November 2026: the real Discover page around a prototype tile and a fifth tab,
holding round one's list, shot at 1440, 768 and 390 in Shelf Light and Dark and measured as it
was shot. The page, with the combination as picked rendered again at its top:
https://claude.ai/artifact/EFhjUeA7jfruGrjG9QxG6a.

| choice | picked | against |
|---|---|---|
| the tile | **B, a reason under the name: "Because you rated *Wuchang: Fallen Feathers* 8.5 and 3 more"**, the user's pick over the recommendation | **C**, "Like *Wuchang: Fallen Feathers* and 3 more", the recommendation: 9 of 48 on one line, 1 cut off; **A**, nothing, as today |
| how far it runs | **up to three lines**, asked after B was picked | two lines, where 21 of 48 tiles at 1440 and 16 at 768 and 390 were cut, and the cut took the rating and the *and 3 more* |
| the tab | **From your ratings, last of the five**, so Discover still opens on New releases | *For you*, which keeps the phone's pills on two rows; *Like your favourites*; *Because you rated* |
| the line under the tabs | **"Games like the ones you finished and rated 8 or more. Those like several of them come first."** | the first sentence alone |
| with nothing rated 8 or more | **a line of its own: "Nothing here yet. Finish a game and rate it 8 or more, and games like it will show up here."** | the page's *Nothing on this list right now.* |

What the renders measured, for the build to hold:

- **Tiles are 160px wide at 1440, 168 at 768, 171 at 390.** B takes two lines on every tile and
  three on 21 of 48 at 1440 (16 at 768 and 390), and nothing on the user's list needs a fourth.
  Three lines is a ceiling, `line-clamp-3`, not a target.
- **A row averages 350px with B at three lines**, against 303px with no reason and 337px with B
  cut at two. The add buttons stay at the foot of each tile, because `mt-auto` already puts them
  there.
- **The tile names the highest-rated of the seeds that point at a game**, ties by title as
  rendered, the seed's title in `text-fg` and the rest muted. **One seed reads without *and 0
  more***: the count is said only past one.
- **At 390 the pills take three rows**, the fifth alone on the third: 106px, where two rows are
  68px.
  Nothing scrolls, so `e2e/layout.spec.ts`'s check that every tab is whole and on the screen
  should hold unchanged with five; it is part of the build's run.

### Things to get right

- **The cache key has to carry the seeds.** It is the list, the day and the place now, because
  every list is the same for everybody. Keyed that way, this list would hand one person's
  suggestions to the next person to open the tab: a stranger's data, with no error. Keyed on the
  user alone, a new rating would not move the list until the cache expired. Keyed on the seeds,
  both come out right.
  - **Since the look, key each answer on its question.** The first question is about every title
    on the board, so its answer can be keyed on the board's IGDB ids and the seeds chosen from it
    afterwards: a new rating then re-ranks from the cache, and only an add asks again. The second
    is keyed on the ids it names. Neither key names a person, and neither answer is one person's.
- **With no seeds**, nothing finished and rated 8 or more yet, the tab says how it fills, and
  IGDB is not asked.
- **The latest finished pass is one more `logged_at DESC, id DESC` ordering**, beside the nine
  CLAUDE.md counts under **What a fifth hobby has to do**. Count them with the grep in **Library is
  not the catalog** in `docs/board.md`, and keep them agreeing.
- **`parent_game` is the one field for every kind of version**: ports, remasters, remakes,
  expansions, expanded games and standalone expansions alike. Not `version_parent`, which was empty
  on all 30 versions on the user's board.
- **The look's facts about IGDB go to `docs/games-igdb.md` when #17 ships**, under **What IGDB has,
  measured**: ten similar games always, `parent_game` for versions, and PopScore's Steam figures
  not being counts.
- **Both fakes have to answer it.** `FakeIgdbClient` needs the new question. `igdb-stub.mjs`
  parses each clause rather than recognising a question whole, so its fixtures need
  `similar_games`, and it needs the second question's shape. Add a decoy that only the filter
  keeps off, as *Velvet Lounge* is for the other lists.
- **Send each query body to the live API as the client builds it**, as was done for the other
  four. The stub parses loosely, and a syntax error would reach production as a 502 on the page.

### Tests first

- **Seeds are yours alone.** Another user's 10 never puts a game on your list.
- Nothing on your board is offered, from any column.
- Games are ranked by how many of your seeds point at them.
- The filter every list carries still holds: `themes != (42)`, with DLC, seasons and updates off.
- With no rated finishes, the list is empty with its reason, and IGDB is never asked.
- **Two users with different seeds get different lists on the same day.** Red with today's key.
- A new rating changes the list without waiting for the cache to expire.
- `A_cached_list_still_hands_out_media_ids_that_exist` holds for this list too.
- e2e, in `discover.spec.ts`: finish a game and rate it, open the tab, see a game similar to it,
  and add that game.
- Added by the workshop:
  - **A version brings its original's similar games, not its own.** The stub needs a version
    whose own list names a decoy its original's does not.
  - **A board title's original is never offered**, from any column; a game IGDB does not link
    to one is, whatever its name.
  - **Nothing with fewer than 10 ratings is offered.**
  - **Seeds start at 8**: a 7.5 names nothing.
  - **A title seeds by its latest finish**: an 8 replayed as a 6 seeds nothing, and a 6 replayed
    as a 9 seeds.
  - **Each title carries the seeds behind it, highest rated first**, and the tile says
    "Because you rated *X* 9 and 2 more", or "Because you rated *X* 9" for one. The other four
    lists send none and their tiles are unchanged.
  - **The tab is *From your ratings*, last**, with the two-sentence line under it; **with nothing
    finished and rated 8 or more it says its own line**, and IGDB is never asked.
  - **Playwright, since jsdom has no layout**: at 1440 the longest reason on the fixture is whole
    within three lines, and the add buttons of a row share a baseline; at 390 every one of the
    five tabs is whole and on the screen.
- **Put the fault back:** key the cache without the seeds, then stop leaving out the board. Each
  turns its own test red. Then ask about the version instead of its original, drop the parent
  rule, drop the floor, and read the highest finish instead of the latest, each red on its own.

### Built

On the branch `discover-from-your-ratings`, 8 November 2026. The write-up for a reader is **From
your ratings, the list made from your board** in `docs/games-igdb.md`.

- **The rule is `Services/FromYourRatings.cs`**, pure, beside `IgdbRelevance`: `Seeds`,
  `PointedAt` and `Rank`, with the look's measurements in their comments.
  `GameCatalogService.FromYourRatingsAsync` does the rest. `BoardOfAsync(user.Id)` reads the board
  with both reads of `log_entries` scoped, the latest finish being one more `logged_at DESC, id
  DESC`. `AskOnceAsync` sorts the ids, asks IGDB 500 at a time, and keeps the answer under the ids
  it asked about. The whole list is worked out for each page, which is sliced, upserted and given
  its reasons.
- **`IgdbClient` gained `GetSimilarGamesAsync` and `GetDiscoverableAsync`**, and `IgdbGame` gained
  `SimilarGames` and `ParentGame`. The floor is the service's, `FromYourRatings.FewestRatings`,
  and the clause the client's, so the fake can honour the floor as IGDB would and an endpoint test
  can see it go. `RefreshBatchSize` became `IdsPerRequest`, now that three things use it.
- **`DiscoverListPage` gained `Seeds` and `Because`**, null on the four lists, with `RatedTitle`;
  `DiscoverList.FromYourRatings` is `from-your-ratings`.
- **On the page**: `games.ts` has the fifth list with `yours.empty`; `DiscoverPage` drops a list of
  yours from the cache as soon as nobody is looking at it, gathers each page's reasons, and picks
  its empty line by the server's `seeds`; `WallTile` takes `because` and says the reason, class for
  class the prototype's B at `line-clamp-3`.

### Tests

Backend 961 of 961: 28 new endpoint cases in `FromYourRatingsTests` and 7 new in
`IgdbClientTests`. Frontend 1,346 of 1,346, 10 of them new, with tsc clean. End to end, three new
specs, two in `discover.spec.ts` and one in `layout.spec.ts`, and the five-tab check changed: the
full suite 220 of 220 in Chromium, and the Discover and layout specs 29 of 29 in Firefox.

**Shown red first.** 24 of the 28 endpoint cases were red on the 404 a list that did not exist
answers; the other 4 are the guard that the four lists send no seeds or reasons, true from the
start. All 7 client cases were red on their placeholders. 11 of 13 Vitest cases were red; of the
two green, one is a guard (no reason on a list that is the same for everybody) and the other, the
line a list with seeds and nothing left says, passed for the wrong reason — the unknown tab
redirected to an empty New releases.

**Each fault put back alone**, and each red on its own tests:

| fault | red |
|---|---|
| the list kept as the four are, under the list, the day and the place | `Two_users_with_different_seeds_get_different_lists_on_the_same_day`, `A_new_rating_changes_the_list…`, `A_cached_list_still_hands_out_media_ids_that_exist` |
| the second question kept under the board instead of what it names | `A_new_rating_changes_the_list…` (with the guard and the batching it also dropped) |
| the board not left out | `Nothing_on_your_board_is_offered_from_any_column` |
| a version asking about itself | `A_version_brings_its_originals_similar_games_and_not_its_own` |
| the parent rule dropped | `A_board_titles_original_is_never_offered_from_any_column`, all five columns |
| the floor dropped in the service, then in the client | `Nothing_with_fewer_than_ten_ratings_is_offered`, then the client's body test |
| the highest finish read, then the latest by id alone | `A_title_seeds_by_its_latest_finish`, both times |
| the user off the board read, then off the rating read | `Somebody_elses_board_leaves_nothing_out_of_yours`, then `Seeds_are_yours_alone` |
| seeds and reasons sent on the other four lists | `The_other_four_lists_send_no_seeds_and_no_reasons`, all four |
| seeds from 7.5; ranked by ratings alone; tied seeds left unordered | `Seeds_start_at_8`; the ranking case; `Each_title_carries_the_seeds_behind_it_highest_rated_first` |
| the Discover filter on the first question | the two client cases about it |
| Vitest: the list of yours kept in the cache; the own line whatever the seeds; *and 0 more*; the reasons not passed on | each its own case, the last four cases |
| end to end, written after the code: the reason clamped at two; `mt-auto` gone; the list of yours kept; the floor clause dropped; the filter dropped | the layout spec twice, then the ratings spec three times |

**Sent to the live API as the client builds it**, before shipping: the real API with the real
IGDB client in place of the fake, over the user's board as the workshop saved it, paged to the
end. Both questions answered on every page, and the list was the workshop's: the same 220 titles
and 38 seeds, the same first eight, and the same reason on every tile. 187 of the 220 stood where
the staging had them; every other place is an exact tie in both keys. A captured answer, a remake
and a plain game, pins the wire shape in `IgdbClientTests`.

**The built page differs from the picked prototype by no pixel**, at 1440 light and dark, 768,
and 390 light and dark, with the same reason on all 48 tiles and none cut.

### What the plan got wrong, or left out

- **The workshop drew page one.** Its longest reason there was 66 characters, at three lines,
  and "nothing on the user's list needs a fourth" was measured on those 48. The longest anywhere is
  69, *Because you rated Like a Dragon Gaiden: The Man Who Erased His Name 8*, at places 101 and
  193; the layout spec now draws it, and it fits. The spec's first fixture added *and 2 more* to
  it, 81 characters, which takes four lines and is cut: no tile on the user's list says it, and
  three lines was picked as a ceiling.
- **The page's cache was the plan's cache trap again.** The plan put the seeds in the server's
  key; the page kept every list five minutes after it was left, so a rating given in the journal
  showed nothing on returning to the tab. A list of yours is dropped from the page's cache once
  nobody is looking at it.
- **An empty list has two reasons, and the plan wrote one line.** With seeds and nothing left to
  offer — every game they name already yours — the page says its own *Nothing on this list right
  now*, since telling somebody with games rated 9 to go and rate one is wrong. The server's
  `seeds` says which.
- **The order needed a last key.** Ties in both keys are common far down the list; the staging
  kept the order it found them in, and the build breaks them by IGDB's id, so a page is the same on
  every request.
- **Two seeds can share an original.** *Lies of P: Overture* and *Lies of P* both seed and both ask
  about *Lies of P*'s ten, so each of those games counts two seeds. That is how the workshop
  rendered it, and it is kept.
- **The end-to-end API pages two at a time**, so a decoy that got through ranked below both titles
  and waited on page two: dropping the floor or the filter left the spec green until it asserted
  that the list ends there.
- **The prototype wraps the real hobby definitions**, so once the build added the tab it drew
  two. `hobbiesProto.ts` now leaves the built one out, and the comparison was rerun.
- **`docs/api.md` had no Discover route at all**; it has one row for all five lists now.

### The deploy, and what it left

- **Deployed at about 01:40 Eastern on 8 November 2026**, `293cc78` to `de2fe65`, carrying #92's
  docs and the workshop's brief with it. No migration, no variable, and nothing to refresh,
  because what IGDB calls similar is asked for live rather than stored. api and caddy were both
  recreated, api first, since both had changed; no base image moved.
- **Proved from outside.** The bundle went `index-BE668cQv.js` to `index-DIeaRrom.js`, and the
  stylesheet `index-B4wzdw3y.css` to `index-B0uun50f.css`, the local build's name again. Six
  strings went 0 then 1 in the script — `from-your-ratings`, `From your ratings`, `Because you
  rated`, the openings of the line under the tab and of the empty line, and the reason's class
  string — and a diff of the two stylesheets' selectors found one rule new, `.line-clamp-3`, and
  none gone, all counted with `grep -F`. `/api/auth/me` answered `null` (200).
- **Proved inside.** The list is a new slug on a route that already existed, so its anonymous 401
  says nothing new; the names it adds were counted in the running DLL instead,
  `FromYourRatingsAsync` and `BoardOfAsync` 0 then 2, and `GetSimilarGamesAsync`,
  `GetDiscoverableAsync` and `RatedTitle` 0 then 1. The startup log had no failure and said *No
  migrations were applied*, and both timers ran five minutes on: `Queued 0 titles for
  HowLongToBeat.` and `Release refresh brought 16 not-yet-released titles up to date.`
- **Left for the user: the tab on the real board**, which no session here can sign in to. It
  should open as the workshop rendered it, on *Horizon Zero Dawn, Scarlet Nexus, Ravenswatch*,
  unless a rating or the board has changed since 3 November.
- **The prototype and the look's scripts are in `frontend/workshop.local/discover/`**, which git
  ignores, beside `compare-built.mjs`, which shot the build against the prototype, and
  `built.json`, the list the API built from the live API.

---

## 18. Pictures in notes · shipped

**Planned 30 October 2026**, at the user's request, built the same day, and **deployed on
31 October 2026** (PR #84); see **Built** below.
Lines were read at `808a6d8`.

**What.** A note can carry pictures: a screenshot of where you are in a game, or of its save screen
once it is finished. A picture comes in three ways, all into one path: **pasted** into the note
box, **dropped** on it from a folder, or **chosen** with a button that opens the file picker. On a
desktop, pasting is the quick one, since a screenshot taken with Win+Shift+S is already on the
clipboard. On the Android phone it is the button, because the picker there offers the gallery and
the camera, which is where a console's screenshot or a photo of the TV is.

**A note can be a picture alone.** Decided when it was planned, in the user's words: *"There might
be scenarios where I just want to just paste the image of a save file and call it a day. Maybe I
just want to screenshot something cool and keep it there."* The API refuses a note with no words
today (*A note needs something in it*, `NoteRequest.Validate`), so the rule becomes words, a
picture, or both.

**What it builds on.**
- **Whatever takes a note away already takes what hangs off it.** `notes` cascades from its pass
  (`NoteConfiguration`), so Remove from board, deleting a title's last pass and deleting an
  account take its pictures with no new code; `AccountService.DeleteAsync` is one
  `ExecuteDelete`. Deleting one pass of several re-points its notes at the pass that stays
  (`LogEntryService.DeleteAsync`, #15), and a note's pictures go where the note goes.
- **Scoping goes through the pass**, as every query on `notes` does (`n.LogEntry.UserId`). A note
  has no owner of its own, and neither will a picture.
- **Ten queries read a pass's notes with it**, by `Include`: the detail read in each of the four
  catalogue services, `HltbService.DetailAsync`, `LibraryService.ExportAsync`, and four in
  `LogEntryService`. `NoteDto.From` is the one place a note becomes what the client reads.
- **`SqlRecorder`** (`backend/tests/HobbyTracker.Api.Tests/Infrastructure/`, from #9) records every
  command a host sends. It is how *no route a share reaches reads a note* is proved.
- **`useOverlayHistory` and `useModalPanel`**, so a picture opened full size closes on Back, as the
  journal and the picker do.

**Where the pictures are kept. Recommended: Postgres**, for reasons that are this database's rather
than a general rule.
- **The cascades above are the whole of the deleting, and the nightly dump the whole of the backing
  up.** On a volume, each cascade becomes code that deletes files, and `deploy/scripts/backup.sh`
  needs a second copy beside the dump.
- **The restore of 8 October lifted rows out of the dump's `COPY` block** (`docs/deploy.md`,
  **Backups**). A `bytea` value in a plain dump is hex on its row's one line, so a picture comes
  back the same way.
- **A storage service, S3 or R2, is a new outside connection** with an account and keys to keep,
  for nothing a database this size needs.
- **The cost is the dump.** A picture does not compress, every dump carries every picture, and 14
  days are kept. Measured on 30 October 2026, read-only: the latest nightly dump was 171,519 bytes
  for everything ever logged, and the backup disk had 870 GB free. One screenshot will outweigh the
  rest of the database, and the disk will not notice.

**How it would work**, to be confirmed at pickup:
- **Two tables.** `note_pictures` holds what the drawer needs: `id`, `note_id` (cascading from
  `notes`), the picture's place in its note, its type, `width`, `height` and its size in bytes.
  `note_picture_bytes` holds the bytes and nothing else, one row per picture, cascading from the
  first. `NoteDto` carries each picture's id, width and height. **The split is the point**: the
  ten queries above will `Include` a note's pictures to draw them, and bytes in those rows would
  come out of the database every time a journal opened. Slow rather than wrong, which is why it
  gets a test of its own.
- **Shrunk in the browser before it is sent.** A screenshot of a 1440p or 4K screen is several
  megabytes as a PNG. Drawn onto a canvas with a long edge of about 1920px and saved as WebP or
  JPEG, it is a few hundred kilobytes. Saving it again keeps only the pixels, so a phone photo
  loses its location with everything else the file recorded.
- **Sent with its note, never ahead of it.** A picture waits in the box as a thumbnail, and Enter
  or *Add note* sends the words and the pictures in one request, written in one save. Uploading on
  paste would leave a row behind whenever the drawer closed first, and something would have to
  sweep for them.
- **The JSON write stays as it is.** `POST /api/log-entries/{entryId}/notes` keeps its JSON
  action, and a second action on the same route takes `multipart/form-data`, the two told apart by
  `[Consumes]`. Every test of the write today goes on passing untouched.
- **A picture is read at `GET /api/note-pictures/{id}`**: no file extension, `[Authorize]`d, scoped
  through its note and pass, and answering `Cache-Control: private, max-age=31536000, immutable`
  with `X-Content-Type-Options: nosniff`. A picture's bytes never change, since a new picture is a
  new id, so the browser keeps it and a journal reopens at once. A plain `<img>` asks for it,
  carrying the session cookie because the app and the API share an origin.
- **A note with no words stores an empty body.** `notes.body` stays `NOT NULL` and `Note.body`
  stays a string, so nothing that reads a body today meets a null.

**Not on a share.** No route a share reaches reads a note (`docs/auth.md`, **Sharing a board**),
and a share's cards fill the note's slot with `NoNote`, a constant. The picture route is
`[Authorize]`d, so somebody holding a share's link and a picture's id gets a 401. Nothing a share
shows changes, and nothing here needs a `Voiced` pair.

### Decide at pickup

Most of this is decided by eye, so render it first: in the drawer at 1440 and the modal at 390, in
a light theme and a dark one, with real pictures — a save screen, a busy scene and a phone photo of
a TV.

- **Where the pictures are kept.** Recommended: Postgres, as above.
- **Every board, or games first.** Recommended: every board at once. A note is the same thing on
  every board and `NoteList` is one component, so a games-only switch would be a branch with
  nothing to say. The user asked for it *"for my notes section of the games board, or in
  general"*.
- **How small a picture is kept.** A long edge and a quality, picked by reading a real save screen
  at each: the smallest that keeps its smallest text readable. WebP where the browser can write it,
  with JPEG behind it, since a canvas asked for a type it cannot write hands back a PNG.
- **The way in.** The button in the compose box, its symbol or word and where it sits beside *Add
  note*; the waiting thumbnails, and how one is taken back out; and how the box shows a file
  dragged over it.
- **The edit box.** Recommended: it takes pictures as the compose box does and can take one out,
  saved in one request with the words. One box doing one job is why Enter sends in both
  (`docs/journal.md`), and a paste that works in one box and does nothing in the other is the same
  near miss.
- **How a note shows its pictures**: the size of a thumbnail, how several sit together, and whether
  they go above the words or below them.
- **The viewer**: what opens when a picture is pressed, and whether it steps on to the note's next
  picture.
- **What a card shows when its latest note is a picture**: a small thumbnail, a word in the note's
  place, or the latest note that has words. Each changes `LatestNoteOf`; see **Things to get
  right**.
- **What the spreadsheet does.** Its cells are text. Recommended: a count of pictures on the Notes
  sheet, so a picture-only note's row is not blank, and *Latest note* saying the same. The pictures
  themselves stay out, which bends *everything you have* (`docs/export.md`); a download of them
  would be a feature of its own.
- **The limits.** Recommended: four pictures to a note, 2 MB a picture after the shrink, and 1 GB
  an account. Each is the server's, and a refusal says which one it hit.
- **Whether `Auth:AllowNewAccounts` comes first.** Sign-up is open (CLAUDE.md, **Small things**),
  and this is the first feature a stranger could use to fill the server's disk, with the backups
  holding it again for every night they keep. An account's cap bounds one account, not how many
  get made.
- **The words**: the button, each refusal, what the box says while a picture is on its way (what a
  search tile says mid-add is still open, CLAUDE.md, **Small things**), and whether deleting an
  account counts pictures as well as notes.

### Things to get right

- **The picture's address must not end in an image extension, and must say `private`.** Cloudflare
  caches the file types it knows at its edge by default, as it does the icons (`docs/deploy.md`,
  *Cloudflare turns the icons' `no-cache` into four hours*), and an edge copy is served to anyone
  who asks, signed in or not. `private` keeps it out of every cache but the browser's.
- **The server reads the bytes, never the type it is told.** JPEG, PNG and WebP, known by their
  first bytes, and nothing else: never an SVG, which can carry script, and never a file that only
  says it is a picture. `nosniff` stops a browser second-guessing what was stored, and a size limit
  on the route refuses an oversized request before it is buffered.
- **The empty-note rule moves into the service.** *A note needs something in it* is
  `NoteRequest.Validate` today, and it sees only the body. Whether a note with no words is empty
  now depends on the pictures it keeps, which only the service can see, so the service refuses
  it, still as a 400 that names the field and never a 500.
- **A card knows it has notes from its preview.** `Card.tsx` hands `item.latestNotePreview !==
  null` to `describeRemoval`, which is how *Remove from board* knows to say *and its notes*. A
  picture-only note's body is empty, so `LatestNoteOf` would hand the card `""`, and the card would
  draw an empty note line. Leaving those notes out of the preview instead would let a title whose
  only notes are pictures leave the board with no warning: #14's nine notes again, as pictures.
  Whatever the workshop picks, the card still has to know there are notes. Both projections carry
  the preview, `LatestNoteOf` and its copy in `ItemAsync`, and they must agree, or a move makes the
  card's note flicker. A share's `NoNote` stays a constant.
- **Every picture's width and height are stored and drawn**, as the `<img>`'s own attributes, so
  its space is held before it loads. A journal opened at a note a search found scrolls to it
  (`docs/journal.md`, **Opening the journal at the note**), and pictures above it arriving
  afterwards would push it back out of view.
- **A phone photo stays upright.** A phone often records which way up it was held in the file
  rather than in the pixels. The browser has to honour that when it draws the picture onto the
  canvas, because saving it again throws the record away.
- **A paste that carries text as well pastes the text.** Some apps put a picture of what was copied
  on the clipboard beside the words, with Excel's cells the case most often reported, so taking
  every picture would turn a pasted line into a picture of it. **Measure before writing the rule**:
  a throwaway page that logs `clipboardData.types` and `files` for each place the user copies from
  (Win+Shift+S, *Copy image* in a browser, Excel, Word, OneNote), in the browsers the user has.
- **A file dropped just outside the box must not take the app away.** Chromium opens a dropped file
  in the tab when nothing takes it, which loses the draft and the drawer. Once the drawer invites a
  drop a near miss is likely, so the drawer takes, and ignores, a drop anywhere outside the box.
- **A failed send keeps the words and the pictures in the box**, under the error. Closing the drawer
  before sending loses them, as it loses unsent words today. Each waiting thumbnail is an object
  URL, revoked when its picture is sent or taken out, or when the box goes.
- **The multipart write invalidates what the JSON write does** — `mediaKey(hobby, mediaId)` and the
  library, in `useNotes` — because a card carries the latest note. `api/client.ts` sends JSON
  alone, so it learns a `FormData` body, and must not set `Content-Type` for one: the browser
  writes the boundary into that header, and a hand-written one loses it.

### Tests first

jsdom has no canvas, so the shrink is a module of its own that Vitest replaces, and Playwright, in
a real browser, is what proves it.

- **A note can be a picture alone, and a note with neither is refused**, naming the field. Red
  against today's `NoteRequest`. An edit that empties the words of a picture-only note keeps it,
  and one that takes the last picture out of a note with no words is refused.
- **A picture is yours alone.** Another user's picture id is a 404, as another user's note is
  (`UserScopingTests`), and no picture can be added to somebody else's pass or note.
- **Signed out, a picture is a 401**, share link or not, and *no route a share reaches reads a
  picture*, on `SqlRecorder`'s commands.
- **Opening a journal never reads the bytes.** `SqlRecorder` over each read that carries notes
  names `note_pictures` and never `note_picture_bytes`, after first proving on the picture route
  that it sees the bytes being read.
- **The answer's headers**: the stored type, `private`, `immutable` and `nosniff`.
- **Only a picture is taken, and only so much.** An HTML file sent as `image/png` is refused, and
  so are an SVG, an oversized picture, a fifth picture on a note, and a write past the account's
  cap. Each refusal says which.
- **Pictures go where their note goes.** Deleting the account, removing the title and deleting its
  last pass leave no picture rows, and deleting one pass of two moves its notes' pictures with
  them.
- **Notes come back with their pictures**, in order and with their sizes, from every read that
  carries notes.
- Vitest, the box: a pasted picture waits as a thumbnail; Enter sends the words and the picture in
  one request, which MSW reads as multipart; a picture alone sends; a paste carrying text pastes
  the text and attaches nothing; a plain paste is unchanged; a failed send keeps both; a waiting
  picture can be taken out; a drop takes a picture as a paste does; and the button's input asks
  for `image/*`.
- Vitest, the drawer: a picture is drawn at its stored size before it loads, and pressing it opens
  the viewer, which Back closes with the journal left open.
- **A title whose only note is a picture still warns** that *Remove from board* takes its notes.
- The card and the Notes sheet show a picture-only note as the workshop picks.
- e2e: paste a 2560 × 1440 screenshot into the box with a dispatched paste event, send it, reload,
  and the picture is there, decoded, with its long edge at the cap; a phone photo held upright
  arrives upright; and at 390 × 844 the button's input takes a picture through `setInputFiles`.
- **Put the fault back:** move the bytes onto `note_pictures`; drop `private`; trust the type the
  request names; take the picture when text came with it; leave picture-only notes out of the
  card's preview; drop the `<img>`'s width and height. Each turns its own test red.

### Decided at pickup

Picked up on 30 October 2026, the day it was planned. Six choices were made in words before
anything was drawn. Five were the recommendation, and the sixth was the user's own.

- **Postgres**, in the two tables above, with the bytes kept apart from what the drawer reads.
- **Every board at once.**
- **The edit box takes pictures and can take them out.** It takes a paste, a drop or the button,
  as the compose box does. Each picture has an × to take it out. The words and the pictures are
  saved in one request.
- **Four pictures to a note.**
- **The spreadsheet counts them.** The Notes sheet gets a Pictures column, and *Latest note* says
  so in words when the newest note is only a picture.
- **A cap of 1 GB for every account but the user's own, which has none.** This was the user's
  choice, made over a cap on every account: *"I want a cap per account like suggestion #1 but have
  no limit on my account since I am the sole user."* **The server knows that account by
  `users.role = 'admin'`.** It is the column's first reader. It needs one `UPDATE` on the user's
  row when this deploys and no new setting on the server, and it is the role CLAUDE.md already
  names for the refresh routes. The four-picture limit and the size limit on a picture still hold
  for every account, the admin's included. Sign-up stays open, and `Auth:AllowNewAccounts` stays
  on CLAUDE.md's **Small things**.

**Measured the same day, in the user's Firefox 159, with a throwaway paste probe.** A snip, from
Win+Shift+S or ShareX, carries one PNG and nothing else. Discord's *Copy image* carries one PNG
and an `<img>` tag as HTML, with no plain text. **Excel carries the row as plain text, HTML and RTF,
and a 1011×201 PNG of the cells.** A picture dragged out of Discord carries its link and no file.
So the rule is that a paste with plain text in it is words: the text goes in and nothing is
attached. A paste with no text attaches each picture it carries. Word and OneNote were not tried.

**Round two's page**, private: https://claude.ai/artifact/LC4VHgD3xZxkAWqqLipK7F. It has six
questions, drawn in the real drawer with the user's own pictures. Those are Harmony of
Dissonance's status screen, a snip of its stats panel, Symphony of the Night's clear file and a
photo of the TV. They are shrunk in Chromium as the app would shrink them. The harness is in the
gitignored `frontend/workshop.local/pictures/`.

### Decided from the renders

Seven choices on 30 October 2026, over two rounds of questions. Six were the recommendation, and
the card's thumbnail was the user's own pick.

- **A note shows its pictures as a collage, under the words.** A lone picture is shown whole, as
  wide as the column and up to 320px tall. Two or more are 16:9 tiles, two to a row, cropped to
  fill. Three are one across and two under it, and four are two by two. The five staged notes
  took 1,316px at drawer width, against 710 as thumbnails and 2,911 large.
- **The compose box holds a waiting picture inside its border**, under the words, with an × on
  each. **A picture-frame icon** sits before *Add note*, named *Add a picture* on hover and for a
  screen reader. The edit box is the same, before *Save note*.
- **Pressing a picture opens a lightbox** over everything, on near-black. It fits the picture to
  the window, and shows a small one at its own size, because blowing up a 537px snip only blurs
  it. ‹ › and the arrow keys step through the note's pictures, with the note's date and *1 of 2*
  above. Escape, × and Back close it, and the journal stays open.
- **A card shows a thumbnail 28px tall**: the newest note's first picture, in the note's line and
  beside its words. **This was the user's pick over the words *A picture***. The cost was shown on
  the page: a card whose newest note is only pictures grows 12px, and the thumbnail is too small
  to read.
- **The card's thumbnail is a small copy, made when the picture is sent.** It is about 96px tall
  and a few KB. This was a follow-up the pick raised: drawn from the full picture, the board would
  download 40–90 KB for every card to show it 28px tall.
- **Kept at a 1920px long edge, as WebP at 85**, or JPEG at 85 where a browser cannot write WebP.
  In the zoomed crops it matched the originals at about 40–90 KB a picture. The user's snips are
  1920×1080, so the edge only ever shrinks phone photos. The user's Firefox writes WebP at about
  Chromium's size, 90,144 bytes for the status screen against 90,764.
- **The words as proposed on the page.** They include deleting the account counting pictures:
  *…41 notes and 12 pictures.* With the thumbnail on the card, *A picture* and *2 pictures* are
  what a screen reader says for it, and what the spreadsheet's *Latest note* says when the newest
  note has no words.

### Built

Built on 30 October 2026, the day it was planned and workshopped, tests first, all seven steps, on
`pictures-in-notes`, and **shipped and deployed early on 31 October 2026** (PR #84): the full e2e
suite went 210 green first, the 205 before and `pictures.spec.ts`'s five. The write-up is
`docs/journal.md`, **Pictures in notes**, with the tables in `docs/data-model.md`, the card in
`docs/board.md`, the share and the scoping in `docs/auth.md`, the look in `docs/design.md`, the
spreadsheet in `docs/export.md`, and the deploy's one `UPDATE`, Cloudflare and the backups in
`docs/deploy.md`.

- **The backend**: `NotePicture` and `NotePictureBytes` and the migration `AddNotePictures`;
  `PictureFormat`, which reads a picture's type and size from its header; `NoteForm`,
  `NoteWriteOutcome` and the rules in `NoteService`; a `multipart/form-data` action beside each
  JSON one, told apart by `[Consumes]`, with `[RequestSizeLimit]`; `NotePicturesController`;
  a `ThenInclude` on every read that carries notes; the card's picture and count through
  `CardNote`, three slots where there was one; `AccountDto.Pictures`; and `User.AdminRole`, the
  role column's first reader.
- **The frontend**: `api/client.ts` sends a form as it is; `api/notes.ts` takes pictures and names
  their addresses; `lib/shrink.ts` and `lib/pictures.ts`; `journal/usePictureDraft.ts`,
  `NoteBox.tsx` and `NotePictures.tsx` (the collage and the lightbox), with `NoteList` built
  around them; the drawer's guard against a near-miss drop, and its keys held back while a
  picture is open; the card's thumbnail; the spreadsheet's count; the warning's count.
- **The harnesses**: `src/test/setup.ts` puts Node's `FormData`, `Blob` and `File` in place of
  jsdom's; `test/passes.ts` records a form write apart from a JSON one; `e2e/pictures.spec.ts`;
  and `e2e/support/api.ts`, the API's port for the config and the spec.

### Tests

Backend 905 and frontend 1,287, all green. **The full e2e suite, 210 specs in Chromium, went 209
green and one red**: `export.spec.ts` read the Notes sheet by position, and *Pictures* had moved
*Note* one place right. It reads by header now and passes. `journal.spec.ts` and
`pictures.spec.ts`, 39 specs, passed again after the last two fixes below.
**`pictures.spec.ts` ran once in Firefox 153**: three passed, and two skip themselves there, the
scripted paste and the phone, each saying why.

**Every fault was put back, one at a time**, by scripts that planted it, ran the tests and put the
file back:

| Step | Faults | Red on their own test |
|---|---|---|
| 1. Schema | 7: each check, the unique place, each cascade, the bytes on `note_pictures` | 7 |
| 2. The writes | 19: the type taken from the request, every rule, the cap's scope and its sums, a kept id from another note, both scopes | 18; the nineteenth is a finding, below |
| 3. The reads | 10: no `ThenInclude` anywhere, the bytes `Include`d, each route's scope, `public`, no `nosniff`, no `[Authorize]`, the thumbnail route answering the picture, the order | 10 |
| 4. The card | 9: each slot's scope, the first picture by id, the oldest note's picture, a picture-only note left out, `ItemAsync`'s two, a share given pictures, the account's count | 9 |
| 5. The client | 14: a form's own `Content-Type`, the paste rule, a tile with no size, the box emptied early, the drawer's keys, the drop guard, a fifth, the picker's type, a note of pictures rewritten as JSON, the arrows, the warning on the card, the card's full picture, the sheet, the warning | 14 |
| 6. The browsers | 3: no route limit, a 2560 edge, the orientation option | 2; the third is a finding, below |

**Two gaps found reviewing the built thing, each fixed with its test red first.** A paste or a
drop while a note was on its way was taken after the send had taken its snapshot, and the clear
that followed dropped it without a word: the box takes nothing while sending now. And a reload
whose history still named a picture deleted since left the journal deaf to its own Escape with
nothing over it: the drawer counts a picture open only when the journal holds it. The first
test passed against the bug as it was first written, because the box ended empty either way; it
asks what the box took in now.

### What the plan got wrong, or left out

- **EF Core sends a delete ahead of an insert into the same unique place.** The plan put new
  pictures after every place a note had used, so none could land where one was leaving; putting
  them straight after the kept ones changed nothing a test could see, so the simpler rule stayed
  and the swap test is the tripwire.
- **The route's size limit was not testable where the plan put it.** `MultipartBodyLengthLimit`
  limits each part of a form, and the test server keeps no `[RequestSizeLimit]`, so a backend test
  passed because the service refused the picture too. It is an e2e case now, and MVC answers it as
  a 400 under no field, not a 413. Through Vite's proxy an oversized body sent anyway was a 502 or
  a hang one run in four, so the case asks with `Expect: 100-continue`, straight to the API, which
  is also the proof that nothing read the body.
- **`imageOrientation` is not what turns a photo.** Chromium 151 and Firefox 153 both turn a photo
  by its EXIF when they decode it, whatever the option says. The upright case proves the outcome,
  and the option stays as a statement of intent.
- **Firefox gives a paste made in a script an empty clipboard.** The e2e paste case is Chromium's,
  and Firefox reaches the shrink through the picker. The user's real Firefox pastes were measured
  with the probe.
- **jsdom's form classes and Node's `fetch` do not meet**: a form holding a jsdom file stalled on its
  way through MSW. `setup.ts` swaps Node's in, as it already supplied `localStorage`.
- **The reads that carry notes are eleven, not ten**, counting the note's own `GET` and its JSON
  rewrite, which the plan left out because they had no pictures to carry until this.
- **The card's thumbnail is held to twice as wide as tall** (`max-w-14`, `object-cover`), and the
  thumbnail itself fits 192 by 96. The renders never showed a panorama, and drawn by its own shape
  at 28px tall one would run across the card. No picture the workshop drew is affected.
- **What EF writes for the card's picture is a window over every row of `note_pictures`**,
  measured. Cheap because the table is narrow; `docs/board.md` says what to change if it shows.
- **`ItemAsync` could take the column's card whole** and end its copy of the projection. Noted in
  `docs/board.md`, not done.

### The deploy, and what it left

- **Deployed at about 01:45 Eastern on 31 October 2026**, `808a6d8` to `bbd2c34`: api and caddy
  both recreated, api first, and no base image moved. `AddNotePictures` is the newest migration in
  production's history, and the API's log names it. At `<origin>` the script and the stylesheet
  carry the box's and the lightbox's words and the four rules the collage adds, none of which they
  held before, and `GET /api/note-pictures/{id}` went from an empty 404 to a 401 signed out.
- **Cloudflare, signed out**: a picture's address answered 401 with `cf-cache-status: DYNAMIC`,
  Cloudflare's word for an address nothing in the zone makes eligible for its cache. **The
  signed-in look is still to be had**: the first real picture's request in the browser's network
  panel, with no `cf-cache-status: HIT`.
- **The admin's `UPDATE` was handed to the maintainer**, as `docs/deploy.md` says it is theirs. The
  session that deployed tried it and was refused by Claude Code's auto mode as a permission grant.
  **The user ran it minutes later**, through the same `psql`, and it answered `UPDATE 1`, so the
  user's account has had no cap since 31 October 2026.
- **The user's own check**: a real Win+Shift+S snip pasted in Firefox, which no script can make,
  and on the Android phone a photo from the gallery and one from the camera. **Done, reported on
  7 November 2026.**

---

## 19. An estimate that catches up · shipped

**Planned 3 November 2026**, at the user's request. Lines were read at `4fdb7cf`.

**What the user asked for.** A game comes off the calendar into Backlog on its release day, which is
fine, but its HowLongToBeat estimate never arrives: nobody has finished a game on the day it comes
out, and weeks later the card was still blank. The user's way round it was to type a different id
into the pin, press Enter, type the original back and press Enter again. Their first idea was *"a
refresh button between the field and View on HowLongToBeat"*, and they asked whether there was a
better way.

**Why the estimate never arrives**, read from the code:
- Adding a title queues one lookup (`HltbOnMediaAdded`). HowLongToBeat can list a game before it is
  out, with no times on it. The matcher compares names, never times, so it accepts that entry and
  stores its id, `HoursOf` turns the zeros into nulls, and `hltb_checked_at` is stamped.
- **Nothing ever asks again.** The only other way into the queue is `POST /api/games/hltb/refresh`,
  which has no button and skips a title asked about within `Hltb:RecheckAfterDays` (30). Release
  day is not an event: the calendar is a view of Backlog, so no job runs when a title comes out.
- **The trick works because the box will not re-send an unchanged id** (`HltbPin`'s `commit()`, so
  that tabbing past it costs nothing). Pinning another id and then the first forces two fetches,
  and the second, by id, brings the times. The server would re-fetch the same id gladly.
- **Clearing a pin queues nothing either.** `PinAsync(null)` resets the title to never-asked, the
  card polls for 90 seconds, and nothing answers until somebody runs the backfill.

**Measured on 3 November 2026**, from a read-only query of production that the user ran, because
auto mode had refused it to the session:
- **Every title on the user's games board has a HowLongToBeat id**, 91 of 91. So for them a refresh
  is always one fetch of a game page, which needs no handshake.
- **Fifteen have an id and no figures, every one matched before its release**: fourteen on the
  calendar, asked between 11 September and 6 October, and Phantom Blade Zero, out 29 October, asked
  on 11 September and Playing's *1 with no estimate*. Final Fantasy Resonance, out 22 October, was
  in the same state until the user's trick at 11:07 that morning, and has 50.75 h now.
- **Every board**: 161 library games, 22 with no figure (17 of those with an id), and 33 last asked
  more than 30 days ago.

### Decided at pickup

The first round, four questions with ASCII previews on 3 November 2026, two of them this feature's.
- **Both: a refresh button in the journal, and a check that runs by itself**, as recommended.
- **The check runs on the backfill's own rule, every 30 days**, the user's pick over the
  recommendation of every night for a release's first three months. A new release can wait up to a
  month on its own, so **the button is what carries a new release**.

### Decided from the renders

Rendered on 3 November 2026 on the shipped app, with two components swapped for prototypes and
every `/api/` request answered from the user's board as read that afternoon: the private page
https://claude.ai/artifact/E8TV1xCBeB5uampa9CdJvo. Harness in `frontend/workshop.local/estimates/`
(gitignored).
- **B, a symbol beside the box, on every game**: a circular arrow between the ID box and *View on
  HowLongToBeat*, the user's pick over the recommendation, C, *Check now* in the line that says
  there is no estimate. Measured: B keeps the drawer's header at 148px where a word there (A) wraps
  the link under the box; on a 390px phone all three wrap the link, as the drawer does today.
- **Say when HowLongToBeat was last asked**, as recommended: *Last checked Sep 11*, a line under
  the row. `GameDetailDto` does not carry `hltb_checked_at` today, so the build adds it.
- **B's two warts, settled by three follow-up questions the same day.** As rendered, *Checking…*
  was wider than the symbol and dropped the link under the box while it checked, and after a check
  that found no times the header's answer and the line below both said there were none.
  - **While it checks, the arrow turns in place**, as recommended, and the box dims: nothing moves.
    With reduced motion it dims instead of turning, and its name says *Checking HowLongToBeat*.
  - **A check's line says *Checked just now* and nothing more**, as recommended. The line under the
    row is only ever about when HowLongToBeat was asked, and the figures below say what it has.
  - **The line shows on a game with no figures**, *Last checked Sep 11* at rest, the user's pick
    over showing it on every game. A game with figures shows it only right after a press.

### Things to get right

- **The button is `POST /api/games/{mediaId}/hltb/refresh`, and it runs `HltbService.UpdateAsync`
  there and then**: a pinned id fetched, no id searched for and matched, exactly as the worker does
  it. It answers with the detail as the pin does, 404 for a media id that is not a game, and
  `HltbExceptionHandler`'s 502 when the site cannot be reached. **One outcome needs words of its
  own**: a pinned id HowLongToBeat no longer knows, where `UpdateAsync` stamps the title and keeps
  the old figures, so *Checked just now* would be untrue. Say so, as the pin's 400 names the id.
  `UpdateAsync` returns a bool today, which cannot tell that case from a check that found nothing.
- **The arrow is the pin's neighbour, and they share one write at a time**: the box disables while
  a check runs, as the box already disables itself while a pin is in flight, and *Checked just now*
  is the mutation's own success, held until the drawer closes; after that the stored date is what
  the line reads.
- **The timer is `ReleaseRefreshWorker`'s shape**: a singleton taking a scope per run, a switch that
  short-circuits at startup and says so, every failure logged and swallowed, and a startup delay
  that clears the migration. Each run queues what `BackfillAsync` selects, so `HltbWorker` stays the
  only thing that talks to HowLongToBeat, behind the throttle. Daily, so a title comes due 30 days
  after its own last ask and the load spreads out.
- **The three things `docs/games-hltb.md` says a sweep must get right**: `Hltb:Enabled` gates it,
  and so does a switch of its own, **off in Development**, so that a local run is not traffic; **off
  under Testing and E2E**, as the release sweep is, because a timer needs no invitation; and a
  restart must not re-ask, which selecting by `hltb_checked_at` already ensures.
- **Clearing a pin should queue a lookup**, so the card's 90 seconds of polling has something to
  wait for. Otherwise the title waits for the timer.
- **A refresh writes the shared catalogue row**, as a pin does, so the figure is everybody's. That is
  right: the figures are HowLongToBeat's, not anybody's opinion.

### Tests first, to be confirmed at pickup

- Backend, with `FakeHltbClient` answering differently on a second ask: a pinned id refreshed brings
  its new times; a title with no id is searched again; *no times yet* is said rather than a 200 that
  changed nothing; 404 and 502 as the pin has them; a timer's run queues exactly what the backfill
  would (never asked, asked 31 days ago, and not yesterday's); nothing runs when either switch is
  off; clearing a pin queues.
- Frontend: the button sends once, holds the pin box while it checks, and refreshes the board's
  figure and the drawer's.
- End to end: `hltb-stub.mjs` gains a game whose times arrive after its first fetch, so the button
  is proved against the real client.

### Built

Built on 3 November 2026, the day it was planned and workshopped, tests first, in the order the
user gave: the backend, then the journal's arrow and its line, then the stub's late game, on
`estimates-that-catch-up`, and **shipped and deployed late the same evening** (PR #87). The
write-up is `docs/games-hltb.md`, **The arrow asks
again** and **The backfill runs once a day**, with the look in `docs/design.md`, **An estimate that
catches up**, the day in `docs/data-model.md`, and the route in `docs/api.md`.

- **The backend**: `HltbLookupOutcome`, which `UpdateAsync` answers in place of a bool;
  `RefreshAsync`, `UpdateAsync` and then the service's own detail read, so the sites that order a
  title's passes stay nine; `POST /api/games/{mediaId}/hltb/refresh`, with its 409;
  `GameDetailDto.HltbCheckedAt`; the queue in `PinAsync`'s clearing branch; and
  `HltbBackfillWorker` with `HltbBackfillOptions`, the `HltbBackfill` block in `appsettings.json`,
  its switch off in `appsettings.Development.json`, the worker out of `ApiFactory`'s host, and
  `HltbBackfill__Enabled` off in `playwright.config.ts`.
- **The frontend**: `refreshGameHltb`; `GameDetail.hltbCheckedAt` and `TitleHltb.checkedAt`;
  `JournalSection.refreshHltb`, null for films, shows and anime and held to `setHltbId`'s pairing;
  `useJournalEntry`'s `refreshHltb`, which refreshes the board and the drawer on a success and on
  the 409; the drawer's `checked`; and `HltbPin`'s arrow and its line.
- **The harnesses**: `FakeHltbQueue` locked and waitable, for the first writer not on the
  request's thread; `journalServer`'s `refreshed`, `refreshHeldUntil` and `refreshes`, with its
  read answering what a check left; the stub's *Tunic II*; and `holdChecks` and `todayAsChecked` in
  `e2e/support/hltb.ts`.

### Tests

Backend 920, the 905 before and fifteen; frontend 1,302 with `tsc` clean; and **the full e2e suite,
213 specs in Chromium, all green**, the 210 before, three new and one rewritten. **Every test was
red first**, on what it asserts rather than on a compile error: a type the tests named was put in
first carrying the old behaviour, or written as null.

| Step | Tests | Red first by |
|---|---|---|
| 1. The route | 5 endpoint, 2 service | four 404s from a route not there yet; the two outcomes a bool could not tell apart, against the old bool's mapping. The film's 404 passed with no route at all, and was proved by letting `NoSuchGame` fall through to a 204 |
| 2. `hltbCheckedAt` | 3 | two on the value, with the field on the contract and written as null. The never-asked case passed against that, and was proved against a stand-in date |
| 3. Clearing queues | 1 | an empty queue |
| 4. The timer | 6 | the run timed out against a worker that did nothing; the two switches timed out against a worker with none; the host guard once it was registered; Development's switch until the override |
| 5. The journal | 2 API, 2 contract, 12 drawer, 1 board | fifteen red. The two that say nothing passed with no line at all, and were proved by fault |
| 6. End to end | 3 new, 1 rewritten | all four, with the stub's late game out and the pin's queue out |

**Faults put back, one at a time, each red on its own test**: in the drawer, the line on every
game, a line for a title never asked, a second press sending, the line read off the request's own
success, the arrow left in during a pin, the box not held, and the board not told; end to end, a
check that searched again instead of fetching its id, and a glyph that turned whatever the reader's
setting.

**The built arrow was shot beside prototype B**, in the states it was rendered in, from the
gitignored `workshop.local/estimates/compare-built.mjs` on the staged board. The header band
matches B in every state: 148px on a game with figures, 172px with the line. **While it checks it
stays at 172px with the link in place**, where B's render had dropped the link, and the glyph's
computed animation is `spin`, or none at 0.5 opacity under reduced motion.

### What the plan got wrong, or left out

- ***No times yet* is said by the figures, not by the route.** The test list was written before the
  follow-up that made the line *Checked just now* and nothing more, so the route has no outcome of
  that name: it answers 200 with `hltbCheckedAt` moved, which is what tells the drawer the check
  ran, and the pass band's *No HowLongToBeat estimate yet* says the rest.
- **A 409, not the pin's 400**, for an id HowLongToBeat no longer has: nothing in the request was
  wrong, the title's stored id is, and pinning another resolves it. **The plan did not say whether
  that check is stamped.** It is, as the worker stamps it, so the drawer refetches after the 409 as
  after a success.
- **`UpdateAsync`'s bool never meant "times stored"**, as its comment said: it was true for any
  entry found, a listing with no times included. The outcome that replaced it says so.
- **Clearing a pin made an existing spec a race.** *Taking the pin back puts the title in the way
  of the next backfill* read `hltb_checked_at is null` straight after clearing, which the worker now
  replaces within a second. It is *taking the pin back asks HowLongToBeat again, by name*, and
  watches the card fill itself back in.
- **The pin's own *Checking…* is as it shipped.** The follow-up was about the arrow's check, so a pin
  in flight shows *Checking…* in the arrow's place, as B rendered it, and the link can still drop
  for the length of a pin. The arrow turning for a pin too would be a question for the user.
- **The arrow is `aria-disabled` while it checks, not disabled**, which the plan did not say: a
  disabled button lets go of the keyboard, as the pin's box has always done to its own focus.
- **The render's *Sep 11* has no year because it was this year's.** The build writes the year for a
  check in another, by `formatDayShort`'s rule, and the day is the journal zone's.
- ***Checked just now* lost the render's full stop**, which belonged to a second sentence the
  follow-up took away.
- **A bare `reducedMotion` in Playwright's `test.use` is ignored.** The first red run of the spec
  that dims the arrow failed with the arrow spinning, which was the spec being wrong rather than
  the fault it was there to catch. It uses `emulateMedia`.
- **The stub's late game is split between its two routes rather than counted**, which the plan
  left open: a count would need resetting between specs the stub outlives, and the split proved the
  stricter.
- **The timer starts five minutes after a restart, as the release sweep does**, so both run
  together. They ask different providers, and the HowLongToBeat one only queues, so it was left so.

### The deploy, and what it left

- **Deployed at about 22:33 Eastern on 3 November 2026**, `bbd2c34` to `35d0443`, carrying #85's
  and #86's docs with it; #86's ten code files changed comments only. api and caddy both
  recreated, api first, and no layer downloaded. No migration and no variable.
- **Proved from outside.** The bundle went `index-zCZzEfR5.js` to `index-B9YY9hlB.js`, and the
  stylesheet `index-BCW_OGjA.css` to `index-m9ecWys3.css`, the local build's name again. *Check
  HowLongToBeat again*, *Checking HowLongToBeat*, *Checked just now*, *Last checked* and
  `/hltb/refresh` went 0 to 1 in the script, and `motion-safe\:animate-spin`,
  `motion-reduce\:opacity-50` and `@keyframes spin` 0 to 1 in the stylesheet. `POST
  /api/games/1/hltb/refresh` signed out went an empty 404 to a 401.
- **Proved inside.** `HltbBackfillWorker`, `RefreshHltbFor` and `HltbLookupOutcome` went 0 to 2, 2
  and 1 in the running DLL, and the API's startup log carried no *switched off* line for either
  worker.
- **The first daily run, at 22:39, queued 33 titles**, the 33 found past thirty days when the plan
  was written, and the queue drained by 22:42: 31 fetched by their id, Phantom Blade Zero's 129235
  last, and 2 searched and refused. Every answer was a 200, with no 429 and no failure. **19 of the
  33 came back with figures that differ from those stored**, counted from the columns EF's
  `UPDATE`s name, and 14 were stamped with nothing new. Which of the 19 had no figure before is
  the board's to show; the database was not read.
- **The user's own check**: Phantom Blade Zero's card, and the arrow pressed on a title still on
  the calendar. **Done, reported on 7 November 2026.**

---

## 20. The titles a column's header leaves out · shipped

**Planned 3 November 2026**, at the user's request, beside #19. Lines were read at `4fdb7cf`.

**What the user asked for.** A column's header says what its figures leave out, as in Playing's
`~13 h to beat · 1 with no estimate` or Completed's `2 without your hours`. Clicking the count
should show which titles they are.

**What it builds on.**
- **The counts are added up on the server over the whole column**, in `HoursOfAsync` through
  `HoursTally`, and `columnHoursLines` subtracts to get them: `total - lengthTitles` with no
  estimate, `lengthTitles - playedTitles` without your hours. **No list of the titles exists
  anywhere yet**, and the rules above forbid working one out from the page of 100.
- **"Without your hours" counts only titles that have an estimate**, so a title missing both is in
  the *no estimate* list alone (see #3). Each list is exactly the titles its count is over.
- **Measured on 3 November 2026**: Playing's one is Phantom Blade Zero (see #19). The seven Completed
  titles without the user's hours were all finished in 2024 or 2025, so that count shows on those
  years and on All years, never on 2026's.

### Decided at pickup

The other two questions of #19's first round.
- **A list under the line**: a popover anchored to the count, a row for each title, and a row opens
  that title's journal, as recommended. In the user's words: *"I would like a list, and clicking on
  the game on that list will open up the game's journal."* At Hours played for the hours list, as
  the option said.
- **Only on your board's columns**, as recommended. The Stats page's line, the picker's, and every
  line on a share stay plain counts. A visitor to a share can fix nothing.

### Decided from the renders

On the same page as #19's.
- **The count in the accent**, the user's pick over the recommendation, a dotted underline: the
  app's link colour, as a search result's name is when it opens a journal (#12).
- **A row is a cover and a name**, with no heading, as recommended. Completed 2025's five make the
  list 226px tall.
- **The list is the column's width and opens under the whole header**, over the cards: 240px at
  1440 and 332px on a 390px phone, where the line sits beside the sort control. The first render's
  288px list ran past its 266px column into the next one, so it was changed before the page went up.

### Found while rendering

**On a 390px phone the board is 406px wide today, before either feature.** The calendar's grid
has a single automatic track there, and each row's title is `truncate`, which is one line, so the
longest title sets the track's least width: Ocarina of Time's row needs 390px of the 358px there
is. Measured in Chromium's phone emulation with the user's calendar: 46px too wide at 360px, 16px
at 390, and it fits at 412. Not part of #19 or #20. A `min-w-0` on the section, or a
`minmax(0,1fr)` track, is the likely fix. The phone shots folded the calendar away so as to measure
at a true 390.

### Things to get right

- **The lists come with the column, from the rows the sum already reads**: `ColumnHours` gains the
  titles each count leaves out, each with its media id, the card's name and its cover. A list then
  cannot disagree with its count, and it moves with every refetch. **The card's name is one more
  copy of the anime coalesce**, held to the cards by a test, as the sum's copy is.
- **A share's response carries no lists.** A share prints the counts and nothing more, and *without
  hours logged*, title by title, is more than it shows today.
- **The line stops being one `role="img"`.** A button cannot live inside an image, so the text keeps
  its spoken form and the count becomes a button with `aria-expanded`. The tests that find a line by
  its image name move with it, on the board and on a share.
- One list open at a time, closed by Escape and by a click outside, with the keyboard put in it when
  it opens.
- **A row from the hours list opens the journal at Hours played.** `OpenJournal` takes options
  already, `askHowLong` being one, so this is a second.

### Tests first, to be confirmed at pickup

- Backend: each list's length is its count, over the whole column rather than the page, and in the
  year the column shows; the names are the cards' for every hobby; a share's column carries none.
- Frontend: the count opens the list and the list opens the journal, at Hours played for the hours
  list; plain text on a share, on Stats and in the picker; at 390px, with `windowOfWidth(390)`.

### Built

Built on 4 November 2026, tests first, in the order the user gave: the two lists on `ColumnHours`,
then the count as a button in the accent with its list, then the journal opening at Hours played,
on `titles-a-header-leaves-out`, and **shipped and deployed at about 03:29 Eastern the same day**
(PR #89). The write-up is `docs/board.md`, **The titles a header's count
leaves out**, with the look in `docs/design.md`, **The titles a header leaves out**, the journal's
half in `docs/journal.md`, **Opening the journal at Hours played**, and the route in `docs/api.md`.

- **The backend**: `ColumnHours.WithoutLength` and `WithoutPlayed`, and `LeftOutTitleDto`;
  `HoursTally.Of`'s second overload, which names what each count leaves out, from its own two
  partitions, when it is told how; `HoursOfAsync` reading the card's name and cover off the rows
  the sums read, in the column's order; and the share's column taking both lists off.
- **The frontend**: the two lists and `LeftOutTitle`; `HoursLine.parts`, `HoursPart.counts` and a
  count that is its list's length where one was sent; `HoursLines` drawing a line as its pieces,
  a count as a button with `aria-expanded`, and the list under the header; `onOpenLeftOut` on
  `Column` and `ColumnFrame`, and `leftOutCountId`; the board's sixth door and its `atHours`; and
  `EntryDrawer`'s `atHours` with `EntryFormHandle.focusHours`.

### Tests

Backend 926, the 920 before and six; frontend 1,327 with `tsc` clean, the 1,302 before and 25;
and **the full e2e suite, 215 specs in Chromium, all green** on its second run, the 213 before
and two, with one moved.
**Every test was red first on what it asserts, or proved by putting its fault back** where it was
written after its code, and the table says which.

| Step | Tests | Red first by |
|---|---|---|
| 1. The lists | 5 column, 1 share, 1 rewritten | the lists written as null, as `HoursTally` first carried them: six red on *should not be null*. Once the board's were built, the two share cases went red on a share naming titles, and green when it took them off |
| 2. The count and its list | 5 unit, 10 column, 2 board, 2 guards and an assertion | the unit five on there being no pieces, and eight of the column's on the count not being a button. The rest passed from the start and were proved by fault: the column's *stays words* and *off this page*, the two board cases, whose wiring went in with the column, and the share's and the Stats page's guards, with an assertion added to the picker's band case |
| 3. At Hours played | 4 drawer, 2 board | five red on the keyboard. The already-held case was red first for the wrong reason, a title seeded into the cache in the shape the API sends rather than the hobby's, and was rewritten to open the title twice. The drawer's *any other way* is a guard, proved by fault |
| 4. End to end | 2 new, 1 moved | written after the code, and proved by fault: the header unpositioned turned both red on the list's left edge, and the hours list opening at the top turned the desktop one red on the keyboard. The header spec moved because the image name it read is gone, as the plan said it would be |

**Faults put back, one at a time, each red on its own tests**: eight on the server and fourteen on
the board, in `docs/board.md`'s table; five for the journal at Hours played, in `docs/journal.md`;
and the two end to end. One plant was wrong the first time. The effect moved above the panel's
named `loaded` in its deps, which are read as the call is made, before the body had declared it,
and 198 cases threw; planted again with what exists at that point, it turned exactly the
already-held case red. And one test was strengthened: the line made one image again first went red
only on older cases that found two images of one name, so the count's case asserts the rule
itself, that no image holds the button.

**The built header was shot beside the picked prototype**, in the states it was rendered in, from
the gitignored `workshop.local/estimates/compare-header.mjs` on the staged board, with the lists
cut to the built shape. At rest no pixel differs, Shelf Light and Shelf Dark, at 1440 and at 390;
open, only the count does, because the prototype shot open lists with the dotted underline. The
lists measure as the prototype's did: 240×50 and 240×226 at 1440, and 332×50 ending at 361px at
390. **The desktop spec passes in Firefox too**, the user's browser.

**The first full run went 214 of 215.** The phone spec's first seed answered a 502, the API
having had no answer from the IGDB stub, before anything of this feature ran. It passed the next
three times it ran beside the desktop spec, in the same order, and **the second full run, of the
code as committed, went 215 green**. The e2e config keeps none of the API's output, so the cause
was not read; Node closing an idle keep-alive connection after five seconds as a request went out
on it fits the gap before it, and is unproven.

### What the plan got wrong, or left out

- **A list could disagree with its count on screen.** The plan said it cannot, because both come
  off the same rows, which is true of the server's answer. The client worked a count out as
  `total - lengthTitles`, and a move writes the total at once and leaves the hours to the
  refetch, so a timed game carried out of Playing took the count to nought while its list still
  named Phantom Blade Zero. On your board a count is now its list's length; a share and the
  Stats page, which are sent no lists and move nothing, still subtract.
- **The door is the board's, not `OpenJournal`'s.** The plan had Hours played as a second option
  on `OpenJournal`. A title from a list needed a door of its own anyway, because the keyboard
  goes back to the count and not to a card, so `onOpenLeftOut` is that door and `atHours` is set
  in `openJournalFrom`, beside `askHowLong`. `OpenJournal` is as it was.
- **The list sits at z-10, the card menu's layer, not the prototype's z-20**, which is the
  drawer's: at z-20 a list scrolled up on a phone rode over the pinned switcher (z-15), where a
  card goes under it.
- **The keyboard leaving closes the list**, which the plan did not list. Each column keeps its own
  list, and a press on another column's count is a press outside this one, but the keyboard has
  no press, so without it two could be open at once.
- **The list is in the column's order, whichever sort it is in**, which the plan left open. The
  renders were in hand-made order, the default, and the order of the cards under it is the order
  that reads as one list.
- **The Stats page names nothing either.** The plan said its line stays a plain count. Its
  comparison goes through the same tally, and naming there would have been passes rather than
  titles, and on a share's Stats page, which is the owner's, more than a share shows.
- **The board's wiring went in with the column**, before a test of its own: `Column` made the door
  a required prop, and the board would not compile without one. Its two cases were proved by
  putting the faults back, as were the three guards that passed from the start.
- **In Dropped the list fades with its column**, at the well's 70%, as a card's `⋯` menu there
  always has. Nobody rendered it, and the user's board shows no count in Dropped; a question for
  the user if a list there ever matters.
- **The share's tests did not move**, though the plan expected them to with the line. A share's
  comparison is still an image, and its counts are words that `getByText` finds as it did. The
  board's line two in `Column.test.tsx` and `hltb.spec.ts`'s header spec are what moved.
- **Found while rendering still stands**: the 406px phone board is not this feature's, and the
  comparison folded the calendar away to measure at 390, as the workshop's shots did.

### The deploy, and what it left

- **Deployed at about 03:29 Eastern on 4 November 2026**, `35d0443` to `e911400`, carrying #88's
  docs with it. api and caddy both recreated, api first, and no layer downloaded. No migration
  and no variable.
- **Proved from outside.** The bundle went `index-B9YY9hlB.js` to `index-CXRpFSOf.js`, and the
  stylesheet `index-m9ecWys3.css` to `index-ComQJ_q3.css`, the local build's name again. In the
  script `left-out-` went 0 to 1 and `focusHours` 0 to 2, and in the stylesheet `.inset-x-0{`, its
  one new rule, found by comparing the two stylesheets' selectors, 0 to 1. `/api/auth/me` answered
  `null` with a 200, and a column signed out a 401.
- **Proved inside.** `LeftOutTitleDto`, `get_WithoutLength` and `get_WithoutPlayed` went 0 to 1
  each in the running DLL, and the startup log had no failure and no *switched off* line for
  either worker.
- **The restart re-armed both timers, and both ran five minutes on**: the HowLongToBeat backfill
  queued 0 titles, since the night before's run had asked every title that was due, and the
  release sweep brought 17 unreleased titles up to date.
- **The user's own check**: a count opened on the live board. Playing's may no longer leave Phantom
  Blade Zero out, since #19's first backfill brought new figures for 19 titles. **Done, reported
  on 7 November 2026.**

---

## 21. The titles behind a rating on the Stats page · shipped

**Planned 4 November 2026**, at the user's request, the morning #20 shipped. Lines were read at
`ca02f40`. **Workshopped 7 November 2026**, in two rounds: the choices below.

**What the user asked for.** The Stats page's Rating section counts how many games were rated at
each number. Clicking a number should open #20's list: the games rated it.

**What it builds on.**
- **The chart is `stats/RatingSpread.tsx`**: a column for each whole point from 1 to 10, its
  count over its bar and the point under it, each bar the colour a card's rating at that point
  wears. The chart is `aria-hidden`, and the same counts are a screen reader's list, *3 rated 9*,
  with the points that have none left out.
- **The list needs nothing from the server.** `StatsDto.Finished` is every finish in the year, not
  a page of them, each with its media id, the card's name, its cover, its rating and when it was
  finished. `ratingCounts` in `stats/stats.ts` files a finish under the whole point below its
  rating rounded to a tenth, so a 9.5 is a 9 and only 10.0 is a 10. A list has to be filed by that
  same rule, one function for both, or a count and its list could disagree at a boundary.
- **It counts finishes, not titles**, as everything on the page does: a game finished twice is two
  finishes, and two in one column's count when both passes are rated at that point.
- **Nothing on the Stats page opens a journal today.** The drawer is the board's, and its heading
  moves a title through the board's own mutation (`columns`, `onMove`, `onPutBack`), which the
  Stats page has none of. Its covers by month and its hours chart are pictures and words.
- **#20's list belongs to `HoursLines`, inside `board/Column.tsx`.** Reusing it means lifting it out
  into a piece both can draw: the panel and its rows, one list at a time, the keyboard put in it
  and handed back, Escape, a press elsewhere and the keyboard leaving.
- **A share's Stats page names no rating today.** The covers by month and the hours chart show
  titles without their ratings, so on a share a rating is seen title by title only on the Completed
  column's cards, and only when that column is shown.
- **Measured on the staged board as read on 3 November 2026**, which holds each title's current
  pass rather than every finish, so as a guide only: under All years the 8s are 23 and the 7s 17,
  and in 2025 the 8s are 14. At #20's 42px a row, 23 is nearly a thousand pixels of list.

### The real finishes, read first

The October Stats workshop's copy of the user's finishes, read from production on 29 October 2026
(`workshop.local/months/finished.json`, gitignored), was the data for both rounds: **61 finishes,
60 rated**. Under All years the points run 5:1, 6:6, 7:17, **8:22**, 9:8 and 10:6; the 8s are
17 at 8.0 and 5 at 8.5, the 7s 14 at 7.0 and 3 at 7.5, and every other rating is a whole point.
**No game was finished twice.** The longest name is 63 characters.

### Decided at pickup

Round one, in words, with ASCII previews, on 7 November 2026. Every pick but one was the
recommendation.
- **What a title in the list does: nothing.** A cover and a name, (a), as recommended; round two
  added its exact rating (below). The journal stays the board's.
- **What is pressed: the whole column**, as recommended, one button named as the screen reader's
  list named it, *22 rated 8*, which replaces that list. About 66×117px at 1440 and 33×117px on a
  phone, where the count alone would have been 13×16px.
- **The order, which the plan left out: highest rating first, then the order finished**, as
  recommended, so under 8 the five 8.5s lead and the 8.0s follow oldest first.
- **A game finished twice at one point: two rows, each dated**, the user's pick over two plain
  rows. Only a title that appears twice in a list says when each finish was, and it says the day,
  as `formatJournalDate` writes it, rather than round one's month, which would read the same for
  two finishes in one month.
- **On a share: your Stats page only**, as recommended. A share's chart is a picture, as it was.

### Decided from the renders

Round two, on 7 November 2026, from a private page of renders of the shipped Stats page with
`RatingSpread` swapped for a prototype, on the finishes above, in Shelf Light and Shelf Dark at
1440 and 390, Ember where its red was the point, and 1024 and 768 for the list:
https://claude.ai/artifact/4kAxfVy3n4hBMvgx61xge2. Three picks were the recommendation; the row
was the user's own, reversing round one.

| Choice | Picked | Rendered against |
|---|---|---|
| How a column says it opens | **Its count in the accent**, the colour of words that open something since #12 and #20; underlined under the pointer | the counts muted, as today, which on a phone, with no hover, say nothing |
| Which column is open | **A tab**: the point's number in the accent with a 2px rule under it, the hobby nav's mark for the one chosen | the other bars at 35%; the column on the accent at 10% |
| Where the list opens | **In the panel, two across** from `sm`, down the first column and then the second: it covers nothing and needs no press elsewhere to close | over the page as long as it is, #20's shape; over the page held to 320px; in the panel, one column |
| A row | **A cover, a name and the exact rating**, `★ 8.5` as a card prints it, at the row's end, the user's pick | a cover and a name, round one's pick |

### Found while rendering

- **A tint cannot be both visible and readable.** Measured against the well in all eight themes:
  the hover colour is 1.03–1.47:1 off it, invisible on the light themes; the line colour and the
  accent at 15% take the muted counts under 4.5:1 on four and three themes; the accent at 10%
  keeps them at 4.63:1 or more and stands only 1.12–1.22:1 off the well.
- **The first tab sat on the baseline**, under the bar. On a phone it was the bar's own width and
  read as the bar's foot, so it moved under the point's number before the page went up.
- **Every list the user has, measured at 1440**: of the 20 across All years, 2026, 2025 and 2024,
  one column in the panel moves the panels below for 6 of them, by up to 612px; two across moves
  them for 3, by 188px at most, the All years 8s; over the page moves nothing and covers up to
  890px. On a phone every option is one column, and the 8s grow the page 918px.
- **At 1024, the narrowest the panel is beside its neighbour, the picks together cost names.**
  Two across with the rating makes each row 217px: 12 of the 22 eights' names take two lines and
  4 are cut short by the two-line clamp, against 6 and 1 without the rating. None is cut at 1440,
  768 or 390.
- **Ember's accent is `#f2545b`, beside a low rating's `#ff6b6b`**, so on Ember the counts and the
  tab are nearly the red of a bar under 6, a cost #12 and #20 took there too.

### Things to get right

- One function files a finish under its point, for the count and for its list.
- Stats is games only, by `HobbyDefinition.stats`, and a phrase addressing the owner on a page a
  share also shows is a `Voiced` pair (#9).
- At 390px the chart is the section's width, and the list should be too.

### Tests first

- Unit: one function files a finish under its point for the list and the count, a 9.5 under 9
  and a 10.0 under 10, highest first and then the order sent.
- Page: a rated column is a button named as the old list's item was, and opens a list named by
  it; the list is as long as its count, a game finished twice included, and only those two rows
  are dated; each row has its exact rating; one list at a time; the column again and Escape close
  it, and **a press elsewhere does not**, since the list is the panel's and closing it would move
  what is under the pointer, which turns the plan's *closed by a press elsewhere* round; a
  change of year closes it, cached year or not; nothing to press on a share, whose list for a
  screen reader stays.
- **The 390px case moves to Playwright.** The list's layout is CSS alone, and nothing in it asks
  `matchMedia`, so `windowOfWidth(390)` would be a desktop test under another name. End to end:
  the list inside the Ratings panel, which grows round it rather than having it laid over the
  page, two across at 1440 and one across at 390.

### Built

Built on 7 November 2026, tests first, the day it was workshopped, on `titles-behind-a-rating`,
frontend only, as planned, and **shipped and deployed at about 06:02 Eastern the same day** (PR
#91). The write-up is `docs/stats.md`, **The finishes behind a rating**,
with the look in `docs/design.md`, under **Stats**.

- **`ratingLists`** in `stats/stats.ts`, and `ratingCounts` as its lists' lengths, so a column
  and its list are one filing.
- **`RatingSpread`**: on your page a rated column is a button, *22 rated 8*, with `aria-expanded`
  and `aria-controls`, its count in the accent and a tab under it when open; and `TitleList`, the
  finishes at that point in the panel, two across from `sm`, a row the cover, the name and the
  exact rating, with the day on a game finished twice at the point. On a share the chart is a
  picture with its list for a screen reader, as it was, told apart by the voice.
- **`Dashboard` keys the chart by the year**, so a list closes when the year changes.

### Tests

Frontend 1,336 with `tsc` clean, the 1,327 before and nine, and the Stats spec end to end 6, the
4 before and two. **Every test was red first on what it asserts, or proved by putting its fault
back** where it passed from the start or was written after its code: sixteen faults in Vitest
and three end to end, each red on its own tests, in `docs/stats.md`'s table. **The Stats spec
passes in Firefox too**, all six, the user's browser.

**The first full e2e run went 216 of 217**, the 215 before and two. The one red was
`hltb.spec.ts`'s *taking the pin back asks HowLongToBeat again, by name*, which waited ten seconds
for *No HowLongToBeat estimate yet* in the journal and never saw it. Nothing of this feature is on
that path, and it passed three times out of three alone. **The second full run, of the code as
committed, went 217 green**, in 6.1 minutes.

| Step | Tests | Red first by |
|---|---|---|
| 1. One filing | 3 unit | the function not being there |
| 2. The column and its list | 6 page, 1 share | the six on the column not being a button. The share's passed from the start, its chart having no buttons, and was proved by making its columns pressable |
| 3. End to end | 2 | written after the code, and proved by fault: the list laid over the page turned both red, one column at every width the desktop one, and two across on a phone the phone one |

**One test was weak and one plant was wrong**, both found by the plants. The keyboard half of
*stays open* tabbed onward to nothing and so could not see #20's rule; it goes back to the year
control now, and that fault turns it red. The phone plant first left `flex` beside `columns-2`,
which is one column everywhere, and turned the desktop case red instead.

**The built chart was shot beside the picked prototype**: no pixel differs, shut and open, at
1440, 1024, 768 and 390, light and dark.

### What the plan got wrong, or left out

- **"Closed by Escape and by a press elsewhere, with the keyboard handed back."** Escape and the
  column close it; a press elsewhere does not, because the list the renders picked is part of the
  panel, and closing it would move what is under the pointer; and nothing in it takes the
  keyboard, so there is nothing to hand back. The plan's line was #20's list, whose titles were
  buttons laid over the cards.
- **"Lifting it out into a piece both can draw."** Not lifted. With rows that open nothing and a
  list that is the panel's, what the two share is a row's look, and a shared piece would have
  carried #20's popover, its focus and its outside press into a list that needs none of them. The
  row's classes are #20's, copied.
- **"At 390px, with `windowOfWidth(390)`."** Nothing in the chart asks `matchMedia`, so the phone
  case is Playwright's.
- **The order and a change of year were not in the plan.** Round one asked the order. The year
  was found writing the tests: a year fetched before comes from the cache without the page being
  rebuilt, so the list would have stayed open on one year and closed on another.
- **The exact rating** was the plan's *perhaps*, which the summary round one was asked from left
  out. Round two showed it, and the user took it.
- **The columns had to meet.** Spaced `gap-1` apart, the whole column as a button would have had
  a gap in it. They are `px-0.5` inside each column now, and the bars move by under 2px.
- **The staged board's 23 eights are 22** on every finish, the measure the plan said to take as a
  guide.

### The deploy, and what it left

- **Deployed at about 06:02 Eastern on 7 November 2026**, `e911400` to `293cc78`, carrying #90's
  docs with it. No migration and no variable. api and caddy were both recreated, api first: the
  API because Microsoft's `aspnet:10.0` had moved upstream and its layers downloaded fresh, with
  no backend change of its own.
- **Proved from outside.** The bundle went `index-CXRpFSOf.js` to `index-BE668cQv.js`, and the
  stylesheet `index-ComQJ_q3.css` to `index-B4wzdw3y.css`, the local build's name again. In the
  script `finished, no date`, `-rated-`, `sm:block sm:columns-2 sm:gap-1`, the row's and the tab's
  class strings each went 0 to 1. Comparing the two stylesheets' selectors found seven new and one
  gone: `.sm\:columns-2{` and `.break-inside-avoid{` went 0 to 1, and `.items-end{`, which only
  the old chart used, 1 to 0. `/api/auth/me` answered `null` with a 200.
- **Inside**, the API's startup log said *No migrations were applied*, and had no failure and no
  *switched off* line for either worker; Caddy's had no error.
- **The restart re-armed both timers, and both ran five minutes on**: the HowLongToBeat backfill
  queued 0 titles, and the release sweep brought 16 unreleased titles up to date.
- **The user's own check**: open a rating on the live Stats page. **Done, reported on 7 November
  2026.**

---

## 22. A game's OpenCritic and Steam pages · shipped

**Planned 7 November 2026**, out of #17's workshop, when the user set IGDB's scores aside, with **a
workshop of its own first**, because it is a new outside connection and the user has held off
others. **Workshopped 12 November 2026** in two rounds and **built the same day**, tests first; run
end to end on the 13th, and shipped and deployed that morning (PR #95). This is the reason for it,
in the user's words: *"It would be convenient if I had a game in my backlog and I wanted to quickly
take a look at the game's OpenCritic or Steam page to see what people are saying about the game. If
the game doesn't have a Steam port, then only an OpenCritic page would be fine."* **Not
Metacritic**, which the user does not care about.

**What.** From a game, a way to its OpenCritic page and its Steam page, and perhaps what each
says: OpenCritic's critics' average, Steam's review summary (*Very Positive*). A game with no Steam
version shows OpenCritic's alone.

**What is known**, measured on 7 November 2026 for #17's look:

- **Steam needs no matching, mostly.** IGDB links games to Steam (`external_games`, source 1, the
  app id as `uid`), and 337 of the 499 games the look named had one. Not every game sold there
  does: *Horizon Zero Dawn* and *Ghost of Tsushima* have no Steam id on their main IGDB entries,
  where *Death Stranding* has one, so where a console game's Steam id lives is measured at pickup.
- **IGDB's Steam "reviews" are not Steam's.** PopScore's types 6 to 8 are named Positive, Negative
  and Total Reviews, and carry popularity values (0.0038 for *Hollow Knight*), not counts. Steam's
  figures come from Steam.
- **OpenCritic needs matching.** IGDB links neither OpenCritic nor Metacritic, so a game is found
  by name, as HowLongToBeat's are, with a matcher that refuses rather than guesses
  (`docs/games-hltb.md`).
- **OpenCritic's API is sold through RapidAPI, with a key.** A community project puts the free tier
  at 200 requests and 25 searches a day. Not confirmed; the API's pricing page is where to check.

### Measured at pickup, 12 November 2026

Over the user's board as #19's workshop saved it from production on 3 November: 91 titles. The
scripts and every answer are in the gitignored `frontend/workshop.local/opencritic-steam/`.

**Steam**

- **`appreviews` is deprecated, and answers every app with a 302 to the store's home page**,
  whatever it is asked. Its Steamworks page says so and names the replacement,
  `IUserReviewsService/GetAppReviews` on `api.steampowered.com`: **no key**, the question in
  `input_json`, the summary (`review_score_desc`, `total_positive`, `total_reviews`) on the first
  page only, keyless answers cached for up to ten minutes, and a 429 past a rate limit every
  keyless caller shares. It answered all 83 apps the board names, its own and related ones, at
  one request every two seconds with no 429.
- **Its default is the line the store page shows an English reader.** For *Hollow Knight* the
  default, English reviews by people who bought it on Steam, counted 186,188, and the store page
  said *97% of the 186,389 user reviews in your language*. Every language counts 508,559.
- **What it says, by that default, for the 64 with a page of their own**: Overwhelmingly Positive
  21, Very Positive 28, Mostly Positive 4, Mixed 1, and *No user reviews* for 10, every one of them
  a Backlog title not out. English and every language name a different verdict for 8. The widest
  is *Monster Hunter Wilds*: Mostly Positive, 71% of 86,506, in English, and Mixed, 53% of 204,081,
  in every language.
- **IGDB names a Steam page on the title's own entry for 64 of the 91**: in `external_games`
  (source 1) for 62, and only in `websites` (type 13) for 2. **Where an entry names two apps,
  which eight do, the `websites` row is the store page every time.** The other is a demo (*Until
  Then*), a playtest (*Nine Sols*), the Japanese release sold as an app of its own (three Trails
  games), or an old id Steam forwards to the store page (three). *The Witcher 3 Remastered* names
  the original's page, because on Steam the remaster is an update to it.
- **9 of the 27 with no page of their own are sold on Steam inside a collection**, which IGDB
  files as a bundle with a Steam id of its own: four Castlevanias in the Anniversary Collection,
  *Circle of the Moon* and *Aria of Sorrow* in the Advance Collection, *Dawn of Sorrow* and *Order
  of Ecclesia* in the Dominus Collection, and *Metal Gear Solid* in its Master Collection Version.
  A tenth, *Metal Gear Solid 4*, has a page through its remaster. The rest are console games, or
  not out.

**OpenCritic**

- **Its API refuses without a key**: *"API key is required. Go to
  https://rapidapi.com/opencritic-opencritic-default/api/opencritic-api to sign up to use the
  OpenCritic API."*
- **RapidAPI's pricing**, rendered in Chromium, since a plain fetch of the page gets its title
  alone: **Basic, $0 a month, 25 searches and 200 requests a day, hard limits, 4 a second.** Ultra
  is $19 a month for 4,000 searches and 2,000 requests, and Mega $50 for no limit. Whether Basic
  asks for a card is not on the page. The community figure above was right.
- **Its spec** (SwaggerHub, 1.0.0, host `opencritic-api.p.rapidapi.com`): `/game/search?criteria=`
  answers an id, a name and a `dist`; `/game/{id}` answers `topCriticScore` and
  `percentRecommended` (-1 with too few reviews), `tier` (blank then), `numReviews`, `url`, and
  OpenCritic's own `steamId`.
- **Reading OpenCritic's pages is forbidden.** The pages carry the score, but the owner's terms,
  Valnet's, last updated 12 January 2026, forbid scraping and the automatic download or
  extraction of any content "in any form and by any means". A score comes through the API or not
  at all. A link is not that.
- **Wikidata ties 61 of the 91 to an OpenCritic id, with no key and no matching**: one item
  carries IGDB's slug (P5794) and OpenCritic's id (P2864) both. Completed 48 of 64, On Hold 4 of
  4, Backlog 7 of 20. Of the 30 it does not: 10 are not out, 11 came out before 2015, and **9 are
  later versions**, the ports, remakes and remasters IGDB slugs with `--1` or `--2`, which Wikidata
  files under the original if at all: *Paper Mario: The Thousand-Year Door*, *Ghost Trick*, four
  Castlevania ports among them. OpenCritic is likely to have most of those 9, so they are the real
  gap.
- **Two titles have several OpenCritic ids there**, an edition or a release each: *NieR:
  Automata* (the game, *Become as Gods*, *Game of the YoRHa*) and *Trails Through Daybreak* (*Kuro
  no Kiseki*, and the English release).
- **A link needs only OpenCritic's number**: `https://opencritic.com/game/{id}/-` is the page, any
  slug serves it, and `/game/{id}` alone is a 404. Wikidata writes its own link that way.

**Together**, 54 of the 91 have both, 10 a Steam page alone, 7 an OpenCritic id alone, and 20
neither. By column, Steam pages and OpenCritic ids: Backlog 15 and 7 of 20, Playing 1 and 1 of 2,
On Hold 2 and 4 of 4, Completed 46 and 48 of 64, Dropped 0 and 1 of 1.

**Two checks made for round one's second half**: Steam's own store search, asked for the 27 with
no page of their own, found no game IGDB missed, only the collections and *Metal Gear Solid 4*'s
remaster; and the store page's two lines are counted differently. *All Reviews* is English
(*Armored Core VI*: 93% of 41,302, where `GetAppReviews` said 41,283) and *Recent Reviews* is every
language over 30 days (90% of 237, where a 30-day `date_range` in every language said 231).

### Round one, 12 November 2026: what it does, in words

Eight choices asked before anything was drawn, four at a time, with the measurements above in
each question. **All eight were the recommendation.**

| choice | picked | against |
|---|---|---|
| what shows | **both verdicts and both links**: OpenCritic's top-critic score and tier, Steam's review summary, each beside a link to its page | Steam's verdict and both links, no key; links only; verdicts with no links |
| where | **the journal's top band**, two rows under HowLongToBeat's, where anime's MAL rating and *View on MyAnimeList* already sit | a card's `⋯` menu, links only; both |
| which columns | **every column**, wherever the journal opens | Backlog only, the user's words; Backlog, Playing and On Hold |
| finding OpenCritic's page | **Wikidata, and a pin** where it has none | Wikidata then OpenCritic's search, refusing when unsure; OpenCritic's search alone, the plan's |
| OpenCritic's key | **optional**: without it the row is its link alone, and nothing refuses to boot | required to boot, as IGDB, TMDB and MAL are |
| stored or asked | **the ids kept on the game** once found, a migration; **the verdicts asked when a journal opens and kept a day** | both kept and refreshed daily, as HowLongToBeat's figures are; everything asked on every open |
| a game with no Steam page of its own | **its own page only**: 64 of the 91 get a row | the collection's or the remaster's page, named; its own page and a pin |
| which Steam reviews | **English, all time**, the store page's main line for an English reader | every language, all time; both of the store page's lines |

What follows from them, and is not a choice:

- **A missing key is a tested path, not an error.** The OpenCritic row is its link alone, from
  Wikidata's id or a pin, and the score arrives once a key is set. Nothing about boot changes, so
  `deploy/compose.yml` gains the variable without `:?`, and the trap in **What fails silently**
  about a new required variable does not apply. Say so in `docs/deploy.md`.
- **Several OpenCritic ids for one title** (*NieR: Automata*'s three, *Trails Through Daybreak*'s
  two): the one whose OpenCritic name is IGDB's, which is the game in both, and the pin wins over
  any rule. Without a key the names cannot be read, so the rule needs one; what the row does
  without a key and with several ids is a question for the build.
- **The pin is kept whichever way the rest goes**, so the migration holds a pinned OpenCritic id
  as well as the found ones, told apart as HowLongToBeat's are.
- **Wikidata is a third outside service**, keyless and read-only, with a User-Agent of its own.
  A stub in the e2e suite and a fake in the backend suite, as every provider has.

### Round two, 12 November 2026: how it looks

Drawn by the real drawer around a prototype of the two rows, on the user's board as #19 saved it,
with Steam's verdicts measured that day and OpenCritic's read through the user's own key:
https://claude.ai/artifact/2sCank5KRdqmTsMPc53PAF. Five choices, one varying at a time. **Four
were the recommendation, and the user picked OpenCritic's words over it**, knowing the cost the
option stated.

| choice | picked | against |
|---|---|---|
| OpenCritic's words | **`85 · Mighty · 91% recommend`**: the top critics' score rounded, OpenCritic's tier, and the share of critics who recommend it, the user's pick. Two lines in the drawer, one in the modal, three on a phone | `85 · Mighty`, the recommendation, one line in the drawer; `85 · 91% of critics recommend` |
| Steam's words | **`Very Positive · 94%`**: Steam's word and the share positive, rounded. *Very Positive* covers 84% to 95% on the user's board | the word alone; the word, the share and the count, two lines in the drawer on *The Witcher 3 Remastered* |
| the way to the page | **`View on OpenCritic` and `View on Steam`**, links of their own after the words, in a new tab with `noreferrer`, as HowLongToBeat's row and MAL's say it | the words themselves the link, which kept both rows to one line on a phone |
| the pin | **an `OpenCritic ID` box on every game**, HowLongToBeat's control one row up, empty where there is no id, taking the number or a whole pasted OpenCritic address | a box only where there is no id, with *Change* otherwise |
| a game with no score | ***Not out yet* before release, *Too few reviews* after** | *No score yet* for both, which is wrong for *Rabbit and Steel*; *Too few reviews* for both |

**Shown and not chosen, and built as drawn**: a verdict on its way is `…` with the link already
there; with no key, OpenCritic's row is its link alone; no Steam page, no Steam row; and Steam's own
*No user reviews* for a game not out.

**The picked combination was re-rendered before building**, on all six titles at every width the
journal has: the drawer at 1440 (a 407px band) and from 1536 (471px), the modal (622px) and a phone
(365px), light and dark. OpenCritic's row took two lines in both drawers, one in the modal and
three on a phone, as measured before the pick, and nothing else moved. On a phone the row stacks
the box, the words and the link with the label centred between them, as HowLongToBeat's row already
does. **Those shots are what the build is compared with**, pixel for pixel:
`workshop.local/opencritic-steam/shots/picked/`.

What the real scores found:

- **All 64 ids answered.** By title, 57 of the 61 have a score, from 76 to 95, 38 Mighty and 19
  Strong. Four have none, `-1` with a blank tier: three not out (*Persona 4 Revival*, *Fable*,
  *Stranger Than Heaven*) and **one out since May 2024 with three critic reviews, *Rabbit and
  Steel***, which a plain *No score yet* would misdescribe. That added a fifth choice.
- **The name rule picks the game where Wikidata gives several ids**: *Nier: Automata*, 123 top
  critics, over two editions (22 and 10), and *Trails Through Daybreak*, 31, over *Kuro no Kiseki*,
  3. Taking the most top critics would pick the same two.
- **OpenCritic's own `steamId` came back empty on all 64**, so Steam's id comes from IGDB.
- **RapidAPI's quota headers**: `x-ratelimit-requests-remaining` and `x-ratelimit-searches-
  remaining`, each with a `-reset` in seconds. The run left 134 of the day's 200.
- **Critics and players differ, which is the argument for both rows**: *Final Fantasy VII
  Rebirth* is 91, Mighty, on OpenCritic and Mostly Positive, 78%, on Steam.

- **The harness is `frontend/workshop.local/opencritic-steam/`**, #19's reused: `vite.config.mjs`
  swaps `./HltbPin` for `ReviewRowsProto.tsx` only when `EntryDrawer` imports it, so the real
  drawer draws the real HowLongToBeat row and then the two new rows. Vite on 5183; `stage.mjs`
  answers `/api/` from #19's saved board; `shoot.mjs` shoots every option and measures each row's
  lines. With the key set: `node opencritic.mjs` (every Wikidata id through `/game/{id}`, about 64
  of the day's 200 requests), then `node build-reviews.mjs`, then the shoot again.
- **The first shots found a structural cost before any look was judged.** At 390 every row with a
  `View on …` link wraps it onto a second line, and the label sits between the two. The page showed
  it beside the words-as-link option, which kept both rows to one line, and the user kept the
  links of their own.
- **The first line count was wrong**: counting text fragments' tops read one line as three,
  because the ID box is taller than the words beside it. The shots count flex lines. A Playwright
  geometry check in the build should count the same way.
- **The prototype needed one fact the plan did not list**: whether a title is out, for *Not out
  yet*. The build reads it from `released`, which the journal's title already carries.

### The build, in order

Tests first in every step, each shown red, and each rule's test checked by planting its fault.

1. **The providers, each behind a client of its own and a stub.**
   - `Integrations/Steam/`: `GetAppReviews` with `input_json` (`appid`, `num_per_page: 1`), English
     by default, reading the summary alone. A 429 or a failure is the provider unhappy, a 502 as
     IGDB's is.
   - `Integrations/OpenCritic/`: `/game/{id}` on `opencritic-api.p.rapidapi.com`, with
     `X-RapidAPI-Key` and `X-RapidAPI-Host`. **An optional option**: no key, no request, and nothing
     refuses to boot, so `ApiFactory` needs no entry and the suite runs both ways.
   - `Integrations/Wikidata/`: one SPARQL question, IGDB's slug (P5794) to OpenCritic's ids (P2864),
     with a User-Agent naming the app.
   - IGDB's question for a game's slug and Steam id: `fields slug, websites.url, websites.type,
     external_games.uid, external_games.external_game_source`. The `websites` row of type 13 first,
     then a lone `external_games` row of source 1. **`category` on either is deprecated** and would
     find nothing while looking right, `game_type`'s trap again.
   - The e2e harness gains a stub for each of the three, as IGDB, TMDB and MAL have, serving every
     endpoint its client calls.
2. **The ids on `games`**: a migration adding `steam_app_id` and `opencritic_id`, and when each was
   looked for, so a title found to have none is not asked on every open. Found the first time a
   journal asks, then kept. A pin replaces the OpenCritic id and no later look overwrites it, so
   the two have to be told apart. **`GameDetail` carries both ids**, since they are facts about the
   game.
3. **The verdicts**: one route answering both, asked when the journal opens and each kept a day
   under the provider's own id, never under a person (**What fails silently**: a cache in front of
   anything made from a board is keyed on what it asked). Where Wikidata gives several OpenCritic
   ids, the one whose name is IGDB's. OpenCritic's `-1` arrives as no score.
4. **The pin's route**, on HowLongToBeat's shape: `PUT` a number, or a whole OpenCritic address
   read for it. A number OpenCritic does not know is refused in words, as a HowLongToBeat pin is,
   and without a key a pin is kept unchecked.
5. **The rows**, in the drawer's top band under HowLongToBeat's, on every column, following the
   data rather than the hobby: the words in `hobbies/games.ts`, the five picks exactly, `…` while
   asked, and the link alone without a key. **Compared pixel for pixel with the picked prototype's
   shots**, as #17's and #21's builds were. Measured in Firefox too, the user's desktop browser,
   with Playwright's Firefox.
6. **The deploy**: `OpenCritic__ApiKey: ${OPENCRITIC_API_KEY:-}` in `deploy/compose.yml`, without
   `:?`, in `.env.example`, and set in the server's `.env` before the deploy that carries it, or
   production shows OpenCritic's link alone. `docs/deploy.md` says so.
7. **The docs**: the three providers' file (a `docs/games-reviews.md` would be HowLongToBeat's
   sibling, and the map in CLAUDE.md gains its row), `docs/api.md` for the routes, and
   `docs/history.md` when it ships.

### Decide at pickup

*All five decided on 12 November 2026: see **Round one**. The plan's own recommendation on matching,
OpenCritic's search, was not taken: Wikidata was.*

- **Links, what each says, or both.** A link needs an id; what a page says needs a request to it.
- **Where it shows**: the journal beside HowLongToBeat's figures, a card's `⋯` menu, or both; on
  Backlog only, or every column.
- **OpenCritic's key**: required to boot like every other credential (CLAUDE.md, **Start here**),
  or optional, with OpenCritic's half absent when it is.
- **Matching OpenCritic**: search by name, refuse when unsure, and a pin for when it refuses, as
  HowLongToBeat has.
- **Stored or asked**: an id kept on `games` once found, which is a migration and a backfill, or
  asked each time the journal opens.

### Built

Built on 12 November 2026, the day it was workshopped, tests first, in the order above, on
`opencritic-and-steam`, run end to end on the 13th, and **shipped and deployed at about 06:13
Eastern that day** (PR #95). The write-up is `docs/games-reviews.md`, `docs/games-hltb.md`'s
sibling with a row of its own in CLAUDE.md's map, with the look in `docs/design.md`, **A game's
critics and players**, the four columns in `docs/data-model.md`, the two routes in `docs/api.md`,
and the key in `docs/deploy.md`.

- **The providers**, each a client with its options and its exception. `SteamClient` asks
  `GetAppReviews` by `input_json` and reads the summary alone, an app Steam does not know read off
  the missing `query_summary`. `OpenCriticClient` asks `/game/{id}` with RapidAPI's two headers
  stamped per request, says by `HasKey` whether it can ask at all, reads a 400 or a 404 as no such
  game and a 403 as the provider unhappy, and reads `-1` and a blank tier as nothing.
  `WikidataClient` asks one SPARQL question from IGDB's slug to OpenCritic's ids, the slug escaped
  and the app named in the User-Agent. IGDB's `GetStoreLinksAsync` asks for the slug and both
  places a Steam page is kept, and `Services/IgdbSteam` chooses the page.
- **The ids on `games`**: `AddReviewPages`, four columns, `steam_app_id` and `opencritic_id` with
  when each was looked for, and `GameDetailDto` carrying the two ids.
- **The verdicts**: `GameReviewService.ReviewsAsync` behind `GET /api/games/{mediaId}/reviews`,
  answering `GameReviewsDto`, and `ReviewsOptions` in a `Reviews` block of `appsettings.json`: a
  page found missing looked for again after 30 days, and a verdict kept 24 hours.
- **The pin**: `PinOpenCriticAsync` behind `PUT /api/games/{mediaId}/opencritic`, taking
  `SetOpenCriticIdRequest`, and `OpenCriticExceptionHandler` for its 502.
- **The rows**: `getGameReviews` and `setGameOpenCriticId`; `GameDetail`'s two ids and
  `GameReviews`; `TitleDetail.reviews` and `JournalSection.reviews`, null for films, shows and
  anime; `reviewsKey`; `useReviews`; `ReviewRows`; `parseOpenCriticId`, `openCriticGameUrl` and
  `steamAppUrl` in `journal/fields.ts`; and the words in `hobbies/games.ts`.
- **The deploy**: `OpenCritic__ApiKey: ${OPENCRITIC_API_KEY:-}` in `deploy/compose.yml`, and its
  line in `.env.example`.
- **The harnesses**: `FakeReviewClients.cs`, `FakeIgdbClient.Links`, and `ApiFactory` swapping all
  three clients for fakes; a stub each for Steam, OpenCritic and Wikidata, started with the others;
  IGDB's stub naming five fixtures' Steam pages and adding *NieR: Automata*; and `reviews.spec.ts`.

### Tests

Backend 1,049 of 1,049, the 961 before and 88: 33 endpoint cases in `GameReviewsTests`, 14 in
`OpenCriticClientTests`, 13 in `IgdbSteamTests`, 11 in `WikidataClientTests`, 8 in
`SteamClientTests`, and 5 more in `SchemaTests` and 4 more in `IgdbClientTests`. Frontend 1,401 of
1,401 with `tsc` clean, the 1,346 before and 55: 23 in `fields.test.ts`, 21 in
`EntryDrawer.test.tsx`, 8 in `journal.test.ts` and 3 in `games.test.ts`. The 1,399 noted on the 12th
was counted before the last two drawer cases were written; listed without running, main has 1,346
and the branch 1,401. End to end, 11 new in `reviews.spec.ts`: **the full suite went 231 of 231 in
Chromium on 13 November 2026**, the 220 before and the 11, in 6.6 minutes, and **`reviews.spec.ts`
11 of 11 in Firefox**, the user's browser.

| Step | Tests | Red first by |
|---|---|---|
| 1. The providers | 50: 14 OpenCritic, 13 `IgdbSteam`, 11 Wikidata, 8 Steam, 4 IGDB | all 50, against each new method put in first as a `NotImplementedException` |
| 2. The ids | 5 schema | all 5, on EF refusing a model ahead of its migrations, before `AddReviewPages` was written |
| 3 and 4. The verdicts and the pin | 33 endpoint | 30, against a service whose read answered nothing and whose pin threw. **Three were green from the start, and were proved by fault on the 13th**: a number below one refused, both cases, red with the request's `[Range]` taken off, which lets OpenCritic be asked; and a game with no Steam page of its own, red with `IgdbSteam` reading every external id as Steam's, which makes a GOG id an app |
| 5. The rows | 55 Vitest | 44, with `journal.test.ts` red as a file on a section that was not there yet. Three drawer cases were not red: nothing asked about a film, nothing asked again when the pass is written, and the box held until the title is read again, each a guard proved by its fault below |
| End to end | 11 | written after the code, and proved by fault below |

**Every fault was put back alone, and each was red on its own tests**: 27 in the backend, 13 in
Vitest and 4 end to end, the files restored byte for byte. The backend's first 25 and Vitest's 13
were planted on the 12th, and **two of the backend's went uncaught at first**, each fixed in the
tests rather than the code: the fakes threw synchronously where the real clients fail as faulted
tasks, so a cache keeping a failure passed; and the pin-back test pinned a game with no stamp to
clear. **On the 13th those two were planted again and both were red**, and so were all 13 in
Vitest; the last two backend faults and the four end to end are the 13th's.

| where | fault | red |
|---|---|---|
| `GameReviewService` | a look writing over a pin; never looking again for a page found missing; looking again for one found; the day left out of the cache key; Steam asked past the cache; a failure kept; Steam's failure taking the whole answer; names compared as written; several ids without a key stamped as none; IGDB failing stamped as a look; a pin unchecked with a key; a pin checked without one; a pin taken back keeping its stamp; OpenCritic asked without a key | the endpoint case named for each |
| `IgdbSteam` | the external ids ahead of the store page; the first of two ids taken; every external id read as Steam's | `IgdbSteamTests`, and for the last the endpoint case for a game with no page of its own |
| the clients | IGDB asking `websites.category`; OpenCritic's `-1` kept; a refused key read as an unknown game; OpenCritic asked without a key; Steam asked in every language; Wikidata's slug unescaped; Wikidata without a User-Agent | the client case named for each |
| the routes | the journal's read without the pages; no handler for the pin's 502; the pin's `[Range]` taken off | the endpoint case named for each |
| the frontend | an address on any site read as OpenCritic's; the score floored; *Not out yet* and *Too few reviews* swapped; Steam's own words for no reviews lost; no `…` while asking; a Steam row with no page; the title not read again; a film asking; the verdicts under `mediaKey`; the pin letting go before the read; a film's title carrying the pages; a number only looked at pinned again; a refusal sent anyway | the Vitest case named for each |
| end to end | the client asking `websites.category`; the client asking `external_games.category`; OpenCritic's row not wrapping | 7 specs, every one whose game's Steam page is in `websites`; 2, Celeste's and Tunic II's, whose page is an external id alone; 3, both drawers and the phone, the modal being one line either way |

**One fault is caught in Firefox alone: the Enter guard in `ReviewRows.commit`, taken out.** In
Chromium `reviews.spec.ts` stayed 11 green on one PUT; in Firefox it went red on two. A bare input
showed why. Chromium 151 fires the blur inside the `disabled = true` assignment itself, and React
writes that assignment during its commit, while React DOM has its own events switched off, so the
blur is dropped. Firefox 153 fires it a microtask later, when they are on again, and React hands it
to `onBlur`. So the guard is Firefox's, and the default run, Chromium's alone, cannot see it go. `ReviewRows`' comment, the spec's,
`docs/games-reviews.md` and `docs/games-hltb.md` said "a real browser" and now say Firefox, and
CLAUDE.md's **What fails silently** gains the line. `HltbPin` has the same guard, and no spec counts
its pins in any browser.

**The pixels**: the built rows match `shots/picked/` to the pixel in all 32 shots, by
`workshop.local/opencritic-steam/compare-built.mjs` on the app's own Vite with nothing swapped. In
Playwright's Firefox every row's line count is the same in all 32, and the band at 390 is 16px
narrower, which is desktop Firefox's scrollbar inside the drawer.

### What the plan got wrong, or left out

- **"A 429 or a failure is the provider unhappy, a 502 as IGDB's is."** For the clients it is: each
  throws a provider exception. The read route catches them per half and answers a 200, because a 502
  for both would have a spent OpenCritic allowance take Steam's verdict away too. The 502 is the
  pin's, by `OpenCriticExceptionHandler`.
- **"A pin replaces the OpenCritic id and no later look overwrites it, so the two have to be told
  apart."** No column tells them apart. A look writes only into an empty slot, in its own
  statement's `WHERE`, and a pin always holds a number, so no look can land on one:
  `A_look_in_flight_never_overwrites_a_pin` lands a pin from inside a look and keeps it.
- **When a page found missing is looked for again**, which the plan did not say: after 30 days,
  HowLongToBeat's rule, because a game not out often has no OpenCritic id on Wikidata yet and a
  console game can come to Steam. A page found is never looked for again.
- **What the row does without a key and with several ids**, round one's question for the build:
  nothing is chosen and nothing stamped, because the names cannot be read and not knowing yet is
  not a miss. Two of the user's titles are like that.
- **The first look's answer names pages the journal's read does not have**, which the plan did not
  foresee: `useReviews` reads the title again when the two disagree. Two requests more, once per
  game ever.
- **"Measured in Firefox too"** found more than layout: the Enter guard is Firefox's.

### Decided after the build

- **Steam's share stays rounded.** Steam's page floors its share and the picked words round it, so
  *Armored Core VI*'s 93.6% is 93% on its page and 94% in the journal, and 22 of the board's 54
  shares differ by a point. Told so on 13 November 2026, the user kept rounded.

### The deploy, and what it left

- **Deployed at about 06:13 Eastern on 13 November 2026**, `de2fe65` to `50b1245`, carrying #94's
  docs and the brief. **The key went in first**: `OPENCRITIC_API_KEY` moved from the maintainer's
  user-secrets into the server's `.env` without crossing a screen, every other line of the file
  unchanged by hash, and OpenCritic answered it with a 200 when asked from the server. api and
  caddy were both recreated, api first, and no base image moved; the deploy took 26 seconds.
- **Proved from outside.** The bundle went `index-DIeaRrom.js` to `index-Bnpl3GSK.js`, where a local
  build said `index-BSnT3c6q.js`, and the stylesheet kept `index-B0uun50f.css`, as the local build
  predicted, since no class was new. In the script *View on OpenCritic*, *View on Steam*, *Too few
  reviews*, `/reviews` and `recommend` went 0 to 1, *OpenCritic ID* and `/opencritic` 0 to 2, and
  *Not out yet* 1 to 2, each the local build's count. `GET /api/games/1/reviews` and `PUT
  /api/games/1/opencritic` went an empty 404 to a 401 signed out, and `/api/auth/me` answered
  `null` with a 200.
- **Proved inside.** `AddReviewPages` is the newest migration production has, where
  `AddNotePictures` was, and the API's log named it as it applied it. In the running DLL
  `GameReviewService`, `PinOpenCriticAsync` and `GetStoreLinksAsync` went 0 to 2 and
  `FillOpenCriticAsync` 0 to 1, and the API container had the key, where it had been empty, checked
  with `test -n` so nothing printed. The startup log had no failure and no *switched off* line.
- **The restart re-armed both timers, and both ran five minutes on**: the HowLongToBeat backfill
  queued 0 titles, and the release sweep brought 16 unreleased titles up to date. The API's log
  had no warning, failure or critical line in its first fifteen minutes.
- **The user's own check**: open a game's journal on the live site, and see a score beside *View on
  OpenCritic*. No session here can sign in to it. The first journal opened on each game is the one
  that finds its pages, asking IGDB and Wikidata, so the first open of each is a moment slower.

### Things to get right

- **Measure Steam's review endpoint before relying on it.** `store.steampowered.com/appreviews/
  {appid}?json=1` is believed to answer with no key and a summary; nothing here has asked it yet.
  *Measured on 12 November 2026: it is deprecated, and `GetAppReviews` replaces it. See
  **Measured at pickup**.*
- **OpenCritic's daily allowance is small**, so a game is searched for once and its answer kept.
- **A new provider is a stub in the e2e suite and a fake in the backend suite**, as IGDB, TMDB,
  MAL and HowLongToBeat each have, and an `ApiFactory` entry if its option is required, since a
  missing required option refuses to boot the whole suite.

---

## 23. Hide a game from Discover · shipped

**Planned 8 November 2026**, at the user's request, the morning #17 shipped and was checked on
the real board, **workshopped on the 13th and built the same day, tests first**, and shipped and
deployed early on the 14th (PR #97); see **Built** and **The deploy, and what it left** below. In the user's words: *"Add a way to hide a game from this page.
For example, I do not like the Horizon series, so I don't want to see it as well as do some of my
own filtering that way."*

**What.** On a Discover tile, a way to say *not this one*, so it is never offered again, and,
since the user's example is a series, perhaps a way to say *none of these*. Kept until taken back.

**What is known**, measured on 8 November 2026:

- **The user's list holds two Horizon games**: *Horizon Zero Dawn* at #1 and *Horizon Forbidden
  West* at #80, in `frontend/workshop.local/discover/built.json`, the list the API built from the
  live API before #17 shipped.
- **IGDB ties the two together both ways it can.** Each is in collection 6304, *Horizon*
  (`collections`), and franchise 2000, *Horizon* (`franchises`). `franchise`, singular, came back
  absent on all three titles asked about. So a series is one id to keep, not a name to match.
- **A name would be wrong.** *The Legend of Heroes: Trails Beyond the Horizon* is on the user's
  board, finished, and IGDB files it under collection 2413, *The Legend of Heroes: Trails*. Hiding
  everything called Horizon would take its series-mates off for one word in a title. #17's parent
  rule learned the same thing: a name is not a link.
- **A hide has to be applied on the server, before the page is cut.** A page is 48 titles and
  `next` is a place in the whole list, so dropping titles in the browser would leave pages short
  and Load more counting places nobody was shown.

### Decide at pickup

- **What one press hides**: the game; the game and its series, by IGDB's `collections`; or a
  choice of the two on the tile. The user's example is a series.
- **Which lists**: From your ratings only; every Discover list; or those and the search strip too.
  A search is somebody asking for a title by name, which argues for leaving search alone, as the
  Discover filter does.
- **Where the control goes on a tile**, picked from renders: a fourth part of the add control, a
  mark on the cover, or a `⋯` menu like a card's. The tile already has + ▶ ✓ at its foot and, on
  From your ratings, a reason up to three lines long.
- **Taking a hide back**: a list of what is hidden, in Settings beside the columns taken off; an
  *Undo* on the tile for a moment after the press; or both.
- **Where a hide is kept**: per account, in a table, so it follows the user to the phone; or per
  browser, as a hidden column is. Per account is the recommendation, because a hide is taste rather
  than a view setting, and only the server can apply one before a page is cut.

### Things to get right

- **A table of the user's own**, scoped by `user_id` at its call site and cascading when the
  account is deleted, with the tests `docs/auth.md` asks of every scoped read: somebody else's
  hide never hides anything from you.
- **Applied with the board, not in front of IGDB.** Left out beside the board's titles and their
  originals, a hide asks IGDB nothing new, and no cache key gains a person (**From your ratings**
  in `docs/games-igdb.md`). Hiding a series needs each offered game's `collections`, one more field
  on the second question, which `GetDiscoverableAsync`'s test pins.
- **`collection`, singular, is deprecated in favour of `collections`.** Asked for by the old name
  it comes back absent on every game, and a series hide would quietly hide nothing.
- **The deletion warning counts what goes with an account** (#8). Whether hidden games earn a line
  there is a small question for the renders.

### The workshop, 13 November 2026

**Workshopped in two rounds, and not yet built.** Thirteen choices: nine were the
recommendation and four the user's, and each of the four took the narrower or the quieter way.
The renders, the picked combination first, are https://claude.ai/artifact/Fc8pVFbsoZRm8uQ7dVwy7A.

**Measured before round one**, from IGDB, over the user's From your ratings list as #17's
workshop saved it (220 titles) and the first 96 places of the other four lists:

- **A third of the user's tiles are in no series at all.** 72 of 220 have no `collections`, 125
  have one, and 23 have two or three, nested: *Persona 5* is in *Persona* and *Persona 5*, and
  *Paper Mario* in *Paper Mario* and *Super Mario*, which holds 123 games. A series offered
  anywhere would have had to be named, and sometimes chosen.
- **A name match on *Horizon* would also have taken *Forza Horizon 5* and *6***, both on Popular
  now, in a series of their own.
- **Horizon Zero Dawn was on three lists that day**: #1 on From your ratings, #32 on Popular now
  and #23 on Most played.
- **None of the 220 is a version, and the other lists carry them**: 9 of New releases' 96 have a
  `parent_game`, 3 of Popular now's, 8 of Most anticipated's and 4 of Most played's, *The Last of
  Us Remastered* beside *The Last of Us* among them.

| choice | picked | against |
|---|---|---|
| what one press hides | **the game alone**, the user's pick | the game, then its series offered on the hidden tile by name (the recommendation); a choice before the press; always the game and its series |
| its versions | **that entry only**, the user's pick: hiding *Horizon Zero Dawn* leaves its Remastered | every version, by `parent_game`, as #17 treats a version (the recommendation) |
| which lists | **all five Discover lists**, and never search | From your ratings only; every list and search too |
| taking one back | **Undo on the tile, and a list** | either alone |
| where it is kept | **per account, on the server** | per browser, which would cut pages short in the browser |
| right after a hide | **the tile stays in its place, hidden, with Undo, until the page is left**, as an add leaves its tile | gone at once and the wall closing up, with Undo in a bar |
| a title on your board | **offers no hide** | the control beside its chip |
| the deletion warning | **does not count hides** | a line for them |
| the control | **a mark on the cover's top-right corner**, the user's pick: the corner a board title's chip uses, and a board title offers no hide | its own 28 × 28 button beside the add (the recommendation); a fourth part of the add; a ⋯ menu on the cover |
| when the mark shows | **under the pointer, or with the keyboard anywhere in the tile, and always on a phone**, the user's pick | always (the recommendation) |
| the mark | **an eye struck through**, the word the card and the list use | a cross, which elsewhere in the app closes or clears |
| a tile hidden on this visit | **a plain card where the cover was**: *Hidden*, *It won't show up on Discover again.*, Undo, and the name under it in grey | the cover faded, with Undo across the add's row, where a double press would put the game straight back; a dashed outline, which read as a cover that failed to load |
| the list | ***1 hidden* on the Discover page, by *Back to your board***, from the first hide on, opening a dialog: newest first, a cover and a name a row, *Show again* on each | a row in Settings, which grew the panel from 1,009px to 1,116 and put *Your data* below a 900px fold; both |

**What the renders found**:

- **A tile is narrowest at 1280, not on a phone**: 8 across inside a 24px gutter is 140px a tile,
  where 390 gives 171. Every option fitted there, the card's words at one line and two.
- **The ⋯ menu ran 11px into the gutter at 390**, ending 5px from the screen's edge.
- **The picked combination, measured**: no marks at rest, one under the pointer, one with the
  keyboard in a tile, and 47 of 47 on a phone, the 48th tile being the hidden card.

**What the build has to get right, added by the workshop**:

- **A hide goes after the shared cache, never into the question.** The four lists keep IGDB's
  answer under the list, the day and the place, for everybody, so a hidden id in the `where`
  would hand one person's hides to the next, the cache trap in CLAUDE.md's **What fails
  silently**. Applied
  in `Page`'s `keeps`, it can leave New releases and Most played a title short, because those two
  ask about one place past the wall, their filters being inside the question. Asking them for
  twice the wall, as Popular now does, keeps a page at 48 and the last row full
  (`layout.spec.ts`); which is a choice for the build.
- **From your ratings leaves a hide out with the board and the originals**, from the whole ranked
  list before it is paged, so nothing there comes up short and no question to IGDB changes.
- **A hide is by IGDB id, since the filter runs on IGDB's answer before the upsert**, while the
  list needs a title and a cover: so the IGDB id has to be reachable from what is stored.
- **The mark goes after the name in the DOM**, placed over the cover's corner. Load more focuses a
  tile's heading and Tab has to reach its mark from there, and a screen reader should hear the
  name before the action. The prototype has it before the name.
- **The mark shows by `group-hover`, `group-focus-within` and `pointer-coarse:`.** Tailwind v4
  compiles `group-hover` inside `@media (hover: hover)`, measured in the workshop's stylesheet, so
  a phone never sees it and `pointer-coarse:` keeps the mark on there. The mark is `opacity-0`
  rather than `invisible`, so it stays a tab stop. Check it in Firefox, the user's browser.
- **The card is the page's own state over the loaded wall**, which is never refetched while it is
  open (`staleTime: Infinity`), so the card stays where the tile was; the next visit asks the
  server, which leaves the game out.
- **Nothing goes in Settings**, so the Columns group's rule about the word *hide* stands.
- **The prototype is `frontend/workshop.local/hide-from-discover/`**, gitignored:
  `WallTileProto.tsx` under `?ctl=hover&sym=eye&look=panel`, `DiscoverPageProto.tsx` with the
  page's line, `HiddenDialog.tsx`, and `shoot-picked.mjs`, which the built page can be compared
  with pixel for pixel, as #17's was.

### Decided at the build, 13 November 2026

- **Every list asks IGDB for twice the wall, the user's pick when the build asked**, over leaving
  New releases and Most played at one place past it. There, one hide on a page was absorbed by
  the 49th place and two or more left it short. It is still one request a page.
- **The routes**, the build's to decide: `GET /api/games/discover/hidden` for the list, newest
  first; `PUT` and `DELETE /api/games/discover/hidden/{mediaId}` to hide and to show again. Under
  Discover's own address, since a hide is about the page, and by the media id a tile carries.
- **The table and its key**: `discover_hides`, keyed on `(user_id, media_id)` with no id of its
  own, cascading from `users` and from `media`. The lists read a hide back as the title's IGDB
  id through `media.external_id`. See `docs/data-model.md`.
- **A second hide of the same game is the first**: a 204, and it keeps its place in the list.
  Showing again a game that is not hidden is a 204 too, so a second Undo is no error. A media id
  that is not a game is a 404.

### Built

**Built 13 November 2026, the day it was workshopped, tests first.** The backend went red on all
26 of its first cases before anything existed, then green; the frontend's 16 the same.

- **Backend.** `Domain/DiscoverHide.cs`, its configuration and the `AddDiscoverHides` migration;
  `Services/DiscoverHideService.cs` for the list, a hide and a show again, each scoped at its
  query; three routes on `GamesController`; and in `GameCatalogService`, `HiddenFromAsync` and
  the hide left out in two places — the four lists' `Page` after the shared cache, and From your
  ratings' ranked list before it is paged — with every list asking for twice the wall.
- **Frontend.** `discover/EyeOff.tsx`, `HiddenTile.tsx` and `HiddenDialog.tsx`; the mark in
  `WallTile.tsx`; and in `DiscoverPage.tsx` the list of hides under `hiddenKey`, the visit's own
  record of what it hid and showed again, the count, the dialog and the keyboard's handoff.
  `hobbies/games.ts` dispatches the three requests, so the page still names no hobby.
- **Measured against the picked prototype**: see **Hiding a game from Discover** in
  `docs/design.md`.

### Tests

**Backend, 27 new cases in `DiscoverHideTests` and 1 in `SchemaTests`**; the full suite went
1,077 green, the 1,049 before and those 28. Every fault the plan named and the ones the build
added was put back alone and went red on exactly the tests that name it:

| fault put back | red |
|---|---|
| the hides in the shared cache's key | the 8 that count one question to IGDB |
| the hide in the shared question, filtered inside the cache | 13, the 4 *never reaches the answer everybody shares* among them |
| the user off the hide's read | the 5 about somebody else's hide |
| the filter on From your ratings alone | 13, every case on the four lists |
| the filter on the four lists alone | the 2 on From your ratings |
| search filtered too | *A_search_still_finds_a_hidden_game* |
| From your ratings' hide in its second question | *…asks_igdb_nothing_new* |
| From your ratings filtered after the page is cut | *…with_a_hide_on_it_still_holds_48* |
| the four lists filtered after the page is cut | the page-fill theory, which then had a row for each of the two lists asking twice already |
| versions hidden with their original | *Hiding_a_game_leaves_its_versions_on_the_list* |
| the user off Show again | *…leaves_somebody_elses_hide_where_it_is* |
| the user off the list | *Your_hidden_list_holds_your_hides_alone* |
| a second hide stamped again | *…twice_is_one_hide_that_keeps_its_place* |
| the list oldest first | that and the newest-first case |
| no check that a title is a game | *…not_a_game_is_not_found* |

Twice the wall went in after the user's answer, red first: the theory pinning what each list asks
for, now 96 on all four, and the page-fill theory widened to four lists, red on New releases and
Most played alone.

**Frontend, 16 new cases**, 2 in `api/games.test.ts`, 1 in `hobbies/discover.test.ts` and 13 in
`DiscoverPage.test.tsx`; the suite went 1,417 green, with `tsc` clean. One existing case changed
because the page did: *says on the cover which column a title is in* now lists the mark first
among a tile's buttons. Six faults put back, each red on exactly its own case: the mark before the
name; a mark on a title on your board (the 3 that say such a title offers nothing to press); the
wall asked for again after a hide; a game hidden before this visit left on a stale wall; the
keyboard's handoff after a hide or an Undo; and the dialog's when a row goes.

**End to end, 5 new specs in `discover.spec.ts`**, and the full suite went 236 green in Chromium, the
231 before and these 5, in 7.0 minutes: a hide and its Undo; a hidden game off another
list and its own on the next visit, and found by a search; the list from the count, newest first,
and *Show again*; the eye at rest, under the pointer and with the keyboard; and on a phone, shown
at rest and hidden by a tap. All 16 of the file green in Chromium, and 15 in Firefox with the phone
spec skipped, Firefox having no phone to emulate. Four faults put back, each red in Chromium at
the line that names it: `invisible` for `opacity-0`, at the check that the mark is there by its
role at rest; always shown, at the check that it is out of sight; `pointer-coarse:` taken off, on
the phone spec; and the mark before the name, at Tab from the heading. The three that can run in
Firefox went red there too, at the same lines.

### What the plan got wrong, or left out

- **`invisible` takes the mark out of the accessibility tree, not only the tab order.** The first
  version of the eye spec judged *at rest* by opacity alone, so `invisible` went red there for the
  wrong reason, opacity being 1. It now judges what is drawn by opacity and visibility both, and
  checks first that the mark is there by its role and name, which is where `invisible` fails.
- **The keyboard falls with the control pressed.** A hide replaces the tile, so the mark that had
  the keyboard is gone, and nothing in the plan said where the keyboard went: to the top of the
  page. It goes to Undo, and back to the mark after an Undo, and the dialog does the same when a
  row goes.
- **A wall loaded before a hide can still hold the game on a later visit**, because TanStack keeps
  a list five minutes after it is left. The page drops a game the server's list of hides names
  unless this visit decided otherwise.
- **Nothing is disabled while a hide is on its way**, unlike the add: a button that disables
  itself is blurred by it in Firefox alone, and none needs to be, since the two directions cannot
  race.
- **The prototype's empty dialog said *A game's tile on Discover can hide it***, a hobby's word in
  a folder that names none, and it was never rendered. The build says *Nothing hidden.*
- **"A title short" was one hide in two.** On New releases and Most played, one hide on a page was
  absorbed by the 49th place; it took two to leave the page short.

### The deploy, and what it left

- **Deployed at about 01:18 Eastern on 14 November 2026**, `50b1245` to `4be04e3`, carrying #96's
  docs. No new variable, and **one migration, `AddDiscoverHides`**, which adds a table and drops
  nothing; the night's backup had run under two hours before. api and caddy were both recreated, api
  first, and no base image moved; the deploy took 14 seconds.
- **Proved from outside.** The bundle went `index-Bnpl3GSK.js` to `index-CiZAmd41.js`, where a local
  build said `index-XkMVDwEL.js`, and the stylesheet `index-B0uun50f.css` to `index-C2ksD7K5.css`,
  the local build's name. In the script *Hide from Discover*, *It won't show up on Discover again.*,
  *Hidden from Discover*, *Nothing hidden.*, *None of these is offered on any Discover list* and
  *Undo hiding* went 0 to 1, *on Discover again* 0 to 2 and `/api/games/discover/hidden` 0 to 3, each
  the local build's count. A diff of the two stylesheets' selectors found eight rules new and none
  gone, the mark's `.opacity-0`, its three ways of showing (`group-hover`, `group-focus-within` and
  `pointer-coarse`, inside `@media (pointer:coarse)`), `.size-5`, `.size-6` and the dialog's
  `.max-h-[50vh]`, each 0 to 1. `PUT` and `DELETE /api/games/discover/hidden/1` went an empty 404 to
  a 401 signed out; `GET /api/games/discover/hidden` was a 401 before as well, read as a list slug
  by `discover/{list}`, which `docs/deploy.md` now says. `/api/auth/me` answered `null` with a 200.
- **Proved inside.** `AddDiscoverHides` is the newest migration production has, where
  `AddReviewPages` was, and the API's log named it as it applied it. In the running DLL
  `DiscoverHideService`, `HiddenFromAsync` and `ShowAgainAsync` went 0 to 2 and `HiddenTitleDto`
  0 to 1.
- **The restart re-armed both timers, and both ran five minutes on**: the HowLongToBeat backfill
  queued 0 titles, and the release sweep brought 16 unreleased titles up to date. The API's log
  had no warning, failure or critical line.
- **The user's own check**: on the live site's Discover page, the eye under the pointer on any
  tile not on the board, and after a hide, *1 hidden* by the way back to the board. No session
  here can sign in to it.

---

## 24. A game you finished long ago · shipped

**Planned 8 November 2026**, at the user's request, and **workshopped and built on 14 November
2026**, tests first, and shipped and deployed that evening (PR #99); see **Built** and **The
deploy, and what it left** below. A workshop of its own came first, because it changes
what a pass's date can be. In the user's words: *"Some type of
way to add completed games to my board when I don't exactly remember the dates I started or
completed it. I could remember maybe the years and hours of when I played the some of the games,
but I don't exactly want to add random dates for them either, nor do I just want them to be added
to the current year."*

**What.** A finished game added with the year it was finished, perhaps the year it was begun, and
perhaps its hours. Filed under that year wherever a year is asked for, and shown as that year:
never as a day nobody named, and never as this year.

**What happens today**, read from the code on 8 November 2026:

- **Adding straight to Completed stamps today.** `ApplyTransitionTimestamps` gives a pass moving
  into Completed a finish of now, and an add is that move. Most played is the list for filling a
  board backwards, and `discover.spec.ts` says what its ✓ does: "finished today — the date a drag
  would have stamped — for the journal to correct if it was years ago".
- **The journal's Started and Finished are day inputs**, and either can be cleared.
- **A finish with no date is already a state, and it belongs to no year.** On the board, Completed
  under a year filters on `completed_at` (`LibraryService.InYear`), so an undated finish shows only
  under *All years*. On the Stats page it is *finished, no date*, filed after every year under All
  years and counted in none. So *I don't remember at all* has a shape, and *I remember the year*
  has none.
- **Hours played is per pass already** (`hours_played`), so the hours need no new field.
- **Nothing reads the time between two dates**: the pace in "How long will it take me?" is a figure
  you state.

### Decide at pickup

- **How a year is kept.** Both ways below keep every pass that exists today exactly as it reads now.
  - **As a year**: `completed_year` and `started_year` beside the two instants, used when the
    instant is empty. `docs/data-model.md`'s rule argues for it: an instant is stored as an
    instant and a day as a day, so a year somebody remembers is a year, never run through the
    zone. Every filter on a pass's dates gains a second arm, and one that forgets shows the pass
    under All years alone: less than the truth, rather than something untrue.
  - **As a precision beside an instant**: `completed_precision`, Day or Year, with the instant at
    the edge of the year, as the release window keeps a precision. Every filter keeps working
    unchanged, and every display has to read the precision. One that forgets prints *Dec 31,
    2019*, a day nobody named, which is the release calendar's trap, and it raises no error.
  - **The recommendation is as a year**, because forgetting it shows too little rather than
    something untrue.
- **A month as well as a year?** The user said years. A month would be a third state for every
  place a date is shown.
- **Where the year is given**: at the add itself, the ✓ asking *When did you finish it?* (today, a
  year, or I don't remember); in the journal, its date fields growing a year-only mode; or both.
  And whether the hours are asked for at the add.
- **Many at once?** Filling a board backwards is many games in one sitting, so perhaps the add
  remembers the last year given.
- **How a year-only finish shows**: on a card (*2019*), in the journal, on the Stats page (counted
  in its year, and under that year in a group of its own rather than in a month), in the
  spreadsheet (a year in a date column is text, not a date), and on a share.
- **Where it sorts among a year's finishes**: before the dated ones or after them, wherever finishes
  are listed in order.
- **Every hobby, or games first.** The dates are on `log_entries`, which every hobby shares, so a
  year-only date reaches every journal unless `PassFields` holds it back. The platform's rule is
  never to branch on the slug.

### Things to get right

- **Never a day nobody named**, the release calendar's rule: every place that prints a pass's date
  gets a test with a year-only one.
- **The order of a start and a finish.** A start in 2019 and a finish on 3 March 2019 are in order;
  a start year after a finish year is not. `ck_log_entries_timestamp_order` needs a sibling, and
  breaking it should be a 400 before it is ever a 500.
- **The year filter stays a range of instants, never an `EXTRACT`** (CLAUDE.md, **What fails
  silently**). A year kept as a year is compared with the year asked for, with no zone involved,
  so `docs/data-model.md`'s four places the zone is applied stay four.
- **PUT replaces a pass outright** (`UpdateLogEntryRequest`), so any new field goes into the
  autosave's body, or the autosave clears it.

### The workshop, 14 November 2026

**Workshopped in three rounds on 14 November 2026, and not yet built: nineteen choices, every one
the recommendation.** **Round one, in words, eight**: four about what #24 is, then four
follow-ons, since the add will ask. **Round two, the looks of the two new controls, three.**
**Round three, how a year-only date reads wherever one shows, eight.** Each round's picks are
below, with what its renders found and what the build has to get right.

**Measured before round one**, from two saved production reads: `workshop.local/months/
finished.json`, every finish on 29 October (61), and `workshop.local/estimates/board.json`, the
board on 3 November.

- **Nothing on the board needs converting.** Every finish carries a date and none is before 2024:
  15 in 2024, 28 in 2025 and 21 in 2026 on 3 November. Of the 61 in October, 51 were days typed
  in the journal, which land at midnight here, and 10 were stamped by a move, each after a
  stamped start. None still carried the bare stamp a ✓ straight to Completed leaves. 60 had a
  start and 53 had hours. So #24 is for older games that are not on the board yet, and the
  journal is where the user has put dates and hours so far.
- **A pass's dates are read in eight places on the server**: `InYear`'s Playing, Completed and
  Dropped arms, the board's list of years and the Stats page's, and `StatsService`'s year of
  finishes, their order and its completion. **They are shown in eleven**: the card's date, *Did
  you finish it?* on a card and in the journal, the journal's earlier passes and its two date
  boxes, the Stats page's months, All years and rating rows, and the spreadsheet's Games and
  Playthroughs sheets. A share reuses the card and the Stats page. Each gets a test with a
  year-only date.
- **The board has no sort by date.** `LibrarySort` is manual, title, added, rating and length, so
  where a year-only finish sorts matters on the Stats page and in the spreadsheet only.

| choice | picked | against |
|---|---|---|
| how a year is kept | **as a year**: `started_year` and `completed_year` beside the two instants, read when the instant is empty | a precision beside the instant, at the edge of the year |
| a month | **years only** | a month too |
| where the year is given | **both**: the ✓ asks *When did you finish it?* (today, a year, or I don't remember) before anything is added, and the journal's Started and Finished each gain a year mode | the journal only; the add only, with the journal showing the year read-only; the ✓ stamping today and the tile offering *Change* afterwards |
| which boards | **every board at once**: the add's question and the journal's year mode on films, TV and anime too | games first, behind a `PassFields` flag |
| hours at the add | **an optional Hours played box in the ✓'s question**, where a pass has hours, which is games | hours in the journal only |
| many at once | **the year box starts at the last year given, for the visit** | kept per board and per browser; never |
| a start year at the add | **the finish year only**; a start year goes in the journal | Started in and Finished in, both at the add |
| which passes take a year | **every pass, whatever its column**: a Playing game begun in 2019 files under 2019 | finished passes only |

**What was left to be seen**, each picked from renders before a value goes into code. Round two
took the first three, and round three the last:

- **The ✓'s question**: where it opens (over the tile, in its place, or as a dialog), its three
  answers, and the year and hours boxes. On the search strip's tile and the Discover wall's, at
  1440, at 1280, where a wall tile is narrowest at 140px, and at 390.
- **The year remembered for the visit**: already in the box, or offered beside it.
- **The journal's year mode** on Started and Finished, at every journal width: the drawer at
  448px and at 512px, the modal at 672px, and a phone at 390.
- **A year-only date wherever one shows**: the card (*2019*), the journal's earlier passes, *Did
  you finish it in 2019?*, the Stats page's year (a group of its own before January or after
  December, and a year with no days in it at all), All years, a rating row, the spreadsheet's
  cell, and a share.

**What the build has to get right, added by round one**:

- **Never both.** A pass holds at most one of `completed_at` and `completed_year`, and one of
  `started_at` and `started_year`: a check constraint each. Every arm of
  `ApplyTransitionTimestamps` that writes or clears an instant writes or clears its year with it:
  Backlog clears both, Playing and On Hold the finish, Completed stamps a finish over a year, and
  #14's *No* takes the finish back (`latest.CompletedAt = null` in the move).
- **The Dropped arm copies a finish into a missing start**, and has to copy a year as a year.
  Otherwise a Playing pass the journal gave a finish year, dragged to Dropped, is stamped a start
  of today after a finish in 2019, and the order rule refuses a drag with nothing wrong with it.
- **The order of a start and a finish across the two kinds**: a year against a year by number;
  a day against a year by the day's year here, through `SpanOf`, the first of the four places,
  so the count stays four. The 400 is `LogEntryRules.TimestampOrder`'s. A database check can
  compare a year with a year; one comparing a year with an instant would have to name the zone,
  which the schema never does.
- **A year is no later than this year here**, as a finish is never in the future, and no earlier
  than a floor the build picks.
- **The add names its finish**: today, as now; a year; or none, the state *I don't remember*
  already has. `POST /api/library/{mediaId}` gains it, and the optional hours, beside the status.
- **The autosave sends both years** (the field list in `api/logEntries.ts`), and an untouched
  year goes back as it came, as `dateFieldValue` returns an untouched day.

**Round two, how the two new controls look, 14 November 2026: three choices, every one the
recommendation**, from renders of the shipped app with two prototypes swapped in, on the board
as production held it on 3 November, the From your ratings list as #17 staged it, and a search
for *metal gear* answered from that list. The page is
https://claude.ai/artifact/9KBDkZaRUgwdVvBTC7iMw2.

| choice | picked | against |
|---|---|---|
| where the ✓'s question opens | **over the tile**: a panel 288px wide above the add control, its right edge on the ✓'s, over the tile and its neighbour, held 8px inside the window | in the cover's place, the name staying beneath it; a dialog in the share dialog's frame, naming the game with its cover |
| the year from the last add | **already in the box, and selected**: Enter adds the next game in that year, and typing a year replaces it | a button beside an empty box, adding at once |
| the journal's year mode | **a Day \| Year switch beside each label**, each box on its own | *Just the year* or *A full day* under each box; a Day or Year select before each box |

The panel as rendered: *When did you finish it?* and a close ×; *In* [Year] and *Hours played*
[optional] in a row that wraps, the hours on games only, from `PassFields.hoursPlayed`; then
*Add*, *or*, *Today* and *I don't remember*. Its words, and a film's, are round three's.

**What the renders found**:

- **The search strip cuts off whatever hangs over its edge**, because it scrolls sideways. So the
  panel leaves the strip in a portal, placed from the control's box, and over the strip's first
  tile it is held 8px inside the window.
- **In the cover's place did not fit the search strip.** Its cover is 126 × 176px, and *I don't
  remember* wrapped and ran past the bottom. With the remembered year as a button it did not fit
  a 140px Discover tile either.
- **A select before the box overflowed whenever a box held a day**, which is most passes: by
  34px in the 448px drawer with both days, and by 20px on a phone.
- **The switch is 18px tall at a desk.** The prototype grows it to 26px under a coarse pointer
  (`pointer-coarse:`), and the row stays 54px, as it is now.
- **An error message widens its field**, so a switch at the field's far end was pushed away from
  its label. It sits beside the label.

**What the build has to get right, added by round two**:

- **The keyboard goes to the year box when the panel opens**, selecting a remembered year, and
  only once the panel can take it: a panel kept hidden while it measures cannot be focused, which
  the first shots showed. Escape and the × close it and give the keyboard back to the ✓.
- **A layout effect cannot read an ancestor's ref on the first render**, because a descendant's
  effect runs before the ancestor's ref is attached. The panel measures from its own element.
- **The ✓ says it is asking**: `aria-expanded`, and its hover fill held while the panel is open.
- **The prototype is `frontend/workshop.local/finished-long-ago/`**, gitignored:
  `AddControlProto.tsx` under `?ask=over&mem=box&last=2019`, `DatesProto.tsx` under
  `?ym=switch&sy=2018&fy=2019`, the stage, `shoot.mjs`, `measures.json` and `build-page.mjs`,
  which the built pieces can be compared with pixel for pixel. Its Vite server runs on 5188.

**Round three: a year-only date wherever one shows.** The card (*2019*), the journal's earlier
passes, *Did you finish it in 2019?* on a card and in the journal, the Stats page's year (a group
of its own, before January or after December, and a year with no days in it at all), All years,
a rating row, the spreadsheet's cell and a share. And the words: the panel's *In*, *Add*, *Today*
and *I don't remember*, a film's and a show's question, and the order rule's message, which says
*Completed* on every board today.

### Round three, 14 November 2026

**Eight choices, every one the recommendation**, from renders of the shipped app with prototypes
swapped in. The page is https://claude.ai/artifact/9XHpL3rd31aagu6E9ceugD, built by
`round3/build-page.mjs` from `measures.json` and the shots, A the recommendation in every section,
and the questions were asked in two rounds of four in the page's order.

- **The harness** is `frontend/workshop.local/finished-long-ago/round3/`, gitignored, beside
  round two's files, which are untouched. From `frontend/`: `npx vite --config
  workshop.local/finished-long-ago/round3/vite.config.mjs --port 5189`, then `node
  workshop.local/finished-long-ago/round3/shoot.mjs` (`ONLY=cards,passes,rating,ask,group,nodays,
  all,share,words,question,order` for a part) writes `shots/*.jpg` and `measures.json`.
  `xlsx.mjs` writes `xlsx/kept-year-{right,left,column,number}.xlsx` through the app's own
  writer, and `render-xlsx.ps1` has Excel draw them into `shots/xl-*.png`. `sheet.mjs` makes
  review sheets. 74 pictures, 7.2 MB. `build-page.mjs` writes the page from them on round two's
  model, every number in a caption read from `measures.json` or the shot itself, and
  `preview.mjs` takes one look at it at 1440 and 390.
- **What is staged**, which the page says: fourteen older games from the local catalogue
  added as finished in a year, 2016 to 2024, none of them on the board; Stardew Valley On Hold
  since 2020; and a 2019 first pass under Red Dead Redemption 2's real 2024 one. Everything else
  is the board as production held it on 3 November. A kept year travels as a sentinel, `"Y2019"`,
  in the instant's place, and lib/time is swapped per importer (Card, EntryDrawer, RatingSpread,
  journal/fields), so a place the swaps missed throws rather than printing a day. There were no
  console errors and no unanswered requests.
- **What the renders found**:
  - **All years breaks once a board has many years.** Ten year groups make each pile one cover
    wide, 2025's 28 finishes a tower, and the panel 1,755px tall at 1440. A row per year, the
    phone's layout at every width, is 660px (757 at 1024). Piles four across that wrap: 1,195px.
  - **"No month" takes two lines even at 1440** and lifts its stack 15px. Without a rule, "Dec"
    and "2024" read as one label.
  - **On a phone a card's date shares the genre's line**, so "in 2023" reads "Puzzle in 2023".
  - **Excel marks every year written as text** with its green "number stored as text" triangle,
    at either alignment, as it already does the Released column's year-only releases. Sorted by
    Finished, text years land after every date, so a 2016 game follows 2026. A number lands before
    every date, because Excel reads 2019 as a day in 1905; that looks right on this board only
    because every kept year is older than its first dated finish. *Started in* and *Finished in*
    columns sort by year. Excel's own copies drew the triangle on some sheets and not others,
    whatever the alignment: the right-aligned Games sheet and the left-aligned Playthroughs sheet
    have it, the other two none. So the page shows each alignment where Excel drew it.
  - *Add in 2021* pushes *I don't remember* onto a second row: the panel goes from 156px to 190px.
  - The order rule's two long wordings take two lines on a phone (a 98px row); the short one
    stays on one (82px), and keeps the finish's field 171px wide where the others widen it to
    about 231px at 1440.
  - *Did you finish it in 2022?* fits on a card and in the journal at every width. A share shows
    no word addressed to the owner but the banner's own *Make your own*.
- **The eight picks**, each from its own shots, every one the recommendation:

| choice | picked | against |
|---|---|---|
| a year where a day runs on from a word | **"Completed in 2019" and "finished in 2019"; the card's year alone, "2019"**, as the calendar prints a year | "Completed 2019" and "finished 2019"; "in 2019" on the card too |
| the year's group on the Stats page | **after December, set apart by a rule, labelled with the year**, and last among a year's finishes wherever they are listed | before January with a rule, and first; after December with no rule; "No month" |
| a year with no days at all | **the group alone, as a pile**: 199px at 1440, 105px on a phone | twelve empty months and the group: 255px, 369px |
| All years | **a row per year at every width** | as now; piles four across that wrap |
| the spreadsheet | ***Started in* and *Finished in* year columns beside the dates, on both sheets** | the year as text, right-aligned as Released is; a number in the date cell; text where Excel puts it |
| the panel's words | **In · Add · or · Today · I don't remember** | *Add in 2021* when the box holds a year; Year · Add · or · Today · No date |
| the question on other boards | **watch for a film, finish for a show and an anime** | finish on every board; watch on all three |
| the order rule | ***Cannot be earlier than Started.*** | *Completed* (or *Watched*) *cannot be earlier than started.*; *The finish cannot be earlier than the start.* |

- **Traps met**: a full-page capture stretches the fixed journal and moves what is in it, so
  crops inside it are taken in the viewport; a cover in the row layout needs the phone's `w-8`,
  or it keeps `sm:w-full` and the panel is 15,764px tall; and Excel's `CopyPicture(1, 2)` draws
  a range as on screen, leaving hidden rows out, which is how the sheets were rendered.

**What the build has to get right, added by round three**:

- **A year takes *in* after a word, and a card prints it alone.** An earlier pass is headed
  *Completed in 2019* (*Watched in 2019* on a film), a rating row says *finished in 2019*, and
  *Did you finish it in 2019?* asks where a day takes *on*. A card prints *2019*, as the calendar
  prints a year, and On Hold's start year the same. Each of round one's eleven places gets its
  test with a year-only date.
- **A year's undated finishes come after its dated ones** in `StatsService`'s order, and so in
  every list the Stats page makes. Finished each month files them in a group after December,
  behind a rule and labelled with the year. On a phone the months are rows, and the group is a
  row after December with no rule, as the prototype drew it. A year with no dated finish shows
  the group alone, with no empty months.
- **All years is a row per year at every width**, the phone's layout, its covers keeping the
  phone's `w-8` at every width (the trap above).
- **The spreadsheet gains *Started in* and *Finished in*** beside Started and Finished, on Games
  and Playthroughs: a number, the year of every start and finish, a day's through `lib/time.ts`
  and a kept year as kept. A kept year leaves its date cell empty, so a date column holds days
  only. At width 10 the *Finished in* header ran past its column. `docs/export.md` gains both.
- **The panel's words**: *When did you finish it?*, *In* before the year box, *Hours played*
  where the pass has hours, then *Add*, *or*, *Today* and *I don't remember*. The question's verb
  is the hobby's, from `hobbies/`, never a branch on the slug: *watch* on films, *finish* on
  games, television and anime.
- **The order rule's message is *Cannot be earlier than Started.***, on every board and for a day
  as much as a year. It replaces *Completed cannot be earlier than started.* in `EntryForm.tsx`,
  which says *Completed* even on a film, and it stays on one line at every width.
- **A share needs nothing new.** It shows a year as the owner's pages do, and none of round
  three's words is addressed to anybody, so there is no new `Voiced` pair.

**Where #24 stood after round three, 14 November 2026: workshopped, and not built.** The build was next, tests
first, from the three lists of what the build has to get right, rounds one, two and three. The
prototypes are the pixel reference for the built pieces: round two's under
`frontend/workshop.local/finished-long-ago/` and round three's in its `round3/`, both gitignored,
their Vite servers on 5188 and 5189.

### Decided at the build, 14 November 2026

**Six choices the plan left to the build, asked before any code and every one the
recommendation.**

| choice | picked | against |
|---|---|---|
| the earliest year a box takes | **1900**: it refuses only a typo, for anybody alive, on every board | 1950; 1970, the year before the first home consoles |
| what a year box says when it cannot take what is in it | ***A year from 1900 to 2026.***, under the box in the order rule's red, for text that is not a year, a year either side of the range, and an empty box when the panel's *Add* is pressed. The last year is this year here | *Cannot be later than 2026.*, *Cannot be earlier than 1900.* and *A year, like 2019.*; *Between 1900 and 2026.* |
| what the Day \| Year switch does to the date in its box | **carries what it can and invents nothing**: Day → Year keeps the day's year, Year → Day leaves the day empty, and switching back while the drawer is open brings back what was there. What the boxes show is what is saved | both ways empty; the year kept on the pass until a whole day is typed, with the box showing nothing meanwhile |
| the year remembered for the visit | **per board** | the last year given on any board |
| the spreadsheet's two year columns | **width 12**, as *Hours played*, whose twelve characters fit at 12 | 11 |
| a press away from the ✓'s panel | **closes it**, as the card's ⋯ menu, Settings and a header's list close. A year typed and not added goes with it; the box offers the last year *added* | only Escape and the × |

### Where the build stands

**Begun 14 November 2026 on the branch `finished-long-ago`**, whose first commit is the workshop's
notes. Baseline before any code: backend 1,077 of 1,077, frontend 1,417 of 1,417, and the full
e2e suite 236 of 236 in 6.4 minutes. **Each step is tests first, red before the code, and every
guard checked by putting its fault back.** A step is marked done when its tests are green and
its faults have been planted. A fresh session starts at the first step not marked done.

1. **Done.** **The schema.** `started_year` and `completed_year`, `int`, beside the two instants on
   `log_entries`. Check constraints: never a day and a year for one date (one each), a finish
   year no earlier than a start year (`ck_log_entries_timestamp_order`'s sibling), and no year
   before 1900. No upper bound in the database, which cannot ask what year it is here. One
   migration. `SchemaTests` first.
2. **Done.** **The rules on the way in.** `CreateLogEntryRequest` and `UpdateLogEntryRequest` gain both
   years, defaulted as the season is; `LogEntryDto` carries them. `LogEntryRules` answers 400
   before any check can be a 500: a day and a year for one date; a year outside 1900 to this year
   here (`IJournalClock.Today`, the fourth place); and the order across the two kinds, a year
   against a year by number and a day against a year through `SpanOf`, the first place, so the
   count stays four. The order message becomes *Cannot be earlier than Started.* on the server
   too, under `completedAt` or `completedYear`. `LogEntriesEndpointTests` first.
3. **Done.** **The transitions.** Every arm of `ApplyTransitionTimestamps` writes or clears a year with its
   instant: Backlog clears all four; Playing and On Hold stamp a start only when neither kind is
   there, and clear the finish; Completed stamps a finish over a year; Dropped copies a finish
   into a missing start as the kind it is. #14's *No* takes a finish year back as it takes an
   instant. `StatusTransitionTests` first, with a Playing pass given a finish year dragged to
   Dropped among them.
4. **Done.** **The add names its finish.** `POST /api/library/{mediaId}` takes, beside the column, a
   finish year or that there is none, and optional hours; neither means today, as now. Only with
   Completed, and the year by step 2's rule. `AddingToBoardTests` first.
5. **Done.** **The board reads a year.** `InYear`'s Playing, Completed and either-date arms each gain a
   kept year compared with the year asked for by number; the board's list of years takes kept
   years; and both terminal projections give a card `lastActivityYear` and `completedYear`
   beside the two instants, a year only where its date is not a day. `LibraryOrderingTests`,
   `LibraryEndpointTests` and the share's tests first.
6. **Done.** **The Stats page reads a year.** A year's finishes take its kept ones, sorted after its dated
   ones, and All years sorts each kept year after its year's last instant, by `SpanOf`; completion
   counts a kept start, or a kept finish where there is no start of either kind; the page's years
   take kept years; `FinishDto` carries `completedYear`. `StatsEndpointTests` first.
7. **Done.** **The spreadsheet's half on the server** is step 2's, since a pass is `LogEntryDto`.
   `LibraryExportTests` says so. **The backend suite after step 7: 1,143 of 1,143**, the 1,077
   before and 66 new.
8. **Done.** **The client's wire and the autosave.** The types gain the fields; `pick()` sends both years;
   a date field holds a day, a year or nothing, and an untouched year goes back as it came, as
   `dateFieldValue` sends back an untouched day. `logEntries.test.ts` and `fields.test.ts` first.
9. **Done** (in Vitest; its look is step 15's). **The journal's Day \| Year switch**, from round two's `DatesProto` under `ym=switch`: beside
   each label, a box in Year mode for a pass that keeps a year, the switch carrying what it can,
   the order rule as *Cannot be earlier than Started.* for a day as much as a year, the year rule
   as *A year from 1900 to 2026.*, and nothing changed while a move is on its way.
   `EntryDrawer.test.tsx` first.
10. **Done.** **A year wherever a date is shown.** The card prints *2019*, On Hold's start year as well;
    *Did you finish it in 2019?* on a card and in the journal; an earlier pass is *Completed in
    2019* and its Delete names *the Completed pass from 2019*; a rating row says *finished in
    2019*. Each of the eleven places gets its test with a year-only date.
11. **Done** (in Vitest; its layout is steps 14 and 15's). **The Stats page's covers.** A year's kept finishes are a group after December, behind a rule
    and labelled with the year, a row after December with no rule on a phone; a year with no
    days is that group alone, as a pile; All years is a row per year at every width, its covers
    the phone's `w-8`. From round three's `FinishedCoversProto`. `stats.test.ts` and
    `StatsPage.test.tsx` first.
12. **Done.** **The spreadsheet.** *Started in* and *Finished in* after *Finished* on Games and
    Playthroughs, width 12, a number: a day's year here or a kept year as kept. A kept year leaves
    its date cell empty. `sheets.test.ts` first.
13. **Done** (in Vitest; its look is step 15's). **The ✓'s question**, from round three's
    `AddControlProto`: a panel 288px wide over the tile
    in a portal, its right edge on the ✓'s, 8px inside the window; the question in the hobby's
    verb from `hobbies/`, *watch* on films; *In* and the year box, the last year added on this
    board this visit already in it and selected; *Hours played* where the pass has hours; *Add*,
    *or*, *Today*, *I don't remember*; the year rule's line under the boxes. The keyboard to the
    year box once the panel is placed, back to the ✓ on Escape or the ×; `aria-expanded` and the
    hover fill held on the ✓; a press elsewhere closes it. `useAddToBoard` sends the finish.
    `BoardSearch.test.tsx`, `DiscoverPage.test.tsx` and the hobby files' tests first.
    **Built**: `HobbyDefinition.whenFinished`; `search/WhenFinished.tsx`, the panel and
    `placePanel`; `search/lastYear.ts`, the year in memory, emptied after every test by
    `src/test/setup.ts`; `keepTabIn`, lifted out of `useModalPanel` so the dialogs and the
    panel share one copy. **Tests**: the new `AddControl.test.tsx` and `hobbies/adding.test.ts`,
    four new cases in `BoardSearch.test.tsx`, and the ✓ cases in it, `DiscoverPage.test.tsx` and
    `SearchResult.test.tsx` answering the question: 61 red before the code. Each of 24 faults
    planted one at a time turned at least one red, among them the ✓ adding at once, an Escape
    let past, the ✓ counted as a press elsewhere, Tab let out, a year remembered as it is typed
    or when refused, one year for every board, the year stored, no way below, a scroll heard
    only as it bubbles, and the finish dropped on its way to the server. **The frontend after
    step 13: 1,528 of 1,528 in 67 files**, `tsc -b` clean.
14. **Done.** **End to end.** The specs that pressed a ✓ answer its question now; new specs for the
    question on the strip and the wall at 1440, 1280 and 390, the switch, a year on a card,
    in the journal, on the Stats page and in the spreadsheet. The panel and the switch in Firefox
    too. **Built**: the four specs the hand-over named went red against step 13 and answer the
    question now, *most played fills a board backwards* with a year and the next tile's box
    holding it; 17 new, seven on the strip (1440, 1280, a 400px window that scrolls the strip and
    the page, and a phone), three on the wall (1440, 1280 and a phone), two of the switch, four on
    the Stats page and one of the spreadsheet. `whenFinished` and `expectQuestionPlaced` in
    `e2e/support/board.ts` hold a panel to `placePanel`'s rule from the live boxes. **The full
    suite after step 14: 253 of 253 in 7.0 minutes**, and the question's and the switch's 14 in
    Firefox, its two phone cases skipped there as the suite's other phone cases are. **Found**:
    four journal specs and the films' and shows' drawer specs found a date box with a bare
    `getByLabel`, which since step 9 also finds the switch's group, *Started as*, and for
    *Completed* the pass's own section; they find the box by its role and exact name now.
    **Faults planted**, one at a time: the year box focused while the panel is hidden being
    measured turned 10 specs red, and Vitest green, since jsdom cannot see it; a scroll heard only
    as it bubbles turned the 400px spec red. **The portal moved into the tile turned nothing
    red**: a fixed panel is not cut off by the strip, because nothing between it and the window
    makes a containing block. `position: fixed` is what keeps it whole, and the portal what keeps
    it so whatever an ancestor becomes, as a card's `@container` would.
15. **Done.** **Against the prototypes, pixel for pixel**: the panel and the switch against round two's
    and three's, and the Stats page's groups and All years against round three's, at the
    workshop's widths. **26 states, and the build differs from the picked prototype by no pixel in
    any of them**: the panel on the wall at 1440, 1280 and 390, in Shelf Dark and with an empty
    box, on the strip at 1440 and 390, and a film's question; the switch in the 448px and 512px
    drawers, in the modal and on a phone, holding days, a finish year, both years and the order
    rule, and in Shelf Dark; and the Stats page's year group at 1440 and 390 and in Shelf Dark, a
    year with no days at 1440 and 390, and All years at 1440, 1024 and 390. The clips agreed, and
    so did where the keyboard was and what the year box had selected. By the gitignored
    `finished-long-ago/compare-built.mjs`, with round three's server on 5189 and the app's own on
    5190 answered from round three's stage, the prototype given its sentinels and the build the
    API's shape. **Found**: since step 10 the shipped card prints a date through `lib/passDate`,
    which round three's swaps of `lib/time` do not reach, so a `"Y2019"` sentinel on the board now
    throws *Invalid time value* in the prototype too. The board's states send both apps the
    built shape, which the panel and the switch never read; the Stats page's send the prototype
    its sentinels, which its own covers read.
16. **Done.** **The docs.** `data-model.md`, `board.md`, `journal.md`, `stats.md`, `export.md`,
    `games-igdb.md`, `design.md`, `api.md` and `history.md`; CLAUDE.md's schema, its settled
    decisions and **What is next**; this section's *Built*, *Tests* and *What the plan got wrong*.
    CLAUDE.md also gained a row under **What exists**, `lib/passDate.ts` in its layout, and a
    trap under **What fails silently**: a reader of a pass's instant alone leaves a kept year out.
    It was staged as #24's edits alone, by the gitignored `stage-claude.mjs`, which makes the
    same edits in HEAD's text and in the working tree, so the other session's lines for #25 to
    #29 stayed uncommitted.
17. **Done.** **All three suites green, then the PR.** Not merged and not deployed. On the docs'
    commit: backend 1,143 of 1,143, frontend 1,528 of 1,528 in 67 files with `tsc -b` clean, and
    the full e2e suite 253 of 253 in 7.0 minutes. Then the `wip(#24)` commits and the hand-over's
    were squashed into one `feat:` commit after the two docs commits, as #23's was, for the PR.

**Hand-over after step 12, 14 November 2026.** A fresh session takes over at step 13.

- **The branch is `finished-long-ago`**: the workshop's notes (`8c3ae98`), these steps
  (`3d1428e`), and four `wip(#24)` commits, one a stretch of steps. **They are squashed into one
  `feat:` commit before the PR**, after the two docs commits, as #23's `24f1a77` followed
  `7071dad`.
- **Green after step 12**: the backend 1,143 of 1,143, unchanged since step 7; the frontend 1,468
  of 1,468 in 65 files; `tsc -b` clean. **The e2e suite has not run since the baseline.**
- **Another session is planning #25 to #29 in this same checkout, uncommitted**: its rows and
  sections in this file, and its lines under CLAUDE.md's **What is next**. They are not #24's. While
  they stay uncommitted, commit #24's own paths, and stage this file as #24's version alone: write
  `git show HEAD:docs/plans/games-board-next.md` with #24's edits to a scratch file, then
  `git hash-object -w --path=docs/plans/games-board-next.md <file>` and
  `git update-index --cacheinfo 100644,<sha>,docs/plans/games-board-next.md`. That leaves the
  working tree as the other session left it. A `git add` of the file took their text into a
  commit once, and was undone.
- **Decided at the build beyond the six asked**, each following a rule already picked:
  - The API's words for what the UI never sends: *A start is a day or a year, never both.* and *A
    finish is a day or a year, never both.* under `StartedYear` and `CompletedYear`; on the add,
    *Only an add to Completed names a finish.*, *Only an add to Completed takes hours.* and *A
    finish is a year or none, never both.* The server's order rule is the form's *Cannot be earlier
    than Started.*, and its year rule the boxes' *A year from 1900 to 2026.*
  - The add's body is `completedYear`, `undated: true` and `hoursPlayed` beside `status`, refused
    with any column but Completed; neither a year nor `undated` is today. On the client,
    `addToBoard(mediaId, status, { completedYear, undated, hoursPlayed })` (`AddedFinish`).
  - A card carries `lastActivityYear` and `completedYear` beside its two instants, each null
    wherever its date is a day, from both projections; `FinishDto` carries `completedYear`;
    `IJournalClock.YearsOf` has an overload taking kept years as they are.
  - The Stats page's order files a kept year at `SpanOf(year).To`, a kept year first at a tie,
    sorted in C# over an id order from SQL.
  - An earlier pass's Delete names it *the Completed pass from 2019*: the year bare after *from*,
    since round three's *in* is for a year running on from a word with none.
  - A year's group of kept finishes is named *2024, no month* aloud, as round three's prototype
    named it, and labelled *2024*.
- **Step 13, worked out and not begun**, from `round3/AddControlProto.tsx` with round two's picks.
  The ✓ opens the panel rather than adding, `aria-expanded`, its hover fill held while open. The
  panel is a portal, fixed and `w-72`, measured from a hidden marker beside the control, since a
  layout effect cannot read an ancestor's ref: left at `max(8, min(control.right - width,
  innerWidth - 8 - width))`, top at `control.top - 6 - height`. Its markup and classes are the
  prototype's: the question and a × named *Cancel*; *In* and a year box named *Year finished*;
  *Hours played* and an *optional* box where `journal.fields.hoursPlayed`; then *Add* in the accent,
  *or*, *Today* and *I don't remember*. The question is a new `HobbyDefinition` field: *When did you
  finish it?*, and *When did you watch it?* on films. The last year added is per board for the
  visit, a map in memory set by an *Add* the rule takes, already in the box and selected, and the
  keyboard goes there once the panel is placed. Escape and the × close it and give the keyboard
  back to the ✓, and a press elsewhere closes it. *Add* with an empty or refused year says the year
  rule in a line under the boxes, and refused hours the journal's `HOURS_RULE`. The hours go with
  any answer; *Today* names no finish and *I don't remember* sends `undated`. `useAddToBoard.add`
  passes the finish on. `WallTile` hands the control `mt-auto w-full`, which the prototype moved
  onto its wrapper by string surgery; the wrapper gets a prop of its own instead.
- **Three questions for the user before step 13's code**, none of them in the plan: when there is
  no room above the control, does the panel open below it; does it follow the control when the
  page or the strip scrolls; and does it close when the keyboard leaves it, as #20's list does.
  **Asked at step 13, and every one the recommendation**:

  | choice | picked | against |
  |---|---|---|
  | no room above the control | **6px below it, whenever above would leave the panel less than 8px from the window's top** | held 8px from the top, over the ✓; always above, off the window |
  | the page or the strip scrolling | **the panel follows its ✓**, placed again at every scroll and resize: a phone scrolls the page itself to lift the focused year box above its keyboard | closing, which on a phone could close it as it opens; staying where it opened |
  | the keyboard leaving | **Tab goes round inside it**, as the share dialog's does: in a portal at the page's end, Tab past either end would walk the page from its bottom | closing as #20's list does; Tab on from the ✓ as if the panel sat beside it |
  | when a refusal's line goes | **when its box is typed in**, the next press checking again | once the box holds what it can take; at the next press only |

- **Decided at step 13, each following a rule already picked**:
  - **No wrapper and no marker.** The panel is placed from the control's own ref, which is
    attached by the time a press mounts the panel, a commit later. The portal adds nothing to the
    control's box, so the Discover wall's `mt-auto w-full bg-surface` reaches the control as it
    did, with no prop for a wrapper.
  - **`document.documentElement.clientWidth`, where the prototype read `innerWidth`**: a panel
    held at the right edge would otherwise sit 9px under a desktop's 17px scrollbar.
  - **An Escape is kept in the panel.** React bubbles through a portal by its own tree, and the
    strip clears its search at an Escape caught on its container. `BoardSearch.test.tsx` holds it.
  - **An Enter that ends an input method's composition is not *Add***, `NoteList`'s rule.
  - **The ✓ pressed again closes it**, as the ⋯ menu's button does; + or ▶ pressed while it is
    open is a press elsewhere, which closes it, and then adds.
  - **An answer gives the keyboard back to the ✓ before the add**, as Escape does; the ✓ is then
    disabled while the add is on its way and goes with the add control, as + and ▶ always have.
- **E2E known to change**: `discover.spec.ts`'s *most played fills a board backwards* and
  `search.spec.ts`'s two ✓ cases answer the question now, and `stats.spec.ts`'s *piles a year at
  most four covers across under All years* becomes a row per year, its covers 32px wide at every
  width.
- **The prototypes for steps 14 and 15**, from `frontend/`: round two's
  `npx vite --config workshop.local/finished-long-ago/vite.config.mjs --port 5188`, and round
  three's `round3/vite.config.mjs` on 5189. `measures.json` in each holds what was measured, and
  `shots/` the picked renders.

### Built

**Built 14 November 2026, the day it was workshopped, tests first, in the seventeen steps under
*Where the build stands*.** Each step was marked done once its tests were green and its faults
planted; the faults of steps 13 and 14 are listed below as they were planted.

- **Backend.** The `AddPassYears` migration, with `started_year`, `completed_year` and their four
  checks, and the two years on `LogEntry`. `CreateLogEntryRequest`, `UpdateLogEntryRequest` and
  `LogEntryDto` carry both, held by `LogEntryRules`: a day or a year for each date, a year from
  1900 to this year here, and the order across the two kinds through `SpanOf`, in the boxes' and
  the form's words. Every arm of `ApplyTransitionTimestamps` moves a year with its instant.
  `AddToBoardRequest` takes `CompletedYear`, `Undated` and `HoursPlayed` beside the column.
  `LibraryService.InYear`, the board's years and both terminal projections read a kept year, a
  card carrying `lastActivityYear` and `completedYear`. `StatsService` files a kept finish in its
  year, at `SpanOf(year).To`, and counts it in completion and the page's years, `FinishDto`
  carrying `CompletedYear`. `IJournalClock.YearsOf` has an overload that takes kept years as
  they are.
- **Frontend.** The wire types, and `pick()` sending both years. `lib/passDate.ts`, a pass's date
  printed, read and refused as a day or a year. `journal/DateField.tsx`, the Day \| Year switch,
  and in `journal/fields.ts` `isDay`, `yearFieldValue`, `outOfOrder` and `ORDER_RULE`. A year on a
  card, in `finishQuestion`, on an earlier pass and its Delete, and on a rating row.
  `stats/FinishedCovers.tsx`'s group after December and All years a row a year. `export/sheets.ts`'s
  *Started in* and *Finished in*. And the ✓'s question: `HobbyDefinition.whenFinished`,
  `search/WhenFinished.tsx` with `placePanel`, `search/lastYear.ts`, the ✓ in `AddControl.tsx`,
  the finish passed on by `useAddToBoard`, and `keepTabIn`, lifted out of `useModalPanel`.
- **Measured against the picked prototypes**: see **A game finished long ago** in
  `docs/design.md`. 26 states, and no pixel different in any of them.

### Tests

- **Backend, 66 new cases**, in `SchemaTests`, `LogEntriesEndpointTests`, `StatusTransitionTests`,
  `AddingToBoardTests`, `LibraryOrderingTests`, `LibraryEndpointTests`, `SharedBoardTests`,
  `StatsEndpointTests`, `LibraryExportTests` and `JournalClockTests`: the suite went 1,143 green at
  step 7, the 1,077 before and these 66, and nothing on the server changed after it.
- **Frontend, 111 new cases**, 51 in steps 8 to 12 and 60 in step 13: the suite went 1,528 green in
  67 files, the 1,417 before and these, with `tsc -b` clean. Step 13's 61 went red before its code,
  and each of its 24 faults, planted alone, turned at least one red:

  | fault planted | red |
  |---|---|
  | the ✓ adding at once | 52, every case that answers or measures the question |
  | no `aria-expanded` | *says that it asks*, the two that close it, and the four that place it, which find the control by it |
  | the keyboard not handed back | Escape's, the ×'s, and the strip's Escape case |
  | the panel left open after an answer | the year box's, and the four that open it again |
  | an hours box on every board | the film's case |
  | a game's verb on every board | the film's case |
  | no keyboard to the year box | 5, *puts the keyboard in the year box* among them |
  | the remembered year not selected | the two that rely on the selection |
  | an Escape let past | *keeps an Escape in the question from clearing the search* |
  | no press elsewhere heard | the two presses elsewhere |
  | the ✓ counted as a press elsewhere | *closes at a second press of the ✓* |
  | Tab let out | *keeps Tab going round inside it* |
  | a year remembered as it is typed | the two *is never* cases |
  | a refused year remembered | *is never a year the rule refused* |
  | an empty year taken at Add | 3, the empty box's among them |
  | the hours not read | the 3 refusals and *both refusals at once* |
  | an Enter that ends a composition taken | its case |
  | no way below | the unit's and the page's |
  | no scroll heard, and a scroll heard only as it bubbles | *follows its ✓ when the strip or the page scrolls*, each |
  | no resize heard | its case |
  | one year for every board | *is this board's* |
  | the year stored for the next visit | *lasts for the visit and no longer* |
  | the finish dropped on its way to the server | the 3 that read the request |

- **End to end, 17 new specs** and the four the hand-over named answering the question: seven on the
  strip, three on the wall, two of the switch, four on the Stats page and one of the spreadsheet.
  The full suite went 253 green in 7.0 minutes, the 236 before and these. The question's and the
  switch's 14 went green in Firefox, its two phone specs skipped there. Three faults planted in
  Chromium: the year box focused while the panel is hidden, 10 red; a scroll heard only as it
  bubbles, the 400px spec red; and the portal moved into the tile, none red, which is below.

### What the plan got wrong, or left out

- **The portal is not what keeps the strip from cutting the panel off; `position: fixed` is.** Round
  two's renders found the strip clipping whatever hung over its edge, and the portal was the answer
  then. Moved back into the tile, the fixed panel stayed whole and no spec went red, because
  nothing between it and the window makes a containing block. The portal stays, because a card's
  `@container` or a transform would make one.
- **No marker was needed.** The hand-over planned a hidden marker to measure from, since a layout
  effect cannot read an ancestor's ref on the first render. The panel mounts on a press, a commit
  after the control, so the control's own ref is attached by then, and with no wrapper the wall's
  classes reach the control as they did.
- **`innerWidth` would have put a panel under the scrollbar.** The prototype held the panel 8px
  inside `innerWidth`, which counts a desktop's 17px scrollbar; the build reads `clientWidth`.
- **An Escape in the panel reached the strip through the portal**, which React bubbles by its own
  tree, and would have cleared the search. Not in the plan; held since step 13.
- **An input method's Enter would have added**, and Japanese is written here. Not in the plan;
  `NoteList`'s rule, held since step 13.
- **The switch's name met the e2e suite's locators.** *Started as* is found by
  `getByLabel('Started')`, and the finish's label names the pass's section too, so four journal
  specs went red the first time the suite met the switch, which had not run since the baseline.
- **Round three's harness no longer draws the board**, because step 10 moved the card's dates to
  `lib/passDate`, which its swaps of `lib/time` do not reach, so its sentinels throw there. The
  comparison sends the board's states the built shape, which the panel and the switch never read.
- **`docs/api.md` had no row for `POST /api/library/{mediaId}`**, the add itself, only for the move
  under it. It has one now.

### The deploy, and what it left

- **Deployed at about 22:03 Eastern on 14 November 2026**, `4be04e3` to `2ef7369`, carrying #98's
  docs. No new variable, and **one migration, `AddPassYears`**: two nullable columns and four
  checks, which every existing row passes, and nothing dropped. The night's backup had run about
  22 hours before. api and caddy were both recreated, api first, no base image moved, and the
  deploy took 14 seconds.
- **Proved from outside.** The bundle went `index-CiZAmd41.js` to `index-Bre0ogh1.js`, where a local
  build said `index-YI5H7qDQ.js`, and the stylesheet `index-C2ksD7K5.css` to `index-B-A_kP2W.css`,
  the local build's name. In the script *When did you finish it?* went 0 to 3; *When did you watch
  it?*, *I don't remember*, *Year finished*, *Cannot be earlier than Started.*, *A year from*, *,
  no month* and *Did you finish it in* 0 to 1; *Started in* and *Finished in* 0 to 2; and
  `completedYear` 0 to 18, each the local build's count. A diff of the two stylesheets' selectors
  found fourteen rules new and none gone, and seven of them were counted 0 to 1: the panel's
  `.w-72`, its boxes' `.w-[4.5rem]` and `.w-[5.5rem]`, the ✓'s `aria-expanded:bg-hover` and
  `aria-expanded:text-accent`, the year group's `sm:border-line-soft` and the switch's
  `pointer-coarse:h-7`. No route is new. `/api/auth/me` answered `null` with a 200.
- **Proved inside.** `AddPassYears` is the newest migration production has, where
  `AddDiscoverHides` was, and the API's log named it as it applied it. In the running DLL
  `get_CompletedYear`, `get_StartedYear`, `get_LastActivityYear`, `get_Undated` and `YearRule` went 0
  to 1 each. A name several types share is one entry in the DLL's strings, so `get_CompletedYear`
  counts once though seven types carry it.
- **The restart re-armed both timers, and both ran five minutes on**: the HowLongToBeat backfill
  queued 0 titles, and the release sweep brought 16 unreleased titles up to date. The API's log
  had 32 `info` lines and no `warn`, `fail` or `crit` one. **A bare `grep -i crit` counts one**,
  because the SQL the log prints names `opencritic_id`; `docs/deploy.md` says to read the levels
  now.
- **The user's own check**: on the live board, the ✓ on a search result asking *When did you finish
  it?*, a game added in a year showing that year on its card, and the Day | Year switch in a
  journal. No session here can sign in to it.

---

## 25. A journal from the Stats page · shipped

**Planned 14 November 2026**, at the user's request. Lines were read at `8c3ae98`. In the user's
words: *"On the 'Finished Each Month' section when it's displayed a year, if I click on the cover
of a game, I want it to open up the journal"*, and the same for a row in #21's list of the games
rated at a point.

**This reverses one of #21's picks.** Round one decided *what a title in the list does: nothing*,
and CLAUDE.md's **Settled** row *A rating's games* says *and nothing opened from a row*. The build
changes that row, and `docs/stats.md`'s **The finishes behind a rating**, in the same PR.

**What it builds on.**
- **The covers by month are `stats/FinishedCovers.tsx`**: an `<img>` with the title as its `alt`
  and `title`, or a lettered `role="img"` span with no cover. Neither is focusable today.
- **#21's rows are in `stats/RatingSpread.tsx`**, inside the open column's list: a cover, a name,
  `★ 8.5`, and a day only on a title that appears twice.
- **Each finish already carries its media id** (`StatsDto.Finished`), so the page knows which
  title to open with no server change.
- **The drawer is the board's.** `EntryDrawer` is mounted by `BoardPage` alone, and it takes
  `columns`, `onMove` and `onPutBack` from the board's mutation (`useBoard`). The pass's heading
  moves a title through them (#13), and leaving Completed asks *Did you finish it?* (#14). The
  Stats page has none of the three. **That is the size of this feature**: everything else is a
  button round a cover.
- **A finish is a pass, and the drawer opens a title**, whose current pass leads and whose earlier
  passes sit below it. A game finished in 2023 and replayed since opens on the replay.

### Decide at pickup

- **What the drawer can do from Stats.** Recommended: **everything it does on the board**, moves
  included, with the Stats page refetched afterwards, so a finish put back leaves its month. The
  alternative is a drawer with its heading read-only on Stats, which is a second mode of the
  drawer to keep and test, for a page reached from the board in one press.
- **Which pass it opens at.** Recommended: the title, as everywhere else. Opening at the finish's
  own pass would be the first journal that does not lead with the current pass.
- **What says a cover opens something.** Today a cover says nothing under the pointer but its
  `title` tooltip. Render: a lift and a ring on hover and focus, as a card does; the accent ring
  alone; nothing but the pointer. The rating rows have #21's name to put in the accent, as #12
  and #20 do for a name that opens.
- **On a phone** the covers by month are small; whether a press there opens the drawer or the
  covers need to grow is a render.
- **Never on a share.** A share shows the Stats page and never a note, so its covers and rows stay
  pictures and words, as #21 kept its chart.

### Decided at pickup

**Picked up on 20 November 2026**, on branch `journal-from-stats`. Round one was four questions
in words, and **every answer was the recommendation**:

- **Which titles open it: the covers and the rating rows**, as asked. Every cover in Finished each
  month and, under All years, in Finished each year; and every row in a rating's list. Each game's
  row in the hours chart and each title in the Backlog panel were offered too, and stay as they
  are.
- **Everything the drawer does on the board, moves included.** A move from Stats lands at the end
  of its new column, as a move from the board's journal does, and **every write the drawer makes
  refreshes the Stats page behind it**, not only a move.
- **The title, current pass first**, as every other door opens it. Offered against: the journal
  brought to the finish pressed, as a note a search found is. As of #21's read on 7 November none
  of the user's 61 finishes was a replay, so the two differ for nobody yet.
- **The stale Stats page is fixed in the same PR**: see the second finding below.

**Found at pickup, by reading the code before asking:**

- **The journal's own writes never reach the Stats page.** The plan named moves. A rating, a date,
  hours, a HowLongToBeat pin and deleting a pass change the page too, and `useJournalEntry`'s
  `refresh` settles `['library', hobby]` and the title alone.
- **The Stats page's answer stays fresh for 30 seconds, not nought.** `statsKey`'s comment in
  `board/keys.ts` says a page mounting refetches anything stale, *at the default stale time of
  nought*, but `createQueryClient` sets `staleTime: 30_000`, and nothing on the board settles
  `['stats', …]`. So a move or a rating made within 30 seconds of leaving the page is missing
  from it when you come back, until a reload; and for the five minutes an unwatched answer is
  kept, the old numbers are drawn first and then replaced.
- **A move from the board's journal lands at the end of its column** only because `useBoard`'s
  move writes the column's cached order after the transition. The server alone puts a replay at
  the top and leaves a pass moved in place at its old place number. The Stats page has no column
  on screen to write, so its move reads the column whole (`wholeColumn`) and writes the order with
  the title last.
- **A card neither lifts nor rings.** The render options above said *a lift and a ring on hover
  and focus, as a card does*; a card's name underlines on hover, and its focus ring is the
  browser's. **And #12 and #20 differ**: #12's name is in the accent, and #20's list is a whole row
  with a hover fill and a plain name, its accent on the count that opened the list. Both are
  rendered for the rating rows.

### Decided from the renders

**Round two, the same day**: three looks rendered on the shipped Stats page with prototypes in the
covers' and the list's place, on the user's 61 finishes as read on 29 October, at 1440 and 390 in
Shelf Light and Shelf Dark, and the list on Ember for the accent's cost. The page is private:
https://claude.ai/artifact/CLSZypukga5zeFXmvpaniZ; the harness is the gitignored
`frontend/workshop.local/journal-from-stats/`. **All three picks were the recommendation.**

| Choice | Picked | Rendered against |
|---|---|---|
| How a cover says it opens | **An accent ring under the pointer**, `outline-2 outline-offset-2 outline-accent`: the ring the keyboard gets, which is the page's own, its chart rows' | the pointer alone; a lift of 2px with a deeper shadow, the first thing in the app to move under the pointer, whose shadow barely showed on Shelf Dark |
| A rating row | **The whole row a button, its name in the accent**, with #20's hover fill, `hover:bg-hover` | #20's row with its name in the page's ink, which says nothing until hovered; the name alone a button in the accent, #12's, identical to the pick at rest and a smaller target |
| A cover on a phone | **Today's, 32×45px**: October's seven on one line, the panel 475px tall | 40×56px, closer to Android's 48dp target, October on two lines and the panel 602px |

- **A cover takes `cursor-pointer`**, which Tailwind v4 no longer gives a button.
- **A row's keyboard ring is the browser's**, as #20's rows and the rating columns above wear it.
- **Each row keeps its height**: 48px with a name on two lines and 40 with one, the same in every
  option, so the list is the size it was.

### Things to get right

- **Back closes the drawer** (`useOverlayHistory`), and leaves you on the year you were reading,
  with #21's list still open.
- **The keyboard goes back to the cover or row that opened it**, as #12 learned the calendar's did
  not.
- **A move from Stats refetches Stats as well as the board's keys**, or a title taken out of
  Completed stays in its month until a reload.
- **Lifting the drawer's wiring out of `BoardPage`** is the refactor here; the board's own tests
  are what say it still works.

### Tests first

- A cover in a year's months is a button named by its title, and opens that title's journal; so
  does a row in an open rating list.
- Back and Escape close it and the keyboard returns to what opened it.
- Moving the title out of Completed from that journal takes it out of its month and its rating's
  count without a reload.
- On a share, nothing under Stats is a button that opens a journal.
- **Put the fault back:** drop the Stats refetch from the move, and the month test goes red.

### Built

**On 20 November 2026, tests first**, on branch `journal-from-stats`. The failing cases went in
first and ran red, ten of them for the reasons they name: no cover and no row was a button, and
every write on the board left the Stats page's answers where they were. The share's case was
green from the start, as a guard should be.

- **`journal/useJournal.ts`**: the way in and out of the drawer, its history entry, how it was
  opened and the keyboard handed back by id, lifted out of `BoardPage`, which now calls it. The
  board's own suite is what says the lift was clean.
- **`board/settle.ts`**: `settleMove`, what a move refreshes, moved out of `useBoard` with its
  comments, and `settleStats` beside it, which drops the Stats page's answers where nothing shows
  them and asks again where something does. Called by the board's move through `settleMove`, its
  remove, `useJournalEntry`'s `refresh` and `useAddToBoard`. **`allStatsKey`** in `board/keys.ts`
  is its prefix, and `statsKey`'s comment says what is true now.
- **`board/useOffBoardMoves.ts`**: the Stats page's journal's moves. The board's route and
  `settleMove`, then the new column read whole (`wholeColumn`) and written with the title last.
- **The Stats page** mounts the drawer in `StatsOf`, with the columns the board draws less any
  taken off in Settings, and hands `journal.openFrom` down through `Year` and `Dashboard`.
  **`Dashboard`'s props are a union on the voice**: `own` has to be handed the way in, and
  `shared` cannot be.
- **`FinishedCovers`**: each cover a button round its picture, by `finishCoverId(mediaId, nth)`,
  wearing the picked ring; a share's covers stay pictures. **`RatingSpread`**: each row a button
  with its name in the accent.
- **The built pieces differ from the picked prototypes by no pixel** in 15 states, light and dark,
  1440 and 390, at rest, under the pointer and under the keyboard: see **Stats** in
  `docs/design.md`.

### Tests

- **`StatsPage.test.tsx`, *the journal*, seven cases**: a cover opens the journal and gets the
  keyboard back; so does one under All years; a rating's row opens it and gets the keyboard back;
  Back closes it on the same year with the list still open; a finish put back leaves its month and
  its rating, sending `notFinished` and then the order with the title last; a rating changed moves
  the game along the chart behind the drawer; and the heading offers the board's columns, less one
  taken off in Settings.
- **`SharedStatsPage.test.tsx`, one**: a share's covers are pictures, and nothing opens.
- **`BoardPage.test.tsx`, *the Stats page's saved numbers*, four**: dropped by a move, a title taken
  off, a write in the journal and an add from the strip, each read from what the cache is left
  holding, because the test client's stale time of nought would never show the 30 seconds.
- **One existing case changed, for a new reason**: *stays open when something else is pressed, or
  the keyboard moves on* tabbed back to the year control, and now lands on the cover before the
  chart, which is the nearest thing that takes the keyboard.
- **`e2e/stats.spec.ts`, four**: a cover rings under the pointer and not at rest, opens the
  journal, and Back closes it with the keyboard on the cover; a rating's row opens it and gets the
  keyboard back; a finish taken back leaves its month behind the drawer and lands last in Playing;
  and on a phone a 32px cover opens it with a press.
- **The frontend suite went from 1,528 to 1,540, all green. The first full e2e run went 254 green
  and 3 red**, the 253 before and the 4 new, one of them among the red:
  - **The new finish-taken-back case, from its own setup**: `seed` writes only what it is given, so
    the two games seeded into Playing had no start, and the board's year left them out. Seeded with
    a start, the whole Stats spec then passed three times over, 42 of 42.
  - **#24's *follows its ✓ as the strip and the page scroll***, 8px off where the question should
    sit. It passed 3 of 3 alone, and nothing on its path changed.
  - **CLAUDE.md's flaky *clicking away from the drawer closes it, and so does Escape***, which
    failed again 1 of 3 in the re-run, **both times at its second half**: the backdrop closed the
    drawer, and the Escape pressed straight after reopening it, with no wait for the drawer, did
    not. The lift into `useJournal` adds no step between a press and the drawer; whether the
    Escape simply arrives before the drawer has mounted is not proved.
- **In Firefox**, Playwright's 153, the three desktop cases pass, the ring under the pointer and
  the keyboard handed back included. The phone case is `isMobile`, which Firefox does not take.

### Checked by putting each fault back

One at a time against the finished feature, by the gitignored
`workshop.local/journal-from-stats/faults.mjs`, #21's script pointed at the Stats, share and board
tests, which restores each file after its run. Every fault turned red exactly the cases named.

| Fault | What goes red |
|---|---|
| A move settles nothing on the Stats page | the board's *drops them when a card moves*, and the page's finish put back |
| A write in the journal settles nothing on it | *drops them when the journal writes a pass*, and the page's rating changed |
| Taking a title off settles nothing on it | *drops them when a card is taken off the board* |
| An add settles nothing on it | *drops them when a title is added from the search strip* |
| Its answers made stale where nothing shows them, not dropped | all four of the board's |
| The page behind the drawer never asked again | the page's finish put back, and its rating changed |
| A move off the board left where the server puts it | the finish put back, on the order it writes |
| The title written first rather than last | the same |
| Covers that open nothing on your page | five of the page's seven, and #21's keyboard case, which now tabs onto a cover |
| Rows that open nothing | the row's case, and Back with the list open |
| A share's covers pressable | the share's *opens no journal* |
| The keyboard not handed back, in `useJournal` | eight: every door's on the board, the card, the search result, the header's list, the calendar and the note found, and both of the Stats page's, which is the lift out of `BoardPage` shown to be one implementation |
| Every column offered on the Stats page | *offers the columns the board draws* |

### What the plan got wrong, or left out

- ***A lift and a ring on hover and focus, as a card does.*** A card does neither: its name
  underlines on hover. Found by reading `Card.tsx` before the renders.
- ***The rating rows have #21's name to put in the accent, as #12 and #20 do.*** #20's names are in
  the page's ink, and its accent is on the count. Both were rendered.
- ***A move from Stats refetches Stats.*** Every write the drawer makes does now, and every write
  on the board too, which is what fixed the 30 seconds.
- **Where a move lands with no board on screen**, which the plan did not ask, and **which columns
  the heading offers**, which it did not say: the board's, less any taken off in Settings.

### Deployed

**At about 21:46 Eastern on 20 November 2026**, merged as PR #101 and deployed by the runbook in
`docs/deploy.md`, `e2570ab` to `ba8458b`. No migration, no variable and no route, and nothing in
the backend; **the API was recreated all the same, API first**, because the .NET base images had
moved upstream, its layers pulled again and its `apt-get` step run again.

- **The bundle** went `index-Bre0ogh1.js` to `index-Cn1vjcVW.js`, where a local build said
  `index-C-rQQr5z.js`. **The stylesheet** went `index-B-A_kP2W.css` to `index-FmHVnJQO.css`, the
  local build's name.
- **Four script strings each 0 then 1**, by `grep -F`: `stats-cover-`, `-row-`, the cover's class
  string and the row's.
- **The three new rules** found by diffing the two stylesheets' selectors, each 0 then 1:
  `.hover\:outline-2:hover`, `.hover\:outline-offset-2:hover` and `.hover\:outline-accent:hover`.
  None went, and the served stylesheet's selectors are now the local build's exactly.
- **`/api/auth/me` answered `null` (200)** before and after. The API's log, read by its levels,
  had no warn, fail or crit line among 11 `info`, and said *No migrations were applied*.
- **Both timers ran five minutes on**, as a restart re-arms them: *Queued 0 titles for
  HowLongToBeat.* and *Release refresh brought 15 not-yet-released titles up to date.*, waited for
  in the foreground with an until-loop over the API's log, and still no warn, fail or crit line.

---

## 26. The picker, roomier · shipped

**Planned 14 November 2026**, at the user's request. Two adjustments to #16's panel.

**One: where it sits and how wide it is.** *"I want it to be more centred on the screen. Right
now, it's more towards the upper middle of the screen on desktop. I would also like it to bit more
wide cause it feels kinda squished on desktop. You can scale the 'spin the wheel' as well."*
- **Today** (`pick/PickPanel.tsx`): `items-start` with `pt-[8vh] md:pt-[10vh]`, and the panel
  `max-w-md`, 448px. The wheel is `max-w-[300px]` (`pick/Wheel.tsx`).
- **The panel changes height as it is used.** It is 763px after a spin on a phone and shorter
  before one, so centring it with `items-center` would move it upwards when the result row
  arrives, and clip its top once it is taller than the window, which is the flex-centring trap.
  `my-auto` inside a scrolling column keeps it centred while it fits and scrolls when it does not.
- **On a phone**, 390 × 844, the panel after a spin ends 13px above the foot already, so a phone
  is top-anchored whatever a desktop does. The workshop renders both.

**Two: what a length chip says.** *"'Any' has '5' right beside it… I would like it to be a new
line and say '5 games' and '2 games', then the amount of hours underneath."* So a chip reads:

```
Any        A weekend
5 games    2 games
           5–20 h
```

- **Leave out stays as it is**, a genre and its count on one line, by the user's word.
- **The noun is the hobby's**, from the picker's words in `hobbies/games.ts`, singular for one:
  *1 game*. A films board would say *films*.
- **The chips grow a line**, so the second row the renders measured at 46px gets taller, and a
  wider panel may put all five on one row. The workshop says which.
- `PickPanel.test.tsx` finds the chips by a name beginning with the band's label, so they keep
  working; a case for *5 games* and *1 game* is new.

### Decide at pickup

- **How wide.** Render 512, 576 and 640px at 1440 and 1280, with the wheel at 300, 360 and
  400px. Recommended: whichever puts the five length chips on one row without the wheel's covers
  turning into thumbnails.
- **Whether a wide panel lays out in two columns**, the filters beside the wheel, which is the
  shortest panel at 1440 but a second layout to keep. Recommended: one column, wider, unless the
  renders show it still reads as squished.
- **Where it sits.** Recommended: centred from `md` while it fits, top-anchored on a phone.

### Tests first

- A length chip says *5 games* on a line of its own, *1 game* in the singular, and its range
  beneath; a genre chip is unchanged.
- **The layout is CSS alone, so it goes to Playwright**: at 1440 the panel's middle is within a
  few pixels of the window's before and after a spin, and at 390 its top is where it was.

### Decided from the renders

Workshopped on 20 November 2026, the day it was picked up. The real panel behind throwaway
switches in the address (`?pw=`, `?wh=`, `?chip=`, `?at=`), on Vite alone with every `/api/`
request answered in the browser, over the six games #16 read from production on 25 October with
their IGDB covers and a pace of 2 h a day, so the pick's row was at its tallest. Shot at 1440 ×
900, 1280 × 800, 1920 × 1000 and 390 × 844, with each placement's spin recorded. The page is
private: https://claude.ai/artifact/3ZCEk9EKA4NC9nV8k8p99d. **All four picks were the
recommendations.**

| Choice | Picked | Against |
|---|---|---|
| How wide, and the wheel | **576, one column, the wheel 400 from `md`**: five chips on one row with 92px to spare, covers 70px wide and 55 on a full wheel of eight, and *Suggest three*'s rows on one line each. 833px tall after a spin | 512 with a 360 wheel, the narrowest panel that holds the chips on one row; 640 with a 400 wheel, the same panel with 156px empty at the end of the chip row; **two columns at 928**, the filters beside the wheel, 532px tall before and after a spin, where *Suggest three*'s rows wrap in the wheel's 400px column with the left side empty, and below about 960px a third layout |
| Where it sits | **Centred from `md`** while it fits, scrolling as a whole when it does not: `my-auto` in the scrolling column, as planned. When a pick lands the panel grows 122px and its top rises 61px, from 95 to 34 at 1440 × 900; *Suggest three* moves it down 81px | centred on its tallest, room for the pick's row kept under the panel until a pick takes it, so nothing moves, and the panel sits at the top of the window with 155px empty below it before a spin; where it sits today, 10% down |
| The chip | **A: the count on a line of its own, in the `text-muted` it wore beside the label**, each chip as wide as its words: 70, 84, 84, 93 and 87px | B, five of one width filling the row, where at 512 *A few weeks* breaks over two lines; C, the count in the text's own colour, so only the hours are grey |
| On a phone | **16px from the top**, the panel's own `p-4`, in place of `8vh`. It ends at 811 of 844 after a spin, and the wheel stays 300 | a 260 wheel on a phone, ending at 823, with covers 46px wide, smaller than the pick's 48; left at `8vh` to scroll, with *Suggest three* cut in half |

**Found while rendering**, before anything was shown:
- **The plan's phone was wrong.** It said a phone is top-anchored *whatever a desktop does* and
  its top stays where it was. But on a phone the five chips still wrap onto two rows, each now a
  line taller, so the panel grows 32px and **ends 19px below the foot of a 390 × 844 screen**
  after a spin, where today's ends 13px above it. `pick.spec.ts`'s phone case would have gone red.
  Hence the fourth question.
- **The noun needed no new word.** The plan put it among the picker's words, but every hobby
  already says what one of its titles is called by how many, `HobbyDefinition.titleNoun`, which
  the account's warning reads: *game* and *games*, *film* and *films*.
- **A wider panel is not a taller one.** Five chips on one row make it 30px shorter than today's
  at the same wheel, so the 400 wheel's panel, 833px after a spin, **needs a window 865px tall to
  show whole, and today's needs 866**: today's starts 10% down the window. Below that, both scroll.
- **At 300, a full wheel's covers are 41px, smaller than the 48px cover in the pick's own row.**
  At 360 they are 49 and at 400 55. That is what the plan's *turning into thumbnails* came to, and
  `pick.spec.ts` holds it on a desktop. A phone keeps 300, as it was.
- **At 512 even today's chips fit one row**, with 4px to spare. The count on its own line makes a
  chip narrower, not wider.
- **A `**/api/**` route glob catches Vite's own `/src/api/*.ts` modules** and 404s them, so the
  app never boots. The shots matched on `url.pathname.startsWith('/api/')` instead.

### Built, 20 and 21 November 2026

Tests first, on branch `picker-roomier`, after the prototype was saved as a patch and reverted.
- **`PickPanel.tsx`**: `max-w-xl`, `md:my-auto` in a column padded `p-4`, and `Band` in three
  lines, its count from `titleNoun`. **`Wheel.tsx`**: `max-w-[300px] md:max-w-[400px]`. Both
  covers wear `data-cover`, the card's hook, for the measurement below.
- **Shown red first**: a case in `PickPanel.test.tsx` (`['Any 3']` against `['Any', '3 games']`),
  and in `pick.spec.ts` the middle 39px off, a full wheel's cover 42px against the pick's 48, and a
  phone's top at 68. Then 5 of 5 green, and the whole Vitest suite, 1,541 in 67 files, the 1,540
  before and one new. **The full e2e suite went 259 green in 7.4 minutes**, the 257 before and
  two new; the phone case was rewritten rather than added. **In Firefox**, `--browser=firefox`, the
  desktop block and the two specs before it went 4 of 4; the phone case uses `isMobile`, which
  Firefox lacks.
- **Each fault put back**: 448 wide puts the chips on two rows; no `my-auto` is 78.7px off the
  middle; 8% down on a phone is red on its top, and with that line silenced on its foot, 846.8 of
  844; a 300 wheel is red on its covers; the chip's lines side by side wrap the row.
- **Against the picked prototype, by pixel**: identical at 1440 after a spin once the count line
  is written as the prototype's three text nodes (`{count} {noun}`) rather than one string, which
  anti-aliases a few hundred pixels differently. The eight-slice wheel before a spin differs from
  itself between two shots of the same build, which is image decoding, not code.
- **Docs**: `docs/design.md`'s **What should I play next?**, the frame, the chips and the wheel,
  and its row in the table at the top. `docs/board.md` names no size or place, so it is unchanged.
- **Not checked**: a phone in hand. The spin on Jimmy's Android phone is the first thing to try
  after the deploy, and nobody here can measure an iPhone.

### Deployed

**At about 01:32 Eastern on 21 November 2026**, merged as PR #103 and deployed by the runbook in
`docs/deploy.md`, `ba8458b` to `d8c889f`, carrying #102's docs with it. Frontend and docs only: no
migration, no variable and no route. **Caddy alone was recreated**, and the API kept its four hours
of uptime, since no base image had moved. The deploy took 12 seconds.

- **The bundle** went `index-Cn1vjcVW.js` to `index-ZChEd0eh.js`, where a local build said
  `index-B23DdpaV.js`. **The stylesheet** went `index-FmHVnJQO.css` to `index-BFlbkVNI.css`, the
  local build's name, and byte for byte the local build's file.
- **Two script strings 0 then 1**, by `grep -F`: the panel's class string, ending `md:my-auto`,
  and the wheel's, ending `md:max-w-[400px]`. The old offset, `pt-[8vh] md:pt-[10vh]`, 1 then 0.
- **The selector diff** found four rules new and two gone: `.md\:my-auto{`,
  `.md\:max-w-\[400px\]{` and `.max-w-xl{` 0 then 1, and `.pt-\[8vh\]{` and `.md\:pt-\[10vh\]{` 1
  then 0. **The fourth new rule, `.my-auto`, comes from a word in `PickPanel.tsx`'s comment**:
  Tailwind reads source text, and a variant never makes its bare class, since the old stylesheet
  had `.md\:pt-\[10vh\]` and no `.pt-\[10vh\]`. A few harmless bytes.
- **`/api/auth/me` answered `null` (200)** before and after, and the API's log had no line at all
  in the 20 minutes around it.

---

## 27. Settings, rearranged · shipped

**Planned 14 November 2026**, at the user's request, as a workshop first. In the user's words:
*"I want to workshop the 'Settings' menu. For example, have the 'Themes' be in its own section
instead of taking up the top part of Settings. Have the Modal option be default. Come up with new
things to add to Settings."*

**What Settings is today** (`theme/SettingsMenu.tsx`), a 224px panel under the header's button,
top to bottom: **Theme**, nine radios with a hint each (System and the eight themes); **Density**;
**Journal**, Drawer or Modal; **Columns**; **Sharing**; **Your data**, the spreadsheet and deleting
your account. The themes are most of its height, which is the user's point.

**Modal as the default.** `DEFAULT_JOURNAL` in `theme/theme.ts`, **and the pre-paint script in
`index.html`**, which falls back to `drawer` on its own and would otherwise paint a drawer and
switch to a modal after the bundle mounts. **It changes only browsers that never chose**: a
browser that pressed Drawer at some point has `drawer` stored and keeps it. The user's own
browser may be one of those, so after the deploy it is one press. Tests that assume a drawer by
default need saying so.

### Decide at pickup

- **Where the themes go.** Render: a row in Settings, *Theme · Shelf Dark ›*, that opens the list
  in place of the panel with a way back; the same row opening a dialog of swatches, which #28
  would need room in anyway; a tab strip across the top, *Appearance · Board · Data*. Recommended:
  the dialog of swatches, because a name like *Almanac* says less than its colours, and #28 makes
  it the theme's home.
- **The order of the rest**, once the themes leave the top.
- **What to add.** Suggestions, each grounded in something the app already does; the workshop
  shows the whole list and the user picks, per *Show the whole list first*. None of them nudges,
  counts down, or asks for upkeep, per *HobbyTracker is for leisure*:
  - **Your pace**, from "How long will it take me?" (#4), shown and cleared here. Today it is set
    and changed only through the quiz behind a game's estimates.
  - **Collapsed columns** (#29), if they are remembered, listed beside the Columns group.
  - **Which board opens first.** `/board` goes to games today; the boards you use most may not be.
  - **Boards in the header.** Turning off a hobby you never use, so the nav shows the ones you do.
  - **Spin the wheel**: skip the spin and show the pick at once, for somebody without reduced
    motion set on the device. #16 already shows the pick with no spin under reduced motion.
  - **What a card shows**: the last note's line and its picture (#18), the hours, each on or off.
  - **Dates as *Oct 8, 2026* or *8 Oct 2026***, if a day-first form is ever wanted.
  - **Sign out**, if the badge is not where a person looks for it.
  - **Hidden from Discover** (#23), whose list is reached only from the Discover page today.
- **Not offered**: the time zone. It is server-configured by design (**Settled**, *Timezone*), and
  a per-person zone would put the year a pass is in up for grabs.
- **Per browser or per account.** Everything in Settings but Sharing and Your data is per browser
  today, in `localStorage`. Recommended: keep it that way, unless a pick only makes sense across
  devices.

### Things to get right

- **The panel's keyboard**: Escape and a press outside close it and hand the keyboard back, and
  whatever opens from it, a dialog or a second view, follows `useModalPanel` as the share dialog
  does.
- **At 390px** the panel and anything it opens fit the screen.
- **A setting that is not CSS is read from a store the board subscribes to**, as
  `board/hiddenColumns.ts` is, never read once at mount.

### The workshop, 21 November 2026

Two rounds of renders of the shipped app on Vite alone, every `/api/` request answered in the
browser from #24's stage (#19's read of the games board from production on 3 November, 91 titles),
with AppHeader's `SettingsMenu` swapped for a prototype by `resolveId`. Shot at 1440 × 900 and
390 × 844 in Shelf Light and Shelf Dark. Harness, shots and measures in the gitignored
`frontend/workshop.local/settings-rearranged/`. Round one:
https://claude.ai/artifact/JYxLGMEigPJpGcWXRgsMYG. Round two, with the picks drawn together at its
top: https://claude.ai/artifact/RS87HBgvzQFcojLHxc3pWu.

| Choice | Picked | Against |
|---|---|---|
| Where the themes go | **Out of Settings, into a control of their own in the header**, the user's own answer to the three places rendered, *"to prepare for"* #28. Temporary: #28 decides the themes' home | A, a row opening the list in place of the panel (339px); B, the same row opening a dialog of swatches, recommended; C, tabs *Appearance · Board · Data*, which open on the themes |
| Density | **Stays in Settings**, recommended | going with the themes |
| What the theme control opens | **Today's list**, names and hints, in a 224px dropdown of its own, recommended | B's nine swatches |
| The header | **A palette for Theme and a gear for Settings**, the user's pick from round two over the recommended word. Two icons keep a 390 phone's header one 32px row with the title at full size and *Sign out* on one line, 18px to spare | the word *Theme*, which wraps *Sign out* on a phone unless the title drops a size (160 to 133px) and the gaps tighten 4px; the palette beside the word *Settings*, which needs the smaller title; the buttons on a row of their own under the title, 66px; the theme's name, which cannot fit a phone |
| How Settings is laid out | **A dialog**, recommended: *Every board* beside this board's settings from 768px, *Your data* across the foot, one scrolling column on a phone | tabs in the dropdown; one long dropdown, about 1,510px with the seven additions; a page of its own |
| The dialog's controls | **One line each**, recommended: a choice's name and a switch, #24's Day \| Year switch made larger, on a shared 5rem label column; boxes side by side. 698px at 1440, 1,059 on a phone, and 876 with the delete warning open, inside a 900px window | today's headings and rows: 854, 1,529, and 1,032 with the warning, past the window |
| Its width | **768px from 768px**, the user's pick, columns of 351px | 672, the journal modal's, recommended |
| Where Your data goes | **Across the foot, as round one's preview showed it**, the user's pick | under *Every board*, recommended, which balanced the columns and took 123px off |
| The order | **1, appearance first**, recommended: in the dialog, *Every board* (Density, Journal, then the additions) before this board's | 2, this board first; 3, Columns first with Sharing beside Your data |
| What to add | **Seven**: Your pace (recommended), What a card shows, Which board opens first, Boards in the header, Dates as *8 Oct 2026*, Skip the wheel's spin, Hidden from Discover | Collapsed columns (decide at #29), The year the board opens on, Sign out |
| What a card shows | **Two boxes**, the last note (words and picture together) and the hours, per board, recommended | three, the picture apart |
| Which board opens first | **The four built boards**, Games until chosen, recommended | a fifth, *the board I used last* |
| Boards in the header | **Any but the one you're on**, all six with Books and Music, recommended; the board you're on left out of the list with a line saying so, as Columns does Backlog; a board taken off still opens at its address | only the two marked Soon |
| Kept where | **Per browser**, recommended, as every appearance setting is | per account |
| A phone's journal | **Full screen whichever is chosen**, recommended: below 768px the journal is the drawer's full screen; Modal is the default and the setting matters from 768px | Modal everywhere, a 358 × 726 card with 308px for words against the drawer's 349; Modal by default from 768px only, a default that depends on the width |
| The calendar's overflow | **Fixed in this branch, its own commit, tests first**, recommended | planned separately |
| The Journal switch on a phone | **Not drawn below 768px**, recommended: a phone fills the screen whichever is stored, and the stored choice still applies when the same browser is wider | kept with *On a phone the journal fills the screen.* under it; kept as it is |
| A board taken off the header, opened anyway | **The nav names the board you're on, taken off or not**, recommended; the others taken off stay hidden. So opening first on a board taken off, or by its address, still shows where you are | the board that opens first cannot be taken off |
| The time of day with day-first dates | **As today**, recommended: *5 Nov 2026, 3:30 PM*. Only the order of day and month changes, and month headings such as *Jan 2027* do not | 24-hour, *5 Nov 2026, 15:30* |
| Your pace's Clear | **Forgets both**, recommended: how much you play and the figure you play to; the quiz asks both again and Backlog's header line goes | the pace alone |

Asked last, after the picks were drawn together: the user asked for the design to be finished in
this session and **the build handed to another**, which is why the build below has not started.

**Not offered**: the time zone. **Found and not a Settings row**: a column's sort goes back to *My
order* on every reload; if wanted, it is remembered where it is chosen, planned on its own.

**Decided without asking, listed on round two's page for the user to object to.** The dialog is
centred from 768px, as the picker is since #26, and starts 16px down on a phone, where it scrolls;
it closes by the journal's × in its corner, Escape, and a press on the scrim. Its halves are headed
*Every board* and the board's name, *Games*, and a board's setting shows only where the board has
it (the wheel where `picker`, Discover's row where `discover`). The wheel's words are *Spin | Skip
the spin*: *Show the pick at once* wrapped inside its switch at 672. Your pace reads *2 h a day ·
Main story* with Clear, and *From How long will it take me? in a game's journal.* under it; with
none, *Not set* and how to set one. *Hidden from Discover…* sits under a Discover heading with the
count under it, and opens #23's dialog. Share and Hidden shut Settings as they open their own dialog
and hand the keyboard back to the gear.

### Found while rendering

- **The journal as a modal runs 16px off a phone, on main.** The drawer's `w-full` survives into
  the modal, so the box is 390 wide from 16px in, its right edge and *Delete* cut off, below any
  width of 704px (672 and both insets). Nobody meets it, because a phone opens the drawer unless
  Modal is pressed there; Modal as the default would have handed it to every phone. Full screen
  below 768px whichever is chosen retires it.
- **The release calendar is wider than a phone, on main.** Its grid track is 358px at 390, but the
  section is a grid item whose `min-width: auto` is its longest title kept to one line by
  `truncate` — *The Witcher 3: Wild Hunt - Songs of the Past* in the user's calendar on 3 November —
  so it is 390 from 16px in and the page 406 wide. `min-w-0` on the section fixes it. The e2e stub's
  titles are all short, which is why no spec saw it. Playwright's phone zooms out to fit, so every
  phone shot measured 406 × 879 until the fix was stamped.
- **The default journal lives in three places, not two.** The plan named `DEFAULT_JOURNAL` and the
  pre-paint script. The third is `index.css`: `@custom-variant modal` matches only
  `[data-journal='modal']`, so when storage refuses and the script stamps nothing, the CSS answers
  with a drawer. And `useTheme` never applies on mount, so a script left at `drawer` would not
  repaint after mount, as the plan said: the menu would say Modal over a drawer, silently.
- **With the additions, the 224px panel would be about 1,510px**, against today's 1,009 and the
  themes' 276 the user wanted gone. Hence the dialog.
- **Hidden from Discover in Settings reverses #23's pick** of the Discover page alone; the reason
  then, *Your data* under a 900px fold, no longer holds. Ticked knowing it.
- **The workshop's own trap**: Tailwind's `@source` on the whole workshop folder, plus Vite's
  watcher, rebuilt `index.css` on every `measures.json` written between shots, and once reloaded the
  page under a click, which shut the panel and hung the next click. Point `@source` at the
  prototypes' `*.tsx` alone and add the outputs to `server.watch.ignored`.

### The build, in order

Tests first in each, shown red, with each fault put back afterwards. One branch,
`settings-rearranged`, a commit per step.

**Where it stood, for the session that built it.** The branch was made from `e683b9b` and held
nothing but this section's workshop record, uncommitted when the workshop ended; it went in as
docs first. **Built in that session, below.** The picked look is `Round2Proto.tsx` in `frontend/workshop.local/settings-rearranged/`,
behind `?tb=icon&sb=gear&ctl=inline&dw=768&data=foot`: the palette, the gear, the dialog and every
class in it, the theme dropdown, and the gear drawn as eight teeth. It is the reference for values,
and its harness (`vite.config.mjs` on :5191, `harness.mjs`, `stage.mjs`) can shoot the build beside
it for a pixel comparison, as #24 to #26 were checked: a second Vite with no swap, the same stage.
What the prototype does not hold, because nothing stores it yet: the seven settings' stores, and
the Journal switch hidden below 768px. Two traps the workshop paid for: route `/api/` on the
pathname, never a `**/api/**` glob, which 404s Vite's `/src/api/*.ts`; and point Tailwind's
`@source` at the prototypes' files, never at a folder shots are written into.

1. **The calendar's overflow**, its own commit: a stub game with a long title and a phone spec
   holding the page to the screen's width, red, then `min-w-0` on the section.
2. **Modal as the default, and a phone's full screen**: `DEFAULT_JOURNAL`, the pre-paint script's
   fallback and `index.css`'s variant agreeing (an absent attribute is a modal), a theme test that
   the script and the CSS say what `theme.ts` says, the `modal:` box from `md` only, and e2e specs
   that assume a drawer saying so (the red run names them: `reviews.spec.ts`'s drawer cases and
   `theme.spec.ts`'s journal case at least).
3. **The palette and its dropdown**: today's list moved out of `SettingsMenu` into a header control
   of its own, the keyboard as the panel's (Escape and a press outside close it and hand the keyboard
   back). `AppHeader.test.tsx`'s *exactly one SettingsMenu* becomes one of each.
4. **Settings as a dialog behind the gear**: the existing groups moved in, one line each, 768px,
   `useModalPanel`'s keyboard, Sharing and Your data as they work today. Every existing Settings test
   and e2e step that opens the panel follows it.
5. **The seven additions**, each with its store (`lib/preferenceStore.ts`) and its reader, never
   read once at mount: Your pace (a `clearPace` beside `setPace`), What a card shows (the Card reads
   it), Which board opens first (`/`, `/board` and `/search` read it), Boards in the header (the nav
   reads it), Dates (the formatters in `lib/time.ts` and `lib/release.ts` are module-level
   `en-US`; they read the order), Skip the spin (`PickPanel` beside reduced motion), Hidden from
   Discover (the row opens `HiddenDialog`).
6. **The keyboard checked in Firefox as well as Chromium**: the palette's dropdown, the dialog, and
   the dialogs it opens.
7. **Docs**: `docs/design.md` (Settings, the header, the journal's box), `docs/board.md` (columns,
   cards, boards in the header), `docs/journal.md`, CLAUDE.md's Settled rows that name the Settings
   panel, `docs/history.md`, and this section.

### Built, 21 November 2026

The session after the workshop's, tests first in every step, each shown red before it went green, a
commit per step and one per addition, on `settings-rearranged` from `e683b9b`:

| Step | Commit | What it holds |
|---|---|---|
| The workshop record | `a223f24` | This section's tables, committed as docs first |
| 1. The calendar's overflow | `f1493e6` | `min-w-0` on the section. The IGDB stub gained *Lanternfall: Ballad of the Ninefold Drowned Archive*, out in five months with no hype and no ratings, so it is on no Discover list; the phone spec measured the page 456px wide on a 390 screen before the fix |
| 2. Modal as the default, and a phone's full screen | `d59f954` | `DEFAULT_JOURNAL`, exported, is `modal`. `theme.test.ts` runs index.html's pre-paint script for real and reads index.css's variant, now `&:where(:root:not([data-journal='drawer']) *)`. The card is `md:` only, and its 672 stops at `3xl`, where the 768 starts. Four specs that measured a drawer say so through `journalOpensIn` in `e2e/support/board.ts` |
| 3. The palette | `2f83c27` | `theme/ThemeMenu.tsx`, the old list moved, behind a palette 34 × 26. `AppHeader.test.tsx` pins one of each |
| 4. Settings as a dialog | `0242a6f` | The prototype's markup, class for class. The spreadsheet and the delete are held by the gear; `SharingRow` takes its own ids and lost the panel's rule. `e2e/settings.spec.ts` |
| 5. Your pace | `64c6708` | `clearPace` in `lib/pace.ts`; the group where `journal.setHltbId` says the board has HowLongToBeat's figures |
| 5. What a card shows | `0414efc` | `board/cardShows.ts`; `CardFace`'s required `shows` |
| 5. Which board opens first | `7d510a8` | `shell/openingBoard.ts`; `ToOpeningBoard` in `App.tsx` for `/`, `/board` and `/search` |
| 5. Boards in the header | `93c316e` | `shell/headerBoards.ts`; the nav always names the board you're on |
| 5. Dates | `9c5ba1e` | `DATE_ORDERS` and the order in `lib/time.ts`, read by `formatJournalDate`, `formatJournalDateTime`, `formatDayShort` and `formatRelease`'s day; `App` subscribes |
| 5. Skip the spin | `5200caf` | `pick/wheelSpin.ts`, per board; `PickPanel` is still under it as under reduced motion |
| 5. Hidden from Discover | `e9dad01` | A row under a Discover heading opening #23's dialog in Settings' place; `forgetHidden`, shared with the Discover page; `useModalPanel` focusing without scrolling |
| A spec's race | `37281e9` | `journal.spec.ts`'s Escape after reopening waits for the journal; see below |
| 7. Docs | this commit | `docs/design.md`, `docs/board.md`, `docs/journal.md`, `docs/data-model.md`, `docs/games-igdb.md`, `docs/history.md`, CLAUDE.md and this section |

**Decided at the build, for the user to object to**, none of it drawn at the workshop:

- **Your pace shows only where the board has HowLongToBeat's figures** (`journal.setHltbId`), the
  rule the workshop stated for the wheel and Discover's row. The words say *a game's journal* from
  `titleNoun(1)`, and Clear shows while either answer is said.
- **Clear puts the keyboard on the line**, which then says *Not set*: its button goes with the
  pace, and the keyboard would have fallen out of the dialog onto the board.
- **A share draws every card whole**, whatever this browser leaves off its own: the server never
  knows the owner's choice, and a visitor's is about their own board. The drag preview follows the
  board's cards.
- **Skip the spin is per board**, as it sits under the board's heading where the board has a picker.
- **The modal's 672 card stops at 1920**, where the 768 card starts, so the two never compete:
  `md:modal:max-w-2xl` sorted after `3xl:modal:max-w-3xl` in the built stylesheet and kept the modal
  672 at 1920. Measured at 700, 800, 1440, 1536 and 1920 after: every width from 768 is main's
  modal, and below it the modal is the drawer's box.
- **`useModalPanel` moves the keyboard in with `preventScroll`.** With the seven additions the dialog
  is taller than a phone, and focusing it scrolled its column, so it started at the top of the
  screen rather than 16px under it, as picked.
- **Settings' tests answer the list of hides**, through `hiddenServer` in `src/test/games.ts`, and
  `boardServer` answers it with none, as it answers the share; no request in the suite goes
  unanswered.

### Tests

**The full e2e suite went 269 green** with the seven additions in, the 259 before and 10 new, after
one blink of the e2e Vite server (`ERR_CONNECTION_REFUSED` on a reload, while scripts were being
written into `workshop.local/`), green when run again. **Vitest went 1,601 green**, from 1,541.
**In Playwright's Firefox**, `settings.spec.ts` whole (the dialog's keyboard, its × and scrim, both
dialogs it opens, its place at 1440 and on a phone) and the palette's keyboard case in
`theme.spec.ts`, 7 of 7, and `how-long.spec.ts` (Clear's keyboard) and `account.spec.ts` (the
warning in the dialog), 6 of 6.

- **The calendar**: `layout.spec.ts`'s phone page held to the screen with the long title on it.
- **The default journal**: `theme.test.ts` runs the pre-paint script in jsdom with nothing stored,
  an unknown value and each choice, and matches the variant against the root with no attribute,
  `modal` and `drawer`; `layout.spec.ts` holds a phone's journal to the screen as a modal and as a
  drawer.
- **The palette**: `ThemeMenu.test.tsx`, seven cases, and `theme.spec.ts`'s keyboard case.
- **The dialog**: `SettingsMenu.test.tsx`'s gear, the dialog taking the keyboard, Tab kept in,
  Escape, × and scrim handing it back, the halves in order, no Journal switch on a phone, Share and
  Hidden shutting Settings and handing the keyboard back; `settings.spec.ts`'s six.
- **The seven additions**: each store's own file (`cardShows.test.ts`, `openingBoard.test.ts`,
  `headerBoards.test.ts`, `pace.test.ts`'s Clear, `time.test.ts`'s order), each reader hearing it
  without a reload (`BoardPage.test.tsx`'s note, `AppHeader.test.tsx`'s nav, `App.test.tsx`'s dates
  and redirects, `PickPanel.test.tsx`'s spin), a share ignoring the card's parts, and Clear reaching
  Backlog's line in `how-long.spec.ts`.
- **Measured against the picked prototype**, pixel for pixel, by the gitignored
  `workshop.local/settings-rearranged/compare-built.mjs`: the header, the palette's dropdown and the
  dialog differ by no pixel in 12 states, and the phone's dialog by the Journal row alone; see
  **Settings and the palette** in `docs/design.md`.

### Checked by putting each fault back

One at a time against the finished build, by the gitignored
`workshop.local/settings-rearranged/faults.mjs`, #25's script with a Playwright runner beside the
Vitest one, which restores each file after its run. **All 29 turned red exactly the cases named.**

| Fault | What goes red |
|---|---|
| The calendar a grid item of its least width again | *keeps the page to the screen’s width with a long title on the calendar* |
| The pre-paint script's fallback a drawer again | *is what the pre-paint script stamps when nothing is stored* |
| The variant matching only `data-journal='modal'` again | *is what the stylesheet draws when the root says nothing* |
| The modal's card at every width again | *fills the screen with the journal, chosen as a modal* |
| No palette in the header | both of `AppHeader.test.tsx`'s |
| The palette's Escape handing nothing back | its unit case, and `theme.spec.ts`'s keyboard case |
| Settings without `useModalPanel` | four: the keyboard following it in, Tab kept in, Escape, and the delete still going when it is opened again; and `settings.spec.ts`'s keyboard case |
| The Journal switch drawn on a phone | *draws no Journal switch on a phone* |
| The root without the ground | *paints the theme’s ground on the root, not only on the board* |
| Settings 672 wide | *is 768 wide, in the middle of the window* |
| `useModalPanel` focusing with the scroll | the phone's *16px in from either edge and from the top* |
| Clear keeping the style | the store's Clear and Settings' |
| Clear leaving the keyboard to fall | Settings' Clear |
| Your pace on every board | *is only where a board has HowLongToBeat’s figures* |
| A card reading what it shows once, at mount | the board's note case, and the store's every-reader case |
| A share's cards following this browser's | *draws each card whole* |
| What a card shows kept as what is shown | three of the store's four |
| `/search` to the games board whatever is chosen | *is where /search lands* |
| The board that opens first trusting storage | *never opens a board nobody has built* |
| The nav leaving off the board you're on | *names the board you are on, taken off or not* |
| Settings offering the board you're on for the header | its list case |
| `App` not hearing the order of dates | *writes every date on the board day first the moment Settings says so* |
| Day first rebuilt from `formatToParts`' spaces | *keeps the time of day as it was* |
| A short day ignoring the order | `formatDayShort`'s day-first case |
| The picker not skipping the spin | *shows the pick at once when Settings says to skip the spin* |
| Settings' Show again leaving the cache | the list's case |
| The list of hides handing nothing back | the list's case |

### What the plan got wrong, or left out

- **A fourth spec assumed a drawer.** The plan named `reviews.spec.ts`'s two and `theme.spec.ts`'s
  journal case. The red run added `hltb.spec.ts`'s turning arrow: a modal centres itself, so it
  moved 12px as a whole when Steam's row arrived after the first measure, with nothing on the
  arrow's row moving at all.
- **`md:modal:` alone lost the 768 card at 1920**, as above: Tailwind sorted the `3xl:modal:` rule
  before every `md:modal:` one.
- **jsdom cannot match a `:not()` inside a `:where()`**, so `theme.test.ts` reads the variant as the
  descendant selector it means; and **V8's `format()` and `formatToParts()` disagree about the space
  before *PM***, so day-first dates cut the time of day from `format()`. Both in the area files.
- **A modal default made a race in `journal.spec.ts` likelier.** Its click-away case pressed Escape
  4ms after the click that reopened the journal, before React had mounted it: 5 of 32 lone runs
  failed so with a modal and none of 24 with a drawer. It waits for the journal now; 16 of 16 since.
  The click-away half CLAUDE.md records as intermittent is untouched.
- **The prototype names a choice's group by an id with the choice's name in it**, and *Opens on*
  has a space, which `aria-labelledby` reads as two ids, so that group had no name there. The build
  gives each its own `useId`.
- **The prototype drew Books and Music unticked under Boards in the header**, a staged look. The
  build starts with every board named, as the nav does today, and the comparison gave the build the
  same two taken off.
- **#26 has no entry in `docs/history.md`**, found while writing #27's. Left for the user to say.

### Deployed

**At about 18:24 Eastern on 21 November 2026**, merged as PR #105 and deployed by the runbook in
`docs/deploy.md`, `d8c889f` to `76172b4`, carrying #104's docs with it. Frontend and docs only: no
migration, no variable and no route. **Caddy alone was recreated**, and the API kept its 21 hours
of uptime, since no base image had moved.

- **The bundle** went `index-ZChEd0eh.js` to `index-Co5mM0L7.js`, where a local build said
  `index-C5COHLl7.js`. **The stylesheet** went `index-BFlbkVNI.css` to `index-DT1iVaz_.css`, the
  local build's name, and byte for byte the local build's file.
- **Thirteen script strings 0 then 1**, by `grep -F`: the five new storage keys
  (`hobbytracker.opens-on`, `.header-boards`, `.card.`, `.wheel.`, `.dates`), *Skip the spin*,
  *Boards in the header*, *Every board*, *Hidden from Discover…*, *Opens on*, *Not set*, a choice's
  row class string, and `md:max-3xl:modal:max-w-2xl`. The journal's old box,
  `shadow-xl outline-none 2xl:max-w-lg modal:inset-4`, 1 then 0.
- **The page itself** changed too: the pre-paint script's fallback in the served `index.html`,
  `journal === 'drawer' ? 'drawer' : 'modal'` 0 then 1 and the old `'modal' ? 'modal' : 'drawer'` 1
  then 0.
- **The selector diff** found 16 rules new and 11 gone: the modal variant's rules changed shape,
  `[data-journal=drawer]` 0 then 9 and `[data-journal=modal]` 9 then 0, and the dialog's grid
  (`.grid-cols-\[5rem_minmax\(0\,1fr\)\]{`), its 768 width (`.md\:max-w-3xl{`), its gaps, `.my-4{` and
  the icons' `.size-4{` came in, where the panel's `.my-2{` and `.pb-0\.5{` went.
- **`/api/auth/me` answered `null` (200)** before and after, Caddy's log had no error, and the API's
  had no line at all in the 20 minutes around it.

**A browser that pressed Drawer at some point keeps it**, so a browser that has had the journal as
a drawer may need one press in Settings for the modal.

---

## 28. A theme of your own · shipped

**Planned 14 November 2026**, at the user's request: *"maybe have the users to be able to create
their own theme."* A workshop first, and **after #27**, since #27 decides where themes live.

**What a theme is today.** One block of custom properties in `src/index.css`, **20 tokens and
`color-scheme`** in each of the eight (surface, sunken, hover, line, line-soft, fg, muted, accent,
danger, ok, drop, dropped, scrim, well, rating-low, rating-mid, rating-high, danger-fg,
card-shadow, card-line), turned into utilities by `@theme inline`. **A new theme has three lists to
join** (`docs/design.md`): `THEMES` in `theme/theme.ts`, the pre-paint script's colours in
`index.html`, and the contrast test, which asserts every theme's pairs. The genre stripes,
HowLongToBeat's chip and the sign-in marks are the same in every theme. **The rating colours are
not**, which this paragraph said they were until the workshop measured them: `rating-low`,
`rating-mid` and `rating-high` differ in all eight, so a theme of your own needs them worked out.

### Decide at pickup

- **How much a person picks.** Twenty tokens is a lot to hand somebody. Render: start from one of
  the eight and change only **the ground, the surface and the accent**, deriving the rest; the
  same plus the text colour; every token, as an advanced view. Recommended: the first.
- **What happens to a pair that cannot be read.** The contrast test guards the eight; a theme made
  in the browser has no test. Render: a warning beside the colour naming what fails, the save still
  allowed; the save refused until it passes; the colour nudged until it passes. Recommended: the
  warning, since it is your own screen.
- **How many.** One theme of your own, or several by name.
- **Kept where.** Per browser, as every appearance setting is, recommended; or per account, which
  is a table and a route, and the first appearance setting to follow you between devices.
- **Shared by link?** Recommended not: a share is read in the visitor's own theme today.

### Things to get right

- **No flash on load.** The pre-paint script has to read the custom colours from storage and
  stamp them before the bundle loads, or a custom theme is the one that repaints after mount,
  which is the trap **What fails silently** names for a new theme.
- **A theme is CSS custom properties set on the root at run time**, never class names built from a
  value: Tailwind scans source text, and an interpolated class paints nothing.
- **Storage may refuse** (`lib/storage.ts`), and the app falls back to the theme it started from.
- **The colour inputs** differ between Firefox and Chromium; check both, per *Jimmy uses Firefox*.
- **Leaving your own theme takes every inline value off the root**, System included. The values sit
  over the base's block, where they outrank any selector, so one left behind paints over the theme
  chosen next, with no error.
- **`THEMES` stays the eight and System.** The contrast test's palettes and the pre-paint test's
  grounds are derived from it, and a theme of your own has no block for either to find.

### Measured before round one, 21 November 2026

Scripts and outputs in the gitignored `frontend/workshop.local/theme-of-your-own/`; `measure.mjs`
writes `measures-round1.json`.

- **20 tokens and `color-scheme` a block**, in all eight.
- **How many follow from a ground, a card and an accent.** `derive.mjs` works out each token a
  person does not set from the theme it is made from. A colour between two others stays as far
  between them: the well from the card to the ground; hover, both lines and Dropped's grey from the
  card to the text; the drop tint from the well to the accent. A colour that is read keeps its hue
  and chroma and has its lightness solved until it reads on the new card as it read on the old: the
  text, unset, in the ground's hue; muted, danger, ok, the three ratings; the delete chip's label on
  its fill. The scrim and the shadow follow light or dark, and the outline is the base's. **Each of
  the eight was made from each of the other seven with its own three colours**, 56 themes, and every
  token measured against the real one in OKLab ΔE×100, where about 2 is the least two patches side
  by side show. Within a register, the well and hover land a median 0.5–1.3 off (worst 3.1); both
  lines, muted and the drop tint 1.5–2.5 (worst 6.8); danger, ok, the ratings, the chip's label and
  Dropped's grey 1.2–4.2 (worst 16.5); and **the text 4.1, worst 12.2**, the most a matter of taste,
  Almanac's brown ink. Every worst case is Dusk and Blood Red made from each other, or Almanac's
  own taste carried to another paper theme: its brown ink, and its green drop tint at 3.7. Across
  registers, a light theme made dark or the reverse, the worst reach 20–25: the text, ok, the two
  upper ratings, the chip's label and Dropped's grey. Nothing changed gives each theme back exactly,
  and 2 of the 952 checks the 56 make fall under a bar: muted on the ground at 4.43 when Almanac is
  made from Dusk, and the accent under the pointer at 4.40 when Ember is made from Shelf Light.
- **What a warning has to check.** `index.css.test.ts`'s 17 pairs a palette, 153 cases over nine
  palettes, where `docs/design.md` still says ninety-nine and eleven: the text, the quiet text, the
  accent, danger and the three ratings on the card; the quiet text on the well and the ground; the
  accent on the well, the ground and the hover fill; the delete chip's label on its fill; the text
  and the quiet text on the delete warning's tint; the text on a found word's mark; and the mark off
  the card. Every bar is 4.5:1 but the mark's 1.4. The tightest today are Dusk's: the accent under
  the pointer 4.58, a low rating 4.59, the quiet text on the warning 4.58. Beside them,
  `palette.test.ts`'s floor: every genre stripe 1.48:1 off every card. **Not HowLongToBeat's chip**,
  which the test holds only at the lightest and darkest cards, because no mid-tone can give it 3:1.
- **Stamped before the bundle.** `prepaint-proto.js`, built for production by `vite.prepaint.mjs`
  and loaded with the bundle blocked by `prepaint-probe.mjs`, in Chromium and Firefox. The script
  grows from 35 lines to 66 and reads a second key, `hobbytracker.theme.mine`, 533 bytes: the base's
  slug, light or dark, and the 20 values, worked out by the bundle when the theme is kept, so the
  script only copies. It stamps the base's `data-theme`, so its block answers anything not kept;
  sets each value inline on the root, where it outranks the block; sets `color-scheme`; and writes
  the bar above the page from the kept ground. **Both engines painted the page and the bar in the
  kept ground with no bundle.** A record that is not JSON, a base that no longer exists and storage
  refusing each fell back to System with no error, and a value that is not a colour was skipped for
  the base's own. Per account would not have spared the copy: the script cannot ask the server
  before the first paint.

### The workshop, 21 November 2026

Round one in words with ASCII previews, every token shown under each option. Round two in renders of
the shipped app on Vite alone: AppHeader's `ThemeMenu` swapped for `ThemeMenuProto.tsx` by
`resolveId`, index.html's script for `prepaint-proto.js` by `transformIndexHtml`, and every `/api/`
request answered from #27's stage, #19's read of the games board from production on 3 November, 91
titles. Shot at 1440 × 900 and 390 × 844 in Chromium, and the controls and two whole pages in
Playwright's Firefox, with four themes of your own: Rose from Shelf Light and Forest from Shelf
Dark, which read; Harbour from Dusk, whose accent cannot; and Fog from Frost, where six pairs and
ten genre stripes fail. Harness, shots and measures in `frontend/workshop.local/theme-of-your-own/`.
The page, with the picks at its top: https://claude.ai/artifact/RFr2d1fQbbP22ZvYZq457t. **All
thirteen picks were the recommendation.**

| Choice | Picked | Against |
|---|---|---|
| How much a person sets | **The ground, the card and the accent, made from one of the eight**; the other 17 worked out as that theme works them out | the same and the text; every token, as an advanced view |
| A pair that cannot be read | **A warning beside the colour, naming what fails, and the theme can still be kept**: it is your own screen | the keep refused until it reads; the colour nudged until it reads |
| How many | **One**, beside the eight, started again from any of them | several, by name |
| Kept where | **Per browser**, as every appearance setting is | per browser with a line to copy; per account, a table and a route, and a flash on a device that has not seen it yet |
| Shared by link | **No**: a visitor reads a share in their own theme | the owner's colours on the share's row |
| Where the list lives | **The palette's dropdown, your own as a tenth choice** and *Edit…* under it, which settles #27's *temporary* | the same with a swatch before each name; a dialog of swatches, #27's recommendation |
| Where it is made | **A panel beside the board with no scrim**, the journal drawer's box, the board repainting as you pick; a sheet on a phone | a dialog with a sample in it; a group in Settings; a page of its own |
| A colour's control | **The browser's swatch and a hex box** beside it, which takes a typed or pasted colour the same whatever a browser's picker does | the swatch alone; the eight's own colours for that part, then the swatch, which takes a phone's rows from 174px to 270 |
| Where a warning is said | **Under the colour it answers to**, a tinted line: *Hard to read: … Text needs 4.5:1.* | one list above the buttons; a mark on the colour and the list |
| Besides the colours | **A strip, *Not on the board***: a delete button, the three ratings, a found word, danger's text and the delete warning; 96px, 124 on a phone | nothing |
| The phone's sheet | **Half the screen**, 422px on a 390 × 844 phone: the switcher and a card's top stay in view, and the sheet scrolls under Cancel and Keep | three quarters, up to 633px, with no card in view |
| Its name in the list | ***Your own · From Shelf Dark***, one 28px line with every base; *Make your own…* under a rule before there is one, *Edit…* after | *Your own · Made from …*, which wraps the name, 48px; *Mine*; *Custom* |
| Changing *Made from* | **Keeps your three colours** and works the other 17 out the new theme's way; *Start again from Dusk's colours* puts the theme's own back | starting again from that theme's colours, which a closed select arrowed through in Chrome on Windows would do at every key |

**Decided without asking, listed on the page for the user to object to.** The first time, *Made
from* is the theme you wear, or for System the one it is showing, with its three colours in the
boxes, so nothing changes until you pick. Cancel, × and Escape put back what you wore; Keep makes
your own the theme and hands the keyboard back to the palette. A press on the board does nothing
while the panel is open, since with no scrim nothing says whether it would keep or cancel. The bar
above the page follows your ground as you pick. Choosing another theme keeps yours to choose again.
A text pair's line says *Hard to read*, and the mark's and the stripes' *Hard to see*, each with its
own floor, ratios to two places. HowLongToBeat's chip is not checked.

### Found while rendering

- **The first sheet hid Keep.** At half a phone's screen the panel's content scrolled Cancel and
  Keep below the fold, and pinned with `bottom-0` they sat 16px above the foot with the content
  showing under them: a sticky child of a padded scroll box needs a negative `bottom` as deep as the
  padding, `-bottom-4` and `md:-bottom-5`, with negative margins to match.
- **`Your own` beside `Made from Shelf Dark` wraps at 224px**, the name onto two lines (48px), and
  `Custom` wraps its hint (43). *From Shelf Dark* fits every base on one 28px line, Shelf Light the
  longest.
- **A dark card's swatch nearly vanishes on the panel**, because it is the card's colour drawn on
  the card. The hex box beside it names it.
- **Round one's preview was wrong about its own example**: it said the accent `#4a6b9e` read 2.9:1
  on `#2b3b31` and 3.4:1 on `#1d2a23`; measured, 2.19 and 2.76. An illustrative number is measured
  too.
- **A live repaint costs about 4 ms.** The 21 values set on the root and a style and layout pass
  forced, 30 times over on the 719-element board: a median of 3.5 ms in Chromium and 4 in Firefox,
  the worst 8.3. A frame is 16.7.
- **Headless browsers open no colour picker**, in either engine: a click focuses the input and
  nothing opens, and a scripted fill fires `input` and `change`. The open picker can be measured
  only in a person's own browser, so the harness's server has `/workshop-probe`, which counts the
  `input` events a picker sends while open and posts them back. **It was offered and not run**, so
  whether Firefox on Windows repaints the board as you drag, or only on OK, is unmeasured. The hex
  box works either way. Closed, the swatch is 48 × 32 in both engines and draws nearly the same.

### The build, in order

Tests first in each, shown red, with each fault put back afterwards. One branch,
`theme-of-your-own`, a commit per step.

1. **The pairs as one list.** `index.css.test.ts`'s 17 pairs move into `src/theme/` as a list with
   each pair's words, its bar and the colour it answers to (the accent's pairs to the accent, the
   two on the ground to the ground, the rest to the card), and the test iterates it, so the test
   and the warning read one list. The stripe floor beside it, which `palette.test.ts` reads.
2. **The arithmetic and the derivation**, `src/theme/colour.ts` and `derive.ts` from
   `colour.mjs` and `derive.mjs`: hex to OKLab and back, WCAG contrast, the lightness solve, and
   `derive(base, picks)`. Nothing changed gives each of the eight back exactly; the card decides
   light or dark at a luminance of 0.179, where black and white text read alike; every value is
   `#rrggbb`, `transparent` or the scrim's and the shadow's own shape; and the 56 made themes are
   the measure of what is worked out.
3. **Kept, and stamped before the bundle.** `MINE_KEY` beside `THEME_KEY`, a reader that validates,
   and `applyTheme` stamping the base, the values inline, `color-scheme` and the bar, and taking
   every inline value off when another theme is chosen. The pre-paint script's addition as
   `prepaint-proto.js` has it, held by `theme.test.ts` running it for real in jsdom (a kept theme, a
   record that is not JSON, a base that is gone, a value that is not a colour, storage refusing) and
   by `theme.spec.ts` with the bundle blocked, the bar included.
4. **The palette's list**: *Your own · From …* as a tenth radio once there is one, and *Make your
   own…* or *Edit…* under a rule, in the accent. `ThemeMenu.test.tsx`.
5. **The panel**: the prototype's markup class for class, `useModalPanel`, the inert transparent
   backdrop, *Made from* keeping the three, *Start again*, the swatch and a hex box that commits only
   `#rrggbb`, a warning under the colour each pair answers to, the strip, Cancel, × and Escape
   putting back what was worn (a kept theme of your own included), and Keep. Vitest for its rules;
   e2e for the live repaint (a card's background following a hex typed), the phone's sheet (half the
   screen, Keep in view) and the keyboard.
6. **Firefox**: the keyboard and the live repaint with `--browser=firefox`, and the probe in the
   user's own Firefox for the open picker.
7. **Docs**: `docs/design.md` (a theme of your own under **How a theme works**, the inline values and
   the second key under **The things that fail quietly**, the contrast count corrected to 153 and
   17), CLAUDE.md's Settled and What exists rows, `docs/history.md`, and this section.

### Where it stood, for the session that built it

The branch `theme-of-your-own` was made from `ea3db14` and held
nothing but this section's workshop record and its status row, **uncommitted when the workshop
ended**; they went in as docs first. The picked look is the prototype in
`frontend/workshop.local/theme-of-your-own/`, whose defaults are the picks: `ThemeMenuProto.tsx`
(the list), `ThemePanelProto.tsx` (the panel and the sheet), `mine.ts` (keeping and stamping),
`derive.mjs`, `colour.mjs` and `checks.mjs` (the arithmetic and the pairs), and
`prepaint-proto.js` (the script). It is the reference for values, and its harness
(`vite.config.mjs` on :5194, `harness.mjs`, `shoot.mjs`) can shoot the build beside it for a pixel
comparison, as #24 to #27 were checked: a second Vite with no swap, the same stage. Two traps beside
#27's: the transform that adds the prototypes as Tailwind sources must skip `index.css?raw`, which
the prototype imports to read the palettes; and the comparison's server swaps nothing, because the
build's own `ThemeMenu` draws the list. **The probe** runs from `frontend/` with
`npx vite --config workshop.local/theme-of-your-own/vite.config.mjs --port 5194`, then
http://localhost:5194/workshop-probe in Firefox; it writes `probe-<engine>-<time>.json` beside
itself.

### Built, 21 and 22 November 2026

The session after the workshop's, tests first in every step, each shown red before it went green,
a commit per step, on `theme-of-your-own` from `ea3db14`:

| Step | Commit | What it holds |
|---|---|---|
| The workshop record | `6b9f661` | This section's tables and the status row, committed as docs first |
| 1. The pairs as one list | `dd56cf3` | `PAIRS` in `theme/pairs.ts`: seventeen, each with its words, its bar, whether it is read or seen, and the colour it answers to. `index.css.test.ts` iterates it, 153 cases as before, and the mark is still read out of `MATCH_MARK`. `STRIPE_FLOOR` beside it, which `palette.test.ts` reads. `pairs.test.ts` pins the count |
| 2. The arithmetic and the derivation | `a7c2e26` | `theme/colour.ts` and `theme/derive.ts`, ported operation for operation; `theme/palettes.ts`, the eight and the stripes read out of `index.css?raw`; `measure` and `faintStripes` in `pairs.ts`; `TOKENS`, `Palette` and `Picks` in `theme.ts`. `vite.config.ts` lets that one stylesheet through to Vitest, and `tsconfig.json` takes `vite/client`'s types |
| 3. Kept, and stamped before the bundle | `2e3ecd2` | `MINE_KEY`, `readMine`, `storeMine` and `applyMine` in `theme.ts`, and `applyTheme` taking every inline value off first; the pre-paint script's addition, its value rule tightened. `theme.test.ts` runs the script beside the reader; `theme.spec.ts` blocks the bundle |
| 4. The palette's list | `732546a` | *Your own · From …* as a tenth radio once there is one; *Make your own…* or *Edit…* under a rule, in the accent |
| 5. The panel | `150ebd1` | `theme/ThemePanel.tsx`, loaded when first asked for; `keepMine` and `putBack` in `useTheme`; `windowOfWidth` answers the device's colour scheme |
| 6. Firefox | `ee08563` | `theme.spec.ts` whole in Firefox; the live repaint drives the swatch as well as the box |
| 7. Docs | this commit | `docs/design.md`, `docs/history.md`, CLAUDE.md and this section |

**Decided at the build, for the user to object to**, none of it drawn at the workshop:

- **The eight's values come from `index.css?raw`**, as the prototype read them, in a module only the
  panel needs, so **the panel is loaded when it is first asked for**: the production build puts it,
  the arithmetic and the stylesheet's text in a chunk of their own, 18 KB gzipped, and the main
  bundle carries none of it. Read back from the page's computed styles instead, a production
  build's minified values (`#0009` for `rgb(0 0 0 / 0.6)`) would reach a derivation the e2e suite,
  on the development server, never sees; copied into a module, the values would be a fifth list for
  a new theme to join.
- **The kept record is the base, light or dark, and the twenty values**, as the measures above say;
  the prototype kept the three picks as well, which are the twenty's own `--sunken`, `--surface`
  and `--accent`, so they are not kept twice.
- **The pre-paint script's value rule is tightened** to `#rrggbb`, `transparent`, or digits, spaces,
  `.,/()` and the letters of `rgb` and `px`, which is every shape `derive.ts` writes; the
  prototype's `[0-9a-z .,()/]+` let any lowercase word through, `notacolour` included. `readMine`
  keeps the same rule, and `theme.test.ts` holds the two together on one record.
- **Edit… opens on the theme you kept, whatever you are wearing.** The prototype, with a theme of
  your own kept and Ember chosen, would have opened on Ember's colours; *Edit…* says otherwise.
  Cancel puts Ember back.
- **The choice is stored only if the theme was.** With storage refusing at Keep, this page wears the
  theme for the rest of the visit and the next load is on the theme the visit started from, which
  is what *Things to get right* asked.
- **The panel going with neither Keep nor Cancel puts back what was worn**: Back from a board takes
  the header with it, and a theme nobody kept would otherwise stay on the root until a reload.
- **A stripe is named as a card prints its genre**, from the first built board that paints it:
  *Role-playing (RPG)*, where the prototype's token-derived name would have said *Rpg*. The two the
  renders showed, Horror and Puzzle, read the same either way.
- **A warning describes both of its colour's controls** to a screen reader, the swatch and the box.
- **The corner's × is named Cancel**, as the prototype names it, where the app's other dialogs name
  theirs Close: here it does what the footer's Cancel does.
- **On a phone the column switcher stays pressable above the transparent layer**, z-15 over z-10, as
  in the prototype: a press there changes which column shows above the sheet, and neither keeps nor
  cancels, which is the reason a press on the page does nothing.

### Tests

**The full e2e suite went 275 green**, the 269 before and 6 new, in 8.2 minutes. **Vitest went
1,674 green**, from 1,601. **In Playwright's Firefox**, `theme.spec.ts` whole went 13 green with
the phone's case skipped, as Firefox has no phone to emulate.

- **The pairs**: `pairs.test.ts`, the seventeen each once, their bars, the colour each answers to,
  the mark read from the class it wears, the words; and the measure of a theme against them, with
  Harbour's and Fog's failures at the ratios the renders printed, and the stripes faintest first.
- **The arithmetic and the derivation**: `colour.test.ts` against WCAG's and Ottosson's figures;
  `palettes.test.ts`, the eight read as the tests read them, twenty tokens in order, either line
  ending; `derive.test.ts`, the eight given back exactly, light or dark at 0.179, each register's
  scrim and shadow, every value's shape, the four rendered themes value for value, the 56 within
  the workshop's medians and worsts, and no more than two of their 952 pairs under a bar.
- **Kept and stamped**: `theme.test.ts`'s sixteen new cases, the reader's, the wearing's and the
  pre-paint script's run in jsdom; `theme.spec.ts`'s two, a kept theme with the bundle blocked and
  leaving it for Ember.
- **The list**: `ThemeMenu.test.tsx`'s five new cases.
- **The panel**: `ThemePanel.test.tsx`, twenty-three cases through the palette's list as a person
  goes; `theme.spec.ts`'s four, the live repaint with the bar and the swatch, a press on the board,
  the keyboard in and out, and the phone's sheet at 422 of 844 with Keep in view.
- **Measured against the picked prototype**, pixel for pixel, by the gitignored
  `workshop.local/theme-of-your-own/compare-built.mjs`: the list by no pixel in 8 states, and the
  panel by no pixel in 14, the first time and by *Edit…*, once each page's selects were laid out
  afresh; see **A theme of your own** in `docs/design.md`.

### Checked by putting each fault back

One at a time, by the gitignored `workshop.local/theme-of-your-own/faults.mjs`, #27's script grown a
step at a time, with a Firefox runner beside the Chromium one, restoring each file after its run.
**All 54 turned red exactly the cases named.** Each step's ran as the step went green; then the whole
table again against the finished build, which **Claude Code stopped for low memory after 35**,
steps 1 to 4 whole and step 5's first, all 35 red again. The other 19, step 5's other sixteen and
step 6's three, had run red in their own steps against `src/` as it stands: nothing in it changed
after step 5's faults ran, and step 6's ran after its own change. The stopped run left step 5's
second fault planted in `ThemePanel.tsx` with its backup beside it; it was put back from the
backup, which was the committed file byte for byte.

| Step | Fault | What goes red |
|---|---|---|
| 1 | A pair answering to the wrong colour | *answer each pair to the colour a person would change first* |
| 1 | A pair taken out of the list | the count of seventeen, the eight's measure and Harbour's list |
| 1 | Dusk's quiet text at `#b4bfcc`, too faint on the delete warning | *quiet text on the delete warning clears 4.5:1*, on Dusk |
| 1 | The mark painted with the drop tint | *the mark round a word found clears 1.4:1* on all nine, and three of the pairs' cases |
| 1 | A stripe under the floor, Arcade at `oklch(0.48 0.2 340)` | the games palette's *as visible as the faintest one that ships* |
| 2 | Nothing changed worked out anyway, rather than given back | *is the theme it was made from, exactly* |
| 2 | Light or dark decided at half the luminance | *is light or dark by its card* |
| 2 | A dark card keeping a paper base's scrim | *takes the scrim and the card's shadow from its own register* |
| 2 | The text solved on the old card rather than the new | the four rendered themes, and the 952 pairs |
| 2 | A colour between two others losing its lean off the line | the four rendered themes, and the 56's medians and worsts |
| 2 | A scrim written as `rgba()` | every value's shape, the register's scrim, and the four rendered themes |
| 2 | A tint measured as if it were solid | the eight read as readable, and Harbour's and Fog's ratios |
| 2 | Faint stripes in no order | *faintest first* |
| 2 | A palette block read past its end | `palettes.test.ts` refuses to load: *does not set the twenty tokens in order* |
| 2 | A token missing from the list of twenty | the same refusal |
| 2 | Contrast taken from two luminances alone | three of `colour.test.ts`'s |
| 3 | The pre-paint script stamping no theme of your own | three of `theme.test.ts`'s, and in a browser *on the page before the bundle is* |
| 3 | The pre-paint script stamping a value that is not a colour | *stamps what the bundle's reader keeps* |
| 3 | The pre-paint script trusting a base that is gone | *falls back to System for a record it cannot read* |
| 3 | The bar in the base's ground rather than your own | the script's stamp, and in a browser *the bar included* |
| 3 | The script reading another key than the bundle keeps | four, *reads the key theme.ts keeps it under* among them |
| 3 | Leaving your own theme leaving its values behind | *takes every inline value off*, and in a browser *leaving a theme of your own* |
| 3 | Wearing your own theme again leaving the last one behind | *leaves nothing of the last one behind* |
| 3 | The reader trusting every value | *skips a value that is not a colour*, and the script held to the reader |
| 3 | Mine chosen with nothing kept to wear | *only while there is one to wear*, and *refused whole* |
| 3 | Your own theme worn without its `color-scheme` | *stamps its base, every value inline, its color-scheme*, and *worn again* |
| 4 | Your own offered with nothing kept | *offers every theme*, and *no tenth until there is one* |
| 4 | Your own chosen and stored without being worn | *wears it when chosen* |
| 4 | *Make your own…* even once there is one | *a tenth choice*, and *keeps it there to choose again* |
| 4 | The way to make one with no rule above it | *offers to make one under the nine* |
| 4 | Your own named for something else | *named for the theme it is made from* |
| 5 | The board wearing a colour only once it is kept | twelve of `ThemePanel.test.tsx`'s, and in a browser *wears each colour as it is typed* |
| 5 | A box taking a colour before it is whole | *once it is a whole #rrggbb* |
| 5 | Made from starting again from the new theme's colours | *keeps your three colours when Made from changes* |
| 5 | Cancel leaving on what was picked | Cancel, the ×, Escape, and a theme of your own put back |
| 5 | The panel without the modal keyboard | three, and in a browser *the keyboard goes in from the list* |
| 5 | Every warning under the card | *said under the colour it answers to*, and *a pair on the ground under the ground* |
| 5 | System read as light on a dark device | *starts from the theme System is showing* |
| 5 | *Edit…* opening on the theme worn rather than the one kept | *opens Edit… on the theme you kept* |
| 5 | The choice stored though the theme was not | *when storage refuses* |
| 5 | A press on the page cancelling | *lays an inert, transparent layer* |
| 5 | A press on the page reaching the board, the layer `pointer-events-none` | in a browser, *a press on the board neither keeps nor cancels* |
| 5 | The panel gone with nothing put back | *goes with neither Keep nor Cancel* |
| 5 | The keyboard left where Keep was pressed | *keeps the theme on Keep … the keyboard back on the palette* |
| 5 | The phone's sheet three quarters of the screen | in a browser, *a sheet over half the screen* |
| 5 | Keep scrolled under the sheet's fold, not pinned | the same |
| 6 | The panel without the modal keyboard, in Firefox | *the keyboard goes in from the list* |
| 6 | The board wearing a colour only once it is kept, in Firefox | *wears each colour as it is typed* |
| 6 | The swatch heard by nothing, in Firefox | the same |

### What the plan got wrong, or left out

- **Vitest hands a test an empty string for `index.css?raw`**, as for every stylesheet: the plan's
  step 2 had the derivation's bases come from nowhere in particular, and the first run of
  `palettes.test.ts` refused a stylesheet with no blocks in it. `test.css.include` names that one
  import. A CLAUDE.md line now, since it reaches anybody who reads a stylesheet's text in a test.
- **The prototype's script let any lowercase word through**, though the measures said a value that
  is not a colour was skipped; the probe's bad value had a semicolon in it, which any rule refuses.
- **Dusk's quiet text on the delete warning is 4.58:1**, not the 4.57 `docs/design.md` and the
  contrast test's comment said; measured with the same arithmetic. And design.md's count of the
  contrast cases, ninety-nine and eleven, is 153 and seventeen, as the measures above found.
- **A `<select>`'s text sits where it was laid out**, so a page whose theme changes under it draws
  its selects a pixel off one that loaded wearing the theme. It made the first pixel comparison
  differ in every panel state, inside selects only, and the same history on both servers gave the
  same pixels. Not the build's doing; worth knowing at the next comparison.
- **Playwright gives `<input type="color">` the textbox role**, where jsdom gives it none, so the
  e2e suite's first run found two textboxes named *Card*. The specs find a box by its label and
  its type.
- **The open picker in the user's own Firefox was not measured**, as it was not at the workshop:
  headless browsers open none. Whether Firefox on Windows repaints the board as you drag in its
  picker, or only on OK, is for the user's browser and the workshop's `/workshop-probe` to say; the
  box beside each swatch works either way.

### Deployed

**At about 03:22 Eastern on 22 November 2026**, merged as PR #107 and deployed by the runbook in
`docs/deploy.md`, `76172b4` to `ca90070`, carrying #106's docs with it. Frontend and docs only: no
migration, no variable and no route. **Caddy alone was recreated**, and the API kept its 30 hours of
uptime; the whole deploy took 13 seconds.

- **The bundle** went `index-Co5mM0L7.js` to `index-BEoiX2sR.js`, where a local build said
  `index-DC7PfnJg.js`. **The stylesheet** went `index-DT1iVaz_.css` to `index-cESev2uj.css`, the
  local build's name, and byte for byte the local build's file.
- **The panel's own chunk** is `ThemePanel-CwYVfnpj.js`, where a local build said
  `ThemePanel-CYFI915u.js`: built from the app's code, it does not keep its name between machines,
  as the spreadsheet writer's chunk, built from a dependency alone, does. It is named in the bundle
  and served as `text/javascript`, and six of its strings are 1 each in it: *Your own theme*, *Not
  on the board*, *Hard to read:*, *Start again from*, the stripe floor's sentence and
  `pl-[5.25rem]`.
- **Five script strings 0 then 1**, by `grep -F`: `hobbytracker.theme.mine`, `Make your own…`,
  `Edit…`, the kept value rule's `pxrgb`, and `ThemePanel-`, the dynamic import.
- **The page itself** changed too: the pre-paint script's `hobbytracker.theme.mine` and `pxrgb`, 0
  then 1 each in the served `index.html`.
- **The selector diff** found 23 rules new and none gone, the panel's classes:
  `.pl-\[5\.25rem\]{`, `.rounded-t-xl{`, `.md\:-bottom-5{` and the colour rows' grid among them,
  each 0 then 1. Afterwards the served stylesheet's selectors were the local build's exactly.
- **`/api/auth/me` answered `null` (200)** before and after; Caddy's log had no error, and the API's
  no warn, fail or crit line in 20 minutes.

**A browser that has never kept a theme of its own sees nothing change** until *Make your own…* is
pressed in the palette's list.

---

## 29. Collapsing a column · shipped

**Planned 14 November 2026**, at the user's request: *"Since I've completed many games recently,
the completed column has been making scrolling down a lot more tedious. I want a quick button
beside the column header, like an arrow, to just quickly collapse the column and not hide it like
my option in Settings."*

**What exists already.** **Dropped collapses**, side by side and by default: a *Show Dropped* /
*Hide Dropped* button in its header (`ColumnFrame`'s `onToggleCollapse`), held in `BoardPage`'s
`droppedOpen` and forgotten on a reload. Collapsed, the header, its count and its hours stay, the
cards go, and **the section stays a drop target**, `min-h-24`, which `Column.tsx`'s comment says
was a fix. So this is that, for every column, with an arrow.

**Why the page is long.** Side by side, the page is as tall as its tallest column, and a column
draws up to 100 cards (`COLUMN_PAGE_SIZE`). Collapsing Completed shortens the page only to the
next tallest, which is the point.

### Decide at pickup

- **Which columns.** Recommended: every one, Backlog included, since collapsing hides nothing for
  good and Backlog's header still holds *Pick*.
- **Remembered or not.** Recommended: **per board and per browser**, as hidden columns are, through
  a store beside `board/hiddenColumns.ts`; a collapse that forgets itself on a reload is a press
  every visit. **Dropped starts collapsed**, as now, and remembers its own state after that.
- **The arrow and the words.** An arrow before the heading, pointing down when open and right when
  collapsed, named *Collapse Completed* / *Expand Completed* for a screen reader. Dropped's *Show
  Dropped* words go, so every column says it one way.
- **What a collapsed column looks like.** Render: Dropped's shape, header and hours with no
  cards; a narrow strip with the name turned on its side, which gives the width back to the others
  but changes `board/grid.ts`; the column with a height of its own and a scroll inside it, which
  is not a collapse but answers the same complaint.
- **On a phone, nothing.** One column is shown at a time under the switcher, so there is nothing
  below it to scroll past. Recommended: the arrow side by side only, as Dropped's button is.

### Things to get right

- **A collapsed column is still a drop target**, measured by `boardCollisions`, and a card dropped
  on it lands there: into Completed still asks nothing new, and out of Completed still asks *Did
  you finish it?* (#14).
- **A collapsed column still fetches**, because its heading counts and its hours line add up the
  column, and #20's counts in that line still open their lists.
- **Not to be confused with hiding.** Hidden columns are not rendered, not fetched and not a drop
  target (**Settled**, *Hiding a column*); a collapsed one is all three.

### Tests first

- Every column side by side has the arrow; pressing it hides the cards and keeps the heading, its
  count, the hours and the sort control.
- It survives a reload, per board: collapsing Completed on games leaves Watched on films open.
- Dropped starts collapsed with nothing stored.
- On a phone there is no arrow.
- e2e: a card dragged onto a collapsed column lands there.
- **Put the fault back:** stop rendering the section while collapsed, and the drop test goes red.

### The workshop, 22 November 2026

On branch `collapsing-a-column` from `b790895`. Round one in words, then round two in renders of
the shipped board on #27's harness and stage (`workshop.local/settings-rearranged/`: #19's read of
the user's games board on 3 November 2026, which opens on 2026 with Backlog 6, Playing 2, On Hold
4, **Completed 21** and Dropped 1, and Completed 64 under All years). Prototypes, shots and
measures in the gitignored `frontend/workshop.local/collapsing-a-column/`.

**Round one, in words: all seven picks the recommendation.** Two of the questions were not in the
plan, found by reading the code: a share folds Dropped through the same `ColumnFrame`, and the
release calendar has a fold of its own, *Hide* / *Show*, remembered per board.

| Choice | Picked | Against |
|---|---|---|
| Which columns | **Every column, Backlog too**: nothing is hidden for good, and Backlog's header keeps *Pick*. A title added from a search tile to a collapsed Backlog lands out of sight, its count going up and the tile then naming Backlog | every column but Backlog, as hiding is; Completed and Dropped only |
| Remembered | **Per board and per browser**, a store beside `board/hiddenColumns.ts`, so collapsing Completed on Games leaves Watched on Films open. **Dropped starts collapsed with nothing stored and keeps its own state after that**: once opened it stays open, where today it folds itself again on every load | forgotten on a reload, as Dropped's fold is today |
| The words | ***Collapse Completed* / *Expand Completed***, the name saying what a press does, as Dropped's and the calendar's buttons do; Dropped's visible *Show Dropped* / *Hide Dropped* go, so every column says it one way, and *hide* stays what Settings does | *Hide* / *Show Completed*, which is what Settings' Columns group does; one name that never changes, with `aria-expanded` |
| On a phone | **Side by side only**, from 768px, as Dropped's fold is today. Below it a stored collapse does not apply: choosing a column in the switcher is asking to see it | the arrow on a phone too, where a collapsed column chosen would show its header over nothing |
| Settings | **Nothing in Settings**, which answers #27's *Collapsed columns*: the arrow is the control, on the column it folds, and a collapsed column stays on the board with it, where a column taken off can only come back from Settings | a Collapsed group of boxes under Columns; Columns as a three-way *Shown · Collapsed · Off* |
| A share | **Every column, never remembered**: page state, Dropped collapsed to start, for the reason the calendar's fold is not remembered on a share (`remembers={false}`), since a visitor's fold kept under the board's key would fold their own board | Dropped alone, as today |
| The calendar | **Rendered both ways in round two**, its word beside the arrow, and the look decides | left alone, out of scope |

What a collapsed column looks like, and where the arrow sits, were not asked in words: they are
round two's.

**Round two, in renders: all four picks the recommendation**, from
https://claude.ai/artifact/Xq1fhryspTKvxUzh4W7tFa. The shipped board on Vite alone, BoardPage's
`./Column` and `./ComingSoon` swapped for prototypes by `resolveId`, every `/api/` request answered
from #27's stage; shot at 1440 and 1280 in Shelf Light and Shelf Dark, the forms at three times the
size, and the phone at 390. **The picked look is `?look=a&arrow=before&form=chevron&cal=arrow`**,
`ColumnProto.tsx` and `ComingSoonProto.tsx` in `workshop.local/collapsing-a-column/`, which are
the reference for values.

| Choice | Picked | Against |
|---|---|---|
| What a collapsed column looks like | **A, Dropped's shape**: the header, its count, the hours and Completed's comparison, and the sort control, with no cards; the same track, so `grid.ts` is untouched and the calendar stays on the board's lines. The page at 1440 goes from 4,940px to 2,400, and from 11,627 to 2,400 under All years; at 1280 from 5,553 to 2,654; at 1024, two across, from 5,789 to 3,257 | B, a 48px strip with the name on its side and the width given to the others: no room for the hours or the sort control, the calendar 290px off Playing's line, five across only, and the page 2,499 at 1440 because the wider columns' covers grow (2,435 at 1280, where the titles unwrap); C, the cards in a box 70% of the window tall that scrolls inside the page, not a collapse, and here no shorter than A, since Backlog is taller than the box |
| Where the arrow sits | **Before the heading**, on the heading's row whatever wraps, at the same spot in every column | after the count, where Dropped's words are, moving with each name's length; past the sort control, which goes down with the sort control whenever that wraps, every column at 1280 |
| Its form | **The journal's chevron** (`ColumnControl.tsx`): 10 × 6 with a 1.5 stroke in a 20px `rounded` button, `text-muted hover:bg-hover hover:text-fg`, pointing down open and turned a quarter to point right collapsed | a filled triangle, 10 × 10, a second arrow style in the app |
| The calendar | **The arrow, before its heading**, named *Collapse Coming soon* / *Expand Coming soon*, so every fold on the board is one control and the board stops saying *hide* for a fold. Still remembered per board under `hobbytracker.coming-soon.<hobby>` | the word *Hide* / *Show* at the far right, as today |

**What every place costs, measured and shown on the page**: the arrow and its gap add 28px to the
heading's row, so at 1440 Backlog's and Completed's sort controls go under the heading, where today
Backlog's and Dropped's do (Dropped's words were wider than the arrow), and Completed's cards start
113px down rather than 85. At 1280 all five go under, where today Backlog's, Completed's and
Dropped's do, so Playing's and On Hold's cards start 97px down rather than 69, level with Backlog's.

**Found while rendering**: C was first shot with Dropped capped like Completed, which showed its one
card and read as C changing Dropped; it was re-shot with Dropped keeping its fold. And a claim
drafted for the page, that C's box would cut a card's menu, was measured false (the menu ends 4px
inside the box) and left off.

**Decided without asking, for the user to object to**:

- **What is stored is which columns are collapsed**, under `hobbytracker.collapsed-columns.<hobby>`
  beside the hidden columns' key, written whole on every press from what the board was showing. So
  nothing stored is Dropped collapsed, a stored empty list is every column open, and a column added
  later starts open. Anything unrecognised falls back to nothing stored.
- **A share folds every column as the visitor's page state**, Dropped collapsed to start, and reads
  and writes no store.
- **The calendar keeps its arrow at every width**, as its word is today: on a phone it is under the
  one column shown, and folding it is still the way past it.
- **No `aria-expanded`**, as round one's words decided: the name says what a press does, and a name
  and a state that both change would say it twice.

### The build, in order

Tests first in each step, shown red, each fault put back afterwards, a commit per step, on
`collapsing-a-column`.

1. **The store**: `board/collapsedColumns.ts` beside `hiddenColumns.ts`, through
   `lib/preferenceStore.ts`. Nothing stored is Dropped collapsed; per board; written whole.
2. **The arrow on every column side by side**: `ColumnFrame` draws the chevron before the heading
   where it is handed a toggle, and Dropped's words go; `BoardPage` reads the store for every column
   side by side, and nothing on a phone. The existing cases that press *Show Dropped* follow.
3. **A share**: every column folds, as page state.
4. **The calendar's arrow**, in place of its word, at every width.
5. **e2e**: a card dragged onto a collapsed column lands there; a collapse survives a reload, per
   board; the arrow from the keyboard. The drop and the keyboard in Firefox too.
6. **The built board against the picked prototype**, pixel for pixel, at 1440, 1280 and 390, both
   themes, then the full e2e suite.
7. **Docs**: this section and its status row, `docs/board.md`, `docs/design.md`, CLAUDE.md's
   Settled and What exists rows, and `docs/history.md`.

### Built, 22 November 2026

The workshop's own session, tests first in every step, each shown red before it went green, a
commit per step, on `collapsing-a-column` from `b790895`:

| Step | Commit | What it holds |
|---|---|---|
| The workshop record | `e211293` | This section's tables, committed as docs first |
| 1. The store | `4d41fcc` | `board/collapsedColumns.ts` beside the hidden columns' store: nothing stored is Dropped collapsed, a stored empty list is every column open, written whole in board order |
| 2. The arrow | `6693a6e` | `ColumnFrame` draws the arrow before the heading where it is handed a toggle, and Dropped's words go; `BoardPage` reads the store side by side alone. The journal's chevron moved to `lib/Chevron.tsx` |
| 3. A share | `320a0f2` | every column collapses for the visit, Dropped to start, and no store is read or written |
| 4. The calendar | `393c5c2` | the word *Hide* turned into the arrow before its heading; `board/CollapseArrow.tsx`, one component for the columns and the calendar |
| 5. e2e | `864450c` | a drop onto a collapsed Completed and one out of Completed onto a collapsed Playing, a reload on its own board, and the arrow from the keyboard; green in Chromium and Firefox |
| 7. Docs | this commit | `docs/board.md`, `docs/design.md`, `docs/journal.md`, `docs/history.md`, CLAUDE.md and this section |

Step 6, the comparison and the full suites, put nothing in the repo; its results are below.

**Decided at the build, for the user to object to**, none of it drawn at the workshop:

- **The journal's chevron moved to `lib/Chevron.tsx`**, and the journal's column control and the
  arrow both draw it, rather than the board reaching into `journal/` or keeping a copy to drift.
- **One component for the arrow, `board/CollapseArrow.tsx`**, which the columns and the calendar
  both draw.
- **The calendar's arrow stays on a phone**, as its word did, so the two phone cases that say a
  column has no arrow look inside the column.

### Tests

**The full e2e suite went 278 green**, the 275 before and 3 new. **Vitest went 1,692 green**,
from 1,674. **In Playwright's Firefox**, `board.spec.ts`'s four collapse cases, the two drops, the
reload and the keyboard, 4 of 4.

- **The store**: `collapsedColumns.test.ts`, ten cases.
- **The column**: `Column.test.tsx`, the header kept while collapsed, the arrow before the heading
  and its press, *Expand* and never *Show* or *Hide*, and no arrow when handed no way to fold.
- **The board**: `BoardPage.test.tsx`, an arrow on every column, a collapse remembered across a
  remount and not on the films board, Dropped expanded by its arrow, and on a phone no arrow in the
  column with what is stored not applied.
- **A share**: `SharedBoardPage.test.tsx`, every column collapsing with nothing stored, and none
  following this browser's own.
- **The calendar**: `ComingSoon.test.tsx`'s arrow before its heading, its renamed fold cases, and
  `coming-soon.spec.ts`'s fold across a reload.
- **e2e**: `board.spec.ts`'s three new cases, and the five that pressed *Show Dropped*.
- **Measured against the picked prototype**, pixel for pixel, by the gitignored
  `workshop.local/collapsing-a-column/compare-built.mjs`: 16 states in both themes, whole pages at
  1440 and 1280, the header band close up and under the pointer, the calendar collapsed and a phone,
  and **no pixel differs in any**. See **Collapsing a column** in `docs/design.md`.

### Checked by putting each fault back

One at a time against the finished build, by the gitignored
`workshop.local/collapsing-a-column/faults.mjs`, #27's script with a Playwright runner beside the
Vitest one, which restores each file after its run. **All fifteen turned red the cases named**; the
table is in `docs/board.md`, under **Collapsing a column**. The two Playwright faults were run again
with the reporter's output kept, because the script's first pattern for a failed case matched none,
and the cases are named from that output rather than from the exit code.

### What the plan got wrong, or left out

- **A share folded Dropped too**, through the same frame, and the plan said nothing of a share.
  Round one asked: a share collapses every column for the visit.
- **The calendar had a fold of its own**, the word *Hide*, which the plan did not mention. Round
  two drew it both ways, and it is the arrow now.
- **The arrow costs its 28px on the heading's row**, which the plan did not foresee: at 1440
  Completed's sort control goes under its heading, and at 1280 all five do. Every place for the
  arrow costs the same, so the renders decided where it ends up when a row wraps.
- **"On a phone there is no arrow" holds for the columns alone**, since the calendar keeps its
  arrow at every width.
- **The fault the plan named**, the section not rendered while collapsed, would also have taken
  the region the specs find a column by. The fault put back is the section without the droppable's
  ref, which is the bug the section's comment records, and the drops went red for it.
- **The first comparison run found the light header band 10,232 pixels apart**, where its dark and
  hovered twins matched; three runs after matched, so it was the shot and not the build.

### Deployed

**At about 04:41 Eastern on 22 November 2026**, merged as PR #109 and deployed by the runbook in
`docs/deploy.md`, `ca90070` to `bd0f672`, carrying #108's docs with it. Frontend and docs only: no
migration, no variable and no route. **Caddy alone was recreated**, and the API kept its 31 hours
of uptime, since no base image had moved; the script took 12 seconds.

- **The bundle** went `index-BEoiX2sR.js` to `index-BbPJB8Ld.js`, where a local build said
  `index-BJW6qECd.js`. **The stylesheet** went `index-cESev2uj.css` to `index-D6mybYIa.css`, the
  local build's name, and byte for byte the local build's file.
- **Three script strings 0 then 1**, by `grep -F`: the store's key, `hobbytracker.collapsed-columns.`,
  the arrow's class string, and `-rotate-90`. **Two 1 then 0 and 2 then 0**: the calendar's *Hide*
  button's `ml-auto rounded px-1 text-xs text-muted hover:bg-hover`, and the class string inside it
  that Dropped's *Show Dropped* button shared.
- **The selector diff** found two rules new and none gone: `.-rotate-90`, the arrow's, and
  `.collapse`, which nothing wears. Tailwind made it from the word *collapse* in a code comment, as
  #26's `.my-auto` was made, and it sets `visibility: collapse` on no element.
- **`/api/auth/me` answered `null` (200)** before and after, Caddy's log had no error, and the API's
  had no line at all in the 20 minutes around it.

---

## 30. The README, refreshed · shipped

**Planned 20 November 2026**, at the user's request, **to be done after #25 to #29**, so its shots
show them. In the user's words: *"one of the improvements I want would be to have better
screenshots. Right now, there are screenshots in the readme, but you can't click on them when
viewing it on GitHub to see a bigger image. The gif screenshot of the backlog picker is also too
small, etc."* The *etc.* is the user's, so the workshop asks what else before it draws anything.

**What is there today**, measured on 20 November 2026:
- **Nine shots, each a `<picture>`** with a dark `<source>` and a light `<img>`, so a reader's
  colour scheme picks Shelf Dark or Shelf Light (`bd3885d`, 1 November). **None opens bigger, and
  the `<picture>` is why.** GitHub's Markdown API links a Markdown image or a bare `<img>` to its
  file, but the README the repo page renders (`GET /repos/Daojim/hobbytracker/readme`, asked for as HTML) has
  each `<picture>` inside a `<themed-picture>` with no link.
- **Wrapping one in a link is not the fix it looks.** Asked to render `<a><picture>…</picture></a>`,
  GitHub's Markdown API moved the `<img>` out of the `<picture>` into a link of its own, which
  leaves the dark `<source>` nothing to choose for. **And the API is not the repo page**: asked
  for a bare `<picture>`, the API linked its `<img>` where the repo page does not. Believe a form
  only on a pushed branch's own page, in Firefox and Chrome.
- **The wheel is a GIF 360px wide and 601 tall**, shown at `width="300"` in a table cell beside its
  words, and 1.8 MB, which is most of the 3.0 MB of pictures a reader in light mode downloads.
- **Five shots are shown small**: search, the calendar, Discover and anime two to a row at
  `width="390"`, and the phones at 800. The board, the journal and Stats fill the column. Every
  WebP but the calendar's is 1,760px wide, so the pixels are there for a bigger view.
- **The shots are older than seven features**: #17's *From your ratings* tab, #19's arrow, #20's
  counts that open a list, #21's list behind a rating, #22's OpenCritic and Steam rows, #23's
  eye and #24's year. #17's and #21's builds edited the words, and nothing has touched the
  pictures since they were made. #25 to #29 add more, and **#26 changes the very panel the GIF shows**, which
  is why this waits.
- **The words are behind too.** *How it's built* names IGDB, TMDB, MyAnimeList and
  HowLongToBeat, and not OpenCritic, Steam or Wikidata (#22), and the *Also* line has neither
  hiding from Discover (#23) nor a game finished long ago (#24).
- **The harness is still here**, in `frontend/workshop.local/readme/`, gitignored and so in this
  checkout alone: the seed, the shots and the recording, against a `hobbytracker_readme`
  database. How it was run is in the auto-memory note on workshops, under 1 November.

### Decide at pickup

- **What else the *etc.* covers.** Asked first, in words, before anything is drawn.
- **How a shot opens bigger.** Render each on a pushed branch: two plain images per shot with
  GitHub's `#gh-light-mode-only` and `#gh-dark-mode-only` fragments, which the API links like any
  image, if the repo page still hides the other theme's; a *Full size: light · dark* line under
  each `<picture>`; or one theme only, as plain images. Recommended: whichever keeps both themes
  and opens the one the reader is looking at, which only the renders can say.
- **The wheel.** Recorded larger, at 480 or 600px, as a GIF, whose weight grows with its area,
  2.8 times today's at 600; as an animated WebP, smaller at one size, if GitHub shows it; or as a
  video, which GitHub may play only from an upload of its own rather than a file in the repo.
  Measure each before offering it. And whether it keeps its table cell or takes the column.
- **Which shots are retaken, and whether the tour gains any**, shown as the whole list, as the
  1 November round two showed its thirteen candidates.

### Things to get right

- **Never production**: the demo account on a database of its own, as `docs/shots/` has always
  been made (CLAUDE.md, **The map**).
- **A shot is a download**: say what each costs a reader, the wheel above all.
- **Check the README as the repo page renders it** before calling it done, on the branch, since
  the API and the page differed on 20 November.

### Measured before round one, 22 November 2026

On GitHub's own repo page, logged out, in Chrome and Firefox, light and dark, by a Playwright
probe of `article.markdown-body` (`workshop.local/readme-refreshed/gh-probe.mjs`):

- **None of the nine opens bigger**: 0 of 9 images is inside a link. A reader downloads only their
  own theme's files, 3.0 MB, 1.8 MB of it the GIF.
- **The wheel renders 88 × 146px on a desktop, not the 300 its `width` says**, because its table
  cell gives the words the room, and **25px wide on a phone** (390px, GitHub's mobile layout,
  a 324px column). The grid's four shots render at 367–390px on a desktop and 129–140px on a
  phone; neither table scrolls sideways. So most of *too small* was the cell, not the file.
- **Reduced motion.** GitHub wraps a plain GIF in `<animated-image>`, which gives it a play/pause
  button and starts it paused for a reader who asked for reduced motion. Today's GIF, inside a
  `<picture>`, gets neither, and nor does an animated WebP or AVIF.
- **The wheel's forms**, from #26's panel (576 wide, a 400 wheel) recorded afresh: not a screen
  recording but the wheel's own CSS transition stepped frame by frame through
  `document.getAnimations()` at DPR 2, with `Math.random` seeded so both themes draw the same wheel
  (`wheel-frames.mjs`). 6.0 s: 0.5 still, the 4 s spin, 1.5 on the pick. **Clean frames alone
  halve a GIF**: today's recipe at 360px makes 952 KB from them, against 1,809 KB from the video.
  One reader, light: GIF 480 at 12 fps 1,575 KB; **GIF 600 at 12 fps 2,228 KB**; animated WebP 600
  at 15 fps 1,144 KB; animated AVIF 600 at 15 fps 522 KB; MP4 600 at 30 fps 794 KB. On a pushed
  throwaway branch all three image forms showed, animated and were links in both browsers; **an
  MP4 in the repo does not play**: GitHub strips `<video>`, and as a Markdown image it is a broken
  image that still downloads. GitHub documents that an uploaded video plays, which only the
  user's browser could measure.
- **Every shot is stale**, and costs about what it did when retaken as before (WebP q90 at up to
  1,760px, KB light / dark): board 136 / 134, journal 179 / 156, Stats 103 / 103, search 148 /
  147, calendar 53 / 52, Discover 294 / 291, anime 113 / 112, phones 176 / 174. The candidates:
  From your ratings 298 / 300, a rating's games 31 / 31, the ✓'s question 167 / 165, a theme of
  your own 145 / 142, Settings 104 / 89, searching notes 86 / 86, Suggest three 120 / 93, a share
  link 127 / 125, TV 92 / 91, films 77 / 76, a header's opened list 136 / 134.
- **The demo board has aged.** GTA VI's day, 19 November, has passed, so it has arrived in Backlog
  with no estimate and sits at the top of the column; Fable carries the calendar's countdown. A
  refresh from IGDB on 22 November changed no date and renamed *The Elder Scrolls VI* to
  *… : Sentinel*. The journal is a modal since #27, which at the old window shows a note's first
  picture large and cuts the rest.

### Round one, 22 November 2026: in words

Two calls. **The *etc.* was the user's to say, and it changed the model**: *"mainly how all the
pics were not appealing to look at compared to other well made repos"*, with the hero shot ticked.
So a second call asked what *appealing* means here before anything was drawn. Picked:

- **Close crops**, each shot cropped to the part it is about and shown near its real size, so its
  words read; the hero stays a wider view. Recommended.
- **On a backdrop**: padding in a backdrop of the theme's own tones, rounded corners and a soft
  shadow, baked into every image, light and dark alike. Recommended.
- **The hero is the board with a phone beside it**, a composite. Recommended.
- **The wheel a GIF at 600, taking the column**, centred under its words. Both recommended.
- **Folded into shots retaken anyway**: Stats with a rating's list open (#21), Search with the ✓'s
  *When did you finish it?* open (#24), and Discover on *From your ratings* (#17). All three
  recommended; the hero with a header's list open (#20) was not taken.
- **The tour gains the share link and the Settings dialog**, the user's picks over the one
  recommended, a theme of your own, which is not taken.

### Round two, 22 November 2026: in renders

**How a shot opens bigger, measured on GitHub's own page** on the throwaway branch
`readme-workshop`, six forms with a still and a GIF each, Chrome and Firefox, light and dark
(`gh-forms.mjs`). They agreed in every cell but one fetch:

| Form | A dark reader sees | Pressing the shot | The GIF | Downloads |
|---|---|---|---|---|
| Two Markdown images with `#gh-light-mode-only` and `#gh-dark-mode-only` | dark | opens that theme's file on GitHub's file page, in GitHub's own theme: 1,760px shown at 1,085 in a 1,440 window | GitHub's player | **both themes** |
| The same as HTML `<img>`, with and without `loading="lazy"` | dark | as above | as above | both: GitHub strips `loading` |
| Today's `<picture>`, a *Full size: light · dark* line under it | dark | nothing; the line opens either file | no player | one theme (Firefox in dark fetched both once) |
| One theme, plain images | **light** | the light file | player | one |
| A link around a `<picture>` | **light**: the link breaks the switch | the light file | player | one |

**The look**, rendered by `tour.mjs` (crops clipped in the browser at DPR 2), `compose.mjs` (each
crop on an 880px mat, rounded 12px, a hairline and a soft shadow, drawn by the browser) and
`gif-compose.mjs` (the wheel's 181 frames framed the same way, the panel's top held still so it
grows downward rather than jumping as the centred dialog does). One page:
https://claude.ai/artifact/94G2xeoeN4C1Vr8ujgBihn. The draft README was pushed to
`readme-workshop-look` and read back from GitHub, every shot at a phone's full 324px column.
**The page set its height, 10,872px at a desktop, against today's 6,891, and that was unfair**:
the draft stopped after *How it's built*, about 2,200px short of a whole README. The built one is
13,055 against 6,891, and 10,865 on a phone against 7,599. Close crops, each with the column to
itself, are the length.

**Picked, every one the recommendation:**

- **The stills as fragment pairs, the wheel in a `<picture>`.** Every still opens bigger in the
  reader's own theme, at the cost of both themes downloaded; the wheel is already shown at its full
  656px, so it stays one theme and spins without GitHub's pause. One reader: **5.0 MB** (light
  5,091 KB, dark 5,131), against 7.2 MB for fragments everywhere and 3.6 MB for pictures with a
  *Full size* line. Today's is 3.0 MB.
- **The soft backdrop**: Shelf's ground running into a tint of its accent, `#f3eee7` to `#d5ddd5`
  in light and `#16130f` to `#1f2b25` in dark, over the ground and accent flat and no mat at all.
- **The journal to the foot of its newest note**: the top band with OpenCritic and Steam, the pass
  with the pace answer, and a note with three pictures. 294 KB and 1,478px on GitHub, the tallest
  image, over the pass alone (73 KB, 776px) and the drawer (197 KB, 1,368px).
- **The other stale words caught up too**: Tests' stand-ins, the optional OpenCritic key, Credits.

Two choices were made without being asked and are on the page to object to: **GTA VI moved last
in the demo Backlog's order** (it sat first only because its place dated from its unreleased add),
and the wheel lands on **Metaphor: ReFantazio** by a seeded `Math.random`, as 1 November's did.
**Left to tidy at the build**: Discover's second row lost its add buttons at the crop's foot, and
the anime and share crops ended partway through a card.

**The harness** is `frontend/workshop.local/readme-refreshed/`, gitignored: `api.sh` starts the
API on `hobbytracker_readme` (:5203, Development, only Google pointed at the e2e stub), with Vite on
:5176 and `node frontend/e2e/support/google-stub.mjs`; the seed and `lib.mjs` are still 1
November's, in `workshop.local/readme/`. `throwaway.mjs` pushes a branch named `readme-workshop…`
from a scratch index, so the checkout is never touched. Delete those branches when the work ships.

### Built, 22 November 2026

On `readme-refreshed`, a commit per step: the workshop's record, the shots, then the README with
its test. **Tidied at the build**, as the page said: Discover's crop ends on its second row's add
buttons, and the anime and share crops end on a card's foot.

- **`docs/shots/`**: ten stills and the wheel in two themes. One reader's theme, KB light / dark:
  hero 136 / 133, journal 293 / 291, Stats 96 / 91, search 125 / 123, calendar 58 / 57, Discover
  298 / 301, anime 96 / 93, share 110 / 106, Settings 87 / 84, phones 146 / 141, and the wheel
  2,204 / 2,244. `board-*.webp` went, the hero in its place.
- **The README**: every still a light and dark pair of Markdown images by fragment, the wheel one
  `<picture>` in `<p align="center">`, the tour's words for each shot, and *How it's built*, the
  *Also* line, Running it, Tests and Credits caught up.
- **`frontend/src/readme.test.ts`**, written first and shown red (three of five; the other two
  held today's README too): every still a pair whose two images share their words, no WebP in a
  `<picture>`, the wheel the only picture with no link round it, every file named and every name a
  file, and each pair 1,760 wide and one size. Beside `manifest.test.ts`, which reads files outside
  `src` the same way. Vitest 1,697, the 1,692 before and these five.
- **Checked by putting each fault back** (`faults.mjs`), all nine red: a still back in a
  `<picture>`; a still without its fragment; a dark reader handed the light file; a pair whose
  words differ; a link round the wheel; the wheel as two plain images; a file nothing names; a name
  with no file; a still at half the width.
- **On the pushed branch's own page** (`gh-verify.mjs`), Chrome and Firefox, light and dark: ten
  stills and the wheel shown, **each of the ten pressed and opening its own file in the reader's
  theme**, 1,760px shown at 1,085 on GitHub's white or `#0d1117`. GitHub opens it in the same tab,
  where the workshop's probe had looked for a new one. **A reader downloads 5,081 KB in light and
  5,121 in dark**, against 3,045 and 3,034 today.

**What the plan got wrong, or left out.** The plan put the wheel's smallness down to its 360px
GIF; on GitHub's page its table cell drew it at 88px, and on a phone 25. It also expected the
fragments to answer the double download by renders alone: GitHub strips `loading="lazy"`, so no
markup avoids it, and the pick paid it for the stills only. And it asked what else the *etc.*
covered expecting a list; the answer was a standard, *appealing beside well-made repos*, which
turned a retake into a redesign.

---

## 31. The installed app's bottom bar ignores the theme · shipped

**Planned 25 November 2026**, at the user's request: a bug, on Android. Lines were read at
`762161f`.

**Measured 25 November 2026** on the user's Android phone, in the app installed through Chrome,
with Dusk chosen and the app closed and opened again. Pixels sampled from the user's screenshot:

| Bar | Colour | Whose |
|---|---|---|
| The status bar, at the top | `#2a323c` | Dusk's ground, `--sunken` |
| The navigation bar, at the bottom | `#efe9e1` | The manifest's `theme_color`, Shelf Light's ground |

**So `docs/design.md`'s *The bar above the page follows the theme* is half confirmed, and the
other half was never measured.** The `theme-color` tag reaches the top bar, as that section says:
the pre-paint script's tag on a load, `applyTheme`'s after one. The bottom bar is coloured from the
manifest alone, which a stored setting cannot change. The section says as much of the bar *before
the page has loaded*; nobody had looked at the bottom one after. #1's checks on the phone asked
about the status bar only (step 3).

**Developer reports agree, and Chrome's own docs say nothing.** Discourse's forum thread,
*Android bottom navigation bar color issues in Discourse PWA*, from September 2025
(https://meta.discourse.org/t/android-bottom-navigation-bar-color-issues-in-discourse-pwa/381137),
read while this was planned, all but a few posts the page did not show:

- *"chrome only looks at the `theme_color` in the Web App Manifest to color the system bar"*
  (post 38). Another reply: the tag *"reliably changes the top address bar color in Chrome on
  Android"*, while *"the native bottom navigation bar usually cannot be controlled from a web
  app"* (post 35).
- **It was never resolved.** There is *"no workaround that can guarantee"* the bar's colour (post
  40); it was assigned to an engineer on 3 September 2025 (post 41), where the thread ends. One
  reply had a Galaxy S23's bar following light and dark (post 8), so devices may differ.
- **Nobody there separated `theme_color` from `background_color`, and this measurement cannot
  either: both are `#efe9e1` in `public/manifest.webmanifest`.** The thread names `theme_color`.
  A pickup that changes the manifest changes one field at a time and measures, since
  `background_color` is also the splash behind the icon.
- Its one workaround was a Trusted Web Activity built with Bubblewrap, which sets the bar for each
  scheme. That is an Android app to build and sign rather than a web page, and is not offered
  here.

**What colours the bars today:**

- **`index.html`**: System's two `theme-color` tags, `#efe9e1` light and `#16130f` dark, with
  media queries, and the pre-paint script writing a chosen theme's tag ahead of them from its own
  copy of each ground, which `theme.test.ts` holds to `index.css`. `applyTheme` rewrites it when
  the theme changes. A theme of your own's bar is its own ground.
- **`public/manifest.webmanifest`**: `theme_color` and `background_color`, both Shelf Light's
  ground, held to it by `manifest.test.ts`, which is what makes the splash, the icon's paper and
  the default theme one colour (`docs/design.md`).
- **The grounds a bottom bar would sit under**, three light and five dark:

| Theme | Ground | Scheme |
|---|---|---|
| Shelf Light | `#efe9e1` | light |
| Frost | `#e4e9f0` | light |
| Almanac | `#e5d9bf` | light |
| Dusk | `#2a323c` | dark |
| Blood Red | `#430404` | dark |
| Shelf Dark | `#16130f` | dark |
| Console | `#0a0c10` | dark |
| Ember | `#121110` | dark |

The ninth, a theme of your own, has whatever ground its maker picked, and System is Shelf Light or
Shelf Dark by the device's scheme.

### Decide at pickup

**Picked on 27 November 2026: (a), with System keeping today's manifest and a theme of your own
linking its base's, every pick the recommendation.** The check came first and found the cause
rather than a way out: **What the check found**, below, and the build is **Built**.

**First, check whether anything newer changes this.** The thread is from September 2025. Look for
a Chrome or Android release since then that colours the navigation bar from the page, as an iPhone
is reported to; whether Chrome on Android now reads a manifest's dark-scheme colours, which would
let System's bar follow the device at least; and whether drawing edge to edge on newer Android
reaches an installed app, so the page paints under the bar itself. Then one of three:

- **(a) A manifest that follows the theme**, served per theme or rewritten.
  - **The theme is kept in the browser's `localStorage` and never reaches the server**, so *served
    per theme* means the page choosing which manifest it links to: eight files and none for a
    theme of your own, or a route that writes one for a colour it is handed. A manifest is fetched
    without cookies unless its link says `crossorigin="use-credentials"` (MDN, on
    `<link rel="manifest">`), so one chosen by a cookie needs that too.
  - **Chrome re-reads an installed app's manifest only occasionally, so the bar would lag.**
    web.dev's *How Chrome handles updates to the web app manifest*
    (https://web.dev/articles/manifest-updates) is where to read how occasionally. Its copies say
    a launch checks at most once a day, and that on Android a new WebAPK follows later still, once
    the app is closed and the phone is charging on Wi-Fi, with `about://webapks` to ask for one by
    hand, which is how a pickup would measure it. Read its current English page, since copies of
    it differ.
  - **System is the hard case**: the device's scheme changes at sunset, and the manifest would
    follow a day later at best. And whether Chrome follows a page that links a different manifest
    under the same `id` is the first thing to measure.
- **(b) One fixed colour that sits acceptably under all nine themes**: `theme_color` alone, if it
  proves to be the field, leaving `background_color` as the splash's paper. No one colour is near
  all eight grounds, so it is a render: the bar under each of them on a phone's frame, beside
  today's paper. It also changes the top bar before the page loads, `theme_color`'s other job, and
  `manifest.test.ts`'s rule that the manifest is Shelf Light's ground; the colour becomes a token
  in `index.css`, since every colour a browser reads early is a copy held to that file.
- **(c) Leave it**, and record why in `docs/design.md` beside the iPhone paragraph.
- **Recommended: nothing until the check.** If it finds nothing newer, (a), provided Chrome follows
  a changed link under the same `id` and the lag measures in a day rather than weeks: a theme is
  picked once and kept, so a bar a day late is right every day after. Otherwise (b) from its
  renders, or (c).

### Things to get right

- **Whatever is chosen, `docs/design.md` gains the measurement**: *The bar above the page follows
  the theme* says the top bar is confirmed and the bottom bar is not, and so does the bar's row in
  that file's table, *Each theme's ground, on Android in Chrome and in the installed app*.
- **Only the user's phone can measure it** (the memory *Jimmy uses Android*). After the deploy,
  the measurement's own steps: Dusk chosen, the app closed and opened, the bottom bar sampled; then
  Shelf Light and a theme of your own; and under (a), again once `about://webapks` has asked for
  an update.
- **Installable still**: `e2e/install.spec.ts` reads every manifest the page can link, in full
  Chromium (the rule under *Phone tests*).
- **The splash is `background_color`, and the icon's paper is drawn to match it**, so a change to
  `background_color` puts a paper icon on another colour.

### Tests first

Which cases depends on the pick.

- **(a)** `manifest.test.ts` holds each theme's manifest to its ground, and every other field
  (`id`, `start_url`, `scope`, the icons) to the first's; `theme.test.ts`, that the pre-paint
  script links the stored theme's manifest before the bundle, and under System the device's
  scheme's; `applyTheme` links it again when the theme changes; `install.spec.ts` reads each.
- **(b)** `manifest.test.ts` holds the manifest to the new token.
- **(c)** Nothing runs; the docs are the change.
- **Put the fault back:** under (a), one file's `theme_color` changed alone, and the pre-paint
  script no longer linking, each goes red, the second at the reload; under (b), the token changed
  alone.

### What the check found, 27 November 2026

**Something newer had changed, and it is what the phone measured.** Read in Chromium's source and
code reviews on 27 November 2026, with Android's stable channel at 158 and 159 rolling out:

- **Since Chrome 153, stable from 8 September 2026, an installed app's navigation bar is its
  manifest's `theme_color`.** [CL 8077818](https://chromium-review.googlesource.com/c/chromium/src/+/8077818),
  merged 6 August 2026, fixed crbug 40759522 behind `WebAppNavigationBarThemeColor`, on by
  default; before it Chrome *"left the Android navigation bar at the platform default"*.
  `WebappIntentDataProvider.java` takes `theme_color` alone, from the WebAPK's own copy of the
  manifest: `background_color` has no part in it, and only the WebAPK built again changes it.
- **Nothing colours it from the page.** `BaseCustomTabActivity.updateNavigationBarColor` runs on
  every change of the page's `theme-color`, and outside edge to edge applies the manifest's colour
  each time. The one change that reads the page's,
  [CL 8227486](https://chromium-review.googlesource.com/c/chromium/src/+/8227486), picks light or
  dark buttons, and only while the app draws edge to edge.
- **No manifest's dark-scheme colours are read.** Their parsing was deleted on 21 May 2024,
  [CL 5532134](https://chromium-review.googlesource.com/c/chromium/src/+/5532134), *"as this
  feature is not shipping"*, and the parser reads one `theme_color` and one `background_color`.
  Android keeps a dark colour's slot, which nothing fills.
- **Edge to edge reaches an installed app only in an experiment**, `WebAppShortEdgesCutoutMode`,
  off by default, with a second default-off switch, `enable_standalone`, for a standalone app
  ([CL 8447912](https://chromium-review.googlesource.com/c/chromium/src/+/8447912)), and only for a
  page declaring `viewport-fit=cover`, which this one does not. The code says *"the experiment
  targets fullscreen web apps"*; its flag runs to M163. Chrome's general edge to edge is refused
  in an installed app: *"Currently edge to edge only supports CCT media viewer."*
- **(a)'s two conditions, which this section had the phone measure, were in the source.** A
  manifest at a new address is followed while its `id` matches, and its address kept
  (`webapk_update_data_fetcher.cc`, lines 162 to 179; the comment above them still says a moved
  manifest is another app, from before `id`). The lag is a check on a launch once 24 hours have
  passed, then a WebAPK built once the app is closed and the phone is charging on Wi-Fi
  (`WebApkUpdateManager.java`, `WebappDataStorage.java`, and web.dev's page, the English one, last
  updated 19 September 2024), and every 30 days only after a failed update. The user's
  `about://webapks` said *Check for Updates Less Frequently* `false`.
- **The Discourse thread had not moved**: 34 posts, the last on 3 September 2025. GitHub PRs in
  other projects describe the same bar with Chrome versions that disagree, and nothing rests on
  them.

### Built, 27 November 2026

Tests first, each shown red before it went green, on `bottom-bar-follows-theme` from `0a5514b`:

| Step | What it holds |
|---|---|
| Red | `manifest.test.ts`'s four cases for the manifest a theme links, `theme.test.ts`'s five and one widened, and `install.spec.ts`'s one: nine red in Vitest for want of `manifestOf`, then five for want of the files and the script's link |
| `manifestOf` | `theme.ts`: `MANIFEST`, `manifestOf`, and `applyTheme` and `applyMine` linking it, a theme of your own its base's |
| The script | `index.html`'s pre-paint script links the stored theme's manifest, and leaves a page with no link alone |
| The files | Seven in `public/`, `manifest-<theme>.webmanifest`, each System's with its `theme_color` line alone replaced by the theme's ground |
| Docs | `docs/design.md`, `docs/deploy.md`, `docs/history.md`, CLAUDE.md and this section |

**Decided at the build, for the user to object to:**

- **Shelf Light links System's manifest** rather than a copy of its own, since the two would be
  the same file: seven new files, where the plan said eight.
- **`install.spec.ts` imports `THEMES` and `manifestOf` from `src/`**, the first spec to import
  anything but a type from there, so the rule is written once in code and once in the script.
- **The panel that makes a theme of your own moves the manifest as it tries each base**, as it
  already moves the bar above; *Cancel* puts back the worn theme's, as it puts back the bar.

### Tests

**The full e2e suite went 279 green**, the 278 before and 1 new. **Vitest went 1,706 green**,
from 1,697, and the type check, which covers `e2e/`, was clean. **In Playwright's Firefox**,
`theme.spec.ts` 13 passed and 1 skipped: the pre-paint script, before the bundle and after.

- **The files**: `manifest.test.ts`, four cases. System's for System and Shelf Light, each theme's
  `theme_color` its ground, every other field System's, and no manifest in `public/` that no theme
  links.
- **The script and the bundle**: `theme.test.ts`. The script linking every theme's manifest, and
  System's for System and for a value no theme answers; nothing else lost on a page with no link;
  `applyTheme` moving it; a theme of your own linking its base's, worn and before the bundle; and a
  record the script cannot read keeping System's.
- **Chrome itself**: `install.spec.ts`, in full Chromium, after a reload for each theme and for a
  theme of your own: the manifest Chrome reads, its `theme_color` the ground the page paints, and
  `in-incognito` the only reason not to install.

### Checked by putting each fault back

One at a time against the finished build, each file restored after its run:

| Fault | Red |
|---|---|
| Dusk's `theme_color` drifts in its file alone | *gives the installed app's bar at the bottom each theme's ground* |
| Ember's manifest gets an `id` of its own | *differs from System's in its theme_color alone, so the installed app stays one app* |
| The pre-paint script no longer links | *is the stored theme's before the first paint, and System's for System* and *links its base's manifest before the bundle too*; and in Chromium `install.spec.ts`'s new case at its first reload, Frost's manifest expected and System's read |
| The script's guard for a page with no link removed | *costs the script nothing else when the page links none*, and two of a theme of your own's cases before the bundle |

### What the plan got wrong, or left out

- **The newer thing was the cause, not a fix.** The plan read the thread as Chrome not reading the
  page. Chrome 153 is what began painting the bar from the manifest at all, and the thread is
  from a year before it, when the bar was Android's own.
- **Both of (a)'s conditions were readable in Chromium's source**, where the plan had the phone
  measure them. The phone still proves them after the deploy, because the update fetcher's comment
  and its code disagree.
- **`theme_color` alone**, which the plan could not separate from `background_color`: the source
  does, so every file keeps the paper as its `background_color`.
- **The plan's test list had System link the device's scheme's manifest.** The pick kept System on
  today's, so no case asks for one.
- **Nothing in the plan said the script must survive a page with no link.** An exception there
  skips the density and the journal, and three tests found it.

### Deployed

**At about 21:29 Eastern on 27 November 2026**, merged as PR #113 and deployed by the runbook in
`docs/deploy.md`, `bd0f672` to `cb0eb5d`, carrying #110's, #111's and #112's docs with it.
Frontend and docs only: no migration, no variable and no route. **api and caddy were both
recreated, api first**, because `aspnet:10.0` had moved upstream and its layers were downloaded;
the script took 27 seconds.

- **The bundle** went `index-BbPJB8Ld.js` to `index-D8kpQg1T.js`, where a local build said
  `index-CLrakKVn.js`. **The stylesheet** kept `index-D6mybYIa.css`, as the local build predicted,
  and was the local build's file byte for byte.
- **Counted with `grep -F`, each 0 then the local build's count**: the served `index.html`'s
  `'/manifest-' + theme` 0 then 1, and in the bundle `.webmanifest` 0 then 2, `/manifest-` 0 then 1
  and `link[rel="manifest"]` 0 then 1.
- **Each of the seven new manifests** went `text/html`, `try_files`' page, to
  `application/manifest+json` with `no-cache`, and **all eight were the commit's bytes**, by
  `sha256sum` against `git show cb0eb5d:…`.
- **`/api/auth/me` answered `null` (200)** before and after. The API's log had 11 `info` lines and
  no `warn`, `fail` or `crit`, and said *No migrations were applied*; Caddy's had no error.
  **Both timers ran five minutes on**, `Queued 0 titles for HowLongToBeat.` and `Release refresh
  brought 15 not-yet-released titles up to date.`, waited for with a background until-loop over
  `ssh … docker compose logs api --since 20m`, and still no `warn`, `fail` or `crit`.

### On the phone, after the deploy

**Measured on 27 November 2026, another way**: the user uninstalled the app and installed it again
rather than asking for an update, and reported the bar at the bottom right. A fresh install is
built from the manifest the page links, so that proves the link and the files. **Chrome updating an
app already installed, at a new address under the same `id`, is not yet seen**: the next change of
theme is its test. The steps below are how to ask for that update by hand.

The measurement's own steps (the memory *Jimmy uses Android*), as web.dev's page has them for an
update asked for by hand. Without them the app updates itself on the first night it is closed on a
charger and Wi-Fi, once a day has passed since its last check.

1. **Dusk chosen**, plugged in and on Wi-Fi: close the installed app and force stop it in Android's
   app settings. In Chrome, `about://webapks`, *Update* under HobbyTracker, and *Update Status*
   says *Pending*.
2. **Open the app**, let the board load, and close and force stop it again. Within a few minutes
   *Update Status* says *Successful* and *Theme color* `#2a323c`.
3. **Open it and sample the bar at the bottom**, as on 25 November: Dusk's ground. Then Shelf Light,
   whose bar is the paper by choice now, and a theme of your own, whose bar is its base's ground,
   each after steps 1 and 2 again.

---

## 32. A queue for adding many games at once · planned

**Planned 25 November 2026**, at the user's request, a workshop first. The biggest of the four.
Lines were read at `762161f`.

**Why.** #24 made it possible to add a game finished long ago, and once its name is found that is
a press and an Enter. Entering a history of past games is still one search and one add a game, a
game at a time, and that is slow.

**What.** A list kept apart from the board: games go into it without being added to the board
yet.

- **Two ways in.** From search, *add to queue* alongside the Backlog, Playing and Completed
  buttons. And a text box where a list of game names is pasted, each matched against IGDB. A name
  with no clear match is flagged for the person to settle, never guessed, in the spirit of the
  HowLongToBeat matcher.
- **The first version, agreed with the user**: select several games in the queue; set a column,
  Backlog, Playing or Completed, and for Completed a finish year with #24's year-only dates,
  *I don't remember* too; remove from the queue; then add the selected games to the board in one
  go, each dated as a drag or #24's panel would date it.
- **Later, and not in the first version**: a rating, hours, and anything done in bulk to titles
  already on the board.

**What it builds on.**

- **The add is a route already.** `POST /api/library/{mediaId}` takes `AddToBoardRequest`: a
  column, and for Completed `completedYear`, `undated` or neither, which is today, and
  `hoursPlayed`. 409 for a title already on your board, 404 for one the catalogue does not hold,
  and `AddingToBoardTests` holds that an add leaves exactly what adding to Backlog and dragging
  would.
- **The tile's control is one control in equal thirds** (`search/AddControl.tsx`), which every
  search result and Discover tile share. **A part for the queue changes the Settled row *Adding
  from a tile***, "+ ▶ ✓, one control in equal thirds", in the same PR, as #25 changed #21's.
  `ADD_STATUSES` in `hobbies/index.ts` lists the columns a tile adds to; the queue is not a
  column, so it is not a fourth.
- **#24's panel**, `search/WhenFinished.tsx`, asks *When did you finish it?*: a year, *Today* or
  *I don't remember*, and an optional hours box. `search/lastYear.ts` keeps the year added last,
  per board, for the visit.
- **The app already refuses to guess at a name.** `Services/HltbMatcher.cs` takes a candidate only
  above a threshold *and* a margin over the runner-up, 0.9 and 0.05 in `HltbOptions`; numerals
  must agree outright, and roman numerals are folded first. The two *Resident Evil 4*s, 2005 and
  2023, both score 1.0 on the title, and only a year tells them apart: that matcher has IGDB's,
  and a pasted name has none. IGDB's search order (`IgdbRelevance`) is a ranking for a person to
  choose from, not a match.
- **Nothing in the app selects several things for one action today.** The boxes in Settings and
  the share dialog are settings, and the picker's chips are a filter. This is the first, on a
  phone as well as a desktop.

### Decide at pickup

- **Where the queue lives in the app.** Open: the user has not decided, and the workshop proposes
  a place. Render: a page of its own beside Discover and Stats, offered under the empty search box
  as Discover is; a panel over the board, as the picker is; a strip under the search box while the
  queue holds anything. Recommended: the page. A paste box and a list to select from want width a
  panel over the board does not have, a page is a phone's own shape, and the board's drag stays
  out of it. A page is a new route, which **Settled**, *Scope*, lists.
- **How selecting works, on a phone and a desktop.** Render: a box on every row, always shown,
  with *Select all*; a long press to begin, as Android does, which nothing here uses off the
  board; Shift-click for a run of rows on a desktop as well. And where the bar that acts on a
  selection sits: pinned to the foot on a phone, under the list's heading on a desktop.
  Recommended: boxes always shown, since selecting is what the page is for.
- **What the bar holds.** One column for everything selected, and for Completed a year or *I don't
  remember*, so a history goes in a year at a time. Whether *Today* sits beside them as in #24's
  panel; recommended, so the queue and the tile never disagree about what a finish can be. Whether
  the year box starts at the year added last; recommended, `lastYear.ts`'s.
- **What the paste box says about a line.** Rendered with a real list: matched, with the cover and
  year of what it matched, so a wrong match is seen before it is added; *Which one?*, with the
  candidates side by side; *Not found*, with the line kept to edit and search again; and *On your
  board · Completed* for a title already there. And whether a line may carry a year,
  *Resident Evil 4 (2005)*, to break a tie as IGDB's year breaks one for HowLongToBeat's matcher.
- **Whether a name still to settle waits in the queue.** Recommended not, in the first version:
  the paste box settles its lines before they go in, so the queue holds titles alone, in one
  shape, and a line nobody settles stays in the box as text.
- **Kept where.** Recommended: per account, a table beside `discover_hides`, because a history
  entered over several sittings, on a phone and then a desktop, should be one list. Per browser is
  where every preference is kept, and a list of titles is not a preference.
- **One request a game, or one for the lot.** Recommended: the route that exists, once a game and
  one after another. Every rule #24 put on it holds as it is, and a 409 is one game's answer
  rather than the whole add's. One route for the lot is one transaction, all or none, and a second
  set of rules.
- **Which surfaces offer *add to queue***: search, as the user named, or Discover's tiles too,
  since they share the control and Most played is the list a board is filled backwards from.
  Recommended: both.
- **A title not out yet** offers *Add to calendar* alone on its tile. Recommended: no *add to
  queue* there, and a pasted name that matches one says so, since a history is of games that are
  out.
- **Games first, never a branch on the slug.** The queue follows `HobbyDefinition`, and a paste is
  matched through the hobby's own search, so films follow with TMDB's.

### Things to get right

- **IGDB allows 4 requests a second, and a search sends two at once**
  (`IgdbClient.SearchGamesAsync`). A 429 is an exception and a 502, never a back-off, because "a
  single user searching will not get near it". A pasted list of forty names is eighty requests,
  twenty times the limit if sent at once. Paced, a name at a time, or behind a throttle such as
  HowLongToBeat's.
- **A lookup is a search, and a search upserts what it returns into `media`**, so a paste grows the
  catalogue as typing those names would.
- **Every add goes through tracked entities**, so each writes its `status_changes` row. CLAUDE.md,
  **What fails silently**, names an import; the route that exists already does it.
- **Each add finds the top of its column by reading it**: `BoardPositions.TopOfColumnAsync` is the
  lowest position less one, read and then written. Two adds at once can read the same top, and
  adds sent in the queue's order leave the column in reverse. Decide the order a selection lands
  in, and send them one after another.
- **A column stops at 100 titles.** CLAUDE.md's **Small things** says any import will hit it, and
  this is the first thing here that imports. In the copy of the user's board from 3 November that
  #29's workshop used, Completed held 64 under All years; a history of forty takes it past 100,
  where it says *Showing 100 of N* with no way to the rest. The workshop should know, and whether
  *Load more* comes first is the user's call.
- **A table of yours means new scoping sites.** `log_entries` and `notes` are yours and `media` is
  shared; a queue is yours, read and written through `ICurrentUser`, each site with a test that a
  stranger's queue never shows.
- **Deleting an account takes the queue with it**, by a cascade on `user_id`. Whether the deletion
  warning counts it is a choice; it does not count #23's hides.
- **Nothing counts the queue at you**, per *HobbyTracker is for leisure*. The way in may say what
  is queued; nothing nags.
- **A share never shows it.**

### Tests first

- The paste: a name matching one title clearly is matched; *Resident Evil 4* is *Which one?*, never
  either; *Final Fantasy VII* never matches *VIII*; a name with nothing is *Not found*; a title on
  the board says its column; each line is asked about once, one after another.
- The queue is yours: two people's never meet, and deleting an account empties it.
- Adding a selection, to Backlog, to Playing, and to Completed with a year, *I don't remember* and
  today: each title leaves exactly what the tile's add would, `AddingToBoardTests`' equivalence
  over the queue, and writes its history; added titles leave the queue, removed ones leave it with
  the board untouched, and a title added elsewhere meanwhile is reported, not added twice.
- A tile's *add to queue* puts the title in the queue and not on the board, and the tile says so.
- At 390, selecting and the bar, in Playwright's phone block.
- **Put the fault back:** let the matcher take IGDB's first result, and *Resident Evil 4* goes red;
  send the adds at once, and the order test goes red.

### The workshop, 27 November 2026

On branch `queue-for-adding-many` from `2bd6022`. Round one in words; then renders from real data
of the three the section names (where the queue lives, selecting and its bar, what the paste box
says about a line), and of the tile's part for the queue and what a tile says once a title is
queued, which the plan does not list but which are decided by eye and change **Settled**, *Adding
from a tile*.

**Found by reading, before round one:**

- **Your board holds versions, filed under the originals' names.** *Castlevania: Aria of Sorrow*
  and *Circle of the Moon* are IGDB's 2021 entries (the Advance Collection's platforms), *Dawn of
  Sorrow* its 2024 one, *Symphony of the Night* the 2007 PSP one, and *Metal Gear Solid 2* the
  Master Collection Version. So a clear match can still be the wrong version, and the plan gives a
  matched line no way to choose another; the paste box's renders draw one.
- **A column's manual order is written for the ids a reorder sends** (`ReorderAsync`, positions
  0 to n − 1), so a column dragged with only its first 100 loaded would leave the rest interleaved
  among them. That is Load more's own decision, whenever it is built.
- **On 3 November Completed held 64 under All years**: 15 in 2024, 28 in 2025, 21 in 2026. A
  history added with #24's years lands in its own years, so the board's default year is untouched,
  and All years passes 100 at 37 more. **Read fresh from production after round one** (read-only,
  `workshop.local/queue-for-adding-many/read-board.sql`): 101 titles on the games board, **Completed
  75 under All years**, 15 in 2024, 28 in 2025 and 25 in 2026, and seven finishes kept as years
  since #24 (*Persona 5* 2017, *Hollow Knight* and *Devil May Cry 5* 2019, *Ghost of Tsushima*
  2020, *Monster Hunter Rise* and *Scarlet Nexus* 2021, *Metal Gear Rising: Revengeance* 2023). So
  All years passes 100 at 26 more.

**Round one, in words.** Two of its questions are from **Things to get right** rather than
**Decide at pickup**, because the section says they need deciding: whether the deletion warning
counts the queue, and the order a selection lands in.

| Choice | Picked | Against |
|---|---|---|
| Where a line still to settle waits | **In the paste box, for the visit**, recommended: the box settles its lines before they go in, so the queue holds titles alone, in one shape, and a line nobody settles stays in the box as text until the page is left | the box kept per browser, its lines surviving a reload there; in the queue too, as a row of its own (*Which one?*, *Not found*) |
| Kept where | **Per account**, recommended: a table beside `discover_hides`, read and written through the session, one list across a phone and a desktop, each new scoping site with a test that a stranger's queue never shows | per browser, in `localStorage`, a phone's and a desktop's two lists |
| Requests | **One a game, in turn**, recommended: `POST /api/library/{mediaId}` once a game, one after another; every rule #24 put on it holds as it is, and a 409 is that game's answer, on its row | one route for the lot, one transaction, all or none, and a second set of rules |
| Which tiles offer it | **Search and Discover**, recommended: both share the control, and Most played is the list a board is filled backwards from | search alone, as the plan named it |
| A title not out yet | **Never queued**, recommended: no part for the queue on its tile, and a pasted name that matches one says so rather than queuing it, since a history is of games that are out | queued, its add from the queue putting it on the calendar whatever column the bar names |
| Which boards | **Games first**, recommended: the games board alone in the first version, carried by `HobbyDefinition` and never a branch on the slug, so films, TV and anime follow by filling in theirs, each matched through its own hobby's search; the matching is measured on IGDB alone | every board at once, as #18 and #24 went, each measured on its own provider |
| What the bar holds | **Today beside a year and *I don't remember*, and the year box starting at the year added last**, both recommended: #24's panel's three answers, and `lastYear.ts`'s year, shared with the ✓, so the queue and the tile never disagree about what a finish can be | Today with an empty box; no Today with the last year; no Today with an empty box |
| A year in a line | **Yes, a release year**, recommended: a year in brackets at the end of a line, *Resident Evil 4 (2005)*, is read as the release year and only breaks a tie between titles that match equally, never refusing a lone match, `HltbMatcher`'s rule | no year, every tie *Which one?*; a finish year too, so a history goes in at once rather than a year at a time (not in the plan, and wider) |
| The 100-title column | **Load more first, as its own PR**, recommended: planned as #35 below and built before this, on Discover's Load more, whose look is picked already. So **#32's build waits for #35** | first, as the first step of this branch, one PR for both; after the queue, *Showing 100 of N* under All years until then; not planned |
| The deletion warning | **Does not count the queue**, recommended, as it does not count #23's hides: the queue is titles on no board yet. The queue still goes with the account, by a cascade on `user_id` | counts it: *… 41 notes, 12 pictures and 30 games in your queue* |
| The order a selection lands in | **The queue's order**, recommended: sent last first, so the column reads top to bottom as the queue did under *My order*, the first selected on top | reversed, sent first first, the last selected on top |
| The renders' data | **The user's own list**, pasted as they would write it, every line asked of IGDB live through the app's search, **and the games board read fresh from production**, read-only | the user's list and the 3 November copy; a list written from the board's series, either board |

**The user's list, measured, 27 November 2026.** *"A list I would probably do is"*: `MGSV`, `Link
to the Past`, `Celeste`, `sekiro`, `totk`, `a link between worlds`, `DMC4`, `persona 4`, `origami
king`. Every line went through the app's own search (`GET /api/games?search=`, the strip's default
limit of 20) on a workshop API with the real IGDB behind it and a database of its own,
`hobbytracker_queue`, then IGDB was asked by id for what a tile is never sent: alternative names,
rating counts, the kind of entry and what it is a version of. Six rules were run over the
answers, each keeping `HltbMatcher`'s checks (numerals agree, 0.9 alike, 0.05 ahead, the year as a
tie-breaker alone), ported line for line in `workshop.local/queue-for-adding-many/matcher.mjs`:

| Rule | The user's nine | Asked | Wrong |
|---|---|---|---|
| The plan's: `HltbMatcher` over the name and IGDB's alternative names | 6 matched | *Link to the Past*, *totk*, *a link between worlds* | none |
| **The name or an alternative name, then the part after the colon when none is close** | **7 matched** | *Link to the Past* (the 1991 SNES game, the 2002 GBA one, and an unrelated *Trump Anthology Episode 1: A Link to the Past*); *totk* (2023, or the 2025 Switch 2 Edition) | none |
| The same, and a tie between a game and its own port or expanded edition goes to the game | 8 | *Link to the Past* | none here; the user's 2021 *Aria of Sorrow* and *Circle of the Moon* and 2024 *Dawn of Sorrow*, all on the board, each match the GBA or DS original |
| The same, and a tie goes to one rated by five times as many | 9 | — | the same Castlevania cost |
| The name alone | 2 | the other seven | none |
| IGDB's first result, the plan's named fault | 9 | — | *persona 4* is Golden, and *Dawn of Sorrow* is *Aria of Sorrow* |

- **IGDB lists the user's shorthand as alternative names**: `MGSV`, `TotK`, `DMC4`, `SEKIRO`,
  `Origami King`, and `P5R` and `BotW` in the lines added below. That is why even the plan's rule
  matches six. A search tile is never sent them, so the paste has to ask IGDB for
  `alternative_names` itself.
- **The part after the colon is tried only when no name is close.** Mixed into one pass,
  *Final Fantasy VII* answered to *Crisis Core: Final Fantasy VII* and *Dirge of Cerberus: Final
  Fantasy VII* as well as itself.
- **IGDB files a game several times under one name**: *Resident Evil 4* four times (the 2005
  original, the 2023 remake, the 2011 remaster and the 2005 PC and PS2 version), *Final Fantasy VII*
  five, *Aria of Sorrow* four. **A year in brackets narrows and may not settle**: *Resident Evil 4
  (2005)* still leaves two, both 2005, so it still asks.
- **Lines added to reach the states the list did not**, each labelled where shown: *Resident Evil 4*
  and *Resident Evil 4 (2005)* (*Which one?*), *Final Fantasy VII* (never *VIII*; five of the same
  name, so it asks), *Hollow Knight* (on the board, Completed 2019), *The Elder Scrolls VI* (not
  out, no date), *sekrio* (nothing at all). And ten more in the list's own shorthand, under the
  picked rule: `ff7 remake`, `botw`, `pokemon red`, `witcher 3` and `p5r` matched; `mgs3` asks
  between *Snake Eater* and *Subsistence*; `smash bros` and `zelda` have nothing close; `re4 remake`
  and `ac unity` find nothing, because IGDB's own search finds nothing for them.

| Choice | Picked | Against |
|---|---|---|
| What counts as a match | **The name or one of IGDB's alternative names, then the part after the colon when none is close; a tie is *Which one?***, a year in brackets breaking it first, recommended. Seven of the nine, none wrong | the same with a game winning a tie over its own port or edition (eight, and the Castlevania cost); with the far more played winning a tie (nine, the same cost); the plan's, names alone (six) |
| A line with nothing close | ***Which one?*, the search's best three**, recommended: *smash bros*, *Melee · Ultimate · Brawl*; a press picks one, or the line is edited | *Not found*, as a search that found nothing is |
| The user's *Persona 4* | **The 2008 game**, so the name's match on the list was right | Golden |

**Round two, in renders, 27 November 2026**, from https://claude.ai/artifact/DvZcqSu5Tg2HnAVLtojRYt.
The shipped app on Vite alone, every `/api/` request answered from a stage of the board read that
day and the search answers the workshop API saved, with four `resolveId` swaps: `./App` from
`main.tsx` for one more address, `../search/BoardSearch` from `BoardPage` for the way in, the
strip and the panel, and `AddControl` from `SearchResult` and `WallTile` for the tile's part. The
queue itself is `QueueProto.tsx`, behind `?place=&way=&flow=&select=&bar=&paste=&sel=&col=`, read
once at load, and `AddControlProto.tsx` behind `?part=&queued=`. Shot at 1440 in Shelf Light and
Shelf Dark and at 390, 41 shots, every caption's number from `measures.json`. All in the gitignored
`frontend/workshop.local/queue-for-adding-many/`.

| Choice | Picked | Against |
|---|---|---|
| Where the queue lives | **A page of its own**, `/board/games/queue`, beside Discover and Stats, recommended: at 1440 the paste box and the queue side by side, the queue's first row 280px down; on a phone they stack, and after a paste of nine the queue starts 1,513px down. A new route, so it changes **Settled**, *Scope* | a panel over the board, as the picker is, 2,011px tall with the nine pasted and the queue 1,275px down, below a 900px window; a strip under the search box, which while the queue holds anything starts the board 386px lower on every visit (276 to 662), and at 1,709 with the paste open |
| The way in | **The same words always**, a line of its own under Discover's while the box is empty, recommended. It costs the board 24px. Drawn as *Adding a lot at once? Paste a list*, and **the words became *Open your queue* in the follow-ups below** | *Your queue · 9* while anything is queued |
| The tile's part | **A fourth quarter of the one control**, recommended: + ▶ ✓ and the queue's mark, three lines of a list and a plus drawn as the others are, in quarters for thirds, 31px on the strip where a third is 42, and 40 on the wall at 1440. Named *Put Persona 4 Golden in your queue*, *Put in your queue* under a resting pointer | a button of its own beside the control, the thirds 29px and the button 32 |
| A tile once queued | ***In your queue* where the control was**, with the mark, as a title on the board says its column, recommended. It comes back out on the queue page | the part pressed in the accent with + ▶ ✓ still there, a second press taking it out |
| When a found line goes in | **At once**, recommended: a found line says *In your queue* with *Not this one* beside it, which takes it back out and offers the choices; the queue is where a match is checked, and nothing reaches the board until the bar adds it | on a press, the lines waiting with *Change* beside each and *Queue the 7 found* |
| What the box says about a line | **As drawn**, recommended: the line as typed above every answer, so a wrong match is read against what was written; then the title with its cover, year and platforms; *Which one?* with the choices side by side, for a tie and, with *Nothing is an exact match*, for nothing close; *Not found* with the line in a box to edit, *Search again* and *Drop it*; *On your board · Completed*; *Not out yet, so not queued*; and *Looking…* while lines are asked one at a time | the typed line only above *Which one?* and *Not found* |
| Selecting | **A box on every row, always, with *Select all*, and Shift-click for a run on a desktop**, recommended | boxes with no Shift-click; no boxes until a long press on a phone or a click on a desktop, then boxes and *Done* |
| The bar on a desktop | **Under the queue's heading**, the plan's and recommended: 46px tall, staying at the top of the window as a long queue scrolls. **On a phone it is pinned to the foot**, 112px in three rows at 390 | at the window's foot, as on a phone |

**Found while rendering, and asked after round two**, from sections 9 and 10 of the same page:

| Choice | Picked | Against |
|---|---|---|
| Found lines after a paste | **Every line stays in the box** until *Paste more* or the page is left, recommended: each match is read against what was typed, the reason the typed line was picked. The cost, on the page: found lines are listed twice, in the box and in the queue, which side by side at 1440 costs nothing, and stacked on a phone puts the queue 1,513px down after nine lines | the found ones folded into *7 found, now in your queue* with *Show them*, the box on a phone 585px where it is 1,251, and the queue 847px down |
| A way to the queue from Discover | ***Your queue* in Discover's header**, beside *Back to your board* and drawn as it is, with the queue's mark before it as the hidden count has its eye, and no count, recommended | nothing new, the board's line the only way |
| The way in's words | ***Adding a lot at once? Open your queue***, recommended, with no count as round two picked. The words drawn in round two, *Paste a list*, named only the paste, and a title queued from a tile would never be found by them; the page the link opens offers the paste box | *Paste a list*, as drawn; *Paste a list into your queue* |
| The queue's order | **The order the titles went in**, the first on top, recommended: a pasted list reads as written and lands on the board that way, and a title queued from a tile goes to the bottom | newest on top |

**Every pick of the workshop was the recommendation**, 26 of them: twelve in round one, two from
the user's list (the rule and a line with nothing close), eight in round two and four after it.
The third question on the list was a fact rather than a pick: the user's *Persona 4* was the 2008
game.

**Decided without asking, for the user to object to:**

- **A line whose match is already queued says *Already in your queue*** and is not queued twice,
  and a blank line or one pasted twice is skipped.
- **A title that reached the board some other way meanwhile is reported on its row** when its add
  answers 409, *Already on your board · Playing*, and leaves the queue with the titles added.
  Added titles leave the queue, the selection empties, and the bar goes.
- **The bar's year is `lastYear.ts`'s**, set by an *Add* with a year from the bar as from the ✓, so
  the next batch starts at the year the last went in.
- **Lines are asked about one at a time, in the order pasted**, each a search inside IGDB's four a
  second, and the box says how many are left. No cap on a paste's length.
- **The matcher is the server's, pure and beside `HltbMatcher`**, with IGDB's alternative names
  asked for by the paste's own question, so a search tile's contract does not change. The rule is
  the picked one, with `HltbMatcher`'s checks and options.
- **The queue is a table beside `discover_hides`**: one row per person per title, keyed on
  `(user_id, media_id)`, with its place in the queue, cascading from `users` and from `media`. A
  board's queue is its titles of that hobby.
- **A board with no queue in its definition has no page, no part on its tiles and no line**: the
  address goes to the board, as Discover's does on a board with none.

### The build, in order

**It waits for #35**, a column's Load more, built and shipped first as its own PR, the user's pick.
Then, tests first in each step, each shown red, each fault put back afterwards, a commit per step.
The picked looks are `QueueProto.tsx` and `AddControlProto.tsx` in
`frontend/workshop.local/queue-for-adding-many/`, behind `?place=page&way=words&flow=auto&select=boxes&bar=under`
and `?part=quarter&queued=chip`, the reference for values. The way in's words are the follow-up's,
*Open your queue*, where the prototype says *Paste a list*; the Discover link was drawn by DOM
surgery in `shoot-followups.mjs`.

1. **The matcher**, pure: the user's nine and the added lines as cases, from `searched.json` and
   `facts.json`, and **Tests first** above. Fault: take IGDB's first result, and *Resident Evil 4*
   goes red.
2. **The paste's question**, a line at a time through the hobby's search with alternative names,
   behind a throttle inside IGDB's four a second.
3. **The queue's table and routes**, each scoping site with a stranger's-queue test red first, and
   deleting an account emptying it.
4. **The page**, `/board/:hobby/queue`: the paste box and its states, the queue, the boxes,
   *Select all* and Shift-click, the bar under the heading and pinned at a phone's foot, and the
   adds one after another in the queue's order, sent last first. Fault: send them at once, and the
   order test goes red.
5. **The tile's quarter and *In your queue***, the way in, and Discover's link. **Settled**,
   *Adding from a tile* becomes quarters and *Scope* gains the address, in the same PR.
6. **e2e**: the paste against the IGDB stub, which needs alternative names and the two *Resident
   Evil 4*s; selecting and the bar at 390 in the phone block; the keyboard in Firefox too.
7. **Docs**: this section, `docs/board.md`, `docs/games-igdb.md`, `docs/data-model.md`,
   `docs/auth.md`, `docs/api.md`, `docs/design.md`, `docs/history.md`, and CLAUDE.md's rows.

**Where it stands.** Branch `queue-for-adding-many` from `2bd6022` holds this section, #35's, their
status rows and CLAUDE.md's lines, **uncommitted**. The workshop database `hobbytracker_queue` is
on the local Postgres; the workshop servers are stopped.

---

## 33. Month and week views of the release calendar · planned

**Planned 25 November 2026**, at the user's request. Lines were read at `762161f`.

**What exists already.** *Coming soon*, under the board, is an agenda (`board/ComingSoon.tsx`):
Backlog's titles not out yet, a row each, under headings for this month, a month, a quarter, a
year, and *No date yet* last. Each title sits at the last day it could come out (#11), the first
20 dated titles are shown and the rest folded (`SHOWN_AT_FIRST`), and a row opens the journal.
Side by side it is two of the board's tracks wide (`calendarSpan`), it folds by #29's arrow,
remembered per board, and a share shows it when *Coming soon* is ticked.

**A date is kept only as precisely as the publisher announced it** (#11, and `docs/games-igdb.md`,
**The shapes a date arrives in**): a day, a month, a quarter, a year, or none. `ReleasePrecision`
is `Day`, `Month`, `Quarter`, `Year` or `Unknown`, and a window carries its first and last days.
**Only a day counts down** (`countsDown`), and never for a cancelled title.

**What.** A month view, and perhaps a week view, as a choice beside the agenda.

### Decide at pickup

- **Where the titles with no day go.** Only a title with an exact day fits a square on a grid.
  Render: a strip above the month for that month's month-only titles; quarters, years and undated
  titles in a list under the grid, as the agenda's tail; the grid holding days only, and the rest
  left to the agenda. Recommended: a month's titles in its strip, a quarter in the strip of the
  month it closes on, since #11 files it at its last day, and a year and the undated in the agenda
  only, since a year's strip would sit under December for a title that may come in March.
- **A week view at all.** Worth it only if enough of a real board has exact days. **Read the user's
  real calendar before drawing one**, as #19's workshop read the board: how many titles have a
  day, and how many fall in any one week. If most weeks are empty, a week view is a page of
  nothing.
- **Choosing the view.** Recommended: a switch in the calendar's heading beside its arrow, *Agenda
  · Month · Week*, the agenda the default; remembered per board and per browser, as its fold is;
  and on a share, for the visit alone, as #29's collapse is.
- **The width.** Side by side the calendar is two tracks wide: at 1440 with five columns, two
  266px tracks and a 16px gap inside 24px of page padding, about 547px, which is 78px a day across
  seven; with four columns 688px, 98px a day. A cover and a name do not fit 78px. Render: the
  month at two tracks, covers only; the month across the whole board, which changes **Settled**,
  *Coming soon*'s "two of the board's tracks wide"; a month as a list of weeks.
- **On a phone, from the start.** At 390 the page's 16px each side leaves 358px, 51px a day before
  the calendar's own padding. Render: a grid of marks that opens a day's titles under it; a week as
  seven rows rather than seven columns; the agenda alone on a phone.
- **Which day a week starts on**: Sunday or Monday.
- **How far it goes.** Recommended: a month at a time with arrows, from this month to the last
  dated title's.

### Things to get right

- **Never a day nobody named** (#11): a month, a quarter or a year never lands in a square, and a
  test says so with every precision.
- **A release day is a calendar day and never goes through the zone** (`lib/release.ts`;
  CLAUDE.md, **What fails silently**). Today's square is `todayHere()`'s day, the countdown's, so
  the zone is applied in the four places `docs/data-model.md` counts and no fifth.
- **A title in a square opens its journal and hands the keyboard back**, as a row does
  (`calendarTitleId`).
- **A cancelled title** says *Cancelled*, on its day or left to the agenda.
- **The grid's classes are whole names**: Tailwind scans source text, and a class built from a
  number paints nothing.

### Tests first

- Every precision placed: a day in its square; a month in its strip; a quarter, a year and an
  undated title where the workshop puts them, never in a square.
- Today's square is the day in New York: with the clock at 11pm Eastern on 30 November, already
  1 December in UTC, it is the 30th.
- The view survives a reload, per board; a share's is forgotten.
- At 390, the month fits the screen.
- **Put the fault back:** draw a window on its first day, and the never-a-day test goes red.

---

## 34. A better sign-in page · planned

**Planned 25 November 2026**, at the user's request, a workshop first, in renders, as the recent
features were. Lines were read at `762161f`.

**What it is today** (`shell/SignInPage.tsx`): a card on the theme's ground with a heading, one
sentence, and the Google and Discord buttons. The sentence is *"Your backlog, your ratings and
everything you have written about a game are yours alone. Signing in is what makes them yours."*
It still says *a game*, though four hobbies are live. After a delete the heading is *Account
deleted*, with a sentence of its own, and the keyboard goes to it.

**Who reads it.** It is the only page reachable without a session, and **a share sends people to
it**. *Make your own* in a share's banner goes to the board (`/board/games` from a games share),
and *Make your own board* on a dead link to `/`. Both are behind the session gate, so somebody not
signed in lands on `/signin`. The one stranger the app sends anywhere on purpose arrives having
just seen a board, and is asked to sign in without being told to what.

**What.** Say what the app is before asking anyone to sign in. The README's shots in `docs/shots/`
are a ready source: a demo account, light and dark pairs, already cropped and framed.

**What the code's comments settled, and what stays.**

- **The buttons are neutral and the marks are not**: `bg-surface` behind `border-line` with
  `text-fg`, and the provider's own colours only inside its mark. In the accent, *Continue with
  Google* was a green button with no Google about it, and a filled one would want an `--accent-fg`
  nothing has.
- **The ground is the whole viewport**, full-bleed, so the theme has nowhere to leak, as it once
  did on Ember either side of a 384px strip.
- **The providers are links, not buttons**: signing in is a top-level navigation answered with a
  302.
- ***Account deleted* is the heading after a delete**, holding the keyboard: picked from renders
  on 4 October 2026 over a line in place of the intro and a notice above it.

### Decide at pickup

- **What it says**, for every board rather than *a game*, and whether it names the four hobbies,
  which a fifth would change, or says what the app is without naming them.
- **Which shots, and how many.** Render: the hero alone; three, the board, the journal and Stats;
  a strip a visitor scrolls.
- **In whose theme.** Recommended: the reader's, the light shot under the three light themes and
  the dark under the five dark, by each theme's `color-scheme` in `index.css`.
- **Their weight.** The stills are WebP at 1,760px, from 57 KB (the calendar) to 301 KB
  (Discover) a file and the hero 133 to 136, and the wheel's GIF over 2,200 KB, in PR #111's
  table. A sign-in page is the first a visitor loads, often on a phone. Recommended: smaller
  copies made for the page, in `srcset`, and never the GIF.
- **Where the card goes.** Render: beside the shots on a desktop and under them on a phone; first,
  with the shots below it; over a shot.
- **The share's dead-link and unreachable cards** "are the sign-in screen's card" (`docs/design.md`,
  *Sharing*): whether they follow the new page or keep the card as it is.
- **Not to decide here, but to know.** A page that tells a stranger what the app is invites them to
  sign up, and sign-up is open (CLAUDE.md, **Small things**, *`Auth:AllowNewAccounts` does not
  exist*). It was kept open at #18's pickup, and a share's *Make your own* already invites it.

### Things to get right

- **The shots live in `docs/`, which the build never sees.** They are copied into
  `frontend/public/` or imported so Vite hashes them, and `docs/shots/` stays the README's.
  Whether the page's copies are made from the README's or retaken beside them is #30's harness,
  `frontend/workshop.local/readme/`, gitignored and so in one checkout alone.
- **Never production data**: the demo account's shots only (CLAUDE.md, **The map**).
- **A framed shot carries Shelf's colours**: the README's frames are a soft backdrop of Shelf's
  own, so under Blood Red or Dusk a frame is not the page's colour. The workshop renders all eight.
- **The providers keep their names and addresses, and the suite barely presses them.**
  `SignInPage.test.tsx`'s *offers every provider as a link* reads **every** link on the page and
  expects exactly the two, so a page that gains a link changes that case on purpose.
  `auth.spec.ts` checks only that both are shown; every other spec signs in by going straight to
  `/api/auth/{provider}/start` (`e2e/support/auth.ts`), past the page, so no spec presses one.
- **At 390** the buttons are on the first screen, or the page says how to reach them.
- **Each shot's alt text** says what it shows.

### Tests first

- The sentence speaks for every board that is built, never for *a game* alone.
- The heading and both providers, links with their names; after a delete, *Account deleted* is the
  heading and holds the keyboard, as now.
- The shots follow the reader's scheme: light under Shelf Light, dark under Dusk.
- At 390, both providers on the first screen, if the workshop picks that.
- e2e, and new: pressing a provider on the page signs in and lands on the board.
- **Put the fault back:** draw the light shot under every theme, and the Dusk case goes red.

---

## 35. A column's Load more · built

**Planned 27 November 2026, at #32's workshop**, the user's pick there: built **as its own PR and
before #32**, since the queue is the first thing here that imports and CLAUDE.md's **Small
things** says any import will hit the cap. Lines were read at `2bd6022`.

**What exists.** A column asks for its first 100 titles (`COLUMN_PAGE_SIZE` in `board/keys.ts`,
which is the API's `Paging.MaxPageSize`) and past them says *Showing 100 of N* under its cards
(`Column.tsx`), with no way to the rest. Read from production on 27 November, the games board's
Completed holds 75 under All years, so 26 more titles pass it; one year alone stays well under,
25 in 2026. `libraryStatuses()` and `wholeColumn` already page to the end, and a header's hours and
its counts are summed over the whole column on the server, so none of those change.

**What.** A *Load more* under a column with more to show, bringing the next 100, on Discover's
shape: the tile's add button at its own width, centred, picked for the wall on 24 September 2026
(`docs/games-igdb.md`, **The page, picked from renders**).

### Decide at pickup

- **What a drag does in a column partly loaded.** `PUT /api/library/order` takes the column top
  first, and `ReorderAsync` writes positions 0 to n − 1 for the ids sent, so reordering the first
  100 of 140 leaves the other 40 at their old positions, among the new ones. Dragging is allowed
  only under *My order*, whose loaded pages are always the top of the column, so one answer is
  for the server to number what was not sent after what was, in its own order; others are to load
  the rest before a drag can start, or a route that moves one title beside its neighbours, which
  `docs/board.md` set aside for its arithmetic. Recommended: the first.
- **How much a press brings**: the next 100, or the rest of the column at once.
- **Where the button sits** at 390, under the one column shown, and in a collapsed column (#29),
  which draws no cards and so no button.
- **A share's columns**, which are read the same way (`share/queries.ts`): the same button, or
  left as they are.

### Things to get right

- **The column's cache entry is one `LibraryPage` today**, and an infinite query changes its shape
  for every reader and writer: `useBoard`'s move written into the cache, `settleMove`, the
  switcher's counts (which read `total` through `columnQuery`), and a share's `sharedColumn`.
- **A card mounted twice** (`docs/board.md`): a move out of a column with two pages loaded must not
  leave the card in a page it left, and a later page must not carry a card an earlier one shows.
- **The keyboard goes to the first card a press added**, as Discover's does, or it is left on a
  button 100 cards down.

### Tests first

- A column of 140 shows 100 and *Load more*; pressed, it shows 140 and no button.
- A drag in a column with 100 of 140 loaded leaves the other 40 below, in their order.
- A card moved out of a column with two pages loaded is drawn once, in the column it went to.
- **Put the fault back:** number only the ids sent, and the drag case goes red.

### The workshop, 28 November 2026

On branch `column-load-more` from `queue-for-adding-many` at `7a3ed7b`, which holds #32's workshop
and this plan and is not on `main`. Round one in words; then renders of what is decided by eye
(the button's words and the line beside it, its place at 390, and what a column says at its end)
from the user's games board as read from production on 27 November.

**Found by reading, before round one:**

- **A year is a partial view of a column already, and the plan's fault is live.** A drag under a
  year sends that year's titles alone, and `ReorderAsync` numbers them from 0, so every year
  dragged in holds 0 upward. In the production copy, Completed under All years in *My order*
  alternates 2025 and 2026 card by card from the top, `0:2025 0:2026 1:2025 1:2026 …` to 24, then
  2025's last three, 2024's fifteen at 28 to 42 and one 2025 at 54; the seven finishes kept as
  years since #24 sit above them at −7 to −1, where an add lands. The partly loaded column is the
  same fault reached by a page.
- **Three sorts have no tie-break.** `Sorted`'s *Title*, *Rating* and *Length* arms order on
  values that tie, and Postgres promises no order among ties from one request to the next, so a
  second page can repeat a card the first showed and skip another. Completed holds 19 rated 8 and
  10 rated 9. *My order* ends on `Latest.Id` descending, and *Added* is that alone.
- **A share's column route takes a page already** (`SharedController`), so a share's Load more
  needs no server change; `sharedColumn` in `api/shared.ts` sends none yet.

**Round one, in words, 28 November 2026**, every pick the recommendation:

| Choice | Picked | Against |
|---|---|---|
| What a drag does in a column partly loaded | **The server numbers the rest after what was sent**, the plan's recommendation: `ReorderAsync` gives the ids sent 0 to n − 1 and every other title in the column the places after, in the order they had. The 40 not loaded stay below in their order, and a card moved in by its menu, a phone's segment or the column's empty space lands at the foot of what is loaded. The request is unchanged. **A drag under one year puts that year's titles above every other year's under All years, as a block**, which ends the interleave a year at a time | the same inside the year dragged in, the request naming it and other years keeping their numbers, so All years stays interleaved (found by reading); the rest of the column loaded before its order is written, the route unchanged and a drag waiting on a read; a route that moves one title between its neighbours, set aside in `docs/board.md` for its arithmetic |
| How much a press brings | **The next 100**, recommended: a page at a time, as Discover's brings the next 48, one request and at most 100 cards a press | the rest of the column at once: past 200, several requests of 100 in a row or a higher cap on the route |
| A share's columns | **The same button**, recommended: a share draws the board, and a visitor has no other way past 100. Nothing on a share drags, and its route takes a page already | left as they are, *Showing 100 of N* with no way to the rest |
| A collapsed column | **No button while folded, and its pages kept**, recommended: no cards, so no button, and the heading's count still says how many; opening it again shows the cards it had loaded and the button under them | Load more beside the sort control, opening the column and loading together; no button and the pages forgotten, so it opens again at 100 |

**Decided without asking, for the user to object to:**

- **Every sort ends on the newest pass first**, `ThenByDescending(row => row.Latest.Id)`, *My
  order*'s own tie-break, so a page never repeats or skips a tied card.
- **The renders' column past 100 is staged** as #32's queue would add a history with *I don't
  remember*: forty undated finishes, so they count under All years alone and every year's view is
  production's. The user's nine lines from #32's workshop first, each as it matched there, the two
  it asked about settled on the 1991 *A Link to the Past* and the 2023 *Tears of the Kingdom*;
  then thirty-one of IGDB's Most played as #23 measured it on 13 November, in its order, less the
  board's titles. On top of Completed in the queue's order, #32's pick, so Completed under All years
  holds 115: the first 100 are the forty and sixty of the user's, and Load more brings the user's
  last fifteen. Every card around the button is the user's.
- **A column keeps the pages it has loaded** through a move, an add, a removal, a write in the
  journal and the estimates' poll, refetched together. A reload, a new sort or a new year starts it
  at its first 100, as Discover's loaded pages are not in the address.
- **Discover's, each:** the keyboard goes to the first card a press added; a card a later page
  repeats is dropped; the button says *Loading…* while a page comes, and a page that fails says so
  by the button and leaves the cards.
- **The heading's count, the hours and the switcher's counts are unchanged**, each the whole
  column's already.

**Round two, in renders, 28 November 2026**, from https://claude.ai/artifact/KuJQpFFvcSz6zMMebTXpaU.
The shipped app on Vite with one swap, `./Column` from `BoardPage` and `../board/Column` from
`SharedColumn` to `ColumnProto.tsx`, a copy of `Column.tsx` whose Load more follows
`?words=&width=&end=&fail=`, read once at load; every `/api/` request answered by `stage.mjs` from
the production copy and the forty staged. Shot at 1440 in Shelf Light and Shelf Dark and at 390, 26
shots, every caption's number from `measures.json`. All in the gitignored
`frontend/workshop.local/column-load-more/`.

| Choice | Picked | Against |
|---|---|---|
| What a column's foot says while more is left | **Today's line over *Load more***, recommended: *Showing 100 of 115*, centred, over Discover's button word for word at its own width, 119 × 36, with twice the gap between cards above them, 24px at 1440 and 20 at 390. The one option that says how many are left when the heading is 14,151px up the page at 1440, and it changes nothing that is there today; 24px taller than the button alone | *Load more* alone, Discover's exactly; *Load 15 more*, the button saying what a press brings, at most 100, 137 × 36, which past 200 reads *Load 100 more* and no longer says how many are left |
| The button at 390 | **Its own width**, recommended: 119 × 36, centred, as Discover's is at every width | the column's width, 332 × 36 in a 358px column |
| Once the last page is in | **Nothing**, recommended: the button goes, and the column ends as every column ends today | a muted line where the button was, *That's everything here.*, the sibling of *Nothing here yet.*, 40px taller at 1440 |

**Shown with the picks, decided by what the app already does or by round one:** a press from the
keyboard leaves it on *Final Fantasy XVI*, the first card it added; *Loading…* dims the button,
which narrows to 114 × 36 as Discover's does; a page that fails puts the API's words in red over the
button, *An error occurred while processing your request.*, two lines in a 266px column, and a
press again is the retry; a collapsed Completed is its heading and 115, the hours and the sort,
142px tall, with no cards and no button; a share's Completed has the same line and button at its
foot.

**Every pick of the workshop was the recommendation**, seven: four in round one and three in round
two.

### The build, in order

Tests first in each step, each shown red, each fault put back afterwards, a commit per step. The
picked look is `ColumnProto.tsx` in `frontend/workshop.local/column-load-more/` behind
`?words=line&width=own&end=nothing`, the reference for values. Its later pages are plain queries
keyed with `'page'` and a number after the column's key, a workshop shortcut; the build is the
infinite query of step 3.

1. **The server numbers the rest after**, in `ReorderAsync`: the whole column read in My order,
   the default partition as today, so the calendar's titles keep their places; the ids sent take
   0 to n − 1 in the order sent, and every other title the places after, in the order it had.
   Tests in `LibraryOrderingTests`: a reorder of the first 100 of 140 leaves the other 40 below in
   their order; a reorder under a year puts that year's titles above every other year's under All
   years, each year keeping its own order; an id that has left the column is still ignored. Fault:
   number only the ids sent, and the first two go red.
2. **Every sort ends on the newest pass first**, `ThenByDescending(row => row.Latest.Id)` on
   `Sorted`'s *Title*, *Rating* and *Length* arms. Test: a column of more than 100 tied on rating,
   read in two pages, holds each title once. Fault: the tie-break off *Rating*. Postgres may hold
   ties still by accident on a fresh table, so if that stays green, say so here rather than claim it.
3. **A column's answer becomes an infinite query** under the same `columnKey`, pages of 100 by
   page number, and every reader and writer of it moves together (**Things to get right**):
   `ColumnFrame`, `useBoard`'s move and reorder with their snapshot, restore, `columnOf` and
   `findCard`, the picker's *Start playing* finding a card on a later page, a share's
   `sharedColumnQuery`, and the switcher's counts, read off the first page, which `useQueries`
   cannot do for an infinite query. `settleMove` and the remove settle by prefix and keep doing so.
   A title a later page repeats is dropped, and a card moved out of a column with two pages loaded
   is left in neither page it left. Tests: **Tests first** above.
4. **The foot, as picked**: *Showing 100 of N* centred over *Load more*, Discover's classes
   (`h-9 rounded border border-line bg-surface px-6 text-sm font-medium`), `mt-cardgap` above, at
   its own width on a phone; *Loading…*, disabled, while a page comes; the API's words in red over
   the button when one fails, a press again the retry; the keyboard to the first card a press
   added; nothing while collapsed, and nothing once every page is in. **Decide at the build:** a
   share's card has nothing to press, so where its keyboard lands; Discover's answer for a tile is
   its name, focusable from script with `tabIndex={-1}`.
5. **e2e**: a column of 140 seeded through the API, as every spec seeds; 100 and *Load more*, then
   140 and no button; the drag with 100 of 140 loaded, checked after a reload and a press; a card
   moved out with two pages loaded drawn once; the phone block at 390; the keyboard in Firefox too.
6. **Docs**: this section, `docs/board.md` (the manual ranking's paragraph on
   `PUT /api/library/order`, the query keys, *A card mounted twice*, and the picker's *consequence
   worth knowing*, which a loaded page answers), `docs/design.md`, `docs/api.md`,
   `docs/history.md`, and CLAUDE.md: **Small things** loses *A board column stops at 100 titles*,
   and **Settled** and **What exists** gain the column's Load more.

### Built, 28 November 2026

This section's own session, tests first in every step, each shown red before it went green and
each fault put back after, a commit per step, on `column-load-more` from `queue-for-adding-many`
at `7a3ed7b`, which holds #32's workshop and this plan and is not on `main`:

| Step | Commit | What it holds |
|---|---|---|
| The workshop record | `1db4658` | This section's tables and its status row, committed as docs first |
| 1. The rest numbered after | `44f17d9` | `ReorderAsync` reads the whole column in My order and numbers it from 0, what was sent first |
| 2. The newest pass first | `26d2923` | *Title*, *Rating* and *Length* end on `Latest.Id` descending |
| 3. An infinite query | `80469b3` | `board/columnPages.ts`, and every reader and writer of a column's cache moving with it, under a plain *Load more* |
| 4. The foot, as picked | `70ed719` | the line over the button, *Loading…*, a failure by the button, the keyboard to the first card added and on a share to its name |
| 5. e2e | `e966aa5` | five cases in `board.spec.ts`, `seedColumn`, and the stubs' Pagefillers |
| 6. Docs | this commit | `docs/board.md`, `docs/design.md`, `docs/api.md`, `docs/history.md`, CLAUDE.md and this section |

Each step's record, as it was written at its commit:

- **Step 1 is built.** `ReorderAsync` reads the whole column in My order, every year of it, and
  numbers it from 0: what was sent first, in the order sent, then the rest in the order it had.
  Three tests in `LibraryOrderingTests`. On the old code the first two were red, the 40 not sent
  risen over the hundred dragged and 2025's and 2024's finishes over the 2026 block under All
  years, and the third was green, as it should be there. The backend suite 1,146 green.

| Fault put back | What goes red |
|---|---|
| Only the ids sent numbered | *the first hundred … leaves the rest below*, and *under a year puts that year's titles above* |
| The ids sent read wherever they are, and only they numbered | those two, and *a title that has left the column is still ignored where it went* |

- **Step 2 is built.** *Title*, *Rating* and *Length* each end on `Latest.Id` descending. The test
  is a theory over all five sorts: 140 titles tied on name, rating and length, built as adds
  build them, read in pages of 100, read newest pass first in every sort. On the old code *Title*,
  *Rating* and *Length* were red and *My order* and *Added* green. **Red on the order, not on a
  repeat**, as the plan feared: on a fresh table Postgres gave the 140 ties back in insertion
  order on both pages, 140 titles each once, so a page repeating a card was not seen here. The
  rule the test holds is the newest pass first, which is what a tie-break promises whatever
  Postgres does. The backend suite 1,151 green.

| Fault put back | What goes red |
|---|---|
| The tie-break off *Rating* | the theory's *Rating* case alone |
| The tie-break off *Title* | its *Title* case alone |
| The tie-break off *Length* | its *Length* case alone |

- **Step 3 is built.** A column's answer is an infinite query under the same `columnKey`, pages
  of 100 by number. `board/columnPages.ts` holds `ColumnRequest` (its `queryFn` takes the page),
  `columnPages`, the one options builder the column and a phone's segments share, and the
  cache's helpers every write in `useBoard` goes through: `cardsOf`, which drops a title a later
  page repeats, `totalOf`, `withoutCard`, `withCard` and `reordered`. Each segment observes its
  column's pages itself and counts off the first. A share's request takes a page. The foot is a
  plain *Load more* under today's line, for step 4 to make as picked. Eight tests: seven red
  first, every one on there being no *Load more*, and the phone's count of 140, green before and
  after, guarding a segment that counts the column rather than the cards loaded. Vitest 1,714
  green, no request refused.
- **Decided at the build:** the next page is found from the number this side asked with, never
  the one an answer echoes, so a stub or a server that misnumbers a page cannot keep a column
  asking; and a write puts the cards back over the pages in order, each page keeping its length
  and the last taking the rest, because where a page ends is the server's on the next refetch,
  which asks by number. In the stubs, a share's fixture pages as the API does, and
  `test/library.ts` gained `manyGames` and `heldMoves`, which holds a move's request so a test
  reads the cache the move wrote before a refetch tidies it.

| Fault put back | What goes red |
|---|---|
| A title a later page repeats drawn again | *draws a title a later page repeats once* |
| A move out taking the card off the first page alone | *draws a card moved out of a column with two pages loaded once*, and the picker's *starts playing a pick on a later page* |
| The card a move takes looked for on the first page alone | the same two |
| The order after a move written from the first page alone | *writes the order of every page it has loaded after a move into it* |
| A move resetting the column it went to back to its first page | the same case, at its pages asked again |
| One page kept at most (`maxPages: 1`) | that case, and the column's three |
| A segment counting the cards loaded rather than the column | *counts a column past a page whole* |
| A share's column asking for no page | the share's *offers a column past a page the same Load more* |

- **Step 4 is built.** The foot as picked in `ColumnFrame`: *Showing 100 of N* over *Load
  more* in Discover's classes, centred at its own width, `mt-cardgap` above; *Loading…*,
  disabled, while a page comes; a later page's failure in red over the button, the column's top
  line keeping only the first page's; nothing collapsed, and nothing once every page is in. The
  keyboard goes to the first card a press added, found by its place among the cards'
  `data-card-name` headings: its title button on your board, and on a share the name itself,
  which `CardFace` makes focusable from script, `tabIndex={-1}`, wherever it has no handlers.
  **Asked at the build: a share's keyboard lands on the first new card's name**, the user's pick,
  the recommendation, over staying on the button and over the column's heading. Seven tests in
  `Column.test.tsx` and one in `SharedBoardPage.test.tsx`: four red first (*Loading…*, the
  failure by the button, the keyboard on your board and on a share), and four guarding picks the
  plain button already met (the line over the button and nothing at the end, nothing collapsed
  with the pages kept, and the keyboard left where a reader took it). Vitest 1,721 green.
- **Decided at the build:** a press hands the keyboard over only while it is where the press
  left it, on the button or nowhere, so somebody who moved on while the page came keeps their
  place, Discover's rule for its tiles; and **a failed page hands it back to the button**, which
  Discover does not. Chromium blurs a button as it is disabled, so without it a reader on the
  keyboard was left on nothing, and Tab from there skips the button that is the retry. The app's
  own retries stand, three with backoff for a 5xx, so a failed page says so after about seven
  seconds of *Loading…*; the workshop's prototype asked once.
- **Against the picked prototype:** `shoot-built.mjs` beside the workshop's script, the same
  stage, run on the built app with no swaps, in the picked states alone. All 16 shots are the
  prototype's byte for byte, at 1440 in both themes and at 390, before a press, at the end,
  *Loading…*, a failed page, collapsed and on a share; 15 of the 16 measures are the same to the
  pixel, and the 16th is the keyboard after a failed page: the prototype's on the page's body,
  the built one's on *Load more*. That is the hand-back measured in Chromium, which jsdom, never
  blurring a disabled button, cannot show.

| Fault put back | What goes red |
|---|---|
| *Loading…* never said, and the button pressable while a page comes | *says Loading… on a button that takes no press* |
| A later page's failure said at the top of the column | *says why a page did not come over its button* |
| The keyboard left on the button after a page comes | *hands the keyboard to the first card a press added*, and the share's *to the first new card's name* |
| The keyboard taken from wherever a reader went | *leaves the keyboard where a reader took it* |
| A share's card name not focusable | the share's *to the first new card's name* |
| The foot drawn while collapsed | *shows no Load more collapsed* |
| A line where the button was once every page is in | *says how much of it is showing … and nothing once every page is in* |
| The line under the button | the same case |
| **The keyboard not handed back to the button after a page fails** | **nothing in Vitest**: jsdom keeps the keyboard on a disabled button. Measured in Chromium above, and step 5's e2e is to hold it |

- **Step 5 is built.** Five cases in `board.spec.ts`, four under *a column past a page* and one
  in the phone block: the first 100 and *Load more*, then 140 and no button and no line; the
  drag of the top two with 100 of 140 loaded, read after a reload and a press; a card moved by
  its menu from the second page, drawn once where it went, Backlog keeping both pages through
  the refetch, and dragged on from there; *Load more* from the keyboard, a failed page, the
  keyboard back on the button, a press again, and the keyboard on *Pagefiller 101*; and at 390
  the button at its own width, 110 to 130px, under the one column shown. The seed is
  `seedColumn` in `e2e/support/board.ts`: 140 of the IGDB stub's new *Pagefiller* games, long
  out and on no Discover list, put in the catalogue by one search for the word they share and
  logged last to first, so the column is numbered as adds number one. A failed page is
  Playwright's `page.route` answering 500 for page 2 alone, and the app's own retries take
  about seven seconds before it says so.
- **Found at the build:** each seeded title queues a HowLongToBeat lookup, and the stub holds
  every search 600ms to model the site, so 140 of them held the worker 84 seconds a spec, and
  a queue outlives the truncation between specs: the next spec's own lookups would have waited
  behind them. The stub answers the Pagefillers at once, a miss each, and `seedColumn` waits for
  all 140 to be checked, so no column polls for an estimate while a spec drags. The cases run 5
  to 15 seconds each, under a timeout of 60 for the margin.
- **In Firefox**, `--browser=firefox`, the four desktop cases pass, 9 to 15 seconds each, the
  keyboard after a failed page included. The phone case is `isMobile`, which Firefox does not
  take.
- **The full e2e suite went 283 green and 1 red**, the 279 before and the 5 new. The red was
  #24's *follows its ✓ as the strip and the page scroll*, 8px off where the question should
  sit, as it was at #25's build: 6 of 6 alone, and nothing on its path changed.

| Fault put back | What goes red |
|---|---|
| The server numbering only the ids sent, step 1's | *a drag with 100 of 140 loaded leaves the other 40 below*: after the reload the 40 never loaded, Pagefiller 101 on, sat above the hundred dragged |
| The keyboard not handed back to the button after a page fails | *a press from the keyboard … and a failed page back*, in Chromium: *Load more* not focused after the failure. The half jsdom could not hold |

- **Step 6 is built**, in this commit: a section of its own in `docs/board.md`, **A column past a
  page**, with the whole fault table, and the paragraphs that said a column is one page (the
  switcher's counts, the hours, the picker and its *consequence worth knowing*, a share's
  `ColumnRequest`, the query keys, the manual ranking, *Sorting never writes* and *A card mounted
  twice*); **A column's Load more** in `docs/design.md`; the two routes in `docs/api.md`; an entry
  in `docs/history.md`; and in CLAUDE.md, **Small things** without *A board column stops at 100
  titles*, and **Settled**, **What exists** and **What is next** with the column's Load more.

### What the plan got wrong, or left out

- **A year was a partial view of a column already**, found by reading at the workshop: the fault
  the plan named for a page was live for every year a drag had been made under, and step 1 ended
  both. Under a year, the year dragged in now goes above every other as a block.
- **Step 3 needed something to press.** The plan gave it **Tests first**'s cases, which press
  *Load more*, so step 3 drew a plain one under today's line and step 4 made it as picked.
- **The picker's *consequence worth knowing* moved with step 1 as well as with a loaded page**: a
  pick past the loaded pages still has no card in the cache, and now lands at the foot of what
  Playing has loaded, because the order that follows a move numbers it after the cards sent.
- **Chromium blurs a button as it is disabled**, so a keyboard on Discover's *Load more* is left on
  nothing when a page fails, and Tab from there skips the button that is the retry. The column's
  hands it back, which Discover's does not; jsdom never blurs, so that half is the e2e suite's.
- **Seeding 140 titles queued 140 HowLongToBeat lookups**, at the stub's 600ms a search, past the
  truncation between specs. The stub answers the Pagefillers at once, and `seedColumn` waits for
  every lookup to be done.
- **The prototype could not run beside the build**, written against a request with no page, so the
  built app was shot by the workshop's own script and stage and compared with the workshop's shots:
  all 16 byte for byte.
- **Postgres held ties still on a fresh table**, as the plan feared, so the tie-break's theory is
  red on the order rather than on a repeat.
- **The app retries a failed page three times**, about seven seconds of *Loading…* before it says
  so, where the workshop's prototype asked once.
- **The full e2e suite's one red was #24's *follows its ✓ as the strip and the page scroll***, 8px
  off, as at #25's build, **in both full runs of the branch**, 283 green each. It passed 6 of 6
  alone, and green after `board.spec.ts` with the five new cases run straight before it, 60 of 60,
  so they do not bring it on. Three times now, once at #25 and twice here, deep into a full run
  and never alone, and nothing on its path changed in any: the panel measured 8px behind its ✓
  just after the strip scrolls 8px reads as a placement a frame late under load, unproved.

**Where it stands.** Every step is built and committed on `column-load-more`, not yet a PR. Built
on `queue-for-adding-many`, which is not on `main`, so a PR of it carries #32's workshop record
too. The comparison's Vite server is stopped; `shoot-built.mjs`, `harness-built.mjs`,
`vite.built.mjs`, `measures-built.json` and `shots-built/` beside the workshop's in the gitignored
`frontend/workshop.local/column-load-more/` are what made it. No migration, no variable and no new
route, so a deploy is the runbook's frontend and API images and nothing else.

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

**Import a MAL list: dropped by the user on 1 November 2026**, so it is not planned.

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
