using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Integrations.Hltb;

/// <summary>
/// A floor between one request to HowLongToBeat and the next.
///
/// Politeness rather than compliance: HLTB publishes no rate limit, so there is no number to
/// obey — only a site being read by a program it never agreed to serve, which has blocked
/// unofficial clients before. A backfill of fifty titles is fifty requests, and sending them as
/// fast as the network allows is how that happens.
///
/// A singleton holding the clock, with the handler that uses it left transient. The obvious
/// alternative — keeping the timestamp on the DelegatingHandler — quietly does not work:
/// IHttpClientFactory rebuilds the handler chain every couple of minutes, so the floor would
/// reset on a schedule nothing in this file controls.
///
/// The gate is released before the send rather than after, so this spaces requests out rather
/// than serialising them: what matters is how often we knock, not how long we wait for an answer.
/// </summary>
public sealed class HltbThrottle(IOptions<HltbOptions> options, TimeProvider timeProvider)
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private DateTimeOffset _lastSent = DateTimeOffset.MinValue;

    public async Task WaitAsync(CancellationToken cancellationToken)
    {
        var interval = TimeSpan.FromSeconds(options.Value.MinSecondsBetweenRequests);
        if (interval <= TimeSpan.Zero)
        {
            return;
        }

        await _gate.WaitAsync(cancellationToken);
        try
        {
            var due = _lastSent + interval;
            var now = timeProvider.GetUtcNow();

            if (now < due)
            {
                await Task.Delay(due - now, cancellationToken);
            }

            _lastSent = timeProvider.GetUtcNow();
        }
        finally
        {
            _gate.Release();
        }
    }
}

/// <summary>
/// Rate limiting as a pipeline concern, which — unlike the handshake — it genuinely is: it has
/// nothing to say about what any particular request contains.
/// </summary>
public sealed class HltbThrottleHandler(HltbThrottle throttle) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        await throttle.WaitAsync(cancellationToken);
        return await base.SendAsync(request, cancellationToken);
    }
}
