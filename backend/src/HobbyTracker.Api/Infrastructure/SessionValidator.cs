using System.Globalization;
using System.Security.Claims;
using HobbyTracker.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Turns away a session whose account no longer exists.
///
/// <para>
/// The session cookie is self-contained: who you are is sealed inside it at sign-in, and nothing
/// about it changes when the account it names is deleted. Without this, every other device keeps
/// a session naming a user with no row behind it for as long as the cookie lasts — thirty days,
/// renewed each time it is used. Its reads come back empty, which looks like a board you emptied
/// yourself, and its writes fail on the foreign key as a 500 on a request with nothing wrong
/// with it.
/// </para>
///
/// <para>
/// <b>One primary-key lookup on every request that carries a cookie.</b> The alternative is the
/// security stamp's shape — look again only every so often — which leaves that window open for
/// as long as the interval, writes 500ing all the while. At this app's scale the lookup is not
/// worth saving. A request with no cookie never gets here, because the cookie handler has no
/// principal to validate.
/// </para>
///
/// <para>
/// It lives here rather than as a lambda in <c>Program.cs</c> for <see cref="ExternalSignIn"/>'s
/// reason: that file is the composition root and nothing else.
/// </para>
/// </summary>
public static class SessionValidator
{
    public static async Task ValidateAsync(CookieValidatePrincipalContext context)
    {
        var claim = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);

        if (int.TryParse(claim, CultureInfo.InvariantCulture, out var userId))
        {
            var db = context.HttpContext.RequestServices.GetRequiredService<HobbyTrackerDbContext>();

            if (await db.Users.AnyAsync(
                    user => user.Id == userId, context.HttpContext.RequestAborted))
            {
                return;
            }
        }

        // Refused for this request, which then answers as anybody signed out does: a 401 on an
        // [Authorize] route, and null from /api/auth/me. Signed out as well, so the browser is
        // told to drop the cookie rather than send it with every request after.
        context.RejectPrincipal();
        await context.HttpContext.SignOutAsync(context.Scheme.Name);
    }
}
