using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Services;

/// <summary>
/// Something to do when a title reaches somebody's board for the first time.
///
/// Adding is the one gesture that should fetch a title's metadata without anybody running a
/// maintenance route — and what there is to fetch differs per hobby: HowLongToBeat's estimates
/// for a game, TMDB's runtime and director for a film. So the two places a title is added —
/// <see cref="LibraryService.AddToBoardAsync"/>, which is what a tile calls, and
/// <see cref="LogEntryService.CreateAsync"/>, the journal's raw write — announce rather than
/// decide, and each hobby's handler declines a title that is not its own.
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
/// must not stop anybody writing in their own journal. <see cref="MediaAddedAnnouncements"/>
/// logs and swallows, exactly as <c>HltbWorker</c> does, and the title is left for the hobby's
/// backfill.
/// </para>
/// </summary>
public interface IMediaAdded
{
    Task OnAddedAsync(Media media, CancellationToken cancellationToken);
}

/// <summary>
/// How a title's arrival is announced, from either of the two places one can arrive.
///
/// One copy rather than one per caller, because the two things it guarantees are the ones a
/// second copy would quietly lose: that a handler throwing cannot fail the write, and that it
/// cannot rob the handlers behind it of the news.
/// </summary>
public static class MediaAddedAnnouncements
{
    /// <summary>
    /// Tells every handler, and lets none of them fail the write.
    ///
    /// The pass is saved by the time this runs, and it is the user's; the metadata belongs to
    /// somebody else's website. So a provider having a bad day must not surface as a failed POST
    /// — the title is left for that hobby's backfill, which is what HltbWorker already does with
    /// the same failure one layer further out.
    ///
    /// Each handler gets its own try, so one throwing does not quietly rob the ones registered
    /// behind it of the announcement.
    /// </summary>
    public static async Task AnnounceAsync(
        this IEnumerable<IMediaAdded> handlers,
        Media media,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        foreach (var handler in handlers)
        {
            try
            {
                await handler.OnAddedAsync(media, cancellationToken);
            }
            catch (Exception exception)
            {
                logger.LogError(
                    exception,
                    "{Handler} failed on media {MediaId}; the pass is written and the title keeps "
                    + "whatever metadata was last known.",
                    handler.GetType().Name,
                    media.Id);
            }
        }
    }
}
