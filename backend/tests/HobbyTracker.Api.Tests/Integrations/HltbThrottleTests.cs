using System.Diagnostics;
using HobbyTracker.Api.Integrations.Hltb;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Integrations;

/// <summary>
/// The floor between one request to HowLongToBeat and the next.
///
/// Real elapsed time rather than a stopped clock: what is being asserted is that a caller is
/// actually made to wait, and a TimeProvider whose timers a test controls would prove only that
/// the arithmetic is right.
/// </summary>
public sealed class HltbThrottleTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Makes_the_second_request_wait_for_the_first()
    {
        var throttle = Create(minSecondsBetweenRequests: 1);
        var elapsed = Stopwatch.StartNew();

        await throttle.WaitAsync(Ct);
        await throttle.WaitAsync(Ct);

        elapsed.Elapsed.ShouldBeGreaterThan(TimeSpan.FromMilliseconds(900));
    }

    [Fact]
    public async Task Lets_the_first_request_of_all_go_straight_through()
    {
        // Nothing has been asked of the site yet, so there is nothing to be polite about.
        var throttle = Create(minSecondsBetweenRequests: 30);
        var elapsed = Stopwatch.StartNew();

        await throttle.WaitAsync(Ct);

        elapsed.Elapsed.ShouldBeLessThan(TimeSpan.FromMilliseconds(500));
    }

    [Fact]
    public async Task Stands_aside_entirely_when_the_floor_is_nought()
    {
        var throttle = Create(minSecondsBetweenRequests: 0);
        var elapsed = Stopwatch.StartNew();

        await throttle.WaitAsync(Ct);
        await throttle.WaitAsync(Ct);
        await throttle.WaitAsync(Ct);

        elapsed.Elapsed.ShouldBeLessThan(TimeSpan.FromMilliseconds(500));
    }

    private static HltbThrottle Create(int minSecondsBetweenRequests) => new(
        Options.Create(new HltbOptions
        {
            MinSecondsBetweenRequests = minSecondsBetweenRequests,
        }),
        TimeProvider.System);
}
