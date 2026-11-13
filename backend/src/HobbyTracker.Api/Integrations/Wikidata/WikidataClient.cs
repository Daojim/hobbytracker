using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Integrations.Wikidata;

public interface IWikidataClient
{
    /// <summary>
    /// OpenCritic's numbers for a game, found by its IGDB slug. Empty when Wikidata ties the slug
    /// to none, which it does for about a third of a real board.
    /// </summary>
    Task<IReadOnlyList<int>> GetOpenCriticIdsAsync(string igdbSlug, CancellationToken cancellationToken);
}

/// <summary>
/// Wikidata's query service, asked one thing: which OpenCritic ids sit on the item that carries a
/// given IGDB slug.
///
/// <para>
/// <b>Why Wikidata, and not OpenCritic's own search.</b> IGDB links neither OpenCritic nor
/// Metacritic, so the plan was to search OpenCritic by name and refuse when unsure, as
/// HowLongToBeat's matcher does. Wikidata files IGDB's id (P5794, which is IGDB's slug) and
/// OpenCritic's (P2864) on the same item, so this finds the id with no matching and no key: 61 of
/// the user's 91 titles on 12 November 2026. Of the 30 it does not, 10 were not out, 11 came out
/// before OpenCritic, and 9 were later versions Wikidata files under the original if at all.
/// </para>
///
/// <para>
/// Keyless and read-only, with one header that matters: a User-Agent naming the app, which
/// Wikimedia asks of every program reading its query service and throttles the ones that leave out.
/// </para>
/// </summary>
public sealed class WikidataClient(
    HttpClient httpClient,
    IOptions<WikidataOptions> options,
    ILogger<WikidataClient> logger) : IWikidataClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly WikidataOptions _options = options.Value;

    public async Task<IReadOnlyList<int>> GetOpenCriticIdsAsync(
        string igdbSlug, CancellationToken cancellationToken)
    {
        // Every item carrying IGDB's slug, and every OpenCritic id on those items. More than one is
        // ordinary — NieR: Automata's item carries the game and two editions — and choosing between
        // them needs OpenCritic's names, which is the caller's business.
        var query = string.Create(
            CultureInfo.InvariantCulture,
            $"SELECT ?oc WHERE {{ ?item wdt:P5794 \"{Escape(igdbSlug)}\" . ?item wdt:P2864 ?oc . }}");

        logger.LogDebug("Wikidata query: {Query}", query);

        using var request = new HttpRequestMessage(HttpMethod.Post, _options.Endpoint)
        {
            Content = new FormUrlEncodedContent([new KeyValuePair<string, string>("query", query)]),
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/sparql-results+json"));
        request.Headers.TryAddWithoutValidation("User-Agent", _options.UserAgent);

        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(request, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new WikidataException("Could not reach Wikidata.", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new WikidataException("Wikidata did not respond within the configured timeout.", ex);
        }

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                throw new WikidataException("Wikidata rate limit exceeded.");
            }

            if (!response.IsSuccessStatusCode)
            {
                // The query service answers a question it could not finish in time with a 500 and
                // a stack trace, which is a failure to ask about again rather than an answer of none.
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new WikidataException(
                    $"Wikidata returned {(int)response.StatusCode}: {body[..Math.Min(body.Length, 300)]}");
            }

            SparqlResults? results;
            try
            {
                results = await response.Content.ReadFromJsonAsync<SparqlResults>(JsonOptions, cancellationToken);
            }
            catch (JsonException ex)
            {
                throw new WikidataException("Wikidata returned a response that could not be parsed.", ex);
            }

            // OpenCritic's ids are numbers, and the journal builds a link from one. A value that is
            // not a number is a mistake on Wikidata's side, and a link built from it goes nowhere.
            return
            [
                .. (results?.Results?.Bindings ?? [])
                    .Select(binding => binding.Oc?.Value)
                    .Select(value => int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var id)
                        ? id
                        : (int?)null)
                    .Where(id => id is > 0)
                    .Select(id => id!.Value)
                    .Distinct(),
            ];
        }
    }

    /// <summary>
    /// A SPARQL string literal's escaping, for the two characters that could end it early. IGDB's
    /// slugs are letters, digits and hyphens, but this is a string written into a query.
    /// </summary>
    private static string Escape(string value)
    {
        var builder = new StringBuilder(value.Length);

        foreach (var character in value)
        {
            switch (character)
            {
                case '\\':
                    builder.Append(@"\\");
                    break;
                case '"':
                    builder.Append("\\\"");
                    break;
                case '\n' or '\r':
                    builder.Append(' ');
                    break;
                default:
                    builder.Append(character);
                    break;
            }
        }

        return builder.ToString();
    }

    /// <summary><c>{ "results": { "bindings": [ { "oc": { "value": "3540" } } ] } }</c>.</summary>
    private sealed class SparqlResults
    {
        public SparqlBindings? Results { get; init; }
    }

    private sealed class SparqlBindings
    {
        public List<SparqlBinding>? Bindings { get; init; }
    }

    private sealed class SparqlBinding
    {
        public SparqlValue? Oc { get; init; }
    }

    private sealed class SparqlValue
    {
        public string? Value { get; init; }
    }
}
