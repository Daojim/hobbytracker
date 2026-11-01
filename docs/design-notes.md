# Design notes

> Moved out of `README.md` on 1 November 2026, when the README became a tour; it keeps six of
> these, shortened, and links here for all twenty. **Why** each area is built the way it is, at
> length, is that area's own file under `docs/`, which `CLAUDE.md`'s map names.

The decisions here that were actually decisions, and what each one costs.

**Table-Per-Type inheritance for media.** `media` holds one row per title whatever the hobby;
`games` is a detail table whose primary key doubles as its foreign key back. Films, shows and
anime arrived as sibling tables, and books would too. Table-Per-Hierarchy would make `media` a swamp of mostly-null
columns as hobbies accumulate; Table-Per-Class would duplicate the shared columns and turn
"everything I logged this year" into a `UNION` across every hobby. The cost of TPT is a LEFT
JOIN per subtype on polymorphic queries, and inserts touching two tables — acceptable at
personal-catalogue scale, and the reason querying the derived `DbSet` (an INNER JOIN) is the
cheap path.

**A partial unique index is what makes search idempotent.** `media (source_id, external_id)
WHERE external_id IS NOT NULL` is the natural key the IGDB upsert dedupes on — without it,
searching "halo" twice inserts every result twice. It is filtered because hand-entered titles
carry a null `external_id` and many must coexist. Two concurrent identical searches race; the
index turns that into a `23505` rather than a duplicate row, and the loser re-reads.

**The library is not the catalog.** Searching upserts every result as a side effect, so `media`
accumulates whatever has ever been typed into a search box. `/api/library` joins to `log_entries`
and returns only what you actually recorded something about. Conflating the two would make the
home screen a list of things you never asked to keep.

**One status vocabulary across every hobby.** `Backlog · InProgress · OnHold · Completed ·
Dropped`, for games and books and albums alike, stored as text rather than an ordinal. Per-hobby
statuses would make cross-hobby views impossible to write, and an int ordinal means reordering the
enum silently reinterprets existing rows. Text is also why On Hold arrived with no migration.

**Leaving Completed inserts a pass rather than editing one.** Replaying a game finished in 2024
must not overwrite that completion — several entries per title is the entire reason the schema is
shaped this way, and editing in place would destroy the record silently, on a gesture as casual
as a drag. **Unless you say the finish never happened**, which is why leaving Completed asks. A
mistaken finish moved back used to leave a blank replay above the real pass, and tidying that up
deleted the real one, notes and all. Now the answer *No* moves the real pass back and takes the
finish off it, and the column history forgets the finish rather than recording it and its undoing.

**The journal drawer's openness is a history entry, not component state.** Android has one Back
button and it means "out of this" — over an open drawer it left the board, which on a phone is the
whole app. So opening the drawer pushes an entry and closing it goes back, and a refresh comes back
to the open drawer, because that is what a history entry is. What is open is read out of the entry
rather than kept beside it: two copies have to be told about every pop, and the first time they
disagree the drawer is either shut over an entry nobody can see — one more press between the reader
and the way out, per journal they ever opened — or open with nothing behind it.

**Sessions are an httpOnly cookie, and scoping is an injected `ICurrentUser`.** Not a JWT, and
not an EF global query filter. A query filter would scope every read automatically and
invisibly — which means nobody can review it at the call site, the background HowLongToBeat
worker would have no user to scope to, and when one goes wrong the symptom is an empty board
rather than an error. Sixteen query sites carry the predicate by hand, and twenty second-user
tests were written red first, and each was checked afterwards by reverting one predicate at a
time: every one fails exactly the tests that name it and nothing else.

**The session cookie carries a date, and phones are the reason.** A browser keeps a cookie with no
expiry only until it restarts, and Chrome on Android deletes those when it starts — which Android
makes it do whenever it wants the memory back. For the app's first five weeks the thirty-day
session was real on the server and invisible to the browser, so phones were signed out at random
while a desktop browser, open for days, never was, and redeploys took the blame. One flag fixed it,
and a test now restarts the browser to prove it.

**A session is checked against its account on every request.** The cookie is self-contained, so
deleting an account changes nothing about the cookie every other device holds, and for up to
thirty days that device would carry on as a user with no row: reading an empty board, and failing
every write with a 500. Looking the user up by primary key on each request costs one indexed read
and closes the window completely, where checking only every so often would leave it open for the
interval. The backend suite signs in by header, so the test of this builds a host that reads real
cookies, and was red first for exactly that pair of symptoms.

**A share link is the one board read by nobody, so whose board it is gets said at every read.**
The anonymous controller holds three narrow interfaces, a lookup by token and reads that take
their owner from the caller, and nothing that writes or asks who is signed in. The easy
alternative, making a share's request look as though its owner had signed in, would have handed
every write path to anybody with the link. No route a share reaches selects from `notes`, and a
test proves that on the SQL rather than the JSON, because a note read and thrown away looks
exactly like a note never read. Another reads the routing table, so a route anywhere that forgets
`[Authorize]` changes a list that is asserted.

