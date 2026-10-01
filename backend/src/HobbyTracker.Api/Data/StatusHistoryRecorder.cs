using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace HobbyTracker.Api.Data;

/// <summary>
/// Writes down when a pass changed column, in the same save that changed it.
///
/// <para>
/// <b>An interceptor, which is the opposite of the trade <c>docs/auth.md</c> made, and that is
/// deliberate.</b> Scoping stayed out of an EF query filter because a filter is invisible at the
/// call site, and one gone wrong hides somebody's data or leaks it. The failure worth fearing here
/// is a different one: a write site that forgets to record loses that history for good, and
/// nothing errors. A pass's status is written in four places today — a move, an add, logging a
/// pass, and rewriting one — and a rule kept by listing its call sites has already gone stale
/// once in this codebase (see the places that order a title's entries in <c>docs/board.md</c>).
/// Here, a fifth write site cannot forget, because it never has to remember.
/// </para>
///
/// <para>
/// <b>What it cannot see</b> is a write that goes around the change tracker: an
/// <c>ExecuteUpdate</c>, raw SQL, or a context built without it. The last is
/// <c>PostgresFixture.CreateDbContext()</c>, on purpose — that is what lets the backend suite
/// arrange passes without writing history of their own.
/// </para>
/// </summary>
public sealed class StatusHistoryRecorder(IJournalClock clock) : SaveChangesInterceptor
{
    /// <summary>
    /// How long a pass has to stay in a column for that to be history.
    ///
    /// A move made sooner than this after the pass's latest row folds into that row rather than
    /// adding one, and a fold that lands back where the row started deletes it — so somebody
    /// dragging a card through every column to see what happens leaves nothing behind, and a card
    /// dropped in the wrong column and moved straight on records only where it went. Folded on
    /// the way in rather than filtered on the way out, so that nothing reading the history has to
    /// know this exists.
    ///
    /// The cost, accepted when it was chosen: a column a pass genuinely spent five minutes in is
    /// not in the history either. Its own start and finish are still on the pass.
    /// </summary>
    public static readonly TimeSpan SettleWindow = TimeSpan.FromMinutes(10);

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, InterceptionResult<int> result)
    {
        if (eventData.Context is { } db)
        {
            var now = clock.Now;

            foreach (var move in MovesIn(db))
            {
                var latest = move.From is null
                    ? null
                    : LatestRowOf(db, move.Pass).FirstOrDefault();

                Record(db, move, latest, now);
            }
        }

        return result;
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is { } db)
        {
            var now = clock.Now;

            foreach (var move in MovesIn(db))
            {
                var latest = move.From is null
                    ? null
                    : await LatestRowOf(db, move.Pass).FirstOrDefaultAsync(cancellationToken);

                Record(db, move, latest, now);
            }
        }

        return result;
    }

    /// <summary>A pass arriving in a column. <c>From</c> is null when the pass is being made.</summary>
    private readonly record struct Move(LogEntry Pass, LogStatus? From, LogStatus To);

    /// <summary>
    /// Every pass in this save that is new or has changed column — and only those.
    ///
    /// A pass whose column did not change is ordinary here rather than rare: the drawer rewrites
    /// the whole pass, column included, half a second after every edit, and a reorder rewrites the
    /// position of every card in a column. Asking "did the pass change" would answer yes to all of
    /// it, and ck_status_changes_is_a_change would refuse each row with a 500.
    ///
    /// Collected into a list before anything is recorded, because recording adds to the very
    /// tracker this walks.
    /// </summary>
    private static List<Move> MovesIn(DbContext db)
    {
        var moves = new List<Move>();

        foreach (var entry in db.ChangeTracker.Entries<LogEntry>())
        {
            var status = entry.Property(pass => pass.Status);

            if (entry.State == EntityState.Added)
            {
                moves.Add(new Move(entry.Entity, From: null, To: status.CurrentValue));
            }
            else if (entry.State == EntityState.Modified && status.OriginalValue != status.CurrentValue)
            {
                moves.Add(new Move(entry.Entity, status.OriginalValue, status.CurrentValue));
            }
        }

        return moves;
    }

    /// <summary>
    /// The row a move may fold into: the pass's most recent. Never asked of a pass being made,
    /// which has no rows and no real id yet.
    /// </summary>
    private static IQueryable<StatusChange> LatestRowOf(DbContext db, LogEntry pass) =>
        db.Set<StatusChange>()
            .Where(change => change.LogEntryId == pass.Id)
            .OrderByDescending(change => change.ChangedAt)
            .ThenByDescending(change => change.Id);

    private static void Record(DbContext db, Move move, StatusChange? latest, DateTimeOffset now)
    {
        // Only the latest row, and only while it is recent: how long the pass has been in the
        // column it is leaving. Anything older settled, and is never touched again.
        if (latest is not null && now - latest.ChangedAt < SettleWindow)
        {
            // Plain writes to a tracked row. SaveChanges detects changes after this has run, so
            // the fold goes out in the same transaction as the move that caused it.
            latest.ToStatus = move.To;
            latest.ChangedAt = now;

            // Back where it started, which is no move at all. A row saying a pass was made has no
            // "from" to come back to, so this can never take one: every pass made since recording
            // began keeps the row that says so.
            if (latest.FromStatus == move.To)
            {
                db.Remove(latest);
            }

            return;
        }

        db.Add(new StatusChange
        {
            // The navigation rather than the id, because a pass being made has no id until this
            // same save inserts it. EF orders the two inserts and fills the key in.
            LogEntry = move.Pass,
            FromStatus = move.From,
            ToStatus = move.To,
            ChangedAt = now,
        });
    }
}
