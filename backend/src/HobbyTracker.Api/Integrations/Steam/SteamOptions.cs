using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Integrations.Steam;

public class SteamOptions
{
    public const string SectionName = "Steam";

    /// <summary>
    /// Steam's Web API. Must keep the trailing slash, or relative request paths resolve one level
    /// too high.
    ///
    /// <b>No key, and so no secret anywhere in this block.</b> The one route this app calls,
    /// <c>IUserReviewsService/GetAppReviews</c>, answers without one — measured on 12 November 2026
    /// over all 83 apps the user's board names. Keyless answers share one rate limit with every
    /// other keyless caller, which is why a 429 is the provider being unhappy rather than a thing
    /// to retry here. See docs/games-reviews.md.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    public string BaseUrl { get; set; } = "https://api.steampowered.com/";

    [Range(1, 120)]
    public int RequestTimeoutSeconds { get; set; } = 15;
}
