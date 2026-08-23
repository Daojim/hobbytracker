using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using HobbyTracker.Api.Integrations.Hltb.Models;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Integrations.Hltb;

/// <summary>
/// One game as HowLongToBeat knows it, with the wire's quirks already dealt with: hours rather
/// than seconds, absent rather than nought, a year rather than whichever of two shapes the
/// endpoint felt like sending.
/// </summary>
public sealed record HltbGame(
    int Id,
    string Name,
    IReadOnlyList<string> Aliases,
    int? ReleaseYear,
    decimal? MainStoryHours,
    decimal? MainExtraHours,
    decimal? CompletionistHours);

public interface IHltbClient
{
    /// <summary>
    /// Candidates for a title, in HowLongToBeat's own relevance order. Deciding which of them —
    /// if any — is actually the game is <see cref="Services.HltbMatcher"/>'s job, not this one's.
    /// </summary>
    Task<IReadOnlyList<HltbGame>> SearchAsync(string title, CancellationToken cancellationToken);

    /// <summary>
    /// One game by HowLongToBeat id, with no matching involved. Null when it does not know the
    /// id — an answer rather than a failure, so the title keeps what was last known about it.
    /// </summary>
    Task<HltbGame?> GetAsync(int hltbId, CancellationToken cancellationToken);
}

