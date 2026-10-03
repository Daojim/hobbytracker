using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/stats")]
public class StatsController(IStatsService stats, ILibraryService library) : ControllerBase
{
    /// <summary>
    /// A year of one hobby for the Stats page: every finish in it, your hours against how long
    /// those take, what became of what you started, and your Backlog as it stands.
    /// </summary>
    /// <param name="hobby">Hobby slug, e.g. "games". Omit for every hobby.</param>
    /// <param name="year">
    /// Omit for every year. Bounded so the year has a span: year 0 has no first instant, and
    /// 9999's would end in a year a DateTime cannot hold — a 500 for a request that is merely odd.
    /// </param>
    [HttpGet]
    [ProducesResponseType<StatsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<StatsDto>> Get(
        [FromQuery] string? hobby,
        [FromQuery, Range(1, 9998)] int? year,
        CancellationToken cancellationToken)
    {
        if (await RejectUnknownHobbyAsync(hobby, cancellationToken) is { } problem)
        {
            return problem;
        }

        return Ok(await stats.GetAsync(hobby, year, cancellationToken));
    }

    /// <summary>
    /// The years there is something to show, newest first. Not the board's list: that one is its
    /// current passes', and a year whose only finish has since been replayed is missing from it.
    /// </summary>
    [HttpGet("years")]
    [ProducesResponseType<IReadOnlyList<int>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<int>>> Years(
        [FromQuery] string? hobby, CancellationToken cancellationToken)
    {
        if (await RejectUnknownHobbyAsync(hobby, cancellationToken) is { } problem)
        {
            return problem;
        }

        return Ok(await stats.YearsAsync(hobby, cancellationToken));
    }

    /// <summary>
    /// LibraryController's rule: an unknown hobby would otherwise answer with nothing, which
    /// reads like "you have logged nothing" rather than "that is not a hobby".
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
