# Design and layout

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

## Design system

The board wears a real design: **Shelf** — borderless cards lifting on a shadow, a warm ground,
columns as tinted wells — in **Public Sans**, with eight themes and two densities behind one menu in
the header.

| | |
|---|---|
| Look | **Shelf**, chosen from a rendered mockup rather than a description |
| Type | **Public Sans**, self-hosted through `@fontsource-variable` |
| Themes | **Eight + System**: Shelf Light, Frost, Almanac, Dusk, Blood Red, Shelf Dark, Console, Ember |
| Registers | **Three lights, two mid-tones, three darks.** Dusk and Blood Red are the mid ones — neither paper nor near-black — and Blood Red is the warm one at 0.0414 against Dusk's 0.0580 |
| Red | **Two themes, and they are opposite constructions.** Ember is neutral charcoal wearing red as its accent; Blood Red *is* the red, and puts gold on it. Neither is forced on the other six |
| HLTB | **One blue on every theme** — the estimates are that site's numbers. See **A fixed chip and a mid-tone theme** |
| Accent | **A per-theme token.** There is no brand colour. It is also what a tile's + ▶ ✓ turn under the cursor, on the hover fill — measured at 4.5:1 there on every theme. And at rest it is the name of a search result on your board, which opens its journal where a card's plain name does the same: the strip mixes names that open with names that do not. Picked over the card's look on 7 October 2026 with Ember's red seen on the renders; 5.11:1 there, the lowest. And the tick beside the column a pass is in, in the list the journal's heading opens: a mark rather than text, on the surface `index.css.test.ts` already holds the accent to, and red on Ember, which the #13 workshop page said before the pick |
| Rating | **Coloured by what it says** — under 6 red, 6–8 orange, 8 and over yellow |
| Danger | **Never colour alone** — a filled chip the accent never wears |
| Density | Comfortable / Compact, a setting rather than a decision |
| Journal | **Drawer or modal**, also a setting. Same dialog either way |
| Width | The board stops widening at 2000px and puts the pixels into the cards. **16px of gutter on a phone**, 24 from 768px |
| Columns | **One at a time on a phone, two across from 768px, every column from 1280px** — five, or fewer with some taken off in Settings. Four at 768 left each one 168px; five at 1280 is 234px, chosen from screenshots |
| On a phone | **A segmented switcher pinned to the top of the screen**: every column's name over its count, the current one raised. Picked on 1 October 2026 from four layouts rendered at 390px. See **On a phone** |
| Column hours | **A muted line of its own under each heading**, and on a phone beside the sort control, where the hidden heading was. Picked on 1 October 2026 from three placements rendered wide and two at 390px. See **Hours in the column headers** |
| How long | **A quiz behind a link under the estimates**, not a calculator always open — two questions, then a sentence with a date in it. Picked on 2 October 2026 from three options rendered in the drawer, the modal and at 390px. See **How long will it take me?** |
| Stats | **Four tiles of numbers, then panels two across in the board's wells**: covers by month, a column per rating, a bar per game either side of its estimate, and the backlog oldest first. Picked on 2 October 2026 from eight choices rendered at 1440 and 390px. See **Stats** |
| Coming soon | **Two of the board's tracks wide**, laid out on the board's own grid, so its right edge lands on a grid line however many columns there are |
| Settings toggles | **Real checkboxes, tinted with the accent**, where every other group there draws its own dots. Squares drawn to match were rendered first and lost: at 8px a square barely differs from a dot, and an unticked one all but vanished on the dark themes |
| Sharing | **A Sharing group after Columns, holding one row that opens a dialog**: the address and Copy, the columns beside the rest, and *Stop sharing*, which asks first in the delete tint. Picked on 4 October 2026 in two rounds, and four of its states on the 5th. See **Sharing a board** |
| A share | **A banner across the top, then the board under the owner's name** when they ticked it, which is never in the banner. Picked over the recommended heading. **A share addresses nobody**: twelve phrases written to the owner have a second form. See **Sharing a board** |
| Your data | **A row in Settings after Columns**, and after Sharing where a board can be shared: a download glyph, *Download a spreadsheet*, and what the file holds under it. Picked on 4 October 2026 from three forms rendered in the real panel. See **Your data** |
| Deleting your account | **A tinted row under it, on every board, that opens into the warning**: what it takes in each hobby's words, a word to type, and a filled button. Afterwards the sign-in card reads *Account deleted*. Picked on 4 October 2026 in two rounds. See **Deleting your account** |
| Searching your notes | **A *Titles \| Notes* switch beside the search box**, a card per title with its cover for the notes found, **the accent at 25% behind each word found**, and a bar of the accent beside the note the journal opens at. Picked on 9 October 2026 from renders; the mark was the user's, over bold. See **Searching your notes** |
| Card size | **From its column, not the window** — the cover and the title are sized in `cqi` |
| Nav | **A tab row under the header.** Games live, the other five dim and marked *Soon* |
| Icon | **A journal with three of the hobbies stuck on its cover, on Shelf Light's paper**: a controller, a TV and headphones as stickers on a black notebook. In a tab, one sticker. Picked on 3 October 2026 from eight drawings, over the recommended Telly, in place of the first icon's two covers and a tick. See **The icon, and the bar above the page** |
| The bar above the page | **Each theme's ground**, on Android in Chrome and in the installed app. System's follows the device's scheme. An iPhone ignores the tag |

The user's own words on red, which is the principle the whole theme layer is shaped around:

> Red doesn't have to be on everything, I would rather have one theme that I like personally
> while the other themes are well fit together, rather than forcing red to work with it.

Ember is that theme, and its surfaces are **neutral charcoal rather than red-tinted** — tinting them
was mocked up and rejected by eye, because a red ground shifts the eleven genre hues against it and those
mean something. So red appears where the app is speaking — links, focus, the current choice — and
never behind text or beneath a cover, with one exception the user chose: since #6 on 9 October
2026, a word a search of your notes found wears the accent at 25% behind it, on Ember as on every
theme. See **Searching your notes**. Its accent is `#f2545b`, a true red; it began as a vermilion and
read as orange. **On Ember's near-black surface a red has to sit fairly light to clear 4.5:1 at all**
— `#ef4444` lands at 4.58 and `#e5484d` at 4.38 — so the deeper, more saturated reds are simply not
available. A fact about the ground rather than a preference, and the contrast test is what says so.

### How a theme works

**`src/index.css` is the only file in the app that names a colour.** The exceptions are things a
browser reads before any stylesheet exists: the pre-paint script's bar colours and System's two
`theme-color` tags in `index.html`, the web manifest's two colours, and the icon's drawings. Every copy
that has to agree with this file is held to it by a test. See **The icon, and the bar above the
page**. Each theme is one block of custom properties; `@theme inline` turns each into a utility. **The `inline` is the mechanism and not a
detail**: without it a utility resolves to whatever the variable held at build time, so no attribute
could change it at runtime. No component knows a colour, so **adding a theme is a block of values and
a line in `src/theme/theme.ts`** — there is no provider, and a component test still renders without a
wrapper.

- **`system` stores no attribute**, rather than the string `"system"`. A literal there would match no
  palette block *and* would stop `:root:not([data-theme])` matching, so the OS preference would be
  ignored twice over.
- **`color-scheme` is per theme, not once on `:root`.** It is the only thing that themes a range
  input's track, and the rating slider is one — a dark theme under a light OS would otherwise put a
  light track on a dark drawer, visible only inside the drawer.
