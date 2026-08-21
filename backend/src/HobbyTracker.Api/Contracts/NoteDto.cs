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
    string Body,

    /// <summary>When it was written. Server-stamped; see <see cref="Note.WrittenAt"/>.</summary>
    DateTimeOffset WrittenAt)
{
    public static NoteDto From(Note note) => new(note.Id, note.LogEntryId, note.Body, note.WrittenAt);
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
