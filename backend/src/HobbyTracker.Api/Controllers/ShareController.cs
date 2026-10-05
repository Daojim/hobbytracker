using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

/// <summary>
/// Your board's share link, from Settings: seeing it, making it, changing what it shows, and
/// stopping it.
///
/// <para>
/// <b>Addressed by the hobby, and never by an id</b>, because a board has one link and the link is
/// yours: every route here means the signed-in user's own, so there is no id a caller could aim at
/// somebody else's. What a visitor holding the link reads is <see cref="SharedController"/>, which
/// is a separate controller precisely so it cannot reach these.
/// </para>
/// </summary>
[ApiController]
[Authorize]
[Route("api/share")]
public sealed class ShareController(IShareService shares, ILibraryService library) : ControllerBase
{
    /// <summary>
    /// The board's link, or a literal null when it has none — the dialog's "No link yet", which is
    /// an answer rather than a failure. JsonResult for <c>/api/auth/me</c>'s reason: <c>Ok(null)</c>
    /// is a 204 with no body, which a caller then fails to parse as JSON.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<ShareDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Get(
        [FromQuery, Required] string? hobby, CancellationToken cancellationToken)
    {
        if (await RejectUnknownHobbyAsync(hobby!, cancellationToken) is { } problem)
        {
            return problem;
        }

        return new JsonResult(await shares.GetAsync(hobby!, cancellationToken));
    }

    /// <summary>
    /// Makes the board's link — what the dialog's <em>Make the link</em> does. Opening the dialog
    /// makes nothing; this is the one way a link comes to exist. <b>409</b> when the board has one
    /// already, which only a stale dialog can meet.
    /// </summary>
    [HttpPost]
    [ProducesResponseType<ShareDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Make(
        [FromQuery, Required] string? hobby, ShareRequest request, CancellationToken cancellationToken)
    {
        if (await RejectUnknownHobbyAsync(hobby!, cancellationToken) is { } problem)
        {
            return problem;
        }

        var (outcome, share) = await shares.MakeAsync(hobby!, request, cancellationToken);

        return outcome == MakeShareOutcome.AlreadyShared
            ? Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Already shared",
                detail: "This board has a link already.")
            : StatusCode(StatusCodes.Status201Created, share);
    }

    /// <summary>
    /// Rewrites what the link shows — a box in the dialog, written as it is ticked. Every box is
    /// sent every time. The address does not change.
    /// </summary>
    [HttpPut]
    [ProducesResponseType<ShareDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Change(
        [FromQuery, Required] string? hobby, ShareRequest request, CancellationToken cancellationToken)
    {
        if (await RejectUnknownHobbyAsync(hobby!, cancellationToken) is { } problem)
        {
            return problem;
        }

        var share = await shares.ChangeAsync(hobby!, request, cancellationToken);
        return share is null ? NotFound() : Ok(share);
    }

    /// <summary>
    /// Stops sharing: the link stops working for everyone who has it, and sharing again makes a
    /// new one. The dialog asks first, because nothing brings the old address back.
    /// </summary>
    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Stop(
        [FromQuery, Required] string? hobby, CancellationToken cancellationToken)
    {
        if (await RejectUnknownHobbyAsync(hobby!, cancellationToken) is { } problem)
        {
            return problem;
        }

        return await shares.StopAsync(hobby!, cancellationToken) ? NoContent() : NotFound();
    }

    /// <summary>
    /// LibraryController's rule: a link to a hobby nobody has heard of would be a share of
    /// nothing, which reads as an empty board rather than as a typo.
    /// </summary>
    private async Task<IActionResult?> RejectUnknownHobbyAsync(
        string hobby, CancellationToken cancellationToken)
    {
        if (await library.HobbyExistsAsync(hobby, cancellationToken))
        {
            return null;
        }

        ModelState.AddModelError(nameof(hobby), $"Unknown hobby '{hobby}'.");
        return ValidationProblem(ModelState);
    }
}
