using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Services;

/// <summary>
/// Something to do when a title reaches somebody's board for the first time.
///
/// Adding is the one gesture that should fetch a title's metadata without anybody running a
/// maintenance route — and what there is to fetch differs per hobby: HowLongToBeat's estimates
/// for a game, TMDB's runtime and director for a film. So <see cref="LogEntryService"/>
/// announces rather than decides, and each hobby's handler declines a title that is not its own.
///
/// It replaced a bare <c>hltbQueue.Enqueue(media.Id)</c> sitting unguarded in the middle of the
/// generic layer, which was harmless only by accident — <c>HltbService</c> queries <c>db.Games</c>,
/// so a film found no row and returned false, having already spent a queue slot and a worker
/// scope on the question.
///
/// Takes the whole row rather than an id so a handler can decline by hobby without a query.
/// <c>media.HobbyId</c> is redundant under Table-Per-Type and kept for exactly this kind of
/// question; see <c>docs/data-model.md</c>.
///
/// <para>
/// <b>An implementation must not throw its way into the caller's request.</b> The pass is the
/// user's and the metadata belongs to somebody else's website, so a provider having a bad day
/// must not stop anybody writing in their own journal. <see cref="LogEntryService"/> logs and
/// swallows, exactly as <c>HltbWorker</c> does, and the title is left for the hobby's backfill.
/// </para>
/// </summary>
public interface IMediaAdded
{
    Task OnAddedAsync(Media media, CancellationToken cancellationToken);
}
