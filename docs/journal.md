# The journal

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

## The journal drawer

The board moves a title between columns; the drawer is where you say anything *about* it. Click a
card's title and it slides in over the board — a rating, the two dates, a list of dated notes, and
every earlier pass with its own notes below it, plus whatever else a pass of *that kind* records.
A calendar row's title opens it too, and since 7 October 2026 so does the name of a search result
that is on your board, so a title just found can be written about without going to find its card.
Since 9 October 2026 a note that a search of your notes found opens it as well, at that note: see
**Searching your notes**, at the end.
Since the same day the drawer can move a title as well: the current pass's heading is a control
that opens on the board's columns.
**Loaded through `hobbyDefinition(hobby).journal.load`**, which hits the hobby's own detail route
and maps what comes back into one `TitleDetail`; `logEntries[0]` *is* the pass the board is showing,
because every detail endpoint shares the board's ordering.

**One drawer for every hobby, and the differences between them are of two kinds.** The words are
data and come from the registry: what a column is called, what the finished date is called. The
regions are not — a film's pass is *missing* two of a game's six fields rather than holding them
blank — so those are read off the loaded title, which says what it has rather than what it is.
Neither kind is a branch on the slug, and that is the point: `if (hobby === 'movies')` would be six
branches by the time books land. See **The journal drawer, for a film** in `docs/movies-tmdb.md`
for what a second hobby actually changed.

Settled:

- **The pass writes itself, and there is no Save button.** A pass is a handful of small
  corrections — a rating, the date you finished, the episode you are on — and a button between
  each of them and the record is a step nobody wants. A change arms a timer; the timer checks the
  rules and sends every field. `AUTOSAVE_MS` is **500ms**, which has to outlast the gap between
  two keys and must not outlast the reader's attention: a confirmation that arrives after they
  have looked away is one they will never see, and the drawer can be shut by then. Three
  consequences, each with its own bullet below: **a refused value stops the write**, **leaving a
  field deliberately does not send it**, and **closing the drawer does**.
- **The pass's heading moves the title**, since 7 October 2026, and that reverses what this line
  used to say: *no status control*, because dragging was the gesture and a second way in would need
  its own copy of the server's rules about which pass a move touches. The card's `⋯` menu then
  became a second way in **without** a copy — it calls the drag's own mutation — and the heading is
  a third caller of the same one, handed to the drawer by the board as `onMove`. The rules still
  live in one place, the move route. `journal/ColumnControl.tsx` holds the control: the column's
  name with a chevron, opening the board's columns as a group of buttons with the current one
  ticked. **Picked from renders** over a *Move* button beside the heading and the phone switcher's
  segments in its place, because it is the only one of the three that changes nothing at rest — the
  same `BAND_HEADING` type, the same 16px row, the same 44px down to Rating. The workshop is in
  `docs/plans/games-board-next.md`, #13.
- **Buttons, never a `<select>`.** Chrome on Windows changes a closed select on every arrow key and
  fires `change` each time: four presses of ↓ were four changes, measured in Chromium 151. Here a
  change is a move, so arrowing from Backlog to Dropped would stamp a completion on the way past.
  The genre select gets away with saving on change because the last genre wins; the last of four
  moves does not undo the other three.
- **Leaving Completed asks whether it was finished, in a tinted box.** Another column from a
  Completed pass is one of two things, and only the reader knows which: a replay, which inserts a
  new pass and keeps this one under *Earlier passes*, or a mistaken finish, which moves this pass
  itself and takes its finish date away. So the drawer asks *Did you finish it on Oct 8, 2026?*,
  answered *Yes — start a new pass* or *No — move it to Playing*. **The words were picked at the
  #14 workshop on 8 October 2026**, over a second button on #13's sentence and over two answers
  each with a line saying what it does, because they ask the one fact that decides it and the day
  is the clue. With no finish date, which a finish cleared by hand leaves, it asks *Did you finish
  it?* The words are `lib/finishQuestion.ts`'s, since a card asks the same question when a drag or
  its menu leaves Completed; see **Leaving Completed asks first** in `docs/board.md`. **The box was
  the user's pick at #13** over a line in the Delete confirm's shape: the one boxed thing in the
  pass, so it cannot be read past. Not red and not a fill, because neither answer loses anything.
  The first answer takes the keyboard when the box appears, both carry the question as their
  description, and every answer hands the keyboard back to the heading. **Until #14 nothing
  corrected a Completed pass's column in place**, which is the trap under *An earlier pass's
  fields* below.
- **A column taken off in Settings is offered nowhere, and still named while the pass is in it.**
  The list is the board's, as every card's menu is; a pass already in a hidden column has it
  ticked, because that stays true whether or not the board draws it. Since #12 that is reachable: a
  title in a hidden column has no card, and its search result opens this drawer.
