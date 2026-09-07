using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Services;

public interface ILibraryService
{
    Task<PagedResult<LibraryItemDto>> ListAsync(
        string? hobby,
        LogStatus? status,
        int? year,
        LibrarySort sort,
        int? page,
        int? pageSize,
        CancellationToken cancellationToken);

    Task<bool> HobbyExistsAsync(string hobby, CancellationToken cancellationToken);

    /// <summary>
    /// Years in which anything was started or finished, newest first — the picker's options.
    /// </summary>
    Task<IReadOnlyList<int>> ActivityYearsAsync(string? hobby, CancellationToken cancellationToken);

    /// <summary>Moves a title to a board column. Null when it has never been logged.</summary>
    Task<LibraryItemDto?> TransitionAsync(
        int mediaId, LogStatus target, CancellationToken cancellationToken);

    /// <summary>
    /// Takes a title off your board by deleting every pass of yours against it — what
    /// <em>Remove from board</em> does. False when you have never logged it.
    ///
    /// Every pass rather than the current one, which is what this did before and what made
    /// removing a replayed title take one press per playthrough. Deleting a single named pass is
    /// the drawer's job, through the log-entry endpoint, where the pass is on screen with its
    /// dates; a board card is one row per title and cannot say which pass you meant.
    /// </summary>
    Task<bool> RemoveFromBoardAsync(int mediaId, CancellationToken cancellationToken);

    Task ReorderAsync(ReorderRequest request, CancellationToken cancellationToken);
}

