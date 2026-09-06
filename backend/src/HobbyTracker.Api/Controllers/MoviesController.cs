using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

/// <summary>
/// Films, as <c>GamesController</c> is games.
///
/// <c>[Authorize]</c> for that controller's reason exactly: the catalogue is shared but not
/// public, and an anonymous search is free TMDB traffic plus an unbounded write into
/// <c>media</c>. That puts the refresh route behind a session too, which is accepted rather than
/// worked around.
///
/// There is no pin here and no <c>hltb</c> route. HowLongToBeat needs one because its matcher
/// refuses rather than guesses and somebody has to be able to correct it; TMDB answers by id,
/// and the id came from TMDB's own search, so there is nothing to disagree about.
/// </summary>
[ApiController]
[Authorize]
[Route("api/movies")]
public class MoviesController(IMovieCatalogService catalog) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<MovieDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<IReadOnlyList<MovieDto>>> Search(
        [FromQuery] string? search,
        [FromQuery][Range(1, 20)] int? limit,
        CancellationToken cancellationToken)
    {
        // Guarded here rather than upstream: a blank term is the caller's mistake, and asking
        // TMDB about nothing spends a request to find that out. TMDB answers an empty `query`
        // with a 422, which is a worse way to learn the same thing.
        if (string.IsNullOrWhiteSpace(search))
        {
            ModelState.AddModelError(nameof(search), "A non-empty title is required.");
            return ValidationProblem(ModelState);
        }

        return Ok(await catalog.SearchAsync(search.Trim(), limit, cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<MovieDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MovieDetailDto>> Get(int id, CancellationToken cancellationToken)
    {
        var movie = await catalog.GetAsync(id, cancellationToken);
        return movie is null ? NotFound() : Ok(movie);
    }

    /// <summary>
    /// Re-fetches every TMDB title on somebody's board. Maintenance; no UI, exactly as
    /// <c>POST /api/games/refresh</c> has none.
    ///
    /// Synchronous and reporting what it changed, like IGDB's and unlike HowLongToBeat's — but
    /// for the opposite reason to IGDB's. IGDB answers 500 titles in one request; TMDB has no
    /// batch-by-id endpoint at all, so this is one request per film. It stays synchronous
    /// because it is fast per title rather than because it is few requests.
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType<RefreshResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<RefreshResult>> Refresh(CancellationToken cancellationToken)
    {
        var refreshed = await catalog.RefreshLibraryAsync(cancellationToken);
        return Ok(new RefreshResult(refreshed));
    }

    [HttpPut("{mediaId:int}/genre")]
    [ProducesResponseType<MovieDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MovieDetailDto>> SetGenre(
        int mediaId, SetMovieGenreRequest request, CancellationToken cancellationToken)
    {
        var movie = await catalog.SetPrimaryGenreAsync(mediaId, request.Genre, cancellationToken);
        return movie is null ? NotFound() : Ok(movie);
    }
}
