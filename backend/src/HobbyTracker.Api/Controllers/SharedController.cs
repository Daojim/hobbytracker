using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

/// <summary>
/// A share, read by whoever holds its link: the owner's board, read-only, with nobody signed in.
/// <b>The one deliberately anonymous controller besides sign-in.</b>
///
/// <para>
/// <b>What keeps it safe is in its constructor.</b> It holds three interfaces and nothing else:
/// <see cref="IShareLookup"/>, which finds a share by its token, and <see cref="ISharedLibrary"/>
/// and <see cref="ISharedStats"/>, whose every read takes its owner from the caller. None of them
/// writes, and none of them asks <c>ICurrentUser</c> — so nothing here can act as the owner, or as
/// whoever is visiting. Every action finds the share, checks the part, and passes
/// <c>share.OwnerId</c> where it can be read.
/// </para>
///
/// <para>
/// <b>Every refusal is the same 404</b>: a token nobody holds, a share that was stopped, and a part
/// its owner switched off. Whether a link ever existed, and what its owner chose not to show, are
/// the owner's business. And <b>no route here reaches a note</b>, whatever is ticked.
/// </para>
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/shared/{token}")]
public sealed class SharedController(
    IShareLookup shares, ISharedLibrary library, ISharedStats stats) : ControllerBase
{
    /// <summary>Which board this is, what it shows, and the owner's name only when ticked.</summary>
    [HttpGet]
    [ProducesResponseType<SharedBoardDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SharedBoardDto>> Get(
        string token, CancellationToken cancellationToken)
    {
        var share = await shares.FindAsync(token, cancellationToken);

        return share is null
            ? NotFound()
            : Ok(new SharedBoardDto(share.Hobby, share.Parts, share.Name));
    }

    /// <summary>
    /// One column, as its owner's board draws it, less the note. A column must be named: a share
    /// is read a column at a time, and the board's route with none named answers with every title
    /// on the board, whichever columns are shown.
    /// </summary>
    /// <param name="year">Bounded, as the Stats route is, so a stranger's typo is a 400 and not a 500.</param>
    [HttpGet("library")]
    [ProducesResponseType<LibraryPage>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LibraryPage>> Column(
        string token,
        [FromQuery, Required] LogStatus? status,
        [FromQuery, Range(1, 9998)] int? year,
        [FromQuery] LibrarySort? sort,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken cancellationToken)
    {
        var share = await shares.FindAsync(token, cancellationToken);
        if (share is null || !share.Shows(status!.Value))
        {
            return NotFound();
        }

        return Ok(await library.ColumnAsync(
            share.OwnerId,
            share.Hobby,
            status.Value,
            year,
            sort ?? LibrarySort.Manual,
            page,
            pageSize,
            cancellationToken));
    }

    /// <summary>The year control's years, counted from the columns the share shows and no others.</summary>
    [HttpGet("years")]
    [ProducesResponseType<IReadOnlyList<int>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<int>>> Years(
        string token, CancellationToken cancellationToken)
    {
        var share = await shares.FindAsync(token, cancellationToken);
        if (share is null)
        {
            return NotFound();
        }

        return Ok(await library.YearsAsync(
            share.OwnerId, share.Hobby, share.Columns, cancellationToken));
    }

    /// <summary>The release calendar under the board, when the share shows it.</summary>
    [HttpGet("upcoming")]
    [ProducesResponseType<IReadOnlyList<LibraryItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<LibraryItemDto>>> Upcoming(
        string token, CancellationToken cancellationToken)
    {
        var share = await shares.FindAsync(token, cancellationToken);
        if (share is null || !share.Shows(SharePart.Upcoming))
        {
            return NotFound();
        }

        return Ok(await library.UpcomingAsync(share.OwnerId, share.Hobby, cancellationToken));
    }

    /// <summary>A year of the Stats page — the whole of it — when the share shows it.</summary>
    [HttpGet("stats")]
    [ProducesResponseType<StatsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StatsDto>> Stats(
        string token, [FromQuery, Range(1, 9998)] int? year, CancellationToken cancellationToken)
    {
        var share = await shares.FindAsync(token, cancellationToken);
        if (share is null || !share.Shows(SharePart.Stats))
        {
            return NotFound();
        }

        return Ok(await stats.GetAsync(share.OwnerId, share.Hobby, year, cancellationToken));
    }

    /// <summary>The Stats page's own years, when the share shows it.</summary>
    [HttpGet("stats/years")]
    [ProducesResponseType<IReadOnlyList<int>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<int>>> StatsYears(
        string token, CancellationToken cancellationToken)
    {
        var share = await shares.FindAsync(token, cancellationToken);
        if (share is null || !share.Shows(SharePart.Stats))
        {
            return NotFound();
        }

        return Ok(await stats.YearsAsync(share.OwnerId, share.Hobby, cancellationToken));
    }
}
