using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Integrations.Hltb;

/// <summary>
/// What a search has to carry to be answered: where to send it, and the handshake values that
/// prove the caller loaded the page first.
/// </summary>
public sealed record HltbCredentials(string SearchPath, string Token, string HpKey, string HpVal);

public interface IHltbSession
{
    Task<HltbCredentials> GetAsync(CancellationToken cancellationToken);

    /// <summary>Drops what is cached so the next call rediscovers it. Used on a 403.</summary>
    void Invalidate();
}

/// <summary>
/// Discovers the search endpoint and holds the handshake behind it.
///
/// The shape is TwitchTokenProvider's — singleton, one refresh however many callers arrive at
/// once, invalidated from outside when the far end says the credential has gone off. What is
/// different is that there is nothing to configure: IGDB publishes its URL and issues a token
/// against credentials we hold, where here both the endpoint's name and the token have to be
/// read off the site itself.
///
/// Takes IHttpClientFactory rather than an injected HttpClient for the reason a singleton always
/// does: holding one would pin a handler open for the life of the process and stop it noticing
/// DNS changes.
/// </summary>
public sealed partial class HltbSession(
    IHttpClientFactory httpClientFactory,
    IOptions<HltbOptions> options,
    ILogger<HltbSession> logger) : IHltbSession
{
    public const string HttpClientName = "hltb-session";

    private readonly HltbOptions _options = options.Value;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    private HltbCredentials? _cached;

    public async Task<HltbCredentials> GetAsync(CancellationToken cancellationToken)
    {
        if (_cached is { } ready)
        {
            return ready;
        }

        await _refreshLock.WaitAsync(cancellationToken);
        try
        {
            // Re-check inside the lock: whoever held it before us has just done this.
            if (_cached is { } justFetched)
            {
                return justFetched;
            }

            return _cached = await RefreshAsync(cancellationToken);
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    /// <summary>
    /// Nothing expires this on a timer.
    ///
    /// The token carries a timestamp whose rules belong to HowLongToBeat, so any lifetime chosen
    /// here would be a guess that fails either by refusing a good token or by keeping a stale
    /// one. The 403 the client replays on is the only honest signal, and mirroring the site's own
    /// JavaScript — which refreshes on exactly that — is the version that can be justified.
    /// </summary>
    public void Invalidate() => _cached = null;

    private async Task<HltbCredentials> RefreshAsync(CancellationToken cancellationToken)
    {
        using var client = CreateClient();

        var searchPath = await DiscoverSearchPathAsync(client, cancellationToken);

        // The cache-buster is the site's own doing; it asks with the epoch in milliseconds.
        var initPath = $"api/{searchPath}/init?{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        var body = await ReadAsync(client, initPath, cancellationToken);

        HltbHandshake? handshake;
        try
        {
            handshake = JsonSerializer.Deserialize<HltbHandshake>(body, JsonOptions);
        }
        catch (JsonException exception)
        {
            throw new HltbException("HowLongToBeat's handshake could not be parsed.", exception);
        }

        if (handshake is null
            || string.IsNullOrEmpty(handshake.Token)
            || string.IsNullOrEmpty(handshake.HpKey)
            || string.IsNullOrEmpty(handshake.HpVal))
        {
            throw new HltbException(
                $"HowLongToBeat's handshake at /{initPath} did not carry the expected values.");
        }

        logger.LogInformation(
            "HowLongToBeat session established against /api/{SearchPath}.", searchPath);

        return new HltbCredentials(searchPath, handshake.Token, handshake.HpKey, handshake.HpVal);
    }

    /// <summary>
    /// Finds the search endpoint's name in the site's own JavaScript.
    ///
    /// The rule is the pair: the name is whichever /api/X is also referenced as /api/X/init.
    /// Taking the first POST fetch instead — the obvious reading, and what the community clients
    /// do — picks /api/game/ out of a real bundle, which answers 404. A 404 reads as a wrong URL
    /// rather than a wrong rule, so it sends you looking for a path suffix that does not exist.
    /// </summary>
    private async Task<string> DiscoverSearchPathAsync(
        HttpClient client, CancellationToken cancellationToken)
    {
        var home = await ReadAsync(client, string.Empty, cancellationToken);

        foreach (var chunk in ChunkPattern().Matches(home).Select(match => match.Value).Distinct())
        {
            string script;
            try
            {
                script = await ReadAsync(client, chunk.TrimStart('/'), cancellationToken);
            }
            catch (HltbException exception)
            {
                // One unreadable chunk is not a failure: the name is in one of them, and the
                // rest are ordinary application code we are only reading past.
                logger.LogDebug(exception, "Skipping unreadable bundle {Chunk}.", chunk);
                continue;
            }

            var referenced = ApiPathPattern().Matches(script)
                .Select(match => match.Groups[1].Value)
                .ToHashSet(StringComparer.Ordinal);

            var found = referenced.FirstOrDefault(name =>
                !name.Contains('/', StringComparison.Ordinal)
                && referenced.Contains($"{name}/init"));

            if (found is not null)
            {
                return found;
            }
        }

        logger.LogWarning(
            "Could not find HowLongToBeat's search endpoint in its bundles; falling back to the "
            + "configured {Fallback}. If searches now fail, the site has renamed it and "
            + "Hltb:FallbackSearchPath is where to correct that.",
            _options.FallbackSearchPath);

        return _options.FallbackSearchPath;
    }

    private HttpClient CreateClient()
    {
        var client = httpClientFactory.CreateClient(HttpClientName);

        client.Timeout = TimeSpan.FromSeconds(_options.RequestTimeoutSeconds);
        client.BaseAddress ??= new Uri(_options.BaseUrl);

        // The same User-Agent the client will search under. The token bakes it in, so a mismatch
        // here surfaces later as a 403 on a token that was only just issued.
        client.DefaultRequestHeaders.Remove("User-Agent");
        client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", _options.UserAgent);

        // Both of these are load-bearing, measured against the real site: the handshake answers
        // 403 {"error":"Access Denied"} without a User-Agent *and* a Referer, and 200 with them.
        // Accept and Origin make no difference either way.
        //
        // Set for every request rather than only the handshake, which means the home page is
        // fetched with a Referer naming itself. Harmless — the site does not check it there —
        // and one rule that always holds beats two that have to be kept straight.
        client.DefaultRequestHeaders.Remove("Referer");
        client.DefaultRequestHeaders.TryAddWithoutValidation("Referer", _options.BaseUrl);

        return client;
    }

    private static async Task<string> ReadAsync(
        HttpClient client, string path, CancellationToken cancellationToken)
    {
        HttpResponseMessage response;
        try
        {
            response = await client.GetAsync(path, cancellationToken);
        }
        catch (HttpRequestException exception)
        {
            throw new HltbException("Could not reach HowLongToBeat.", exception);
        }
        catch (TaskCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            throw new HltbException(
                "HowLongToBeat did not respond within the configured timeout.", exception);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                throw new HltbException(
                    $"HowLongToBeat returned {(int)response.StatusCode} for /{path}.");
            }

            return await response.Content.ReadAsStringAsync(cancellationToken);
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    /// <summary>The handshake's own shape — camelCase, unlike everything else HLTB returns.</summary>
    private sealed record HltbHandshake(string? Token, string? HpKey, string? HpVal);

    [GeneratedRegex(@"/_next/static/[^""'\s)]+?\.js")]
    private static partial Regex ChunkPattern();

    /// <summary>
    /// A quoted /api/… literal. Deliberately not anchored on a closing quote: the site writes
    /// the init path as "/api/bleed/init?"+Date.now(), so requiring one would miss the very
    /// reference the pair rule turns on.
    /// </summary>
    [GeneratedRegex("[\"'`]/api/([a-zA-Z0-9_/]{1,60})")]
    private static partial Regex ApiPathPattern();
}
