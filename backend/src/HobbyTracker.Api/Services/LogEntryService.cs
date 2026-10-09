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

    /// <summary>
    /// Deletes one pass. Its notes move to the current pass of those that stay, with their dates
    /// unchanged, and go with it only when it was the title's last. False when there is no such
    /// pass of yours.
    /// </summary>
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken);
}

/// <summary>
/// The journal. Entries are per-pass, not per-title: logging a replay adds a row rather than
/// overwriting the last one, which is what makes "I finished this in 2024 and I am replaying
/// it now" expressible at all.
///
/// Every read and every write here is scoped to the signed-in user. Passes are personal, unlike
/// the media and games rows they point at, which are a shared catalogue.
/// </summary>
public sealed class LogEntryService(
    HobbyTrackerDbContext db,
    IJournalClock clock,
    IEnumerable<IMediaAdded> mediaAdded,
    ILogger<LogEntryService> logger,
    ICurrentUser user) : ILogEntryService
{
    public async Task<PagedResult<LogEntryDto>> ListAsync(
        int? mediaId, LogStatus? status, int? page, int? pageSize, CancellationToken cancellationToken)
    {
        var (normalisedPage, normalisedSize) = Paging.Normalise(page, pageSize);

        // Notes are on the DTO, so they have to be loaded: an entry read without this maps to
        // a DTO reporting no notes at all, silently, with nothing failing to compile.
        var userId = user.Id;

        var query = db.LogEntries
            .AsNoTracking()
            .Include(entry => entry.Media)
            .Include(entry => entry.Notes)
            // Yours, and the total below counts the same rows -- a page scoped without its
            // count reports somebody else's passes as pages you can never reach.
            .Where(entry => entry.UserId == userId);

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
        var userId = user.Id;

        var entry = await db.LogEntries
            .AsNoTracking()
            .Include(e => e.Media)
            .Include(e => e.Notes)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId, cancellationToken);

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

            // Yours. Nothing in the request says so and nothing should: whose pass this is comes
            // from the session, never from the body.
            UserId = user.Id,

            Status = request.Status,
            Rating = request.Rating,
            Platform = request.Platform,
            StartedAt = request.StartedAt,
            CompletedAt = request.CompletedAt,
            HoursPlayed = request.HoursPlayed,
            SeasonNumber = request.SeasonNumber,
            EpisodeNumber = request.EpisodeNumber,

            // Server-stamped, never taken from the request: this records that the entry was
            // written, which is not something a caller is in a position to assert.
            LoggedAt = clock.Now,

            // Top of its column, so a title you just added is the first thing you see rather
            // than something you have to scroll for.
            Position = await BoardPositions.TopOfColumnAsync(
                db, request.Status, user.Id, cancellationToken),
        };

        db.LogEntries.Add(entry);
        await db.SaveChangesAsync(cancellationToken);

        // Adding a title to the board is the one gesture that should fetch its metadata without
        // anybody running a maintenance route — here and in LibraryService.AddToBoardAsync, and
        // not on a move, because the entries a drag out of Completed inserts are for a title that
        // has already been asked about.
        //
        // Announced rather than acted on: what there is to fetch differs per hobby, and this
        // service has no business knowing which. See IMediaAdded.
        await mediaAdded.AnnounceAsync(media, logger, cancellationToken);

        return LogEntryDto.From(entry);
    }

    public async Task<LogEntryDto?> UpdateAsync(
        int id, UpdateLogEntryRequest request, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        var entry = await db.LogEntries
            .Include(e => e.Media)
            .Include(e => e.Notes)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId, cancellationToken);

        if (entry is null)
        {
            return null;
        }

        // Full replacement, so every field is assigned including the ones the caller omitted.
        // That is the contract PUT buys: absent means cleared, with none of PATCH's ambiguity
        // between "unset this" and "leave it alone".
        entry.Status = request.Status;
        entry.Rating = request.Rating;
        entry.Platform = request.Platform;
        entry.StartedAt = request.StartedAt;
        entry.CompletedAt = request.CompletedAt;
        entry.HoursPlayed = request.HoursPlayed;
        entry.SeasonNumber = request.SeasonNumber;
        entry.EpisodeNumber = request.EpisodeNumber;

        await db.SaveChangesAsync(cancellationToken);

        return LogEntryDto.From(entry);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        // With its notes, because they are not deleted with it while another pass stays.
        var pass = await db.LogEntries
            .Include(e => e.Notes)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId, cancellationToken);
        if (pass is null)
        {
            return false;
        }

        // The pass that keeps them: the one the board shows, of the passes that stay. Yours, of
        // this title, ordered as every place that picks a title's current pass orders it — see
        // "Library is not the catalog" in docs/board.md — so the notes land on the pass the drawer
        // shows first. Deleting the current pass itself hands them to the next one, which is about
        // to become current.
        //
        // Both halves of the scope matter. Without the user, somebody else's pass of the same game
        // could be the one that stays, and your notes would be written into their journal; without
        // the title, a pass of yours on another one could.
        var heir = await db.LogEntries
            .Where(entry =>
                entry.UserId == userId && entry.MediaId == pass.MediaId && entry.Id != pass.Id)
            .OrderByDescending(entry => entry.LoggedAt)
            .ThenByDescending(entry => entry.Id)
            .Select(entry => (int?)entry.Id)
            .FirstOrDefaultAsync(cancellationToken);

        // They used to go with it, by the cascade on notes, and the confirm never said so: that is
        // how nine notes went the morning a mistaken finish was tidied up, and why this moves them
        // first. Their dates stay where they are, because a note's date is when it was written.
        //
        // With no pass left, they still go. The title leaves the board with its only pass, as it
        // does with Remove from board, and the drawer says so first.
        if (heir is { } heirId)
        {
            foreach (var note in pass.Notes)
            {
                note.LogEntryId = heirId;
            }
        }

        // One save, so the move and the delete are one write: a delete that fails leaves the notes
        // on this pass. Re-pointing them before the pass is removed is enough. Remove cascades
        // only to the notes still pointing at it, and the save sends the moves ahead of the delete
        // in one command, measured on 9 October 2026.
        //
        // The media row stays in the catalog — un-logging something is not the same as forgetting
        // it exists.
        db.LogEntries.Remove(pass);
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }
}