- **Genre colours are content, not chrome**, and stay in a plain `@theme`: they mean the same thing
  whatever the app is wearing. The `bg-genre-*` class names are load-bearing — `Card.test.tsx` asserts
  on them, the only styling assertion in the suite. **The five `--color-brand-*` values sit in that
  same block** on the same argument, Google's blue meaning Google in every theme. **Note the
  constraint on the names**: `index.css.test.ts` reads tokens with `/^\s*(--[a-z-]+):/`, so a token
  containing a **digit** is silently skipped rather than reported.
- **There are two genre lists now, and they may reuse each other's hues.** A board is one hobby, so
  a film's stripe is only ever read against the other films'. **`src/hobbies/palette.test.ts` is
  what holds all of it**: that every genre a built hobby names is painted, that the class names a
  token `index.css` actually defines — Tailwind generates nothing for one that does not, and the
  stripe renders transparent with no error — that every lightness is in `[0.48, 0.75]`, and that no
  two hues *within one list* are closer than the 0.087 the games palette already accepts. The
  measurement `index.css` asks for is now arithmetic the suite does.
- **Whether a card has a border is a token too** — shadow does almost nothing against Console's deep
  ground, so Console keeps an outline and the others do not, which would otherwise have needed a
  component to know which theme it was in.
- **The journal's drawer/modal setting is a `@custom-variant`, not a second component.** Both are one
  dialog with one focus trap; only the box changes. Putting it on the root attribute rather than in
  React state is what lets the menu change it without shared state.
- **Rating tones are whole class names** — `ratingTone` in `src/lib/rating.ts` returns
  `text-rating-low` and its siblings in full, never an interpolated `text-rating-${tone}`.
- **Light themes cannot have a yellow.** Nothing yellow enough to be called that clears 4.5:1 on
  near-white, so Shelf Light's high band is a dark gold; the ramp still reads red → orange → gold.
- **An unrecognised stored value falls back** instead of being trusted. Storage outlives the code that
  wrote it, so a theme dropped later would leave the root stamped with a value nothing answers —
  unstyled text on an unstyled ground, the least diagnosable failure available.

### The things that fail quietly, and what holds them

Each is invisible in development and each has a test that was checked by breaking it.

- **The pre-paint script in `index.html`.** It stamps the attributes before the bundle loads, or the
  page renders in the default palette and swaps — the flash every themed app gets wrong once, and
  invisible locally where the bundle is warm. It cannot import `theme.ts`, so it repeats the keys as
  literals and `theme.test.ts` asserts the copies still match. It is also the *only* thing that
  applies a stored preference: `useTheme` deliberately does not, so a broken script is a failing test
  rather than a flash. `e2e/theme.spec.ts` blocks the module and asserts the attribute is stamped
  anyway; delete the script and three specs go red.
- **`system` and Shelf Dark say the same thing twice**, because CSS cannot alias a media query to a
  selector. `index.css.test.ts` compares the two blocks declaration by declaration.
- **Contrast.** `index.css.test.ts` checks `fg`, `muted`, `accent`, `rating` and `danger` against every
  ground they sit on across all nine palette blocks, plus the chip's label against its own fill —
  ninety-nine assertions, and a theme adds eleven of them by existing — **automatically**, since
  `PALETTES` is derived from `THEMES` rather than kept by hand. It was not always. It exists
  because the same mistake happened twice: `text-neutral-500` sat at
  **3.8:1** on the dark theme for the life of the board, and then `--danger-fg` was set near-white on
  every theme, which is right where the fill is a deep red and **2.07:1** where the fill is a light
  salmon. **The fill and its ink move in opposite directions per theme.**
- **`localStorage` is not in the test globals by default.** jsdom implements it, but Node 22+ declares
  the name itself and the environment will not overwrite a global that already exists — so it is
  present and answers to nothing. `src/test/setup.ts` supplies one, and the condition asks whether the
  thing can *store* rather than whether it is `undefined`, which was the bug in the first attempt.
- **So a spy on `Storage.prototype` refuses nothing.** What `setup.ts` supplies implements the
  `Storage` interface without being a `Storage`, so `vi.spyOn(Storage.prototype, 'setItem')` patches
  a prototype the harness never calls, and a test of storage refusing *passes without storage ever
  refusing*. `hiddenColumns.test.ts`'s refusal case did exactly that — green with the fallback it
  exists for deleted — until it spied on the instance instead, `vi.spyOn(localStorage, 'setItem')`,
  which is what `theme.test.ts` had done all along.
- **Screenshots are how a visual claim gets checked.** A throwaway spec under `e2e/` that seeds a
  board, switches theme and writes PNGs is worth writing again whenever this area changes — it is what
  caught the unreadable chip. Do not commit it. **Wait after switching theme before you shoot**:
  `Column` carries `transition-colors`, so a column's well animates to the new palette while the
  cards and the page ground switch instantly. A shot taken straight after the click catches every
  well one theme behind, which looks exactly like a token that failed to apply — and telling those
  two apart costs far more than the half-second the wait costs.
- **A new theme has three lists to join, and there used to be a fourth that failed silently.**
  `THEMES` in `src/theme/theme.ts` is what the menu reads; the pre-paint script in `index.html`
  carries its own literal copy and stamps *nothing* for a name outside it — deliberately, since that
  is also how an unknown stored value falls back to the system palette. So a theme missing from that
  copy is offered, chosen, stored, and then repainted after the bundle mounts on every load: the
  flash the script exists to prevent, on the one theme nobody would test for it. `theme.test.ts`
  reads `index.html` and holds it, as `index.css.test.ts` holds the palette block. **That copy
  carries each theme's ground too**, for the bar above the page, so a new theme's entry there
  needs its `--sunken` as well. Leaving it out fails *gives the bar above the page each theme's
  ground*.

  **The fourth was `PALETTES` in `index.css.test.ts`, and nothing checked it against the menu.** A
  theme left out of that hand-kept list arrived with *no contrast assertions at all* — on precisely
  the measurements a brand-new palette is likeliest to get wrong — and the suite stayed green saying
  so. It is derived from `THEMES` now, the way `BOARD_STATUSES` is derived from `COLUMNS`. Proved by
  reintroducing the fault: with an unreadable `--muted`, the derived list gives three failures where
  the hand-written one left eighty-five tests passing.

### A theme's colour lives in its ground, not its ink

Two attempts were spent learning this, so it is worth stating flat. **A light theme's ground cannot
be deep by definition, so a colour on paper can only ever be an accent — which is a different thing
from a themed app.** The first red theme built was blush paper with deep red ink; it passed every
assertion and read as Shelf Light with a red accent, because that is all it could ever have been.

The arithmetic underneath is worth keeping too, since it will hold for any hue. **The reds that
clear 4.5:1 on paper and the reds that clear it on a near-black do not overlap at all** — the
crossover is around `#d32f2f`, which manages 4.90:1 on Shelf Light and 3.48:1 on Ember. So "the
same red, lighter" is not available; a light theme and a dark theme wearing one colour are wearing
two different values of it.

The corollary that decided Blood Red: **a dark or mid ground can be the colour, and it costs the
genre stripes almost nothing.** Measured, against an oxblood `#2a1416`, all eleven land within 0.01
of their Ember numbers. Deepening a *light* ground is what actually costs them — on rose paper
Puzzle falls to 1.63 and Adventure to 1.74. The objection recorded against a red-tinted **Ember** was
perceptual hue shift, which is a real thing and a different claim from legibility; keep the two
apart. The values and the rest of the reasoning sit beside the palette in `index.css`.