- **A title that is not out yet is offered every column**, like any title. The board keeps an early
  build outside Backlog on purpose (*A second thing that narrows a column* in `docs/board.md`), and
  leaving Backlog takes a title off the calendar while moving it back returns it. The heading is the
  first thing that can move one at all: a tile offers it only *Add to calendar*, and a calendar row
  has no menu.
- **A move from the drawer happens in one order, and the pass holds still for it.** What the form
  owes is sent first (`EntryFormHandle.flush`), the move waits for every write still on its way
  (`writes` in the drawer, chained, because two can be in flight on a slow phone), then the move,
  which `useBoard` answers only once this drawer has refetched the moved pass. Meanwhile the heading
  names where the title is going and says *Moving…* beside itself, so nothing below shifts, and the
  pass is **read-only and dimmed**, both decided at pickup and picked from the renders. See
  **Every write of a pass carries its column** below for what that order prevents. **A finish put
  back takes the same order** (`moveTo` is handed the move to send), because it carries a column
  as any move does; *puts a pass back in the order a move is made* in `EntryDrawer.test.tsx` holds
  it.
- **A field a hobby does not have is *absent*, not relabelled and not disabled.** A film's pass has
  no Hours played and no Platform: "your time" on a film is the runtime, which is a fact about the
  film rather than about the evening. `EntryForm` takes an explicit field set for this, stated
  rather than inferred from the values — "no platforms listed" and "a hobby with no such idea"
  would otherwise look identical, and an unenriched game has no platforms either.
- **A field this hobby does not have submits `null`.** PUT clears an absent field, and a film's
  pass never holds hours or a platform, so a row that somehow has one is corrected by the next save
  rather than carrying a value with no control to see it by.
- **An earlier pass's *fields* are read-only; its *notes* are not, and the pass itself can be
  deleted.** A finished playthrough is a record of something that happened, and an editable date here
  would undo that with a keystroke. The two exceptions are deliberate: a note is yours to fix, and a
  pass that never happened — the ×2 a mistaken drag to Completed and back leaves behind — is not a
  record worth keeping. Correcting a *field* on a finished pass is still a psql job.
  **Which of the ×2 never happened is the trap, found on 8 October 2026.** The mistaken move edits
  the real pass to Completed and the move back starts the blank one, so the pass under *Earlier
  passes* is the real one, and its Delete said nothing about the notes it took. Deleting the blank
  one instead left the real one in Completed, which nothing corrected. Nine notes went that way
  and came back from the nightly backup. **#14 fixed the move, the same day**: *No — move it to
  Playing* puts the real pass back, so no blank one is made. A *Yes* given by mistake still makes
  one, and **#15 fixed the delete on 9 October 2026**: the real pass's notes go to the blank one,
  which is current, and the confirm says so first. See the next bullet but one.
- **Deleting confirms inline**, not `window.confirm`, which cannot be worded past the browser's own
  phrasing, cannot be styled, and has to be stubbed in every test that walks past it. Each button in
  the history names the pass it would take, because they all otherwise say the same word.
- **Deleting a pass keeps its notes while another pass stays, and its confirm says where they
  go.** They move to the current pass of the ones that stay, with their dates unchanged: *Its 9
  notes move to the current pass.* When the current pass is the one going, the next one takes them
  and is named the way its own Delete names it: *Its 3 notes move to the Completed pass from Jul 4,
  2026.* One rule rather than the pass nearest in time, which differs only with three passes or
  more and is harder to say in a confirm. **They always move.** There is no button to delete them as
  well, because a note can be deleted on its own and a second button in the confirm is a second way
  to lose them. A pass with no notes says nothing extra. The server's half is
  `LogEntryService.DeleteAsync`, which moves them in the same save as the delete. The drawer's is
  `deleteWarning` in `EntryDrawer.tsx`, which names the same pass because the passes arrive in the
  order the server picks it by. Decided at the #15 workshop; see `docs/plans/games-board-next.md`.
- **A confirm with something to say takes a line of its own, and says it above both buttons.** An
  earlier pass's Delete sits in the row with its rating, hours and platform, and a sentence there
  ran straight on from them whenever it fitted beside them: in the modal, in the wider drawer, and
  with a short sentence even in the narrow one. On a phone it left *Cancel* on a line by itself.
  `ConfirmDelete` does it, so every confirm with a warning has the shape, and one with none, a
  note's, keeps its place in the row. Picked from renders over the confirm alone on a line, and
  measured in `journal.spec.ts`, because jsdom has no layout to measure.
- **Deleting the last pass takes the title off the board**, and says so first, counting the notes
  that go with it: *…takes Hollow Knight off your board, and its 6 notes.* The card's *Remove from
  board* is the same delete from the board, and on a title with one pass says *and its notes*,
  uncounted, because a card knows only that there is a note: the one it shows.
