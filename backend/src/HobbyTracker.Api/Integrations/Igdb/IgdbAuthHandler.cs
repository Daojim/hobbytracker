using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Integrations.Igdb;

/// <summary>
/// Attaches IGDB's two auth headers to every outbound request and recovers from a token that
/// died early.
///
/// Keeping this in a DelegatingHandler is what lets <see cref="IgdbClient"/> hold zero auth
/// code — the client only knows how to write APIcalypse queries, and every future IGDB
/// endpoint we add is authenticated for free.
/// </summary>
public sealed class IgdbAuthHandler(
    IIgdbTokenProvider tokenProvider,
    IOptions<IgdbOptions> options,
    ILogger<IgdbAuthHandler> logger) : DelegatingHandler
{
    private const string ClientIdHeader = "Client-ID";

    private readonly IgdbOptions _options = options.Value;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        // Buffer before the first send so the body survives into a retry. StringContent is
        // already in memory, so this is free — but it is what makes the replay below legal.
        var replay = await CloneAsync(request, cancellationToken);

        await AuthenticateAsync(request, cancellationToken);
        var response = await base.SendAsync(request, cancellationToken);

        if (response.StatusCode != HttpStatusCode.Unauthorized)
        {
            replay.Dispose();
            return response;
        }

        // The token was revoked, or expired earlier than Twitch advertised. Drop it, get a
        // fresh one, and replay exactly once: a second 401 is a credentials problem, not a
        // stale token, and retrying past that just turns a clear error into a hang.
        logger.LogWarning("IGDB returned 401; refreshing the access token and retrying once.");
        response.Dispose();
        tokenProvider.Invalidate();

        await AuthenticateAsync(replay, cancellationToken);
        return await base.SendAsync(replay, cancellationToken);
    }

    private async Task AuthenticateAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var token = await tokenProvider.GetAccessTokenAsync(cancellationToken);

        request.Headers.Remove(ClientIdHeader);
        request.Headers.TryAddWithoutValidation(ClientIdHeader, _options.ClientId);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    /// <summary>
    /// An HttpRequestMessage cannot be sent twice, so a retry needs a copy. Content is read
    /// into a byte array, which is safe for the in-memory content types this client uses; a
    /// streamed body would need buffering upstream instead.
    /// </summary>
    private static async Task<HttpRequestMessage> CloneAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var clone = new HttpRequestMessage(request.Method, request.RequestUri)
        {
            Version = request.Version,
            VersionPolicy = request.VersionPolicy,
        };

        if (request.Content is not null)
        {
            var body = await request.Content.ReadAsByteArrayAsync(cancellationToken);
            var content = new ByteArrayContent(body);

            foreach (var header in request.Content.Headers)
            {
                content.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }

            clone.Content = content;
        }

        foreach (var header in request.Headers)
        {
            clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        foreach (var option in request.Options)
        {
            clone.Options.Set(new HttpRequestOptionsKey<object?>(option.Key), option.Value);
        }

        return clone;
    }
}
