using System.Buffers.Text;
using System.Security.Cryptography;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HobbyTracker.Api.Services;

/// <summary>What happened when a board's link was asked for.</summary>
public enum MakeShareOutcome
{
    Made,

    /// <summary>
    /// The board has a link already, and nothing was written. Only a stale dialog gets here —
    /// another tab made the link first — and a second link would be an address nobody can see
    /// in Settings or stop.
    /// </summary>
    AlreadyShared,
}

/// <summary>
/// Your board's share link: seeing it, making it, changing what it shows, and stopping it. Every
/// method is about the signed-in user's own link on one board, by hobby, so none of them takes
/// an id a caller could aim at somebody else's.
/// </summary>
public interface IShareService
{
    /// <summary>The board's link, or null when it has none.</summary>
    Task<ShareDto?> GetAsync(string hobby, CancellationToken cancellationToken);

    Task<(MakeShareOutcome Outcome, ShareDto? Share)> MakeAsync(
        string hobby, ShareRequest request, CancellationToken cancellationToken);

    /// <summary>What the link shows, rewritten. Null when the board has no link.</summary>
    Task<ShareDto?> ChangeAsync(string hobby, ShareRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Deletes the link, so its address stops working for everyone who has it. False when the
    /// board had none.
    /// </summary>
    Task<bool> StopAsync(string hobby, CancellationToken cancellationToken);
}

/// <summary>
/// A share found by the token in its address — the one question an anonymous request can ask
/// about shares, and the only one a share's controller can ask of this service. It is a separate
/// interface so the controller holding it cannot reach the four above, every one of which acts
/// as whoever is signed in.
/// </summary>
public interface IShareLookup
{
    /// <summary>The share, or null for a token nobody holds — never stopped or unknown apart.</summary>
    Task<OpenShare?> FindAsync(string token, CancellationToken cancellationToken);
}

/// <summary>
/// A share, found by its token: whose board, which hobby, what it shows, and the owner's name
/// <b>only when they ticked it</b> — null otherwise, chosen in the query rather than left for a
/// caller to remember. Its owner is named so every read a share makes can be scoped to them
/// explicitly, rather than to whoever is visiting.
/// </summary>
public sealed record OpenShare(int OwnerId, string Hobby, IReadOnlyList<SharePart> Parts, string? Name)
{
    public bool Shows(SharePart part) => Parts.Contains(part);

    /// <summary>Whether the share shows a column: Backlog always, and the others when ticked.</summary>
    public bool Shows(LogStatus column) => column switch
    {
        LogStatus.Backlog => true,
        LogStatus.InProgress => Shows(SharePart.InProgress),
        LogStatus.OnHold => Shows(SharePart.OnHold),
        LogStatus.Completed => Shows(SharePart.Completed),
        LogStatus.Dropped => Shows(SharePart.Dropped),

        // A column added to the board later is off every share until its owner ticks it, which
        // is the rule the parts are stored as a shown list for. See LogStatus.
        _ => false,
    };

