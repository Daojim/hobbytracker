# Auth and scoping

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

## Auth

Google and Discord sign-in, an httpOnly cookie session, and every pass and note scoped to the
person who wrote it.

| | |
|---|---|
| Session | **An httpOnly cookie**, self-contained and encrypted. Not a JWT, and no sessions table |
| Mechanism | **The framework's generic `AddOAuth`**, not the `AddGoogle` package and not hand-rolled |
| Providers | **Google and Discord**, both required at boot |
| Accounts | **Anyone can sign up.** Real multi-user, one board each |
| Scoping | **An injected `ICurrentUser`**, not an EF global query filter |
| Existing data | **Discarded** when `user_id` became `NOT NULL`. The catalogue rows stayed |

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

**`[Authorize]` is on all four controllers, `GamesController` included** — the catalogue is shared but
not public, and an anonymous search is free IGDB traffic plus an unbounded write into `media`. That
puts the two maintenance refresh routes behind a session, accepted rather than worked around.

### The frontend

- **The gate is a route wrapper**, `RequireSession`, not a check inside `BoardPage` — without one the
  board answers 401 for each of its four columns and paints four red messages.
- **It renders nothing while the session is in flight rather than guessing.** Guessing "signed out"
  flashes the sign-in screen at a signed-in person on every reload; removing the guard fails three
  tests, not one.
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
  journal with it, which is the honest reading.
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
edit; `ClientFor(userId)` gives a second person and `AnonymousClient` none.

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

