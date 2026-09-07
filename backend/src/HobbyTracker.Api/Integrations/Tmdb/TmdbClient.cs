using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using HobbyTracker.Api.Integrations.Tmdb.Models;

namespace HobbyTracker.Api.Integrations.Tmdb;

public interface ITmdbClient
{
    /// <summary>
    /// Films matching a title, best first, cut to <paramref name="limit"/>.
    ///
    /// Carries no runtime and no genre names — that is the endpoint, not a shortcut. See
    /// <see cref="GetMovieAsync"/>.
    /// </summary>
    Task<IReadOnlyList<TmdbMovie>> SearchMoviesAsync(
        string search, int limit, CancellationToken cancellationToken);

    /// <summary>
    /// One film in full, credits included. **Null when TMDB does not know the id** — an answer
    /// rather than a failure.
    /// </summary>
    Task<TmdbMovieDetail?> GetMovieAsync(int id, CancellationToken cancellationToken);

    /// <summary>
    /// Shows matching a title, best first, cut to <paramref name="limit"/>.
    ///
    /// Carries no season counts, no creators and no status — that is the endpoint, not a
    /// shortcut. See <see cref="GetTvAsync"/>.
    /// </summary>
    Task<IReadOnlyList<TmdbTvShow>> SearchTvAsync(
        string search, int limit, CancellationToken cancellationToken);

    /// <summary>
    /// One show in full, its seasons and creators included. **Null when TMDB does not know the
    /// id**, exactly as for a film.
    /// </summary>
    Task<TmdbTvShowDetail?> GetTvAsync(int id, CancellationToken cancellationToken);
}

/// <summary>
/// TMDB v3, over ordinary REST.
///
/// Three things differ from <c>IgdbClient</c>, and all three are TMDB being easier rather than
/// this being written differently for its own sake:
///
/// <list type="bullet">
/// <item><b>No auth handler.</b> The credential is one static bearer token with no expiry, set
/// on the typed client in Program.cs. IgdbAuthHandler exists because a Twitch token expires and
/// a 401 has to be replayed once; there is nothing here for such a handler to do.</item>
/// <item><b>A query string, not a body.</b> APIcalypse has no counterpart here.</item>
/// <item><b>Two endpoints, not one.</b> `/search/movie` has no runtime and names no genre, so
/// everything a card shows beyond a title and a poster comes from `/movie/{id}`. That is why
/// enrichment happens when a title is added rather than when it is found.</item>
/// </list>
/// </summary>
public sealed class TmdbClient(HttpClient httpClient, ILogger<TmdbClient> logger) : ITmdbClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    public async Task<IReadOnlyList<TmdbMovie>> SearchMoviesAsync(
        string search, int limit, CancellationToken cancellationToken)
    {
        // include_adult stated rather than left to TMDB's default: it is theirs to change, and
        // a board is not where anybody wants to find out that it did.
        var path = $"search/movie?query={Uri.EscapeDataString(search)}"
            + "&include_adult=false&language=en-US&page=1";

        var page = await GetAsync<TmdbSearchPage>(path, cancellationToken);

        // TMDB pages at twenty and takes no count of its own, so the cut is ours to make. Here
        // rather than at each call site, because one of those would forget.
        return [.. (page?.Results ?? []).Take(limit)];
    }

    public Task<TmdbMovieDetail?> GetMovieAsync(int id, CancellationToken cancellationToken) =>
        // One request for what would otherwise be two. `credits` is where the director is, and
        // a film's byline is the only place a person's name appears in the drawer.
        GetAsync<TmdbMovieDetail>(
            $"movie/{id}?append_to_response=credits&language=en-US", cancellationToken);

    public async Task<IReadOnlyList<TmdbTvShow>> SearchTvAsync(
        string search, int limit, CancellationToken cancellationToken)
    {
        var path = $"search/tv?query={Uri.EscapeDataString(search)}"
            + "&include_adult=false&language=en-US&page=1";

        var page = await GetAsync<TmdbTvSearchPage>(path, cancellationToken);

        return [.. (page?.Results ?? []).Take(limit)];
    }

    public Task<TmdbTvShowDetail?> GetTvAsync(int id, CancellationToken cancellationToken) =>
        // No append_to_response, and that is not an oversight. A film needs `credits` appended
        // because its director is buried in a crew list hundreds long; a show's created_by and
        // its seasons are both on the base response, so appending anything here would imply a
        // dependency that does not exist.
        GetAsync<TmdbTvShowDetail>($"tv/{id}?language=en-US", cancellationToken);

    private async Task<T?> GetAsync<T>(string path, CancellationToken cancellationToken)
        where T : class
    {
        logger.LogDebug("TMDB request: {Path}", path);

        HttpResponseMessage response;
        try
        {
            response = await httpClient.GetAsync(path, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new TmdbException("Could not reach TMDB.", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            // Distinguish the client's own timeout from the caller walking away.
            throw new TmdbException("TMDB did not respond within the configured timeout.", ex);
        }

        using (response)
        {
            // Not an exception. An id TMDB has never heard of is a fact the caller can act on,
            // where an exception here would make a stale id indistinguishable from an outage.
            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return null;
            }

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                // TMDB retired its documented 40-per-10-seconds limit in 2019 and now says only
                // that there is one "somewhere in the 40 requests per second range". Nothing
                // this app does approaches that, so arriving here means something is wrong
                // rather than merely busy — worth saying out loud instead of backing off.
                throw new TmdbException("TMDB rate limit exceeded.");
            }

            if (!response.IsSuccessStatusCode)
            {
                // TMDB puts the reason in `status_message`, which is the useful half of a 401
                // on a bad token.
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new TmdbException($"TMDB {path} returned {(int)response.StatusCode}: {body}");
            }

            try
            {
                return await response.Content.ReadFromJsonAsync<T>(JsonOptions, cancellationToken);
            }
            catch (JsonException ex)
            {
                throw new TmdbException("TMDB returned a response that could not be parsed.", ex);
            }
        }
    }

    /// <summary>The envelope `/search/tv` wraps its results in.</summary>
    private sealed class TmdbTvSearchPage
    {
        public List<TmdbTvShow>? Results { get; init; }
    }

    /// <summary>The envelope `/search/movie` wraps its results in.</summary>
    private sealed class TmdbSearchPage
    {
        public List<TmdbMovie>? Results { get; init; }
    }
}
