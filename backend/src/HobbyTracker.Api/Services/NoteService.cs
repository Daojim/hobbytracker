using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Services;

/// <summary>
/// How a write of a note with pictures went. Everything but the first two is a refusal, and each
/// is a rule of its own, so the controller can say which one a request broke.
/// </summary>
public enum NoteWriteOutcome
{
    Written,

    /// <summary>No such pass or note, or not yours, which is the same thing.</summary>
    NotFound,

    /// <summary>No words, and no picture written or kept.</summary>
    Empty,

    /// <summary>More than <see cref="NoteService.MaxPictures"/>, counting the ones kept.</summary>
    TooManyPictures,

    /// <summary>A picture whose bytes are not a JPEG, PNG or WebP, whatever it said it was.</summary>
    NotAPicture,

    /// <summary>A picture over <see cref="NoteService.PictureMaxBytes"/>.</summary>
    PictureTooBig,

    /// <summary>Not one thumbnail to each picture.</summary>
    ThumbnailMissing,

    /// <summary>A thumbnail whose bytes are not a JPEG, PNG or WebP.</summary>
    ThumbnailNotAPicture,

    /// <summary>A thumbnail over <see cref="NoteService.ThumbnailMaxBytes"/>.</summary>
    ThumbnailTooBig,

    /// <summary>Asked to keep a picture this note does not hold.</summary>
    NotInThisNote,

    /// <summary>
    /// The account would hold more than <see cref="NoteService.AccountMaxBytes"/> of pictures,
    /// and it is not the admin's.
    /// </summary>
    AccountFull,
}

public interface INoteService
{
    /// <summary>Returns null when the note does not exist.</summary>
    Task<NoteDto?> GetAsync(int id, CancellationToken cancellationToken);

