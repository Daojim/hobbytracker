using HobbyTracker.Api.Integrations.Mal;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Turns a <see cref="MalException"/> into a 502 rather than a 500 — "the upstream provider is
/// unhappy" is a different message to a caller than "this API is broken".
///
/// The detail is deliberately generic, as TMDB's is. MAL puts its reason in `message`, and on a
/// revoked client id that reason can quote the credential back; the message goes to the log,
/// where it is useful, and not to a client.
/// </summary>
public sealed class MalExceptionHandler(ILogger<MalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        // False for anything that is not ours, which is what makes appending handlers safe.
        if (exception is not MalException)
        {
            return false;
        }

        logger.LogError(exception, "MyAnimeList request failed.");

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status502BadGateway,
            Title = "Upstream metadata provider failed",
            Detail = "MyAnimeList could not be reached or returned an unusable response.",
        };

        httpContext.Response.StatusCode = StatusCodes.Status502BadGateway;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);

        return true;
    }
}
