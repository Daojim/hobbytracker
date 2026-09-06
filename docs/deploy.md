# Deployment

> Part of the HobbyTracker brief. The root is [`CLAUDE.md`](../CLAUDE.md) — boot, layout,
> tests, the settled decisions, and the index of what fails silently. Its map says which of
> these files a change needs.

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

**Redeploying is `scripts/deploy.sh` on the server, and it is a thing you run.** Pushing to GitHub
does not deploy anything — there is no CI, no webhook and no watcher, deliberately. A rebuild drops
the app for a few seconds, and deploying every push unattended spends the review a pull request was
for. The script refuses a clone with local edits, reports the commits it moved through, and fails
loudly if the API does not answer afterwards, because *up* is not the same as *answering*.

Two things in it are less obvious than they look. **It copies `compose.yml` out of the clone before
deploying**, since the file the server reads is a copy and a change in the repository reaches it no
other way. And **the whole body is wrapped in a function**, because the script overwrites itself
with the newer copy as its last act — bash reads a script incrementally as it runs, so wrapping is
what forces the file to be parsed before any of it executes.

**Restart after pulling**, as ever — `docker compose up -d --build`, never a bare `git pull`. A
running container goes on executing the image it started with.

**Where a deployment is not code**: moving nameservers, creating the tunnel, registering the
production redirect URIs on both provider apps, and writing `.env`. None of those live here.

