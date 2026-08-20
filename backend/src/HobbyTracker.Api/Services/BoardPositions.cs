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
    /// Scoped by status only. Positions are compared within a column, so a movie lowering the
    /// minimum leaves the relative order of games exactly as it was.
    /// </summary>
    public static async Task<int> TopOfColumnAsync(
        HobbyTrackerDbContext db, LogStatus status, CancellationToken cancellationToken)
    {
        var lowest = await db.LogEntries
            .Where(entry => entry.Status == status)
            .MinAsync(entry => (int?)entry.Position, cancellationToken);

        return (lowest ?? 0) - 1;
    }
}
