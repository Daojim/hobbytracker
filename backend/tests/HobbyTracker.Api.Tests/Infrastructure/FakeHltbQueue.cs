using System.Runtime.CompilerServices;
using HobbyTracker.Api.Infrastructure;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Records what was queued and hands nothing back.
///
/// Draining is deliberately not simulated. The real queue is emptied by a BackgroundService, and
/// leaving that running under test would mean every assertion about a stored number racing a
/// thread the test never mentioned — the classic way an integration suite becomes flaky for
/// reasons nobody can reproduce. With this in its place, "adding a game asks about it" is a
/// plain assertion, and what the lookup then does is tested directly against HltbService.
/// </summary>
public sealed class FakeHltbQueue : IHltbQueue
{
    private readonly SemaphoreSlim _arrivals = new(0);

    public List<int> Enqueued { get; } = [];

    public void Enqueue(int mediaId)
    {
        // Locked because one writer is not on the test's thread: the daily backfill queues from
        // a worker of its own. Everything else queues inside a request, which has answered by
        // the time a test reads the list.
        lock (Enqueued)
        {
            Enqueued.Add(mediaId);
        }

        _arrivals.Release();
    }

    /// <summary>
    /// Waits for <paramref name="count"/> titles to have been queued, for a test of something
    /// that queues on a thread of its own. Throws rather than returning early, so a run that
    /// queued too little fails here, naming how many it did, instead of on a shorter list later.
    /// </summary>
    public async Task WaitForAsync(int count, CancellationToken cancellationToken)
    {
        for (var arrived = 0; arrived < count; arrived++)
        {
            if (!await _arrivals.WaitAsync(TimeSpan.FromSeconds(10), cancellationToken))
            {
                throw new TimeoutException(
                    $"Waited for {count} titles to be queued, and {arrived} were.");
            }
        }
    }

    public async IAsyncEnumerable<int> ReadAllAsync(
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        await Task.CompletedTask;
        yield break;
    }
}
