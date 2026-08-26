using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// The address the outside world reaches this app at, when that is not the address the app is
/// listening on.
///
/// Deployed, there is a proxy in front terminating TLS, so the request reaches Kestrel as plain
/// HTTP on whatever host the proxy used. Everything that has to name the app's own address then
/// names the wrong one — and the OAuth redirect URI is the expensive case, because a provider
/// refuses a callback that does not match what was registered, and the refusal arrives from
/// somebody else's server.
///
/// Null is the ordinary case and means "use the request", which is correct on localhost and in
/// both test harnesses. Pinning is what a deployment behind a proxy adds.
/// </summary>
public sealed class PublicOriginOptions
{
    public const string SectionName = "PublicOrigin";

    /// <summary>
    /// Scheme and host, no path — e.g. <c>https://hobbytracker.example</c>. Supplied by
    /// environment variable in a deployment, so the address stays out of the source.
    /// </summary>
    public string? Url { get; set; }

    /// <summary>
    /// Whether the value is usable, and why not when it is not.
    ///
    /// Shared by the startup validator and by the middleware that reads it, so the boot check
    /// and the thing it is protecting cannot drift into disagreeing about what a valid origin
    /// is. Absent counts as valid: not configuring a pin is a choice, not a mistake.
    /// </summary>
    public static bool TryParse(string? url, out Uri? origin, out string? failure)
    {
        origin = null;
        failure = null;

        if (string.IsNullOrWhiteSpace(url))
        {
            return true;
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsed))
        {
            failure = "must be an absolute URL, e.g. https://hobbytracker.example.";
            return false;
        }

        if (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps)
        {
            failure = "must be http or https.";
            return false;
        }

        // A path here would be silently dropped rather than honoured: the OAuth handler builds
        // its callback from the scheme and host and its own CallbackPath, so a value carrying
        // one is somebody expecting this app to be mounted under a sub-path. It is not, and
        // saying so at boot is better than a redirect URI that quietly loses a segment.
        if (parsed.AbsolutePath != "/")
        {
            failure = "must be a scheme and host only, with no path.";
            return false;
        }

        origin = parsed;
        return true;
    }
}

/// <summary>
/// Fails the boot on an origin that cannot be used, naming the key and the reason.
///
/// A class rather than a <c>.Validate(predicate, message)</c> pair for the reason
/// <see cref="ValidateAuthOptions"/> is one: there are three separate ways to get this wrong —
/// not absolute, not http, carrying a path — and a single static message covering all three
/// tells somebody staring at a failed deployment less than the one that applies.
/// </summary>
public sealed class ValidatePublicOriginOptions : IValidateOptions<PublicOriginOptions>
{
    public ValidateOptionsResult Validate(string? name, PublicOriginOptions options)
    {
        return PublicOriginOptions.TryParse(options.Url, out _, out var failure)
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(
                $"{PublicOriginOptions.SectionName}:{nameof(PublicOriginOptions.Url)} {failure}");
    }
}
