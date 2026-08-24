namespace HobbyTracker.Api.Domain;

/// <summary>
/// A person using the app. Holds profile only — credentials live in
/// <see cref="AuthIdentity"/>, so a user is never coupled to one login provider.
/// </summary>
public class User
{
    public int Id { get; set; }

    public required string DisplayName { get; set; }

    /// <summary>
    /// Coarse authorization role, e.g. "user" or "admin". Still unused: sign-in sets it to "user"
    /// and nothing reads it. It is here for the day a route needs more than "is signed in".
    /// </summary>
    public string Role { get; set; } = "user";

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<AuthIdentity> AuthIdentities { get; set; } = [];
    public ICollection<LogEntry> LogEntries { get; set; } = [];
}
