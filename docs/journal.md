# The journal

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

## The journal drawer

The board moves a title between columns; the drawer is where you say anything *about* it. Click a
card's title and it slides in over the board — rating, platform and the two dates, a list of dated
notes, and every earlier pass with its own notes below it. **Loaded with `getGame`**, which answers
with the game and every entry in one request; `logEntries[0]` *is* the pass the board is showing,
because the endpoint shares the board's ordering.

Settled:

- **No status control.** Dragging is the gesture that changes a column, and the rules about which
  entry that touches live on the server; a second way in would need its own copy of all of it.
- **An earlier pass's *fields* are read-only; its *notes* are not, and the pass itself can be
  deleted.** A finished playthrough is a record of something that happened, and an editable date here
  would undo that with a keystroke. The two exceptions are deliberate: a note is yours to fix, and a
  pass that never happened — the ×2 a mistaken drag to Completed and back leaves behind — is not a
  record worth keeping. Correcting a *field* on a finished pass is still a psql job.
- **Deleting confirms inline**, not `window.confirm`, which cannot be worded past the browser's own
  phrasing, cannot be styled, and has to be stubbed in every test that walks past it. Each button in
  the history names the pass it would take, because they all otherwise say the same word.
- **Deleting the last pass takes the title off the board**, and says so first.
- **Three bands, separated by a rule each**: what the game *is*, the pass you are on, and what you
  wrote during it. The same `border-line-soft` the settings menu puts between its three groups, and
  the same job — the drawer was one column of controls at one weight, where the first two are about
  entirely different things and the third writes to a different endpoint again. The lower two open
  with a heading in **one shared class, `BAND_HEADING`** — the pass says what it is (*Completed*,
  *Backlog*), the notes say *Journal*, which is the word the card's menu already opens them by and
  the one every other hobby gets unmodified. Shared rather than written twice because matching is
  the entire point of them.
- **The second rule carries `my-1` and the first carries nothing**, which is what makes them the
  same. They sit in containers with different gaps — the header's rule is a child of the panel at
  `gap-4`, the notes' rule a child of the pass at `gap-3` — so left alone the second sits 12px
  clear of its neighbours where the first sits 16px. Two rules doing one job at two weights reads
  as a mistake rather than as a rhythm.
- **The genre select and the HowLongToBeat pin sit in the header, not the form.** Both belong to the
  title, and `EntryForm` submits one `PUT` to the log-entry endpoint, so putting them there would
  mean writing to two. The genre select saves on change; the pin does not — see **The pin**. They
  share a **two-track grid** so their controls line up, `max-content` on the first track so the
  wider label sets the column without either naming a width — which would have been one magic
  number in two files agreeing by luck. **`HltbPin` therefore renders a label and a control as
  siblings rather than a row of its own**, and says so at its own top: a component that has to sit
  inside a particular grid is not a thing to find out from the outside.
- **Under the title is the developer, and only the developer.** It carried the platforms too while
  it was the game's one byline, but those have a control three rows down — a list of them there was
  a spec sheet where a name belongs, and the developer is the only fact on that line that appears
  nowhere else in the drawer. **It lives inside the title block rather than beside it**, which is
  not tidying: the panel is a flex column with `gap-4`, and that gap is what holds the three bands
  apart — left as a sibling, the spacing built to separate *the game* from *this pass* was also
  separating a heading from the line belonging to it, 24px of nothing. Grouped, the 8px left is the
  leading between an 18px heading and a 12px line rather than any spacing at all. The close button
  stays outside the group, so it keeps its corner however far the title wraps.
- **The current pass's heading is a band heading; an earlier pass's is not.** `PassSection` takes a
  `lead` flag and the only thing it changes is the type. The current pass opens a band between two
  rules, as the header above and the notes below do, so it wears the uppercase the app already uses
  for one — the same type "Earlier passes" itself is set in. An earlier pass is a row *inside* that
  group, and matching it would nest two levels of the same shout.
- **Delete sits on the Save row, hard right, through an `actions` slot on `EntryForm`.** It used to
  sit under the form in the column every field label occupies, at the size every field label is set
  in, saying one word — so it read as a heading for whatever came next rather than as a button. A
  slot rather than a `ConfirmDelete` prop, because the form has no business knowing that deleting a
  pass exists; what it owns is the row its own button is on. That row is `flex-wrap`, since a
  confirm replaces one word with a sentence naming what it would take.
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
- **The estimate on a card is written `~42 h`**, announced as *About 42 hours to finish*. The tilde is
  doing real work: the drawer prints `31.5 h` for what a pass took *you*, so an unmarked number on a
  card would read as the same kind of claim. `formatHours` lives in `src/lib/hours.ts` so `board/`
  need not reach into `journal/`.
- **It is a real dialog** — `role="dialog"`, `aria-modal`, `aria-labelledby`, closed by the backdrop
  or Escape, focus moved in on open. Tab is contained on purpose: `aria-modal` already tells a screen
  reader the board behind is inert, and letting the keyboard walk out onto it would make that promise
  false for anyone who reads by tabbing.
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
- **Focus goes back to the card's title button by id, not by a stored element.** Refetches remount the
  card while the drawer is open, so the node captured at open time is usually detached (`cardTitleId`
  in `src/board/Card.tsx`).
- **The form is keyed on the values it was seeded from**, not on the entry's id — `entrySeed` in
  `src/journal/fields.ts`. `useState` reads its initial value once, and a transition *edits the
  current entry in place* rather than adding one, so the id holds still while the values change
  underneath; keying on the id alone left a game just dragged to Playing showing an empty Started even
  after the refetch had landed. The cost is that a refetch arriving mid-edit discards what was typed.
- **A save says "Saved", and the flag cannot live in the form.** `EntryForm` is keyed on `entrySeed`,
  so a save that changed anything remounts it — a flag set on success is destroyed by the very refetch
  that confirms it, which is why the button appeared to snap straight back to *Save*. `saved` is held
  in `EntryDrawer`, above the key, and is not read off `save.isSuccess` either: that stays true until
  the next write, where this has to stop being true the moment a field is touched, so `onEdit` clears
  it. `role="status"`, and not on a timer. One `onChange` on the `<form>` catches every field, because
  React's synthetic events propagate through the tree.
- **Its Playwright spec scopes `role="status"` to the dialog, and has to.** dnd-kit mounts a live
  region of its own to announce a drag, so the board behind carries a second `role="status"` — enough
  to fail a bare `getByRole('status')` as a strict-mode violation. The Vitest suite cannot show you
  that: it mounts the drawer without the board's `DndContext`, so the spec was green in jsdom and red
  in a browser.
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
- **The genre select is labelled through `htmlFor`/`id` like every other field.** A wrapping `<label>`
  makes the select's accessible name absorb its own option text, which made `getByLabel('Platform')`
  match two controls.

