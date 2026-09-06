using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;

namespace HobbyTracker.Api.Services;

/// <summary>
/// A game reaching the board asks HowLongToBeat how long it takes.
///
/// Queued rather than fetched, so the reply the person is waiting on does not wait on a site
/// that has no obligation to answer quickly or at all. See <see cref="IHltbQueue"/>.
///
/// Only for games, and the guard is the point of this class existing rather than the queue being
/// called directly: a film has no <c>games</c> row, so the lookup would find nothing — after
/// spending a queue slot and a worker scope discovering it.
///
/// Only on a first entry, which is what <see cref="IMediaAdded"/> means: the passes a drag out of
/// Completed inserts are for a title that has already been asked about.
/// </summary>
public sealed class HltbOnMediaAdded(IHltbQueue queue) : IMediaAdded
{
    public Task OnAddedAsync(Media media, CancellationToken cancellationToken)
    {
        if (media.HobbyId == SeedData.Hobbies.Games)
        {
            queue.Enqueue(media.Id);
        }

        return Task.CompletedTask;
    }
}
