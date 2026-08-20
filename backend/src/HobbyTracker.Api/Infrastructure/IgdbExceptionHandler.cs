using HobbyTracker.Api.Integrations.Igdb;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Turns an <see cref="IgdbException"/> into a 502 instead of the default 500.
///
/// The distinction matters to whoever is on the other end: a 500 says the API is broken and
/// there is nothing to do but wait, while a 502 says the upstream metadata provider is
/// unhappy and the same request may well work in a minute. The exception's own message stays
/// in the log rather than the response — it can carry IGDB's raw error text, which is for us.
/// </summary>
public sealed class IgdbExceptionHandler(ILogger<IgdbExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not IgdbException igdbException)
        {
            // Not ours — let the next handler, or the default pipeline, deal with it.
            return false;
        }

        logger.LogError(igdbException, "IGDB request failed.");

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status502BadGateway,
            Title = "Upstream metadata provider failed",
            Detail = "IGDB could not be reached or rejected the request. Please try again shortly.",
            Instance = httpContext.Request.Path,
        };

        httpContext.Response.StatusCode = StatusCodes.Status502BadGateway;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);

        return true;
    }
}
