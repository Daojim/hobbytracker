using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

/// <summary>
/// Shows, as <c>MoviesController</c> is films.
///
/// <b>The route is <c>api/tv</c> and that is not a free choice.</b> It has to be the hobby's own
/// slug: the e2e helper reaches a catalogue as <c>/api/${hobby}</c>, so <c>api/tv-shows</c> would
/// work everywhere except the test harness, where it would fail as a 404 that reads like a stub
/// problem rather than a naming one.
///
/// <c>[Authorize]</c> for the reason the other two carry it: the catalogue is shared but not
/// public, and an anonymous search is free TMDB traffic plus an unbounded write into
/// <c>media</c>.
///
/// No pin and no <c>hltb</c> route, as for films. HowLongToBeat needs one because its matcher
/// refuses rather than guesses; TMDB answers by id, and the id came from TMDB's own search.
/// </summary>
[ApiController]
[Authorize]
[Route("api/tv")]
public class TvController(ITvCatalogService catalog) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<TvShowDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<IReadOnlyList<TvShowDto>>> Search(
        [FromQuery] string? search,
        [FromQuery][Range(1, 20)] int? limit,
        CancellationToken cancellationToken)
    {
        // Guarded here rather than upstream: a blank term is the caller's mistake, and asking
        // TMDB about nothing spends a request to find that out.
        if (string.IsNullOrWhiteSpace(search))
        {
            ModelState.AddModelError(nameof(search), "A non-empty title is required.");
            return ValidationProblem(ModelState);
        }

        return Ok(await catalog.SearchAsync(search.Trim(), limit, cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<TvShowDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TvShowDetailDto>> Get(int id, CancellationToken cancellationToken)
    {
        var show = await catalog.GetAsync(id, cancellationToken);
        return show is null ? NotFound() : Ok(show);
    }

    /// <summary>
    /// Re-fetches every TMDB show on somebody's board. Maintenance; no UI, exactly as the other
    /// two refresh routes have none — which has now caught people twice, because <c>media</c>
    /// rows are only ever written by a search and a column added by a migration stays empty
    /// until something asks.
    ///
    /// One request per show, because TMDB has no batch-by-id endpoint. Synchronous because it is
    /// fast per title rather than because it is few requests.
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
    [ProducesResponseType<TvShowDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TvShowDetailDto>> SetGenre(
        int mediaId, SetTvGenreRequest request, CancellationToken cancellationToken)
    {
        var show = await catalog.SetPrimaryGenreAsync(mediaId, request.Genre, cancellationToken);
        return show is null ? NotFound() : Ok(show);
    }
}
