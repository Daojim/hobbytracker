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
/// second request would be asking for something the client already has. The search is the one
/// read across titles, which no entry carries.
/// </summary>
[ApiController]
[Authorize]
[Route("api")]
public class NotesController(INoteService notes, ILibraryService library) : ControllerBase
{
    /// <summary>
    /// Your notes on one board with every word of <paramref name="q"/> in them, in any order and
    /// any case, newest first and at most fifty. See <see cref="NoteSearchResult"/>.
    ///
    /// <c>notes/search</c> sits beside <c>notes/{id:int}</c> without meeting it, because the
    /// other's constraint takes digits only.
    /// </summary>
    /// <param name="q">What to look for. Whitespace separates the words, every one of which has to be in the note.</param>
    /// <param name="hobby">The board whose notes to search, by its slug. Required: a result opens that board's journal.</param>
    [HttpGet("notes/search")]
    [ProducesResponseType<NoteSearchResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<NoteSearchResult>> Search(
        [FromQuery] string? q, [FromQuery] string? hobby, CancellationToken cancellationToken)
    {
        // Blank as well as empty, although MVC's binder already hands a query of spaces over as
        // null (measured: with this weakened to IsNullOrEmpty, `q=%20%20%20` was still a 400).
        // The rule is said here rather than left to a binder setting, and the service would
        // answer a search with no words in it with every note on the board.
        if (string.IsNullOrWhiteSpace(q))
        {
            ModelState.AddModelError(nameof(q), "Say what to look for.");
        }
        else if (q.Length > NoteService.SearchMaxLength)
        {
            ModelState.AddModelError(
                nameof(q), $"A search is {NoteService.SearchMaxLength} characters at most.");
        }

        // Named and known. An unknown board would otherwise answer with no notes, which reads
        // as "you never wrote that" rather than "that is not a board".
        if (string.IsNullOrWhiteSpace(hobby))
        {
            ModelState.AddModelError(nameof(hobby), "Say which board's notes to search.");
        }
        else if (!await library.HobbyExistsAsync(hobby, cancellationToken))
        {
            ModelState.AddModelError(nameof(hobby), $"Unknown hobby '{hobby}'.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        return Ok(await notes.SearchAsync(hobby!, q!, cancellationToken));
    }

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