### A fixed chip and a mid-tone theme cannot both clear 3:1

Worth writing down because it looks like a colour that was picked badly and is not — it is arithmetic,
and it will come back for any future theme in that register.

The HowLongToBeat chip is one fill on every theme. Carrying white text caps its luminance at 0.177,
and 3:1 from there needs a ground **above 0.630 or below 0.026**. Everything between is unreachable,
for any blue, light or dark. Dusk's ground is **0.058** — squarely in the gap, because that is what a
mid-tone theme *is*. Blood Red's is **0.0414**, in the same gap, and reads 2.48:1. Every other
theme manages 3.6–4.6:1, because every other theme is paper or near-black.

**Two themes now pay this, which is the point of not asserting it per theme.** When it was Dusk
alone it looked like one theme's misfortune; it is the register's price, and any future theme
between 0.026 and 0.630 will pay it too. What a mid-tone buys in exchange is a ground that is
neither a white page nor a black screen, which is the whole reason both of them exist.

`index.css.test.ts` therefore asserts the chip against the **lightest and darkest** grounds in the app
rather than against each theme in turn. Per-theme would have quietly encoded "this app may not have a
mid-tone theme", which is a rule nobody agreed to; the extremes still catch a fill drifting towards
either end, which is the failure that was actually worth catching. The chip's own label reads 4.63:1
on it regardless, and on Dusk it separates by saturation as much as by brightness.

### The board at every width

Between 768px and 1600px the cards were squished and the cover art read as a thin sliver — **two
defects stacked, each hiding the other**.

**The cover was being stretched, not merely drawn small.** `CARD_CLASS` is a flex row with no
`items-*`, so the default `align-items: stretch` took the cover's height — an `aspect-ratio` only
decides a height when the height is free, and stretch takes it — and `object-cover` then cropped a
vertical strip out of a portrait. Measured at 768px it was **40×95 for a box asking to be 5:7**.
`items-start` is the whole fix; the genre stripe is unaffected because it asks for the full height
itself with `self-stretch`. **And the size ladder had no rung where one was needed**: everything from
a phone to a 1279px laptop shared one 40px cover, while four columns started at 768, leaving each one
168px and about **32px of title**. So the board turns every column across at **1280** — four then,
five since On Hold — and the cover and the title size themselves in **`cqi` against the card**.

**Five across at 1280 was chosen by eye, from screenshots, on 17 September 2026.** Measured in the
browser, a column is 234px at 1280 (296px with four), 266px at 1440 and 355px at 1920, and
*Hollow Knight: Silksong* wraps to three lines, two, and one. Tight at 1280 and accepted there,
because anybody who finds it tight can take a column off in Settings and have the four-across board
back exactly. **The tracks follow how many columns are drawn**, not how many exist: `board/grid.ts`
maps the count to whole class names — `xl:grid-cols-${n}` would generate nothing, the
interpolated-class trap — and fewer than four simply fill the width, which the cover's own
`clamp(…, 5rem)` keeps from turning into a bigger box rather than more room for the title.

- **`@container` is on `CARD_CLASS`, not on `Column`.** That class is what the drag preview wears, and
  the preview renders outside every column — a container on the column would shrink a card at the
  moment it was picked up. Same reasoning that puts the genre stripe inside `CardFace`.
- **`--card-pad` and `--card-gap` deliberately did not join them.** Container query units resolve
  against the nearest *ancestor* container, never the element's own, so a `cqi` in the card's own
  padding would quietly measure the viewport — and it would be circular even if it worked, since `cqi`
  reads the content box and the padding is what decides it.
- **The e2e suite had no viewport.** It was inheriting Chromium's 1280×720 — exactly the four-column
  breakpoint, and one scrollbar pixel from laying the board out as two. Pinned at 1440×900 in
  `playwright.config.ts`; `e2e/layout.spec.ts` overrides it per describe block.
- **`e2e/layout.spec.ts` is the only layer that can check any of this**, since jsdom has no box model.
  The cover carries a `data-cover` hook because an `<img alt="">` has no role — the same reason
  `data-genre-stripe` exists — and the stub omits covers on purpose, so what the spec measures is the
  placeholder, which wears the same classes and had the same bug.

Left alone: at 1280 the **Completed and Dropped headers wrap** their sort select onto a second line,
so their cards start lower than their neighbours'. Completed did this with four columns too; by 1440
only Dropped's does, because it carries a Show button the others do not.

**The release calendar is two of the board's tracks wide**, and it shipped as the whole board. A
card answers "what is this" and wants the room; a calendar row answers "how far off is it" on one
line, and at the board's full width the date ends up a foot from the name it belongs to.

**It is laid out on the board's own grid rather than computed**, and that changed with On Hold. It
used to be `xl:max-w-[calc(50%_-_0.5rem)]` on the section, with the half-gap repeated at `2xl` and
`3xl` — two of *four* tracks, `(100% - 3g)/4 × 2 + g`, and nothing else. A fifth column made the
arithmetic wrong, and a column taken off in Settings would have made it wrong again. Now
`ComingSoon` is handed the count the board is drawing, sits in a grid built from the same
`boardTracks(count)` and `BOARD_GAP` as the columns, and spans two tracks with `md:col-span-2` — so
it lands on the grid line by construction, at every count and every width. Two things about it:

- **Nothing spans below `md`**, where the grid is one track and spanning two would invent a second;
  nor on a board showing one column, for the same reason at every width.
- **`layout.spec.ts` still measures the right edge against the Playing column's**, with nothing
  taken off and with On Hold taken off. Handing the calendar the unfiltered count — five tracks under
  a four-column board — puts it 141px off the line, and that case goes red; this is what says the
  two grids agree rather than a section quietly sliding off one.

Also there and also unmeasurable in jsdom: **the space above a month heading**, which was nought.
`first:mt-0` was on the heading rather than on the group it heads, and a heading is always the first
child of its own group — so the class meant to spare the first heading spared every one, and a month
began flush against the last row of the month before. The margin belongs to the group. The spec
compares it against the space *inside* a group rather than against a number, because what was wrong
is the ranking: a month break has to read as bigger than a row break.

### On a phone

**Below 768px the board shows one column at a time, and a switcher above it chooses which.**
Before this, every column stacked into one long page: about 2,000px for nine titles, with
Completed three screens down. The layout was picked on 1 October 2026 from four rendered at
390×844 against the e2e stubs:

| Option | What the render showed |
|---|---|
| Tabs with counts, like the hobby nav's | Five tabs and their counts do not fit at 390px, so Dropped was off the screen. It was also a second row of the same tabs, straight under the hobby nav |
| **A segmented switcher, pinned** — picked | All five names and counts fit with room to spare. It looks unlike the nav, and stays at the top while a long column scrolls |
| Columns side by side, swiped | The strip was as tall as its tallest column, so a short one left a large gap. Only the current column's count showed |
| The stack, with every column but two folded | The smallest change, but a long Backlog still pushed the folds screens down |

**Its values are the render's.** A rounded well with `p-1` and `gap-1` holds one segment per
column drawn, each a name at 11px over its count in `text-sm` semibold. The current segment is
raised exactly as a card is, `bg-surface shadow-card`, and the rest are `text-muted`. The bar is
`sticky top-0` and runs edge to edge with `-mx-4 px-4`, so a card scrolling up under it is hidden
rather than glimpsed through the gutter. All of that is `board/ColumnSwitcher.tsx`.

