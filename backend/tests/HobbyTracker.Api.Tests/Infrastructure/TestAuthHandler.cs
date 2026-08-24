using System.Globalization;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Signs a test in by header instead of by cookie.
///
/// Registered only under the "Testing" environment, so nothing production authenticates with is
/// what the suite is trusting. The division is deliberate rather than a compromise: these tests
/// are about authorization and scoping — who may see which rows — and the OAuth dance that
/// decides who you are is proved end to end against the Google stub, where the real handler runs.
///
/// A header rather than a fixed user baked into the host, because the tests that matter most
/// need one case to act as two people.
/// </summary>
public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";
    public const string UserHeader = "X-Test-User";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(UserHeader, out var raw)
            || !int.TryParse(raw.ToString(), CultureInfo.InvariantCulture, out var userId))
        {
            // NoResult rather than Fail: no header is an anonymous caller, which is an ordinary
            // thing to be. Fail would turn every unauthenticated request into an error.
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, userId.ToString(CultureInfo.InvariantCulture))],
            SchemeName);

        return Task.FromResult(AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}
