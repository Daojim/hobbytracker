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

    /// <summary>
    /// Returns one stored game together with everything logged against it, so a detail page
    /// needs a single request rather than one per entry.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<GameDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GameDetailDto>> Get(int id, CancellationToken cancellationToken)
    {
        var game = await catalog.GetAsync(id, cancellationToken);
        return game is null ? NotFound() : Ok(game);
    }

    /// <summary>
    /// Re-fetches every IGDB-sourced title on your board and re-applies IGDB's metadata.
    ///
    /// A maintenance action rather than a feature, and deliberately without a button: media
    /// rows are only ever written by a search, so a field added to the schema stays null on
    /// the library you already have until something goes and asks. This is that something.
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType<RefreshResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<RefreshResult>> Refresh(CancellationToken cancellationToken)
    {
        var refreshed = await catalog.RefreshLibraryAsync(cancellationToken);
        return Ok(new RefreshResult(refreshed));
    }

    /// <summary>
    /// Chooses which genre stands for a game on the board, or clears the choice with a null.
    ///
    /// A property of the title, not of a pass: what kind of game something is does not change
    /// between playthroughs the way the platform you played it on does. Any string is accepted,
    /// not only one of the game's own genres — see <see cref="SetGenreRequest"/>.
    /// </summary>
    [HttpPut("{mediaId:int}/genre")]
    [ProducesResponseType<GameDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GameDetailDto>> SetGenre(
        int mediaId, SetGenreRequest request, CancellationToken cancellationToken)
    {
        var game = await catalog.SetPrimaryGenreAsync(
            mediaId, request.Genre, cancellationToken);

        return game is null ? NotFound() : Ok(game);
    }
}