- **Three bands, separated by a rule each**: what the title *is*, the pass you are on, and what you
  wrote during it. The same `border-line-soft` the settings menu puts between its three groups, and
  the same job — the drawer was one column of controls at one weight, where the first two are about
  entirely different things and the third writes to a different endpoint again. The lower two open
  with a heading in **one shared class, `BAND_HEADING`** — the pass says what its column calls it
  (*Completed* on a game, *Watched* on a film), the notes say *Journal*, which is the word the
  card's menu already opens them by and every hobby gets unmodified. Shared because matching is
  the entire point of them.
- **The second rule carries `my-1` and the first carries nothing**, which is what makes them the
  same. They sit in containers with different gaps — the header's rule is a child of the panel at
  `gap-4`, the notes' rule a child of the pass at `gap-3` — so left alone the second sits 12px
  clear of its neighbours where the first sits 16px. Two rules doing one job at two weights reads
  as a mistake rather than as a rhythm.
- **Everything belonging to the title sits in the header band, not the form.** The genre select, a
  film's Runtime, and the HowLongToBeat pin all describe the *title*, and `EntryForm` submits one
  `PUT` to the log-entry endpoint — putting any of them there would mean one form writing to two
  places. The genre select saves on the change itself and without the pass's half-second pause,
  because a `<select>` is one decision rather than a word being typed; the pin does not save on
  change at all — see **The pin**. They share a
  **two-track grid** so their controls line up, `max-content` on the first track so the wider label
  sets the column without either naming a width — which would have been one magic number in two
  files agreeing by luck. **`HltbPin` therefore renders a label and a control as siblings rather
  than a row of its own**, and says so at its own top: a component that has to sit inside a
  particular grid is not a thing to find out from the outside.
- **The pin and the four estimate tiers are gone together, off one null.** `TitleDetail.hltb` is
  one nullable block carrying the four figures and the stored id, because they arrive together or
  not at all. A film sets it to null and sets `journal.setHltbId` to null in the same file, so a
  hobby that wires one half of the pair fails loudly at the mutation rather than posting a film to
  `/api/games`.
- **A film's Runtime is a *fact* and lives in that band; the HowLongToBeat figures are not and do
  not.** The four chips sit beside *Hours played* because comparing them is the entire point. A
  film has nothing to compare against, so its runtime is a fact about the film like the director —
  `TitleDetail.facts` is what carries it, and it is deliberately not a control.
- **Under the title is one byline: the developer of a game, the director of a film.** It carried a
  game's platforms too while it was the one byline, but those have a control three rows down — a
  list of them there was a spec sheet where a name belongs, and the maker is the only fact on that
  line that appears nowhere else in the drawer. Which name it is, is the hobby's to say; that it is
  a name is not. **It lives inside the title block rather than beside it**, which is
  not tidying: the panel is a flex column with `gap-4`, and that gap is what holds the three bands
  apart — left as a sibling, the spacing built to separate *the game* from *this pass* was also
  separating a heading from the line belonging to it, 24px of nothing. Grouped, the 8px left is the
  leading between an 18px heading and a 12px line rather than any spacing at all. The close button
  stays outside the group, so it keeps its corner however far the title wraps.
- **The current pass's heading is a band heading; an earlier pass's is not.** `PassSection` is
  handed its heading, with the id that names the region, rather than a string and a `lead` flag:
  the current pass's is the column control and an earlier pass's is plain text. The current pass
  opens a band between two rules, as the header above and the notes below do, so its control wears
  the uppercase the app already uses for one — `BAND_HEADING`, passed into `ColumnControl` rather
  than copied, so the two band headings cannot drift. An earlier pass is a row *inside* "Earlier
  passes", and matching it would nest two levels of the same shout. **The region is still named
  for the column**: `aria-labelledby` points at the column's name inside the button, and the
  button carries a name of its own, *Column: Playing*, so a screen reader hears what it is for.
- **Delete sits hard right on the row the Save button used to be on, through an `actions` slot on
  `EntryForm`.** It used to sit under the form in the column every field label occupies, at the
  size every field label is set in, saying one word — so it read as a heading for whatever came
  next rather than as a button. A slot rather than a `ConfirmDelete` prop, because the form has no
  business knowing that deleting a pass exists; what it owns is the row. That row is `flex-wrap`,
  since a confirm replaces one word with a sentence naming what it would take. **The row survived
  the button going**, holding *Saving…* / *Saved* at the left where it stood: the delete kept its
  end, so the two things you can do to a pass are still at opposite ends of one line.
- **Leaving a field does not send it; the timer decides, and closing the drawer is what cannot
  wait.** A blur is one `focusout` per field, so flushing on it would be a write per stop while
  tabbing across the form — and choosing a season, which clears the episode under it by rule,
  would write *season 2, no episode* on the way to saying which episode. That one was **measured
  rather than reasoned about**: the television spec went red on it. The unmount flush is what
  covers the case a blur was there for, and it is the only hole a form that writes itself opens —
  closing over an unpressed button was visibly your own doing, where closing half a second after
  typing a rating is not, and the reader has no way of knowing which side of the delay they were
  on.
