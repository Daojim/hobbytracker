using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

[ApiController]
[Route("api/games")]
public class GamesController(IGameCatalogService catalog, IHltbService hltb) : ControllerBase
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
    /// Asks HowLongToBeat about every title on your board that has not been asked about lately.
    ///
    /// Answers 202 with a count of what was queued, not of what changed. HowLongToBeat is a
    /// website being read by a program, so requests to it are spaced out by seconds — a library
    /// of fifty titles is minutes of work, and holding an HTTP request open for that would be
    /// the wrong shape even if it worked. A background worker drains the queue; what it found is
    /// visible on the board afterwards.
    ///
    /// Maintenance, and deliberately without a button, exactly like POST /api/games/refresh.
    /// </summary>
    [HttpPost("hltb/refresh")]
    [ProducesResponseType<QueuedResult>(StatusCodes.Status202Accepted)]
    public async Task<ActionResult<QueuedResult>> RefreshHltb(CancellationToken cancellationToken)
    {
        var queued = await hltb.BackfillAsync(cancellationToken);
        return Accepted(new QueuedResult(queued));
    }

    /// <summary>
    /// Pins the HowLongToBeat entry for a title by hand, or clears the pin with a null.
    ///
    /// The correction for a matcher that deliberately writes nothing when it is unsure. Without
    /// somewhere to say "it is this one", a title HowLongToBeat files differently from IGDB —
    /// the paired Pokemon releases, say — would stay blank for good.
    ///
    /// Unlike the backfill this fetches there and then, because the whole point of typing an id
    /// is to find out whether it was the right one. An id HowLongToBeat does not know is a 400
    /// rather than a stored pin that quietly answers nothing.
    /// </summary>
    [HttpPut("{mediaId:int}/hltb")]
    [ProducesResponseType<GameDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<GameDetailDto>> SetHltbId(
        int mediaId, SetHltbIdRequest request, CancellationToken cancellationToken)
    {
        var (outcome, game) = await hltb.PinAsync(mediaId, request.HltbId, cancellationToken);

        switch (outcome)
        {
            case HltbPinOutcome.NoSuchGame:
                return NotFound();

            case HltbPinOutcome.NoSuchHltbId:
                ModelState.AddModelError(
                    nameof(request.HltbId),
                    $"HowLongToBeat has no game {request.HltbId}.");

                return ValidationProblem(ModelState);

            default:
                return Ok(game);
        }
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
