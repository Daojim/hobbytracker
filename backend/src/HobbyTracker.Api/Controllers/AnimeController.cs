using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

/// <summary>
/// Anime, as <c>TvController</c> is shows.
///
/// <b>The route is <c>api/anime</c> and that is not a free choice.</b> It has to be the hobby's
/// own slug: the e2e helper reaches a catalogue as <c>/api/${hobby}</c>, so anything else would
/// work everywhere except the test harness, where it would fail as a 404 that reads like a stub
/// problem rather than a naming one.
///
/// <c>[Authorize]</c> for the reason the other three carry it: the catalogue is shared but not
/// public, and an anonymous search is free MAL traffic plus an unbounded write into
/// <c>media</c>.
///
/// No pin and no <c>hltb</c> route, as for films and shows. HowLongToBeat needs one because its
/// matcher refuses rather than guesses; MAL answers by id, and the id came from MAL's own search.
/// </summary>
[ApiController]
[Authorize]
[Route("api/anime")]
public class AnimeController(IAnimeCatalogService catalog) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<AnimeDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<IReadOnlyList<AnimeDto>>> Search(
        [FromQuery] string? search,
        [FromQuery][Range(1, 100)] int? limit,
        CancellationToken cancellationToken)
    {
        // Guarded here rather than upstream: a blank term is the caller's mistake, and asking
        // MAL about nothing spends a request to find that out.
        if (string.IsNullOrWhiteSpace(search))
        {
            ModelState.AddModelError(nameof(search), "A non-empty title is required.");
            return ValidationProblem(ModelState);
        }

        return Ok(await catalog.SearchAsync(search.Trim(), limit, cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<AnimeDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AnimeDetailDto>> Get(int id, CancellationToken cancellationToken)
    {
        var anime = await catalog.GetAsync(id, cancellationToken);
        return anime is null ? NotFound() : Ok(anime);
    }

    /// <summary>
    /// Re-fetches every MAL title on somebody's board. Maintenance; no UI, exactly as the other
    /// three refresh routes have none — which has now caught people twice, because <c>media</c>
    /// rows are only ever written by a search and a column added by a migration stays empty
    /// until something asks.
    ///
    /// <b>It exists for that and only that.</b> Films and shows also need their refresh to
    /// recover a title whose enrichment failed on add; anime has no enrichment step, because a
    /// MAL search already answers with everything a detail call would.
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
    [ProducesResponseType<AnimeDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AnimeDetailDto>> SetGenre(
        int mediaId, SetAnimeGenreRequest request, CancellationToken cancellationToken)
    {
        var anime = await catalog.SetPrimaryGenreAsync(mediaId, request.Genre, cancellationToken);
        return anime is null ? NotFound() : Ok(anime);
    }
}
