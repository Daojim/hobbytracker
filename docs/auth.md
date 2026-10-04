# Auth and scoping

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

## Auth

Google and Discord sign-in, an httpOnly cookie session, and every pass and note scoped to the
person who wrote it.

| | |
|---|---|
| Session | **An httpOnly cookie with a date on it**, self-contained and encrypted — thirty days, sliding. Not a JWT, and no sessions table |
| Mechanism | **The framework's generic `AddOAuth`**, not the `AddGoogle` package and not hand-rolled |
| Providers | **Google and Discord**, both required at boot |
| Accounts | **Anyone can sign up.** Real multi-user, one board each |
| Scoping | **An injected `ICurrentUser`**, not an EF global query filter |
| Existing data | **Discarded** when `user_id` became `NOT NULL`. The catalogue rows stayed |
| Deleting | **`DELETE /api/account` deletes one `users` row and the database cascades the rest.** Every other device is signed out at its next request, because the session is checked against the account on every one. See **Deleting an account** |

### A provider is a config block

`Integrations/` has no `Auth/` folder, because there is no client to write: both Cookies and OAuth
are in the shared framework, which keeps the `state` parameter, the correlation cookie, PKCE and the
code exchange, and leaves us reading user-info and finding-or-creating the user. **A third provider
is two lines in `Program.cs`'s `Provider` local function, five values in `appsettings.json`, and a
line in `frontend/src/shell/providers.tsx`.**

- **One string does three jobs** — `AuthProviders.Google` is the OAuth scheme name, the `{provider}`
  route segment, and the value in `auth_identities.provider`. A mapping between them is a table that
  can disagree with itself, and the disagreement reads as one person collecting two boards.
- **`ExternalSignIn` reads both providers with no per-provider reader** — Google says `sub`/`name`,
  Discord `id`/`global_name` falling back to `username`. A short alias list is the whole difference.
- **Endpoints are settings, not constants**, for the reason `Igdb:BaseUrl` is: it lets the e2e suite
  point the *real* handler at a stub. Credentials go in **user-secrets**.
- **`ValidateDataAnnotations` does not recurse into nested option objects.** A `[Required]` on
  `AuthProviderOptions.ClientId` would look right and validate nothing, so `ValidateAuthOptions`
  checks the blocks by hand — which is also what lets a failed boot name `Auth:Google:ClientId`.

### The five traps, every one of which fails quietly

Each was found by running the thing, not by reading it.

- **The OAuth options must be resolved from the container, not read at build time.**
  `builder.Configuration` is still being assembled while `Program.cs` runs, so a value captured there
  misses any source added afterwards — which is exactly what `ApiFactory` does. It surfaced as **all
  153 endpoint tests 500ing on an empty ClientId**. The cookie's expiry and every provider's
  credentials resolve `IOptions` inside their configuring lambda, as `IgdbClient` already did.
- **The Vite proxy's `changeOrigin` is `false`, and that is load-bearing.** ASP.NET builds the OAuth
  redirect URI out of the incoming `Host`, so rewriting it sends the provider back to the API's own
  port — where the correlation cookie set on the app's port is not sent, and a session cookie would
  land somewhere the app cannot read.
- **`OnRedirectToLogin` is overridden to a 401.** Without it an unauthenticated API call gets a 302
  to a login page, fetch follows it, and the caller gets 200 and a lump of HTML, then fails parsing
  JSON miles from the cause.
- **`CorrelationCookie.SameSite` defaults to `None`**, which browsers refuse without `Secure`, so the
  flow fails on plain-http localhost naming nothing useful. `Lax` is enough — the callback is a
  top-level navigation — and the session cookie is `Lax` and **not `Strict`**, which would withhold
  it on exactly that navigation.
- **`Ok(null)` is a 204, not a 200 with a null body** (`HttpNoContentOutputFormatter`), and the caller
  then parses an empty string as JSON. `GET /api/auth/me` uses `JsonResult`.

**`/api/auth/me` answers 200 and null on purpose.** It is the frontend's "am I signed in" probe, so a
401 there would trip the very handler that redirects on a 401 — the query would send you to sign in
on the strength of its own answer. It is also **the Playwright readiness URL**, which has to stay
reachable before anybody has signed in. `returnUrl` is a **400** when not local rather than quietly
dropped; `Url.IsLocalUrl` catches `//evil.example`, which passes a naive leading-slash test.

