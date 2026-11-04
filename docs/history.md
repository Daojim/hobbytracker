# How it got here

> Moved out of `README.md` on 1 November 2026, when the README became a tour. Every phase and
> feature in the order it shipped, written for a reader rather than for a session. **A feature that
> ships adds its entry here**; what each one learned is in the `docs/` file for its area.

- [x] Schema, IGDB integration, game search
- [x] Journal, library, and the test suite
- [x] React + TypeScript frontend — the kanban board and its drag, search, and the journal drawer
- [x] Notes as dated journal entries rather than one box that overwrites itself
- [x] HowLongToBeat completion times — all three of them, with a matcher that refuses rather than
      guesses, and a pin in the drawer for when it does. Verified against the live site, and
      end to end against a stub that serves every leg of the site's access shape
- [x] A real design — semantic tokens, four themes, two densities, and a board that works from
      768px up
- [x] Search that finds the game you meant, rather than the mod named after it
- [x] Google and Discord sign-in, an httpOnly cookie session, and every pass and note scoped to
      whoever wrote it
- [x] A deployment: one Dockerfile, Caddy in front, and an origin the app is told rather than left
      to guess behind a proxy that terminates TLS
- [x] A polish pass — three themes in registers the board had none of (two more lights and its
      first mid-tone), a Visual Novel genre, HowLongToBeat's estimates as chips that read the same
      in the drawer as in the modal, a journal cut into three ruled bands, and the wheel stepping
      the rating and the hours
- [x] A second hobby, and the refactor that made room for it. Films from TMDB — their own board at
      `/board/:hobby`, a `movies` table beside `games`, and metadata fetched when a title is added
      rather than queued, because TMDB is a documented API where HowLongToBeat is a scrape. Every
      word a hobby owns — its column names, its genres, what a pass of that kind even records —
      moved into one file per hobby, so a film's journal has a director and a runtime where a
      game's has a developer and four completion estimates
- [x] A third hobby, on the same provider and a source row of its own. TV from TMDB — seasons in
      a table beside `tv_shows` because EF Core refuses JSON on a Table-Per-Type entity, a run
      length that is an estimate where a film's runtime is exact, and the first pass field no
      other hobby has: which season and episode you are on, shown on the card as `S3 E7` because
      being partway through is the whole point of a television board
- [x] A fourth hobby, from a provider nothing here had seen. Anime from MyAnimeList — **one card
      per cour**, because MAL numbers each season as its own entry and that is how anybody who
      uses MAL already thinks of them. It needed the platform to bend twice, and both bends went
      in as things every hobby now has: a pass can record an episode with no season, because a
      cour *is* the title; and a card can carry a second name, so an English title has the romaji
      one it was found by under it. A search here needs no follow-up request at all, which is the
      first time that has been true — and MAL's own result order is wrong for a person often
      enough to be worth re-ranking, which is measured rather than argued
- [x] A release calendar, for the half of a backlog that has not come out yet. A *Coming soon*
      agenda under the board, showing how far off each thing is — and it is a **view of the
      backlog rather than a place of its own**, which is the whole of why a game arrives in the
      backlog column on its release day with no job having run anywhere: the same row simply
      starts answering the other question. Dates are shown exactly as precisely as a publisher
      announced them, so a game slated for "Q1 2027" says that rather than a day nobody named —
      IGDB states those as a real date, and taking it at face value would be a fabrication that
      looked entirely plausible. A nightly sweep re-asks about the things that have not shipped,
      because release dates slip constantly and nothing else in the app goes stale on its own.
      A game nobody has put a date on at all says *TBA* and waits there with the rest — but a
      game IGDB calls a *rumour* does not, because a list of what is coming stops meaning much
      once Half-Life 3 is on it
- [x] Browsing what is popular, rather than having to know what to search for. A wall of covers,
      offered from under the empty search box, with four lists of what IGDB knows — newly out,
      being played, most anticipated and most played — 48 at a time with a Load more, and the same
      one-click add search has. A game not out yet goes on the release calendar, as it would from
      search
- [x] Adding straight into a column. Every search result and every cover on the wall carries three
      drawn buttons — + for the backlog, ▶ for playing, ✓ for finished — so a game finished years
      ago goes to Completed in one press rather than a press and a drag. The dates it arrives with
      are the ones a drag would have stamped, by the same code on the server, and the tile then
      says which column the title is in rather than only that it is on the board
