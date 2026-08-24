using System.Globalization;
using System.Security.Claims;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Whose data this request is about.
///
/// Injected into the services rather than applied as an EF global query filter, and that is a
/// choice rather than an oversight. A filter would scope every read automatically — including
/// the three navigations inside <c>LibraryService.BoardQuery</c> and the note queries that have
/// no user column of their own — but it would be invisible at the call site, and a scoping rule
/// nobody can see while reading the query is one nobody can review. A filter going wrong also
/// empties the board rather than erroring, which is the silent failure this codebase has already
/// paid for twice. And the test fixture builds its context by hand with no container to read a
/// filter's user out of.
/// </summary>
public interface ICurrentUser
{
    /// <summary>
    /// The signed-in user's id.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// When nobody is signed in. Throwing is deliberate: every path that reads this sits behind
    /// [Authorize], so reaching it anonymously is a wiring mistake rather than a caller's doing,
    /// and a 500 naming it beats a query quietly scoped to nobody and a board that came back
    /// empty for reasons no one can see.
    /// </exception>
    int Id { get; }

    /// <summary>
    /// Whether there is anybody to ask about. Background work has no request behind it — see
    /// <c>HltbWorker</c>, which resolves a scope of its own — so the paths that do not need a
    /// user have to be able to say so rather than crash.
    /// </summary>
    bool IsSignedIn { get; }
}

public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public bool IsSignedIn => Read() is not null;

    public int Id => Read() ?? throw new InvalidOperationException(
        "No user is signed in. A service that scopes by user was reached outside an authorized "
        + "request, which is a wiring mistake rather than something a caller can cause.");

    private int? Read()
    {
        var claim = accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);

        return int.TryParse(claim, CultureInfo.InvariantCulture, out var id) ? id : null;
    }
}