- **A radio group, for the settings menu's reason**: a closed set where exactly one is current.
  The markup puts a space between the name and the count, and it was written as what makes the
  accessible name "Backlog 4" rather than "Backlog4". **Measured on 2 October 2026, it is not**:
  with the space taken out, every phone spec in `board.spec.ts` and `layout.spec.ts` still found
  each segment as "Backlog 4", and jsdom names it that too. The name and the count are flex items,
  which are block-level, and an accessible name keeps block-level children apart whatever the
  markup says. The space is harmless and stays. **jsdom cannot tell a name run together from one
  kept apart**: it puts a space between child elements either way, so a check of an accessible
  name's spacing belongs in Playwright.
- **The column under it does not repeat its own name.** Its heading goes `sr-only` (the
  `namedAbove` prop), so the region keeps its name for a screen reader and the switcher says it
  once on screen. Its sort control stays.
- **Dropped is not folded on a phone.** Choosing it in the switcher is already asking to see it.
- **Nothing to switch with only Backlog drawn**, so there is no switcher then.
- **Stacking: z-15 at rest, z-50 while a card is carried.** At rest it sits over a card's open
  menu (z-10) and under the drawer (z-20). While a card is being carried it lifts over the card
  too, because the drag overlay would otherwise cover the segment under the finger just as it
  lights up. The overlay was set to z-40 for that, down from dnd-kit's default of 999. The card
  slides under the bar, which reads as it going into the column it names.

**Choosing a column from deep in another scrolls to the new column's start.** Otherwise it would
open at the same depth, scrolled past its own beginning. Instant, as a tab switch is, and only
while the bar is pinned. Where the bar would sit unpinned is read from a mark just before it,
since a sticky element reports the top of the screen.

**React has to know it is a phone, not only CSS.** `SIDE_BY_SIDE` in `board/grid.ts` is
`(min-width: 48rem)`, read through `lib/useMediaQuery.ts`. A column that is not shown is not
mounted, rather than hidden, because a `display: none` column is still a drop target: dnd-kit
measures it as an empty box in the page's top-left corner. Measured with `closestCorners` at
phone geometry, a card carried up to just under the switcher ranked that empty box first, 254.9
to the 308 of its own place. A hidden column would take the drop. The number is the one place
CSS and React could disagree, and `grid.test.ts` reads it out of Tailwind's own
`--breakpoint-md`, with the app's stylesheet winning if it names one.

- **jsdom has no `matchMedia`**, so `useMediaQuery` answers a fallback there, and the board's is
  side by side. Every component test written before this one still sees the board it was written
  against. A test of phone behaviour must say so with `windowOfWidth(390)` from
  `src/test/media.ts`. Without that it is quietly a desktop test that passes for the wrong
  reason.
- **Discover takes the same gutter**, 16px on a phone, so the header does not step 8px sideways
  between the two pages.
- **The hobby nav still scrolls sideways at 390px** and cuts *Books Soon* mid-word, as its own
  comment says it should rather than wrapping. Left alone.

`layout.spec.ts` measures this at 390px: one column region, five segments each on the screen
with its name on one line, and a 16px gutter on the board and on Discover's wall. The gestures
are `board.spec.ts`'s, in its *on a phone* block. What happens when a card is carried onto a
segment is in `docs/board.md`, under **A finger on a card**.

### Hours in the column headers

**A muted line of its own under the heading, and on a phone beside the sort control.** Picked on
1 October 2026 from three placements rendered at 1440 and 1280, and two at 390. The renders are
in a private workshop page linked from #3 in `docs/plans/games-board-next.md`. What the line says
and how it is added up is `docs/board.md`'s.

| Option | What the render showed |
|---|---|
| Beside the count, in the heading's row | Pushed every column's sort control onto a second line, even at 1440. Completed's comparison had to shrink to `90 h vs ~94 h`, which does not say which number is yours |
| **A line under the heading** (picked) | Leaves the heading's row exactly as it was, and is the only option with room for words: *to beat*, *played*, how many titles have no estimate |
| Beside the sort control | Wrapped the same way, and read as a setting next to the control rather than a fact about the column |
| On a phone, under each segment's count | Every column's hours visible from any column, but the pinned switcher grew a line, a segment had room for one number, and each segment's accessible name became "Backlog 17~1,034 h" |
| **On a phone, in the column's header** (picked) | Where the heading was before the switcher made it `sr-only`. A long line pushes the sort control under it |

- **`text-xs text-muted tabular-nums`.** `index.css.test.ts` holds `muted` at 4.5:1 on `well`
  on every theme. Dropped's well is `opacity-70`, and its line fades with its heading.
- **Whole hours with the thousands marked, and a tenth under ten**: `totalHours` in
  `lib/hours.ts`. A card's two places are right for one title and wrong for seventeen.
- **The tilde marks an estimate and your own hours carry none**, as on a card and in the drawer.
  That is what tells the two sides of Completed's comparison apart.
- **Each line reads aloud in words**, with `role="img"` and an `aria-label`, as a card's length
  badge does. It stays out of the `<h2>`, which names the column's region. Completed's says *You
  played 21 hours*, not *21 hours played*. The drawer's input is labelled *Hours played*, and
  Playwright's `getByLabel` matches an `aria-label` by substring, so `journal.spec.ts` found the
  header behind the drawer instead of the input the moment the board compared anything.
- **Left alone: at 1280, Backlog's sort control wraps once its count has two digits**, as
  Completed's and Dropped's always have. The renders had 17 there. The line does not touch that
  row.

### How long will it take me?

**A link under the four estimates, and a quiz behind it.** Picked on 2 October 2026 from three
options rendered in the drawer and the modal, on Shelf Light and Shelf Dark, and at 390px. The
workshop page is private, and linked from #4 in `docs/plans/games-board-next.md`. The user picked
their own idea over the recommendation. What it asks and answers is `docs/journal.md`'s.

| Option | What the renders showed |
|---|---|
| A sentence of controls under the estimates, always there | The most direct, and three controls in every drawer for something set once. It wraps onto a second line in the drawer at every width. |
| A date under every estimate, the pace asked once (recommended) | Every tier answered at a glance with nothing to press, about as tall as the sentence once answered. It puts a fact about you inside HowLongToBeat's grid. |
| **The quiz** (picked) | One line at rest. Then two questions with large targets, and the answer as a sentence in the drawer's body size. One press per game, every time. |

- **At rest it is a link**, `text-xs font-medium text-accent`, under the grid. Open, it is a panel
  with `rounded-lg border border-line p-3`: the step (*1 of 2*) and *Hide* on top, the question in
  `text-sm font-medium`, then the choices.
- **The paces are pills and the play styles are rows.** A pace is a short phrase, so five fit
  across the drawer in two lines; a play style is the words beside its tier and figure, which
  needs a row each. The figure stays in HowLongToBeat's own words — *Main story · 27 h* — so the
  translation is never taken on trust.
- **The answer is `text-sm`, with the span and the day in `font-semibold`**, and neither may break
  across a line (`whitespace-nowrap`). What it was worked out from sits under it in `text-xs
  text-muted`, with *Change*.
- **Every colour is the theme's**, and the three the text is set in — `fg`, `muted` and `accent` —
  are the ones `index.css.test.ts` already holds at 4.5:1 on `surface`, on every theme. The chips
  above keep HowLongToBeat's blue, as they always did.
- **On a phone the drawer is the whole screen**, and the panel takes its width. Nothing about it
  changes at 390px, which the renders were taken at to make sure of.