    /// <summary>Returns null when the pass being written about does not exist.</summary>
    Task<NoteDto?> CreateAsync(int entryId, NoteRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Writes a note with its pictures, all of it in one save or none of it. The note is set
    /// when the outcome is <see cref="NoteWriteOutcome.Written"/>.
    /// </summary>
    Task<(NoteWriteOutcome Outcome, NoteDto? Note)> CreateAsync(
        int entryId, NoteForm form, CancellationToken cancellationToken);

    /// <summary>
    /// Rewrites the words, and leaves the pictures as they are. Returns null when the note does
    /// not exist.
    /// </summary>
    Task<NoteDto?> UpdateAsync(int id, NoteRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Rewrites the words and the pictures: the ones the form keeps stay, the rest go, and the new
    /// ones go after them. In one save, or not at all.
    /// </summary>
    Task<(NoteWriteOutcome Outcome, NoteDto? Note)> UpdateAsync(
        int id, NoteForm form, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken);

    /// <summary>A picture's bytes, or null when it does not exist or is not yours.</summary>
    Task<PictureFile?> PictureAsync(int id, CancellationToken cancellationToken);

    /// <summary>A picture's thumbnail, or null when it does not exist or is not yours.</summary>
    Task<PictureFile?> ThumbnailAsync(int id, CancellationToken cancellationToken);

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

    /// <summary>
    /// The most pictures a note holds, the admin's included. The words the box says when a fifth
    /// is added spell it out, as <i>four</i>.
    /// </summary>
    public const int MaxPictures = 4;

    /// <summary>
    /// The largest picture taken. The browser shrinks every picture to a long edge of 1920px at
    /// WebP 85 before it is sent, which measured 40–90 KB for the user's own, so this is room for
    /// a picture that came out large rather than a size anything aims at.
    /// </summary>
    public const int PictureMaxBytes = 2 * 1024 * 1024;

    /// <summary>
    /// The largest thumbnail taken. About 96px tall and a few kilobytes, made when its picture
    /// is sent. One the size of its picture would put the picture back on the board, which is
    /// what the thumbnail is there to keep off it.
    /// </summary>
    public const int ThumbnailMaxBytes = 64 * 1024;

    /// <summary>
    /// The most an account keeps in pictures, thumbnails included: 1 GB, the user's choice at
    /// pickup. Not the admin's, which has no cap; see <see cref="User.AdminRole"/>. Sign-up is
    /// open, and this is the first thing a stranger's account could use to fill the server's
    /// disk, and every nightly dump with it.
    /// </summary>
    public const long AccountMaxBytes = 1L << 30;

    /// <summary>
    /// The largest request either form write reads: four pictures at the most a picture may be,
    /// with their thumbnails, and room for the words and the form around them. Past it the route
    /// refuses the request as it arrives, rather than holding all of it and then refusing.
    /// </summary>
    public const long RequestMaxBytes = MaxPictures * (PictureMaxBytes + ThumbnailMaxBytes) + 64 * 1024;

    public async Task<NoteDto?> GetAsync(int id, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        var note = await db.Notes
            .AsNoTracking()
            .Include(n => n.Pictures)
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

    public async Task<(NoteWriteOutcome Outcome, NoteDto? Note)> CreateAsync(
        int entryId, NoteForm form, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        // A 404 for somebody else's pass, as the JSON write has it, and before any picture is
        // read: nothing about a request for a pass that is not yours is worth looking at.
        var exists = await db.LogEntries.AnyAsync(
            entry => entry.Id == entryId && entry.UserId == userId, cancellationToken);
        if (!exists)
        {
            return (NoteWriteOutcome.NotFound, null);
        }

        var note = new Note
        {
            LogEntryId = entryId,
            Body = string.Empty,

            // Server-stamped, never taken from the request, for the same reason as logged_at.
            WrittenAt = clock.Now,
        };

        var outcome = await WriteAsync(note, form, cancellationToken);
        if (outcome is not NoteWriteOutcome.Written)
        {
            return (outcome, null);
        }

        db.Notes.Add(note);
        await db.SaveChangesAsync(cancellationToken);

        return (outcome, NoteDto.From(note));
    }

    public async Task<NoteDto?> UpdateAsync(
        int id, NoteRequest request, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        // With its pictures, which this leaves alone and the answer still carries.
        var note = await db.Notes
            .Include(n => n.Pictures)
            .FirstOrDefaultAsync(n => n.Id == id && n.LogEntry!.UserId == userId, cancellationToken);

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

    public async Task<(NoteWriteOutcome Outcome, NoteDto? Note)> UpdateAsync(
        int id, NoteForm form, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        var note = await db.Notes
            .Include(n => n.Pictures)
            .FirstOrDefaultAsync(n => n.Id == id && n.LogEntry!.UserId == userId, cancellationToken);

        if (note is null)
        {
            return (NoteWriteOutcome.NotFound, null);
        }

        // WrittenAt stays where it was, as it does for a rewrite of the words alone.
        var outcome = await WriteAsync(note, form, cancellationToken);
        if (outcome is not NoteWriteOutcome.Written)
        {
            return (outcome, null);
        }

        await db.SaveChangesAsync(cancellationToken);

        return (outcome, NoteDto.From(note));
    }

    /// <summary>
    /// Checks a form against every rule and, if it keeps them all, puts its words and pictures
    /// on <paramref name="note"/> for the caller's save. A note being made has no pictures yet,
    /// so writing one is a rewrite that keeps nothing. Refused, the note is left as it was.
    ///
    /// <para>
    /// The cheap rules go first, and the bytes are read only once the counts and sizes say they
    /// are worth reading. The cap goes last, because it is the one that asks the database.
    /// </para>
    /// </summary>
    private async Task<NoteWriteOutcome> WriteAsync(
        Note note, NoteForm form, CancellationToken cancellationToken)
    {
        var body = (form.Body ?? string.Empty).Trim();
        var keep = form.Keep ?? [];
        var pictures = form.Pictures ?? [];
        var thumbnails = form.Thumbnails ?? [];

        // A picture is kept by the note it is in, never brought from another: this is the one
        // place a request names a stored picture, so it is the one place a picture could be
        // carried out of somebody else's journal.
        if (keep.Any(id => note.Pictures.All(picture => picture.Id != id)))
        {
            return NoteWriteOutcome.NotInThisNote;
        }

        var kept = note.Pictures.Where(picture => keep.Contains(picture.Id)).ToList();
        var leaving = note.Pictures.Except(kept).ToList();

        // Words, a picture, or both: the rule the JSON write keeps for words alone, here because
        // whether no words is empty depends on the pictures the note keeps.
        if (body.Length == 0 && kept.Count + pictures.Count == 0)
        {
            return NoteWriteOutcome.Empty;
        }

        if (kept.Count + pictures.Count > MaxPictures)
        {
            return NoteWriteOutcome.TooManyPictures;
        }

        if (thumbnails.Count != pictures.Count)
        {
            return NoteWriteOutcome.ThumbnailMissing;
        }

        if (pictures.Any(file => file.Length > PictureMaxBytes))
        {
            return NoteWriteOutcome.PictureTooBig;
        }

        if (thumbnails.Any(file => file.Length > ThumbnailMaxBytes))
        {
            return NoteWriteOutcome.ThumbnailTooBig;
        }

        var arriving = new List<(byte[] Bytes, PictureFacts Facts, byte[] Thumbnail, PictureFacts ThumbnailFacts)>();
        for (var i = 0; i < pictures.Count; i++)
        {
            var bytes = await ReadAllAsync(pictures[i], cancellationToken);
            if (PictureFormat.Read(bytes) is not { } facts)
            {
                return NoteWriteOutcome.NotAPicture;
            }

            var thumbnail = await ReadAllAsync(thumbnails[i], cancellationToken);
            if (PictureFormat.Read(thumbnail) is not { } thumbnailFacts)
            {
                return NoteWriteOutcome.ThumbnailNotAPicture;
            }

            arriving.Add((bytes, facts, thumbnail, thumbnailFacts));
        }

        var adding = arriving.Sum(picture => (long)picture.Bytes.Length + picture.Thumbnail.Length);
        if (adding > 0 && !await HasRoomAsync(adding - leaving.Sum(p => (long)p.ByteCount), cancellationToken))
        {
            return NoteWriteOutcome.AccountFull;
        }

        note.Body = body;

        // The ones not kept go, and their bytes with them, by the cascade.
        foreach (var picture in leaving)
        {
            note.Pictures.Remove(picture);
            db.NotePictures.Remove(picture);
        }

        // After the ones kept, which often puts a new picture in the very place one is leaving.
        // The unique index on a note's places would refuse that if the insert went first, and it
        // does not: EF Core sends a delete ahead of an insert that takes the place it frees.
        // Measured on 30 October 2026, by putting the new ones after every place the note had
        // used instead and finding nothing for a test to tell apart. The swap's own test,
        // A_rewrite_that_swaps_pictures_puts_none_where_another_is_leaving, is what would say if
        // that ever changed: it would go red with a 500.
        var position = kept.Select(p => p.Position).DefaultIfEmpty(-1).Max() + 1;
        foreach (var (bytes, facts, thumbnail, thumbnailFacts) in arriving)
        {
            var picture = new NotePicture
            {
                Note = note,
                Position = position++,
                ContentType = facts.ContentType,
                Width = facts.Width,
                Height = facts.Height,
                ByteCount = bytes.Length + thumbnail.Length,
            };

            note.Pictures.Add(picture);
            db.NotePictureBytes.Add(new NotePictureBytes
            {
                Picture = picture,
                Bytes = bytes,
                Thumbnail = thumbnail,
                ThumbnailType = thumbnailFacts.ContentType,
            });
        }

        return NoteWriteOutcome.Written;
    }

    /// <summary>
    /// Whether the account can take <paramref name="change"/> more bytes of pictures, which is
    /// negative when a rewrite takes out more than it adds. The admin's account always can.
    /// </summary>
    private async Task<bool> HasRoomAsync(long change, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        var role = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.Role)
            .SingleAsync(cancellationToken);
        if (role == User.AdminRole)
        {
            return true;
        }

        // By the size each picture recorded, through the note and its pass as every read of a
        // note goes, so the bytes themselves are never read to count them.
        var kept = await db.NotePictures
            .Where(picture => picture.Note!.LogEntry!.UserId == userId)
            .SumAsync(picture => (long)picture.ByteCount, cancellationToken);

        return kept + change <= AccountMaxBytes;
    }

    private static async Task<byte[]> ReadAllAsync(IFormFile file, CancellationToken cancellationToken)
    {
        var bytes = new byte[file.Length];
        await using var stream = file.OpenReadStream();
        await stream.ReadExactlyAsync(bytes, cancellationToken);
        return bytes;
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

    // The two reads of a picture's bytes, and the only two. Each selects the one column it
    // answers with, so the thumbnail route never brings the picture out with it. Scoped through
    // the note and its pass, as every read of a note is: a picture id is a number anybody can
    // count up to, and somebody else's is the same null as one that does not exist.

    public async Task<PictureFile?> PictureAsync(int id, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        return await db.NotePictureBytes
            .AsNoTracking()
            .Where(stored => stored.PictureId == id && stored.Picture!.Note!.LogEntry!.UserId == userId)
            .Select(stored => new PictureFile(stored.Bytes, stored.Picture!.ContentType))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<PictureFile?> ThumbnailAsync(int id, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        return await db.NotePictureBytes
            .AsNoTracking()
            .Where(stored => stored.PictureId == id && stored.Picture!.Note!.LogEntry!.UserId == userId)
            .Select(stored => new PictureFile(stored.Thumbnail, stored.ThumbnailType))
            .FirstOrDefaultAsync(cancellationToken);
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
