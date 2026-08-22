using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using HobbyTracker.Api.Integrations.Igdb.Models;

namespace HobbyTracker.Api.Integrations.Igdb;

public interface IIgdbClient
{
    Task<IReadOnlyList<IgdbGame>> SearchGamesAsync(
        string search, int limit, CancellationToken cancellationToken);

    /// <summary>
    /// Known games by IGDB id, for the backfill. Empty in, empty out — without asking IGDB.
    /// </summary>
    Task<IReadOnlyList<IgdbGame>> GetGamesAsync(
        IEnumerable<int> ids, CancellationToken cancellationToken);
}

/// <summary>
/// Typed client for IGDB v4. Knows how to write APIcalypse queries and nothing else —
/// authentication is bolted on by <see cref="IgdbAuthHandler"/> further down the pipeline.
/// </summary>
public sealed class IgdbClient(HttpClient httpClient, ILogger<IgdbClient> logger) : IIgdbClient
{
    /// <summary>IGDB returns snake_case keys; this maps them onto PascalCase properties.</summary>
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    // APIcalypse is IGDB's query language, sent as the POST body in text/plain.
    //
    // cover.image_id rather than cover.url: `url` comes back protocol-relative and pinned to
    // the thumbnail size (//images.igdb.com/igdb/image/upload/t_thumb/co2l7l.jpg), so using
    // it means string surgery on every read. The id composes cleanly instead — see IgdbImage.
    //
    // involved_companies.developer alongside the company name because IGDB has no "developer"
    // field on a game: involvement is a join carrying role flags, so we fetch both and filter.
    private const string SearchFields =
        "fields id, name, first_release_date, cover.image_id, platforms.name, genres.name, " +
        "involved_companies.developer, involved_companies.company.name;";

    public Task<IReadOnlyList<IgdbGame>> SearchGamesAsync(
        string search, int limit, CancellationToken cancellationToken)
    {
        var query = $"""
            search "{SanitizeSearchTerm(search)}";
            {SearchFields}
            limit {limit};
            """;

        return QueryAsync(query, cancellationToken);
    }

    /// <summary>
    /// Fetches known games by IGDB id — what the backfill uses to bring existing rows up to
    /// date after a new field is added.
    ///
    /// A where clause rather than a search: these ids are already known, so there is no
    /// relevance ranking to preserve. The caller batches; IGDB caps a response at 500.
    /// </summary>
    public Task<IReadOnlyList<IgdbGame>> GetGamesAsync(
        IEnumerable<int> ids, CancellationToken cancellationToken)
    {
        var wanted = ids.Distinct().ToList();

        // `where id = ();` is a parse error, and there is nothing to ask about anyway.
        if (wanted.Count == 0)
        {
            return Task.FromResult<IReadOnlyList<IgdbGame>>([]);
        }

        var query = $"""
            {SearchFields}
            where id = ({string.Join(',', wanted)});
            limit {wanted.Count};
            """;

        return QueryAsync(query, cancellationToken);
    }

    private async Task<IReadOnlyList<IgdbGame>> QueryAsync(
        string query, CancellationToken cancellationToken)
    {
        logger.LogDebug("IGDB query: {Query}", query);

        using var content = new StringContent(query, Encoding.UTF8, "text/plain");

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsync("games", content, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new IgdbException("Could not reach IGDB.", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            // Distinguish the client's own timeout from the caller walking away.
            throw new IgdbException("IGDB did not respond within the configured timeout.", ex);
        }

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                // IGDB allows 4 requests per second. A single user searching will not get
                // near it, so treat this as exceptional rather than backing off silently.
                throw new IgdbException("IGDB rate limit exceeded (4 requests/second).");
            }

            if (!response.IsSuccessStatusCode)
            {
                // IGDB reports malformed APIcalypse as a 400 with the parse error in the
                // body, which is by far the most useful thing to log while iterating.
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new IgdbException($"IGDB /games returned {(int)response.StatusCode}: {body}");
            }

            try
            {
                var games = await response.Content.ReadFromJsonAsync<List<IgdbGame>>(
                    JsonOptions, cancellationToken);

                return games ?? [];
            }
            catch (JsonException ex)
            {
                throw new IgdbException("IGDB returned a response that could not be parsed.", ex);
            }
        }
    }

    /// <summary>
    /// APIcalypse delimits the search term with double quotes and defines no escape sequence
    /// for a literal one, so a quote in the term would end the clause early and leave the
    /// rest of the user's input to be parsed as query syntax. Since there is no way to escape
    /// them, they come out — along with backslashes, which IGDB rejects outright.
    /// </summary>
    private static string SanitizeSearchTerm(string search) =>
        search.Replace("\"", string.Empty)
              .Replace("\\", string.Empty)
              .Replace("\n", " ")
              .Replace("\r", " ")
              .Trim();
}
