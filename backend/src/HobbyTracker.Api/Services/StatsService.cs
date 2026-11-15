using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Services;

public interface IStatsService
{
    /// <summary>A year of one hobby, or every year when <paramref name="year"/> is null.</summary>
    Task<StatsDto> GetAsync(string? hobby, int? year, CancellationToken cancellationToken);

    /// <summary>
    /// The years the Stats page can show, newest first: every year any of your passes started or
    /// finished in.
    /// </summary>
    Task<IReadOnlyList<int>> YearsAsync(string? hobby, CancellationToken cancellationToken);
}

/// <summary>
/// The Stats page as a share reads it: its owner's, named by the caller, and never the session's.
///
/// <para>
/// <b>Whole, whichever columns the share shows</b>, as decided at the #9 workshop: every finish,
/// and what was dropped counted as a number with no titles. So these are the owner's own page,
/// figure for figure, and the only thing a share decides about them is whether they are on it.
/// An interface of its own for <see cref="ISharedLibrary"/>'s reason: the controller holding it
/// can reach nothing that acts as whoever is signed in.
/// </para>
/// </summary>
public interface ISharedStats
{
    Task<StatsDto> GetAsync(int ownerId, string hobby, int? year, CancellationToken cancellationToken);

    Task<IReadOnlyList<int>> YearsAsync(int ownerId, string hobby, CancellationToken cancellationToken);
}