### Stats

**A dashboard: the headline numbers once, in four tiles across the top, and the detail under them
in panels.** Picked on 2 October 2026, with seven other choices, from renders of the real app's
stylesheet at 1440 and 390px in Shelf Light and Shelf Dark. The workshop page is private:
https://claude.ai/artifact/Cb1T1pYGFvdi35ULXn3Pq2. All eight recommendations were taken. What the
numbers mean is `docs/stats.md`'s.

| Choice | Picked | Rendered against |
|---|---|---|
| Layout | **Tiles, then panels two across** — 1,140px tall at 1440 | One centred sheet, read down — 1,937px. The same length on a phone |
| Completion | **A bar**: finished in the accent, still going a lighter step of it, dropped apart, with a legend in words | The counts in a sentence |
| Finished each month | **Covers, a stack per month**, six and then "+N" | A column of counts per month. Covers are 578px on a phone against 241 |
| Against HowLongToBeat | **A bar per game either side of the estimate**, sorted, six of each end in a busy year | The three quickest and three slowest, with covers. 518px on a phone against 361 |
| Ratings | **A column per whole point**, 1 to 10 | One bar in three bands, which puts an 8.0 and a 9.5 together |
| Backlog | **Oldest first**, six and then *Show all* | How many have waited under a month, 1–3 months and so on |
| Age on Backlog cards | **Not now** | A line under every Backlog card: the 14-card column grew from 1,666px to 1,847px at 1440 |
| The way in | **"Stats for 2026 →" on the board's year row** | *Stats* in the header; a *Stats* button beside the year picker |

- **Tiles are paper and panels are wells.** A tile is `bg-surface shadow-card`, raised as a card is,
  and a panel is `bg-well`, the board's column. Four tiles across from 1280px, two from 640, and
  one a row on a phone, where they stack above the panels as the renders showed.
- **One colour per chart, and the accent.** The comparison's bars are all the accent, because the
  side a bar is on already says which way it went and its label says it in words. The ratings'
  columns are the exception, coloured as a card's rating at that point is — `ratingFill` in
  `lib/rating.ts`, beside `ratingTone` and on the same boundaries.
- **Still going is `bg-accent/30`**, a lighter step of finished's colour, because it is on its way
  there; dropped is `bg-dropped`, the Dropped column's own.
- **The months still to come are not dimmed**, which the renders showed with an opacity. A month's
  label is `text-muted`, held at 4.5:1 on every theme by `index.css.test.ts`, and an opacity takes
  it under — the hobby nav's reason, under **The hobby nav**. They are simply empty, and a phone
  leaves them off.
- **On a phone the months are rows**, the label and then the covers in a line, from the same list
  that is twelve stacks across a wider screen. The comparison's titles take 9rem and its bars the
  rest, so a long name is cut rather than the chart.
- **The hours behind each bar show on hover and on keyboard focus**, in a small label above the row
  in `bg-fg` and `text-sunken` — the page's own ink and ground swapped, so it reads on every theme.

### Sharing a board

**A Sharing group in Settings opens a dialog, and a share is the board under a banner.** Picked at
the #9 workshop on 4 October 2026 in two rounds. The first was questions of meaning: four, then
four more when the user's note on one pick ("what you can choose to show, like I selected for
columns") changed the model. The second was renders of the real components at 1440 and 390px. The
workshop page is private: https://claude.ai/artifact/XF8FycrBBp5tE6bqkLaTUj. Four states it never
drew were rendered from the built app on 5 October and picked there:
https://claude.ai/artifact/Ud6QkNxqDzfAXQnKJxmeY3. Every recommendation was taken but one, which
is marked. What a share is and why it is safe are `docs/auth.md`'s.

| Choice | Picked | Rendered against |
|---|---|---|
| The top of a share | **C, a banner** across the top: *A board shared from HobbyTracker. It's read-only.* and *Make your own →*. **The user's pick, over the recommended heading, A** | A, the owner's name as the page's heading with the read-only note under it |
| The owner's name | **Once, heading the board under the banner**: *Jimmy Dao's games* with it ticked, *Games* without. Settled after the renders | C with the name in the banner as well, which read it twice |
| Where it is made | **A Sharing group after Columns, one row, *Share this board…*, opening a dialog** | The boxes kept open in the panel, a second Columns list straight under its own: 1337px tall. Opened from a row inside the panel: 1413px |
| Stopping | **Asks first**, *Stop sharing? The link stops working for everyone who has it.*, in the delete tint and in the footer's place | |
| The hand-made order on a share | ***Board order***, with the sort control kept | *My order* |
| A link that opens nothing | **One card for unknown and stopped alike**, *This link doesn't open a board*. Rendered and not asked about | |
| The credits | **At a share's foot**, because a visitor has no Settings | |
| The twelfth phrase | **Reworded on a share**, by the table's own rule (5 October) | The note left off a share |
| A write that fails | **The spreadsheet row's failure line**, naming what failed, and a box springs back (5 October) | Saying nothing |
| While a write works | ***Making the link…* and *Stopping…*** (5 October) | The same words, only dimmed |
| A share that cannot be reached | **The dead link's card saying so**, *This board didn't load*, with *Try again* (5 October) | The app's red error line on an empty page |

**A share addresses nobody.** Eleven phrases on the board and the Stats page are written to the
owner, and the twelfth was found under the Stats page's backlog on 5 October. A share uses one set
of words whether the name is on it or not. Each phrase is a `Voiced` pair in `lib/voice.ts`'s
sense, both forms side by side where the phrase is written, so a pair missing one is a type error,
and a page takes its voice and hands it down rather than each component asking where it is:

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
| "Added" is the day a title went on your board… says "in your backlog" for those. | "Added" is the day a title went on the board… says "in the backlog" for those. |

**When a page is shown to somebody other than its owner, check every word for *you*, *your* and
*my*.** The renders found most of these, and the tests hold the rest: a share's board and its Stats
page are each read whole for *you*, *your*, *yours* and *my*, accessible labels included.

- **The dialog is the journal's shape at the spreadsheet row's scale.** 448px across
  (`max-w-md`), `rounded-xl border border-line bg-surface p-5 shadow-xl`, high on the screen
  (`pt-[12vh]`, 108px down a 900px window), over the journal's `bg-scrim`, and with its keyboard:
  `lib/useModalPanel.ts`. The
  boxes are the Columns group's checkboxes, tinted with the accent, Columns on the left and the rest
  on the right, with *Backlog, always* where Backlog's box would be and the display name printed
  under *My name*. The address is `bg-sunken`, the whole of it, scheme included, which is exactly
  what Copy copies; Copy reads *✓ Copied* for two seconds.
- **Stopping wears `ConfirmDelete`'s fill**, `bg-danger text-danger-fg font-semibold`, on the
  account warning's `bg-danger/10`, with Cancel on `bg-surface`, for the account warning's reason:
  on the dark themes a bordered button on the tint reads as plain text.
- **A failure line is `text-xs text-danger` with `role="alert"`, on the dialog's surface** above
  the footer, never inside the tint, where `danger` measured 4.24:1 on Dusk for #8. `danger` on
  `surface` is held at 4.5:1 on every theme.
- **The banner is a strip of `well`** with a `line-soft` rule under it, edge to edge but with its
  words on the board's own edges, and outside `<main>`, so it is the page's banner landmark. Its
  sentence is `text-muted`, held on `well` already, and *Make your own →* is the first accent ink
  on that ground: measured on 5 October 2026 at 5.37:1 at its lowest, on Ember, and held since by
  `index.css.test.ts` beside accent on `sunken`, the year row's link, at 5.24 on Shelf Light.
