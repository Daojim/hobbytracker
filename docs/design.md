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
| Accent | **A per-theme token.** There is no brand colour |
| Rating | **Coloured by what it says** — under 6 red, 6–8 orange, 8 and over yellow |
| Danger | **Never colour alone** — a filled chip the accent never wears |
| Density | Comfortable / Compact, a setting rather than a decision |
| Journal | **Drawer or modal**, also a setting. Same dialog either way |
| Width | The board stops widening at 2000px and puts the pixels into the cards |
| Columns | **Two across from 768px, four from 1280px.** Four at 768 left each one 168px |
| Card size | **From its column, not the window** — the cover and the title are sized in `cqi` |
| Nav | **A tab row under the header.** Games live, the other five dim and marked *Soon* |

The user's own words on red, which is the principle the whole theme layer is shaped around:

> Red doesn't have to be on everything, I would rather have one theme that I like personally
> while the other themes are well fit together, rather than forcing red to work with it.

Ember is that theme, and its surfaces are **neutral charcoal rather than red-tinted** — tinting them
was mocked up and rejected by eye, because a red ground shifts the eleven genre hues against it and those
mean something. So red appears where the app is speaking — links, focus, the current choice — and
never behind text or beneath a cover. Its accent is `#f2545b`, a true red; it began as a vermilion and
read as orange. **On Ember's near-black surface a red has to sit fairly light to clear 4.5:1 at all**
— `#ef4444` lands at 4.58 and `#e5484d` at 4.38 — so the deeper, more saturated reds are simply not
available. A fact about the ground rather than a preference, and the contrast test is what says so.

### How a theme works

**`src/index.css` is the only file in the app that names a colour.** Each theme is one block of custom
properties; `@theme inline` turns each into a utility. **The `inline` is the mechanism and not a
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
  ninety assertions, and a theme adds ten of them by existing — **automatically**, since `PALETTES`
  is derived from `THEMES` rather than kept by hand. It was not always. It exists because the same mistake
  happened twice: `text-neutral-500` sat at
  **3.8:1** on the dark theme for the life of the board, and then `--danger-fg` was set near-white on
  every theme, which is right where the fill is a deep red and **2.07:1** where the fill is a light
  salmon. **The fill and its ink move in opposite directions per theme.**
- **`localStorage` is not in the test globals by default.** jsdom implements it, but Node 22+ declares
  the name itself and the environment will not overwrite a global that already exists — so it is
  present and answers to nothing. `src/test/setup.ts` supplies one, and the condition asks whether the
  thing can *store* rather than whether it is `undefined`, which was the bug in the first attempt.
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
  reads `index.html` and holds it, as `index.css.test.ts` holds the palette block.

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
168px and about **32px of title**. So the board turns four columns across at **1280**, and the cover
and the title size themselves in **`cqi` against the card**.

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

Left alone: at around 1280 the **Completed column's header wraps** its sort select onto a second line,
so its cards start lower than its neighbours'. Pre-existing, clears by 1440.

### The hobby nav

`<nav aria-label="Hobbies">` under the header, built from `src/shell/hobbies.ts`. Adding movies is a
`ready` flag there plus a route — the header itself does not change.

- **The six slugs are copies of `SeedData.Apply`'s and must stay copies.** They are what `?hobby=` is
  filtered on, and `LibraryController` answers **400** for anything not in `hobby_lu`. There is no
  `/api/hobbies` to read them from, which is why `THEMES` is a literal list too.
- **The five unbuilt ones are plain text**, not disabled links and not disabled buttons: there is
  nothing behind them to operate, and a disabled control claims it would work under some other
  condition. Each also says *Soon* in words.
- **Dim is `text-muted` and nothing further.** `opacity-60` was the first attempt and was wrong — every
  theme's `--muted` is picked to clear 4.5:1 against its own surface, and fading it takes it back
  under, silently, because `index.css.test.ts` checks the tokens rather than what a component does to
  them afterwards.
- **Games is a `NavLink`**, so `aria-current="page"` comes free and stays right once there is more than
  one of them to be current. `boardPath()` is the one place that has to learn `/board/:hobby`.
- **Exactly one `SettingsMenu`, and it has to stay that way.** `useTheme` holds its state locally —
  themes are CSS, so there is no provider — so a second menu would read storage once on mount and then
  keep drawing the old choice. `AppHeader.test.tsx` pins it.

`renderWithProviders` takes a **`route` option**, defaulting to `/board`. Its `MemoryRouter` had no
`initialEntries`, so the location was always `/` and `aria-current` could not be asserted at all.

