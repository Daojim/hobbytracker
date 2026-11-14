using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/games")]
public class GamesController(
    IGameCatalogService catalog,
    IHltbService hltb,
    IGameReviewService reviews,
    IDiscoverHideService hides) : ControllerBase
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
    /// A page of one of the Discover page's lists: what IGDB would show somebody who has not typed
    /// anything, in the list's order. Stored exactly as search results are, so every title carries
    /// a media id a log entry can point at — and IGDB's answer is kept for hours rather than asked
    /// for per view.
    ///
    /// <para>
    /// From your ratings is made from the signed-in person's board, and is the one list that says
    /// how many of your titles it starts from and, for each title, which of yours point at it.
    /// </para>
    /// </summary>
    /// <param name="list">new-releases, popular-now, most-anticipated, most-played or from-your-ratings.</param>
    /// <param name="from">
    /// The place in the list to start at: 0, or nothing, for the first page, and the <c>next</c>
    /// the page before said for every one after it.
    /// </param>
    [HttpGet("discover/{list}")]
    [ProducesResponseType<DiscoverListPage<GameDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<DiscoverListPage<GameDto>>> Discover(
        string list,
        [FromQuery] [Range(0, int.MaxValue)] int? from,
        CancellationToken cancellationToken)
    {
        // A path that names no list names nothing, so a 404 rather than the 400 a bad parameter
        // gets — and IGDB is not asked about it.
        if (!DiscoverLists.TryParse(list, out var which))
        {
            return NotFound();
        }

        return Ok(await catalog.DiscoverAsync(which, from ?? 0, cancellationToken));
    }

    /// <summary>
    /// The games you hid from Discover, the newest hide first, each with its cover and its name:
    /// the list the Discover page's <i>1 hidden</i> opens.
    ///
    /// <para>
    /// A literal segment, so it is answered here rather than read as a list called "hidden" —
    /// routing ranks a literal above a parameter, whichever is declared first.
    /// </para>
    /// </summary>
    [HttpGet("discover/hidden")]
    [ProducesResponseType<IReadOnlyList<HiddenTitleDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<HiddenTitleDto>>> Hidden(CancellationToken cancellationToken) =>
        Ok(await hides.HiddenAsync(cancellationToken));

    /// <summary>
    /// Hides a game from every Discover list, for you, until you take it back (#23). That one
    /// entry: never its series, never its versions, and never out of a search, where somebody who
    /// typed a title asked for it.
    ///
    /// <para>
    /// <b>204</b> whether or not it was hidden already, because a second hide is the first and keeps
    /// its place in the list. <b>404</b> for a media id that is not a game.
    /// </para>
    /// </summary>
    [HttpPut("discover/hidden/{mediaId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Hide(int mediaId, CancellationToken cancellationToken) =>
        await hides.HideAsync(mediaId, cancellationToken) ? NoContent() : NotFound();

    /// <summary>
    /// Takes your hide of a game back: a hidden tile's <i>Undo</i>, and <i>Show again</i> in the
    /// list. <b>204</b> whether or not the game was hidden, because what was asked for is so either
    /// way, and a second press of Undo is not a mistake worth an error.
    /// </summary>
    [HttpDelete("discover/hidden/{mediaId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ShowAgain(int mediaId, CancellationToken cancellationToken)
    {
        await hides.ShowAgainAsync(mediaId, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Returns one stored game together with everything logged against it, so the journal drawer
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
    /// Maintenance, and deliberately without a button, exactly like POST /api/games/refresh. It
    /// also runs once a day by itself, in HltbBackfillWorker, so this is for not waiting until
    /// tomorrow: after a migration that clears hltb_checked_at, say.
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
    /// Asks HowLongToBeat about one title again, there and then — the journal's arrow.
    ///
    /// A game can be matched before it comes out, while HowLongToBeat lists it with no times,
    /// and nothing asks again unless something is pressed: release day is not an event, because
    /// the calendar is a view of Backlog. This runs the lookup the worker runs, a stored id
    /// fetched and no id searched for and matched, and answers with the title as the pin does.
    ///
    /// <para>
    /// <b>409</b> when HowLongToBeat no longer has the id the title holds. The figures it had are
    /// kept, as the worker keeps them, so a 200 would say the title had been checked while
    /// showing numbers nobody had. Naming the id is what the pin's 400 does, and pinning another
    /// one is how the conflict is resolved. <b>404</b> for a media id that is not a game, and
    /// <c>HltbExceptionHandler</c>'s <b>502</b> when the site cannot be read.
    /// </para>
    /// </summary>
    [HttpPost("{mediaId:int}/hltb/refresh")]
    [ProducesResponseType<GameDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<GameDetailDto>> RefreshHltbFor(
        int mediaId, CancellationToken cancellationToken)
    {
        var (outcome, game) = await hltb.RefreshAsync(mediaId, cancellationToken);

        switch (outcome)
        {
            case HltbLookupOutcome.NoSuchGame:
                return NotFound();

            case HltbLookupOutcome.NoSuchHltbId:
                return Problem(
                    statusCode: StatusCodes.Status409Conflict,
                    title: "No longer on HowLongToBeat",
                    detail: $"HowLongToBeat no longer has game {game!.HltbId}.");

            default:
                return Ok(game);
        }
    }

    /// <summary>
    /// What OpenCritic's critics and Steam's players say about a game, for the journal's two rows,
    /// and which page each was read from.
    ///
    /// <para>
    /// The first time a journal asks, this is what finds the two pages — Steam's from IGDB, and
    /// OpenCritic's from Wikidata by IGDB's slug — and keeps them on the game. What each says is
    /// kept a day under the provider's own id, never under whoever asked, because a score is the
    /// same for everybody.
    /// </para>
    ///
    /// <para>
    /// <b>Each half stands alone, so this is a 200 whoever is unhappy.</b> A provider that cannot be
    /// read takes its own verdict with it, and the row is its link alone, as OpenCritic's is with
    /// no key. <b>404</b> for a media id that is not a game.
    /// </para>
    /// </summary>
    [HttpGet("{mediaId:int}/reviews")]
    [ProducesResponseType<GameReviewsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GameReviewsDto>> Reviews(int mediaId, CancellationToken cancellationToken)
    {
        var answer = await reviews.ReviewsAsync(mediaId, cancellationToken);
        return answer is null ? NotFound() : Ok(answer);
    }

    /// <summary>
    /// Pins OpenCritic's number for a game by hand, or takes the pin back with a null — the
    /// journal's <em>OpenCritic ID</em> box.
    ///
    /// <para>
    /// The correction for a page Wikidata does not have, or has wrong. Checked against OpenCritic
    /// there and then when there is a key to ask with, because the point of typing a number is to
    /// learn whether it was right: one OpenCritic does not know is a <b>400</b> naming it, as a
    /// HowLongToBeat pin's is. Without a key it is kept as typed. A pin is never overwritten by a
    /// look, and taking it back sends the game to be looked for again.
    /// </para>
    ///
    /// <para><b>404</b> for a media id that is not a game, and <b>502</b> when OpenCritic cannot be read.</para>
    /// </summary>
    [HttpPut("{mediaId:int}/opencritic")]
    [ProducesResponseType<GameDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<GameDetailDto>> SetOpenCriticId(
        int mediaId, SetOpenCriticIdRequest request, CancellationToken cancellationToken)
    {
        switch (await reviews.PinOpenCriticAsync(mediaId, request.OpenCriticId, cancellationToken))
        {
            case OpenCriticPinOutcome.NoSuchGame:
                return NotFound();

            case OpenCriticPinOutcome.NoSuchOpenCriticId:
                ModelState.AddModelError(
                    nameof(request.OpenCriticId),
                    $"OpenCritic has no game {request.OpenCriticId}.");

                return ValidationProblem(ModelState);

            default:
                // The journal's own read, rather than one more copy of it: a title's passes are
                // ordered at ten call sites that must agree, and this adds none.
                return Ok(await catalog.GetAsync(mediaId, cancellationToken));
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