/// <summary>
/// Your collection: titles you have logged something against.
///
/// Deliberately not "everything in the media table". Searching IGDB upserts every result as a
/// side effect, so `media` accumulates whatever has ever been typed into a search box. Joining
/// to log_entries is what separates the catalog from the collection.
/// </summary>
public sealed class LibraryService(
    HobbyTrackerDbContext db, IJournalClock clock, ICurrentUser user) : ILibraryService
{
    /// <summary>
    /// How much of a note reaches a card.
    ///
    /// A note may be 4000 characters and a board is up to four columns of a hundred rows, so
    /// uncapped this would make the board response scale with how much somebody writes. It is
    /// comfortably more than two lines can hold at the widest card and the loosest density, so
    /// the cut a reader actually sees is always the client's line-clamp and never this one —
    /// which is what lets that clamp answer to the card's width, as a character count cannot.
    /// </summary>
    public const int NotePreviewLength = 200;

    /// <summary>
    /// A title on the board, with the entry that decides which column it sits in.
    ///
    /// Deliberately assigned member by member rather than through a constructor. EF Core can
    /// decompose a member-init projection and push later Where/OrderBy clauses down into SQL;
    /// a positional record is opaque to it, and every filter on <c>Latest</c> fails to
    /// translate.
    /// </summary>
    private sealed class BoardRow
    {
        public Media Media { get; set; } = null!;
        public string HobbyName { get; set; } = null!;
        public int EntryCount { get; set; }
        public LogEntry Latest { get; set; } = null!;
    }

    /// <summary>
    /// The instants a calendar year spans here. Half-open, [From, To), so the boundary belongs
    /// to exactly one year however the clocks moved during it.
    /// </summary>
    private readonly record struct YearSpan(DateTimeOffset From, DateTimeOffset To);

    public Task<bool> HobbyExistsAsync(string hobby, CancellationToken cancellationToken) =>
        db.Hobbies.AnyAsync(h => h.Name == hobby, cancellationToken);

    public async Task<PagedResult<LibraryItemDto>> ListAsync(
        string? hobby,
        LogStatus? status,
        int? year,
        LibrarySort sort,
        int? page,
        int? pageSize,
        CancellationToken cancellationToken)
    {
        var userId = user.Id;

        var (normalisedPage, normalisedSize) = Paging.Normalise(page, pageSize);

        var query = Filtered(BoardQuery().AsNoTracking(), hobby, status, SpanOf(year));

        var total = await query.CountAsync(cancellationToken);

        var items = await Sorted(query, sort)
            .Skip((normalisedPage - 1) * normalisedSize)
            .Take(normalisedSize)
            .Select(row => new LibraryItemDto(
                row.Media.Id,
                row.Media.Title,
                row.Media.CoverUrl,
                row.HobbyName,
                row.Latest.Status,
                row.EntryCount,
                row.Latest.Rating,
                row.Latest.CompletedAt ?? row.Latest.StartedAt,
                // TPT downcasts, added here rather than in BoardQuery on purpose: that
                // projection is what every Where and OrderBy on Latest is pushed through, and
                // when one stops translating the symptom is an empty library rather than an
                // error. This is terminal, so nothing filters on it afterwards.
                //
                // One coalesce per hobby that has something to say. The LEFT JOIN behind each
                // downcast answers null for a row of the other kind, which is what makes ??
                // the whole of the dispatch — there is no hobby predicate here and there should
                // not be one.
                (row.Media as Game)!.Genres ?? (row.Media as Movie)!.Genres
                    ?? (row.Media as TvShow)!.Genres,
                (row.Media as Game)!.PrimaryGenre ?? (row.Media as Movie)!.PrimaryGenre
                    ?? (row.Media as TvShow)!.PrimaryGenre,

                // How long the title takes, whichever hobby is answering: HowLongToBeat's
                // headline figure for a game, the runtime for a film. Rounded to the two places
                // a game's estimate is stored at, so both hobbies put the same shape on the
                // wire — and the client recovers the exact minute from it, because two decimal
                // places is at most 0.3 of a minute out.
                (row.Media as Game)!.HltbAllStylesHours
                    ?? ((row.Media as Movie)!.RuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as Movie)!.RuntimeMinutes ?? 0) / 60m, 2))
                    ?? ((row.Media as TvShow)!.TotalRuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as TvShow)!.TotalRuntimeMinutes ?? 0) / 60m, 2)),

                // Still to be asked about, which is what tells the card whether looking
                // again is worth anything. The type test is not decoration and it is not
                // "(row.Media as Game) != null" either — EF elides that one as always true
                // and the film comes back pending. "is Game" becomes the TPT join's own null
                // check, which is the question actually being asked. Without it an unqualified
                // "checked_at is null" calls every film pending for ever, and the movies board
                // would poll for an answer nobody is coming with.
                row.Media is Game && (row.Media as Game)!.HltbCheckedAt == null,


                // Where you are in a show, off the current pass like everything else on this
                // row except the preview below. Safe anywhere, unlike the coalesces above: these
                // come off Latest rather than through a TPT downcast, so nothing here can stop
                // translating and empty a board.
                row.Latest.SeasonNumber,
                row.Latest.EpisodeNumber,

                // The last thing you wrote about this title, from *any* pass of yours —
                // deliberately unlike every other field on this row, all of which come from
                // Latest. A replay begun this morning has nothing written on it yet, and what
                // you said the first time round is still the last thing you said about it.
                //
                // Which is why the UserId predicate below is load-bearing rather than
                // decorative. Riding on Latest would have inherited BoardQuery's scoping for
                // free; reaching every pass on a title reaches a *shared* title, so without it
                // a stranger's journal prints on your card. Notes carry no user column of
                // their own — they belong to whoever owns the pass they were written during —
                // so this is a join, exactly as every query in NoteService is.
                //
                // Here rather than in BoardQuery for the genre downcast's reason, and it
                // matters more here: this is terminal, so a subquery that fails to translate
                // throws and names itself, where the same thing in BoardQuery would empty the
                // board and say nothing at all.
                row.Media.LogEntries
                    .Where(entry => entry.UserId == userId)
                    .SelectMany(entry => entry.Notes)
                    .OrderByDescending(note => note.WrittenAt)
                    .ThenByDescending(note => note.Id)
                    .Select(note => note.Body.Length > NotePreviewLength
                        ? note.Body.Substring(0, NotePreviewLength)
                        : note.Body)
                    .FirstOrDefault()))
            .ToListAsync(cancellationToken);

        return new PagedResult<LibraryItemDto>(items, total, normalisedPage, normalisedSize);
    }

    public async Task<IReadOnlyList<int>> ActivityYearsAsync(
        string? hobby, CancellationToken cancellationToken)
    {
        // Both dates, off the same projection the columns filter on, so the picker can never
        // offer a year that turns out to be empty in every column at once.
        //
        // Completions alone was right while the year was the Completed column's own control,
        // and is not right now that Playing filters on a start: a year you began something in
        // and finished nothing in would be a year the columns handle perfectly well and the
        // picker has no way to ask for.
        var activity = await Filtered(
                BoardQuery().AsNoTracking(), hobby, status: null, year: null)
            .Select(row => new { row.Latest.StartedAt, row.Latest.CompletedAt })
            .ToListAsync(cancellationToken);

        // The instant becomes a year here rather than in SQL. Postgres can only localise a
        // timestamptz through AT TIME ZONE, which is STABLE rather than IMMUTABLE — it will not
        // go in an index or a generated column — and a bare date_part would read whatever
        // timezone the session was opened with. At the size a personal catalogue reaches this is
        // a few hundred rows, which is a cheap price for the zone staying explicit.
        return [.. activity
            .SelectMany(pass => new[] { pass.StartedAt, pass.CompletedAt })
            .Where(instant => instant is not null)
            .Select(instant => clock.DayOf(instant!.Value).Year)
            .Distinct()
            .OrderByDescending(year => year)];
    }

    public async Task<LibraryItemDto?> TransitionAsync(
        int mediaId, LogStatus target, CancellationToken cancellationToken)
    {
        var latest = await LatestEntryFor(mediaId).FirstOrDefaultAsync(cancellationToken);
        if (latest is null)
        {
            // In the catalog but not on the board — there is no entry to move.
            return null;
        }

        if (latest.Status != target)
        {
            var now = clock.Now;

            if (latest.Status == LogStatus.Completed)
            {
                // Leaving Completed always starts a fresh entry rather than editing the old
                // one. This is what protects a 2024 playthrough when the same game is replayed
                // in 2026, and it is the entire reason the schema allows several entries per
                // title. Editing in place here would silently destroy the completion record.
                var replay = new LogEntry
                {
                    MediaId = mediaId,

                    // Yours, like the pass it replaces. LatestEntryFor above already refused
                    // anybody else's, so this can only ever be a replay of your own.
                    UserId = user.Id,

                    Status = target,
                    LoggedAt = now,
                    Position = await BoardPositions.TopOfColumnAsync(
                        db, target, user.Id, cancellationToken),
                };

                ApplyTransitionTimestamps(replay, target, now);
                db.LogEntries.Add(replay);
            }
            else
            {
                latest.Status = target;
                ApplyTransitionTimestamps(latest, target, now);
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        return await ItemAsync(mediaId, cancellationToken);
    }

    public async Task<bool> RemoveFromBoardAsync(int mediaId, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        // Every pass of yours, and every pass of *only* yours. The title is shared — two people
        // searching "Hollow Knight" get the same media row — so a delete keyed on the media id
        // alone would empty a stranger's history of it in one request, with nothing to tell them
        // what happened.
        var mine = await db.LogEntries
            .Where(entry => entry.MediaId == mediaId && entry.UserId == userId)
            .ToListAsync(cancellationToken);

        if (mine.Count == 0)
        {
            // In the catalog but not on your board — there is nothing to take off it.
            return false;
        }

        // All of them, which is what "Remove from board" says and did not used to do. Deleting
        // only the current pass was defensible on paper and wrong in the hand: a title replayed
        // five times took five presses, and each one looked like a failure because the card
        // sprang back to whichever column the pass underneath was in.
        //
        // Deleting one pass at a time is still possible and is the drawer's job, where the pass
        // is named and its dates are on screen. A board card is one row per title and has no
        // way to say which pass you meant.
        //
        // The notes go too, by cascade, because a note belongs to the pass it was written
        // during. Nothing here has to know that.
        db.LogEntries.RemoveRange(mine);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task ReorderAsync(ReorderRequest request, CancellationToken cancellationToken)
    {
        // Only the entries that currently decide a card's place in *this* column. Anything the
        // caller listed that has since moved elsewhere simply is not here — a board loaded a
        // moment ago can legitimately be one drag out of date, and failing the whole request
        // over that would strand the user's reorder.
        var inColumn = await Filtered(BoardQuery(), request.Hobby, request.Status, year: null)
            .Where(row => request.MediaIds.Contains(row.Media.Id))
            .Select(row => new { MediaId = row.Media.Id, Entry = row.Latest })
            .ToListAsync(cancellationToken);

        if (inColumn.Count == 0)
        {
            return;
        }

        var rank = request.MediaIds
            .Select((mediaId, index) => (mediaId, index))
            .ToDictionary(pair => pair.mediaId, pair => pair.index);

        foreach (var row in inColumn)
        {
            row.Entry.Position = rank[row.MediaId];
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    // ------------------------------------------------------------------ internals

    private IQueryable<BoardRow> BoardQuery()
    {
        // Read once into a local, so EF parameterises it and so an unauthenticated caller fails
        // here rather than quietly producing a board scoped to nobody.
        var userId = user.Id;

        // All three reaches into log_entries below carry the predicate, and all three have to.
        // Scoping only the first would leave EntryCount counting strangers' replays and Latest
        // able to pick a stranger's entry — and Latest is what decides the column, so the
        // symptom would be your own Backlog title sitting under Completed.
        return db.Media
            // One row per title however many times it has been logged. A plain join to
            // log_entries would return a replayed game once per playthrough.
            .Where(media => media.LogEntries.Any(entry => entry.UserId == userId))
            .Select(media => new BoardRow
            {
                Media = media,
                HobbyName = media.Hobby!.Name,
                EntryCount = media.LogEntries.Count(entry => entry.UserId == userId),

                // "Current" state comes from the most recent entry: a replay under way beats an
                // old completion. Ordering is logged_at DESC, id DESC: a pass is current because
                // it was recorded most recently, not because it happens to carry a date.
                //
                // This used to prefer a dated entry over an undated one, which read well and was
                // wrong. Leaving Completed for Backlog or Dropped writes an entry with no dates
                // by rule, so it could never outrank the completion it replaced — the card
                // sprang back to Completed and every retry added another orphan entry.
                //
                // logged_at is server-stamped on every insert and NOT NULL with a now() default,
                // so it is always there to order by. The id breaks ties, which is not a detail:
                // several entries written in the same instant is exactly what a test fixture on
                // a stopped clock produces.
                //
                // EF turns this nested First() into a LATERAL join rather than N queries.
                //
                // Kept in step with LatestEntryFor below and with GameCatalogService.GetAsync:
                // if they disagree, the board moves one entry and then displays a different one.
                // That now includes agreeing about whose entries are in scope.
                Latest = media.LogEntries
                    .Where(entry => entry.UserId == userId)
                    .OrderByDescending(entry => entry.LoggedAt)
                    .ThenByDescending(entry => entry.Id)
                    .First(),
            });
    }
    /// <summary>
    /// The entry the board considers current, as a tracked entity. Must order identically to
    /// the projection in <see cref="BoardQuery"/> and to the entry list in
    /// <c>GameCatalogService.GetAsync</c>, and must agree with them about whose entries count.
    ///
    /// This one feeds two mutating paths addressed by media id alone — a transition and a close
    /// — so leaving it unscoped would not be a leak but an edit to somebody else's board.
    /// </summary>
    private IQueryable<LogEntry> LatestEntryFor(int mediaId)
    {
        var userId = user.Id;

        return db.LogEntries
            .Where(entry => entry.MediaId == mediaId && entry.UserId == userId)
            .OrderByDescending(entry => entry.LoggedAt)
            .ThenByDescending(entry => entry.Id);
    }

    /// <summary>
    /// Turns a calendar year into the instants that bound it here. The offset is asked of the
    /// zone at each boundary rather than assumed, so a year is the right length even though one
    /// of its days is 23 hours and another is 25.
    /// </summary>
    private YearSpan? SpanOf(int? year) => year is { } chosen
        ? new YearSpan(FirstInstantOf(chosen), FirstInstantOf(chosen + 1))
        : null;

    private DateTimeOffset FirstInstantOf(int year)
    {
        var midnight = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Unspecified);
        return new DateTimeOffset(midnight, clock.Zone.GetUtcOffset(midnight)).ToUniversalTime();
    }

    private static IQueryable<BoardRow> Filtered(
        IQueryable<BoardRow> query, string? hobby, LogStatus? status, YearSpan? year)
    {
        if (!string.IsNullOrWhiteSpace(hobby))
        {
            query = query.Where(row => row.HobbyName == hobby);
        }

        if (status is { } wanted)
        {
            // Filters on current status, not "has ever been". A game completed in 2024 and
            // being replayed now belongs under InProgress, and must not also appear under
            // Completed.
            query = query.Where(row => row.Latest.Status == wanted);
        }

        if (year is { } span)
        {
            query = InYear(query, status, span);
        }

        return query;
    }

    /// <summary>
    /// Narrows a column to one calendar year, on the date that column is actually about.
    ///
    /// The year used to mean completed_at and nothing else, because it was the Completed
    /// column's own control and no other column asked. Board-wide it cannot stay that: Backlog
    /// and InProgress have their completion cleared by the very rules that put a title in them,
    /// so one predicate for all four would leave three columns permanently empty and read as a
    /// broken filter rather than a strict one.
    ///
    /// Every comparison is a half-open range of instants, never EXTRACT(year FROM …).
    /// date_part on a timestamptz reads the session's timezone, so that query would answer
    /// differently depending on how the connection happened to be opened — and a game finished
    /// at 8pm on New Year's Eve would count towards the following year. A title whose relevant
    /// date is null belongs to no year, and shows up only when none is asked for.
    /// </summary>
    private static IQueryable<BoardRow> InYear(
        IQueryable<BoardRow> query, LogStatus? status, YearSpan span) => status switch
    {
        // Exempt, rather than answering with nothing. A Backlog entry has both timestamps
        // cleared by rule, so "my 2019 backlog" is not a question the data can answer — and the
        // useful behaviour is not an empty well but the queue you drag out of while reading a
        // past year.
        LogStatus.Backlog => query,

        // Begun in that year. The transition into this column clears completed_at, so a start
        // is the only date a title here has.
        LogStatus.InProgress => query.Where(row =>
            row.Latest.StartedAt != null
            && row.Latest.StartedAt >= span.From
            && row.Latest.StartedAt < span.To),

        // Finished in that year, pointedly not begun in it. A game started in 2019 and finished
        // in 2021 is a 2021 completion, and filing it under 2019 would make the year view
        // disagree with the sentence a person would say about it.
        LogStatus.Completed => query.Where(row =>
            row.Latest.CompletedAt != null
            && row.Latest.CompletedAt >= span.From
            && row.Latest.CompletedAt < span.To),

        // Dropped, and the whole library when no column is named: either date. Dropping leaves
        // the timestamps alone on purpose, so an abandoned title carries a start, a completion
        // from an earlier pass, or neither depending on where it was abandoned from. With no
        // column named there is no one date to prefer, and "active in that year" is the only
        // reading that does not quietly privilege one of the four.
        _ => query.Where(row =>
            (row.Latest.StartedAt != null
             && row.Latest.StartedAt >= span.From
             && row.Latest.StartedAt < span.To)
            || (row.Latest.CompletedAt != null
                && row.Latest.CompletedAt >= span.From
                && row.Latest.CompletedAt < span.To)),
    };

    private static IQueryable<BoardRow> Sorted(IQueryable<BoardRow> query, LibrarySort sort) => sort switch
    {
        LibrarySort.Title => query.OrderBy(row => row.Media.Title),
        LibrarySort.Added => query.OrderByDescending(row => row.Latest.Id),

        // Unrated last in both directions of the scale, rather than sorting as if they were 0.
        LibrarySort.Rating => query
            .OrderBy(row => row.Latest.Rating == null)
            .ThenByDescending(row => row.Latest.Rating),

        // Shortest first, on the same number the card prints, and that is the whole rule: a
        // column ordered by a figure nobody can see reads as broken. This used to order on main
        // story, which is what the card showed then; both moved to the headline All Styles
        // number together, and they have to keep moving together. LibraryItemDto.LengthHours is
        // what makes that cheap to keep true — the card and this arm read one field.
        //
        // A title with no figure sorts last, rather than as though nobody having timed it meant
        // it took no time.
        //
        // The downcast is confined to this one arm on purpose. BoardQuery is what every Where
        // and OrderBy is pushed through, so a downcast that failed to translate *there* would
        // empty the whole board; here the worst case is that this one mode breaks. See the
        // comment on BoardQuery, and the test that asserts this column comes back non-empty.
        // Ordered on the same coalesce the two projections build LengthHours from, so a column
        // cannot be sorted by a number its cards do not show. Not rounded here: rounding cannot
        // change an ordering, and leaving it out keeps the expression readable.
        LibrarySort.Length => query
            .OrderBy(row => (row.Media as Game)!.HltbAllStylesHours == null
                            && (row.Media as Movie)!.RuntimeMinutes == null
                            && (row.Media as TvShow)!.TotalRuntimeMinutes == null)
            .ThenBy(row => (row.Media as Game)!.HltbAllStylesHours
                           ?? (row.Media as Movie)!.RuntimeMinutes / 60m
                           ?? (row.Media as TvShow)!.TotalRuntimeMinutes / 60m),

        // Manual: the user's own ranking. Every other mode is a read-only view that leaves
        // Position untouched, which is why dragging is only offered in this one.
        _ => query.OrderBy(row => row.Latest.Position).ThenByDescending(row => row.Latest.Id),
    };

    private static void ApplyTransitionTimestamps(LogEntry entry, LogStatus target, DateTimeOffset now)
    {
        switch (target)
        {
            case LogStatus.Backlog:
                // Back in the queue means not started. A leftover start date would make the
                // year view claim the game was played.
                entry.StartedAt = null;
                entry.CompletedAt = null;

                // And where you were, for the same reason: a card back in the queue
                // still reading S3 E7 is the same lie a leftover start date is. The
                // other three arms leave it alone - dropping a show halfway is exactly
                // when where you got to is worth keeping.
                entry.SeasonNumber = null;
                entry.EpisodeNumber = null;
                break;

            case LogStatus.InProgress:
                // Only when absent: picking a dropped game back up must keep the day you
                // actually started it rather than resetting to today.
                entry.StartedAt ??= now;
                entry.CompletedAt = null;
                break;

            case LogStatus.Completed:
                // Guards ck_log_entries_timestamp_order against a start moment in the future,
                // which is reachable by hand through PUT and would otherwise be a 500.
                entry.CompletedAt = entry.StartedAt is { } started && started > now
                    ? started
                    : now;
                break;

            case LogStatus.Dropped:
                // You did start it, and abandoning it does not undo that, so a start already
                // here is kept exactly as InProgress keeps one.
                //
                // A pass carrying none is given one, which is the half that is not obvious. The
                // alternative is not "no date": it is an entry belonging to no year at all, and
                // the board reads one year at a time — Dropped is narrowed by either timestamp,
                // so a title dragged straight out of the queue would leave the board entirely
                // and be findable only under All years. That reads as a drag that lost the game
                // rather than as a filter being strict. See InYear, and it agrees with what this
                // column is for: a game you picked up and gave up on.
                //
                // The completion is left alone either way, and is what a start falls back to
                // when one is there. A pass can carry a finish and no start — the drawer's form
                // writes every field, so a game being played can be given a completion date and
                // left without a beginning — and stamping "now" over that would put the start
                // after the finish, which ck_log_entries_timestamp_order refuses. That is a 500
                // on a request with nothing wrong with it, which is the same trap the Completed
                // arm above guards, facing the other way.
                entry.StartedAt ??= entry.CompletedAt is { } finished && finished < now
                    ? finished
                    : now;
                break;
        }
    }

    private async Task<LibraryItemDto?> ItemAsync(int mediaId, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        return await BoardQuery()
            .AsNoTracking()
            .Where(row => row.Media.Id == mediaId)
            .Select(row => new LibraryItemDto(
                row.Media.Id,
                row.Media.Title,
                row.Media.CoverUrl,
                row.HobbyName,
                row.Latest.Status,
                row.EntryCount,
                row.Latest.Rating,
                row.Latest.CompletedAt ?? row.Latest.StartedAt,
                // As in ListAsync, coalesce and all. This copy has to exist and has to match:
                // a transition answers with the row it just wrote and the board caches that, so
                // a field populated in one projection and null in the other flickers on a drag.
                (row.Media as Game)!.Genres ?? (row.Media as Movie)!.Genres
                    ?? (row.Media as TvShow)!.Genres,
                (row.Media as Game)!.PrimaryGenre ?? (row.Media as Movie)!.PrimaryGenre
                    ?? (row.Media as TvShow)!.PrimaryGenre,
                (row.Media as Game)!.HltbAllStylesHours
                    ?? ((row.Media as Movie)!.RuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as Movie)!.RuntimeMinutes ?? 0) / 60m, 2))
                    ?? ((row.Media as TvShow)!.TotalRuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((row.Media as TvShow)!.TotalRuntimeMinutes ?? 0) / 60m, 2)),

                // Still to be asked about, which is what tells the card whether looking
                // again is worth anything. The type test is not decoration and it is not
                // "(row.Media as Game) != null" either — EF elides that one as always true
                // and the film comes back pending. "is Game" becomes the TPT join's own null
                // check, which is the question actually being asked. Without it an unqualified
                // "checked_at is null" calls every film pending for ever, and the movies board
                // would poll for an answer nobody is coming with.
                row.Media is Game && (row.Media as Game)!.HltbCheckedAt == null,

                row.Latest.SeasonNumber,
                row.Latest.EpisodeNumber,

                // As in ListAsync, predicate and all. This copy has to exist: it is what a drag
                // or a menu move answers with, and a field arriving null here and populated on
                // the next refetch would flicker.
                row.Media.LogEntries
                    .Where(entry => entry.UserId == userId)
                    .SelectMany(entry => entry.Notes)
                    .OrderByDescending(note => note.WrittenAt)
                    .ThenByDescending(note => note.Id)
                    .Select(note => note.Body.Length > NotePreviewLength
                        ? note.Body.Substring(0, NotePreviewLength)
                        : note.Body)
                    .FirstOrDefault()))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