### The cookie carries a date, and phones are why

**`IsPersistent` is set in the cookie scheme's `OnSigningIn`, and without it `ExpireTimeSpan` is
half a setting.** It limits the ticket *inside* the cookie. The cookie itself goes out with no
expiry unless the sign-in is persistent, and a browser keeps a cookie with no expiry only until it
restarts. For the app's first five weeks in production the thirty days were real on the server and
invisible to every browser, until #54 was deployed on 3 October 2026.

- **A desktop hides it.** The browser stays open for days, and desktop Chrome brings dateless
  cookies back when it is set to continue where you left off.
- **A phone shows it at random.** Chrome on Android never brings them back: at startup it loads
  only the cookies with an expiry and deletes the rest, and Android restarts it whenever it wants
  the memory, whenever Chrome updates and whenever the phone does. The home-screen app runs inside
  Chrome, so it is the same. Read in Chromium's source on 3 October 2026:
  `ProfileImpl::ShouldRestoreOldSessionCookies` takes Android's *default* startup type, which is
  not *continue where you left off*.
- **Deploys took the blame, and were innocent.** A deploy is when you pick the phone up to look,
  long after Chrome was last open. The server's key ring held one key, made by the first deploy and
  read by every one since, and the tunnel's log held no request that failed to reach the app — so
  the key-ring trap in `docs/deploy.md` was checked, and it was not that.
- **On the scheme rather than at the challenge**, so any way of signing in gets it. The ticket
  records it, which is what makes each sliding renewal re-issue the cookie with a fresh expiry
  rather than a dateless one.
- **Sliding renews only past halfway.** At thirty days, under two weeks between visits never signs
  you out and a month away always does; in between, it depends on when the last renewal fell.
- **A session from before the change stays dateless until its next sign-in**, because a renewal
  copies the ticket it was handed. Each device signs in once more, and that one lasts.
- **`the session survives a reload` passed throughout**, because a reload keeps every cookie.
  `the session survives the browser restarting` is the restart — it keeps the cookies with a date
  and drops the rest, as Chrome on Android does — and it and `the browser is told when the session
  ends` were both red before the change.

### Scoping: an injected `ICurrentUser`, and why not a query filter

An EF `HasQueryFilter` would scope every read automatically, including the note queries that have no
user column. It is the wrong choice here: **it is invisible at the call site**, so nobody can review
it while reading the query; **a filter going wrong empties the board rather than erroring**;
`PostgresFixture.CreateDbContext()` builds a context by hand with no container to read a user out of;
and `HltbWorker` resolves a scope with no `HttpContext`, so its context would scope to nobody where
injection lets a path that needs no user simply never ask.

`ICurrentUser.Id` **throws** when nobody is signed in — every path that reads it is behind
`[Authorize]`, so reaching it anonymously is a wiring mistake, and a 500 naming it beats a board
quietly scoped to nobody. `IsSignedIn` exists for the background paths.

**The rule: `log_entries` and `notes` are yours; `media`, `games` and the lookup tables are shared and
must stay shared.** Two people searching "Hollow Knight" get the same row — that is the point of the
upsert, and of `hltb_id` being stored once rather than per account.

Sixteen sites, of which three were subtler than the rest:

- **`LibraryService.BoardQuery` reaches `log_entries` three times, not once** — the `Any` filter, the
  `EntryCount`, and the `Latest` projection. Scoping only the first leaves the count including
  strangers' replays and `Latest` able to pick a stranger's entry; **`Latest` decides the column, so
  the symptom is your own Backlog title sitting under Completed.** Un-scoping `Latest` alone also
  breaks reordering, because `ReorderAsync` renumbers through `row.Latest`.
- **`NoteService` has no column to filter** — all six queries reach through `n.LogEntry!.UserId`.
  That is what makes a note id enough on its own at the API.
- **`BoardPositions.TopOfColumnAsync` is `static` and takes the context**, so it is out of reach of
  injection and takes a `userId`. Left alone, one person's backlog decides where another's new cards
  land.

**Left unscoped deliberately:** `GameCatalogService.RefreshLibraryAsync` and
`HltbService.BackfillAsync` — both select on "any user has logged this" and write only shared
columns. Both carry a comment, because they read like missed sites. **404 rather than 403**
throughout: whether somebody else's pass exists is itself their business.