- **A write that fails for a reason no field owns says so where the confirmation would have
  been.** A button that stayed a button said *not saved* on its own, and pressing it again was
  the whole of the recovery; with nothing to press, the absence of a confirmation is the only
  other signal and nobody reads an absence as an error. `saveError` on `EntryForm`, shown only
  where `serverErrors` has nothing — a 400 that names its fields has already said this under each
  of them.
- **A value the rules refuse stops the write and leaves the form out of step with the server on
  purpose.** That is what keeps the refused value on screen to be corrected: the re-seed below is
  guarded on the form having nothing of its own to lose, so it would otherwise take an 8.75 away
  and put the old rating back, half a second after it was typed and with the message still under
  it. The `errors` state clears on the next attempt, so a corrected value sends and the message
  goes with it.
- **The wheel steps all three numbers, at the grain each control is for.** A notch on the rating bar
  is a whole point, on the exact-rating box a tenth, and on hours played half an hour — the same
  split the two rating controls already carry, where the bar is for finding roughly where a game
  sits and the box is for saying exactly. **It cannot be React's `onWheel`**: React registers
  `wheel` at the root as a *passive* listener, so `preventDefault()` there does nothing but warn and
  the drawer scrolls out from under the control while the value changes. `useWheelStep` in
  `src/lib/useWheelStep.ts` attaches a `{ passive: false }` listener to the node itself, which is
  the only way to take the gesture. Three more things it has to get right: the step **calls `onEdit`
  itself**, because a wheel changes state without the DOM raising an event and the form's one
  `onChange` never hears it — "Saved" would go on claiming the server has what is on screen; the
  rating **rounds to one decimal place**, since 8 + 0.1 is 8.100000000000001 and `parseRating`
  counts places in the *text*; and hours **stops above zero rather than clamping into range**,
  because clamping would make a scroll *down* from 0.25 raise it to 0.5. **The cost, stated:** a
  wheel over one of these controls is taken from the drawer's own scrolling, so reading a long
  journal with the pointer resting on the rating bar changes the rating. Gating on focus rather than
  hover is the fix if that ever bites, and is one condition in the hook.
- **The rating is a slider plus a number box**, `step="0.1"` over 1.0–10.0. Stars reach nineteen
  values, which would quietly retire the decimal place `numeric(3,1)` exists for. A range input has
  no empty state, so "not rated" is said out loud — blank box, dimmed track, `aria-valuetext`, and a
  Clear button absent when there is nothing to clear. The slider carries the field's label and the
  box is **"Exact rating"**, because two controls on one value need two names. Native rather than
  `appearance-none`, which removes the thumb and leaves nothing to grab.
- **Hours played sits above all four of HowLongToBeat's estimates**, which are a `<dl>` in a grid:
  **two columns in the drawer, four in the modal, switching at 32rem of container.** They were four
  spans in a wrapping flex row, which has exactly one width it looks right at — the modal had it and
  the drawer never did, where three fitted and Completionist dropped to a second line under nothing,
  its name no longer above the number it belonged to. Wrapping cannot be tuned out of that: the two
  boxes differ by 200-odd pixels by design. **A `@container`, not a viewport breakpoint** — the
  drawer is `max-w-md` on a 4K monitor exactly as on a laptop — and **the `@container` is on the
  wrapper, never on the grid itself**, since a container query unit resolves against the nearest
  *ancestor* container and an element cannot query itself. That trap already cost `--card-pad` its
  `cqi`. A `<dl>` because a label and its number now share a cell, so a reflow moves the pair or
  neither. `hltbTiers` in `src/journal/fields.ts` drops the tiers nobody has submitted a time for,
  so an empty list is the whole of *never matched* — one condition instead of three. It takes the
  game rather than three loose numbers, since three nullable numbers in a row is exactly the
  argument list where two get swapped in silence.
- **The estimates are a filled blue chip, and the blue is the same on every theme.** They are
  HowLongToBeat's numbers rather than this app's, so they wear one colour whatever the app is
  wearing — the genre stripes' argument, which is why `--color-hltb` and `--color-hltb-fg` sit in the
  plain `@theme` block beside them rather than in the palettes. **The window is much narrower than it
  looks**: white on the fill has to clear 4.5:1, which caps its luminance, and the chip has to stay a
  shape on Console's near-black, which puts a floor under it. `#1f6feb` reads 4.63:1 under white and
  3.6–4.6:1 on the light and dark grounds. A friendlier, more HowLongToBeat-looking `#4a90d9` reads
  white at **3.34:1** and is simply not available while the label is white. See **A fixed chip and a
  mid-tone theme** in `docs/design.md` for the one ground it cannot clear.
