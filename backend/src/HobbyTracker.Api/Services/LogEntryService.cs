using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Services;

public interface ILogEntryService
{
    Task<PagedResult<LogEntryDto>> ListAsync(
        int? mediaId, LogStatus? status, int? page, int? pageSize, CancellationToken cancellationToken);

    Task<LogEntryDto?> GetAsync(int id, CancellationToken cancellationToken);

    /// <summary>Returns null when the referenced media does not exist.</summary>
    Task<LogEntryDto?> CreateAsync(CreateLogEntryRequest request, CancellationToken cancellationToken);

    /// <summary>Returns null when the entry does not exist.</summary>
    Task<LogEntryDto?> UpdateAsync(int id, UpdateLogEntryRequest request, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken);
}

/// <summary>
/// The journal. Entries are per-pass, not per-title: logging a replay adds a row rather than
/// overwriting the last one, which is what makes "I finished this in 2024 and I am replaying
/// it now" expressible at all.
///
/// user_id is left null throughout. The column is nullable until auth lands in a later phase,
/// at which point existing rows get backfilled and the column tightened.
/// </summary>
public sealed class LogEntryService(HobbyTrackerDbContext db, IJournalClock clock) : ILogEntryService
{
    public async Task<PagedResult<LogEntryDto>> ListAsync(
        int? mediaId, LogStatus? status, int? page, int? pageSize, CancellationToken cancellationToken)
    {
        var (normalisedPage, normalisedSize) = Paging.Normalise(page, pageSize);

        var query = db.LogEntries.AsNoTracking().Include(entry => entry.Media).AsQueryable();

        if (mediaId is { } media)
        {
            query = query.Where(entry => entry.MediaId == media);
        }

        if (status is { } wanted)
        {
            query = query.Where(entry => entry.Status == wanted);
        }

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            // Most recently recorded first. Id rather than a date, because the useful ordering
            // is "what did I just write down", and dates are optional on an entry.
            .OrderByDescending(entry => entry.Id)
            .Skip((normalisedPage - 1) * normalisedSize)
            .Take(normalisedSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<LogEntryDto>(
            [.. items.Select(LogEntryDto.From)], total, normalisedPage, normalisedSize);
    }

    public async Task<LogEntryDto?> GetAsync(int id, CancellationToken cancellationToken)
    {
        var entry = await db.LogEntries
            .AsNoTracking()
            .Include(e => e.Media)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        return entry is null ? null : LogEntryDto.From(entry);
    }

    public async Task<LogEntryDto?> CreateAsync(
        CreateLogEntryRequest request, CancellationToken cancellationToken)
    {
        // Check the reference rather than letting the insert fail: a bare foreign-key violation
        // surfaces as a 500, when an unknown media id is squarely the caller's mistake.
        var media = await db.Media.FirstOrDefaultAsync(m => m.Id == request.MediaId, cancellationToken);
        if (media is null)
        {
            return null;
        }

        var entry = new LogEntry
        {
            MediaId = media.Id,
            Media = media,
            Status = request.Status,
            Rating = request.Rating,
            Notes = request.Notes,
            Platform = request.Platform,
            StartedAt = request.StartedAt,
            CompletedAt = request.CompletedAt,

            // Server-stamped, never taken from the request: this records that the entry was
            // written, which is not something a caller is in a position to assert.
            LoggedAt = clock.Now,

            // Top of its column, so a title you just added is the first thing you see rather
            // than something you have to scroll for.
            Position = await BoardPositions.TopOfColumnAsync(db, request.Status, cancellationToken),
        };

        db.LogEntries.Add(entry);
        await db.SaveChangesAsync(cancellationToken);

        return LogEntryDto.From(entry);
    }

    public async Task<LogEntryDto?> UpdateAsync(
        int id, UpdateLogEntryRequest request, CancellationToken cancellationToken)
    {
        var entry = await db.LogEntries
            .Include(e => e.Media)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (entry is null)
        {
            return null;
        }

        // Full replacement, so every field is assigned including the ones the caller omitted.
        // That is the contract PUT buys: absent means cleared, with none of PATCH's ambiguity
        // between "unset this" and "leave it alone".
        entry.Status = request.Status;
        entry.Rating = request.Rating;
        entry.Notes = request.Notes;
        entry.Platform = request.Platform;
        entry.StartedAt = request.StartedAt;
        entry.CompletedAt = request.CompletedAt;

        await db.SaveChangesAsync(cancellationToken);

        return LogEntryDto.From(entry);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var entry = await db.LogEntries.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (entry is null)
        {
            return false;
        }

        // Removes the entry only. The media row stays in the catalog — un-logging something is
        // not the same as forgetting it exists.
        db.LogEntries.Remove(entry);
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }
}