- **The dead link's card and the unreachable one are the sign-in screen's card** on the page's
  ground, with a bordered way on where the sign-in card has its providers.
- **The credits are `text-[11px] text-muted`** under a `line-soft` rule: *Shared from HobbyTracker.
  Game data from IGDB, and estimates from HowLongToBeat.*

**Measured in the built app on 5 October 2026**, as the workshop measured its mock. The dialog is
448 × 402 before a link exists, 448 × 394 once shared and 448 × 450 while it asks, and on a
390 × 844 phone 358 across and 442, 414 and 470 tall. The workshop's figures were 402, 394 and
414, so the built dialog is the one that was picked. A share's first card starts 226px down at
1440 × 900, where the mock's started at 206, and 295px down at 390 × 844, as the mock's did. The
banner is 37px tall at 1440, and 61px on a phone, where its link wraps under its sentence. What the
Sharing group does to the panel is under **Your data**.

### Your data

**A group in Settings after Columns, on every board: *Download a spreadsheet* where the board has
one, then *Delete my account…*.** On a board that can be shared, the Sharing group sits between
Columns and this one. The spreadsheet's row was picked on 4 October 2026 from three
forms rendered in the real panel — idle, preparing and failed, on Shelf Light and Shelf Dark, at
1440 and at 390px. The workshop page is private:
https://claude.ai/artifact/DGc5UdVXGsyeDNBgbSsxSU. What the file holds is `docs/export.md`'s. The
delete row is under **Deleting your account**.

| Form | What the renders showed |
|---|---|
| **A row** (picked) | The same row and hover as every other entry in the panel. With #8's tinted *Delete my account…* drawn under it as a placeholder, the group follows the card's `⋯` menu: plain rows do things, and the tinted one deletes |
| A bordered button | Says "this does something" more loudly, and is a third button style in one small group, beside the tinted delete. On a phone it starts below the fold |
| The file itself | A sheet glyph and the name the browser will save, which at the panel's 224px stopped at `hobbytracker-games-2…` and cut off the date, the only part that changes |

- **Its values are the render's.** The heading is the panel's own group heading. The row is a
  `button` with `gap-2 px-2 py-1 text-sm hover:bg-hover`, led by a 14px download glyph drawn in
  `currentColor`, and the line under it is `px-2 pt-0.5 pb-1 text-xs text-muted`.
- **While it works** the row reads *Preparing…* in `text-muted`, takes `cursor-wait` and loses its
  hover. It is held by `aria-disabled` rather than `disabled`, which keeps the keyboard on it; see
  `docs/export.md`.
- **If it fails** the line under the row becomes `text-danger`: *Couldn't make the spreadsheet. Try
  again.* `index.css.test.ts` holds `danger` and `muted` at 4.5:1 on `surface`, the panel's ground,
  on every theme.
- **The group is on every board**, because an account is every board's. The spreadsheet's row is
  only where the board's hobby has an `export` block, so on the other boards the group holds the
  delete alone. #8's row was drawn into these renders as a placeholder so the group would be laid
  out once, and it was built that way.
- **Measured in the built panel, as the workshop measured it.** At 1440×900 the group's heading
  starts 744px down. The panel is 902px tall with #8's row, as the workshop's was, and 870 without
  it. The spreadsheet's row is 768 to 796px down and the delete row 854 to 882, so both are on the
  first screen and the warning the row opens is not, which is why it scrolls. On a 390×844 phone
  the spreadsheet's row is the last thing on the first screen, 760 to 788px down, and the delete
  row starts just under it at 846. The pinned switcher stays behind the panel.
- **The Sharing group moved both rows down 107px**, measured on 5 October 2026 on the games board.
  The panel is 1009px tall at both widths, and the Share row now sits where the spreadsheet's did,
  768 to 796px down at 1440×900. **The spreadsheet's row ends 3px under that window's fold**, 875
  to 903, and the delete row is wholly under it, 961 to 989. On a 390×844 phone the Share row is
  the last thing on the first screen, 760 to 788, and both of these are below. The other boards
  have no Sharing group and are as they were. Nothing about either row's working depends on the
  first screen: the page scrolls to them, and the warning still scrolls itself into view.

### Deleting your account

**The tinted row opens into the warning: its own name as a heading, then what deleting takes, a
word to type and a filled button.** Picked on 4 October 2026 in two rounds: three choices of
meaning first, in words, then four from renders of the real panel at 1440 and 390px on Shelf
Light, Shelf Dark and Ember, with the sign-in card. The workshop page is private:
https://claude.ai/artifact/8XuDTEL1gehXenA1CUiwFd. Every recommendation was taken. What it
deletes, and how, is `docs/auth.md`'s.

| Choice | Picked | Rendered against |
|---|---|---|
| How deliberate | **Type *delete***, then press a filled button | Two presses, as the plan suggested and as every other delete in the app works |
| The backups | **Said**, under the warning | Left out, as the server's business |
| Afterwards | **A line on the sign-in card** | The card exactly as after *Sign out* |
| The warning's shape | **Tinted**: the row keeps its name and its tint and opens into the warning. 272px | Plain: the warning in the row's place on the panel's ground. 240px, with the filled button and the bold line the only signs of danger |
| The counts | **A sentence**, in each hobby's word: *36 games, 9 films, 4 shows, 2 anime and 41 notes* | A list, a board a line. 56px taller, and a list of one row for an account on one board |
| Which account | **Named by the sign-in**: *the account you signed in to with Google* | *Your account*. Naming it costs 16px |
| The sign-in card | **C, *Account deleted* as its heading.** 266px | A, the line in place of the intro, 266px; B, a notice above *Sign in* with the intro kept, 378px |

- **Its values are the render's.** The box is `rounded bg-danger/10 px-2 pt-1 pb-2 text-xs` with
  `gap-2` between lines, and its name is `text-sm`. *It can’t be undone.* is `font-semibold`, and
  the backups line `text-muted`. The field is the note box's, `rounded border border-line
  bg-surface px-2 py-1 text-sm`. The button is ConfirmDelete's fill, `bg-danger text-danger-fg
  font-semibold`, at half opacity until the field says delete.
- **Cancel sits on `bg-surface`.** On the dark themes the tint and `--line` are nearly one colour,
  and a bordered button on the tint read as plain text in the first renders.
- **Nothing in it wears the accent**, so on Ember, whose accent is red as well, the red of a link
  never sits beside the delete.
- **The failure line sits under the tint, not inside it, which the renders did not show.** The
  tint is a ground no token names, so the contrast was measured rather than argued: `danger` on
  `bg-danger/10` is **4.24:1 on Dusk**, under the 4.5 this app holds text to, where the panel's
  own ground gives it 5.05. So *Couldn’t delete your account. Try again.* is the spreadsheet's
  failure line, `px-2 pt-0.5 pb-1 text-xs text-danger`, under the box. The text that stays on the
  tint is `fg` and `muted`, and muted is thin there, 4.57:1 on Dusk. `index.css.test.ts` holds
  both on the tint for every theme, mixing the colours in encoded sRGB as a browser composites
  them; a Dusk muted of `#b4bfcc`, which still clears the panel at 5.22, turns that case red.
- **A number never wraps away from its word.** The first render broke *board: 36* from *games* at
  the end of a line. Each number and its word are joined by a non-breaking space, written ` `
  in `account/warning.ts` rather than as the character itself, which nobody reading the source
  can see.