**A pass's history is written by an interceptor, which is the opposite of the scoping decision,
on purpose.** A move edits the current pass in place, so when it happened would be lost without
`status_changes`. Four services set a status, and none of them records it. One EF
`SaveChangesInterceptor` writes the row during the save, which is exactly the invisibility the
note above rejects. The difference is in how each fails. A scoping filter gone wrong hides or leaks
somebody's data, so scoping stays at the call site where a reviewer can see it. A recorder missing
from one write site loses that history for good, and nothing errors, so here the forgotten site is
the risk worth designing out. A card shuffled through the columns inside ten minutes is folded away
as the row is written, so nothing that reads the history has to know about shuffles.

**Pictures are kept in Postgres, with their bytes in a table of their own.** On a volume of files,
every cascade — a note deleted, a title taken off the board, an account deleted — becomes code that
finds the files and deletes them, and a storage service is an outside connection with keys to
keep. In the database the cascades are the whole of the deleting, and the nightly dump the whole of
the backing up. The cost is that dump, which carries every picture every night. The bytes sit
apart because every read that carries a note brings its pictures with it: kept in the same rows,
a journal opening would pull every picture's bytes out of the database for an answer that sends
none of them, since the browser fetches each picture from its own address. That is slow rather
than wrong, so nothing would have noticed. A picture has no navigation to its bytes, so no
query can reach them by accident, and a test reads every route that carries notes on the SQL and
finds them never touched.

**A card shows the number HowLongToBeat itself leads with, and it is fetched rather than
averaged.** The site prints one headline figure above its three tiers — 42 hours for Hollow
Knight, whose main story is 27 and completionist 65.6 — and it is not a function of them. The
mean of the three is 44.6 and their median is 39, and the site publishes both of those under
their own names on the same payload; the headline is a fourth statistic over every submission.
So computing it would have produced a real number that is simply not the one anybody sees.
The sort follows the card onto that field, because a column ordered shortest-first on a figure
none of its cards show reads as broken.

**HowLongToBeat's matcher refuses rather than guesses.** Two ways of refusing, because there are
two ways of being wrong: the numerals have to agree outright ("Final Fantasy VII" scores ~0.97
against "VIII" on letters alone), and the winner has to beat the runner-up by a margin, or the
two identically-titled *Resident Evil 4* entries are settled by a coin flip that looks from
outside exactly like a confident match. Calibrated against a real library, where every correct
match scored 1.0 and the closest wrong one scored 0.64. When it refuses, you pin the id by hand
in the drawer — which survives the next backfill, as typed-in hours would not.

**IGDB's own ranking cannot tell a game from a fan game named after it.** Searching "Hollow
Knight Silksong" returns a one-person Game Boy Color game *above* Team Cherry's, because the fan
game's title is that exact string and the real one has a colon in it. So results are re-ordered
by how many people have played the game before how well the title matches. Two other rules were
tried against the live API and are worse; both are pinned by tests named after what they got
wrong.

**The obvious list of what is popular is the one not to show.** The Discover page fills a board
without a search box, from IGDB's popularity data: eleven lists, every one measured before
anything was built on it. The obvious one, what people are looking at, had eleven titles tagged
Erotic in its top sixty; Steam's lean on PC live-service games, and its top sellers are whatever is
on sale.
So the wall shows what is newly out, what people are playing, what is most anticipated and what
the most people have played — and every list carries a filter a search does not, because somebody
who typed a title asked for it and a wall shows what nobody asked for.

**Page two of a list does not start at the 49th title.** The wall comes 48 at a time with a *Load
more* under it, and two of the lists drop titles after IGDB has answered — a game in early access
is not "anticipated", and PopScore ranks games the question describing them then declines — so
page one already reaches past IGDB's 48th place to fill itself. A page number can only multiply.
So each page says where the next one starts, and the client hands that back. Going deeper also
meant measuring deeper: every list was read 500 titles down before the button existed, which is
how Most anticipated turned out to carry cancelled games from page two on.

**Ratings reject two decimal places.** The column is `numeric(3,1)`, and Postgres *rounds* rather
than refusing: an accepted `8.75` is stored as `8.8`, and the response would report a rating the
database does not hold. A 400 is the honest answer.

**Updates are `PUT`, not `PATCH`.** A field absent from the body is cleared. `PATCH` cannot
separate "clear the rating" from "leave it alone" without an `Optional<T>` wrapper, and this is
the operation the app hits most.

**Every colour in the app has a semantic name, and `index.css` is the only file that names one.**
Eight themes and two densities are blocks of custom properties there; no component knows a colour,
so adding a theme is a table of values and one line of TypeScript. A test checks every foreground
against every ground it sits on, across all nine palette blocks — it exists because the same
mistake happened twice, once leaving muted text at 3.8:1 for the life of the board.
