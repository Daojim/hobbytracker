using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Services;

/// <summary>
/// Where a new card lands in its board column. Shared so that adding a title and replaying one
/// cannot drift apart — both must put the card on top.
/// </summary>
internal static class BoardPositions
{
    /// <summary>
    /// One below the current minimum, so the card appears at the top without renumbering
    /// anything already there.
    ///
    /// Scoped by status and by owner. Positions are compared within one person's column, so a
    /// movie lowering the minimum leaves the relative order of games exactly as it was — and
    /// somebody else's backlog cannot decide where your new cards land.
    ///
    /// The owner arrives as a parameter rather than by injection because this is static and
    /// takes the context as one too, which puts it out of reach of the container. That also
    /// makes it the easiest scoping site in the codebase to miss, which is why a test names it.
    /// </summary>
    public static async Task<int> TopOfColumnAsync(
        HobbyTrackerDbContext db,
        LogStatus status,
        int userId,
        CancellationToken cancellationToken)
    {
        var lowest = await db.LogEntries
            .Where(entry => entry.Status == status && entry.UserId == userId)
            .MinAsync(entry => (int?)entry.Position, cancellationToken);

        return (lowest ?? 0) - 1;
    }
}
