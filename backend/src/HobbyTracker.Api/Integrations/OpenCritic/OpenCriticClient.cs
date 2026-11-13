using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Integrations.OpenCritic;

/// <summary>One game as OpenCritic answers it, with its wire quirks already absorbed.</summary>
/// <param name="Id">OpenCritic's number for it, which is the whole of its page's address.</param>
/// <param name="Name">OpenCritic's name for it — what picks one of several ids Wikidata gives.</param>
/// <param name="TopCriticScore">The top critics' average, or null when OpenCritic has none yet.</param>
/// <param name="Tier">Mighty, Strong, Fair or Weak, or null when it has no score to tier.</param>
/// <param name="PercentRecommended">The share of critics who recommend it, or null with too few reviews.</param>
public sealed record OpenCriticGame(
    int Id,
    string Name,
    double? TopCriticScore,
    string? Tier,
    double? PercentRecommended);

public interface IOpenCriticClient
{
    /// <summary>
    /// Whether a key is set. Without one nothing is asked of OpenCritic: the caller checks this
    /// first, and the journal shows OpenCritic's link alone.
    /// </summary>
    bool HasKey { get; }

    /// <summary>
    /// One game by OpenCritic's number, or null when OpenCritic does not know it — an answer rather
    /// than a failure, so a pin can refuse a typo in words. Throws <see cref="OpenCriticException"/>
    /// when OpenCritic cannot be read, and <see cref="InvalidOperationException"/> without a key,
    /// which is a caller that forgot to ask <see cref="HasKey"/>.
    /// </summary>
    Task<OpenCriticGame?> GetGameAsync(int id, CancellationToken cancellationToken);
}

/// <summary>
/// OpenCritic's API, which OpenCritic sells through RapidAPI.
///
/// <para>
/// <b>An API and not its pages, because its pages may not be read.</b> They carry the score, but
/// the owner's terms (Valnet's, last updated 12 January 2026) forbid scraping and the automatic
/// extraction of any content "in any form and by any means". A score comes through here or not at
/// all. A link to a page is not that, which is why the journal can link without a key.
/// </para>
///
/// <para>
/// <b>The headers are stamped here, per request, rather than on the typed client in Program.cs</b>
/// as TMDB's bearer and MAL's id are. Whether there is a key decides whether there is a request at
/// all, so the two belong in one place, and the client tests can assert both.
/// </para>
///
/// <para>
/// One route, <c>/game/{id}</c>, and never <c>/game/search</c>: the free plan allows 200 requests and
/// 25 searches a day, and Wikidata finds the id with no search at all.
/// </para>
/// </summary>
public sealed class OpenCriticClient(
    HttpClient httpClient,
    IOptions<OpenCriticOptions> options,
    ILogger<OpenCriticClient> logger) : IOpenCriticClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly OpenCriticOptions _options = options.Value;

    public bool HasKey => !string.IsNullOrWhiteSpace(_options.ApiKey);

    public async Task<OpenCriticGame?> GetGameAsync(int id, CancellationToken cancellationToken)
    {
        if (!HasKey)
        {
            // No key, no request — and not a null either, which would read as "OpenCritic has no
            // such game" and have a pin refuse a good number. A caller here forgot to ask.
            throw new InvalidOperationException(
                "OpenCritic has no key to ask with. Check IOpenCriticClient.HasKey first.");
        }

        var path = $"game/{id}";
        logger.LogDebug("OpenCritic request: {Path}", path);

        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Add("X-RapidAPI-Key", _options.ApiKey);
        request.Headers.Add("X-RapidAPI-Host", _options.Host);

        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(request, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new OpenCriticException("Could not reach OpenCritic.", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new OpenCriticException("OpenCritic did not respond within the configured timeout.", ex);
        }

        using (response)
        {
            // What OpenCritic answers for a number it does not have is a 400 saying "An unknown
            // error has occurred" — measured on 12 November 2026, and it is counted against the
            // day's allowance like any other answer. A 404 is read the same way, since it could
            // mean nothing else. Our requests are always well formed, so a 400 is never ours.
            if (response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.NotFound)
            {
                return null;
            }

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                // The free plan is 200 requests a day with a hard limit, and RapidAPI answers the
                // next one with this. Nothing to retry until tomorrow.
                throw new OpenCriticException("OpenCritic's daily allowance is spent.");
            }

            if (!response.IsSuccessStatusCode)
            {
                // A 401 or 403 is RapidAPI refusing the key. Kept apart from the 400 above on
                // purpose: read as "no such game", a bad key would refuse every pin in words.
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new OpenCriticException(
                    $"OpenCritic {path} returned {(int)response.StatusCode}: {body}");
            }

            GameJson? game;
            try
            {
                game = await response.Content.ReadFromJsonAsync<GameJson>(JsonOptions, cancellationToken);
            }
            catch (JsonException ex)
            {
                throw new OpenCriticException("OpenCritic returned a response that could not be parsed.", ex);
            }

            if (game is null)
            {
                throw new OpenCriticException("OpenCritic returned an empty response.");
            }

            // OpenCritic's "nothing yet" is -1 in a number and an empty tier, and the two numbers
            // are independent: Kuro no Kiseki has a score from three top critics and too few
            // reviews for a share. Absorbed here, so nothing above this file knows the -1 exists.
            return new OpenCriticGame(
                game.Id,
                game.Name ?? string.Empty,
                Known(game.TopCriticScore),
                string.IsNullOrWhiteSpace(game.Tier) ? null : game.Tier,
                Known(game.PercentRecommended));
        }
    }

    private static double? Known(double? value) => value is >= 0 ? value : null;

    /// <summary>The fields of <c>/game/{id}</c> that are read. It answers a great many more.</summary>
    private sealed class GameJson
    {
        public int Id { get; init; }
        public string? Name { get; init; }
        public string? Tier { get; init; }
        public double? TopCriticScore { get; init; }
        public double? PercentRecommended { get; init; }
    }
}
