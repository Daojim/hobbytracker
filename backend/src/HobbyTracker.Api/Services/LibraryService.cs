using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
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

    /// <summary>Years in which something was finished, newest first — for the year picker.</summary>
    Task<IReadOnlyList<int>> CompletionYearsAsync(string? hobby, CancellationToken cancellationToken);

    /// <summary>Moves a title to a board column. Null when it has never been logged.</summary>
    Task<LibraryItemDto?> TransitionAsync(
        int mediaId, LogStatus target, CancellationToken cancellationToken);

    Task ReorderAsync(ReorderRequest request, CancellationToken cancellationToken);
}

/// <summary>
/// Your collection: titles you have logged something against.
///
/// Deliberately not "everything in the media table". Searching IGDB upserts every result as a
/// side effect, so `media` accumulates whatever has ever been typed into a search box. Joining
/// to log_entries is what separates the catalog from the collection.
/// </summary>
public sealed class LibraryService(HobbyTrackerDbContext db) : ILibraryService
{
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
        var (normalisedPage, normalisedSize) = Paging.Normalise(page, pageSize);

        var query = Filtered(BoardQuery().AsNoTracking(), hobby, status, year);

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
                row.Latest.DateCompleted ?? row.Latest.DateStarted))
            .ToListAsync(cancellationToken);

        return new PagedResult<LibraryItemDto>(items, total, normalisedPage, normalisedSize);
    }

    public async Task<IReadOnlyList<int>> CompletionYearsAsync(
        string? hobby, CancellationToken cancellationToken) =>
        await Filtered(BoardQuery().AsNoTracking(), hobby, LogStatus.Completed, year: null)
            .Where(row => row.Latest.DateCompleted != null)
            // Off the same projection the Completed column uses, so the picker can never offer
            // a year that turns out to be empty.
            .Select(row => row.Latest.DateCompleted!.Value.Year)
            .Distinct()
            .OrderByDescending(year => year)
            .ToListAsync(cancellationToken);

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
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            if (latest.Status == LogStatus.Completed)
            {
                // Leaving Completed always starts a fresh entry rather than editing the old
                // one. This is what protects a 2024 playthrough when the same game is replayed
                // in 2026, and it is the entire reason the schema allows several entries per
                // title. Editing in place here would silently destroy the completion record.
                var replay = new LogEntry
                {
                    MediaId = mediaId,
                    Status = target,
                    Position = await BoardPositions.TopOfColumnAsync(db, target, cancellationToken),
                };

                ApplyTransitionDates(replay, target, today);
                db.LogEntries.Add(replay);
            }
            else
            {
                latest.Status = target;
                ApplyTransitionDates(latest, target, today);
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        return await ItemAsync(mediaId, cancellationToken);
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

    private IQueryable<BoardRow> BoardQuery() => db.Media
        // One row per title however many times it has been logged. A plain join to log_entries
        // would return a replayed game once per playthrough.
        .Where(media => media.LogEntries.Any())
        .Select(media => new BoardRow
        {
            Media = media,
            HobbyName = media.Hobby!.Name,
            EntryCount = media.LogEntries.Count(),

            // "Current" state comes from the most recent entry: a replay under way beats an old
            // completion. Ordering is date_started DESC NULLS LAST, id DESC — an entry that
            // says when it happened is better evidence than a later one that does not, and the
            // id breaks ties among undated entries.
            //
            // EF turns this nested First() into a LATERAL join rather than N queries.
            //
            // Kept in step with LatestEntryFor below: if the two ever disagree, the board will
            // move one entry and then display a different one.
            Latest = media.LogEntries
                .OrderBy(entry => entry.DateStarted == null)
                .ThenByDescending(entry => entry.DateStarted)
                .ThenByDescending(entry => entry.Id)
                .First(),
        });

    /// <summary>
    /// The entry the board considers current, as a tracked entity. Must order identically to
    /// the projection in <see cref="BoardQuery"/>.
    /// </summary>
    private IQueryable<LogEntry> LatestEntryFor(int mediaId) => db.LogEntries
        .Where(entry => entry.MediaId == mediaId)
        .OrderBy(entry => entry.DateStarted == null)
        .ThenByDescending(entry => entry.DateStarted)
        .ThenByDescending(entry => entry.Id);

    private static IQueryable<BoardRow> Filtered(
        IQueryable<BoardRow> query, string? hobby, LogStatus? status, int? year)
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

        if (year is { } chosen)
        {
            // Scopes the Completed column to a year. Entries finished without a date show up
            // only when no year is asked for.
            query = query.Where(row => row.Latest.DateCompleted != null
                                       && row.Latest.DateCompleted!.Value.Year == chosen);
        }

        return query;
    }

    private static IQueryable<BoardRow> Sorted(IQueryable<BoardRow> query, LibrarySort sort) => sort switch
    {
        LibrarySort.Title => query.OrderBy(row => row.Media.Title),
        LibrarySort.Added => query.OrderByDescending(row => row.Latest.Id),

        // Unrated last in both directions of the scale, rather than sorting as if they were 0.
        LibrarySort.Rating => query
            .OrderBy(row => row.Latest.Rating == null)
            .ThenByDescending(row => row.Latest.Rating),

        // Manual: the user's own ranking. Every other mode is a read-only view that leaves
        // Position untouched, which is why dragging is only offered in this one.
        _ => query.OrderBy(row => row.Latest.Position).ThenByDescending(row => row.Latest.Id),
    };

    private static void ApplyTransitionDates(LogEntry entry, LogStatus target, DateOnly today)
    {
        switch (target)
        {
            case LogStatus.Backlog:
                // Back in the queue means not started. A leftover start date would make the
                // year view claim the game was played.
                entry.DateStarted = null;
                entry.DateCompleted = null;
                break;

            case LogStatus.InProgress:
                // Only when absent: picking a dropped game back up must keep the day you
                // actually started it rather than resetting to today.
                entry.DateStarted ??= today;
                entry.DateCompleted = null;
                break;

            case LogStatus.Completed:
                // Guards ck_log_entries_date_order against a start date set in the future,
                // which is reachable by hand through PUT and would otherwise be a 500.
                entry.DateCompleted = entry.DateStarted is { } started && started > today
                    ? started
                    : today;
                break;

            case LogStatus.Dropped:
                // You did start it; abandoning it does not undo that.
                break;
        }
    }

    private async Task<LibraryItemDto?> ItemAsync(int mediaId, CancellationToken cancellationToken) =>
        await BoardQuery()
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
                row.Latest.DateCompleted ?? row.Latest.DateStarted))
            .FirstOrDefaultAsync(cancellationToken);
}