- **It scrolls itself into view, twice.** The panel is taller than a 900px window and the row is
  at its foot, so opening the warning scrolls its nearest edge into view, with `scroll-mb-4`
  leaving 16px under the buttons: 242px of scroll at 1440 × 900 in the renders, and 290px on a
  390px phone. **It scrolls again when the counts arrive**, because they add two lines to the
  sentence after the first scroll has happened. Measured in the built panel before that second
  scroll existed, the buttons ended back under the fold, Cancel 65% on screen. The first version
  of the test missed it: its account was empty, and an empty account's sentence is about as long
  as the one without numbers. `account.spec.ts` now seeds two boards and holds both buttons wholly
  on screen once the counts are in.
- **The sign-in card's heading takes the keyboard**, so it is `focus:outline-none`: the page puts
  focus there, and a ring round a heading nobody tabbed to reads as a fault.

### Searching your notes

Four looks were picked at the #6 workshop on 9 October 2026, from the real board and drawer with
a throwaway switch in them, shot at 1440 and 390 on Shelf Light and Shelf Dark, and the match on
all eight themes: https://claude.ai/artifact/PBqDz6PzyGfJkrU942oAzR. Three were the
recommendations. What each does, and why, is in `docs/games-igdb.md` and `docs/journal.md`.

| | Picked | Against |
|---|---|---|
| The switch | **Beside the box**, the column switcher's segments in small, 60 × 28 | tabs above it, 30px taller; inside it, 47 × 24 |
| The results | **A card per title with its cover**, three across at 1440 | one column of text; the title strip's sideways cards |
| The match | **The accent at 25% behind the word**, the user's pick | bold, the recommendation; an underline in the accent, which reads as a link |
| The note opened at | **A 2px bar of the accent beside it** | the note tinted with the accent at 10%; a ring that fades |

- **The drop tint was tried first and cannot mark text.** `--drop` is the colour a column takes
  under a held card, and the obvious highlighter. It sits 1.02:1 off the card's `surface` on Dusk
  and on Blood Red, and on Dusk the marked words showed nothing at all. Those shots are on the
  page. It is a ground meant to be read as a whole column changing colour, not as a word.
- **The accent at 25% over `surface`**: `fg` on it measures 5.48:1 on Dusk at the lowest and 12.0
  on Frost at the highest, and the tint stands 1.41:1 off the card on Ember at the faintest and
  1.72 on Console. `index.css.test.ts` holds both on every theme, the second at 1.4, and **reads
  the token and the opacity out of `MATCH_MARK` itself**, so the ground measured is the one
  painted: a mark changed to `bg-drop` or to a fainter accent goes red there.
- **On Ember that is red behind text**, which this file said Ember never has. It is the one place
  it does, picked with that written beside the option in bold. Gold on Blood Red.
- **The note's bar is the accent as a mark**, beside the text rather than behind it, so on Ember
  the red stays where the app is speaking. The tinted note was the accent at 10%, and its muted
  date measured 4.52:1 on Dusk, the tightest number on the page.

### The page's ground

**The root carries the theme's ground, not only `main`.** `main` paints `bg-sunken` and is at
least a screen tall, which was enough until something ran past it. The Settings panel hangs from
the header, and over a short board (an empty one, on a phone) it reaches below `main`. There the
page showed the browser's own colour: white on the light themes, and on the dark ones a
near-black that is not the theme's. It was found in #8's renders and measured on 4 October 2026:
75px of it under an empty games board with the panel scrolled to its end, before #8, and 269px
with the warning open. `html` gets `var(--sunken)` too, in `index.css`'s base layer, so there is
nowhere for the ground to stop. *Paints the theme’s ground under the whole page* in
`layout.spec.ts` compares the root's computed colour with `main`'s, and was red first.

### The icon, and the bar above the page

**A journal with three of the hobbies stuck on its cover, on Shelf Light's paper.** A controller
for games, a television for films, TV and anime, and headphones for music, each a die-cut sticker
on a black notebook with an orange elastic and a red ribbon. Picked on 3 October 2026 from eight
drawings. Each was rendered on iPhone and Android home screens with light and dark wallpapers,
inside Android's masks, and in a browser tab at a true 16px. The workshop page is private:
https://claude.ai/artifact/9QSf3qz1S9oFh2pTtQTnt7. The user asked for the hobbies themselves in
place of the tick: a controller, a TV, a book and headphones, not necessarily all in one icon. The
recommendation was Telly, on a book, and the user picked Journal instead. It was deployed the
same day, in #56. A browser that held the old icon may show it for up to four hours after a
change, because Cloudflare sends the icons with that long (`deploy.md`).

| Drawing | What the renders showed |
|---|---|
| Telly, on a book: a TV wearing headphones, a controller on its screen, on a book (recommended) | The only drawing with all four hobbies in one shape, so the shape stayed the largest on a home screen |
| Shelf: books and headphones on one plank, the TV and a controller on another | Holds every hobby, where the first round's Shelf held only books. Each object came out small |
| Quartet: one tile per hobby | The clearest in a tab, and the most like a folder of apps |
| Stickers: the four as stickers, scattered | The most playful. Each sticker got about a quarter of the icon |
| Stack: a TV on two books, headphones hung on its corner, a controller in front | The busiest at small sizes. Its first draft put the headphones on top of the set, where they read as a carrying handle |
| Telly without the book | A size larger, with no book |
| Couch: the TV and a controller on its cord | Exactly the hobbies the app has today |
| **Journal: a notebook with hobbies stuck on it** (picked) | The journal half of the app as the object itself. Three stickers and no book, because the notebook stands in for one |

A ninth, a fan of four covers with one hobby on each, was drawn and left out: only the front card's
art showed. All eight wear the same four genre colours, so the controller is Platform blue in
whichever drawing it is in.

**The first icon** was two pieces of box art, the front one ticked off. It was picked on 2 October
2026 from four drawings on four grounds, at https://claude.ai/artifact/3qjCooCBbvsFa7QiqcNctF,
where the user picked Covers over the recommended Shelf. What those renders showed is still worth
knowing before a third drawing:

- **Shelf, spines on a plank**, read as a bookshelf, and books are one hobby of six.
- **Board, three wells of cards**, washed out on paper until the wells were darkened, and was the
  closest to every other kanban app.
- **Covers** was the clearest about what the app is for at home-screen size.
- **Monogram, an H of two spines and the plank**, was the clearest at 16px.

Paper was the recommended ground then and was kept for the journal. Of the grounds, teal was the
bold one. It would have made Shelf Light's accent a brand colour, and the app has none (the
*Accent* row at the top of this file). Charcoal disappeared into a dark wallpaper, and blood red
was the loudest thing on either.

**Three drawings, because the places an icon goes want different things.**

- `icons/icon.svg` is full bleed, for the platforms that round the corners themselves: an
  iPhone's home screen, and a manifest icon of purpose `any`.
- `icons/icon-maskable.svg` is the same drawing inside the circle, 80% of the width across, that
  Android's launchers crop to.
- `public/favicon.svg` keeps one sticker, the controller, drawn larger for 16px. It sits on a
  rounded tile, because a browser draws a favicon exactly as it is.

