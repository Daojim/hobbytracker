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

    /// <summary>
    /// Your notes on one board with every word of <paramref name="query"/> in them, newest
    /// first and at most <see cref="NoteService.SearchCap"/>. The caller has checked that the
    /// query says something and that the board exists.
    /// </summary>
    Task<NoteSearchResult> SearchAsync(string hobby, string query, CancellationToken cancellationToken);
}

/// <summary>
/// What was written during a pass. Notes are read back with their entry — see
/// <see cref="LogEntryDto"/> — so there is no list endpoint here. The one read of its own is the
/// search, which finds notes across every title on a board.
///
/// Notes carry no user column of their own — they belong to whoever owns the pass they were
/// written during — so every query here reaches through LogEntry rather than filtering a column.
/// That is the whole reason a note id is enough on its own at the API: the route needs no entry
/// to address a note, but the query still has to ask whose entry it was written during.
/// </summary>
public sealed class NoteService(
    HobbyTrackerDbContext db, IJournalClock clock, ICurrentUser user) : INoteService
{
    /// <summary>
    /// How many notes a search answers with, the most recent. A search is narrowed by another
    /// word rather than paged: the board says these are the most recent and stops.
    /// </summary>
    public const int SearchCap = 50;

    /// <summary>
    /// The longest search taken. Every word is a clause in the query, so the length is what
    /// bounds how many clauses there can be. A sentence fits several times over.
    /// </summary>
    public const int SearchMaxLength = 200;

    /// <summary>The escape character the search's patterns are written with.</summary>
    private const string LikeEscape = @"\";

    public async Task<NoteDto?> GetAsync(int id, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        var note = await db.Notes
            .AsNoTracking()
            .FirstOrDefaultAsync(
                n => n.Id == id && n.LogEntry!.UserId == userId, cancellationToken);

        return note is null ? null : NoteDto.From(note);
    }

    public async Task<NoteDto?> CreateAsync(
        int entryId, NoteRequest request, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        // Checked rather than left to the insert: a bare foreign-key violation surfaces as a 500,
        // and here the missing thing is the resource in the route, so it is a 404. Somebody
        // else's pass is the same 404 as one that does not exist -- see UserScopingTests.
        var exists = await db.LogEntries.AnyAsync(
            entry => entry.Id == entryId && entry.UserId == userId, cancellationToken);
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
        var userId = user.Id;

        var note = await db.Notes.FirstOrDefaultAsync(
            n => n.Id == id && n.LogEntry!.UserId == userId, cancellationToken);

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
        var userId = user.Id;

        var note = await db.Notes.FirstOrDefaultAsync(
            n => n.Id == id && n.LogEntry!.UserId == userId, cancellationToken);

        if (note is null)
        {
            return false;
        }

        db.Notes.Remove(note);
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<NoteSearchResult> SearchAsync(
        string hobby, string query, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        // Yours, and this board's: a result opens this board's journal, which cannot open a film
        // from the games board.
        var notes = db.Notes
            .AsNoTracking()
            .Where(n => n.LogEntry!.UserId == userId && n.LogEntry.Media!.Hobby!.Name == hobby);

        // Every word, in any order: one ILIKE per word, all of which have to hold. ILIKE rather
        // than full-text search, because notes get written in Japanese and Korean — Postgres's
        // `english` configuration would mangle that text, and no configuration splits Japanese
        // into words. Each word is escaped, so a note that says 50% is found by "50%" and not by
        // everything with a 50 in it.
        foreach (var word in Words(query))
        {
            var pattern = $"%{EscapeLike(word)}%";
            notes = notes.Where(n => EF.Functions.ILike(n.Body, pattern, LikeEscape));
        }

        // Newest first, and one more than the cap, which is how the answer knows there were more
        // without counting every match. The id breaks a tie, as it does for a title's passes.
        var found = await notes
            .OrderByDescending(n => n.WrittenAt)
            .ThenByDescending(n => n.Id)
            .Take(SearchCap + 1)
            .Select(n => new NoteMatchDto(
                n.Id,
                n.LogEntryId,
                n.LogEntry!.MediaId,

                // The name a card leads with, and the second line under it, as both board
                // projections build them. A downcast in a terminal projection, which is the only
                // place one is safe; nothing above filters through it.
                (n.LogEntry.Media as Anime)!.EnglishTitle ?? n.LogEntry.Media!.Title,
                (n.LogEntry.Media as Anime)!.EnglishTitle == null ? null : n.LogEntry.Media!.Title,

                n.LogEntry.Media!.CoverUrl,
                n.Body,
                n.WrittenAt))
            .ToListAsync(cancellationToken);

        return new NoteSearchResult([.. found.Take(SearchCap)], found.Count > SearchCap);
    }

    /// <summary>
    /// The words of a search: whatever whitespace separates them, the ideographic space a
    /// Japanese keyboard types included, since <see cref="char.IsWhiteSpace(char)"/> counts it.
    /// </summary>
    private static string[] Words(string query) =>
        query.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);

    /// <summary>
    /// A word as the characters it is. ILIKE reads <c>%</c> as anything, <c>_</c> as any one
    /// character, and the escape character as "take the next one literally" — so the escape
    /// goes first, or the escapes added for the other two would be escaped in turn.
    /// </summary>
    private static string EscapeLike(string word) =>
        word.Replace(LikeEscape, LikeEscape + LikeEscape, StringComparison.Ordinal)
            .Replace("%", LikeEscape + "%", StringComparison.Ordinal)
            .Replace("_", LikeEscape + "_", StringComparison.Ordinal);
}