- [x] A board that works on a phone. A swipe that began on a card used to drag the card, because
      every card took every touch for itself; now a finger holds still for a quarter of a second
      to pick one up, and a mouse drags exactly as it did — two input sensors where there was one.
      Below tablet width the board shows one column at a time, under a switcher pinned to the top
      that counts every column, picked from four layouts rendered at a phone's width. A card
      carried up onto a column's name moves there. The drag library measures every drop target
      once and then moves it with the page as the page scrolls, which is wrong for the one thing
      pinned to the screen, so the switcher is measured where it actually is. Then an icon, picked
      from four drawings on four of the app's own grounds and rendered on home screens before any
      was built, and a manifest, so the board installs as an app. The test of the manifest asks
      Chrome itself whether it would install the app, which only means something in a full Chromium:
      the headless shell Playwright uses by default answers that question with nothing at all
- [x] A record of when each title changed column, before anything reads it. History that was
      never written down is the one thing a later feature cannot backfill. It is written in the
      same save as the move, by one interceptor rather than by each of four services. A card
      shuffled through the columns inside ten minutes leaves nothing behind
- [x] Hours in each column's header, on the games board. A column adds up how long its games
      take to beat over the whole column, not just the hundred cards it loads, and Completed sets
      your logged hours against HowLongToBeat's over the games that have both. A game with no
      estimate is counted rather than added in as nothing. Where the line sits was picked from
      renders at three widths
- [x] "How long will it take me?" A question under a game's HowLongToBeat estimates asks how much
      you play and how you will play it, then answers with a day: *7 more days — you'd finish
      around Oct 9.* It is remembered, so the next game is one press, and the backlog's header
      reads the same pace to say how long the whole queue would take. The arithmetic is done in
      hundredths of an hour, because in floating point 2.1 hours at 0.7 a day is a fourth day
      nobody needs. Three designs were rendered in the drawer first, and the one picked was the
      user's own
- [x] Stats, a year at a time. What you finished, as covers filed under the month you finished
      them; your hours against HowLongToBeat's, game by game; your ratings; the share of what you
      started that you finished; and how long each game has sat in the backlog, which is the
      first thing to read the history of column changes recorded ahead of it. It counts every
      playthrough rather than every title, so a game finished in March and replayed in June is
      still a March finish, and a year's numbers never change because of something done later.
      Twelve choices were settled first, four in words and eight from renders of the real app
- [x] `/` to the search box, from anywhere on the board, without typing the slash into it. It
      does nothing while you type in a field, so a note can say "7/9" and *Fate/stay night* can
      be searched for, and nothing while a journal is open. It also waits while a card is being
      carried by the keyboard, which the plan missed and a real browser found: the drag was still
      listening, so the first space typed into the search dropped the card
- [x] A spreadsheet of the board, from a row in Settings: every game as its card shows it, every
      playthrough and every note, whatever year or columns the board is showing. Its dates are
      real dates, written as the day it was here, so a finish at 9pm stays on its evening rather
      than becoming tomorrow in UTC. Whatever was typed goes in as text, so a note that begins
      with `=` is a note. The row and the sheets were picked from renders of the real app
- [x] Deleting your account, from Settings on any board: a warning that names the sign-in and
      counts every board, a word to type before anything happens, and every other device signed
      out at its next request. The renders also found the page's ground stopping where a short
      board did, with the browser's white below it, and the root carries the ground now
- [x] A read-only share link to the board, for friends and portfolio reviewers: one per board,
      from Settings, with a box for each part it shows and the owner's name off until ticked. The
      visitor needs no account and gets the board, its calendar and its Stats, never a note, in
      words written to nobody. The user picked a banner across the top over the recommended
      heading, and the renders of the built app found a twelfth phrase still written to the owner
- [x] The journal from a search result: a game on your board opens its journal from its name in
      the strip, so one just found can be written about without finding its card. The name wears
      the accent, the user's pick from renders over a card's plain name, and measuring before the
      build found that the two-line limit on a name breaks quietly inside a button. A journal
      opened from the release calendar now hands the keyboard back, which it never did
- [x] Moving a title from its journal. The column's name at the top of the pass opens on the
      board's columns, and leaving Completed asks first, in a tinted box the user picked over a
      quieter line, because the finished pass is kept and a new one started. The journal writes
      itself half a second after each change, and a move made inside that half second could be
      undone by the write still waiting — measured both ways round, as two failing tests, before
      anything was fixed. A native dropdown was ruled out by measurement too: Chrome on Windows
      changes a closed one on every arrow key, and here every change would be a move
