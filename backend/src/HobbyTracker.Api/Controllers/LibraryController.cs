using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

[ApiController]
[Route("api/library")]
public class LibraryController(ILibraryService library) : ControllerBase
{
    /// <summary>
    /// Titles you have logged something against, with the status of their most recent entry.
    ///
    /// Not the same as everything in the catalog: searching IGDB stores its results as a side
    /// effect, so most of `media` is metadata for titles nobody ever recorded anything about.
    ///
    /// The board fetches one column per request, which is how "the year picker narrows only
    /// Completed" falls out — only that column's request carries a year.
    /// </summary>
    /// <param name="hobby">Hobby slug, e.g. "games". Omit for everything.</param>
    /// <param name="status">Filters on the current status, not on any past status.</param>
    /// <param name="year">Year a title was finished. Really only meaningful with Completed.</param>
    /// <param name="sort">Defaults to the user's manual ranking.</param>
    [HttpGet]
    [ProducesResponseType<PagedResult<LibraryItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<LibraryItemDto>>> List(
        [FromQuery] string? hobby,
        [FromQuery] LogStatus? status,
        [FromQuery] int? year,
        [FromQuery] LibrarySort? sort,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken cancellationToken)
    {
        if (await RejectUnknownHobbyAsync(hobby, cancellationToken) is { } problem)
        {
            return problem;
        }

        return Ok(await library.ListAsync(
            hobby, status, year, sort ?? LibrarySort.Manual, page, pageSize, cancellationToken));
    }

    /// <summary>Years with completions, newest first, for the board's year picker.</summary>
    [HttpGet("years")]
    [ProducesResponseType<IReadOnlyList<int>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<int>>> Years(
        [FromQuery] string? hobby, CancellationToken cancellationToken)
    {
        if (await RejectUnknownHobbyAsync(hobby, cancellationToken) is { } problem)
        {
            return problem;
        }

        return Ok(await library.CompletionYearsAsync(hobby, cancellationToken));
    }

    /// <summary>
    /// Moves a title to a board column — what dragging a card does.
    ///
    /// The caller names only the target column. Whether that edits the current entry or starts
    /// a new one, and which dates get filled in, is decided server-side, so the board never has
    /// to know which entry is current.
    /// </summary>
    [HttpPost("{mediaId:int}/status")]
    [ProducesResponseType<LibraryItemDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LibraryItemDto>> Transition(
        int mediaId, StatusTransitionRequest request, CancellationToken cancellationToken)
    {
        var item = await library.TransitionAsync(mediaId, request.Status, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>
    /// Stores the manual ranking of one column, top first.
    ///
    /// Titles that have since moved out of the column are ignored rather than rejected — a
    /// board loaded a moment ago can legitimately be one drag out of date.
    /// </summary>
    [HttpPut("order")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Reorder(
        ReorderRequest request, CancellationToken cancellationToken)
    {
        if (await RejectUnknownHobbyAsync(request.Hobby, cancellationToken) is { } problem)
        {
            return problem;
        }

        await library.ReorderAsync(request, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// An unknown hobby would otherwise return an empty page, which reads like "you have logged
    /// nothing" rather than "that is not a hobby".
    /// </summary>
    private async Task<ActionResult?> RejectUnknownHobbyAsync(
        string? hobby, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(hobby)
            || await library.HobbyExistsAsync(hobby, cancellationToken))
        {
            return null;
        }

        ModelState.AddModelError(nameof(hobby), $"Unknown hobby '{hobby}'.");
        return ValidationProblem(ModelState);
    }
}
