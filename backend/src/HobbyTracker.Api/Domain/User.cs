namespace HobbyTracker.Api.Domain;

/// <summary>
/// A person using the app. Holds profile only — credentials live in
/// <see cref="AuthIdentity"/>, so a user is never coupled to one login provider.
/// </summary>
public class User
{
    public int Id { get; set; }

    public required string DisplayName { get; set; }

    /// <summary>The role a new account is given, which is every account sign-in makes.</summary>
    public const string UserRole = "user";

    /// <summary>
    /// The role of the account the app is run for. Only ever set by hand, with an
    /// <c>UPDATE</c> on its row: nothing in the app grants it.
    /// </summary>
    public const string AdminRole = "admin";

    /// <summary>
    /// Coarse authorization role, <see cref="UserRole"/> or <see cref="AdminRole"/>. Its one
    /// reader is the cap on an account's pictures, which the admin's account does not have.
    /// </summary>
    public string Role { get; set; } = UserRole;

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<AuthIdentity> AuthIdentities { get; set; } = [];
    public ICollection<LogEntry> LogEntries { get; set; } = [];
}
