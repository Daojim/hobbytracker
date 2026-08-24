using System.Globalization;
using System.Security.Claims;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

/// <summary>
/// Signing in, signing out, and saying who you are.
///
/// There is no callback action here: the provider comes back to the handler's own
/// <c>CallbackPath</c>, which the framework owns. What is left is the two ends of it.
/// </summary>
[ApiController]
[Route("api/auth")]
[AllowAnonymous]
public sealed class AuthController(
    IAuthService users,
    IAuthenticationSchemeProvider schemes) : ControllerBase
{
    /// <summary>
    /// Sends the browser off to the provider. A navigation rather than a fetch — this answers
    /// with a 302 to somebody else's site, which no XHR can usefully follow.
    /// </summary>
    [HttpGet("{provider}/start")]
    public async Task<IActionResult> Start(string provider, [FromQuery] string? returnUrl)
    {
        var scheme = await schemes.GetSchemeAsync(provider);

        // The cookie scheme is the one thing registered here that is not an external provider,
        // so excluding it is the whole of the check. Challenging it would ask the app to sign
        // you in to itself, which is a redirect loop rather than a sign-in.
        if (scheme is null
            || string.Equals(
                scheme.Name, CookieAuthenticationDefaults.AuthenticationScheme, StringComparison.Ordinal))
        {
            ModelState.AddModelError(
                nameof(provider), $"There is no sign-in provider called '{provider}'.");
            return ValidationProblem(ModelState);
        }

        // returnUrl decides where the callback drops you, so an unchecked one is an open
        // redirect wearing a sign-in link. Refused rather than quietly ignored: a link carrying
        // a foreign one is either an attack or a bug, and both are worth hearing about.
        // IsLocalUrl is what catches "//evil.example", which passes a naive leading-slash test
        // and is a URL with no scheme rather than a path.
        if (returnUrl is not null && !Url.IsLocalUrl(returnUrl))
        {
            ModelState.AddModelError(
                nameof(returnUrl), "returnUrl must be a path on this site, e.g. /board.");
            return ValidationProblem(ModelState);
        }

        return Challenge(
            new AuthenticationProperties { RedirectUri = returnUrl ?? "/" }, scheme.Name);
    }

    /// <summary>
    /// Who is signed in, or null.
    ///
    /// Null and 200 rather than a 401, on two counts. This is the frontend's "am I signed in"
    /// probe, so refusing it would trip the very handler that sends you to sign-in — the query
    /// would redirect on its own answer. And it is the end-to-end harness's readiness URL,
    /// which has to stay reachable before anybody has signed in at all.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        MeDto? me = int.TryParse(claim, CultureInfo.InvariantCulture, out var userId)
            ? await users.MeAsync(userId, cancellationToken)
            : null;

        // JsonResult rather than Ok(), and the difference is not cosmetic: Ok(null) is an
        // ObjectResult with a null value, which HttpNoContentOutputFormatter turns into a 204
        // with no body at all. The caller then parses an empty string as JSON and fails a long
        // way from the cause. JsonResult writes the literal null, which is what was meant.
        return new JsonResult(me);
    }

    /// <summary>
    /// Ends the session. POST rather than GET so that an image tag on someone else's page
    /// cannot sign you out by being loaded.
    /// </summary>
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }
}
