using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// One thing written down during a pass. Travels with its entry on <see cref="LogEntryDto"/>,
/// so a client reading a title's journal needs one request rather than one per pass.
/// </summary>
public sealed record NoteDto(
    int Id,
    int LogEntryId,

    /// <summary>The words. Empty, never null, on a note that is a picture alone.</summary>
    string Body,

    /// <summary>When it was written. Server-stamped; see <see cref="Note.WrittenAt"/>.</summary>
    DateTimeOffset WrittenAt,

    /// <summary>
    /// Its pictures in their order, each read on its own from <c>/api/note-pictures/{id}</c>.
    /// The bytes never travel with a note.
    /// </summary>
    IReadOnlyList<NotePictureDto> Pictures)
{
    /// <summary>
    /// The note as the client reads it. Its pictures have to have been loaded with it, as its
    /// notes have to be loaded with a pass: a note read without them maps to one with no
    /// pictures, silently.
    /// </summary>
    public static NoteDto From(Note note) => new(
        note.Id,
        note.LogEntryId,
        note.Body,
        note.WrittenAt,
        [.. note.Pictures.OrderBy(picture => picture.Position).Select(NotePictureDto.From)]);
}

/// <summary>
/// A picture's bytes and what they are, as the picture routes answer with them. The type is the
/// one read from the bytes when they were sent, never the one the request named.
/// </summary>
public sealed record PictureFile(byte[] Bytes, string ContentType);

/// <summary>
/// A picture in a note: which one, and its size, which the drawer draws it at before it has
/// arrived, so nothing below it moves when it does.
/// </summary>
public sealed record NotePictureDto(int Id, int Width, int Height)
{
    public static NotePictureDto From(NotePicture picture) =>
        new(picture.Id, picture.Width, picture.Height);
}

/// <summary>
/// Body for writing or rewriting a note. One record for both, because both carry the same single
/// thing — unlike the log-entry bodies, which differ by MediaId.
///
/// WrittenAt is deliberately absent. It records that something was written, which is not a
/// caller's to assert, and rewriting a note does not move it.
/// </summary>
// Validation attributes sit on the constructor parameters, not behind [property:]. MVC refuses
// the latter outright rather than silently skipping the rules.
public sealed record NoteRequest([Required][MaxLength(4000)] string Body) : IValidatableObject
{
    /// <summary>
    /// [Required] rejects null and "" but passes "   ", which would store a note that says
    /// nothing and cannot be told apart from a mis-click.
    /// </summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Body is not null && Body.Trim().Length == 0)
        {
            yield return new ValidationResult(
                "A note needs something in it.", [nameof(Body)]);
        }
    }
}

/// <summary>
/// Body for writing or rewriting a note with pictures, as <c>multipart/form-data</c>: the words,
/// the pictures in their order, a thumbnail for each in the same order, and, on a rewrite, which
/// of the pictures already in the note it keeps. A picture not kept is taken out.
///
/// <para>
/// Nothing here is checked by an attribute but the words' length, because whether a note with
/// no words is empty depends on the pictures it keeps, which only the service can see. So the
/// rules are <c>NoteService</c>'s, and each refusal still names its field.
/// </para>
///
/// <para>
/// No type or size is read off a file's own headers. The service reads both from the bytes.
/// </para>
/// </summary>
public sealed record NoteForm(
    [MaxLength(4000)] string? Body,
    IReadOnlyList<IFormFile>? Pictures,
    IReadOnlyList<IFormFile>? Thumbnails,

    /// <summary>
    /// Pictures already in the note to keep, by id. They keep the order they were in; new
    /// pictures go after them.
    /// </summary>
    IReadOnlyList<int>? Keep);
