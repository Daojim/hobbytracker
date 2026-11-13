using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace HobbyTracker.Api.Integrations.Steam;

/// <summary>What Steam's players say about one app: Steam's own word for it, and the counts behind it.</summary>
/// <param name="Summary">Steam's word, as its store page prints it: <i>Very Positive</i>, <i>No user reviews</i>.</param>
/// <param name="Positive">How many of the reviews recommend it.</param>
/// <param name="Total">How many reviews there are. Nought for a game nobody has reviewed yet.</param>
public sealed record SteamReviewSummary(string Summary, int Positive, int Total);

public interface ISteamClient
{
    /// <summary>
    /// What Steam's players say about one app, counted the way the store page counts it for an
    /// English reader. Null when Steam has nothing to say about the app at all.
    /// </summary>
    Task<SteamReviewSummary?> GetReviewSummaryAsync(int appId, CancellationToken cancellationToken);
}

/// <summary>
/// Steam's Web API, for one thing: the review summary its store page prints.
///
/// <para>
/// <b>Not <c>store.steampowered.com/appreviews</c>, which every unofficial client calls.</b> It is
/// deprecated, and since some time before 12 November 2026 it answers every app with a 302 to the
/// store's home page, whatever it is asked — so a client following redirects reads a page of HTML,
/// and one that does not reads nothing. Steamworks' own page for it names
/// <c>IUserReviewsService/GetAppReviews</c> as the replacement, which answers with no key.
/// </para>
///
/// <para>
/// <b>The TMDB shape: no handshake, so no handler.</b> No credential at all, in fact, which is the
/// difference from every other provider here, and why <see cref="SteamOptions"/> has no secret.
/// </para>
/// </summary>
public sealed class SteamClient(HttpClient httpClient, ILogger<SteamClient> logger) : ISteamClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    public async Task<SteamReviewSummary?> GetReviewSummaryAsync(
        int appId, CancellationToken cancellationToken)
    {
        // The service takes its question as JSON in the query string. One review a page, because
        // the summary arrives with the first page only and one is the least that brings it.
        //
        // No language, deliberately: Steam's default is the line its store page shows an English
        // reader — Hollow Knight's 186,188 reviews against the page's 186,389, where every language
        // counts 508,559 and named a different verdict from the page for 8 of the board's games.
        var input = string.Create(
            CultureInfo.InvariantCulture, $$"""{"appid":{{appId}},"num_per_page":1}""");

        var path = $"IUserReviewsService/GetAppReviews/v1/?input_json={Uri.EscapeDataString(input)}";

        logger.LogDebug("Steam request: {Path}", path);

        HttpResponseMessage response;
        try
        {
            response = await httpClient.GetAsync(path, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new SteamException("Could not reach Steam.", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            // Distinguish the client's own timeout from the caller walking away.
            throw new SteamException("Steam did not respond within the configured timeout.", ex);
        }

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                // Keyless answers share one rate limit with every other keyless caller, and Steam
                // publishes no figure for it. Arriving here means something is wrong rather than
                // merely busy, so it is said rather than retried.
                throw new SteamException("Steam rate limit exceeded.");
            }

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new SteamException($"Steam {path} returned {(int)response.StatusCode}: {body}");
            }

            AppReviewsEnvelope? envelope;
            try
            {
                envelope = await response.Content.ReadFromJsonAsync<AppReviewsEnvelope>(
                    JsonOptions, cancellationToken);
            }
            catch (JsonException ex)
            {
                throw new SteamException("Steam returned a response that could not be parsed.", ex);
            }

            // An app Steam does not know is a 200 with an empty `response`, measured on an id past
            // its numbering and on a delisted app the board names. That is an answer, so it is a
            // null rather than an exception, and the journal shows no verdict.
            var summary = envelope?.Response?.QuerySummary;

            return summary?.ReviewScoreDesc is { Length: > 0 } words
                ? new SteamReviewSummary(words, summary.TotalPositive ?? 0, summary.TotalReviews ?? 0)
                : null;
        }
    }

    /// <summary><c>{ "response": { "query_summary": { … }, "reviews": [ … ] } }</c>, the summary alone read.</summary>
    private sealed class AppReviewsEnvelope
    {
        public AppReviewsResponse? Response { get; init; }
    }

    private sealed class AppReviewsResponse
    {
        public QuerySummary? QuerySummary { get; init; }
    }

    private sealed class QuerySummary
    {
        public string? ReviewScoreDesc { get; init; }
        public int? TotalPositive { get; init; }
        public int? TotalReviews { get; init; }
    }
}