`Endpoints/UserScopingTests.cs` is 19 cases, all red before the scoping, each checked afterwards by
reverting **one** predicate at a time so every one fails exactly the tests that name it. **A scoping
test that was never red proves nothing.**

**`[Authorize]` is on every controller but `AuthController`, `GamesController` included** — the
catalogue is shared but not public, and an anonymous search is free IGDB traffic plus an unbounded
write into `media`. That puts the maintenance refresh routes behind a session, accepted rather than
worked around.

### Deleting an account

Built for #8 in `docs/plans/games-board-next.md` and deployed on 4 October 2026 (PR #63). What
the warning looks like
is `docs/design.md`'s, under **Your data**.

| Route | |
|---|---|
| `GET /api/account` | what deleting would take: the titles on each board with anything on it, in `hobby_lu`'s order, every note, and which providers the account signs in with |
| `DELETE /api/account` | deletes the account and everything that is yours, and clears this browser's cookie. **204** |

**`AccountController`, not two actions on `AuthController`.** That controller is
`[AllowAnonymous]` at class level, and `[AllowAnonymous]` beats any `[Authorize]` on an action, so
a delete there would reach `ICurrentUser` with nobody signed in: a 500 where it means a 401.

**One statement, and the database takes the rest.** `AccountService.DeleteAsync` is an
`ExecuteDelete` on the `users` row, and the cascades do everything else: `users` to
`auth_identities` and `log_entries`, and `log_entries` to `notes` and `status_changes`. Nothing is
loaded into memory, and no list kept in the service can miss a table. The catalogue stays, a
HowLongToBeat id somebody pinned included, because it is everybody's. `ExecuteDelete` passes the
change tracker by, and `StatusHistoryRecorder` with it, which is `docs/data-model.md`'s trap for
*writing* a status and does not apply here: a deleted pass takes its history with it.

**A title counts once, however many passes it has had.** The warning says what you would lose as
the board shows it, so the count is `COUNT(DISTINCT media_id)` per board rather than passes. The
providers come in the order they were linked, and they are on this contract rather than on
`MeDto` because the warning is the one thing that reads them. The same person at Google and at
Discord is two accounts, and the provider is what tells them apart.

**The session is checked against the account on every request**, by `SessionValidator` on the
cookie scheme's `OnValidatePrincipal`. The cookie is self-contained, so deleting the account
changes nothing about the cookie every other device holds, and for as long as it lasts (thirty
days, renewed while used) that device would carry on as a user with no row. Its reads come back
empty, which looks like a board you emptied yourself, and its writes fail on the foreign key as a
500. The validator looks the user up by primary key and, when the row is gone, rejects the
principal and signs the session out, so the request answers as anybody signed out does (401 on an
`[Authorize]` route, null from `/api/auth/me`) and the browser is told to drop the cookie.

- **One lookup per request that carries a cookie, deliberately.** The security stamp's shape,
  looking again only every so often, leaves the window open for as long as the interval, writes
  500ing all the while. At this scale the lookup is not worth saving.
- **`/api/auth/me` already said null for a deleted account**, because `MeAsync` finds no row. So a
  second device that reloads lands on sign-in with or without the validator, and only its API
  calls show the difference. Both stale-session tests assert on an API call for that reason.

**The backend suite reaches the cookie scheme for the first time here.** It signs in by header
(`TestAuthHandler`), which never consults the cookie scheme or its events, so a test of
`OnValidatePrincipal` needs a host that reads cookies. `AccountEndpointTests.CookieHost` derives one
with `WithWebHostBuilder`, setting `DefaultScheme` back to the cookie scheme, and seals a ticket with
that host's own `TicketDataFormat`: the claim the sign-in puts there, persistent as every sign-in
is. Its client sends the cookie whatever a response says, which is what a second device does. The
response that clears the cookie goes to the device that deleted the account.

The two stale-session tests were red against the finished routes before the validator existed, for
exactly the trap the plan named: a read answered 200 and a write 500.

**Checked by putting each fault back**, one at a time against the finished feature.
`AccountEndpointTests` has 11 cases:

| Fault planted | Red |
|---|---|
| Titles not scoped to you | *counts nothing of anybody else's* |
| Notes not scoped to you | the same |
| Sign-ins not scoped to you | *says which sign-in the account is* |
| Sign-ins in name order | the same |
| Passes counted as titles | *counts the titles on every board and every note* |
| Boards in name order | the same. Anime is in the test because it is last in the nav and first by name |
| An empty board sent as nought | the three counting cases |
| Everybody deleted | *leaves everybody else's alone* |
| Only the passes deleted | *takes everything it owns*, and both stale-session cases |
| This browser not signed out | *signs this browser out* |
| Open to anybody | *nobody signed in can count or delete anything*, which got a 500 from `ICurrentUser` |
| No session check | both stale-session cases |
| Refused but not signed out | *a session whose account is gone is signed out* |
| Any account will do | the same. A second user exists in that test for this fault |

`e2e/account.spec.ts` signs a second browser in through the real flow and finds it refused after
the first deletes the account. With no session check, that case and only that case goes red.

#### The app's half

`frontend/src/account/`: the row and its warning (`DeleteAccount.tsx`), the sentence
(`warning.ts`, a pure function), and the delete itself (`useDeleteAccount.ts`).

- **A word to type, not a second press.** It is the one delete in the app that reaches past the
  board you are looking at, and the app cannot undo it. Any case and spaces either side count,
  since a phone capitalises a field's first letter, and Enter deletes once it matches.
- **The counts are asked for each time the warning opens, and kept for none of them**
  (`staleTime: 0, gcTime: 0`). The app holds an answer for five minutes by default, so a warning
  reopened in that time would print the first count however much had been added since. Until the
  answer arrives, and if it never does, the sentence goes without numbers. It never shows a wrong
  number.
- **The delete is held by the menu**, as the spreadsheet's mutation is, so a panel shut and
  opened again mid-delete finds it still going rather than the row. Where it lands needs none of
  that: callbacks given to `useMutation` run whatever is still mounted.
- **Done, it goes to `/signin` with `{ accountDeleted: true }`**, replacing the board's history
  entry, then clears the cache and writes the session as null, which is now true. The card reads
  *Account deleted* and takes the keyboard, because the board it came from went from under it.
  Router state rides on the history entry, so reloading that page shows the same card (checked in
  a browser on 4 October 2026), and signing out still lands on the ordinary one.
- **The field is read-only and the buttons are held by `aria-disabled`** while it works, for the
  spreadsheet's measured reason: a real browser takes focus off a control the moment it is
  disabled.

Checked the same way, against `account/warning.test.ts` (10 cases), the 14 in
`theme/SettingsMenu.test.tsx`'s *deleting your account* and the five added to
`shell/SignInPage.test.tsx`:

| Fault planted | Red |
|---|---|
| A plain space between a number and its word | eight of the ten sentence cases |
| No thousands mark | *marks the thousands* |
| Nought notes counted | five sentence cases |
| A board with no words of its own called games | *calls a title on a board with no words of its own yet a title* |
| The comma whether or not a sign-in is named | *says your account when there is no sign-in to name* |
| Nought guessed while counting | that case, and the menu's *goes without numbers* and *counts afresh* |
| Any word will do | *does nothing until the field says delete* |
| Case matters, or spaces matter | *takes delete in any case and with spaces around it* |
| A count kept from last time | *counts afresh every time it opens* |
| The keyboard left on the row | *puts the keyboard in the field* |
| Cancel keeps the keyboard | *closes on Cancel, gives the keyboard back to the row* |
| Cancel works while deleting, or a second press while deleting | *reads Deleting… while it works* |
| The delete held by the warning | *is still deleting when the panel is shut and opened again* |
| The cache left as it was, or the session not written as nobody | *lands on the sign-in screen …* |
| No word to the sign-in screen | the four cases that land there |
| The group only where there is a spreadsheet | *is offered on every board* |
| The heading left unfocused | the sign-in page's *puts the keyboard on the heading*, and the menu's landing case |
| No scroll into view, or a scroll only as it opens (end to end, at 1440 × 900) | *the warning scrolls itself into view, buttons and all, once the counts are in* |

### The frontend

- **The gate is a route wrapper**, `RequireSession`, not a check inside `BoardPage` — without one the
  board answers 401 for each of its columns and paints a red message in every one.
- **It renders nothing while the session is in flight rather than guessing.** Guessing "signed out"
  flashes the sign-in screen at a signed-in person on every reload; removing the guard fails three
  tests, not one.
