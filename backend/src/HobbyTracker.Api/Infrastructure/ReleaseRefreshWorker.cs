using HobbyTracker.Api.Services;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// Re-asks IGDB about the titles that are not out yet, once a day.
///
/// <para>
/// The release calendar is the only thing in the app that goes stale on its own. Everything else
/// is a fact about a title that does not move — a runtime, a developer, a genre — where a release
/// date slips constantly, and a calendar showing last month's announcement is worse than no
/// calendar at all. Nothing a person does here triggers a refresh, so something has to.
/// </para>
///
/// <para>
/// <b>The first time-driven worker in this app.</b> It copies <see cref="HltbWorker"/>'s three
/// conventions exactly — a singleton taking <see cref="IServiceScopeFactory"/> and opening a
/// scope per unit of work, an options flag that short-circuits at startup and says so, and every
/// failure logged and swallowed — and adds the one thing that worker has no need of: a timer.
/// </para>
///
/// <para>
/// <b>It is off under Testing and E2E, and the second of those is easy to miss.</b> A
/// queue-driven worker is harmless in a test run because nothing enqueues unless a test asks. A
/// <see cref="PeriodicTimer"/> needs no invitation: left on, it would rewrite release windows
/// partway through a run and present as a flake in a spec that never mentions IGDB. See
/// <c>ApiFactory</c> and <c>ReleaseRefresh__Enabled</c> in <c>playwright.config.ts</c>.
/// </para>
/// </summary>
public sealed class ReleaseRefreshWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<ReleaseRefreshOptions> options,
    ILogger<ReleaseRefreshWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var settings = options.Value;

        if (!settings.Enabled)
        {
            // Said out loud, because the symptom of it being off is a calendar that slowly stops
            // agreeing with reality — which looks like nothing at all for weeks.
            logger.LogInformation(
                "Release refresh is disabled; announced dates will only change when "
                + "POST /api/games/refresh is run.");
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
            await SweepAsync(stoppingToken);
        }
        while (await WaitAsync(timer, stoppingToken));
    }

    private async Task SweepAsync(CancellationToken stoppingToken)
    {
        try
        {
            // A scope per sweep, never an injected DbContext: this class is a singleton and that
            // one is not. HltbWorker takes a scope per title for the same reason.
            await using var scope = scopeFactory.CreateAsyncScope();
            var catalog = scope.ServiceProvider.GetRequiredService<IGameCatalogService>();

            var refreshed = await catalog.RefreshUnreleasedAsync(stoppingToken);

            logger.LogInformation(
                "Release refresh brought {Count} not-yet-released titles up to date.", refreshed);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down, which is not a failure.
        }
        catch (Exception exception)
        {
            // Swallowed, as HltbWorker swallows its own. A provider being unreachable tonight is
            // an ordinary thing, and a worker that died of it would take every later night with
            // it — the calendar would then go stale silently, which is the failure this exists
            // to prevent.
            logger.LogError(exception, "Release refresh failed; the next sweep will try again.");
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
