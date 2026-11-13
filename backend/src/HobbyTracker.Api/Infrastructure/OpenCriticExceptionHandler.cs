using HobbyTracker.Api.Integrations.OpenCritic;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Turns an <see cref="OpenCriticException"/> into a 502 rather than a 500 — "the site we ask is
/// unhappy" is a different message to a caller than "this API is broken".
///
/// <para>
/// <b>Only the pin can reach it.</b> The pin waits on OpenCritic, because the point of typing a
/// number is to learn whether it was right. The journal's read of what OpenCritic says does not
/// let the exception out: each provider there is a half of its own, and one that cannot be read
/// takes its own verdict with it and nothing else. Steam's and Wikidata's exceptions are caught the
/// same way, which is why they have no handler of their own.
/// </para>
///
/// The detail is generic, as TMDB's and MAL's are. RapidAPI's reason for a refused key can quote
/// the key's subscription back; the message goes to the log and not to a client.
/// </summary>
public sealed class OpenCriticExceptionHandler(ILogger<OpenCriticExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        // False for anything that is not ours, which is what makes appending handlers safe.
        if (exception is not OpenCriticException)
        {
            return false;
        }

        logger.LogError(exception, "OpenCritic request failed.");

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status502BadGateway,
            Title = "Upstream review provider failed",
            Detail = "OpenCritic could not be reached or refused the request. Please try again later.",
        };

        httpContext.Response.StatusCode = StatusCodes.Status502BadGateway;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);

        return true;
    }
}
