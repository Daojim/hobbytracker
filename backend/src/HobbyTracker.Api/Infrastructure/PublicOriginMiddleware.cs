using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Tells every request what address the outside world reached it at.
///
/// Deployed, a proxy terminates TLS and forwards plain HTTP, so <c>Request.Scheme</c> says
/// "http" and <c>Request.Host</c> says whatever name the proxy used on the private network.
/// Three separate things read those and all three are wrong at once: the OAuth handler builds a
/// redirect URI the provider refuses, <c>CookieSecurePolicy.SameAsRequest</c> drops the
/// <c>Secure</c> flag off the session cookie, and <c>UseHttpsRedirection</c> redirects a request
/// that already arrived over TLS.
///
/// Pinned from configuration rather than read from <c>X-Forwarded-*</c>. Deliberate: forwarded
/// headers have to be trusted to be believed, which means a <c>KnownProxies</c> list, which
/// behind a tunnel is a container address that changes whenever the container does. A pin
/// depends on nothing the network is doing and is right whatever arrives — and the app really
/// does have exactly one public address, so stating it is honest rather than a workaround.
/// </summary>
public sealed class PublicOriginMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _scheme;
    private readonly HostString _host;

    public PublicOriginMiddleware(RequestDelegate next, Uri origin)
    {
        _next = next;
        _scheme = origin.Scheme;

        // Authority rather than Host: it keeps a non-default port, which a deployment reached on
        // one would otherwise lose from every URL the app builds about itself.
        _host = new HostString(origin.Authority);
    }

    public Task InvokeAsync(HttpContext context)
    {
        context.Request.Scheme = _scheme;
        context.Request.Host = _host;

        return _next(context);
    }
}

public static class PublicOriginMiddlewareExtensions
{
    /// <summary>
    /// Adds the pin, if there is one to add.
    ///
    /// Must come before <c>UseHttpsRedirection</c> and <c>UseAuthentication</c>: the first reads
    /// <c>Request.IsHttps</c>, which is derived from the scheme this sets, and the second is
    /// where the OAuth handler builds its redirect URI. Placed after either, the pin is
    /// registered, runs, and fixes nothing.
    /// </summary>
    public static WebApplication UsePublicOrigin(this WebApplication app)
    {
        var configured = app.Services.GetRequiredService<IOptions<PublicOriginOptions>>().Value.Url;

        // Startup validation has already refused anything unparseable, so the only way through
        // here without an origin is not having configured one — which is the ordinary case on
        // localhost and in both test harnesses, and leaves the pipeline exactly as it was.
        if (!PublicOriginOptions.TryParse(configured, out var origin, out _) || origin is null)
        {
            return app;
        }

        // Logged at boot because this is the setting a deployment gets wrong, and the symptom —
        // a provider refusing a callback it was never told about — names the redirect URI rather
        // than the thing that built it.
        app.Logger.LogInformation(
            "Public origin pinned to {PublicOrigin}: requests will report that address whatever "
            + "scheme and host they actually arrived with.",
            origin.GetLeftPart(UriPartial.Authority));

        app.UseMiddleware<PublicOriginMiddleware>(origin);
        return app;
    }
}
