# Design and layout

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

## Design system

The board wears a real design: **Shelf** — borderless cards lifting on a shadow, a warm ground,
columns as tinted wells — in **Public Sans**, with eight themes behind a palette in the header and
two densities in Settings beside it (#27).

| | |
|---|---|
| Look | **Shelf**, chosen from a rendered mockup rather than a description |
| Type | **Public Sans**, self-hosted through `@fontsource-variable` |
| Themes | **Eight + System**: Shelf Light, Frost, Almanac, Dusk, Blood Red, Shelf Dark, Console, Ember; and **one of your own** since #28, made from any of them |
| Registers | **Three lights, two mid-tones, three darks.** Dusk and Blood Red are the mid ones — neither paper nor near-black — and Blood Red is the warm one at 0.0414 against Dusk's 0.0580 |
| Red | **Two themes, and they are opposite constructions.** Ember is neutral charcoal wearing red as its accent; Blood Red *is* the red, and puts gold on it. Neither is forced on the other six |
| HLTB | **One blue on every theme** — the estimates are that site's numbers. See **A fixed chip and a mid-tone theme** |
| Accent | **A per-theme token.** There is no brand colour. It is also what a tile's + ▶ ✓ turn under the cursor, on the hover fill — measured at 4.5:1 there on every theme. And at rest it is the name of a search result on your board, which opens its journal where a card's plain name does the same: the strip mixes names that open with names that do not. Picked over the card's look on 7 October 2026 with Ember's red seen on the renders; 5.11:1 there, the lowest. And the tick beside the column a pass is in, in the list the journal's heading opens: a mark rather than text, on the surface `index.css.test.ts` already holds the accent to, and red on Ember, which the #13 workshop page said before the pick |
| Rating | **Coloured by what it says** — under 6 red, 6–8 orange, 8 and over yellow |
| Danger | **Never colour alone** — a filled chip the accent never wears |
| Density | Comfortable / Compact, a setting rather than a decision |
| Journal | **Drawer or modal**, also a setting. Same dialog either way. **A modal by default since #27**, and **below 768px the drawer's full screen whichever is chosen**. See **Settings and the palette** |
| Theme | **A palette in the header, opening today's list** of names and hints in a dropdown of its own, out of Settings since #27: the user's own answer, *to prepare for* #28. **#28 kept the list**, with your own as a tenth choice in it |
| A theme of your own | **Three colours made from one of the eight, in a panel beside the board with no scrim**, the board repainting as you pick, a sheet over half a phone's screen, and a tinted warning under a colour that cannot be read. Picked on 21 November 2026 in two rounds, every pick the recommendation. See **A theme of your own** |
| Settings | **A dialog behind a gear, 768 wide from 768px**: *Every board* beside this board's settings, *Your data* across the foot, each choice one line. Picked on 21 November 2026 in two rounds of renders. See **Settings and the palette** |
| Width | The board stops widening at 2000px and puts the pixels into the cards. **16px of gutter on a phone**, 24 from 768px |
| Columns | **One at a time on a phone, two across from 768px, every column from 1280px** — five, or fewer with some taken off in Settings. Four at 768 left each one 168px; five at 1280 is 234px, chosen from screenshots |
| On a phone | **A segmented switcher pinned to the top of the screen**: every column's name over its count, the current one raised. Picked on 1 October 2026 from four layouts rendered at 390px. See **On a phone** |
| Column hours | **A muted line of its own under each heading**, and on a phone beside the sort control, where the hidden heading was. Picked on 1 October 2026 from three placements rendered wide and two at 390px. See **Hours in the column headers** |
| Collapsing a column | **The journal's chevron before every column's heading, side by side**, down open and right collapsed, and a collapsed column is its header with no cards, its hours and sort control kept. The calendar folds by the same arrow. Picked on 22 November 2026 in two rounds, every pick the recommendation. See **Collapsing a column** |
| How long | **A quiz behind a link under the estimates**, not a calculator always open — two questions, then a sentence with a date in it. Picked on 2 October 2026 from three options rendered in the drawer, the modal and at 390px. See **How long will it take me?** |
| Stats | **Four tiles of numbers, then panels two across in the board's wells**: covers by month, a column per rating, a bar per game either side of its estimate, and the backlog oldest first. Picked on 2 October 2026 from eight choices rendered at 1440 and 390px. See **Stats** |
| Coming soon | **Two of the board's tracks wide**, laid out on the board's own grid, so its right edge lands on a grid line however many columns there are |
| Settings toggles | **Real checkboxes, tinted with the accent**, where every other group there draws its own dots. Squares drawn to match were rendered first and lost: at 8px a square barely differs from a dot, and an unticked one all but vanished on the dark themes |
| Sharing | **A Sharing group after Columns, holding one row that opens a dialog**: the address and Copy, the columns beside the rest, and *Stop sharing*, which asks first in the delete tint. Picked on 4 October 2026 in two rounds, and four of its states on the 5th. In the board's half of the Settings dialog since #27. See **Sharing a board** |
| A share | **A banner across the top, then the board under the owner's name** when they ticked it, which is never in the banner. Picked over the recommended heading. **A share addresses nobody**: twelve phrases written to the owner have a second form. See **Sharing a board** |
| Your data | **A row in Settings after Columns**, and after Sharing where a board can be shared: a download glyph, *Download a spreadsheet*, and what the file holds under it. Picked on 4 October 2026 from three forms rendered in the real panel. **Across the foot of the Settings dialog since #27**, the user's pick. See **Your data** |
| Deleting your account | **A tinted row under it, on every board, that opens into the warning**: what it takes in each hobby's words, a word to type, and a filled button. Afterwards the sign-in card reads *Account deleted*. Picked on 4 October 2026 in two rounds. See **Deleting your account** |
| Searching your notes | **A *Titles \| Notes* switch beside the search box**, a card per title with its cover for the notes found, **the accent at 25% behind each word found**, and a bar of the accent beside the note the journal opens at. Picked on 9 October 2026 from renders; the mark was the user's, over bold. See **Searching your notes** |
| What should I play next? | **A dialog opened by a die and *Pick* in Backlog's header**: two rows of chips, a line saying what is in the draw, then a wheel of up to eight covers or three suggestions as rows. Picked on 25 October 2026 from renders of the real backlog. The header button was the user's, over a sentence under the search box. **Since #26 on 20 November 2026, 576 wide and centred from 768px, with a 400 wheel and each length's count on a line of its own**, every pick the recommendation. See **What should I play next?** |
| Card size | **From its column, not the window** — the cover and the title are sized in `cqi` |
| Nav | **A tab row under the header.** Games live, the other five dim and marked *Soon*. **Since #27, any but the board you're on can be taken off it in Settings**, Books and Music among them |
| Icon | **A journal with three of the hobbies stuck on its cover, on Shelf Light's paper**: a controller, a TV and headphones as stickers on a black notebook. In a tab, one sticker. Picked on 3 October 2026 from eight drawings, over the recommended Telly, in place of the first icon's two covers and a tick. See **The icon, and the bar above the page** |
| The bars above and below the page | **Each theme's ground**, on Android in Chrome and in the installed app: the bar above from the page's tag, and since #31 the installed app's bar at the bottom from **a manifest per theme**, a day or so behind a change. System's bar above follows the device's scheme and its bar below stays Shelf Light's paper; a theme of your own's bar below is its base's ground. An iPhone ignores the tag. See **The icon, and the bar above the page** |

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
`theme-color` tags in `index.html`, the web manifests' colours, one manifest per theme since #31,
and the icon's drawings. Every copy
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
- **There are four genre lists now, and they may reuse each other's hues.** A board is one hobby, so
  a film's stripe is only ever read against the other films'. **`src/hobbies/palette.test.ts` is
  what holds all of it**: that every genre a built hobby names is painted, that the class names a
  token `index.css` actually defines — Tailwind generates nothing for one that does not, and the
  stripe renders transparent with no error — that every lightness is in `[0.48, 0.75]`, that no
  stripe is fainter than **1.48:1** against any theme's card, and that no two hues *within one list*
  are closer than **0.103**. Both floors are the worst that already ships, the faintest stripe
  (Horror on Dusk) and the tightest pair (anime's Isekai and Mecha), so each catches something new
  being worse than anything agreed. **Raise a floor when what set it is fixed**: the pair one was
  Strategy and Adventure at 0.087 until the games palette moved Strategy in October 2026, and a
  floor left below every pair that ships catches nothing. The measurement `index.css` asks for is
  now arithmetic the suite does.
- **Whether a card has a border is a token too** — shadow does almost nothing against Console's deep
  ground, so Console keeps an outline and the others do not, which would otherwise have needed a
  component to know which theme it was in.
- **The journal's drawer/modal setting is a `@custom-variant`, not a second component.** Both are one
  dialog with one focus trap; only the box changes. Putting it on the root attribute rather than in
  React state is what lets the menu change it without shared state. **Since #27 the variant is a
  modal unless the root says drawer**, `&:where(:root:not([data-journal='drawer']) *)`, because
  the modal is the default and an absent attribute is what storage refusing outright leaves; and
  **the card it draws is `md:` only**, so a phone's journal is the drawer's full screen whichever
  is chosen.
- **Rating tones are whole class names** — `ratingTone` in `src/lib/rating.ts` returns
  `text-rating-low` and its siblings in full, never an interpolated `text-rating-${tone}`.
- **Light themes cannot have a yellow.** Nothing yellow enough to be called that clears 4.5:1 on
  near-white, so Shelf Light's high band is a dark gold; the ramp still reads red → orange → gold.
- **An unrecognised stored value falls back** instead of being trusted. Storage outlives the code that
  wrote it, so a theme dropped later would leave the root stamped with a value nothing answers —
  unstyled text on an unstyled ground, the least diagnosable failure available.
- **A theme of your own is the one theme that is not CSS alone** (#28). Its base, one of the eight,
  is stamped as the attribute, so the base's block answers for anything not kept, and its twenty
  values are set inline on the root over that block, where an inline declaration outranks any
  selector, with its `color-scheme`. The bundle works the values out when the theme is kept
  (`theme/derive.ts`) and keeps them under a second key, `hobbytracker.theme.mine`, as the base's
  slug, light or dark, and the twenty, so the pre-paint script only copies: it cannot work
  anything out before the bundle. The choice is `mine` under the first key. **`THEMES` stays the
  eight and System**: the contrast test's palettes and the pre-paint test's grounds are derived
  from it, and a theme of your own has no block for either to find. No source file names its
  colours: they are a person's, worked out at run time and kept in their browser.
- **The twenty tokens are a list now, `TOKENS` in `theme.ts`**, in index.css's order, because a theme
  of your own has to say all of them. `palettes.test.ts` holds every block to it, name for name and
  in order, so **a new token has a list to join**, and the test says so.
- **The eight's values reach the bundle as index.css's own text** (`theme/palettes.ts`, through
  `index.css?raw`), for the derivation, which needs each base's twenty. Not a copy beside it, which
  would be a fifth list for a new theme to join; and not read back from the page's computed
  styles, because a production build is free to minify `rgb(0 0 0 / 0.6)` to `#0009`, and the e2e
  suite runs on the development server, where nothing would show it. The text is about 12 KB
  gzipped, and only the panel that makes a theme needs it, so **the panel is loaded when it is
  first asked for**, as the spreadsheet's writer is: the production build puts the panel, the
  colour arithmetic and the text in a chunk of their own, 18 KB gzipped, and the main bundle
  carries none of it.

### The things that fail quietly, and what holds them

Each is invisible in development and each has a test that was checked by breaking it.

- **The pre-paint script in `index.html`.** It stamps the attributes before the bundle loads, or the
  page renders in the default palette and swaps — the flash every themed app gets wrong once, and
  invisible locally where the bundle is warm. It cannot import `theme.ts`, so it repeats the keys as
  literals and `theme.test.ts` asserts the copies still match. It is also the *only* thing that
  applies a stored preference: `useTheme` deliberately does not, so a broken script is a failing test
  rather than a flash. `e2e/theme.spec.ts` blocks the module and asserts the attribute is stamped
  anyway; delete the script and three specs go red.
- **The default journal is said in three places**, found by #27's renders where the plan named two:
  `DEFAULT_JOURNAL` in `theme.ts`, the pre-paint script's fallback, and the `modal:` variant in
  `index.css`, which decides what an absent attribute draws. Left on a drawer, the script would
  paint one under a menu saying Modal, silently, since `useTheme` applies nothing on mount.
  `theme.test.ts` runs the script for real in jsdom and reads the variant, and both are held to
  `DEFAULT_JOURNAL`. **jsdom's selector engine answers false for every `:not()` inside a
  `:where()`**, whatever the root says, so the test asks the variant as the plain descendant
  selector it means; measured on 21 November 2026.
- **`system` and Shelf Dark say the same thing twice**, because CSS cannot alias a media query to a
  selector. `index.css.test.ts` compares the two blocks declaration by declaration.
- **Contrast.** `index.css.test.ts` holds all nine palette blocks to seventeen pairs: the text, the
  quiet text, the accent, danger and the three ratings on the card; the quiet text on the well and
  the ground; the accent on the well, the ground and the hover fill; the delete chip's label on its
  fill; the text and the quiet text on the delete warning's tint; the text on a found word's mark;
  and the mark off the card, which is seen rather than read and held to 1.4:1 where the rest are
  held to 4.5. **153 assertions, and a theme adds seventeen by existing** — **automatically**,
  since `PALETTES` is derived from `THEMES` rather than kept by hand. This said ninety-nine and
  eleven until #28's workshop counted. **The pairs are one list since #28, `PAIRS` in
  `theme/pairs.ts`**, each with its words, its bar and the colour it answers to, because the panel
  that makes a theme of your own warns from the same list; the test iterates it rather than keeping
  a copy that could fall behind the warning. `pairs.test.ts` pins the count at seventeen, since a
  pair taken out of the list to quiet a warning would take it out of the test too and leave both
  green. It was not always derived. It exists
  because the same mistake happened twice: `text-neutral-500` sat at
  **3.8:1** on the dark theme for the life of the board, and then `--danger-fg` was set near-white on
  every theme, which is right where the fill is a deep red and **2.07:1** where the fill is a light
  salmon. **The fill and its ink move in opposite directions per theme.**
- **A genre stripe too faint to see.** The lightness band `palette.test.ts` checks was taken to be
  the guarantee, and it is not. Dusk's card is a mid slate, `#3b4552`, every list's faintest stripe
  is on it, and a magenta at the band's floor, `oklch(0.48 0.2 340)`, measured **1.33:1** there.
  Nothing announces that; the stripe is only hard to find. The games list's own darkest three were
  already fainter on Dusk than anything `index.css` had written down: Beat 'em up 1.61:1, Fighting
  1.63 and Platform 1.72, where the lowest recorded was Beat 'em up on Blood Red at 1.91, and Puzzle
  is 1.85 on Almanac. The suite now measures every stripe against every theme's `--surface`, held to
  the faintest that ships, and checks it found all eight themes, because a pattern that matched none
  would pass by measuring nothing. Checked both ways on 28 October 2026: the 1.33 magenta put back
  fails it, and so does the pattern broken.
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
  two apart costs far more than the half-second the wait costs. **Every theme on one page works
  too**, because each palette block is an attribute selector rather than `:root` alone and `@theme
  inline` resolves at the element: the genre workshop rendered the real `CardFace` under eight
  `data-theme` wrappers from a Vite entry in the gitignored `frontend/workshop.local/` (`*.local`).
  **The wrapper needs `bg-sunken text-fg`**, which `BoardPage`'s `<main>` carries. Without them the
  text colour resolves at `<body>`, outside the theme, and the first shots had black titles on dark
  cards.
- **A new theme has four lists to join, and there used to be a fifth that failed silently.**
  `THEMES` in `src/theme/theme.ts` is what the menu reads; the pre-paint script in `index.html`
  carries its own literal copy and stamps *nothing* for a name outside it — deliberately, since that
  is also how an unknown stored value falls back to the system palette. So a theme missing from that
  copy is offered, chosen, stored, and then repainted after the bundle mounts on every load: the
  flash the script exists to prevent, on the one theme nobody would test for it. `theme.test.ts`
  reads `index.html` and holds it, as `index.css.test.ts` holds the palette block. **That copy
  carries each theme's ground too**, for the bar above the page, so a new theme's entry there
  needs its `--sunken` as well. Leaving it out fails *gives the bar above the page each theme's
  ground*. **The fourth is a manifest of its own** in `public/`, `manifest-<name>.webmanifest`,
  for the installed app's bar at the bottom (#31), which is System's in everything but
  `theme_color`. Leaving it out fails *gives the installed app's bar at the bottom each theme's
  ground*, and one left behind by a theme that is gone fails *is the only kind of manifest in
  public/*.

  **The fifth was `PALETTES` in `index.css.test.ts`, and nothing checked it against the menu.** A
  theme left out of that hand-kept list arrived with *no contrast assertions at all* — on precisely
  the measurements a brand-new palette is likeliest to get wrong — and the suite stayed green saying
  so. It is derived from `THEMES` now, the way `BOARD_STATUSES` is derived from `COLUMNS`. Proved by
  reintroducing the fault: with an unreadable `--muted`, the derived list gives three failures where
  the hand-written one left eighty-five tests passing.
- **A theme of your own's values sit inline on the root, and outrank every theme's block.** So
  choosing any theme, System included, takes every custom property and `color-scheme` off the
  root's inline style first (`takeOffMine` in `theme.ts`, run by `applyTheme` and `applyMine`
  alike), or one left behind would paint over the theme chosen next, with no error. Nothing else in
  the app writes the root's inline style; **anything that ever sets a `--*` there will lose it the
  next time a theme is chosen**. `theme.test.ts` wears a theme of your own and chooses Ember and
  System after it, and `theme.spec.ts` does the same in a browser and finds Ember's card.
- **The pre-paint script reads a second key, and reads it as the bundle does.** It stamps a theme of
  your own from `hobbytracker.theme.mine` as the bundle's `readMine` keeps it, by the same two rules:
  a record that is not JSON, or made from a theme that is gone, falls back to System; and a value
  that is not `#rrggbb`, `transparent` or the scrim's and the shadow's own shape is skipped, so the
  base's block answers for it, since an inline value that is not a colour paints nothing where it
  is used. The script cannot import the rules, so `theme.test.ts` runs it for real in jsdom beside
  `readMine` on one record with every kind of value either must refuse, and holds what the script
  stamps to what the reader keeps; and `theme.spec.ts` blocks the bundle and finds the values and
  the bar already on the page. **The prototype's script let any lowercase word through**,
  `notacolour` included; the build's takes only the shapes `derive.ts` writes.
- **Vitest hands a test an empty string for every stylesheet it imports, `?raw` included.** Its
  `vitest:css-disable` plugin matches `.css` followed by any query, and the import is simply `''`,
  so a test that looks for something in the text finds nothing and can pass for it. `palettes.ts`
  refuses a block it cannot find, loudly, which is how it surfaced; `test.css.include` in
  `vite.config.ts` names `index.css?raw` alone, so the panel's tests read the real stylesheet and
  nothing else changes. A production build and the dev server never had the problem.

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
only Dropped's did, because it carried a Show button the others did not. **Since #29 every header
carries the collapse arrow instead**, 28px with its gap, so at 1440 Backlog's and Completed's wrap
and Dropped's no longer does, and at 1280 all five do, which leaves Backlog's, Playing's and On
Hold's cards level at 97px down. Shown on the renders and taken with the pick; see **Collapsing a
column**.

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
- **No column is collapsed on a phone**, Dropped included. Choosing one in the switcher is already
  asking to see it, so there is no arrow and what is stored side by side does not apply (#29).
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
- **Discover's list tabs wrap to three rows since From your ratings** (#17, 8 November 2026), the
  fifth alone on the third: 106px where two rows were 68px. Measured at the workshop and picked
  anyway; nothing scrolls. The tile's reason runs to three lines at most. See **From your ratings**
  in `docs/games-igdb.md`.
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
- **Each line reads aloud in words**, as a card's length badge does: each piece that does not read
  as it prints carries `role="img"` and an `aria-label`. It was the whole line until #20 made a
  count in it a button, which no image can hold. It stays out of the `<h2>`, which names the
  column's region. Completed's says *You played 21 hours*, not *21 hours played*. The drawer's
  input is labelled *Hours played*, and Playwright's `getByLabel` matches an `aria-label` by
  substring, so `journal.spec.ts` found the header behind the drawer instead of the input the
  moment the board compared anything.
- **Left alone: at 1280, Backlog's sort control wraps once its count has two digits**, as
  Completed's and Dropped's always have. The renders had 17 there. The line does not touch that
  row. Since #29 the collapse arrow before every heading wraps all five at 1280.

### The titles a header leaves out

**On your board a count in the line is a button in the accent, opening a list of covers and names
under the whole header.** Picked at the #20 workshop on 3 November 2026, from renders of the
shipped board with a prototype column in its place and every request answered from the user's
board as read that afternoon, on the page #19's choices were on:
https://claude.ai/artifact/E8TV1xCBeB5uampa9CdJvo. What it does is `docs/board.md`'s, under **The
titles a header's count leaves out**.

| Choice | Picked | Rendered against |
|---|---|---|
| How the count says it opens something | **The accent, the user's pick** | a dotted underline in the line's own muted ink, the recommendation; a chevron after the words |
| A row | **A cover and a name, no heading** | a heading over the list and a line under each title saying when or why; names alone |
| Where the list opens | **Under the whole header, at the column's width** | nothing on the page: a first render anchored to the count at 288px ran past its 266px column into the next, and was changed before the page went up |

- **The count is `text-accent hover:underline`**, the colour words wear elsewhere when they open a
  journal, a search result's name since #12. On Ember that is red, which the page said before the
  pick. The rest of the line stays `text-muted`, and a share's counts stay that, as words.
- **The list is `absolute inset-x-0 top-full z-10 mt-1`, `rounded-lg border border-line bg-surface
  p-1 shadow-xl` in `text-sm text-fg`**, the card menu's panel at the header's width: the header
  is `relative` for it. A row is `flex items-center gap-2 rounded px-2 py-1 hover:bg-hover`, a
  `h-8 w-6 rounded-sm object-cover` cover with `alt=""` beside the name, clamped to two lines, and
  a `bg-hover` box where a title has no cover.
- **z-10, not the prototype's z-20**, which is the drawer's layer: z-10 is a card's open menu's,
  so the list goes under the phone's pinned switcher (z-15) when the page scrolls, as a card does,
  and a card is a stacking context of its own (`@container`), which z-10 clears.
- **In Dropped the list fades with its column**, at the well's 70%, as a card's `⋯` menu there
  always has: the opacity is on the section, and nothing inside it can escape it. Dropped only
  shows a count for a title with no estimate, and the user's board has none there. Not rendered.
- **Measured against the prototype's renders, on Shelf Light and Shelf Dark at 1440 and at 390**,
  from the gitignored `workshop.local/estimates/compare-header.mjs` on the staged board, with the
  lists cut to the built shape. **At rest the built header and the picked prototype differ by no
  pixel**, Playing's and Completed 2025's, light and dark, and on the phone. Open, they differ only
  in the count, because the prototype shot every open list with the dotted underline: from just
  under the line down, the list and the cards round it differ by no pixel either. The list is
  240×50 for Playing and 240×226 for Completed 2025's five at 1440, and 332×50 on the phone,
  ending at 361px, each the prototype's figure, with the headers at 44 and 60px as they were.
- **The keyboard is on the first title once a list opens**, which the prototype did not do. After a
  press of the pointer the browser draws no ring for it, measured as `:focus-visible` false on the
  focused row in every open shot, so the open list looks as rendered.

### Collapsing a column

**An arrow before each column's heading, side by side, and a collapsed column is its header with no
cards.** Picked at the #29 workshop on 22 November 2026, every pick the recommendation, from renders
of the shipped board with the user's games board as read on 3 November, at 1440 and 1280 in Shelf
Light and Shelf Dark and at 390: https://claude.ai/artifact/Xq1fhryspTKvxUzh4W7tFa. What it does is
`docs/board.md`'s, under **Collapsing a column**.

| Choice | Picked | Rendered against |
|---|---|---|
| What a collapsed column looks like | **Dropped's shape**: the header, its count, the hours and Completed's comparison, and the sort control, no cards, in the same track | a 48px strip with the name on its side and the width given to the others, which had no room for the hours or the sort control, put the calendar 290px off Playing's line and only worked five across; the cards in a box 70% of the window tall that scrolls inside the page |
| Where the arrow sits | **Before the heading**, on the heading's row whatever wraps, at the same spot in every column | after the count, where Dropped's words were; past the sort control, which goes down with the sort control whenever that wraps |
| Its form | **The journal's chevron**, the app's one arrow | a filled triangle |
| The calendar | **The same arrow before its heading**, in place of the word *Hide* at the far right | the word, as it was |

- **`board/CollapseArrow.tsx`**: a `size-5` button, `inline-flex items-center justify-center
  rounded text-muted hover:bg-hover hover:text-fg`, the hover fill of the journal heading's column
  control, holding `lib/Chevron.tsx`, 10 × 6 with a 1.5 stroke, turned `-rotate-90` to point right
  when collapsed. The columns and the calendar both draw it, and the journal's control draws the
  chevron, so there is one arrow.
- **What the arrow costs, measured**: with the row's 8px gap it adds 28px to a heading's row, so at
  1440 Backlog's and Completed's sort controls go under their headings, where before Backlog's and
  Dropped's did, and Completed's cards start 113px down rather than 85; at 1280 all five go under.
  Every place for the arrow costs the same, which is why the place was decided by where the arrow
  ends up when a row wraps. See **The board at every width**.
- **The page with Completed collapsed**, measured on the user's board: 4,940px at 1440 becomes 2,400,
  and 11,627 under All years becomes 2,400; at 1280, 5,553 becomes 2,654; at 1024, two across,
  5,789 becomes 3,257. Side by side the page is as tall as its tallest column, so collapsing
  Completed shortens it to the next tallest, Backlog's six cards there.
- **In Dropped the arrow fades with its column**, at the well's 70%, as everything in it does.
- **Measured against the picked prototype**, pixel for pixel, from the gitignored
  `workshop.local/collapsing-a-column/compare-built.mjs` on #27's stage: the whole page at 1440 and
  1280 as a board starts and with Completed collapsed, the header band close up and under the
  pointer at 1440, the calendar collapsed, and a phone with Completed chosen, in both themes. **No
  pixel differs in any of the 16.** A first run found the light header band 10,232 pixels apart
  where its dark and hovered twins matched; it matched in three runs after, so it was the shot, not
  the build.

### A column's Load more

**Today's *Showing 100 of N*, centred, over Discover's *Load more*.** Picked at the #35 workshop on
28 November 2026, every pick the recommendation, from renders of the shipped app with Completed
staged past 100 on the user's games board as read on 27 November, at 1440 in Shelf Light and Shelf
Dark and at 390: https://claude.ai/artifact/KuJQpFFvcSz6zMMebTXpaU. What it does is
`docs/board.md`'s, under **A column past a page**.

| Choice | Picked | Rendered against |
|---|---|---|
| What a column's foot says while more is left | **Today's line over *Load more***, the button word for word Discover's at its own width, 119 × 36. The one foot that says how many are left when the heading is 14,151px up the page at 1440, and it changes nothing that was there; 24px taller than the button alone | *Load more* alone, Discover's exactly; *Load 15 more*, which past 200 reads *Load 100 more* and no longer says how many are left |
| The button at 390 | **Its own width**, 119 × 36, centred, as Discover's is at every width | the column's width, 332 × 36 in a 358px column |
| Once the last page is in | **Nothing**: the button goes, and the column ends as every column ends | a muted line, *That's everything here.*, 40px taller at 1440 |

- **The foot is `mt-cardgap flex flex-col items-center gap-2`** under the cards, so twice the gap
  between cards sits above it, 24px at 1440 and 20 at 390, and it never reads as another card.
  The line is `text-center text-xs text-muted`; the button Discover's, `h-9 rounded border
  border-line bg-surface px-6 text-sm font-medium hover:bg-hover disabled:opacity-50`.
- ***Loading…*, disabled, while a page comes**, which narrows the button to 114 × 36, as
  Discover's does. A page that fails puts the API's words in red over the button, `text-center
  text-sm text-danger`: *An error occurred while processing your request.*, two lines in a 266px
  column. The column's top line keeps only a first page's failure.
- **No button while a column is collapsed**: a collapsed Completed is its heading and its count,
  the hours and the sort, 142px tall. A share's foot is the same line and button.
- **Measured against the picked prototype**, by the gitignored
  `workshop.local/column-load-more/shoot-built.mjs`, the workshop's own script and stage run on the
  built app with no swaps: before a press at 1440 in both themes and at 390, the whole width at
  1440, at the end after a press from the keyboard, *Loading…*, a failed page, collapsed, and on a
  share. **All 16 shots are the prototype's byte for byte**, and 15 of the 16 measures are the same
  to the pixel. The 16th is where the keyboard is after a failed page: on the page's body for the
  prototype, which Chromium left there when it blurred the disabled button, and on *Load more* for
  the build, which hands it back.

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
| Finished each month | **Covers, a stack per month**: six and then "+N" until 29 October 2026, and every one since. See **Every cover** below | A column of counts per month. Covers are 578px on a phone against 241 |
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

**Every cover, since 29 October 2026.** October 2026 was the first month past six, and its "+1"
was the newest finish, from the night before: a stack starts at the bottom with the month's first
finish, so the cap kept the oldest six. Five ways to see the rest were rendered on the real page
with the user's own 61 finishes, read from production, in Shelf Light and Shelf Dark at 1440 and
390px. The workshop page is private: https://claude.ai/artifact/T4WsNvmuAddG5o8F9fLrw9. Both picks
were the recommendation.

| Choice | Picked | Rendered against |
|---|---|---|
| The panel | **Every cover, no cap.** Seven covers are 495px at 1440, the same as six and a "+1", because the tile took the slot the seventh fills | "+1" opening the rest in place, the user's idea; six and "+1" opening one of the three below |
| Somewhere with names | **Nothing.** A cover's name stays its tooltip | a popover over the month, 288px wide, which cut three of October's seven names short; a dialog in the share dialog's frame, with each game's day, hours and rating; a page of its own, the user's other idea, 2,240px tall for 2026 and needing a second address for a share |

- **Under All years a year piles, at most four across**, the first finish at the bottom left and
  the newest on top, as a month's stack runs. A year's column is several covers wide where a
  month's is one, and 2025's 28 as a stack would make the panel 1,755px tall. Piled, all 61 fit
  in the 495px the panel already was. Four is what three years left each pile on the renders,
  and it is kept as a ceiling, so a year on its own is a pile rather than a strip across the
  panel. On a phone a year is a row that wraps, as a month is.
- **Each cover in the busiest month adds 60px at 1440**: five is 375px, six 435 and seven 495, and
  the Ratings panel beside it is 205px. A month of ten would make the panel 675px. Nothing stops it
  growing, and nothing in the user's history comes near.

**The titles behind a rating, since 7 November 2026.** A rated column opens the finishes rated
there, on your page only. Picked in two rounds from renders of the shipped Stats page with only
the chart swapped for a prototype, on the user's 61 finishes, in Shelf Light and Shelf Dark at
1440 and 390, Ember where its red was the point, and the list at 1024 and 768 too. The workshop
page is private: https://claude.ai/artifact/4kAxfVy3n4hBMvgx61xge2. What it does is
`docs/stats.md`'s, under **The finishes behind a rating**.

| Choice | Picked | Rendered against |
|---|---|---|
| What is pressed | **The whole column**, round one | the count over the bar, 13×16px; the number under it |
| How a column says it opens | **Its count in the accent**, `text-accent group-hover:underline` | the counts muted, as today, which on a phone, with no hover, say nothing |
| Which column is open | **A tab**: its number `font-semibold text-accent` with a 2px `bg-accent` rule under it, `absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full`, the hobby nav's own mark for the one chosen | the other bars at 35%; the column on `bg-accent/10` |
| Where the list opens | **In the panel, two across from `sm`**: `mt-3 rounded-lg border border-line bg-surface p-1`, `flex flex-col` and `sm:block sm:columns-2 sm:gap-1` | over the page as long as it is, #20's; over the page held to 320px; in the panel, one column |
| A row | **A cover, a name and the exact rating**, the user's pick over round one's cover and name: #20's row, `flex items-center gap-2 px-2 py-1` with a `h-8 w-6` cover, and `★ 8.5` at its end, `ml-auto pl-2 text-xs font-semibold` in `ratingTone`'s colour | a cover and a name |

- **The columns meet now.** Each is `flex-1` with `px-0.5` inside it rather than `gap-1` between,
  so a column's button has no gap, and a bar, `max-w-6` and centred, moves by under 2px for it. A
  share's columns are the same shapes as `div`s, with their counts muted.
- **No tint marks the open column, because none can be both seen and read.** Measured against the
  well in all eight themes: `hover` is 1.03–1.47:1 off it, invisible on the light themes; `line`
  and the accent at 15% take the muted counts under 4.5:1 on four themes and three; the accent at
  10% keeps them at 4.63:1 or more and stands only 1.12–1.22:1 off the well. The tab's accent is
  5.37–9.72:1 off it.
- **The first tab sat on the baseline**, under the bar. On a phone that rule was the bar's own
  width and read as the bar's foot, so it moved under the number before the page went up, which
  is where the hobby nav draws its own.
- **The cost of the rating is at 1024**, the narrowest the panel is beside its neighbour. Two
  across, a row is 217px, and 12 of the 22 eights' names take two lines and 4 are cut short by the
  two-line clamp, against 6 and 1 without the rating. None is cut at 1440, 768 or 390.
- **On Ember the counts and the tab are `#f2545b`**, beside a low rating's `#ff6b6b`: nearly the
  red of a bar under 6, the cost #12 and #20 took on Ember too.
- **The built chart differs from the picked prototype by no pixel**, shut and with the 8s open, at
  1440, 1024, 768 and 390, light and dark, from the gitignored
  `workshop.local/ratings/compare-built.mjs`, which pressed the column in both and shot them as
  PNG. After a press of the pointer no ring is drawn, `:focus-visible` false on the column.

**A finish's journal, since 20 November 2026.** On your page a cover and a row in a rating's list
open that game's journal (#25). Picked from renders of the shipped Stats page with only the covers
and the list swapped for prototypes, on the user's 61 finishes, in Shelf Light and Shelf Dark at
1440 and 390, and the list on Ember. The workshop page is private:
https://claude.ai/artifact/CLSZypukga5zeFXmvpaniZ. All three picks were the recommendation. What it
does is `docs/stats.md`'s, under **The journal from the page**.

| Choice | Picked | Rendered against |
|---|---|---|
| How a cover says it opens | **A ring in the accent under the pointer**, `hover:outline-2 hover:outline-offset-2 hover:outline-accent`, the same ring `focus-visible` draws, which is the page's own: its chart rows wear it | the pointer alone; a lift of 2px with `shadow-lg`, which would be the first thing in the app to move under the pointer, and whose shadow barely showed on Shelf Dark |
| A row in a rating's list | **The whole row a button, its name `text-accent`**, with #20's `hover:bg-hover` | #20's row with its name in the page's ink, which says nothing until hovered; the name alone a button, #12's, identical at rest and a smaller target |
| A cover on a phone | **Today's, 32×45px**: October 2026's seven on one line, the panel 475px | 40×56px, closer to Android's 48dp target: October on two lines, the panel 602px |

- **A cover's button is `block cursor-pointer rounded`**, since Tailwind v4 no longer gives a
  button the pointer, and takes a stack's width from `sm` (`sm:w-full`) as the cover does; under
  All years it is the 32px cover's own width. The ring is 2px off the cover, which under All years
  reaches the neighbours 4px away and stays clear of them.
- **A row keeps its height**, 48px with a name on two lines and 40 with one: the button is the
  `li`'s only child, `flex w-full items-center gap-2 rounded px-2 py-1 text-left`, the row's old
  classes. Its keyboard ring is the browser's, as #20's rows and the rating columns above wear it.
- **On Ember a name is `#f2545b`**, the red the counts and the tab above it already wear there.
- **The built covers and list differ from the picked prototypes by no pixel** in 15 states: the
  months and the 7s open at 1440 and 390, light and dark, at rest and under the pointer, the
  keyboard on a cover and on a row, and a cover in a row under All years. From the gitignored
  `workshop.local/journal-from-stats/compare-built.mjs`, which shoots both as PNG, after checking
  that each state under the pointer or the keyboard differs from the same panel at rest.

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
- **Across the foot of the Settings dialog since #27**, the user's pick over under *Every board*:
  the spreadsheet's row and the delete side by side from 768px, one under the other on a phone. The
  measurements above are the panel's. At 1440 × 900 the whole of Settings is 698px tall, measured in
  the build, and the workshop measured the prototype at 876 with the warning open, inside the
  window; the warning scrolls itself into view within the dialog's own column.

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
  tint is `fg` and `muted`, and muted is thin there, 4.58:1 on Dusk (4.57 here until #28 measured
  it again with the same arithmetic). `index.css.test.ts` holds
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

### What should I play next?

**A dialog over the board: two rows of chips, a count, then a wheel of covers or three rows.**
Picked at the #16 workshop on 25 October 2026 from renders of the real app on Jimmy's real
Backlog, six games read from production, with each wheel's spin recorded on a phone. The page is
private: https://claude.ai/artifact/3LYP8bU2xKYVu9TZDJ7PH3. Five of the six picks were the
recommendations, and the way in was the user's. What it does is `docs/board.md`'s.

| Choice | Picked | Rendered against |
|---|---|---|
| The wheel | **Covers on the wheel**, up to eight | a slice per title in its genre's colour, which on a backlog of five RPGs and a shooter was five green slices and one blue; a reel of covers, the shortest panel but not a wheel |
| A landed spin | **A row under the wheel**, which stays where it stopped | a card over the faded wheel, 168px shorter, which hides where it stopped |
| A second spin | ***Not this one***, the game off the wheel until the panel closes | *Spin again*, every slice kept |
| Suggest three | **Rows** | three covers across, where on a phone a name wraps to three lines |
| The bands | **Four, with *A long haul***, a second row of chips | three, on one row, which put all five estimates in one band |
| The way in | **A die and *Pick* in Backlog's header. The user's pick** | a sentence under the search box, 0px on a desktop; a link on the year row, which broke over two lines on a phone |

- **The share dialog's frame, 576 wide and centred since #26.** `max-w-xl`, `rounded-xl border
  border-line bg-surface p-5 shadow-xl`, over the journal's `bg-scrim`. **From 768px it is
  `my-auto` in a scrolling column**, so it sits in the middle while it fits and scrolls as a whole
  when it does not; **on a phone it is 16px from the top**. It was `max-w-md` at `pt-[8vh]` and
  `pt-[10vh]` until 20 November 2026, when the user found it squished and in the upper middle.
  Measured at 1440 × 900: 711px before a spin, 833 with a pick and a pace line, so its top rises
  61px as the row arrives, which the workshop saw recorded and picked. It needs a window 865px tall
  to show whole, and the 448 panel needed 866. On a phone the chips' extra line put it 19px past
  the foot of a 390 × 844 screen from 8% down, so it starts at the top. `pick.spec.ts` holds the
  middle, the one row and the phone's top. The workshop page is private:
  https://claude.ai/artifact/3ZCEk9EKA4NC9nV8k8p99d.
- **The lengths are radios and the genres toggles.** A length chip is `rounded-lg border px-2.5
  py-1 text-xs`, **three lines since #26**: the band, how many it holds in the board's own word
  (`titleNoun`, *1 game*, *5 games*) in `text-muted`, then its range in 11px. The user's ask, where
  the count had sat beside the label; the grey was picked over the text's own colour, and natural
  widths over five equal chips, which broke *A few weeks* at 512. All five fit one row at 576. The
  one chosen is `bg-fg text-surface`. A genre chip is `rounded-full`, and one left out is struck through on `bg-sunken`
  in `text-muted`: drawn filled first, as a chosen length is, chosen and left out looked alike.
  Their counts are the whole backlog's, and the line under them says what is in the draw.
- **The wheel is 400px across from 768px and 300 on a phone**, since #26: at 300 a full wheel's
  covers were 41px, smaller than the pick row's 48, and at 400 they are 55. Slices in `fill-well`
  and `fill-sunken` by turns. **The
  build adds a `line-soft` hairline between slices that the renders did not have**: with an odd
  number of slices the first and the last share a tone, and the three-slice render drew them as
  one. The card's genre stripe is an arc six units wide on the rim, from whole class names in
  `RIM`. The slice it lands on is outlined in the accent, red on Ember and gold on Blood Red, and
  the pointer is `fill-fg`.
- **It turns for 4 seconds on easeOutCubic**, `cubic-bezier(0.33, 1, 0.68, 1)`. The first curve
  rendered had a tail so flat that the reel looked stopped about a second before its
  `transitionend`, and the result arrived late.
- **The pick's row is `bg-well` in `border-line-soft`**, a 48px cover, the name in the accent as a
  search result on your board wears it, the facts and the pace in `text-xs text-muted`, and *Start
  playing* and *Not this one* as small bordered buttons on `bg-surface`.
- **The header button is `rounded border border-line bg-surface px-1.5 py-0.5 text-xs`**, with a
  14px die drawn in `currentColor`. It is named *Pick*, what it says, so a voice asking for it
  finds it, and described by the question, which is also its tooltip. **Backlog's heading wraps
  at 1280 and 1440**, which starts its cards 28px lower than on a board without it, and 24px on a
  phone. It fits on one line at 1920.

### Pictures in notes

Picked at the #18 workshop on 30 October 2026, from renders of the real drawer and card with the
user's own pictures, a status screen, a stats snip, a save screen and a photo of the TV, shrunk as
the app shrinks them: https://claude.ai/artifact/LC4VHgD3xZxkAWqqLipK7F. Seven choices over two
rounds; six were the recommendation, and the card's thumbnail was the user's own pick. What it
does is `docs/journal.md`'s, under **Pictures in notes**.

- **A note's pictures are a collage under its words.** A lone picture is whole, as wide as the
  column and at most 320px tall (`max-h-80`), so a status screen reads at a glance and a photo is
  not cropped. Two or more are 16:9 tiles (`aspect-video`, `object-cover`), two to a row at
  `gap-1.5`, three being one across and two under it. The five staged notes took 1,316px at drawer
  width, against 710 as 72px thumbnails and 2,911 with every picture whole.
- **A waiting picture sits inside the compose box's border, under the words**: 56px squares with a
  20px × in `bg-fg`/`text-surface` at the corner, dimmed while the note is on its way. The border
  belongs to the box rather than the textarea now, so the picture is inside it, and it turns the
  accent while anything in the box has the keyboard, which is the box's focus ring. A file held over
  it dashes the border in the accent and lays *Drop to add the picture* over it on `surface/85`.
- **The way in is a picture frame before *Add note***, a 24px bordered icon button named *Add a
  picture* on hover and to a screen reader, picked over the words as a second button the width of
  the first. The edit box has it before *Save note*.
- **The lightbox is near-black on every theme**, `bg-black/90` with its date and count in
  `text-white/75`, and its ‹ › on `black/50` circles. A picture is looked at on black whatever the
  app is wearing, which is the HowLongToBeat chip's argument for a fixed colour: the thing shown is
  not the app's. It fits the picture to the window and never enlarges one, because a 537px snip
  only blurs.
- **A card draws its newest note's first picture 28px tall** (`h-7`), before the words at
  `gap-1.5`, from the small copy made when it was sent. **The user's pick over the words *A
  picture***, made knowing the costs the page showed: a card whose newest note is only pictures
  grows 12px, and at 28px the picture cannot be read. **Held to twice as wide as tall in the
  build** (`max-w-14`, `object-cover`), which the renders did not show, because a panorama drawn at
  28px tall by its own shape would run across the card. Every picture the workshop drew is inside
  that, so the pick looks as it was picked.

### An estimate that catches up

**A circular arrow between the HowLongToBeat ID box and *View on HowLongToBeat*, and a line under
the row.** Picked at the #19 workshop on 3 November 2026, from renders of the shipped drawer with a
prototype in the pin's place and every request answered from the user's board as read that
afternoon: https://claude.ai/artifact/E8TV1xCBeB5uampa9CdJvo. What it does is
`docs/games-hltb.md`'s, under **The arrow asks again**.

| Choice | Picked | Rendered against |
|---|---|---|
| Where the check sits | **A symbol beside the box, on every game. The user's pick** | *Check now* in the line that says there is no estimate, the recommendation, which left the header as it ships and offered nothing on a game with figures; the word *Refresh* there, which wrapped the link under the box at 1440 |
| Saying when HowLongToBeat was asked | ***Last checked Sep 11*, a line under the row** | nothing |
| Which games show the line | **A game with no figures, at rest. The user's pick** | every game |
| While it checks | **The arrow turns in place, and the box dims** | *Checking…* in the arrow's place, as the pin shows it, which is wider and dropped the link under the box for the length of the check |
| After a check | ***Checked just now*, and nothing more** | *Checked just now. HowLongToBeat has no times for it yet.*, which said it twice over the pass band's *No HowLongToBeat estimate yet* |

- **The glyph is the prototype's drawing**, a 14px circular arrow of four strokes in
  `currentColor` at 1.5, on a `rounded p-0.5 text-muted` button with `hover:bg-hover
  hover:text-fg` at rest. The hover is off while it checks, so a busy arrow does not light up.
- **Turning is `motion-safe:animate-spin`, and under reduced motion `motion-reduce:opacity-50`**
  instead, both on the glyph and only while it checks. The box dims by its own
  `disabled:opacity-50`.
- **The line is `col-span-2` under the row, in the band's `text-xs text-muted`**, where the pin's
  refusals already go, and the refusal stays under it.
- ***Checked just now* has no full stop, which the render had.** It was a sentence followed by
  another until the follow-up took the second away, and the drawer's other words of the kind,
  *Saved* and *Moving…*, have none either.
- **Measured in the built drawer against the prototype's renders, on Shelf Light and Shelf Dark at
  1440.** The header band ends at 148px on a game with figures, as it ships, and at 172px with the
  line, on Phantom Blade Zero at rest and on either game after a check, which is where B's renders
  put it. **While it checks it stays at 172px with the link in place**, where the render's
  *Checking…* had taken it to 172px with the link dropped. On a 390px phone the link wraps under
  the box, as the drawer does today, and the band ends at 196px with the line.
- **A pin in flight still shows *Checking…*, now in the arrow's place.** That is the pin's look as
  it has always shipped, which the follow-up did not take up; the turning arrow is the check's.

### A game's critics and players

**Two rows under HowLongToBeat's, in the band about the title, on every column.** Picked at #22's
workshop on 12 November 2026, from renders of the real drawer around a prototype of the rows, on the
user's board with Steam's verdicts measured that day and OpenCritic's read through the user's own
key: https://claude.ai/artifact/2sCank5KRdqmTsMPc53PAF. What finds the pages and keeps what they say
is `docs/games-reviews.md`'s.

| Choice | Picked | Rendered against |
|---|---|---|
| OpenCritic's words | **`85 · Mighty · 91% recommend`**: the top critics rounded, the tier, the share who recommend it. **The user's pick**, knowing it takes two lines in the drawer, one in the modal and three on a phone | `85 · Mighty`, the recommendation, one line in the drawer; `85 · 91% of critics recommend` |
| Steam's words | **`Very Positive · 94%`**: Steam's word and the share positive, rounded | the word alone; the word, the share and the count, which took two lines in the drawer on *The Witcher 3 Remastered* |
| The way to the page | ***View on OpenCritic* and *View on Steam*, links of their own after the words**, new tab and `noreferrer`, as HowLongToBeat's row and MAL's say it | the words themselves the link, which kept both rows to one line on a phone |
| The pin | **An *OpenCritic ID* box on every game**, HowLongToBeat's box one row up, empty where there is no id, taking the number or a whole pasted address | a box only where there is no id, with *Change* otherwise |
| No score | ***Not out yet* before release, *Too few reviews* after** | *No score yet* for both, untrue for *Rabbit and Steel*; *Too few reviews* for both |

**Shown and not chosen, and built as drawn**: a verdict on its way is `…` with the link already there;
with no key on the server OpenCritic's row is its link alone; no Steam page, no Steam row; and Steam's
own *No user reviews* for a game nobody has reviewed.

- **The markup is the prototype's, class for class.** Each row is the band's `font-medium` label and
  a `flex flex-wrap items-center gap-2` row: the box is HowLongToBeat's box exactly (`w-24 rounded
  border border-line bg-surface px-1 py-0.5 text-xs`, the placeholder an em dash), the words a plain
  span, and the link `underline hover:text-fg`. The box gains `disabled:opacity-50` for a pin in
  flight, which changes nothing at rest. Steam's label is a span, having no control to name.
- **On a phone each row stacks its box, its words and its link, the label centred beside them**, as
  HowLongToBeat's row already does: OpenCritic's takes three lines, the cost the pick was made
  knowing.
- **A refused pin's words go under the box across both tracks**, where HowLongToBeat's refusals go.
- **Measured against the picked shots, the built rows differ by no pixel** in all 32: six titles, the
  drawer at 1440 in Shelf Light and Dark and from 1536, the modal, and a phone in both, with every
  row's line count the same. In Playwright's Firefox every line count is the same too.

### Hiding a game from Discover

**An eye struck through on the cover's corner, a plain card where a hidden tile was, and *1 hidden*
by the way back to the board.** Picked at #23's workshop on 13 November 2026, in two rounds of
renders of the real Discover page over the user's own From your ratings list:
https://claude.ai/artifact/Fc8pVFbsoZRm8uQ7dVwy7A. What a hide is and where it is applied is
`docs/games-igdb.md`'s, under **Hiding a game**.

| Choice | Picked | Rendered against |
|---|---|---|
| The control | **A mark on the cover's top-right corner, the user's pick**: the corner a board title's chip uses, and a board title offers no hide | its own 28 × 28 button beside the add, the recommendation; a fourth part of the add; a `⋯` menu on the cover, which ran 11px into the gutter at 390 |
| When it shows | **Under the pointer, or with the keyboard anywhere in the tile, and always on a phone, the user's pick** | always, the recommendation |
| The mark | **An eye struck through** | a cross, which elsewhere in the app closes or clears |
| A tile hidden on this visit | **A plain card where the cover was**: *Hidden*, *It won't show up on Discover again.*, Undo, and the name under it in grey | the cover faded with Undo across the add's row, where a double press would put the game straight back; a dashed outline, which read as a cover that had failed to load |
| The list | ***1 hidden* on the page, by *Back to your board***, opening a dialog: newest first, a cover and a name a row, *Show again* on each | a row in Settings, which grew the panel from 1,009px to 1,116 and put *Your data* below a 900px fold; both |

- **The mark is `absolute top-1.5 right-1.5 size-6 rounded-full`, the chip's corner and the chip's
  `border-line bg-surface shadow-card`, in `text-muted` with `hover:text-accent`.** The eye is drawn
  (`discover/EyeOff.tsx`), at the add symbols' `size-3` and close to their stroke.
- **It shows by `group-hover`, `group-focus-within` and `pointer-coarse:`**, on a tile that is a
  `group`. Tailwind v4 compiles `group-hover` inside `@media (hover: hover)`, so a phone never sees
  it, and `pointer-coarse:` is what keeps the mark on there.
- **It is `opacity-0` at rest, never `invisible`**, which would take it out of the accessibility
  tree and the tab order both: a screen reader would not hear it and Tab arriving from the tile
  before would pass it by. `discover.spec.ts` checks that it is there by its role and name at rest,
  and red with `invisible` there, in Chromium and in Firefox.
- **It comes after the name in the page**, placed over the cover by the tile's `relative`, so a
  screen reader hears what a tile is before what it does and Tab goes from the heading, where Load
  more leaves the keyboard, to the mark and then the add. The prototype had it before the name.
- **The card is `aspect-[5/7] rounded-md bg-surface shadow-card`, the cover's box**, with the eye
  at `size-5`, *Hidden* in `text-sm font-medium`, the sentence in `text-xs text-muted`, and Undo as
  a `h-7` bordered button; the name under it is the tile's heading in `text-muted`.
- **The line is a button, `text-sm text-muted hover:text-fg`**, the eye at `size-3.5` before the
  count, beside the Back link in the heading's row; it is drawn from the first hide on and not at
  nought.
- **The dialog is the share dialog's frame**, 448px across and 12vh down over the journal's scrim,
  with `useModalPanel`'s keyboard. A row is the column header's list of what it leaves out, a
  `h-8 w-6` cover and a name, with *Show again* as a small bordered button beside it. The list
  scrolls within itself past half the screen.
- **Not rendered, and decided in the build**: the dialog once every game in it has been shown
  again says *Nothing hidden.*, since the way in is a count not drawn at nought; and the Undo
  carries the game's name to a screen reader, *Undo hiding Dead Cells*.
- **Measured against the picked prototype, with the same staged answers to both**, by the
  gitignored `workshop.local/hide-from-discover/compare-built.mjs`, which hides *Horizon Zero
  Dawn* on the build by its mark where the prototype had it hidden by its address. **At 1440 at
  rest, under the pointer and with the keyboard in a tile, under the pointer in Shelf Dark, and
  under the pointer at 1280 and 768, the build differs by no pixel**, with the same marks shown in
  each: none at rest, one under the pointer or the keyboard. **At 390 it differs only in the
  antialiasing of a few headings' first lines**, at most 59 of 765 across a pixel's channels, and
  only because the tile is `relative` so the mark can come after the name: with the prototype's
  tile made `relative` too, the two differ by no pixel at 390 either, light and dark, with a game
  hidden and without, and 47 of 47 marks shown beside the card.
- **The keyboard's move to Undo after a hide by the pointer draws no ring**: `:focus-visible` was
  false on it in every shot, so the card looks as rendered.

### A game finished long ago

**A panel over the tile when the ✓ is pressed, a Day \| Year switch beside each of the journal's
dates, and a year printed as a year wherever a pass's date shows.** Picked at #24's workshop on 14
November 2026, in two rounds of renders of the shipped app with prototypes swapped in, every
choice the recommendation: round two, the two new controls,
https://claude.ai/artifact/9KBDkZaRUgwdVvBTC7iMw2, and round three, a year wherever one shows,
https://claude.ai/artifact/9XHpL3rd31aagu6E9ceugD. What the panel does is `docs/games-igdb.md`'s,
under **The ✓ asks when it was finished**, and the switch's is `docs/journal.md`'s.

| Choice | Picked | Rendered against |
|---|---|---|
| Where the ✓'s question opens | **Over the tile**, a panel 288px wide above the add, its right edge on the ✓'s, held 8px inside the window | in the cover's place, which did not fit the strip's 126 × 176px cover or a 140px wall tile; a dialog in the share dialog's frame |
| The year added last | **Already in the box, selected** | a button beside an empty box |
| The journal's year mode | **A Day \| Year switch beside each label** | a link under each box; a select before each box, 34px past the 448px drawer with two days |
| The panel's words | **In · Add · or · Today · I don't remember** | *Add in 2021*, which pushed *I don't remember* to a second row; Year · Add · or · Today · No date |
| A year after a word, and on a card | ***Completed in 2019*, *finished in 2019*, and the card's year alone, *2019*** | *Completed 2019*; *in 2019* on the card too, which on a phone read *Puzzle in 2023* |
| A year's undated finishes on the Stats page | **After December, behind a rule, labelled with the year** | before January; no rule, where *Dec* and *2024* read as one label; *No month*, two lines even at 1440 |
| A year with no days | **The group alone, as a pile**: 199px at 1440, 105px on a phone | twelve empty months and the group, 255px and 369px |
| All years | **A row per year at every width**, 660px | as it was, 1,755px with ten years; piles four across that wrap, 1,195px |
| The order rule | ***Cannot be earlier than Started.***, one line at every width | *Completed cannot be earlier than started.* and *The finish cannot be earlier than the start.*, each two lines on a phone |

- **The panel is `fixed z-30 w-72 rounded-lg border border-line bg-surface p-3 text-fg
  shadow-xl`**, the card menu's panel at a width of its own: the question in `text-sm
  font-medium` beside a `size-5` × named *Cancel*; *In* and *Hours played* in `text-xs text-muted`
  before `h-7` boxes, the year's `w-[4.5rem]` and the hours' `w-[5.5rem]` with *optional* inside;
  then *Add* in the accent, *or*, *Today* and *I don't remember* as `h-7` bordered buttons. 156px
  tall over a game's tile at every width, since the panel's own width never changes; a film's,
  with no hours box, is shorter.
- **The ✓ holds its hover fill while the panel is open**, `aria-expanded:bg-hover
  aria-expanded:text-accent`, so the panel is seen to be its. On Ember that is red.
- **A refusal is a line under the boxes in the order rule's red**, `text-xs text-danger`, the
  year's first: not rendered at the workshop, and placed by the rule the year's words were picked
  under.
- **The switch is `h-5` and `pointer-coarse:h-7`**, its halves 18px tall at a desk and 26px under
  a coarse pointer, in `text-[0.6875rem]`, the chosen half `bg-hover font-medium text-fg`: the
  date row stays the 54px it was.
- **The year's group is `sm:border-l sm:border-line-soft sm:pl-1.5`**, the rule the renders
  needed, and on a phone it is a row after December's with none. **All years' covers are `w-8`
  at every width**, the phone's: given a stack's `sm:w-full`, a cover in a row is as wide as the
  panel, and the renders measured that page 15,764px tall.
- **Measured against the picked prototypes, with the same staged answers to both**, by the
  gitignored `workshop.local/finished-long-ago/compare-built.mjs`, round three's server beside the
  app's own. **In all 26 states the build differs from the prototype by no pixel**: the panel on
  the wall at 1440, 1280 and 390, in Shelf Dark and with an empty box, on the strip at 1440 and
  390, and a film's question; the switch in the 448px and 512px drawers, the modal and a phone,
  with days, a finish year, both years and the order rule, and in Shelf Dark; and the Stats page's
  year group at 1440 and 390 and in Shelf Dark, a year with no days at 1440 and 390, and All years
  at 1440, 1024 and 390. Where the keyboard was and what the year box had selected agreed in each.

### Settings and the palette

**The themes in a palette of their own in the header, and Settings a dialog behind a gear beside
it.** Picked at #27's workshop on 21 November 2026 in two rounds of renders of the shipped app with
a prototype swapped in for `SettingsMenu`, on the user's games board as read on 3 November: round
one, https://claude.ai/artifact/JYxLGMEigPJpGcWXRgsMYG, and round two with the picks drawn together,
https://claude.ai/artifact/RS87HBgvzQFcojLHxc3pWu. Every pick is in #27's section of
`docs/plans/games-board-next.md`; what each setting does is the area's own file.

| Choice | Picked | Rendered against |
|---|---|---|
| Where the themes go | **A control of their own in the header, the user's answer**, to prepare for #28 | a row opening the list in the panel's place; the same row opening a dialog of swatches, the recommendation; tabs |
| What it opens | **Today's list, names and hints, in a 224px dropdown** | the swatches |
| The header | **A palette and a gear, the user's pick**, which keep a 390 phone's header one 32px row with *Sign out* on one line, 18px to spare | the word *Theme*, the recommendation, which wrapped *Sign out*; the theme's own name, which a phone cannot fit |
| Settings | **A dialog, 768 wide from 768px, the user's pick** over the journal modal's 672: *Every board* beside this board's settings, *Your data* across the foot, the user's pick, and one scrolling column on a phone | tabs in the dropdown; one dropdown about 1,510px tall; a page of its own |
| The controls | **One line each**: a choice's name and a switch, #24's Day \| Year switch made larger, on a 5rem column; boxes side by side | the panel's headings and rows, 854px at 1440 and 1,529 on a phone |

- **The palette is `HEADER_ICON_BUTTON`**, Settings' old bordered button with a 16px drawing in its
  word's place: `rounded border border-line px-2 py-1 text-xs font-medium text-muted`, 34 × 26 as the
  prototype measured it. Its class string said `px-2` and `px-1.5` both, and `px-2` won, so the
  build says `px-2` alone. The gear is the prototype's eight teeth round a hole, worked out once at
  module load. Each is named in words for a voice, and in a tooltip.
- **The palette's dropdown is the old panel's top**, `absolute right-0 z-30 mt-1 w-56 rounded-lg
  border border-line bg-surface p-2 shadow-xl`, with its keyboard: Escape and a press outside close
  it, and Escape hands the keyboard back to the palette.
- **The dialog is the share dialog's frame at 768**, `max-w-md md:max-w-3xl rounded-xl border
  border-line bg-surface p-5 shadow-xl` over the journal's scrim, `md:my-auto` in a scrolling column
  as the picker is since #26, and 16px from the top on a phone. Its halves are headed in `text-sm
  font-semibold`, *Every board* and the board's own name, and a group's heading is the panel's. A
  choice is a `grid grid-cols-[5rem_minmax(0,1fr)]` row: its name in `text-sm`, then a radiogroup of
  `h-6 rounded-sm px-1.5 text-xs` halves in a bordered `p-0.5` frame, the chosen half `bg-hover
  font-medium text-fg`. A board's setting shows only where the board has it: the wheel where
  `picker`, Your pace where `journal.setHltbId`, Discover's row where `discover`, Sharing where
  `share`, the spreadsheet where `export`.
- **The Journal switch is not drawn below 768px**, where the journal fills the screen whichever is
  stored, through `SIDE_BY_SIDE`, the board's own breakpoint.
- **`useModalPanel` moves the keyboard in without scrolling** since #27. With all seven settings in,
  the dialog is taller than a phone, and focusing it scrolled its column to show as much as it
  could, which put it at the top of the screen instead of 16px under it. Every panel opens at its
  top, so none needed the scroll.
- **Measured against the picked prototype, pixel for pixel**, by the gitignored
  `workshop.local/settings-rearranged/compare-built.mjs`, the prototype's server beside the app's own
  with the same staged answers to both. **The header, the palette's dropdown and the dialog differ by
  no pixel** at 1440 in Shelf Light and Shelf Dark, the dialog at 1024 and 768 too, and the header
  and the dropdown on a 390 phone: 768 × 698 at 1440, as the workshop measured it. **The phone's
  dialog differs only by the Journal row**, which the prototype drew and the build does not: the
  same down to that row, and with the row taken out of the prototype's page too, the same whole in
  both themes, 358 × 1,017. Compared in halves around the row instead, 51 pixels differed by at most
  20 levels, which was where the text fell on the screen rather than the build.

### A theme of your own

**Three colours, made from one of the eight, in a panel beside the board that repaints behind it.**
Picked at #28's workshop on 21 November 2026 in two rounds: round one in words, with every token
shown under each option, and round two in renders of the shipped board with the palette's list and
a panel swapped in, on the user's games board as read on 3 November, with four themes of your own
made as a person would make them: Rose from Shelf Light and Forest from Shelf Dark, which read;
Harbour from Dusk, whose accent cannot; and Fog from Frost, a dim card on which six pairs and ten
stripes fail. The page: https://claude.ai/artifact/RFr2d1fQbbP22ZvYZq457t. All thirteen picks were
the recommendation, and all are in #28's section of `docs/plans/games-board-next.md`.

| Choice | Picked | Rendered against |
|---|---|---|
| How much a person sets | **The ground, the card and the accent**, the other seventeen worked out as the theme it is made from works them out | the same and the text; every token, as an advanced view |
| A pair that cannot be read | **A warning under the colour it answers to, and the theme can still be kept**: it is your own screen | the keep refused until it reads; the colour nudged until it reads |
| Where it is made | **A panel beside the board with no scrim**, the journal drawer's box, so the board repaints as you pick; **a sheet over half a phone's screen**, 422px of 844 | a dialog with a sample in it; a group in Settings; a page; three quarters of a phone, with no card in view |
| A colour's control | **The browser's swatch and a box beside it** that takes a typed or pasted colour, whatever a browser's picker does | the swatch alone; the eight's own colours for that part first |
| Its name in the list | ***Your own · From Shelf Dark***, one 28px line with every base | *Your own · Made from …*, which wraps at 224px; *Mine*; *Custom* |
| Besides the colours | **A strip, *Not on the board***: a delete button, the three ratings, a found word, danger's text and the delete warning | nothing |

**How the other seventeen are worked out** (`theme/derive.ts`, ported from the workshop's
`derive.mjs` operation for operation, so it makes the four rendered themes value for value):

- **A colour between two others stays as far between them**, with the same small lean off the
  line: the well between the card and the ground; hover, both lines and Dropped's grey between the
  card or the ground and the text; the drop tint between the well and the accent.
- **A colour there to be read keeps its hue and chroma and has its lightness solved** until it reads
  on the new card as it read on the old: the text, when unchanged, in the ground's hue; the quiet
  text, on the line from the text to the card; danger, ok and the three ratings; and the delete
  chip's label on its fill. Where no lightness reaches the old contrast it goes as far as it can,
  which is why Fog's text is black.
- **The card decides light or dark, at a luminance of 0.179**, where black and white text read
  alike. The scrim and the card's shadow follow it, so a dark card made from a paper theme wears
  Shelf Dark's, and the card's outline is the base's choice: Dusk, Blood Red and Console keep one.
- **Measured by making each of the eight from each of the other seven with its own three colours**,
  56 themes, every token against the real one in OKLab: within a register the well and hover land
  a median 0.5–1.3 off, both lines, the quiet text and the drop tint 1.5–2.5, and the text 4.1,
  Almanac's brown ink carried to the papers that have none; across registers the worst reach 20–25.
  `derive.test.ts` holds the derivation to each token's median and worst, and holds the 56 to no
  more than two of their 952 pairs under a bar, as they leave quiet text on the ground at 4.43 in
  Almanac made from Dusk and the accent under the pointer at 4.40 in Ember made from Shelf Light.

**The markup is the prototype's, class for class** (`theme/ThemePanel.tsx`, `theme/ThemeMenu.tsx`):

- **The list** keeps #27's radios and adds *Your own* as a tenth with *From* and its base's name as
  the hint; under a `mt-1 border-t border-line-soft pt-1` rule, *Make your own…* or *Edit…* is
  `w-full rounded px-2 py-1 pl-6 text-left text-sm text-accent hover:bg-hover`, the `pl-6` putting
  it under the names.
- **The panel** is `fixed inset-x-0 bottom-0 z-20 flex max-h-[50vh] flex-col gap-4 overflow-y-auto
  rounded-t-xl border-t border-line bg-surface p-4` on a phone and the drawer's box from `md`,
  `md:inset-y-0 md:right-0 md:max-w-md`, `2xl:max-w-lg`, over a transparent `fixed inset-0 z-10`
  layer that takes a press on the page and does nothing with it: with no scrim, nothing would say
  whether a press there kept or cancelled. The column switcher on a phone, at z-15, stays above it.
- **A colour's row** is a `grid grid-cols-[4.5rem_minmax(0,1fr)]`: its name, the swatch (`h-8 w-12
  … p-0.5`) and the box (`w-24 rounded border border-line bg-sunken px-2 py-1 font-mono text-sm`),
  with what it paints under them in `text-xs text-muted`, and *, as Frost’s* after it while the
  colour is the theme's own. The box is taken only once it holds a whole `#rrggbb`. A dark card's
  swatch nearly vanishes on the card it is drawn on, which is the box's other reason.
- **A warning** is `mt-1.5 flex gap-1.5 rounded bg-danger/10 px-2 py-1.5 text-xs text-fg` with a ⚠
  hidden from a voice, under the colour its pairs answer to: the accent's pairs to the accent, the
  two on the ground to the ground, the rest and the stripes to the card. *Hard to read: the accent
  on a card (2.45:1) … Text needs 4.5:1.* and *Hard to see: … A mark needs 1.4:1.*, ratios to two
  places; it describes both of its colour's controls to a screen reader. Its own text is one of the
  pairs it checks, *text on the delete warning*. HowLongToBeat's chip is not checked, being one
  colour on every theme.
- **Keep and Cancel are pinned to the sheet's foot**, `sticky -bottom-4 -mx-4 -mb-4 mt-auto`: a
  sticky child of a padded scroll box sits as far above the foot as the padding, so it reaches
  down by as much, and its margins with it, `md:-bottom-5` with the drawer's `p-5`. The corner's
  × is named Cancel, as the prototype names it, because it does what Cancel does.
- **A stripe is named as a card prints its genre**, from the first built board that paints it:
  *the Horror genre stripe*, *10 genre stripes, Puzzle the faintest*. The prototype named a stripe
  by its token, which reads the same for the two its renders showed and as *Rpg* for that one.

**Measured against the picked prototype, pixel for pixel**, by the gitignored
`workshop.local/theme-of-your-own/compare-built.mjs`: the prototype's server, which swaps the
build's `ThemeMenu` for its own, beside the app's own Vite with no swap, the same staged answers
to both. **The list differs by no pixel in all eight states**: with no theme of your own and with
Forest or Rose kept and chosen, in Shelf Light and Shelf Dark, at 1440 and 390. **The panel
differs by no pixel in all fourteen**: Rose, Forest, Harbour and Fog at 1440 and the first three on
a phone, each reached the first time (the board loaded in the theme it is made from, the three
colours typed into the build's boxes) and by *Edit…* on a kept theme, **once each page's
`<select>`s were laid out afresh before the shot**. Without that, the only differing pixels were
inside selects, a pixel apart: **Chromium keeps a select's text where it was laid out**, so one laid
out under one theme and switched to another sits a pixel off one laid out wearing it. Measured on
both servers, the board's sort selects sat at y 295 on a page switched to Rose and 294 on one that
loaded wearing it, the same on each server given the same history, with no computed style
different. Worth knowing before the next comparison of a page whose theme changes under it.

- **The keyboard and the live repaint held in Playwright's Firefox**, `theme.spec.ts` whole, 13
  green and the phone's case skipped, the swatch driven as well as the box. **The open picker was
  not measured**: headless browsers open none, in either engine, so whether Firefox on Windows
  repaints as you drag in its picker or only on OK is still for a person's own browser to say, and
  the box works either way. The workshop's `/workshop-probe` page is there for it.
- **Playwright gives `<input type="color">` the textbox role**, where jsdom gives it none, so a spec
  that asks for the textbox *Card* finds the swatch and the box both; `theme.spec.ts` finds each by
  its label and its type.

### The page's ground

**The root carries the theme's ground, not only `main`.** `main` paints `bg-sunken` and is at
least a screen tall, which was enough until something ran past it. The Settings panel hangs from
the header, and over a short board (an empty one, on a phone) it reaches below `main`. There the
page showed the browser's own colour: white on the light themes, and on the dark ones a
near-black that is not the theme's. It was found in #8's renders and measured on 4 October 2026:
75px of it under an empty games board with the panel scrolled to its end, before #8, and 269px
with the warning open. `html` gets `var(--sunken)` too, in `index.css`'s base layer, so there is
nowhere for the ground to stop. *Paints the theme’s ground under the whole page* in
`layout.spec.ts` compares the root's computed colour with `main`'s, and was red first. **Settings is a
dialog since #27, so nothing hangs from the header past `main` now**; the root keeps the ground for
whatever does next, and for an iPhone's bars, and the spec, renamed *on the root, not only on the
board*, keeps its claim without the premise.

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
- **A theme of your own's bar is its own ground**, kept with it, before the bundle and after; or its
  base's, where the kept ground is not a colour. In the panel that makes one, the bar follows the
  ground as it is picked.
- **System's manifest, the one `index.html` links, is Shelf Light's ground in both colours**:
  `theme_color` is the bar before the page has loaded, and `background_color` the splash.

**The installed app's bar at the bottom follows the theme too, a day or so behind (#31).** Measured
on the user's Android phone on 25 November 2026, in the app installed through Chrome, with Dusk
chosen and the app closed and opened again: the status bar at the top was Dusk's ground,
`#2a323c`, and the navigation bar at the bottom `#efe9e1`, the manifest's. Chromium's own source,
read on 27 November 2026, says why. Since Chrome 153, stable from 8 September 2026
([CL 8077818](https://chromium-review.googlesource.com/c/chromium/src/+/8077818)), an installed
app's navigation bar is its manifest's `theme_color`, that field alone, read from the copy kept in
the installed app when Google's server built it; before 153, Chrome left the bar to Android. It is
applied again on every change of the page's `theme-color`, in the manifest's colour each time. The
page reaches the bar only while the app draws edge to edge, and an installed app does that only in
an experiment that is off by default, with a second switch for a standalone one
([CL 8447912](https://chromium-review.googlesource.com/c/chromium/src/+/8447912)). So:

- **A chosen theme links a manifest of its own**, `public/manifest-<theme>.webmanifest`: System's
  in everything but `theme_color`, which is the theme's ground. The pre-paint script links it on a
  load and `applyTheme` when the theme changes, by `manifestOf` in `theme.ts`, whose rule the script
  repeats and `theme.test.ts` holds. `background_color` stays the paper, because the icon is drawn
  on it.
- **Chrome builds the app again with it the next time it checks**: on a launch, at most once a
  day, and then once the app is closed and the phone is charging on Wi-Fi (`WebApkUpdateManager`,
  and web.dev's *How Chrome handles updates to the web app manifest*). It follows a manifest at a
  new address because the `id` is the same (`webapk_update_data_fetcher.cc`), which is why every
  other field is held to System's. `about://webapks` asks for an update by hand, and shows each
  installed app's *Theme color* and *Check for Updates Less Frequently*, which was `false` on the
  user's phone: checks every 30 days instead of every day are what a failed update leaves behind.
- **System keeps today's manifest**, since a bar a day behind could never follow the device at
  sunset, and Shelf Light shares it. **A theme of your own links its base's**, so its bar at the
  bottom is its base's ground: a manifest is a file, and one for any colour would need a route to
  write it. Both were the recommendation, picked with the rest on 27 November 2026.
- **Nothing else would have done it.** Chrome reads no dark-scheme colours from a manifest: the
  parsing was deleted on 21 May 2024, *"as this feature is not shipping"*
  ([CL 5532134](https://chromium-review.googlesource.com/c/chromium/src/+/5532134)). A manifest
  with no `theme_color` would hand the bar back to Android's own light or dark, which follows the
  device rather than the theme, and was not measured.
- **On the phone after the deploy, a fresh install wore the theme at the bottom.** On 27 November
  2026 the user uninstalled the app and installed it again, rather than asking `about://webapks`
  for an update, and reported the bar right. A fresh install is built from the manifest the page
  links, so that proves the link and the files. **An app already installed following a new
  address under the same `id` is not yet seen**: the next change of theme is its test, and its
  bar should follow within a day or two with no reinstall.

**An iPhone takes none of this.** Several developers report that Safari 26 ignores `theme-color`
and takes its bars' colour from the page's own background, or from a fixed bar at the top. **The
root has carried the ground since 4 October 2026**, two days after this was written: `html` takes
`--sunken` for the Settings panel that ran past `main` (**The root carries the theme's ground**,
above). So the bars should follow every theme from `index.css` alone. That is unmeasured, and
nobody here has an iPhone to measure it on. This paragraph said *not built* until 7 November 2026.

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
- **A manifest's `id` is the app.** A theme's manifest with an `id` of its own would be another app
  to Chrome, which would never update the installed one from it, and nothing would fail: the bar
  at the bottom would simply stay as it was. `manifest.test.ts` holds every field but
  `theme_color` to System's, checked red with Ember's `id` changed.
- **An exception in the pre-paint script skips the rest of it.** The density and the journal are
  stamped after the manifest is linked, so the script leaves a page with no manifest link alone,
  as jsdom's is. Without that check three tests went red, two of them a theme of your own's.

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
- **Exactly one palette and one Settings, and it has to stay that way.** `useTheme` holds its state
  locally — themes are CSS, so there is no provider — so a second of either would read storage once
  on mount and then keep drawing the old choice. The themes are the palette's since #27 and the rest
  is Settings', so each preference has one control, and `AppHeader.test.tsx` pins one of each.
  **The Columns group is the exception inside Settings**: it is a setting the board has to hear, so
  it reads a store rather than local state (`board/hiddenColumns.ts`, and **Columns taken off in
  Settings** in `docs/board.md`), as every setting #27 added does. That is also why the header takes
  the board's `hobby` — required, because a default is how the group would quietly go missing.
- **Boards in the header, since #27.** The nav names the boards left on in Settings, from
  `shell/headerBoards.ts`, and **always the board you are on**, taken off or not: a board taken off
  still opens at its address, by a bookmark or as the board that opens first, and the nav still says
  where you are. Settings leaves that board out of its list, with a line saying so.

`renderWithProviders` takes a **`route` option**, defaulting to `/board/games`. Its `MemoryRouter`
had no `initialEntries`, so the location was always `/` and `aria-current` could not be asserted at
all. It takes a **`path`** beside it now, for a component that reads `useParams` — a MemoryRouter
alone matches no route, so `BoardPage` mounted without one is handed empty params and redirects
rather than rendering, which reads as the board being broken rather than as the harness not having
said where it is.