- **The difference is measured against the headline figure alone, and it sits beside your own box
  rather than in that grid.** Four deltas is arithmetic rather than a reading, and a completionist
  run held up against main story reads as wildly over when it is only over for a tier it was never
  doing. It used to be a fifth item among the estimates, which was fine while they were a row of
  spans and wrong the moment they became a block: it is a fact about you where those four are facts
  about the game.
- **"How long will it take me?" is a link under the four estimates, and a two-question quiz behind
  it.** It asks how much you play and how you will play this game, then answers with a day: *7
  more days — you'd finish around Oct 9.* It was picked at the #4 workshop on 2 October 2026, the
  user's own idea over a date under every chip, which is in `docs/plans/games-board-next.md`.
  `journal/HowLong.tsx` holds it and `lib/pace.ts` the arithmetic. Five things it settles:
  - **It costs the drawer one line until it is pressed**, on every game, even once it knows your
    answers. That was the trade for the quiz: one press per game, against nothing on screen you
    did not ask for.
  - **What you said is kept per board and per browser**, under `hobbytracker.pace.<hobby>`, so
    the next game is one press to its answer. Your play style is kept with your pace, by the
    figure's field name (`HltbTier.key`) rather than its label, which may be reworded. A style
    this game has no figure for is asked again rather than swapped for another tier.
  - **It is offered on Backlog, Playing and On Hold only** (`hasFinishAhead`), because a Completed
    or Dropped pass has nothing left to finish. Like the estimates, it is gated on the data and
    never on the hobby's name: a film has no estimates and no Hours played to sit under.
  - **It counts from the hours in the box, not the hours last saved**, so the answer moves as you
    type rather than half a second later. And it counts from tomorrow: 2 h left at 2 h a day
    finishes tomorrow, and nothing promises a day early. Past an estimate, it says *You're past
    it* rather than nought days.
  - **A card's `⋯` menu opens the drawer with the question already open**, as *How long for me?*
    — shorter, because the drawer's wording wraps in a menu that narrow. The board says which door
    the drawer came through on every opening, so a question asked from the menu is never still
    open for the next title opened by its name.
- **The estimate on a card is written `~42 h`**, announced as *About 42 hours to finish*. The tilde is
  doing real work: the drawer prints `31.5 h` for what a pass took *you*, so an unmarked number on a
  card would read as the same kind of claim. `formatHours` lives in `src/lib/hours.ts` so `board/`
  need not reach into `journal/`.
- **It is a real dialog** — `role="dialog"`, `aria-modal`, `aria-labelledby`, closed by the backdrop
  or Escape, focus moved in on open. Tab is contained on purpose: `aria-modal` already tells a screen
  reader the board behind is inert, and letting the keyboard walk out onto it would make that promise
  false for anyone who reads by tabbing. **That keyboard is `lib/useModalPanel.ts`**, moved out of
  `EntryDrawer` on 5 October 2026 when the share dialog in Settings needed the same promise kept,
  so the two cannot drift. Planting Escape-does-nothing there turns both dialogs' tests red.
- **The phone's Back closes it, which is why the drawer's openness is a history entry.** Android has
  one Back button and it means *out of this*; over an open drawer it took the board, which on a phone
  is the whole app. Opening pushes an entry so the press has something of its own to pop, and closing
  — the ×, Escape, the backdrop — *is* that press, so nothing is left behind for the next one to
  find. `useOverlayHistory` in `src/lib/` holds it and **derives the open journal from the entry
  rather than keeping a copy beside it**: two copies have to be told about every pop, and the first
  time they disagree the drawer is either shut over an entry nobody can see — one more press between
  the reader and the way out, per journal they ever opened — or open with nothing behind it.
- **A reload comes back to the open drawer**, which is that entry being a real one rather than a
  trick: the browser hands history state back after a refresh. On a phone that is the
  pull-to-refresh a thumb finds at the top of a long journal, and being thrown out of what you were
  reading is the worse of the two answers. Back still closes it, because the board is still the
  entry underneath. `journal.spec.ts` names it — the two note specs that reload mid-drawer would
  otherwise be depending on it silently.
- **The platform select offers the game's own list** from `GameDetail.platforms` — already loaded, no
  second request — plus a blank "Not recorded". A stored value that list no longer mentions stays in
  it and stays selected.
- **Each pass is a labelled region**, which is how `Column` already solves several identically-named
  controls on one screen. The compose box is open on the pass you are on and a click behind "Add a
  note" on one that is over; **a note's controls name it by its timestamp**, and notes carry the time
  of day, because "Beat it at 9:30 PM" is the entry worth reading back where the date alone is a
  filing label.
- **Enter sends a note; Shift+Enter puts a line in it.** Both boxes — the compose box and the one
  that rewrites a note — because they are one box doing one job, and a textarea answering Enter in
  one place and not the other is the near-miss this codebase has paid for elsewhere. The edit box is
  the arguable half and is one call site in `NoteList.tsx` to take back. Shift+Enter is not a
  concession: a note's body is stored and rendered whitespace-preserved, so several lines is
  something the feature already supported and only the keyboard was in the way of.
