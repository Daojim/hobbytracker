using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Services;

public interface ILibraryService
{
    Task<PagedResult<LibraryItemDto>> ListAsync(
        string? hobby, LogStatus? status, int? page, int? pageSize, CancellationToken cancellationToken);

    Task<bool> HobbyExistsAsync(string hobby, CancellationToken cancellationToken);
}

/// <summary>
/// Your collection: titles you have logged something against.
///
/// Deliberately not "everything in the media table". Searching IGDB upserts every result as a
/// side effect, so `media` accumulates whatever has ever been typed into a search box — mostly
/// titles the user glanced at and never touched again. Joining to log_entries is what
/// separates the catalog from the collection.
/// </summary>
public sealed class LibraryService(HobbyTrackerDbContext db) : ILibraryService
{
    public Task<bool> HobbyExistsAsync(string hobby, CancellationToken cancellationToken) =>
        db.Hobbies.AnyAsync(h => h.Name == hobby, cancellationToken);

    public async Task<PagedResult<LibraryItemDto>> ListAsync(
        string? hobby, LogStatus? status, int? page, int? pageSize, CancellationToken cancellationToken)
    {
        var (normalisedPage, normalisedSize) = Paging.Normalise(page, pageSize);

        var query = db.Media
            .AsNoTracking()
            // One row per title however many times it has been logged. A plain join to
            // log_entries would return a replayed game once per playthrough.
            .Where(media => media.LogEntries.Any())
            .Select(media => new
            {
                Media = media,
                HobbyName = media.Hobby!.Name,
                EntryCount = media.LogEntries.Count(),

                // "Current" state comes from the most recent entry: a replay under way should
                // beat an old completion. Ordering is date_started DESC NULLS LAST, id DESC —
                // an entry that says when it happened is better evidence than a later one that
                // does not, and the id breaks ties among undated entries.
                //
                // EF turns this nested First() into a LATERAL join rather than N queries.
                Latest = media.LogEntries
                    .OrderBy(entry => entry.DateStarted == null)
                    .ThenByDescending(entry => entry.DateStarted)
                    .ThenByDescending(entry => entry.Id)
                    .First(),
            });

        if (!string.IsNullOrWhiteSpace(hobby))
        {
            query = query.Where(item => item.HobbyName == hobby);
        }

        if (status is { } wanted)
        {
            // Filters on current status, not "has ever been". A game completed in 2024 and
            // being replayed now belongs under InProgress, and must not also appear under
            // Completed.
            query = query.Where(item => item.Latest.Status == wanted);
        }

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(item => item.Latest.Id)
            .Skip((normalisedPage - 1) * normalisedSize)
            .Take(normalisedSize)
            .Select(item => new LibraryItemDto(
                item.Media.Id,
                item.Media.Title,
                item.Media.CoverUrl,
                item.HobbyName,
                item.Latest.Status,
                item.EntryCount,
                item.Latest.Rating,
                item.Latest.DateCompleted ?? item.Latest.DateStarted))
            .ToListAsync(cancellationToken);

        return new PagedResult<LibraryItemDto>(items, total, normalisedPage, normalisedSize);
    }
}
