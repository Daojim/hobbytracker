using HobbyTracker.Api.Integrations.Hltb;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Turns an HltbException into a 502 rather than a 500, exactly as IgdbExceptionHandler does for
/// IGDB: "the site we read is unhappy" is a different message to a caller than "this API is
/// broken", and only one of them is worth reporting as a bug.
///
/// It reaches very little on purpose. Nothing a user does waits on HowLongToBeat — adding a game
/// enqueues a lookup and returns, and the backfill answers 202 without making a request at all —
/// so the only route that can produce this is pinning an id by hand, which is the one place
/// somebody is standing there waiting to be told whether it worked.
/// </summary>
public sealed class HltbExceptionHandler(ILogger<HltbExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not HltbException hltbException)
        {
            // Not ours — let the next handler, or the default pipeline, deal with it.
            return false;
        }

        logger.LogError(hltbException, "HowLongToBeat request failed.");

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status502BadGateway,
            Title = "HowLongToBeat could not be read",
            Detail = "HowLongToBeat could not be reached or refused the request. "
                     + "Please try again shortly.",
            Instance = httpContext.Request.Path,
        };

        httpContext.Response.StatusCode = StatusCodes.Status502BadGateway;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);

        return true;
    }
}