- **`noValidate` on the form.** `step="0.1"` stays for the spinner and the mobile keypad, but native
  validation silently refuses to submit an 8.75 and shows a bubble that cannot be worded, styled or
  tested — and *why* two decimal places are refused is the part worth saying.

### The things that fail quietly here

- **The push takes a path, never the location object.** react-router reads any value carrying
  `pathname`/`search`/`hash`/`state`/`key` as a whole location and uses *its* state, so
  `navigate(location, { state })` quietly pushes the previous entry's state and key again and the
  drawer never opens. A `Partial<Path>` is what makes the options argument count. What comes back
  *out* of an entry is checked rather than trusted, for the reason a stored theme is: the browser
  hands the state back after a reload, from whichever build wrote it.
- **That entry carries the same path on purpose**, so the router matches the same route and React
  reconciles rather than rebuilding. A remount would take the board's per-column sorts, its chosen
  year and its open Dropped well with it — a reload nobody asked for, on the way out of a drawer.
  `App.test.tsx` pins it, checked by keying that route's element on the location, which fails that
  one test and nothing else.
- **Focus goes back to the button the drawer was opened from, by id, not by a stored element.**
  Refetches remount the card while the drawer is open, so the node captured at open time is usually
  detached. **Each door has an id of its own**: `cardTitleId` in `src/board/Card.tsx`,
  `calendarTitleId` in `src/board/ComingSoon.tsx`, `resultTitleId` in
  `src/search/SearchResult.tsx`, and since #6 `noteResultId` in `src/search/NoteResults.tsx`, by
  the note rather than the title, because one title can have several notes found. One id would not
  do, because a title on your board is very often a card and a search result at once, and two
  elements cannot share one. `BoardPage` keeps the id of whichever was pressed. **The calendar's door lost the keyboard until 7 October 2026**: it was
  handed back by `cardTitleId`, a title on the calendar has no card, and the keyboard was left on
  the page.
- **The form re-seeds from a changed pass rather than being rebuilt on a React key, and the
  autosave is the whole reason.** It *was* keyed on the values it was seeded from — `entrySeed`,
  now gone — because `useState` reads its initial value once and a transition *edits the current
  entry in place* rather than adding one, so the id holds still while the values change
  underneath; keying on the id alone left a game just dragged to Playing showing an empty Started
  even after the refetch had landed. That is still the requirement. What changed is that a key
  change is a **new set of DOM nodes**, and a form that writes itself is refetched half a second
  after every keystroke — so the field being typed into would lose the keyboard on each write.
  Assigning the same values to the inputs that already hold them costs a render and changes
  nothing on screen. `key={current.id}` stays, because a *different* pass is a different form.
- **`agreed` holds the seven values the server is believed to have, and the re-seed asks it field
  by field.** `passValues(entry)` and the seven pieces of state are each flattened to one string by
  `valuesKey`, and `held` matching `agreed` whole is "there is nothing here the server has not been
  told", which is when the timer has nothing to do. It moves on exactly two occasions: a write is
  sent, and the pass underneath is taken as the truth. **The re-seed runs when the pass changes, and
  takes the pass's value for each field the reader has not touched since `agreed` last moved**; a
  touched field keeps what was typed and stays owed. A refetch answering our own save changes
  nothing, because it says what `agreed` already says — which is what stops it putting the old
  rating back over what is being typed. **It was all or nothing until 7 October 2026**, guarded on
  nothing being owed, and that was the hole a move found: a rating the rules refused, held across a
  move, kept the form from ever taking the start the move stamped, and the corrected rating went
  with an empty Started. *Keeps the start a move stamped while a refused rating waits to be
  corrected* in `BoardPage.test.tsx` goes red under the old rule. A field left out of `valuesKey`
  is a field a refetch cannot correct on screen, which is the bug `entrySeed` was written for in
  its own words.
- **The timer's handler comes out of a ref refreshed every render.** It is armed on the render
  that changed a field and fires half a second later, by which time the pass underneath can have
  been refetched — and `dateFieldValue` reads it to tell an untouched day from an edited one.
  `useWheelStep` keeps the same ref for the same reason.
- **Every write of a pass carries its column and its dates, so anything else that writes the pass
  races the autosave.** The form sends the status it was loaded with, and `UpdateAsync` writes
  whatever status it is sent. Measured on 7 October 2026, with the heading built and the order
  above left out: a rating typed inside the half second before a move from Backlog to Playing
  ended one of two ways. With the move's refetch first, the save went with the old, empty Started,
  and the server was left Playing with no start — in no year, so off the board. With the save
  first, it went with the old column, and the server put the pass back in Backlog while the board
  was showing it moved. Both cases are in `BoardPage.test.tsx`, run against a fake that keeps the
  passes the way the API does, and `journal.spec.ts` runs the first against the real one. **The
  field-by-field re-seed makes the first order safe on its own; the order is what the second
  needs.** Planting the move without the flush left the refetch-first case green, in Vitest and in
  a browser, and turned the save-first case red.
