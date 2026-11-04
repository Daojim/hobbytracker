# The API

> Moved out of `README.md` on 1 November 2026, when the README became a tour. Every route the app
> serves, with two worked examples. **A route added or changed updates this file.**

Metadata comes from [IGDB](https://api-docs.igdb.com/) for games,
[TMDB](https://developer.themoviedb.org/) for films and television, and
[MyAnimeList](https://myanimelist.net/apiconfig/references/api/v2) for anime, and is cached
locally, so a journal entry always has something stable to point at even if the provider later
moves or deletes a record. Every provider gets a source row of its own, and TMDB gets two: films
and shows are numbered independently, so film 1396 and show 1396 are different titles that share
a number.

```console
$ curl -b jar "localhost:5173/api/games?search=hollow%20knight&limit=1"
```
```json
[{
  "id": 4,
  "title": "Hollow Knight",
  "coverUrl": "https://images.igdb.com/igdb/image/upload/t_cover_big/cobfzp.jpg",
  "platforms": ["Linux", "Mac", "Nintendo Switch", "Nintendo Switch 2", "PC (Microsoft Windows)",
                "PlayStation 4", "PlayStation 5", "Wii U", "Xbox One", "Xbox Series X|S"],
  "developers": ["Team Cherry"],
  "genres": ["Adventure", "Platform"],
  "primaryGenre": null,
  "externalId": "14593",
  "source": "igdb",
  "hltbAllStylesHours": 41.82,
  "hltbMainStoryHours": 27.0,
  "hltbMainExtraHours": 41.6,
  "hltbCompletionistHours": 65.59
}]
```

Logging a playthrough is a separate act from cataloguing the game, and a title can be logged more
than once — replays are first-class, not an overwrite.

```console
$ curl -b jar "localhost:5173/api/library?hobby=games"
```
```json
{
  "items": [{
    "mediaId": 14,
    "title": "Celeste",
    "hobby": "games",
    "currentStatus": "InProgress",
    "entryCount": 2,
    "latestRating": null,
    "lastActivity": "2026-08-15T23:47:00+00:00",
    "genres": ["Platform"],
    "primaryGenre": null,
    "lengthHours": 9.5,
    "latestNotePreview": "that B-side nearly broke me"
  }],
  "total": 1, "page": 1, "pageSize": 25
}
```

That game was completed in June and is being replayed now. `currentStatus` reflects the *current*
pass, so it appears under `?status=InProgress` and **not** under `?status=Completed`, even though
a completed entry sits in its history. `latestNotePreview` is the one field that does not follow
that rule: it is the last thing you wrote about the title whichever pass it was during, so a
replay you have not written on yet still carries last year's thought forward.

Timestamps are instants, and the app records days in `America/New_York` — see **Time** in
`docs/data-model.md`. A value sent without an offset is read as that wall-clock moment there, not
as UTC.

## Endpoints

Everything below `/api/auth` needs a session and answers **401** without one — which is where
the `-b jar` above comes from — except a share's reads, which anybody holding its link can make.
Sign in once and spend the cookie, as below.

| | |
|---|---|
| `GET /api/auth/{provider}/start?returnUrl=` | 302 to Google or Discord. A navigation, not a fetch |
| `GET /api/auth/me` | who is signed in, or 200 and a literal `null` — never 401 |
| `POST /api/auth/logout` | ends the session. POST, so an `<img>` cannot sign you out |
| `GET /api/games?search=&limit=` | search IGDB, cache the results, return them ranked |
| `GET /api/games/{id}` | one game plus everything you logged against it, and when HowLongToBeat was last asked (`hltbCheckedAt`) |
| `PUT /api/games/{mediaId}/genre` | choose the genre that colours a card, or null for automatic |
| `PUT /api/games/{mediaId}/hltb` | pin a HowLongToBeat entry by hand when the matcher would not guess |
| `POST /api/games/{mediaId}/hltb/refresh` | ask HowLongToBeat about one game again, there and then: its id fetched, or its name matched. 409 naming an id HowLongToBeat no longer has |
| `POST /api/games/refresh` | re-fetch every IGDB title on the board, batched at 500 |
| `POST /api/games/hltb/refresh` | queue the board for HowLongToBeat. Answers 202 straight away, and runs once a day by itself |
| `GET /api/movies?search=&limit=` | search TMDB, cache the results, return them in TMDB's order |
| `GET /api/movies/{id}` | one film plus everything you logged against it |
| `PUT /api/movies/{mediaId}/genre` | choose the genre that colours a card, or null for automatic |
| `POST /api/movies/refresh` | re-fetch every TMDB title on the board. One request per film |
| `GET /api/tv?search=&limit=` | search TMDB for shows, cache the results, return them in TMDB's order |
| `GET /api/tv/{id}` | one show, its seasons, and everything you logged against it |
| `PUT /api/tv/{mediaId}/genre` | choose the genre that colours a card, or null for automatic |
| `POST /api/tv/refresh` | re-fetch every TMDB show on the board. One request per show |
| `GET /api/anime?search=&limit=` | search MAL, cache the results, re-rank them by how many people log each |
| `GET /api/anime/{id}` | one anime and everything you logged against it |
| `PUT /api/anime/{mediaId}/genre` | choose the genre that colours a card, or null for automatic |
| `POST /api/anime/refresh` | re-fetch every MAL title on the board. One request per title |
| `GET POST /api/log-entries` | the journal — paged, filterable by status and title |
| `GET PUT DELETE /api/log-entries/{id}` | one pass. Deleting it moves its notes to the current pass, and takes them only with the title's last |
| `POST /api/log-entries/{entryId}/notes` | write a note against a pass — an append, never an overwrite. JSON, or a form when it carries pictures |
| `GET PUT DELETE /api/notes/{id}` | one note. Rewriting it does not move its date, and a form rewrite names the pictures it keeps |
| `GET /api/note-pictures/{id}`, and `thumbnail` under it | a picture in one of your notes, or the card's small copy of it. Never rewritten, so the browser keeps it |
| `GET /api/notes/search?q=&hobby=` | your notes on one board with every word of `q` in them, in any order and any case, newest first. Fifty at most, and it says when there were more |
| `GET /api/library?hobby=&status=&year=&sort=` | your collection, or one board column, with the hours its header says over the whole column and the titles each of its counts leaves out |
| `POST /api/library/{mediaId}/status` | move a title between columns — what a drag calls. `notFinished: true` puts a finish back on the pass it was made on |
| `DELETE /api/library/{mediaId}` | take a title off the board — every pass of yours against it |
| `PUT /api/library/order` | store one column's manual ranking |
| `GET /api/library/export?hobby=` | everything on your board, every pass and every note, for the spreadsheet. Not paged |
| `GET /api/stats?hobby=&year=` | a year in numbers: every playthrough finished, your hours against the estimates, what became of what you started, and how long the backlog has waited |
| `GET /api/stats/years?hobby=` | the years there is something to show for |
| `GET /api/account` | what deleting your account would take: each board's titles, every note, and which sign-in it is |
| `DELETE /api/account` | delete your account and everything that is yours, and sign this browser out. The catalogue stays |
| `GET POST PUT DELETE /api/share?hobby=` | your board's read-only link: see it, make it, change what it shows, stop it |
| `GET /api/shared/{token}`, and `library`, `years`, `upcoming`, `stats`, `stats/years` under it | a share, read with nobody signed in, for the token's owner. Reads only, and every refusal is one 404 |

## Driving it from a shell

To drive the API from a shell, spend a cookie:

```bash
# Sign in once into a jar, then spend it. The redirect chain ends on the board.
curl -c jar -L "localhost:5173/api/auth/google/start?returnUrl=/board" -o /dev/null
curl -b jar "localhost:5173/api/library?hobby=games"
```
