# Deployment

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

**This file is the source of truth for deploying.** **Redeploying**, at the end, is the runbook a
session follows when it is asked to deploy. What it leaves out on purpose — which machine —
is said there too.

## Deploying it

Two containers behind one origin: **Caddy serves the built SPA and proxies `/api` to Kestrel**,
which is the topology development already has through the Vite proxy. That is the whole reason to
prefer it over teaching the API to serve static files — the browser sees one origin either way,
which is the property the `SameSite=Lax` httpOnly cookie and the deliberate absence of CORS both
rest on.

| | |
|---|---|
| Images | **One `Dockerfile`, two targets** — `api` (aspnet:10) and `web` (Caddy plus `frontend/dist`) |
| Compose | `deploy/compose.yml` — `api`, `db`, `caddy`, and `cloudflared` **behind a profile** |
| Redeploy | `deploy/scripts/deploy.sh` — **run, never automatic.** Pushing deploys nothing |
| Config | **Everything site-specific is an environment variable.** `deploy/.env.example` names them all |
| Origin | **Pinned from configuration**, not read off `X-Forwarded-*` |
| Migrations | Run themselves, **in Production only** |
| Session keys | Persisted to a bind mount, or every redeploy signs everybody out |
| Database | Publishes **no port at all**, not even on loopback |

**`deploy/.env` is where a deployment actually lives, and it is gitignored.** No hostname, no host
path and no secret is committed — this repository is public, and a compose file naming a private
machine's directory layout is a thing that cannot be taken back. The committed file is generic;
`.env` is what turns it into a deployment.

### One omission, three failures

Behind a proxy that terminates TLS the request reaches Kestrel as **plain HTTP, on whatever host
the proxy used**. Three separate things read `Request.Scheme` and `Request.Host`, and all three are
wrong at once:

- The OAuth handler builds an `http://` **redirect URI, which Google refuses** for any host but
  localhost. Sign-in is dead, and the refusal arrives on the provider's own page rather than in any
  log of ours.
- `CookieSecurePolicy.SameAsRequest` sees HTTP and issues the **session cookie without `Secure`**.
- `UseHttpsRedirection` thinks every request needs redirecting, **and loops**.

`PublicOrigin:Url` closes all three. `PublicOriginMiddleware` sets the scheme and host from it, and
**is inert when the setting is absent** — which is development and both test harnesses, so nothing
else in the suite is quietly running against an origin it never mentioned.

- **Pinned from configuration rather than read from `X-Forwarded-*`.** Forwarded headers have to be
  *trusted* to be believed, which means a `KnownProxies` list, which behind a tunnel is a container
  address that changes whenever the container does. A pin depends on nothing the network is doing —
  and the app really does have exactly one public address, so stating it is honest rather than a
  workaround.
- **It runs before `UseHttpsRedirection`, and that ordering is load-bearing.** That middleware
  decides from `Request.IsHttps`; `UseAuthentication` — where the callback's token exchange has to
  send *the same* `redirect_uri` the challenge sent — is later still. Being ahead of the first puts
  it ahead of both.
- **Pinning the origin disables the app's own HTTPS redirect, so the edge has to do it.**
  `UseHttpsRedirection` decides from `Request.IsHttps`, which the pin has already set true — so a
  request that genuinely arrived over plain HTTP is never redirected, and nothing in the app can
  tell. The proxy in front is the only party left that can still see the real scheme, and it has to
  be told to redirect (Cloudflare calls it *Always Use HTTPS*; it is off by default). Left off, the
  failure is silent and total: the page loads perfectly over `http://`, sign-in runs the entire
  OAuth dance, and then the session cookie — marked `Secure`, because the pin says the scheme is
  https — is dropped by the browser on arrival. You land back on the sign-in screen having done
  everything right, with nothing anywhere reporting a problem.
- **The challenge leg cannot catch a misplacement, and that is worth knowing rather than
  rediscovering.** `Challenge()` is issued from `AuthController`, which runs after the whole
  pipeline, so the redirect URI comes out right wherever the pin sits. It is the *callback* leg that
  breaks — late, after a sign-in has appeared to work. So `PublicOriginTests` pins the ordering
  through the redirect case instead, and that test was checked by moving the call one line down and
  watching it go red.
- **A malformed value fails the boot naming `PublicOrigin:Url`**, the guard `Journal:TimeZone` and
  the sign-in credentials already get. **A path is refused too**: the callback is built from the
  scheme, the host and the handler's own `CallbackPath`, so a value carrying one would be silently
  losing a segment.

### The things that fail quietly here

