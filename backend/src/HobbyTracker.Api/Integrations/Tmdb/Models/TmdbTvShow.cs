namespace HobbyTracker.Api.Integrations.Tmdb.Models;

/// <summary>
/// One result from `/search/tv`, and deliberately thin because the endpoint is.
///
/// **A show is `name` and `first_air_date` where a film is `title` and `release_date`**, which is
/// the one place the two TMDB endpoints are not the same shape. Reusing <see cref="TmdbMovie"/>
/// would deserialise both into nulls and say nothing about why — a title-less search result that
/// the upsert then skips, with no error anywhere.
///
/// Carries no seasons, no episode counts, no creators and no status. All of that is on
/// `/tv/{id}`, which is why a show reaches the catalogue half-known and is completed when
/// somebody puts it on their board. Wire types never leave this folder.
/// </summary>
public sealed class TmdbTvShow
{
    public int Id { get; init; }
    public string? Name { get; init; }

    /// <summary>`YYYY-MM-DD`, or an empty string for a show with no announced date.</summary>
    public string? FirstAirDate { get; init; }

    public string? PosterPath { get; init; }

    /// <summary>
    /// Genre ids, never names, and never mapped. `/3/genre/tv/list` is not called: the detail
    /// response spells its own genres out, and storing an id would be a promise to remember
    /// which language it was read in.
    /// </summary>
    public List<int>? GenreIds { get; init; }

    /// <summary>
    /// ISO 639-1, as TMDB tags the language a show was made in — `ja`, `en`, `ko`, `zh`.
    ///
    /// Here for one reason: it is half of what keeps anime off the television board. Anime is
    /// its own hobby, from MAL, so a show that is Japanese *and* animated is excluded from
    /// these results by <see cref="TmdbClient.SearchTvAsync"/>. Both halves are needed — a
    /// Japanese live-action drama is television, and Western animation is television.
    ///
    /// Read from the search response rather than the detail one, because the exclusion has to
    /// happen before anybody is offered the title. `/tv/{id}` carries the same field.
    /// </summary>
    public string? OriginalLanguage { get; init; }

    public int? VoteCount { get; init; }
    public double? Popularity { get; init; }
}
