using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Services;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// The daily sweep behind the release calendar. Dates slip, and nothing else in the app ever
/// re-asks a provider on its own.
///
/// Driven through <c>RefreshUnreleasedAsync</c> rather than through the worker: what is worth
/// pinning is <i>which</i> titles it asks about, and a test that waited on a PeriodicTimer would
/// be slower and less certain about the same thing.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class ReleaseRefreshTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Asks_IGDB_only_about_the_titles_that_are_not_out_yet()
    {
        // The set matters more than the mechanism. Widen it to include null precision — which
        // looks like an obvious improvement, since those are the rows with no window at all —
        // and the sweep never terminates: a title IGDB has stopped answering for never gets a
        // precision, so it is re-asked about every single day, for ever. That is exactly the
        // lesson games.hltb_checked_at exists to record. The nulls belong to the backfill, which
        // is a thing you run.
        await GivenGameWithWindowAsync("Never Asked", "100", null, precision: null);
        await GivenGameWithWindowAsync("Out Already", "200", new DateOnly(2025, 4, 1), ReleasePrecision.Day);
        await GivenGameWithWindowAsync("Coming Soon", "300", new DateOnly(2027, 4, 1), ReleasePrecision.Day);
        await GivenGameWithWindowAsync("No Date Yet", "400", null, ReleasePrecision.Unknown);

        await RefreshUnreleasedAsync();

        // Both of the unreleased ones, and neither of the others.
        Igdb.IdLookups.ShouldHaveSingleItem().Order().ShouldBe([300, 400]);
    }

    [Fact]
    public async Task Asks_about_nothing_when_everything_is_out()
    {
        // No request at all rather than an empty one, so a library with nothing pending costs
        // the IGDB quota nothing every night.
        await GivenGameWithWindowAsync("Out Already", "200", new DateOnly(2025, 4, 1), ReleasePrecision.Day);

        await RefreshUnreleasedAsync();

        Igdb.IdLookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task Leaves_alone_a_title_nobody_has_put_on_a_board()
    {
        // `media` is mostly search spill — every result of every search anybody has typed. The
        // sweep is about what somebody is waiting for, not about the catalogue.
        await WithDbAsync(async db =>
        {
            db.Games.Add(new Game
            {
                HobbyId = SeedData.Hobbies.Games,
                SourceId = SeedData.Sources.Igdb,
                ExternalId = "999",
                Title = "Searched Once, Never Kept",
                ReleaseDate = new DateOnly(2027, 1, 1),
                ReleaseEnd = new DateOnly(2027, 12, 31),
                ReleasePrecision = ReleasePrecision.Year,
            });

            await db.SaveChangesAsync(Ct);
        });

        await RefreshUnreleasedAsync();

        Igdb.IdLookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task Takes_a_slipped_date_without_anybody_asking()
    {
        var mediaId = await GivenGameWithWindowAsync(
            "Silksong II", "300", new DateOnly(2027, 3, 12), ReleasePrecision.Day);

        Igdb.SetGames(FakeIgdbClient.Game(
            300, "Silksong II", releaseDate: new DateOnly(2027, 11, 19), dateFormat: "YYYYMMDD"));

        await RefreshUnreleasedAsync();

        var game = await WithDbAsync(db =>
            db.Media.SingleAsync(candidate => candidate.Id == mediaId, Ct));

        game.ReleaseDate.ShouldBe(new DateOnly(2027, 11, 19));
    }

    [Fact]
    public async Task A_title_that_has_since_come_out_stops_being_swept()
    {
        // What makes the sweep shrink rather than grow. Once IGDB says a date has arrived, the
        // row leaves the set on its own and is never asked about again.
        await GivenGameWithWindowAsync("Out Soon", "300", new DateOnly(2026, 9, 20), ReleasePrecision.Day);

        Igdb.SetGames(FakeIgdbClient.Game(
            300, "Out Soon", releaseDate: new DateOnly(2026, 9, 14), dateFormat: "YYYYMMDD"));

        await RefreshUnreleasedAsync();
        Igdb.IdLookups.Clear();

        await RefreshUnreleasedAsync();

        Igdb.IdLookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task A_title_IGDB_no_longer_answers_for_keeps_what_was_last_known()
    {
        var mediaId = await GivenGameWithWindowAsync(
            "Vapourware", "300", new DateOnly(2027, 3, 12), ReleasePrecision.Day);

        // IGDB answers with nothing for it, which is a real thing that happens to entries that
        // get merged or withdrawn.
        Igdb.SetGames();

        await RefreshUnreleasedAsync();

        var game = await WithDbAsync(db =>
            db.Media.SingleAsync(candidate => candidate.Id == mediaId, Ct));

        game.ReleaseDate.ShouldBe(new DateOnly(2027, 3, 12));
        game.ReleasePrecision.ShouldBe(ReleasePrecision.Day);
    }

    [Fact]
    public void The_release_worker_does_not_run_inside_the_test_host()
    {
        // The suite's own guard. A queue-driven worker is harmless here because nothing enqueues
        // unless a test asks; a PeriodicTimer needs no invitation, and one left running would
        // rewrite `media` rows underneath whatever else is asserting on them. ApiFactory takes
        // it out, and this is what says so.
        var workers = Factory.Services.GetServices<IHostedService>();

        workers.ShouldNotContain(worker => worker is ReleaseRefreshWorker);
    }

    [Fact]
    public async Task Does_nothing_at_all_when_it_is_switched_off()
    {
        // The kill switch, on HltbOptions.Enabled's reasoning: IGDB's quota is 4 requests a
        // second against an app anybody can sign up to, and turning the nightly traffic off
        // should not need a release.
        await GivenGameWithWindowAsync("Coming Soon", "300", new DateOnly(2027, 4, 1), ReleasePrecision.Day);

        using var worker = new ReleaseRefreshWorker(
            Factory.Services.GetRequiredService<IServiceScopeFactory>(),
            Options.Create(new ReleaseRefreshOptions { Enabled = false }),
            NullLogger<ReleaseRefreshWorker>.Instance);

        await worker.StartAsync(Ct);
        await worker.StopAsync(Ct);

        Igdb.IdLookups.ShouldBeEmpty();
    }

    // ---------------------------------------------------------------- arrange

    private Task RefreshUnreleasedAsync() => WithScopeAsync(async services =>
    {
        var catalog = services.GetRequiredService<IGameCatalogService>();
        await catalog.RefreshUnreleasedAsync(Ct);
        return true;
    });

    private async Task<int> GivenGameWithWindowAsync(
        string title, string externalId, DateOnly? day, ReleasePrecision? precision)
    {
        var mediaId = await GivenGameAsync(title, externalId: externalId);
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        if (precision is not { } announced)
        {
            return mediaId;
        }

        var window = day is { } date ? ReleaseWindow.For(date, announced) : ReleaseWindow.Unknown;

        await WithDbAsync(async db =>
        {
            var media = await db.Media.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            media.ReleaseDate = window.Start;
            media.ReleaseEnd = window.End;
            media.ReleasePrecision = window.Precision;
            await db.SaveChangesAsync(Ct);
        });

        return mediaId;
    }
}