/// <summary>
/// Reads HowLongToBeat, which publishes no API and would rather not be read by a program.
///
/// Two routes with almost nothing in common. A search goes to the endpoint whose name
/// <see cref="IHltbSession"/> had to find, carrying the handshake in the headers *and* as a
/// property of the body. Fetching a game already pinned to an id is an ordinary page fetch with
/// the answer parsed out of the JSON Next.js leaves embedded in it, and needs no handshake at
/// all — which is what keeps a pinned title refreshable on a day the search endpoint has been
/// renamed out from under us.
///
/// The retry lives here rather than in a DelegatingHandler, which is where the IGDB equivalent
/// would put it, and the difference is not stylistic: the credential is partly in the *body*, so
/// a handler replaying a 403 would resend the stale one and fail the very check it was retrying
/// for. Rewriting request JSON inside a handler is worse than the coupling it would avoid, and
/// the site's own JavaScript does exactly this in one function.
/// </summary>
public sealed partial class HltbClient(
    HttpClient httpClient,
    IHltbSession session,
    IOptions<HltbOptions> options,
    ILogger<HltbClient> logger) : IHltbClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    /// <summary>numeric(5,2) throws past this rather than rounding, so it is a hard ceiling.</summary>
    private const decimal MaximumStorableHours = 999.99m;

    private readonly HltbOptions _options = options.Value;

    public async Task<IReadOnlyList<HltbGame>> SearchAsync(
        string title, CancellationToken cancellationToken)
    {
        var terms = title.Split(' ', StringSplitOptions.RemoveEmptyEntries
                                    | StringSplitOptions.TrimEntries);

        if (terms.Length == 0)
        {
            return [];
        }

        var body = await SendSearchAsync(terms, retrying: false, cancellationToken);

        HltbSearchResponse? results;
        try
        {
            results = JsonSerializer.Deserialize<HltbSearchResponse>(body, JsonOptions);
        }
        catch (JsonException exception)
        {
            // Deliberately not an empty list. "HowLongToBeat has never heard of this" is a fact
            // about the game and would be written down as one; this is a fact about the request.
            throw new HltbException(
                "HowLongToBeat returned a search response that could not be parsed.", exception);
        }

        return [.. (results?.Data ?? []).Select(Map)];
    }

    public async Task<HltbGame?> GetAsync(int hltbId, CancellationToken cancellationToken)
    {
        var path = $"game/{hltbId.ToString(CultureInfo.InvariantCulture)}";

        var request = new HttpRequestMessage(HttpMethod.Get, path);
        Identify(request);

        var response = await SendAsync(request, cancellationToken);

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                logger.LogInformation(
                    "HowLongToBeat does not know game {HltbId}; leaving what is stored alone.",
                    hltbId);

                return null;
            }

            if (!response.IsSuccessStatusCode)
            {
                throw new HltbException(
                    $"HowLongToBeat returned {(int)response.StatusCode} for /{path}.");
            }

            var html = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParsePage(html, hltbId);
        }
    }

    /// <summary>
    /// Posts the search, and on a refusal re-does the handshake and posts it once more.
    ///
    /// One retry, not a loop: a second refusal is the site saying no rather than a token having
    /// gone off, and answering that by asking again is how an unofficial client earns a block.
    /// </summary>
    private async Task<string> SendSearchAsync(
        string[] terms, bool retrying, CancellationToken cancellationToken)
    {
        var credentials = await session.GetAsync(cancellationToken);

        var request = new HttpRequestMessage(HttpMethod.Post, $"api/{credentials.SearchPath}")
        {
            Content = new StringContent(
                BuildPayload(terms, credentials).ToJsonString(),
                Encoding.UTF8,
                "application/json"),
        };

        Identify(request);
        request.Headers.TryAddWithoutValidation("x-auth-token", credentials.Token);
        request.Headers.TryAddWithoutValidation("x-hp-key", credentials.HpKey);
        request.Headers.TryAddWithoutValidation("x-hp-val", credentials.HpVal);
        request.Headers.TryAddWithoutValidation("Origin", _options.BaseUrl.TrimEnd('/'));
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("*/*"));

        var response = await SendAsync(request, cancellationToken);

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.Forbidden && !retrying)
            {
                logger.LogWarning(
                    "HowLongToBeat refused the search token; re-running the handshake and "
                    + "retrying once.");

                session.Invalidate();
                return await SendSearchAsync(terms, retrying: true, cancellationToken);
            }

            if (!response.IsSuccessStatusCode)
            {
                var problem = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HltbException(
                    $"HowLongToBeat search returned {(int)response.StatusCode}: "
                    + Excerpt(problem));
            }

            return await response.Content.ReadAsStringAsync(cancellationToken);
        }
    }

    /// <summary>
    /// The site's own request shape, rather than the shorter one the community clients send.
    ///
    /// The last line is the whole anti-bot check and the reason this is a JsonObject and not a
    /// typed record: the body has to carry a property whose *name* is the handshake's key. Miss
    /// it and the endpoint answers 404 rather than 403, so a failed check reads as a wrong URL.
    /// </summary>
    private static JsonObject BuildPayload(string[] terms, HltbCredentials credentials) =>
        new()
        {
            ["searchType"] = "games",
            ["searchTerms"] = new JsonArray([.. terms.Select(term => JsonValue.Create(term))]),
            ["searchPage"] = 1,
            ["size"] = 20,
            ["searchOptions"] = new JsonObject
            {
                ["games"] = new JsonObject
                {
                    ["userId"] = 0,
                    ["platform"] = string.Empty,
                    ["sortCategory"] = "popular",
                    ["rangeCategory"] = "main",
                    ["rangeTime"] = new JsonObject { ["min"] = null, ["max"] = null },
                    ["gameplay"] = new JsonObject
                    {
                        ["perspective"] = string.Empty,
                        ["flow"] = string.Empty,
                        ["genre"] = string.Empty,
                        ["difficulty"] = string.Empty,
                    },
                    ["rangeYear"] = new JsonObject
                    {
                        ["min"] = string.Empty,
                        ["max"] = string.Empty,
                    },
                    ["modifier"] = string.Empty,
                },
                ["users"] = new JsonObject { ["sortCategory"] = "postcount" },
                ["lists"] = new JsonObject { ["sortCategory"] = "follows" },
                ["filter"] = string.Empty,
                ["sort"] = 0,
                ["randomizer"] = 0,
            },
            ["useCache"] = true,
            [credentials.HpKey] = credentials.HpVal,
        };

    /// <summary>
    /// Says who is calling, on every request this client makes.
    ///
    /// Set here rather than left to the typed client's DI configuration, which is where it
    /// started. The User-Agent is not decoration: HltbSession sends it at the handshake and the
    /// token that comes back has it baked in, so a search under a different one is refused — and
    /// with it in DI, the two halves of that agreement lived in different files and only the real
    /// site could tell you they had drifted. The Referer is required outright; without it the
    /// site answers 403 "Access Denied".
    /// </summary>
    private void Identify(HttpRequestMessage request)
    {
        request.Headers.TryAddWithoutValidation("User-Agent", _options.UserAgent);
        request.Headers.Referrer = new Uri(_options.BaseUrl);
    }

    private async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        try
        {
            return await httpClient.SendAsync(request, cancellationToken);
        }
        catch (HttpRequestException exception)
        {
            throw new HltbException("Could not reach HowLongToBeat.", exception);
        }
        catch (TaskCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            // The client's own timeout, not the caller walking away.
            throw new HltbException(
                "HowLongToBeat did not respond within the configured timeout.", exception);
        }
    }

    /// <summary>
    /// Digs the game out of the JSON Next.js embeds in the page.
    ///
    /// Navigated with JsonDocument rather than deserialised into four nested classes that exist
    /// only to spell props.pageProps.game.data — the path is the information, and hiding it in a
    /// type hierarchy would make it harder to see, not easier.
    /// </summary>
    private static HltbGame ParsePage(string html, int hltbId)
    {
        var embedded = NextDataPattern().Match(html);
        if (!embedded.Success)
        {
            throw new HltbException(
                $"HowLongToBeat's page for game {hltbId} carried no embedded data. The site's "
                + "page structure has probably changed.");
        }

        try
        {
            using var document = JsonDocument.Parse(embedded.Groups[1].Value);

            // props.pageProps.game.data.game[0]. The last hop is easy to miss and was: `data`
            // is an object here, not the array the search endpoint returns — its siblings are
            // relationships, userReviews, platformData — and the game sits one level inside it.
            var entry = document.RootElement
                .GetProperty("props").GetProperty("pageProps")
                .GetProperty("game").GetProperty("data").GetProperty("game")[0];

            var parsed = entry.Deserialize<HltbGameJson>(JsonOptions)
                ?? throw new HltbException(
                    $"HowLongToBeat's page for game {hltbId} held no game.");

            return Map(parsed);
        }
        catch (Exception exception) when (exception is JsonException or KeyNotFoundException
                                              or IndexOutOfRangeException
                                              or InvalidOperationException)
        {
            throw new HltbException(
                $"HowLongToBeat's embedded data for game {hltbId} was not the expected shape.",
                exception);
        }
    }

    private static HltbGame Map(HltbGameJson source) => new(
        source.GameId,
        source.GameName ?? string.Empty,
        [.. (source.GameAlias ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)],
        YearOf(source.ReleaseWorld),
        HoursOf(source.CompMain),
        HoursOf(source.CompPlus),
        HoursOf(source.Comp100));

    /// <summary>
    /// Seconds to hours, or nothing.
    ///
    /// Nought in means nobody has submitted a time, which is a different claim from the game
    /// taking no time and is stored as null for that reason. So does anything past 999.99, which
    /// numeric(5,2) would throw on rather than round — and only that tier is lost, since its
    /// siblings are still perfectly good numbers. So does anything that rounds away to nought,
    /// which would otherwise trip the same check constraint on the way in.
    /// </summary>
    private static decimal? HoursOf(int seconds)
    {
        if (seconds <= 0)
        {
            return null;
        }

        var hours = decimal.Round(seconds / 3600m, 2);
        return hours > 0 && hours <= MaximumStorableHours ? hours : null;
    }

    /// <summary>Either an integer year, or the front of a date. See HltbGameJson.ReleaseWorld.</summary>
    private static int? YearOf(JsonElement? released) => released switch
    {
        { ValueKind: JsonValueKind.Number } number => number.GetInt32(),
        { ValueKind: JsonValueKind.String } text when
            int.TryParse(
                text.GetString().AsSpan(0, Math.Min(4, text.GetString()!.Length)),
                CultureInfo.InvariantCulture,
                out var year) => year,
        _ => null,
    };

    private static string Excerpt(string body) =>
        body.Length <= 200 ? body : body[..200] + "…";

    [GeneratedRegex(
        """<script id="__NEXT_DATA__"[^>]*>(.*?)</script>""",
        RegexOptions.Singleline)]
    private static partial Regex NextDataPattern();
}
