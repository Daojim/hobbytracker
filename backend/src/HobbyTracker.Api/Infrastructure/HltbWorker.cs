using HobbyTracker.Api.Integrations.Hltb;
using HobbyTracker.Api.Services;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Drains the HowLongToBeat queue, one title at a time, for as long as the app is running.
///
/// A scope per title because HltbService needs a DbContext and this is a singleton, which is the
/// standard shape for a hosted service that touches EF — resolving one at construction would
/// hand every lookup for the life of the process the same change tracker.
///
/// Every failure is logged and swallowed. Nothing here is answering anybody: the person who
/// added the game has long since been told it was added, and HowLongToBeat being down is not
/// something to take the worker out over. The title keeps its null hltb_checked_at and is picked
/// up by the next backfill.
/// </summary>
public sealed class HltbWorker(
    IHltbQueue queue,
    IServiceScopeFactory scopeFactory,
    IOptions<HltbOptions> options,
    ILogger<HltbWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Enabled)
        {
            logger.LogInformation(
                "HowLongToBeat lookups are switched off (Hltb:Enabled); the queue will not be "
                + "drained.");

            return;
        }

        await foreach (var mediaId in queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var hltb = scope.ServiceProvider.GetRequiredService<IHltbService>();

                await hltb.UpdateAsync(mediaId, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // The app is shutting down. What is still queued is not lost in any sense that
                // matters — the next backfill finds it by its null hltb_checked_at.
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(
                    exception,
                    "Looking up media {MediaId} on HowLongToBeat failed; it keeps whatever was "
                    + "last known and the next backfill will try again.",
                    mediaId);
            }
        }
    }
}
