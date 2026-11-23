# HobbyTracker

A journal for the games, films, shows and anime you get through: a board for where each one is,
and a journal for what you thought of it. Deployed and in use behind a sign-in.

[A tour](#a-tour) · [How it's built](#how-its-built) · [Running it](#running-it-locally) ·
[Design notes](docs/design-notes.md) · [API](docs/api.md) · [How it got here](docs/history.md)

![The games board, Backlog to a folded Dropped, each card with a cover, its genre, how long the game takes and the last note written about it, and the same board on a phone over its corner](docs/shots/hero-light.webp#gh-light-mode-only)
![The games board, Backlog to a folded Dropped, each card with a cover, its genre, how long the game takes and the last note written about it, and the same board on a phone over its corner](docs/shots/hero-dark.webp#gh-dark-mode-only)

## A tour

A title moves between five columns, Backlog, Playing, On Hold, Completed and Dropped, by drag or
from its card's menu, and the server decides which dates a move stamps. On the games board each
column adds up how long its games take and names the ones its figures leave out, Completed sets
your hours against HowLongToBeat's, and any column folds away to its heading. These screenshots
are a demo account: the covers, dates, hours and scores are real data from IGDB, TMDB,
MyAnimeList, HowLongToBeat, OpenCritic and Steam, and the notes were written for them. Press any
still to open it larger.

### The journal

Every title opens a journal over the board: your rating and dates, your hours beside
HowLongToBeat's four estimates and the day you'd finish at your own pace, what OpenCritic's
critics and Steam's players made of it, dated notes with pictures pasted in, and every earlier
playthrough with its own notes. It saves as you type, so there is no Save button.

![Hollow Knight: Silksong's journal: HowLongToBeat's four estimates, OpenCritic's 91 and Steam's Very Positive, nine more days at two hours a day, and a note with three screenshots](docs/shots/journal-light.webp#gh-light-mode-only)
![Hollow Knight: Silksong's journal: HowLongToBeat's four estimates, OpenCritic's 91 and Steam's Very Positive, nine more days at two hours a day, and a note with three screenshots](docs/shots/journal-dark.webp#gh-dark-mode-only)

### A year in numbers

What you finished, month by month; your hours against HowLongToBeat's, game by game; your
ratings, each point opening the games you gave it; how much of what you started you finished;
and how long each game has waited in the backlog. Every game finished opens its journal from
there. It counts every playthrough, so a year's numbers stay put when a game is replayed.

![Stats for 2026: nine finished, 69% completion, 9% longer than HowLongToBeat, an average of 8.7, the covers of the year's finishes by month, and the ratings chart with the six games rated 8 open under it](docs/shots/stats-light.webp#gh-light-mode-only)
![Stats for 2026: nine finished, 69% completion, 9% longer than HowLongToBeat, an average of 8.7, the covers of the year's finishes by month, and the ratings chart with the six games rated 8 open under it](docs/shots/stats-dark.webp#gh-dark-mode-only)

### What should I play next?

*Pick*, in the backlog's header, spins a wheel of the backlog's covers once you've said how long
you want to play and which genres you're not in the mood for. Every game in the column has the
same chance, *Not this one* takes the one it landed on out of the draw, and *Start playing* moves
it to Playing as a drag would.

<p align="center"><picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/shots/wheel-dark.gif">
  <img alt="The picker: how long and what to leave out, then a wheel of seven backlog covers spinning and landing on Metaphor: ReFantazio, with Start playing and Not this one under it" src="docs/shots/wheel-light.gif">
</picture></p>

### Adding a game

Search sits above the board. Every result adds straight to Backlog, Playing or Completed, dated
the way a drag would date it, and one already on the board says which column it's in. A game you
finished long ago asks when first: a year, today, or *I don't remember*, never a day nobody named.

![A search for hollow knight, and Completed pressed on Hollow Knight, asking When did you finish it? with a year, Today and I don't remember](docs/shots/search-light.webp#gh-light-mode-only)
![A search for hollow knight, and Completed pressed on Hollow Knight, asking When did you finish it? with a year, Today and I don't remember](docs/shots/search-dark.webp#gh-dark-mode-only)

### Coming soon

Unreleased games wait in a calendar under the board, dated only as precisely as the publisher
said, and arrive in Backlog on release day with no job running.

![Coming soon: a 2026 window, Fable in three months, a quarter, two later years and one game with no date yet](docs/shots/calendar-light.webp#gh-light-mode-only)
![Coming soon: a 2026 window, Fable in three months, a quarter, two later years and one game with no date yet](docs/shots/calendar-dark.webp#gh-dark-mode-only)

### Discover

A wall of what's new and popular on IGDB, or, as here, of games like the ones you rated highest,
each saying why, for filling the board without knowing what to search for. An eye on a cover
hides a game from every list for good.

![Discover's From your ratings: a wall of covers, each saying which of your highest-rated games it is like, each with the same three add buttons](docs/shots/discover-light.webp#gh-light-mode-only)
![Discover's From your ratings: a wall of covers, each saying which of your highest-rated games it is like, each with the same three add buttons](docs/shots/discover-dark.webp#gh-dark-mode-only)

### More than games

Films, TV and anime have boards of their own and fields of their own: the episode you're on, and
both of an anime's titles.

![The anime board: each card with its English title over the romaji one, and the episode reached on the ones being watched](docs/shots/anime-light.webp#gh-light-mode-only)
![The anime board: each card with its English title over the romaji one, and the episode reached on the ones being watched](docs/shots/anime-dark.webp#gh-dark-mode-only)

### Sharing a board

One read-only link per board, made in Settings from the parts you tick. Whoever holds it sees
the board, its calendar and its Stats with nobody signed in, never a note, and the owner's name
only if it was ticked. Stopping the link kills the address for everyone.

![A shared board under its banner, read-only, with no notes and no owner's name](docs/shots/share-light.webp#gh-light-mode-only)
![A shared board under its banner, read-only, with no notes and no owner's name](docs/shots/share-dark.webp#gh-dark-mode-only)

### Settings

A gear beside the theme palette in the header: every board's settings beside this board's, and
what you have across the foot, from a spreadsheet of everything to deleting the account.

![Settings: density, the journal as a drawer or a modal, which board opens first, dates and the boards in the header for every board; this board's columns, cards, pace, wheel, sharing and Discover; then a spreadsheet and deleting the account](docs/shots/settings-light.webp#gh-light-mode-only)
![Settings: density, the journal as a drawer or a modal, which board opens first, dates and the boards in the header for every board; this board's columns, cards, pace, wheel, sharing and Discover; then a spreadsheet and deleting the account](docs/shots/settings-dark.webp#gh-dark-mode-only)

### On a phone

One column at a time under a switcher pinned to the top. A card is picked up by holding it still,
so a swipe scrolls, the journal fills the screen, and the app installs to a home screen.

![Two phone screens: Silksong's journal, and the Completed column under the switcher](docs/shots/phones-light.webp#gh-light-mode-only)
![Two phone screens: Silksong's journal, and the Completed column under the switcher](docs/shots/phones-dark.webp#gh-dark-mode-only)

Also: searching your notes on every board, every word in any order, opening the journal at the
note it found; eight themes, and one of your own made from three colours; and deleting your
account, which signs every other device out at its next request.

## How it's built

ASP.NET Core 10 · EF Core 10 · PostgreSQL 17 · React 19 + TypeScript · Vite 8 · Tailwind v4 ·
TanStack Query · dnd-kit. IGDB, TMDB and MyAnimeList through their APIs; OpenCritic's and
Steam's verdicts through theirs, with Wikidata finding a game's OpenCritic page by its IGDB id;
and HowLongToBeat by scraping, behind a matcher that would rather say nothing than guess.

Six of the decisions that were actually decisions. All twenty, each with what it cost, are in
[docs/design-notes.md](docs/design-notes.md), and every route is in [docs/api.md](docs/api.md).

**Table-Per-Type over one `media` table.** Every title has a row in `media` whatever its hobby,
and a row in a games, films, shows or anime table beside it whose key is also its foreign key.
One table for everything would be mostly empty columns by the fourth hobby, and one table per
hobby would turn "everything I logged this year" into a `UNION`.

**Scoping is a parameter at every call site, not a query filter.** A filter would scope each read
invisibly, so a mistake would show up as an empty board, or a stranger's, rather than an error,
and nobody could review it where it happens. Every query that reads someone's data takes the user
by hand, and each second-user test was checked by taking its predicate away. The history of
column moves is the deliberate opposite: one interceptor writes it, because a recorder missing
from one write site loses that history for good, with nothing to raise an error.

**HowLongToBeat's matcher refuses rather than guesses.** The numerals have to agree outright
("Final Fantasy VII" scores about 0.97 against "VIII" on letters alone), and the winner has to
beat the runner-up by a margin, so the two *Resident Evil 4*s are never settled by a coin flip
that looks like a confident match. When it refuses, the journal takes a HowLongToBeat id by hand.

**IGDB's ranking can't tell a game from a fan game named after it.** Searching "Hollow Knight
Silksong" put a one-person Game Boy Color game above Team Cherry's, because its title is that
exact string. Results are re-ordered by how many people have played each game before how well the
title matches, and the two rules that were tried and lost are pinned by tests named after what
they got wrong.

**Pictures live in Postgres, their bytes in a table of their own.** In the database a deleted
note, title or account takes its pictures with it by cascade, and the nightly dump backs them up,
where a folder of files would need code for both. The bytes sit apart because every read that
carries a note brings its pictures: kept in the same rows, opening a journal would pull every
picture out of the database for an answer that sends none of them. A test reads the SQL of every
route that carries notes and finds the bytes untouched.

**A share link is read by nobody, so whose board it is gets said at every read.** The anonymous
controller holds three narrow interfaces and nothing that writes or asks who is signed in. Making
a visitor look like the owner would have been easier, and would have handed every write to
whoever had the link. A test proves on the SQL that no route a share reaches reads a note.

Written test-first throughout: the failing test, shown red, then the code. Where a rule exists to
prevent something, its test is checked by putting that thing back.

## Running it locally

Needs the .NET 10 SDK, Node and Docker, and an app at each provider: IGDB through a
[Twitch application](https://dev.twitch.tv/console/apps), a read access token from
[TMDB](https://www.themoviedb.org/settings/api), a client id from
[MyAnimeList](https://myanimelist.net/apiconfig), and Google and Discord sign-in apps with
`http://localhost:5173/api/auth/{provider}/callback` as the redirect URI. A key for
[OpenCritic's API](https://rapidapi.com/opencritic-opencritic-default/api/opencritic-api) is
optional: without it a game's journal shows OpenCritic's link alone. Steam and Wikidata need none.

```bash
docker compose up -d db

dotnet user-secrets set "Igdb:ClientId"             "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Igdb:ClientSecret"         "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Tmdb:AccessToken"          "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Mal:ClientId"              "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Google:ClientId"      "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Google:ClientSecret"  "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Discord:ClientId"     "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "Auth:Discord:ClientSecret" "..." --project backend/src/HobbyTracker.Api
dotnet user-secrets set "OpenCritic:ApiKey"         "..." --project backend/src/HobbyTracker.Api  # optional

dotnet tool install --global dotnet-ef --version 10.0.11
dotnet ef database update --project backend/src/HobbyTracker.Api --startup-project backend/src/HobbyTracker.Api

dotnet run --project backend/src/HobbyTracker.Api    # http://localhost:5201
cd frontend && npm install && npm run dev            # http://localhost:5173
```

Then open **http://localhost:5173**, not the API's port: sign-in has to stay on one origin. Startup
fails on purpose, naming the setting, if any of the first eight secrets is missing. **Start here**
in [CLAUDE.md](CLAUDE.md) has the rest, including a stand-in Google for when there is no app to
hand.

## Running it in production

Two containers behind one origin: Caddy serves the built app and passes `/api` to the API.
`deploy/.env` is the whole of a deployment, and the setting that is not optional is
`PUBLIC_ORIGIN`, because behind anything that ends TLS the app would otherwise build its sign-in
redirects as `http://`. [docs/deploy.md](docs/deploy.md) is the runbook.

```bash
cp deploy/.env.example deploy/.env     # fill it in, then chmod 600
docker compose -f deploy/compose.yml up -d --build
```

**Anyone who can reach it can sign up.** Nobody reads anybody else's journal, but there is no
invite gate yet, so put an access policy in front of it or keep the address to yourself.

## Tests

```bash
dotnet test --solution backend/HobbyTracker.slnx    # backend, against a throwaway Postgres
cd frontend && npm test                             # frontend
cd frontend && npm run test:e2e                     # in a real browser
```

The backend runs against real Postgres in Testcontainers, because what is worth testing here is
Postgres's own: the partial unique index behind an idempotent search, the unique violation it
recovers from, array columns and check constraints. The end-to-end suite drives the real API on a
database of its own, with IGDB, TMDB, MyAnimeList, HowLongToBeat, Steam, OpenCritic, Wikidata
and the OAuth provider each stood in for by a small server rather than a mock.

## Credits

Game data from [IGDB](https://www.igdb.com/). This product uses the TMDB API but is not endorsed
or certified by TMDB. Anime data from [MyAnimeList](https://myanimelist.net/). Review scores
from [OpenCritic](https://opencritic.com/) and [Steam](https://store.steampowered.com/), each
linked from a game's journal.

Working in the repo? [CLAUDE.md](CLAUDE.md) is the brief, and it routes to one file per area under
[docs/](docs).