**A sticker's border is the object's own shapes stroked wide, not a filter.** The outline of a
group of shapes is the outline of each one, so each object is drawn once in `<defs>` beside an
`-outline` group of its shapes with no paint of their own, and a `<use>` with a wide stroke paints
them as the border, then again as the shadow. The parts that are lines (the TV's ears, the
headphones' band) are grown as wider lines instead, which is why they have ids of their own. A
border is 15 units of the cover wide whatever the sticker's scale, so its stroke is 30 divided by
that scale. `icon.svg`'s comments say the same beside the numbers.

`npm run icons` renders the PNGs and the `.ico` from those with Playwright's Chromium. The outputs
are committed, so neither a build nor the Docker image needs a browser. The file set is the one
Evil Martians' favicon guide still recommends: a 32px `.ico` carrying `sizes="32x32"` so Chrome
takes the SVG instead, the SVG, a 180px Apple touch icon, and 192, 512 and maskable 512 in the
manifest.

**The drawings' colours are copies, and that is the exception to this file's first rule.** An
icon is drawn before any stylesheet exists. Its ground is held to Shelf Light's `--sunken` by
`manifest.test.ts`, which is what makes the splash, the icon and the default theme one colour. The
genre hues on the stickers are art, listed in `icon.svg`'s header and not held.

**The bar above the page follows the theme.** Chrome on Android colours its address bar from
`<meta name="theme-color">`, and so does the installed app's status bar. Each theme's colour is its
ground, `--sunken`:

- **System's two tags are written into `index.html`** with media queries, one per scheme, and
  nothing changes them. A phone switching to dark at sunset takes the bar with it.
- **A chosen theme gets a third tag, ahead of them**, because a browser takes the first that
  matches. The pre-paint script writes it on a load, from its own copy of each ground, which
  `theme.test.ts` holds to `index.css`. `applyTheme` rewrites it when the theme changes, reading
  `--sunken` back from the stylesheet, which by then is there to ask.
- **The manifest's `theme_color` and `background_color` are Shelf Light's ground**: the bar
  before the page has loaded, and the splash. A manifest cannot follow a stored setting.

**An iPhone takes none of this.** Several developers report that Safari 26 ignores `theme-color`
and takes its bars' colour from the page's own background, or from a fixed bar at the top. Nothing
in the app paints the root, because each page's `<main>` paints the ground, so an iPhone probably
shows white or black above a dark theme. Giving `html` the `--sunken` background would make the
bars follow every theme from `index.css` alone. **Not built**: it is unmeasured, and nobody here has
an iPhone to measure it on.

What fails quietly here, each found while building it:

- **XML refuses `--` inside a comment, and an SVG that is not XML is not drawn at all.** The first
  `icon.svg` named `--sunken` in its header. Chromium answered *"The source image cannot be
  decoded"*, naming no line. The header names the tokens without their hyphens.
- **Playwright's default headless browser has none of Chrome's install machinery.** Asked through
  `Page.getInstallabilityErrors`, it answered nothing at all for a manifest with `display:
  "browser"` and for one with no usable icon. `e2e/install.spec.ts` pins `channel: 'chromium'`,
  where both are reported, and expects exactly `in-incognito`, because every Playwright context is
  incognito. It is the same trap as a scroll gesture headless Chromium accepts and never performs.
- **Chrome is more lenient than its own criteria.** It installs with one plain icon of 144px or
  more, where the criteria ask for 192 and 512. `manifest.test.ts` holds the criteria, not
  today's leniency.
- **jsdom has no `media` property on a `<meta>`.** Setting one creates a plain property that no
  selector sees, so `theme.test.ts` sets the attribute.
- **A missing icon is a 200.** Vite and Caddy both answer a path with no file by serving
  `index.html`. Measured on the production image, `/no-such-icon.png` came back `200 text/html`.
  Both test layers read the bytes rather than the status.
- **A drawing changed without `npm run icons` reaches only the tab.** `favicon.svg` is served as
  it is, so a tab shows the new drawing while every PNG a phone installs keeps the old one, and
  nothing else fails. `e2e/icons.spec.ts` holds each picture against its drawing, drawn by the
  browser at the picture's size: measured on 3 October 2026, a picture of its own drawing differs
  by more than 32 levels in at most 2 pixels in 10,000, and one of the drawing before it in 38 to
  52 in 100. Checked red with the journal's drawings and the covers' PNGs.
- **That check needs the headless shell, the browser `render.mjs` draws with.** Full Chromium,
  which `install.spec.ts` pins for the reason above, draws a shape's edges differently: up to 8
  pixels in 100 differed, and at 32px 14 in 1,000 by more than 32 levels, enough to fail a picture
  that was right. So the check is a spec of its own: `channel` is a worker option, which Playwright
  takes for a whole file or a whole project and refuses in a describe block.
- **A `<use>` naming an id the file does not have draws nothing.** Each sticker is three to five
  of them, so a misspelled id takes a border, a shadow or a whole object out of the tab and every
  PNG alike. `manifest.test.ts` holds that every drawing names only parts it defines, checked red with
  one id misspelled.

### The hobby nav

`<nav aria-label="Hobbies">` under the header, built from `src/shell/hobbies.ts`. Adding a hobby is
the `ready` flag there and nothing else — `/board/:hobby` already exists, and the header does not
change. Films proved it: that flag, plus a file in `src/hobbies/`, was the whole of the nav change.

- **The six slugs are copies of `SeedData.Apply`'s and must stay copies.** They are what `?hobby=` is
  filtered on, and `LibraryController` answers **400** for anything not in `hobby_lu`. There is no
  `/api/hobbies` to read them from, which is why `THEMES` is a literal list too.
- **The unbuilt ones are plain text**, not disabled links and not disabled buttons: there is
  nothing behind them to operate, and a disabled control claims it would work under some other
  condition. Each also says *Soon* in words. **`AppHeader.test.tsx` counts the links off `HOBBIES`
  rather than pinning a number**, so building the next hobby is one flag rather than that flag and
  an arithmetic edit in a spec.
- **Dim is `text-muted` and nothing further.** `opacity-60` was the first attempt and was wrong — every
  theme's `--muted` is picked to clear 4.5:1 against its own surface, and fading it takes it back
  under, silently, because `index.css.test.ts` checks the tokens rather than what a component does to
  them afterwards.
- **A built hobby is a `NavLink`**, so `aria-current="page"` comes free and stays right now that
  there is more than one of them to be current. **`boardPath()` has learnt `/board/:hobby`** — every
  hobby's board is at its own address now, and the bare `/board` redirects rather than being
  retired, because bookmarks, every Playwright `goto` and `signInUrl`'s `returnUrl` all name it.
  `isReadyHobby` beside it is what `BoardPage` turns a slug nobody has built into the one that
  exists with.
- **Exactly one `SettingsMenu`, and it has to stay that way.** `useTheme` holds its state locally —
  themes are CSS, so there is no provider — so a second menu would read storage once on mount and then
  keep drawing the old choice. `AppHeader.test.tsx` pins it. **The Columns group is the exception
  inside it**: it is the one setting the board has to hear, so it reads a store rather than local
  state (`board/hiddenColumns.ts`, and **Columns taken off in Settings** in `docs/board.md`). That is
  also why the header now takes the board's `hobby` — required, because a default is how the group
  would quietly go missing.

`renderWithProviders` takes a **`route` option**, defaulting to `/board/games`. Its `MemoryRouter`
had no `initialEntries`, so the location was always `/` and `aria-current` could not be asserted at
all. It takes a **`path`** beside it now, for a component that reads `useParams` — a MemoryRouter
alone matches no route, so `BoardPage` mounted without one is handed empty params and redirects
rather than rendering, which reads as the board being broken rather than as the harness not having
said where it is.

