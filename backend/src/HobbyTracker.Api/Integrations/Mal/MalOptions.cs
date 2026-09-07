using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Integrations.Mal;

public class MalOptions
{
    public const string SectionName = "Mal";

    /// <summary>
    /// MyAnimeList's client id, sent as `X-MAL-CLIENT-ID` on every request.
    ///
    /// <b>This alone is enough for public data, and MAL does not document that.</b> Their own
    /// docs describe only the OAuth2 authorization-code flow with PKCE, which needs a human to
    /// sign in and a token to be refreshed — hopeless for server-side metadata. Client-ID-only
    /// is what every third-party wrapper does, and it was measured working against search and
    /// detail before any of this was written.
    ///
    /// So there is no DelegatingHandler in this integration at all: one header, no handshake,
    /// no expiry, no refresh. TMDB's static-token shape rather than IGDB's.
    ///
    /// <b>There is deliberately no client secret.</b> It signs the OAuth token exchange, which
    /// this app never performs. MAL shows it again on the app's own configuration page if
    /// "import my MAL list" is ever built.
    ///
    /// Supplied via user-secrets in development, never appsettings.json. Register an app at
    /// https://myanimelist.net/apiconfig.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    public string ClientId { get; set; } = string.Empty;

    /// <summary>Must keep the trailing slash, or relative request paths resolve one level too high.</summary>
    [Required(AllowEmptyStrings = false)]
    public string BaseUrl { get; set; } = "https://api.myanimelist.net/v2/";

    /// <summary>
    /// Results asked for when the caller does not say.
    ///
    /// Asked for rather than cut afterwards, which is the one place this differs from TMDB:
    /// MAL takes a `limit` and honours it, where TMDB pages at a fixed twenty and leaves the
    /// cut to the client. MAL's own ceiling is 100.
    /// </summary>
    [Range(1, 100)]
    public int DefaultSearchLimit { get; set; } = 20;

    [Range(1, 120)]
    public int RequestTimeoutSeconds { get; set; } = 15;
}