- **A new *required* variable does not reach an existing deployment, and compose refuses the whole
  file rather than the one service.** Adding `TMDB_ACCESS_TOKEN` to `.env.example` updates the
  template; the `.env` that a running deployment actually reads is on the server and gitignored, so
  it stays as it was. `${TMDB_ACCESS_TOKEN:?…}` then fails at **interpolation**, which happens
  before compose selects a profile or looks at a single service — so the error names one variable
  and nothing starts, including the containers that had nothing to do with it. **This is the good
  failure**: it happens before anything is torn down, so the running site stays up. The bad version
  is the same variable without `:?`, which starts the API with an empty token and turns every search
  into a 401 nobody sees until they try one. **Check the server's `.env` before deploying a change
  that adds one**, and prove the value works from the server rather than assuming the paste landed.
- **Data Protection keys have to outlive the container.** The session cookie is self-contained and
  encrypted with them, and a container filesystem goes with the container — so without somewhere
  durable, every redeploy signs **everybody** out, and there are a lot of redeploys.
  `DataProtection:KeyRingPath` is the setting; `SetApplicationName` sits beside it because keys are
  found by application name, so a rename orphans the ring exactly as losing the directory would.
- **That directory has to be writable by whoever the container runs as, and it is not an error when
  it is not.** Data Protection falls back to keys held only in memory and says so in a log line
  nobody is reading at the time. The compose file sets `user:` for this and for nothing else.
- **`AllowedHosts` has to keep `localhost` on the list, and forgetting it misdirects.** The compose
  file binds Caddy to `127.0.0.1` as the local debugging handle, and a request arriving that way
  carries `Host: localhost` — which the public hostname alone rejects with a bare 400 *"Invalid
  Hostname"* from host filtering, before any of this application runs. **Static files keep working**,
  because Caddy answers those itself and never reaches the API, so the symptom is a board that loads
  perfectly and an API that refuses every call on it. Only somebody already on the host can send that
  header, since the port is published nowhere else, so allowing it costs nothing.
- **Migrations are guarded to Production.** Both test harnesses already apply them their own way —
  `PostgresFixture` for the backend suite, a `dotnet ef database update` chained into the API's own
  command for Playwright — so an unguarded `Database.Migrate()` is a third caller racing them.
- **`cloudflared` is behind a compose profile.** `docker compose up -d` brings up an app answering
  on loopback and nowhere else; publishing it takes `--profile tunnel`, which somebody has to type.
  **It also sits on the app's own network and no other**, which is a stronger guarantee than a
  careful ingress list, because it holds even when the ingress is wrong.
- **A required variable inside a profiled service would block the whole file.** Compose interpolates
  everything before working out which services a profile selects, so `TUNNEL_TOKEN` is deliberately
  *not* marked required with `:?` — it would refuse to start the app at all until the tunnel existed.
- **`.dockerignore` must exclude `bin/` and `obj/`.** They hold Windows build output that would be
  copied over the restore the SDK stage just did inside the image, and the result is a publish
  mixing two platforms' artefacts rather than an error.
- **The three native npm dependencies resolve on Linux from a Windows lockfile**, checked rather
  than assumed: `@rolldown/binding`, `@tailwindcss/oxide` and `lightningcss` all ship per-platform
  binaries, and `package-lock.json` records every variant including `linux-x64-gnu`. `npm ci` is
  what keeps that true — `npm install` would rewrite the lockfile in the image.
- **`index.html` must never be cached and `/assets/*` always should.** Vite fingerprints everything
  under `assets`, so those files never change content; `index.html` is what names the current
  bundle, so a held copy pins a browser to the previous deployment with nothing saying so.
- **The manifest and the icons get `no-cache` along with `index.html`, and that is right for them.**
  They come from `frontend/public/` and keep their names from build to build, so a browser
  revalidates them and picks up a changed icon the next time it asks. Measured on 2 October 2026,
  serving a build with the production image and this Caddyfile, the types came from the image's own
  `/etc/mime.types`: `application/manifest+json`, `image/png`, `image/svg+xml` and
  `image/vnd.microsoft.icon`. **A file that is not there comes back `200 text/html`**, by
  `try_files`, so a missing icon looks like success to anything that checks only the status.

## Redeploying

**This is the runbook.** Asked to deploy, a session follows it from the top. The one thing it
leaves out on purpose is which machine: the repository is public, and the host is a private home
server whose name, directory layout and public address do not belong in it. They are written
`<host>`, `<dir>` and `<origin>` below. **Their values are in the maintainer's machine-local
notes**: Claude Code's auto memory for this project, `hobbytracker-self-hosted-deployment.md`. That
is outside the repository, and it is the one place under `~/.claude` the 30-day cleanup does not
sweep. The hosting plan that held them before was deleted by that sweep.

