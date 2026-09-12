using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

[ApiController]
[Authorize]
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
            hobby,
            status,
            year,
            sort ?? LibrarySort.Manual,
            LibraryPartition.Default,
            page,
            pageSize,
            cancellationToken));
    }

    /// <summary>
    /// The release calendar under the board: your Backlog entries whose title is not out yet,
    /// soonest first with the ones nobody has announced a date for last.
    ///
    /// <para>
    /// A route of its own rather than a flag on <see cref="List"/>, for three reasons. The
    /// ordering is not something the per-column sort control could ever offer, so a sixth
    /// <see cref="LibrarySort"/> would be a value the board has to hide. A flag makes nonsense
    /// expressible — <c>?status=Completed&amp;upcoming=true</c> is a question with no meaning
    /// that the controller would then have to refuse. And the board's column cache key stays the
    /// shape it is, rather than growing a dimension that four columns carry and none uses.
    /// </para>
    ///
    /// Not paged. A person's list of things they are waiting for is tens, so the client shows
    /// the first twenty and reveals the rest from this same response.
    /// </summary>
    [HttpGet("upcoming")]
    [ProducesResponseType<IReadOnlyList<LibraryItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<LibraryItemDto>>> Upcoming(
        [FromQuery] string? hobby, CancellationToken cancellationToken)
    {
        if (await RejectUnknownHobbyAsync(hobby, cancellationToken) is { } problem)
        {
            return problem;
        }

        return Ok(await library.UpcomingAsync(hobby, cancellationToken));
    }

    /// <summary>Years with any activity, newest first, for the board's year picker.</summary>
    [HttpGet("years")]
    [ProducesResponseType<IReadOnlyList<int>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<int>>> Years(
        [FromQuery] string? hobby, CancellationToken cancellationToken)
    {
        if (await RejectUnknownHobbyAsync(hobby, cancellationToken) is { } problem)
        {
            return problem;
        }

        return Ok(await library.ActivityYearsAsync(hobby, cancellationToken));
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
    /// Takes a title off your board — what <em>Remove from board</em> in a card's menu does.
    ///
    /// Every pass of yours against it, notes and all. Removing is not dropping: Dropped records
    /// a game you started and gave up on, and is a column rather than an ending.
    ///
    /// This replaced a <c>DELETE .../current</c> that took the newest pass only. That put a
    /// title replayed five times five presses away from leaving the board, and made each press
    /// look like a failure, since the card came back in whichever column the pass underneath sat
    /// in. Deleting one named pass is still possible and is the drawer's, through
    /// <c>DELETE /api/log-entries/{id}</c>.
    /// </summary>
    [HttpDelete("{mediaId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveFromBoard(
        int mediaId, CancellationToken cancellationToken)
    {
        var removed = await library.RemoveFromBoardAsync(mediaId, cancellationToken);
        return removed ? NoContent() : NotFound();
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