- **Read-only is a gate on change events, not `disabled` or `inert`.** A browser takes focus off a
  control the moment it is disabled or made inert, and the keyboard lands at the top of the page —
  `DeleteAccount` measured that first. So while a move is on its way `EntryForm` stops every
  field's change at the `<form>` in the capture phase, and React puts each controlled field back as
  it was. The × and the wheel over the rating and the hours change a value with no change event,
  so they check `moving` themselves. `pointer-events-none` keeps a select from opening onto a choice
  that would only be put back. The heading is `aria-disabled` for the same reason: the keyboard is
  on it, since it is what started the move.
- **An Escape meant for the heading's list stops at its container.** The drawer closes on an Escape
  heard at the `document`, so the list's handler stops the event, or closing the list would close
  the journal. The card's menu needs nothing of the kind, because it is not inside the drawer.
- ***Moving…* is a second `role="status"` in the dialog while a move is on its way.** `passSaved`
  in `e2e/support/board.ts` expects the dialog to hold one, so a spec that waited for *Saved*
  mid-move would fail as a strict-mode violation. Wait for the move first: the heading naming the
  new column, or Started showing the stamped day.
- **A save says "Saved", and the flag lives in the drawer.** It went there because the form used
  to be rebuilt by the refetch that confirmed the write, destroying a flag set on success — the
  button appeared to snap straight back to *Save*. The form no longer remounts and the flag stays
  there anyway, because it is the answer to a question about the write and the write is the
  drawer's. Not read off `save.isSuccess`: that stays true until the next write, where this has to
  stop being true the moment a field is touched, so `onEdit` clears it. One `role="status"` for
  *Saving…* and *Saved* both, absent when there is nothing to say, and not on a timer. One
  `onChange` on the `<form>` catches every field, because React's synthetic events propagate
  through the tree.
- **Its Playwright spec scopes `role="status"` to the dialog, and has to.** dnd-kit mounts a live
  region of its own to announce a drag, so the board behind carries a second `role="status"` — enough
  to fail a bare `getByRole('status')` as a strict-mode violation. The Vitest suite cannot show you
  that: it mounts the drawer without the board's `DndContext`, so the spec was green in jsdom and red
  in a browser. `passSaved` in `e2e/support/board.ts` holds it, and every spec that corrects a
  field now goes through it — waiting for that line is not politeness, it is the only thing
  standing between the assertion and a request that has not been made yet. The one exception is
  named in the spec that has it: a refusal never produces a confirmation to wait for.
- **The Enter that accepts an IME candidate must not send the note.** An input method reports it as
  an ordinary key press, so without `event.nativeEvent.isComposing` a note typed in Japanese or
  Korean is sent halfway through its first word — and what was sent is a note rather than a draft,
  so there is nothing to take back but a delete. Read off the *native* event, because React's
  synthetic one does not carry the flag. `sendOnEnter` in `src/journal/NoteList.tsx` holds it, and
  jsdom does implement `isComposing`, so the case is a Vitest one rather than a Playwright one.
- **A key press consults no button, so a `disabled` is not a rule.** The edit box refused an empty
  body only through its Save note button's `disabled` attribute — which Enter walks straight past
  and into the 400 the API answers an empty body with. The guard lives in `rewrite()` now, and the
  button calls the same function, so the two cannot come to different answers.
- **The form submits every field, every time.** `PUT` means an absent field is *cleared*, so sending
  only what changed would wipe the rating whenever somebody corrected a date. `pick()` in
  `src/api/logEntries.ts` drops `undefined` but keeps `null`, which is what makes "cleared"
  expressible at all. Notes are outside the form, each its own row and its own write.
- **An untouched date goes back as the instant it arrived as.** The input shows a day, the column
  holds a moment; re-deriving from the day on screen would move a 21:30 start to midnight — silent
  loss on a save the user made about something else. Only an edited field is sent as a bare date
  (`dateFieldValue`).
- **The rating is validated on the input text, not the parsed number.** `8.75 * 10` is not exactly
  `87.5` in binary floating point, so counting decimal places arithmetically is a way to accept the
  one value the rule exists to reject. `parseRating` mirrors `RatingAttribute` word for word, and
  `parseHours` mirrors `PlaytimeHoursAttribute` one decimal place further out.
- **Writing a note invalidates the library as well as `mediaKey(hobby, mediaId)`**, and it did not
  used to: the old rule was that nothing a note does shows on a card, true right up until a card
  started carrying the last thing you wrote. All three of `useNotes`' mutations move something on
  the board now. Both halves are scoped to the hobby, which they were not while the drawer knew
  only a media id — the board hands it down now.