### What gets deployed

- **`main`, and only `main`.** The server's clone tracks it, and the script fast-forwards it.
  Work on a branch gets there by being merged through its pull request first. A request to
  deploy is not a request to merge, so mention unmerged work rather than merging it.
- **Pushing deploys nothing.** There is no CI, no webhook and no watcher, deliberately. A rebuild
  drops the app for a few seconds, and deploying every push unattended spends the review a pull
  request was for.

### Before running it

Each check reads what `main` has gained since the commit the server is on:
`ssh <host> 'git -C <dir>/app rev-parse --short HEAD'`.

- **A new required environment variable.** Run
  `git diff <deployed>..main -- deploy/compose.yml deploy/.env.example`. A new `${NAME:?…}` has to
  be in the server's `.env` first; the first of **The things that fail quietly here** says what
  happens otherwise. **The value is the maintainer's to place**, never a session's to write. Hand
  over a command that moves it from where it already lives without printing it.
- **A migration.** Run `git diff --stat <deployed>..main -- backend/src/HobbyTracker.Api/Data/Migrations`.
  It applies itself when the new API starts, and nothing runs it backwards on the server, so the
  last nightly backup is the undo. Know when that ran before deploying one that drops or renames
  anything. **Record the newest migration production has**, with the query under **Proving it**:
  for a change that is only a migration, that is the one before-and-after there is.
- **What the public site serves now**, recorded so the check afterwards proves something. That is
  the `/assets/index-*.js` and `.css` that `<origin>/` names, and how many times a string the
  change adds appears in them: zero, now. For a new API route, record what its method answers
  anonymously: anything but 401 before — it was 405 for the add route — and 401 after, because
  every route but sign-in is behind `[Authorize]`. For a backend change with neither a route nor
  a migration, record the count under **Proving it**: a name the change adds, in the DLL that is
  running.

### Running it

```bash
ssh -o BatchMode=yes <host> 'cd <dir> && ./scripts/deploy.sh'
```

- **`BatchMode`**, so a key problem fails at once instead of waiting on a password prompt nobody
  is there to answer.
- **About four minutes**, nearly all of it the two image builds. Run it in the foreground and
  allow ten.
- **What it prints**: the commits it moved through (`<before> -> <after>` and their one-line
  log, or `already at …` when there is nothing new), the build, then
  `waiting for the api. -- ok` and `deployed <sha>`. It exits 0.
- **Only a container whose image changed is recreated.** On 1 October 2026 a frontend-only change
  recreated Caddy, and the API kept the uptime it had. Later that day a backend-only one recreated
  the API and left Caddy running.
- **An image can change when nothing of its own has.** The build checks every `FROM` tag against
  its registry, so when Microsoft has published new `aspnet:10.0` and `sdk:10.0` images, the API is
  rebuilt on them and recreated. #48 changed only the frontend on 2 October 2026, and the log
  showed both base images downloaded and *api Recreated*. That is a .NET patch arriving
  unannounced, which is usually what you want. It also means a frontend-only deploy is not
  promised to leave the API's uptime alone.
- **A change to both recreates the API first.** `caddy` has `depends_on: [api]`, and #46's log
  read *api Recreated, caddy Recreated, api Started, caddy Started*. So a bundle that reads
  something new from the API never meets the API from before it. The only mix is the other way
  round: a page loaded before the deploy talks to the new API until it is reloaded. That is safe
  while a change only adds to a response, and not when it renames or removes something.
- **Never a bare `git pull` on the server.** A running container goes on executing the image it
  started with, and the script's `up -d --build` is what rebuilds.

What the script does, in order:

1. Refuses a clone with local edits.
2. Fast-forwards the clone with `--ff-only`, so a diverged clone stops rather than gaining a merge
   commit on a server nobody is watching.
3. Copies `compose.yml` out of the clone, since the file the server reads is a copy, and a change
   in the repository reaches it no other way.
4. Runs `docker compose --profile tunnel up -d --build`, which builds every image before it
   touches a container.
5. Asks `/api/auth/me` on the loopback debug port every two seconds for a minute, because *up* is
   not the same as *answering*.
6. Only then copies the newer scripts over itself.

**The whole body is wrapped in a function** for that last step. Bash reads a script a piece at a
time as it runs, so wrapping is what makes it parse the whole file before any of it executes.

### Proving it

`deployed` means the API answered on the server's loopback port. It does not mean the public site
serves the new build, so prove that from outside:

- **`<origin>/` names new `/assets/index-*` files.** Vite fingerprints them, so a new build has
  new names, and `index.html` is never cached, so this is what a browser is handed.
