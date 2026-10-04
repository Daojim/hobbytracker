using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Services;

public interface IAccountService
{
    /// <summary>What deleting your account would take with it, every board at once.</summary>
    Task<AccountDto> SummaryAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Deletes your account and everything that is yours: every pass on every board, every note,
    /// the history of every move, and every sign-in. The catalogue stays, because it is
    /// everybody's.
    /// </summary>
    Task DeleteAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Your account as a whole, rather than one board of it.
///
/// <para>
/// <b>Scoped by <c>user_id</c> at every query</b>, read once from <see cref="ICurrentUser"/>,
/// as every other service is. The titles are shared and the passes are not, so a count that
/// started from <c>media</c> would include strangers' boards, and a delete keyed on anything
/// but the user would reach them.
/// </para>
/// </summary>
public sealed class AccountService(HobbyTrackerDbContext db, ICurrentUser user) : IAccountService
{
    public async Task<AccountDto> SummaryAsync(CancellationToken cancellationToken)
    {
        var userId = user.Id;

        // In the order they were linked, which is the order a person did it in.
        var signedInWith = await db.AuthIdentities
            .AsNoTracking()
            .Where(identity => identity.UserId == userId)
            .OrderBy(identity => identity.Id)
            .Select(identity => identity.Provider)
            .ToListAsync(cancellationToken);

        // A title counts once however many passes it has, because the warning is about what you
        // would lose as the board shows it. Boards with nothing on them never appear, since a
        // group needs a row to exist. hobby_lu's order is the nav's.
        var boards = await db.LogEntries
            .AsNoTracking()
            .Where(entry => entry.UserId == userId)
            .GroupBy(entry => new { entry.Media!.HobbyId, entry.Media.Hobby!.Name })
            .OrderBy(board => board.Key.HobbyId)
            .Select(board => new BoardTitlesDto(
                board.Key.Name,
                board.Select(entry => entry.MediaId).Distinct().Count()))
            .ToListAsync(cancellationToken);

        // Through the pass, as NoteService reaches every note: a note has no owner of its own.
        var notes = await db.Notes
            .CountAsync(note => note.LogEntry!.UserId == userId, cancellationToken);

        return new AccountDto(signedInWith, boards, notes);
    }

    public async Task DeleteAsync(CancellationToken cancellationToken)
    {
        var userId = user.Id;

        // One statement, and the database takes the rest: users cascades to auth_identities and
        // log_entries, and log_entries to notes and status_changes. The cascades are the
        // configurations' and the migrations' (LogEntryConfiguration, AuthIdentityConfiguration,
        // NoteConfiguration, StatusChangeConfiguration), so nothing is loaded into memory to be
        // deleted a row at a time, and no row can be missed by a list kept here.
        //
        // ExecuteDelete passes the change tracker by, and so StatusHistoryRecorder with it. That
        // is the trap data-model.md names for writing a status, and it does not apply here: a
        // pass that is deleted takes its history with it, and there is nothing left to record.
        await db.Users
            .Where(candidate => candidate.Id == userId)
            .ExecuteDeleteAsync(cancellationToken);
    }
}
