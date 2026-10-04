using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HobbyTracker.Api.Controllers;

/// <summary>
/// Your account as a whole: what it holds, and deleting it.
///
/// A controller of its own rather than two actions on <see cref="AuthController"/>, and the
/// reason is not tidiness. That controller is <c>[AllowAnonymous]</c> at class level, and
/// <c>[AllowAnonymous]</c> beats any <c>[Authorize]</c> on an action — so a delete placed there
/// would reach <c>ICurrentUser</c> with nobody signed in and answer a 500 where it means a 401.
/// </summary>
[ApiController]
[Authorize]
[Route("api/account")]
public sealed class AccountController(IAccountService account) : ControllerBase
{
    /// <summary>
    /// What deleting would take: the titles on every board, every note, and which sign-in this
    /// account is. Facts, which the warning in Settings puts into the hobbies' own words.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<AccountDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AccountDto>> Get(CancellationToken cancellationToken) =>
        Ok(await account.SummaryAsync(cancellationToken));

    /// <summary>
    /// Deletes the account and everything that is yours, then signs this browser out.
    ///
    /// Every other device still holds a cookie naming the account, and the cookie scheme's
    /// <c>OnValidatePrincipal</c> is what turns that away on its next request — see
    /// <c>SessionValidator</c>. This response only clears the cookie of the browser that asked.
    /// </summary>
    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(CancellationToken cancellationToken)
    {
        await account.DeleteAsync(cancellationToken);
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

        return NoContent();
    }
}