/// <summary>
/// What a year of a hobby added up to.
///
/// <para>
/// <b>It reads passes, where the board reads titles.</b> The board is about where things are now,
/// so it shows a title once, by its latest pass. This is about what happened, so every pass counts
/// for what it did: a finish replayed since is still a finish, and a game finished twice is two.
/// That is also why the years are its own — a year whose only activity is a pass a replay has
/// since replaced is not on the board's list, and is a year this page has something to say about.
/// </para>
///
/// <para>
/// <b>Scoped by <c>log_entries.user_id</c> in <see cref="Passes"/></b>, the one place every query
/// here starts from, as NoteService scopes. The titles are shared and the passes are not, so a
/// query that started anywhere else would count a stranger's playthroughs as yours. Whose passes
/// is the caller's to say: <c>user.Id</c> for your own page, the token's owner for a share's.
/// </para>
/// </summary>
public sealed class StatsService(
    HobbyTrackerDbContext db,
    IJournalClock clock,
    ICurrentUser user,
    ILibraryService library) : IStatsService, ISharedStats
{
    public Task<StatsDto> GetAsync(string? hobby, int? year, CancellationToken cancellationToken) =>
        StatsOfAsync(user.Id, hobby, year, cancellationToken);

    Task<StatsDto> ISharedStats.GetAsync(
        int ownerId, string hobby, int? year, CancellationToken cancellationToken) =>
        StatsOfAsync(ownerId, hobby, year, cancellationToken);

    public Task<IReadOnlyList<int>> YearsAsync(string? hobby, CancellationToken cancellationToken) =>
        YearsOfAsync(user.Id, hobby, cancellationToken);

    Task<IReadOnlyList<int>> ISharedStats.YearsAsync(
        int ownerId, string hobby, CancellationToken cancellationToken) =>
        YearsOfAsync(ownerId, hobby, cancellationToken);

    private async Task<StatsDto> StatsOfAsync(
        int ownerId, string? hobby, int? year, CancellationToken cancellationToken)
    {
        var finished = await FinishedAsync(ownerId, hobby, year, cancellationToken);

        return new StatsDto(
            finished,

            // The column header's rules, over the year's finishes rather than a column's titles.
            HoursTally.Of(finished.Select(finish => (finish.LengthHours, finish.HoursPlayed))),

            await CompletionAsync(ownerId, hobby, year, cancellationToken),

            // Backlog belongs to no year, here as on the board.
            await library.BacklogAsync(ownerId, hobby, cancellationToken));
    }

    private async Task<IReadOnlyList<int>> YearsOfAsync(
        int ownerId, string? hobby, CancellationToken cancellationToken)
    {
        // Every pass that has left the queue, by the dates the page files it under. A pass in
        // Backlog has no year by rule, so a date left on one by an edit offers nothing to see — a
        // year kept for a date as much as a day.
        var dates = await Passes(ownerId, hobby)
            .Where(entry => entry.Status != LogStatus.Backlog)
            .Select(entry => new { entry.StartedAt, entry.CompletedAt, entry.StartedYear, entry.CompletedYear })
            .ToListAsync(cancellationToken);

        // A date kept as a year (#24) is a year already, and joins the instants' years as it is.
        return clock.YearsOf(
            dates.SelectMany(pass => new[] { pass.StartedAt, pass.CompletedAt }),
            dates.SelectMany(pass => new[] { pass.StartedYear, pass.CompletedYear }));
    }

    /// <summary>One owner's passes, of one hobby or of all of them.</summary>
    private IQueryable<LogEntry> Passes(int ownerId, string? hobby)
    {
        var passes = db.LogEntries.AsNoTracking().Where(entry => entry.UserId == ownerId);

        return string.IsNullOrWhiteSpace(hobby)
            ? passes
            : passes.Where(entry => entry.Media!.Hobby!.Name == hobby);
    }

    /// <summary>
    /// Every pass in Completed whose finish is in the year — or, with no year, every pass in
    /// Completed, the one with its date cleared included and sorted last.
    /// </summary>
    private async Task<IReadOnlyList<FinishDto>> FinishedAsync(
        int ownerId, string? hobby, int? year, CancellationToken cancellationToken)
    {
        // Completed and nothing else. A dropped pass can carry a finish date — dropping leaves a
        // completion alone — and is not a game you finished.
        var finished = Passes(ownerId, hobby).Where(entry => entry.Status == LogStatus.Completed);

        if (year is { } number)
        {
            // A range of instants, never EXTRACT: see IJournalClock.SpanOf. And a finish kept as a
            // year (#24), compared with the year asked for as it is, with no zone involved.
            var span = clock.SpanOf(number);

            finished = finished.Where(entry =>
                (entry.CompletedAt != null
                 && entry.CompletedAt >= span.From
                 && entry.CompletedAt < span.To)
                || entry.CompletedYear == number);
        }

        var finishes = await finished
            // By id here, so a tie in the order below goes to the pass written first, as it
            // always has: LINQ's ordering is stable, and the rest of the order is set below.
            .OrderBy(entry => entry.Id)
            .Select(entry => new FinishDto(
                entry.MediaId,

                // The name a card leads with, as the board's projections build it.
                (entry.Media as Anime)!.EnglishTitle ?? entry.Media!.Title,

                entry.Media!.CoverUrl,
                entry.CompletedAt,
                entry.CompletedYear,
                entry.Rating,
                entry.HoursPlayed,

                // How long the title takes, as its card prints it — LibraryItemDto.LengthHours,
                // rounding and all. The fifth copy of this coalesce, after the board's two
                // projections, Sorted's Length arm and the column header's sum; a shared expression
                // cannot be invoked inside another in a query EF can translate. What holds this
                // one to the cards is StatsEndpointTests' test of every hobby, as
                // ColumnHoursTests holds the fourth.
                (entry.Media as Game)!.HltbAllStylesHours
                    ?? ((entry.Media as Movie)!.RuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((entry.Media as Movie)!.RuntimeMinutes ?? 0) / 60m, 2))
                    ?? ((entry.Media as TvShow)!.TotalRuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((entry.Media as TvShow)!.TotalRuntimeMinutes ?? 0) / 60m, 2))
                    ?? ((entry.Media as Anime)!.TotalRuntimeMinutes == null
                        ? (decimal?)null
                        : Math.Round(((entry.Media as Anime)!.TotalRuntimeMinutes ?? 0) / 60m, 2))))
            .ToListAsync(cancellationToken);

        // Oldest first, and the undated last. A finish kept as a year (#24) sits after every
        // instant in its year here and before every instant that is not, at the end of its year
        // as IJournalClock.SpanOf says it ends: so a year's undated finishes come after its dated
        // ones, in this list and in every list the page makes of it, and under All years each sits
        // with its own year. Ordered here rather than in SQL, because which year an instant is in
        // is the zone's question, and SpanOf is already where a year meets an instant — the places
        // the zone is applied stay four. A day exactly at that end is the next year's first
        // instant, so a kept year goes ahead of it.
        DateTimeOffset? FiledAt(FinishDto finish) =>
            finish.CompletedAt ?? (finish.CompletedYear is { } kept ? clock.SpanOf(kept).To : null);

        return
        [
            .. finishes
                .OrderBy(finish => FiledAt(finish) is null)
                .ThenBy(FiledAt)
                .ThenBy(finish => finish.CompletedAt is not null),
        ];
    }

    /// <summary>
    /// What became of the passes started in the year: by the pass's start, or by its finish when
    /// it has no start, since adding a title straight to Completed stamps nothing else. Each a day
    /// or, since #24, a year kept as a year.
    /// </summary>
    private async Task<CompletionDto> CompletionAsync(
        int ownerId, string? hobby, int? year, CancellationToken cancellationToken)
    {
        var started = Passes(ownerId, hobby);

        if (year is { } number)
        {
            var span = clock.SpanOf(number);

            // The start in the year, on a day or kept as the year; or, with no start of either
            // kind, the finish in it, of either kind. A start kept as 2018 beside a finish on a
            // day in 2019 is a 2018 start.
            started = started.Where(entry =>
                (entry.StartedAt != null && entry.StartedAt >= span.From && entry.StartedAt < span.To)
                || entry.StartedYear == number
                || (entry.StartedAt == null
                    && entry.StartedYear == null
                    && ((entry.CompletedAt != null
                         && entry.CompletedAt >= span.From
                         && entry.CompletedAt < span.To)
                        || entry.CompletedYear == number)));
        }

        var counts = await started
            .GroupBy(entry => entry.Status)
            .Select(group => new { Status = group.Key, Passes = group.Count() })
            .ToDictionaryAsync(group => group.Status, group => group.Passes, cancellationToken);

        int Count(LogStatus status) => counts.GetValueOrDefault(status);

        // Every column a started pass can be in, said out loud — and Backlog in none of them,
        // which is the whole of that rule. A pass there has not started, whatever date an edit
        // left on it: the move into Backlog clears both. A sixth status would need a decision
        // here too; LogStatus names the places that do.
        return new CompletionDto(
            Finished: Count(LogStatus.Completed),
            Going: Count(LogStatus.InProgress) + Count(LogStatus.OnHold),
            Dropped: Count(LogStatus.Dropped));
    }
}
