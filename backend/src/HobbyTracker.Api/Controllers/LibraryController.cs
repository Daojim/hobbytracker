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
    /// </summary>
    /// <param name="hobby">Hobby slug, e.g. "games". Omit for everything.</param>
    /// <param name="status">Filters on the current status, not on any past status.</param>
    [HttpGet]
    [ProducesResponseType<PagedResult<LibraryItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<LibraryItemDto>>> List(
        [FromQuery] string? hobby,
        [FromQuery] LogStatus? status,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken cancellationToken)
    {
        // An unknown hobby would otherwise return an empty page, which reads like "you have
        // logged nothing" rather than "that is not a hobby".
        if (!string.IsNullOrWhiteSpace(hobby)
            && !await library.HobbyExistsAsync(hobby, cancellationToken))
        {
            ModelState.AddModelError(nameof(hobby), $"Unknown hobby '{hobby}'.");
            return ValidationProblem(ModelState);
        }

        return Ok(await library.ListAsync(hobby, status, page, pageSize, cancellationToken));
    }
}
