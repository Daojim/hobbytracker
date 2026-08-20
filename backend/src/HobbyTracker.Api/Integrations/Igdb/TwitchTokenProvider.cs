using System.Diagnostics.CodeAnalysis;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Integrations.Igdb;

public interface IIgdbTokenProvider
{
    Task<string> GetAccessTokenAsync(CancellationToken cancellationToken);

    /// <summary>Drops the cached token so the next call fetches a fresh one. Used on a 401.</summary>
    void Invalidate();
}

/// <summary>
/// Owns the Twitch client-credentials flow that IGDB v4 authenticates with.
///
/// Registered as a singleton so the token is cached process-wide: Twitch app access tokens
/// last around sixty days, and fetching one per request would be slow and impolite. A
/// semaphore guards the refresh, so a burst of concurrent searches triggers a single token
/// request instead of one each.
///
/// It takes an <see cref="IHttpClientFactory"/> rather than an injected HttpClient because a
/// typed client is registered transient — being a singleton, this class would capture and pin
/// one handler forever, and stop seeing DNS changes. Asking the factory per call keeps the
/// handler rotation that IHttpClientFactory exists to provide.
///
/// The client it asks for is deliberately not the IGDB one: the IGDB client's auth handler
/// depends on this provider, so sharing a client would close a loop.
/// </summary>
public sealed class TwitchTokenProvider(
    IHttpClientFactory httpClientFactory,
    IOptions<IgdbOptions> options,
    ILogger<TwitchTokenProvider> logger) : IIgdbTokenProvider
{
    public const string HttpClientName = "twitch-oauth";

    /// <summary>Refresh a minute early so a token cannot expire mid-flight.</summary>
    private static readonly TimeSpan ExpirySkew = TimeSpan.FromSeconds(60);

    private readonly IgdbOptions _options = options.Value;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    private string? _accessToken;
    private DateTimeOffset _expiresAt = DateTimeOffset.MinValue;

    public async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        if (TryGetCachedToken(out var cached))
        {
            return cached;
        }

        await _refreshLock.WaitAsync(cancellationToken);
        try
        {
            // Re-check inside the lock: whoever held it before us probably just refreshed.
            if (TryGetCachedToken(out cached))
            {
                return cached;
            }

            return await FetchTokenAsync(cancellationToken);
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    public void Invalidate()
    {
        _accessToken = null;
        _expiresAt = DateTimeOffset.MinValue;
    }

    private async Task<string> FetchTokenAsync(CancellationToken cancellationToken)
    {
        // Twitch takes these as query-string parameters on a POST with no body.
        var url = QueryHelpers.AddQueryString(_options.TokenUrl, new Dictionary<string, string?>
        {
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["grant_type"] = "client_credentials",
        });

        var client = httpClientFactory.CreateClient(HttpClientName);

        HttpResponseMessage response;
        try
        {
            response = await client.PostAsync(url, content: null, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new IgdbException("Could not reach Twitch to obtain an IGDB access token.", ex);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                // Twitch reports a bad client_secret as a 400/403 with a JSON body. Surface
                // the body: it is the difference between "wrong secret" and "app disabled",
                // and it contains no credentials of ours.
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new IgdbException(
                    $"Twitch token request failed with {(int)response.StatusCode}: {body}");
            }

            var payload = await response.Content.ReadFromJsonAsync<TwitchTokenResponse>(cancellationToken)
                ?? throw new IgdbException("Twitch returned an empty token response.");

            if (string.IsNullOrWhiteSpace(payload.AccessToken))
            {
                throw new IgdbException("Twitch returned a token response with no access_token.");
            }

            _accessToken = payload.AccessToken;
            _expiresAt = DateTimeOffset.UtcNow.AddSeconds(payload.ExpiresIn);

            logger.LogInformation(
                "Obtained IGDB access token; expires {ExpiresAt:u}.", _expiresAt);

            return _accessToken;
        }
    }

    private bool TryGetCachedToken([NotNullWhen(true)] out string? token)
    {
        token = _accessToken;
        return token is not null && DateTimeOffset.UtcNow < _expiresAt - ExpirySkew;
    }

    private sealed record TwitchTokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn,
        [property: JsonPropertyName("token_type")] string TokenType);
}