- **Anything placed inside the pass's form that is not a field of the pass must keep its changes
  to itself.** `EntryForm`'s one `onChange` hears every change event below it, because React's
  bubble, and takes "Saved" away when one arrives — which is right for a field and wrong for
  "How long will it take me?", whose pace box and date write nothing to the pass. Left alone,
  typing a pace makes a saved pass look unsaved. `HowLong` stops change events at its own root;
  *leaves Saved alone while you answer it* in `EntryDrawer.test.tsx` goes red without that.
- **A question that moves on takes the keyboard with it.** Each answer in the quiz takes the
  button that gave it off the screen, and focus with it — to the body, outside the drawer, where
  the next Tab walks the board behind an `aria-modal` dialog. `HowLong` moves focus to its own
  group after each step, and back to its link when hidden.
- **The genre select is labelled through `htmlFor`/`id` like every other field.** A wrapping `<label>`
  makes the select's accessible name absorb its own option text, which made `getByLabel('Platform')`
  match two controls.

## Searching your notes

Built for #6 in `docs/plans/games-board-next.md` on 9 October 2026, from a workshop the same day.
**The bar's half** — the *Titles | Notes* switch, the results, the cache key — is in
`docs/games-igdb.md`, under **Search on the board**, because `frontend/src/search/` is that file's.
What is here is the server's half, `NoteService.SearchAsync` behind `GET /api/notes/search`, and
the journal's, which opens at the note found.

### What matches

- **Every word, in any order, each one matched as the characters it is.** One `ILIKE '%word%'`
  per word, all of which have to hold, so *temple boss* finds *the boss in the water temple*. The
  plan said the exact phrase; the user picked every word at pickup. The words are split on whatever
  whitespace separates them, which `char.IsWhiteSpace` counts the ideographic space a Japanese
  keyboard types among.
- **`ILIKE`, not full-text search.** Notes get written in Japanese and Korean: Postgres's `english`
  configuration would mangle that text, and no configuration splits Japanese into words. `sendOnEnter`
  already guards the input method for the same people. At this scale no index is needed;
  `pg_trgm` is the upgrade if one ever is.
- **Each word is escaped, the escape character first.** `ILIKE` reads `%` as anything, `_` as any
  one character, and `\` as "take the next literally", so unescaped, *50%* would find every note
  with a 50 in it. The backslash goes first, or the escapes added for the other two are escaped in
  turn. `NoteSearchTests` has a case for each of the three, each finding a second note when its
  escape is taken out.
- **Yours, and one board's.** Scoped through `n.LogEntry.UserId`, as every query on `notes` is,
  and through the title's hobby, because a result opens this board's drawer, which could not open
  a film from the games board. The board is required and has to exist: an unknown one would answer
  with nothing, which reads as "you never wrote that".
- **Newest first, at most fifty, and the answer says when there were more.** It takes fifty-one and
  keeps fifty, rather than counting every match. `id` breaks a tie, as it does for a title's passes.
  A search is narrowed by another word rather than paged, and the board says so.
- **At most 200 characters.** Every word is a clause in the query, so the length is what bounds
  how many there are. An empty or blank search is a 400, as is a missing or unknown board.
- **The title is the card's**: the English name leading and the romaji under it, for anime, by the
  downcast both board projections use, in the terminal projection where a downcast is safe.

### Opening the journal at the note

- **The note is brought into view and given the keyboard**, once the title has loaded, so a
  screen reader reads the note the search was for rather than the journal from its top. It is
  `aria-current` in its list and takes focus with `tabIndex={-1}`.
- **After `useModalPanel`'s focus, in the same component.** The panel takes the keyboard as it
  opens; on a title already in the cache both run on the first render, and effects run in the
  order they are declared, so the note's comes second and wins. In `NoteList`, a child, it would
  run first and lose.
- **Once, not on every change to the title.** The effect depends on whether the title has loaded,
  not on the title: a write refetches it with the note still there, and taking the keyboard back
  each time would take it out of the field being typed into. *Leaves the keyboard where it went
  when the pass is refetched* in `EntryDrawer.test.tsx` holds it.
- **Marked with a bar of the accent beside it**, until the journal closes, and the words it was
  found by marked inside it as they are in the results. Picked at the workshop over the note tinted,
  which was a red wash on Ember and put two tints on one note, and over a ring that fades, which
  leaves nothing to say which note it was once you look away. The negative margin and the padding
  cancel, so the note's text stays in line with the others and the bar sits in the margin. No
  outline, because the bar is what shows where the keyboard is.
- **Every pass's list is told which note**, and the one holding it marks it, because the note can
  be on an earlier pass.
- **The board sets it on every opening**, as it does `askHowLong`, so a note found once is never
  marked in the next journal opened by another door. It is state rather than part of the history
  entry: a reload brings the journal back, at its top.

