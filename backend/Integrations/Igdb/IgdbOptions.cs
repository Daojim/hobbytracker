using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Integrations.Igdb;

public class IgdbOptions
{
    public const string SectionName = "Igdb";

    /// <summary>
    /// Twitch application client id. IGDB is authenticated through Twitch, so credentials
    /// come from a Twitch dev app: https://dev.twitch.tv/console/apps.
    /// Supplied via user-secrets in development — never appsettings.json.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    public string ClientId { get; set; } = string.Empty;

    /// <summary>Twitch application client secret. See <see cref="ClientId"/>.</summary>
    [Required(AllowEmptyStrings = false)]
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>Must keep the trailing slash, or relative request paths resolve one level too high.</summary>
    [Required(AllowEmptyStrings = false)]
    public string BaseUrl { get; set; } = "https://api.igdb.com/v4/";

    [Required(AllowEmptyStrings = false)]
    public string TokenUrl { get; set; } = "https://id.twitch.tv/oauth2/token";

    /// <summary>Results requested from IGDB when the caller does not say. IGDB caps this at 500.</summary>
    [Range(1, 500)]
    public int DefaultSearchLimit { get; set; } = 20;

    [Range(1, 120)]
    public int RequestTimeoutSeconds { get; set; } = 15;
}
