using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Services;

public interface INoteService
{
    /// <summary>Returns null when the note does not exist.</summary>
    Task<NoteDto?> GetAsync(int id, CancellationToken cancellationToken);

    /// <summary>Returns null when the pass being written about does not exist.</summary>
    Task<NoteDto?> CreateAsync(int entryId, NoteRequest request, CancellationToken cancellationToken);

    /// <summary>Returns null when the note does not exist.</summary>
    Task<NoteDto?> UpdateAsync(int id, NoteRequest request, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken);
}

/// <summary>
/// What was written during a pass. Notes are read back with their entry — see
/// <see cref="LogEntryDto"/> — so there is no list endpoint here; this is writes only.
/// </summary>
public sealed class NoteService(HobbyTrackerDbContext db, IJournalClock clock) : INoteService
{
    public async Task<NoteDto?> GetAsync(int id, CancellationToken cancellationToken)
    {
        var note = await db.Notes.AsNoTracking().FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
        return note is null ? null : NoteDto.From(note);
    }

    public async Task<NoteDto?> CreateAsync(
        int entryId, NoteRequest request, CancellationToken cancellationToken)
    {
        // Checked rather than left to the insert: a bare foreign-key violation surfaces as a 500,
        // and here the missing thing is the resource in the route, so it is a 404.
        var exists = await db.LogEntries.AnyAsync(entry => entry.Id == entryId, cancellationToken);
        if (!exists)
        {
            return null;
        }

        var note = new Note
        {
            LogEntryId = entryId,
            Body = request.Body.Trim(),

            // Server-stamped, never taken from the request, for the same reason as logged_at.
            WrittenAt = clock.Now,
        };

        db.Notes.Add(note);
        await db.SaveChangesAsync(cancellationToken);

        return NoteDto.From(note);
    }

    public async Task<NoteDto?> UpdateAsync(
        int id, NoteRequest request, CancellationToken cancellationToken)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
        if (note is null)
        {
            return null;
        }

        // The body, and nothing else. WrittenAt stays where it was: the date on a note is when
        // you wrote it, not when you last fixed a typo in it.
        note.Body = request.Body.Trim();
        await db.SaveChangesAsync(cancellationToken);

        return NoteDto.From(note);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
        if (note is null)
        {
            return false;
        }

        db.Notes.Remove(note);
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }
}
