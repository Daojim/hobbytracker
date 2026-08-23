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
    public List<int> Enqueued { get; } = [];

    public void Enqueue(int mediaId) => Enqueued.Add(mediaId);

    public async IAsyncEnumerable<int> ReadAllAsync(
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        await Task.CompletedTask;
        yield break;
    }
}
