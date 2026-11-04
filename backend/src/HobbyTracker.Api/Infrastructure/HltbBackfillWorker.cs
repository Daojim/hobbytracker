using HobbyTracker.Api.Integrations.Hltb;
using HobbyTracker.Api.Services;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Runs the HowLongToBeat backfill once a day, so an estimate catches up without anybody asking.
///
/// <para>
/// HowLongToBeat can list a game before it is out, with no times on it, and the matcher compares
/// names and never times: so a title added from the calendar is matched, its id kept and its
/// figures empty. Nothing asked again. Release day is not an event, because the calendar is a
/// view of Backlog, and the only other way into the queue was <c>POST /api/games/hltb/refresh</c>,
/// which has no button. This is that route on a timer, by its own rule: a title never asked
/// about, or last asked more than <c>Hltb:RecheckAfterDays</c> ago. A new release can wait up to
/// a month that way, which is what the journal's arrow is for.
/// </para>
///
/// <para>
/// <b><see cref="ReleaseRefreshWorker"/>'s shape</b>: a singleton taking a scope per run, a switch
/// that short-circuits at startup and says so, a startup delay that clears the migration, and
/// every failure logged and swallowed. <b>It queues and never asks</b>, so
/// <see cref="HltbWorker"/> stays the only thing that talks to HowLongToBeat, behind the throttle.
/// </para>
///
/// <para>
/// <b>Three things a sweep had to get right before it could exist</b>, from
/// <c>docs/games-hltb.md</c>. <c>Hltb:Enabled</c> stops it as it stops the worker, and so does a
/// switch of its own, off in Development, so that a local run is not traffic. It is off under
/// Testing and E2E, as the release sweep is, because a timer needs no invitation. And a restart
/// re-asks nothing, because what it selects is chosen by the stamp each ask leaves.
/// </para>
/// </summary>
public sealed class HltbBackfillWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<HltbOptions> hltbOptions,
    IOptions<HltbBackfillOptions> options,
    ILogger<HltbBackfillWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Before its own switch, because this one stops everything: queuing behind a drain that
        // is not running would only fill the queue for nothing.
        if (!hltbOptions.Value.Enabled)
        {
            logger.LogInformation(
                "HowLongToBeat lookups are switched off (Hltb:Enabled); the daily backfill will "
                + "not run.");

            return;
        }

        var settings = options.Value;

        if (!settings.Enabled)
        {
            // Said out loud, because the symptom of it being off is an estimate that never
            // arrives, which looks like nothing at all for a month.
            logger.LogInformation(
                "The daily HowLongToBeat backfill is switched off (HltbBackfill:Enabled); a title "
                + "is asked about again only from its journal, or when "
                + "POST /api/games/hltb/refresh is run.");

            return;
        }

        try
        {
            await Task.Delay(TimeSpan.FromMinutes(settings.StartupDelayMinutes), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        using var timer = new PeriodicTimer(TimeSpan.FromHours(settings.IntervalHours));

        do
        {
            await RunAsync(stoppingToken);
        }
        while (await WaitAsync(timer, stoppingToken));
    }

    private async Task RunAsync(CancellationToken stoppingToken)
    {
        try
        {
            // A scope per run, never an injected DbContext: this class is a singleton and that
            // one is not. BackfillAsync logs how many it queued.
            await using var scope = scopeFactory.CreateAsyncScope();
            var hltb = scope.ServiceProvider.GetRequiredService<IHltbService>();

            await hltb.BackfillAsync(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down, which is not a failure.
        }
        catch (Exception exception)
        {
            // Swallowed, as the release sweep swallows its own. A database that is briefly away
            // tonight is ordinary, and a worker that died of it would take every later day with
            // it: estimates would stop catching up silently, which is what this exists to end.
            logger.LogError(
                exception, "The daily HowLongToBeat backfill failed; tomorrow's will try again.");
        }
    }

    private static async Task<bool> WaitAsync(PeriodicTimer timer, CancellationToken stoppingToken)
    {
        try
        {
            return await timer.WaitForNextTickAsync(stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return false;
        }
    }
}
