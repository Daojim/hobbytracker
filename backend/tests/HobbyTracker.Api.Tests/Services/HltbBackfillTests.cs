using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using HobbyTracker.Api.Integrations.Hltb;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// The backfill on a timer: what catches an estimate up when nobody presses anything.
///
/// A game matched before its release has an id and no times, and nothing asked again unless
/// somebody ran <c>POST /api/games/hltb/refresh</c> by hand. Once a day this queues what that
/// route queues — a title never asked about, or last asked more than <c>Hltb:RecheckAfterDays</c>
/// ago — so each title comes due thirty days after its own last ask and the load spreads out.
///
/// Driven through the real worker with no startup delay rather than through
/// <c>BackfillAsync</c>, whose selection <c>HltbEndpointTests</c> already pins: what is worth
/// proving here is that a run is that call, and that either switch stops it before it starts.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class HltbBackfillTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task A_run_queues_exactly_what_the_backfill_would()
    {
        var neverAsked = await GivenLibraryTitleAsync("Phantom Blade Zero", "1", checkedAt: null);
        var monthAgo = await GivenLibraryTitleAsync("Hollow Knight", "2", Journal.Now.AddDays(-31));
        await GivenLibraryTitleAsync("Celeste", "3", Journal.Now.AddDays(-1));

        using var worker = Worker();
        await worker.StartAsync(Ct);
        await HltbQueue.WaitForAsync(2, Ct);
        await worker.StopAsync(Ct);

        // Yesterday's is left alone: it is not due for another twenty-nine days. And a restart
        // re-asks nothing for the same reason, since the selection is by the stamp of each ask.
        HltbQueue.Enqueued.ShouldBe([neverAsked, monthAgo], ignoreOrder: true);
    }

    [Fact]
    public async Task Queues_nothing_while_howlongtobeat_is_switched_off()
    {
        // Hltb:Enabled is the kill switch for the day the site breaks unofficial clients again,
        // and the worker that drains the queue already obeys it. Queuing behind a drain that is
        // off would only fill the queue for nothing.
        await GivenLibraryTitleAsync("Phantom Blade Zero", "1", checkedAt: null);

        using var worker = Worker(hltb: new HltbOptions { Enabled = false });
        await worker.StartAsync(Ct);

        // Finished on its own, which a worker that had started its timer never does.
        await worker.ExecuteTask!.WaitAsync(TimeSpan.FromSeconds(10), Ct);
        HltbQueue.Enqueued.ShouldBeEmpty();
    }

    [Fact]
    public async Task Queues_nothing_while_the_timer_is_switched_off()
    {
        // A switch of its own besides, off on a development machine: somebody running the app to
        // look at the board should not become traffic to a site that would rather not be read.
        await GivenLibraryTitleAsync("Phantom Blade Zero", "1", checkedAt: null);

        using var worker = Worker(
            backfill: new HltbBackfillOptions { Enabled = false, StartupDelayMinutes = 0 });
        await worker.StartAsync(Ct);

        await worker.ExecuteTask!.WaitAsync(TimeSpan.FromSeconds(10), Ct);
        HltbQueue.Enqueued.ShouldBeEmpty();
    }

    [Fact]
    public void The_timer_does_not_run_inside_the_test_host()
    {
        // A PeriodicTimer needs no invitation. Left in the host it would queue titles partway
        // through whatever test was running, into the fake every HowLongToBeat test asserts on.
        Factory.Services.GetServices<IHostedService>()
            .ShouldNotContain(worker => worker is HltbBackfillWorker);
    }

    [Theory]
    [InlineData("Production", true)]
    [InlineData("Development", false)]
    public void The_timer_runs_in_production_and_not_on_a_development_machine(
        string environment, bool runs)
    {
        // Read from the files the API ships with, layered as the host layers them, so taking the
        // switch out of appsettings.Development.json fails here rather than as traffic.
        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json")
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .Build();

        var options = new HltbBackfillOptions();
        configuration.GetSection(HltbBackfillOptions.SectionName).Bind(options);

        options.Enabled.ShouldBe(runs);
    }

    // ---------------------------------------------------------------- arrange

    /// <summary>
    /// The worker against the test host's own scopes, so a run reaches the real HltbService with
    /// the fake queue and the stopped clock behind it. No startup delay unless a test says so.
    /// </summary>
    private HltbBackfillWorker Worker(
        HltbOptions? hltb = null, HltbBackfillOptions? backfill = null) => new(
        Factory.Services.GetRequiredService<IServiceScopeFactory>(),
        Options.Create(hltb ?? new HltbOptions()),
        Options.Create(backfill ?? new HltbBackfillOptions { StartupDelayMinutes = 0 }),
        NullLogger<HltbBackfillWorker>.Instance);

    private async Task<int> GivenLibraryTitleAsync(
        string title, string externalId, DateTimeOffset? checkedAt)
    {
        var mediaId = await GivenGameAsync(title, externalId);
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            game.HltbCheckedAt = checkedAt;
            await db.SaveChangesAsync(Ct);
        });

        return mediaId;
    }
}
