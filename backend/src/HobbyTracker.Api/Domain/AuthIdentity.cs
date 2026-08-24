namespace HobbyTracker.Api.Domain;

/// <summary>
/// One external login bound to a <see cref="User"/>. Split out from Users so the same person
/// can attach Google and Discord to a single account later without ending up with two
/// profiles and two backlogs.
/// </summary>
public class AuthIdentity
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }

    /// <summary>OAuth provider slug, e.g. "google", "discord".</summary>
    public required string Provider { get; set; }

    /// <summary>The provider's own subject id. Unique in combination with <see cref="Provider"/>.</summary>
    public required string ProviderUserId { get; set; }

    /// <summary>Email as reported by the provider. Informational — not a login key.</summary>
    public string? Email { get; set; }
}

/// <summary>
/// The vocabulary of <see cref="AuthIdentity.Provider"/>, and also the OAuth scheme names
/// registered in <c>Program.cs</c> and the <c>{provider}</c> segment of the sign-in routes.
///
/// One string doing all three jobs on purpose: a mapping between a scheme name and a stored
/// value is a table that can disagree with itself, and the disagreement would show up as
/// somebody signing in twice and getting two boards.
/// </summary>
public static class AuthProviders
{
    public const string Google = "google";
    public const string Discord = "discord";
}
