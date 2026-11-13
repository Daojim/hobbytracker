using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HobbyTracker.Api.Services;

/// <summary>
/// The games you hid from Discover (#23): hiding one, taking a hide back, and the list of them.
/// Leaving a hidden game off a list is <see cref="GameCatalogService"/>'s, beside the rest of what
/// a list leaves out.
/// </summary>
public interface IDiscoverHideService
{
    /// <summary>The games you hid, the newest hide first, each with its cover and its name.</summary>
    Task<IReadOnlyList<HiddenTitleDto>> HiddenAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Hides a game from every Discover list, for you, until you take it back. False when no game
    /// has that media id. A game hidden already stays as it was, so a second hide is the first.
    /// </summary>
    Task<bool> HideAsync(int mediaId, CancellationToken cancellationToken);

    /// <summary>
    /// Takes your hide of a game back. A game you had not hidden is not an error, because what was
    /// asked for is already so.
    /// </summary>
    Task ShowAgainAsync(int mediaId, CancellationToken cancellationToken);
}

/// <summary>
/// Every query here is one person's, and says so where it asks: a hide is yours on a title that is
/// everybody's, as a pass is. Without the user on the list, somebody else's hides would be in it;
/// without it on Show again, taking your hide back would take theirs too.
/// </summary>
public sealed class DiscoverHideService(
    HobbyTrackerDbContext db,
    IJournalClock clock,
    ICurrentUser user) : IDiscoverHideService
{
    public async Task<IReadOnlyList<HiddenTitleDto>> HiddenAsync(CancellationToken cancellationToken)
    {
        var userId = user.Id;

        return await db.DiscoverHides
            .AsNoTracking()
            .Where(hide => hide.UserId == userId)
            // The newest first, the workshop's pick: the game just hidden is the one most likely
            // to be wanted back. By media id after that only so the order is the same every time.
            .OrderByDescending(hide => hide.HiddenAt)
            .ThenByDescending(hide => hide.MediaId)
            .Select(hide => new HiddenTitleDto(hide.MediaId, hide.Media!.Title, hide.Media.CoverUrl))
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> HideAsync(int mediaId, CancellationToken cancellationToken)
    {
        // A game and only a game: this is the games board's route, and a hidden film would be a row
        // no list ever reads. The derived set is an inner join under TPT, so a film is not found.
        if (!await db.Games.AnyAsync(game => game.Id == mediaId, cancellationToken))
        {
            return false;
        }

        var userId = user.Id;

        // Hidden already, so nothing changes — not even when, which would move it up the list.
        if (await db.DiscoverHides.AnyAsync(
                hide => hide.UserId == userId && hide.MediaId == mediaId, cancellationToken))
        {
            return true;
        }

        db.DiscoverHides.Add(new DiscoverHide
        {
            UserId = userId,
            MediaId = mediaId,
            HiddenAt = clock.Now,
        });

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
                                                   {
                                                       SqlState: PostgresErrorCodes.UniqueViolation,
                                                   })
        {
            // Two hides of one game landed together and the other was written first. The key on
            // (user_id, media_id) is what turned that into this rather than two rows, and the game
            // is hidden, which is all that was asked. The failed row is still tracked, so it goes.
            db.ChangeTracker.Clear();
        }

        return true;
    }

    public async Task ShowAgainAsync(int mediaId, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        await db.DiscoverHides
            .Where(hide => hide.UserId == userId && hide.MediaId == mediaId)
            .ExecuteDeleteAsync(cancellationToken);
    }
}
