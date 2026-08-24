using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

/// <summary>
/// A note is addressed two ways: under its pass while it is being written, because that is the
/// only moment the parent is needed, and by its own id ever after. Hence one controller with a
/// route per action rather than a shared prefix.
///
/// There is no list route. Notes come back with their entry on <see cref="LogEntryDto"/>, so a
/// second request would be asking for something the client already has.
/// </summary>
[ApiController]
[Authorize]
[Route("api")]
public class NotesController(INoteService notes) : ControllerBase
{
    [HttpGet("notes/{id:int}", Name = nameof(GetNote))]
    [ProducesResponseType<NoteDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NoteDto>> GetNote(int id, CancellationToken cancellationToken)
    {
        var note = await notes.GetAsync(id, cancellationToken);
        return note is null ? NotFound() : Ok(note);
    }

    /// <summary>
    /// Writes a note against a pass. Several notes per pass is the point — this is an append,
    /// never an overwrite.
    /// </summary>
    [HttpPost("log-entries/{entryId:int}/notes")]
    [ProducesResponseType<NoteDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NoteDto>> Write(
        int entryId, NoteRequest request, CancellationToken cancellationToken)
    {
        var created = await notes.CreateAsync(entryId, request, cancellationToken);

        // A 404, unlike POST /api/log-entries with an unknown mediaId: there the missing thing
        // is a field in the body, here it is the resource the route names.
        return created is null
            ? NotFound()
            : CreatedAtRoute(nameof(GetNote), new { id = created.Id }, created);
    }

    /// <summary>
    /// Rewrites a note's body. Its date does not move — that is when you wrote it, not when you
    /// last corrected it.
    /// </summary>
    [HttpPut("notes/{id:int}")]
    [ProducesResponseType<NoteDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NoteDto>> Rewrite(
        int id, NoteRequest request, CancellationToken cancellationToken)
    {
        var updated = await notes.UpdateAsync(id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("notes/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) =>
        await notes.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
}