    /// <summary>The columns the share shows. What its years are counted from.</summary>
    public IReadOnlySet<LogStatus> Columns =>
        Enum.GetValues<LogStatus>().Where(column => Shows(column)).ToHashSet();
}

/// <summary>
/// Share links, on the owner's side and the visitor's.
///
/// <para>
/// <b>The owner's half is scoped by <see cref="ICurrentUser"/></b>, as every other service is: a
/// share is yours by its <c>user_id</c>, and the routes are addressed by hobby alone, so "this
/// board's link" can only ever mean your own. <b>The visitor's half never reads it</b>, because a
/// visitor is nobody. <see cref="FindAsync"/> answers for the token alone.
/// </para>
/// </summary>
public sealed class ShareService(HobbyTrackerDbContext db, IJournalClock clock, ICurrentUser user)
    : IShareService, IShareLookup
{
    /// <summary>The index that makes a board's link one link. A 23505 naming it is a 409.</summary>
    private const string OnePerBoard = "ix_board_shares_user_id_hobby_id";

    /// <summary>
    /// Sixteen bytes, which base64url writes in twenty-two characters with nothing to pad. A
    /// hundred and twenty-eight bits is past guessing at any rate a server answers at.
    /// </summary>
    private const int TokenBytes = 16;

    public async Task<ShareDto?> GetAsync(string hobby, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        return await db.BoardShares
            .AsNoTracking()
            .Where(share => share.UserId == userId && share.Hobby!.Name == hobby)
            .Select(share => new ShareDto(share.Token, share.Parts, share.ShowsName))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<(MakeShareOutcome Outcome, ShareDto? Share)> MakeAsync(
        string hobby, ShareRequest request, CancellationToken cancellationToken)
    {
        var hobbyId = await db.Hobbies
            .Where(candidate => candidate.Name == hobby)
            .Select(candidate => candidate.Id)
            .SingleAsync(cancellationToken);

        var share = new BoardShare
        {
            UserId = user.Id,
            HobbyId = hobbyId,
            Token = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(TokenBytes)),
            Parts = Shown(request),
            ShowsName = request.ShowsName,
            CreatedAt = clock.Now,
        };

        db.BoardShares.Add(share);

        // No check for an existing link first: the unique index answers that, and answers it for
        // two tabs pressing Make the link at the same moment too, which a read before the write
        // would not.
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
                   {
                       SqlState: PostgresErrorCodes.UniqueViolation,
                       ConstraintName: OnePerBoard,
                   })
        {
            return (MakeShareOutcome.AlreadyShared, null);
        }

        return (MakeShareOutcome.Made, new ShareDto(share.Token, share.Parts, share.ShowsName));
    }

    public async Task<ShareDto?> ChangeAsync(
        string hobby, ShareRequest request, CancellationToken cancellationToken)
    {
        var share = await YoursAsync(hobby, cancellationToken);
        if (share is null)
        {
            return null;
        }

        // Every box, every time, so this replaces rather than merges: a part left out is a part
        // switched off. The token stays — a box changes what a link shows, never which link.
        share.Parts = Shown(request);
        share.ShowsName = request.ShowsName;
        await db.SaveChangesAsync(cancellationToken);

        return new ShareDto(share.Token, share.Parts, share.ShowsName);
    }

    public async Task<bool> StopAsync(string hobby, CancellationToken cancellationToken)
    {
        var share = await YoursAsync(hobby, cancellationToken);
        if (share is null)
        {
            return false;
        }

        // Deleted rather than marked, so the address is gone rather than refused, and sharing
        // again is a new row with a new token: nothing can bring an old link back.
        db.BoardShares.Remove(share);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<OpenShare?> FindAsync(string token, CancellationToken cancellationToken)
    {
        // An exact match on the unique index. Unknown and stopped are the same answer, because a
        // stopped share is a deleted row: there is nothing here that could tell them apart.
        var found = await db.BoardShares
            .AsNoTracking()
            .Where(share => share.Token == token)
            .Select(share => new
            {
                share.UserId,
                Hobby = share.Hobby!.Name,
                share.Parts,

                // Only when ticked, decided here in the query, so the name never leaves the
                // database for a share that does not show it.
                Name = share.ShowsName ? share.User!.DisplayName : null,
            })
            .FirstOrDefaultAsync(cancellationToken);

        return found is null ? null : new OpenShare(found.UserId, found.Hobby, found.Parts, found.Name);
    }

    /// <summary>Your link on one board, tracked, or null. Scoped to you: see the class.</summary>
    private Task<BoardShare?> YoursAsync(string hobby, CancellationToken cancellationToken)
    {
        var userId = user.Id;

        return db.BoardShares
            .Where(share => share.UserId == userId && share.Hobby!.Name == hobby)
            .FirstOrDefaultAsync(cancellationToken);
    }

    /// <summary>
    /// What a request asks to show, each part once and in <see cref="SharePart"/>'s order: the
    /// dialog's own, columns first and then the rest, whatever order the boxes were ticked in.
    /// </summary>
    private static List<SharePart> Shown(ShareRequest request) =>
        [.. request.Parts!.Distinct().Order()];
}