- **A probe that fails reads as signed out, which is a known gap rather than a decision.**
  `useSession` turns anything short of an answer into `me === null` — a 502, or a server it cannot
  reach, once the retries run out after about seven seconds — and `RequireSession` sends you to
  `/signin`, which never asks whether your cookie still works. So a blip asks you to sign in again
  on a session that was fine. Rare as things stand, since a deploy leaves `/api` down for about a
  second. Fixing it wants a screen for *cannot reach the server*, picked from renders first.
- **The session is a query, not a context.** There is no `createContext` anywhere in this codebase:
  the theme layer gets to be local state precisely because a component never asks what theme it is
  in, which is exactly what a session is not. TanStack dedupes, so the gate and the header asking
  separately is one request.
- **A 401 anywhere clears the session rather than surfacing as red text.** `createQueryClient` writes
  null to the session key rather than redirecting, because that module has no router and the session
  query already owns the answer. Nothing 4xx is retried. **`credentials: 'include'`** changes nothing
  today, and is there so the day the origins diverge is not also the day sign-in stops working.
- **Providers are a literal list** in `shell/providers.tsx`, and **each is a link, not a button** —
  signing in is a top-level navigation answered with a 302 that fetch cannot usefully follow.
- **The sign-in links are neutral, with the provider's own mark on the left** — the bordered-control
  idiom the app already wears, full colour only inside the mark. Drawing them in the accent made
  *Continue with Google* a green button with no Google about it, and `--accent` has no paired
  foreground, so a filled button would have meant inventing `--accent-fg` as five values and five new
  contrast rows. The marks are the first SVG in the codebase, both `aria-hidden` and
  `focusable="false"` so each link's accessible name stays exactly `Continue with Google`.
- **The ground is the whole viewport and the screen is a card on it** — `bg-sunken` sat on a
  `max-w-sm` `<main>` at first, so the theme's ground was a 384px strip with the browser's own colour
  either side. **`AppHeader` has no `banner` landmark** and never did: it renders inside `BoardPage`'s
  `<main>`, and a `<header>` nested in `main` is not a banner.

### `user_id` is `NOT NULL`, and what that cost

The development board was **discarded**, re-confirmed immediately before it ran rather than on the
strength of a decision taken earlier; `media` and `games` were untouched, so every title is one
search away. Two things had to change with the column:

- **`DeleteBehavior.SetNull` became `Cascade`.** EF refuses `SetNull` against a non-nullable foreign
  key and fails **model validation at boot**, not at runtime. Deleting an account now takes its
  journal with it, which is the honest reading, and it is what **Deleting an account** rests on.
- **The scaffolded `defaultValue: 0` was removed from the migration.** It would have emitted an
  `UPDATE` turning every unowned pass into user 0 *and* left a `DEFAULT 0` behind, so an insert
  omitting the owner would silently claim to be somebody. Without it the migration is a bare
  `SET NOT NULL` that fails immediately and says why. Checked with `ef migrations script`.

### The test harnesses

**The backend suite signs a test in by header**, through `TestAuthHandler`, registered only under the
"Testing" environment — so nothing production authenticates with is what those tests trust. The
division is deliberate: they are about authorization and scoping, and the OAuth dance that decides
*who you are* is proved end to end against the stub instead. `DatabaseTestBase` creates a user after
the reset and signs `Client` in as them, which is why the tests that predate ownership needed no
edit; `ClientFor(userId)` gives a second person and `AnonymousClient` none. **The one exception is
`AccountEndpointTests.CookieHost`**, a host that reads a real session cookie, because the trap it
covers lives in the cookie scheme's events. See **Deleting an account**.

**`e2e/support/google-stub.mjs` is a provider, not an endpoint** — authorize, token and user-info,
with the real handler running against it unmodified — and it **enforces the protocol rather than
decorating it**. No `code_challenge` is a **400**, so turning PKCE off fails five specs rather than
passing quietly; a `code_verifier` that does not hash to it is a 400, the wrong `client_secret` a
401, user-info without its bearer a 401, and a code works exactly once. It serves **Discord's shape
at Discord's address** too, so the specs prove `ExternalSignIn` reads both rather than reading a
shape the stub was told to produce. `POST /__identity` chooses who signs in next, which is what makes
the two-user specs expressible.

**Every spec signs in in its `beforeEach`, and seeds through `page.request`.** Playwright's standalone
`request` fixture keeps its own cookie jar, so signing the page in leaves the seeding anonymous.

