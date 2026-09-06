using HobbyTracker.Api.Integrations.Tmdb;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Turns a <see cref="TmdbException"/> into a 502 rather than a 500 — "the upstream provider is
/// unhappy" is a different message to a caller than "this API is broken".
///
/// The detail is deliberately generic. TMDB puts its reason in `status_message`, and on a bad
/// token that reason quotes the token back; the message goes to the log, where it is useful, and
/// not to a client.
/// </summary>
public sealed class TmdbExceptionHandler(ILogger<TmdbExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        // False for anything that is not ours, which is what makes appending handlers safe.
        if (exception is not TmdbException)
        {
            return false;
        }

        logger.LogError(exception, "TMDB request failed.");

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status502BadGateway,
            Title = "Upstream metadata provider failed",
            Detail = "TMDB could not be reached or returned an unusable response.",
        };

        httpContext.Response.StatusCode = StatusCodes.Status502BadGateway;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);

        return true;
    }
}