- **The string recorded beforehand is in them now.** Count it with `grep -F`, never a regex. An
  escaped `\:` in a class name once matched nothing, and nothing matched looks exactly like
  absent.
- **`<origin>/api/auth/me` answers 200**, with `null` when nobody is signed in.
- **A change to the manifest or the icons is served as what it is.** `curl -I
  <origin>/manifest.webmanifest` says `application/manifest+json`, and `curl -I
  <origin>/icon-512.png` says `image/png`. `text/html` means the file is missing and `try_files`
  answered with the page.
- **A new route answers 401.**
- **A backend change with no new route and no migration is proved inside the container.** Nothing
  outside can tell the new API from the old one, and the bundle names prove nothing either way. So
  count a name the change adds in the DLL that is running, before the deploy and after it:

  ```bash
  ssh -o BatchMode=yes <host> 'cd <dir> && docker compose exec -T api grep -a -c set_IsPersistent /app/HobbyTracker.Api.dll'
  ```

  That said 0 before #54 and 1 after it. **Count a member name, never a string literal.** A
  method or a type is in the DLL under its own name, and a property the change sets under `set_`
  and its name, all as UTF-8. A literal is stored as UTF-16, so `grep` counts 0 for one that is
  there, and 0 looks exactly like absent. Measured on 3 October 2026: `set_IsPersistent` is found
  as UTF-8 and not as UTF-16, and the literal `"hobbytracker.session"` the other way round. Read
  the number rather than the exit code, too: `grep -c` exits 1 when it counts 0.
- **A new migration is the newest in production's history.** A backend-only deploy leaves the
  bundle names exactly as they were, which proves nothing either way, so ask the database. Use the
  container's own credentials, so none crosses a screen:

  ```bash
  ssh -o BatchMode=yes <host> 'cd <dir> && docker compose exec -T db sh -c "psql -U \$POSTGRES_USER -d \$POSTGRES_DB -tA"' <<'SQL'
  select max(migration_id) from "__EFMigrationsHistory";
  SQL
  ```

  **The column is `migration_id`.** The snake_case convention reaches EF's own history table too,
  so `"MigrationId"` is an error. Beside it, `docker compose ps` shows the API created minutes ago,
  and its log names the migration it applied: `docker compose logs api | grep "Applying migration"`.

### When it fails

| It says | Which means | So |
|---|---|---|
| `app/ has local changes; refusing to deploy over them` | Somebody has been debugging on the server | Stop and ask the maintainer. Never discard the changes |
| The `git pull --ff-only` fails | The server's clone has diverged from `main` | Stop and ask |
| A required variable is missing a value | The `.env` check above was skipped | Nothing was touched and the site is still up. The maintainer adds the value, and it runs again |
| An image fails to build | A broken build | Compose stops before recreating anything, so the old containers go on serving. Fix it on `main` and run again |
| `the api never answered … deploy did NOT complete cleanly` | The new API is not answering — usually a migration that failed, or a setting it refuses at boot and names | Run `cd <dir> && docker compose logs api --tail 50` on the server. The site is down, so roll back while it is fixed |

### Rolling back

This has not been needed yet, so it describes the mechanism rather than a rehearsed drill.

- **Ordinarily, revert the merge on `main` through a pull request and deploy that.** The history
  stays true, and the script needs nothing unusual.
- **In a hurry, on the server**: `git -C app checkout <good-sha>`, `cp app/deploy/compose.yml
  ./compose.yml`, then `docker compose --profile tunnel up -d --build`. Put the clone back on
  `main` before the next `deploy.sh`, whose `git pull` cannot run on a detached head.
- **Migrations do not roll back with the code.** An older API usually runs against a schema
  that has gained a column. One that dropped or renamed something needs the backup.

### Backups

`scripts/backup.sh` runs from the deploying user's crontab at 04:30 every night. It pipes a
`pg_dump` through `gzip` into `BACKUP_DIR`, on a different physical disk from the database. Each
dump is written under a partial name and tested before it counts, and 14 days are kept. On 1
October 2026 there were sixteen, the newest from 04:30 that morning. A dump is plain SQL, but no
restore has been needed yet.

### Still open

**Nothing in front of the app limits who can sign up.** No Cloudflare Access allowlist is set up,
and `Auth:AllowNewAccounts` is not built (CLAUDE.md, **Small things**). The risk is resources
rather than privacy: the provider quotas, and HowLongToBeat lookups from the server's own
address.

**Where a deployment is not code**: moving nameservers, creating the tunnel, registering the
production redirect URIs on both provider apps, and writing `.env`. None of those live here, and
`deploy/.env.example` names every value `.env` needs.