- [x] Putting a finished pass back. A game finished by mistake and moved back used to start a
      blank pass above the real one, and the tidy-up deleted the real one with its notes, which
      came back from the nightly backup. Leaving Completed now asks *Did you finish it on Oct 8,
      2026?*, on a card as well as in the journal, and *No* moves the real pass back without its
      finish. Reading the code first overturned two of the plan's recommendations: an Undo is
      not a move back, and recording both moves would have restarted a backlog wait
- [x] Deleting a pass keeps its notes. They went with it by cascade, which is how the tidy-up
      above lost them, and they move to the current pass now, in the same write as the delete,
      with the dates they were written on. Every confirm that deletes notes says so, the card's included.
      The renders found the new sentence running straight on from a pass's hours and platform in
      a wide drawer, so a confirm with something to say takes a line of its own, measured in a
      real browser because jsdom has no layout
- [x] Searching your notes, from a switch beside the search box: every word in any order, on
      every board, and a note found opens its journal at that note with the words marked. A plain
      substring search rather than full-text, because notes get written in Japanese, with each
      word escaped so *50%* means fifty per cent. The renders found the obvious highlighter
      invisible on one theme, so a word found wears the theme's accent instead, the user's pick
      over bold
- [x] A release window that has begun. A game announced for "2026" said it came out 276 days
      ago, because the calendar counted from the first day of the window. Now only a game with a
      real day counts down, and a window says what was announced and nothing more. Rendering
      the real catalogue found the bigger fault: ordered by first day, the calendar repeated its
      headings. Each window now sits at the last day it could come out, under a heading of its
      own. No test had caught it, because the test data never had the shape the API sends
- [x] "What should I play next?" A button in the backlog's header opens a picker: how long you
      want to play and genres to leave out, then a wheel of covers that spins onto one, or three
      suggestions, over the whole column rather than the hundred cards it loads. The pick is made
      before the wheel turns, which lets a test name it and lets reduced motion show the same
      pick with no spin. The real backlog was read before anything was drawn: six games, every one
      28 hours or more, so the planned evening and weekend held none of them and a fourth band was
      added. Each wheel's spin was recorded on a phone for the workshop, because motion is not a
      still, and the recordings caught a curve whose tail made the wheel look stopped a second early
- [x] Pictures in notes: pasted, dropped or picked, four to a note, and a note can be a picture
      alone. Each is shrunk in the browser before it is sent, and the server reads a file's type
      and size from its bytes rather than from what the browser claims. They are kept in Postgres,
      in two tables so the bytes sit apart from what a journal reads, and a test proves on the SQL
      that none of the eleven reads carrying notes touches them. The card's 28px thumbnail was the
      user's pick from renders over the words *A picture*. Measuring found two things a test could
      not show by itself: Chromium and Firefox both turn a phone photo upright whatever the code
      asks, and the test server keeps no request-size limit, so that limit is proved against the
      real server
- [x] An estimate that catches up. HowLongToBeat lists a game before it comes out, with no times
      on it, and the matcher compares names, so a game added from the release calendar was
      matched, kept its id, and never had an estimate: fifteen on the real board were like that,
      every one matched before its release. A circular arrow beside the HowLongToBeat id now asks
      again, there and then, and the journal says when it was last asked; the backfill runs by
      itself once a day, thirty days after each title's last ask. The arrow beside the box was the
      user's pick from renders over *Check now* in the line that says there is no estimate, and
      while it checks it turns in place, because a word there was wider and pushed the link onto
      a line of its own
- [x] The titles a column's header leaves out. A header counts what its figures could not add
      up, *1 with no estimate* and Completed's *2 without your hours*, and on your own board each
      count now opens a list of those titles, a cover and a name each, under the whole header at
      the column's width; a title in it opens its journal, at Hours played from the list without
      your hours. The count in the link colour was the user's pick from renders over a dotted
      underline. The lists come with the column, from the rows the sums already read, so a list
      cannot name a title its count did not count, and a share counts and names nothing
- [ ] A Discover list from your ratings: IGDB's similar games for what you rated highest, less
      what is already on your board, if a look at the real results says it is worth building
- [ ] Books and music, on hold — each would be a sibling detail table plus its source integration
