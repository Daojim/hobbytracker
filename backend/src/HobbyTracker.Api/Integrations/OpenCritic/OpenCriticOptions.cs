using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Integrations.OpenCritic;

public class OpenCriticOptions
{
    public const string SectionName = "OpenCritic";

    /// <summary>
    /// The RapidAPI key OpenCritic's API is sold through, sent as <c>X-RapidAPI-Key</c>.
    ///
    /// <para>
    /// <b>Optional, and the only credential here that is.</b> IGDB, TMDB, MAL and both sign-ins
    /// refuse to boot without theirs; this one does not, because the app has something to show
    /// without it. OpenCritic's row in the journal is its link alone, from Wikidata's id or a pin,
    /// and nothing is asked of OpenCritic at all — no request, so no refusal to log. The score
    /// arrives once a key is set. That is also why a test host needs no line for it.
    /// </para>
    ///
    /// <para>
    /// Supplied via user-secrets in development, never appsettings.json, and in a deployment as
    /// <c>OpenCritic__ApiKey</c> from <c>OPENCRITIC_API_KEY</c> in the server's <c>.env</c>. The
    /// free plan is 200 requests and 25 searches a day; this app never searches. Sign up at
    /// https://rapidapi.com/opencritic-opencritic-default/api/opencritic-api.
    /// </para>
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>Must keep the trailing slash, or relative request paths resolve one level too high.</summary>
    [Required(AllowEmptyStrings = false)]
    public string BaseUrl { get; set; } = "https://opencritic-api.p.rapidapi.com/";

    /// <summary>
    /// What RapidAPI is told the request is for, as <c>X-RapidAPI-Host</c>. A setting of its own
    /// rather than read off <see cref="BaseUrl"/>, because the end-to-end suite points the base at
    /// a local stub and the stub still expects the host RapidAPI would be sent.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    public string Host { get; set; } = "opencritic-api.p.rapidapi.com";

    [Range(1, 120)]
    public int RequestTimeoutSeconds { get; set; } = 15;
}
