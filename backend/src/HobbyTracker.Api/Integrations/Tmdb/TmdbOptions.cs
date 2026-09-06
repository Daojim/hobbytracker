using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Integrations.Tmdb;

public class TmdbOptions
{
    public const string SectionName = "Tmdb";

    /// <summary>
    /// TMDB's v4 read access token, sent as `Authorization: Bearer`.
    ///
    /// One token, no handshake and no expiry — which is the whole reason there is no
    /// DelegatingHandler here where IGDB needs one. Supplied via user-secrets in development,
    /// never appsettings.json. From https://www.themoviedb.org/settings/api.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>Must keep the trailing slash, or relative request paths resolve one level too high.</summary>
    [Required(AllowEmptyStrings = false)]
    public string BaseUrl { get; set; } = "https://api.themoviedb.org/3/";

    /// <summary>Where posters are served from. Published by TMDB's /configuration; pinned here.</summary>
    [Required(AllowEmptyStrings = false)]
    public string ImageBaseUrl { get; set; } = "https://image.tmdb.org/t/p/";

    /// <summary>
    /// The poster width. w342 is the rung above what a card needs at its widest, so the image
    /// is never being upscaled — the board's covers are 5:7 and size themselves from the column.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    public string PosterSize { get; set; } = "w342";

    /// <summary>
    /// Results kept when the caller does not say. TMDB pages at twenty and takes no count of
    /// its own, so this is applied to what comes back rather than asked for.
    /// </summary>
    [Range(1, 20)]
    public int DefaultSearchLimit { get; set; } = 20;

    [Range(1, 120)]
    public int RequestTimeoutSeconds { get; set; } = 15;
}
