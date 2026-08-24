using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// Who is signed in, as the app needs to say it: a name for the header, and an id so the
/// frontend can tell one session from another.
///
/// Deliberately not the email or the provider. Nothing displays either yet, and a contract
/// carrying a field nothing reads is a promise somebody has to keep later for no reason.
/// </summary>
public sealed record MeDto(int Id, string DisplayName)
{
    public static MeDto From(User user) => new(user.Id, user.DisplayName);
}
