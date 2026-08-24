using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HobbyTracker.Api.Services;

/// <summary>
/// Who a provider says you are, as one value.
///
/// A record rather than four loose strings, because four strings in a row is exactly the
/// argument list where two get swapped in silence — and swapping the subject with the email
/// here would attach one person's board to another's address.
/// </summary>
public sealed record ExternalIdentity(
    string Provider,
    string ProviderUserId,
    string? Email,
    string? DisplayName);

public interface IAuthService
{
    /// <summary>
    /// Finds the user this external identity belongs to, creating both on a first sign-in.
    /// </summary>
    Task<User> SignInAsync(ExternalIdentity identity, CancellationToken cancellationToken);

    /// <summary>
    /// The signed-in user, or null when the session names one that no longer exists — which is
    /// a signed-out browser rather than an error.
    /// </summary>
    Task<MeDto?> MeAsync(int userId, CancellationToken cancellationToken);
}

/// <summary>
/// The half of signing in that is ours. The OAuth dance itself belongs to the framework's
/// handler; what is left is turning "Google says this is subject 1234" into a row in
/// <c>users</c>, and doing it the same way every time somebody comes back.
/// </summary>
public sealed class AuthService(
    HobbyTrackerDbContext db,
    IJournalClock clock,
    ILogger<AuthService> logger) : IAuthService
{
    /// <summary>Matches <c>display_name varchar(100)</c>. A longer name is a 500, not a warning.</summary>
    private const int DisplayNameLimit = 100;

    public async Task<User> SignInAsync(ExternalIdentity identity, CancellationToken cancellationToken)
    {
        // Normalised here rather than trusted from the caller. "Google" and "google" reaching the
        // column as different providers would let one person sign in twice and collect two boards.
        var normalised = identity with { Provider = identity.Provider.ToLowerInvariant() };

        var existing = await FindAsync(normalised, cancellationToken);
        if (existing is not null)
        {
            return await ReturningAsync(existing, normalised, cancellationToken);
        }

        var user = new User
        {
            DisplayName = DisplayNameFor(normalised),

            // Stamped explicitly even though the column defaults to now(), for the reason
            // logged_at is: the default exists so a row written by hand in psql is still valid,
            // and the service still says what it means. It also makes this testable on a
            // stopped clock.
            CreatedAt = clock.Now,
        };

        db.AuthIdentities.Add(new AuthIdentity
        {
            User = user,
            Provider = normalised.Provider,
            ProviderUserId = normalised.ProviderUserId,
            Email = normalised.Email,
        });

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return user;
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            // Two tabs, one person. The lookup above and the insert here are not one operation,
            // and the unique index on (provider, provider_user_id) is what turns the loser of
            // that race into this rather than into a second user with a second empty board.
            // The same recovery the IGDB upsert makes, for the same reason.
            logger.LogInformation(
                "Concurrent sign-in detected for {Provider}; re-reading the winning identity.",
                normalised.Provider);

            // The failed Added entities are still tracked and would shadow the real rows.
            db.ChangeTracker.Clear();

            var winner = await FindAsync(normalised, cancellationToken)
                ?? throw new InvalidOperationException(
                    "A unique violation on auth_identities left nothing to read back.");

            return await ReturningAsync(winner, normalised, cancellationToken);
        }
    }

    public async Task<MeDto?> MeAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == userId, cancellationToken);

        return user is null ? null : MeDto.From(user);
    }

    // ------------------------------------------------------------------ internals

    private Task<AuthIdentity?> FindAsync(
        ExternalIdentity identity, CancellationToken cancellationToken) => db.AuthIdentities
        .Include(candidate => candidate.User)
        .FirstOrDefaultAsync(
            candidate => candidate.Provider == identity.Provider
                         && candidate.ProviderUserId == identity.ProviderUserId,
            cancellationToken);

    /// <summary>
    /// Somebody who has been here before. The email follows the provider, because that is the
    /// only place it comes from and a stale one helps nobody; the display name does not, because
    /// the profile is the app's rather than the provider's — renaming yourself at Google should
    /// not undo a name chosen here.
    /// </summary>
    private async Task<User> ReturningAsync(
        AuthIdentity identity, ExternalIdentity incoming, CancellationToken cancellationToken)
    {
        if (identity.Email != incoming.Email)
        {
            identity.Email = incoming.Email;
            await db.SaveChangesAsync(cancellationToken);
        }

        return identity.User
               ?? throw new InvalidOperationException(
                   $"auth_identities {identity.Id} has no user behind it.");
    }

    /// <summary>
    /// Something has to go in a NOT NULL column, and a provider is free to send nothing useful.
    /// The email's local part is the most recognisable fallback available; the last resort is a
    /// word rather than a blank, because a nameless row reads as a bug wherever it is displayed.
    /// </summary>
    private static string DisplayNameFor(ExternalIdentity identity)
    {
        var name = identity.DisplayName?.Trim();

        if (string.IsNullOrEmpty(name))
        {
            var at = identity.Email?.IndexOf('@') ?? -1;
            name = at > 0 ? identity.Email![..at] : null;
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            name = "Someone";
        }

        return name.Length <= DisplayNameLimit ? name : name[..DisplayNameLimit];
    }

    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation
        };
}
