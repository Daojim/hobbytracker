using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using HobbyTracker.Api.Integrations.Mal.Models;

namespace HobbyTracker.Api.Integrations.Mal;

public interface IMalClient
{
    /// <summary>
    /// Anime matching a title, in MAL's own order, cut to <paramref name="limit"/> by MAL.
    ///
    /// <b>MAL prefix-matches, so this is one query where IGDB needs two.</b> `frier`,
    /// `attack on t` and `cowboy bebo` all find the right title, and `fma` finds Fullmetal
    /// Alchemist through its synonyms — IGDB needed a merged pair only because its `search`
    /// does no prefix matching whatever, and that problem is simply absent here.
    ///
    /// The order, however, is wrong for a person and is re-ranked by
    /// <c>MalRelevance</c> before anybody sees it: `frier` returns 2nd Season above season one,
    /// and `cowboy bebo` returns the film above the series.
    /// </summary>
    Task<IReadOnlyList<MalAnime>> SearchAsync(
        string search, int limit, CancellationToken cancellationToken);

    /// <summary>
    /// One title in full. <b>Null when MAL does not know the id</b> — an answer rather than a
    /// failure, so a withdrawn entry is distinguishable from an outage.
    /// </summary>
    Task<MalAnime?> GetAsync(int id, CancellationToken cancellationToken);
}

/// <summary>
/// MyAnimeList v2, over ordinary REST.
///
/// <b>The TMDB shape, not the IGDB one, and for the same reason: there is no handshake.</b> A
/// client id is stamped on every request as a header, set once on the typed client in
/// Program.cs — it does not expire, so there is nothing for a DelegatingHandler to do. See
/// <see cref="MalOptions.ClientId"/> for why that works at all, which MAL does not document.
///
/// Two things about MAL differ from TMDB and both are recorded where they bite:
///
/// <list type="bullet">
/// <item><b>Search and detail are one shape.</b> Both endpoints take the same `fields` and
/// answer with the same node, so there is one wire model rather than two — and one field list,
/// stated once below, rather than two that would have to agree.</item>
/// <item><b>The search envelope wraps each result in `node`.</b> A reader that took `data[]`
/// directly would get a list of objects with nothing but a `node` property: every id nought and
/// every title null, and the upsert would skip all of them without erroring.</item>
/// </list>
/// </summary>
public sealed class MalClient(HttpClient httpClient, ILogger<MalClient> logger) : IMalClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    /// <summary>
    /// Everything beyond an id, a title and a picture has to be asked for by name.
    ///
    /// <b>One list for both endpoints, and that is the point of it.</b> A field missing from
    /// here deserialises to null and looks exactly like a title MAL has nothing to say about —
    /// so a column added to `anime` without a word added here fills with nulls for ever and
    /// nothing reports it. `MalClientTests` asserts this list rather than trusting it.
    ///
    /// `id` and `title` are stated even though a node carries them regardless, because a reader
    /// of this line should not have to know that exception to understand what comes back.
    /// </summary>
    private const string Fields =
        "id,title,main_picture,alternative_titles,media_type,num_episodes,"
        + "average_episode_duration,start_season,status,source,mean,num_list_users,genres,studios";

    public async Task<IReadOnlyList<MalAnime>> SearchAsync(
        string search, int limit, CancellationToken cancellationToken)
    {
        // The limit is asked for rather than applied afterwards. MAL honours it and caps at 100;
        // TMDB pages at a fixed twenty and leaves the cut to the caller.
        var path = $"anime?q={Uri.EscapeDataString(search)}&limit={limit}&fields={Fields}";

        var page = await GetJsonAsync<MalSearchPage>(path, cancellationToken);

        // Unwrapped here rather than handed out as an envelope: a `node` per result is MAL's
        // transport, and nothing above this layer should have to know it exists.
        return [.. (page?.Data ?? []).Select(entry => entry.Node).OfType<MalAnime>()];
    }

    public Task<MalAnime?> GetAsync(int id, CancellationToken cancellationToken) =>
        // The same fields as a search, because it is the same shape being read into the same
        // columns. Two lists that had to agree is exactly the drift one list avoids.
        GetJsonAsync<MalAnime>($"anime/{id}?fields={Fields}", cancellationToken);

    private async Task<T?> GetJsonAsync<T>(string path, CancellationToken cancellationToken)
        where T : class
    {
        logger.LogDebug("MAL request: {Path}", path);

        HttpResponseMessage response;
        try
        {
            response = await httpClient.GetAsync(path, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new MalException("Could not reach MyAnimeList.", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            // Distinguish the client's own timeout from the caller walking away.
            throw new MalException("MyAnimeList did not respond within the configured timeout.", ex);
        }

        using (response)
        {
            // Not an exception. An id MAL has never heard of is a fact the caller can act on,
            // where an exception here would make a withdrawn entry indistinguishable from an
            // outage — and the backfill would blank a card over it.
            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return null;
            }

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                // MAL advertises no rate-limit headers at all, so there is nothing here to back
                // off *towards*: no remaining count, no reset time, no documented ceiling.
                // Arriving here means something is wrong rather than merely busy, and saying so
                // is more use than a retry against a limit nobody has published.
                throw new MalException("MyAnimeList rate limit exceeded.");
            }

            if (!response.IsSuccessStatusCode)
            {
                // MAL puts its reason in `message` and `error`, which is the useful half of a
                // 401 on a client id that has been revoked.
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new MalException($"MAL {path} returned {(int)response.StatusCode}: {body}");
            }

            try
            {
                return await response.Content.ReadFromJsonAsync<T>(JsonOptions, cancellationToken);
            }
            catch (JsonException ex)
            {
                throw new MalException("MAL returned a response that could not be parsed.", ex);
            }
        }
    }

    /// <summary>The envelope `/anime?q=` wraps its results in — a list of `{ "node": { … } }`.</summary>
    private sealed class MalSearchPage
    {
        public List<MalSearchEntry>? Data { get; init; }
    }

    private sealed class MalSearchEntry
    {
        public MalAnime? Node { get; init; }
    }
}
