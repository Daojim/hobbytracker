using HobbyTracker.Api.Infrastructure;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Whose rows a directly-constructed service is working on.
///
/// Only needed where a test builds a service by hand rather than resolving it from the host —
/// everything reached over HTTP gets the real <see cref="CurrentUser"/> reading the claim that
/// <see cref="TestAuthHandler"/> put there.
///
/// Constructed with no id it behaves exactly as production does outside a request: signed in is
/// false, and asking for the id throws rather than quietly answering nobody.
/// </summary>
public sealed class FakeCurrentUser(int? id = null) : ICurrentUser
{
    public bool IsSignedIn => id is not null;

    public int Id => id ?? throw new InvalidOperationException("No user is signed in.");
}
