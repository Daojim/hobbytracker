using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

[ApiController]
[Route("api/games")]
public class GamesController(IGameCatalogService catalog) : ControllerBase
{
    /// <summary>
    /// Searches IGDB by title, stores what comes back in media + games, and returns the
    /// stored rows in IGDB's relevance order.
    /// </summary>
    /// <param name="search">Title to search for. Required.</param>
    /// <param name="limit">Results to request from IGDB. Defaults to the configured limit.</param>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<GameDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<IReadOnlyList<GameDto>>> Search(
        [FromQuery] string? search,
        [FromQuery] [Range(1, 500)] int? limit,
        CancellationToken cancellationToken)
    {
        // Guard here rather than letting an empty term through: APIcalypse accepts
        // `search "";` and answers with an unrelated slice of the catalogue, which would
        // then be written to the database as though the user had asked for it.
        if (string.IsNullOrWhiteSpace(search))
        {
            ModelState.AddModelError(nameof(search), "A non-empty title is required.");
            return ValidationProblem(ModelState);
        }

        var games = await catalog.SearchAsync(search.Trim(), limit, cancellationToken);
        return Ok(games);
    }
}
