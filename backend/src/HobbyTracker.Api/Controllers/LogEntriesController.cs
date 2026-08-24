using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/log-entries")]
public class LogEntriesController(ILogEntryService entries) : ControllerBase
{
    /// <summary>Lists journal entries, most recently recorded first.</summary>
    [HttpGet]
    [ProducesResponseType<PagedResult<LogEntryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<LogEntryDto>>> List(
        [FromQuery] int? mediaId,
        [FromQuery] LogStatus? status,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken cancellationToken) =>
        Ok(await entries.ListAsync(mediaId, status, page, pageSize, cancellationToken));

    [HttpGet("{id:int}", Name = nameof(GetLogEntry))]
    [ProducesResponseType<LogEntryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LogEntryDto>> GetLogEntry(int id, CancellationToken cancellationToken)
    {
        var entry = await entries.GetAsync(id, cancellationToken);
        return entry is null ? NotFound() : Ok(entry);
    }

    /// <summary>
    /// Records a pass through a title. Posting several entries for the same media id is
    /// expected — that is how replays are represented.
    /// </summary>
    [HttpPost]
    [ProducesResponseType<LogEntryDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<LogEntryDto>> Create(
        CreateLogEntryRequest request, CancellationToken cancellationToken)
    {
        var created = await entries.CreateAsync(request, cancellationToken);

        if (created is null)
        {
            // Not a 404: the missing thing is a field in the body, not the resource addressed.
            ModelState.AddModelError(
                nameof(request.MediaId), $"No media exists with id {request.MediaId}.");
            return ValidationProblem(ModelState);
        }

        return CreatedAtRoute(nameof(GetLogEntry), new { id = created.Id }, created);
    }

    /// <summary>
    /// Replaces an entry outright. Fields absent from the body are cleared, not preserved.
    /// MediaId is not replaceable — moving an entry to a different title is a delete and a
    /// create, not an edit.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<LogEntryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LogEntryDto>> Update(
        int id, UpdateLogEntryRequest request, CancellationToken cancellationToken)
    {
        var updated = await entries.UpdateAsync(id, request, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) =>
        await entries.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
}
