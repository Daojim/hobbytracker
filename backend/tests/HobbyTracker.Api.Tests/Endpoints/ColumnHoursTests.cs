using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// What a column's header says about how long its titles take: the figure each card prints,
/// added up, and on Completed your own hours against it.
///
/// <para>
/// Every figure is about the whole column, and the cards a column draws are only one page of
/// it. So most of these arrange something the page alone would get wrong — a second page, a
/// year boundary, a title the column leaves out, somebody else's pass — and ask whether the
/// header agrees with the column.
/// </para>
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class ColumnHoursTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task The_total_covers_the_whole_column_and_not_just_the_page()
    {
        // A column is paged at a hundred. A header that added up the page it was handed would
        // disagree with its own count the day a column passed that.
        await GivenGameInAsync("Celeste", "1", LogStatus.Backlog, estimate: 20m);
        await GivenGameInAsync("Hades", "2", LogStatus.Backlog, estimate: 42m);
        await GivenGameInAsync("Hollow Knight", "3", LogStatus.Backlog, estimate: 41.8m);

        var column = await ColumnAsync(LogStatus.Backlog, pageSize: 2);

        column.Items.Count.ShouldBe(2);
        column.Hours.Length.ShouldBe(103.8m);
        column.Hours.LengthTitles.ShouldBe(3);
    }

    [Fact]
    public async Task A_title_with_no_estimate_is_left_out_rather_than_counted_as_nothing()
    {
        await GivenGameInAsync("Celeste", "1", LogStatus.Backlog, estimate: 20m);
        await GivenGameInAsync("Stardew Valley", "2", LogStatus.Backlog, estimate: null);

        var column = await ColumnAsync(LogStatus.Backlog);

        // Two titles, one of them timed. The header counts the other rather than adding it as
        // nought, which would claim the column takes less time than it does.
        column.Total.ShouldBe(2);
        column.Hours.Length.ShouldBe(20m);
        column.Hours.LengthTitles.ShouldBe(1);
    }

    [Fact]
    public async Task A_column_with_no_estimate_in_it_has_no_total_rather_than_a_total_of_nothing()
    {
        // "0 h" would say the column takes no time at all. No figure is the honest answer, and
        // it is what keeps the header from printing one.
        await GivenGameInAsync("Stardew Valley", "1", LogStatus.Backlog, estimate: null);

        var hours = (await ColumnAsync(LogStatus.Backlog)).Hours;

        hours.Length.ShouldBeNull();
        hours.LengthTitles.ShouldBe(0);
    }

    [Fact]
    public async Task The_backlog_total_leaves_out_what_is_on_the_release_calendar()
    {
        // The Backlog column answers without the titles that are not out yet, so its header has
        // to as well — the calendar under the board is where those are, and a header that added
        // them in would disagree with the cards right under it.
        await GivenGameInAsync("Celeste", "1", LogStatus.Backlog, estimate: 20m);
        var unreleased = await GivenGameInAsync(
            "Silksong II", "2", LogStatus.Backlog, estimate: 30m);
        await GivenReleaseDayAsync(unreleased, new DateOnly(2027, 3, 12));

        var column = await ColumnAsync(LogStatus.Backlog);

        column.Items.ShouldHaveSingleItem().Title.ShouldBe("Celeste");
        column.Hours.Length.ShouldBe(20m);
        column.Hours.LengthTitles.ShouldBe(1);
    }

    [Fact]
    public async Task The_completed_total_follows_the_year_and_8pm_on_new_years_eve_is_that_year()
    {
        // 8pm on the 31st here is already the 1st in UTC. A total that read the year off the
        // stored instant in the wrong zone would move this game into next year's header while
        // its card stayed in this one.
        await GivenGameInAsync(
            "Midnight Run", "1", LogStatus.Completed, estimate: 10m, hoursPlayed: 12m,
            completedAt: Eastern(2026, 12, 31, 20, 0));
        await GivenGameInAsync(
            "New Year", "2", LogStatus.Completed, estimate: 30m, hoursPlayed: 25m,
            completedAt: Eastern(2027, 1, 1));

        var thisYear = (await ColumnAsync(LogStatus.Completed, year: 2026)).Hours;
        thisYear.Length.ShouldBe(10m);
        thisYear.Played.ShouldBe(12m);

        var nextYear = (await ColumnAsync(LogStatus.Completed, year: 2027)).Hours;
        nextYear.Length.ShouldBe(30m);
        nextYear.Played.ShouldBe(25m);
    }

    [Fact]
    public async Task Completed_compares_your_hours_only_over_the_titles_that_have_both()
    {
        // A comparison over two different sets of titles is not one. A game with no hours logged
        // would put its estimate on one side and nothing on the other, and read as you having
        // been quick; a game with no estimate would do the opposite.
        await GivenGameInAsync(
            "Celeste", "1", LogStatus.Completed, estimate: 20m, hoursPlayed: 14.5m);
        await GivenGameInAsync(
            "Outer Wilds", "2", LogStatus.Completed, estimate: 17m, hoursPlayed: 21m);
        await GivenGameInAsync(
            "Hi-Fi Rush", "3", LogStatus.Completed, estimate: 13m, hoursPlayed: null);
        await GivenGameInAsync(
            "Untimed", "4", LogStatus.Completed, estimate: null, hoursPlayed: 5m);

        var hours = (await ColumnAsync(LogStatus.Completed)).Hours;

        hours.Played.ShouldBe(35.5m);
        hours.PlayedLength.ShouldBe(37m);
        hours.PlayedTitles.ShouldBe(2);

        // The plain total is still every title with an estimate, hours logged or not.
        hours.Length.ShouldBe(50m);
        hours.LengthTitles.ShouldBe(3);
    }

    [Fact]
    public async Task With_no_hours_logged_there_is_nothing_to_compare()
    {
        await GivenGameInAsync("Celeste", "1", LogStatus.Completed, estimate: 20m);

        var hours = (await ColumnAsync(LogStatus.Completed)).Hours;

        hours.Played.ShouldBeNull();
        hours.PlayedLength.ShouldBeNull();
        hours.PlayedTitles.ShouldBe(0);
    }

    [Fact]
    public async Task Your_hours_are_the_current_passes_like_everything_else_on_the_card()
    {
        // Finished twice: the column holds the title once, as its latest pass, and that pass is
        // the one whose hours count. Adding up every pass would be a different number — time
        // spent on a title across its replays — and it is not what the card beside it says.
        var celeste = await GivenGameInAsync(
            "Celeste", "1", LogStatus.Completed, estimate: 20m, hoursPlayed: 31m,
            completedAt: Eastern(2025, 3, 1));
        await PostPassAsync(
            Client, celeste, LogStatus.Completed,
            hoursPlayed: 9m, completedAt: Eastern(2026, 3, 1));

        var hours = (await ColumnAsync(LogStatus.Completed)).Hours;

        hours.Played.ShouldBe(9m);
        hours.PlayedTitles.ShouldBe(1);
    }

    [Fact]
    public async Task Somebody_elses_hours_never_count()
    {
        // The title is shared and the passes are not. Two people finishing the same game is one
        // media row with two passes against it, and only yours is on your board.
        var celeste = await GivenGameInAsync(
            "Celeste", "1", LogStatus.Completed, estimate: 20m, hoursPlayed: 14.5m);

        var stranger = ClientFor(await GivenUserAsync("Somebody Else"));
        await PostPassAsync(stranger, celeste, LogStatus.Completed, hoursPlayed: 60m);

        var hades = await GivenGameWithEstimateAsync("Hades", "2", 42m);
        await PostPassAsync(stranger, hades, LogStatus.Completed, hoursPlayed: 50m);

        var hours = (await ColumnAsync(LogStatus.Completed)).Hours;

        hours.Played.ShouldBe(14.5m);
        hours.PlayedTitles.ShouldBe(1);
        hours.Length.ShouldBe(20m);
        hours.LengthTitles.ShouldBe(1);
    }

    [Fact]
    public async Task The_total_is_the_sum_of_what_the_cards_print_for_every_hobby()
    {
        // LengthHours is built in both of LibraryService's projections and ordered on in Sorted,
        // and the total is a fourth copy of that coalesce. This is what holds it to the cards: for
        // each hobby, the header's sum is the sum of the figures its cards print. Leave a hobby's
        // arm out of the total and its board has no total at all.
        //
        // The runtimes are chosen not to divide into hundredths of an hour. A card rounds its
        // figure to two places, so a total that skipped the rounding would drift from the cards
        // above it by a fraction of a minute a title — here, 116 minutes is a card's 1.93 h and
        // an unrounded 1.9333.
        await GivenGameInAsync("Celeste", "1", LogStatus.Backlog, estimate: 20.25m);
        await GivenGameInAsync("Hades", "2", LogStatus.Backlog, estimate: 41.82m);

        await GivenLogEntryAsync(await GivenMovieAsync("Arrival", "1", runtimeMinutes: 116));
        await GivenLogEntryAsync(await GivenMovieAsync("Heat", "2", runtimeMinutes: 170));

        await GivenLogEntryAsync(await GivenShowAsync(
            "Severance", "1", numberOfEpisodes: 19, episodeRuntimeMinutes: 47));
        await GivenLogEntryAsync(await GivenShowAsync(
            "Andor", "2", numberOfEpisodes: 24, episodeRuntimeMinutes: 49));

        await GivenLogEntryAsync(await GivenAnimeAsync(
            "Sousou no Frieren", "1", episodeCount: 28, episodeRuntimeSeconds: 1440));
        await GivenLogEntryAsync(await GivenAnimeAsync(
            "Mushishi", "2", episodeCount: 26, episodeRuntimeSeconds: 1430));

        foreach (var hobby in new[] { "games", "movies", "tv", "anime" })
        {
            var column = await ColumnAsync(LogStatus.Backlog, hobby: hobby);

            column.Items.Count.ShouldBe(2, hobby);
            column.Items.ShouldAllBe(item => item.LengthHours != null, hobby);
            column.Hours.Length.ShouldBe(column.Items.Sum(item => item.LengthHours!.Value), hobby);
            column.Hours.LengthTitles.ShouldBe(2, hobby);
        }
    }

    // ----------------------------------------------------------------- helpers

    /// <summary>
    /// A game with HowLongToBeat's All Styles figure already on it, and a pass of yours through the
    /// API — so the pass is written exactly as the app writes one.
    /// </summary>
    private async Task<int> GivenGameInAsync(
        string title,
        string externalId,
        LogStatus status,
        decimal? estimate,
        decimal? hoursPlayed = null,
        DateTimeOffset? completedAt = null)
    {
        var mediaId = await GivenGameWithEstimateAsync(title, externalId, estimate);
        await PostPassAsync(Client, mediaId, status, hoursPlayed, completedAt);
        return mediaId;
    }

    private async Task<int> GivenGameWithEstimateAsync(
        string title, string externalId, decimal? estimate)
    {
        var mediaId = await GivenGameAsync(title, externalId);

        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            game.HltbAllStylesHours = estimate;
            await db.SaveChangesAsync(Ct);
        });

        return mediaId;
    }

    private async Task PostPassAsync(
        HttpClient client,
        int mediaId,
        LogStatus status,
        decimal? hoursPlayed = null,
        DateTimeOffset? completedAt = null)
    {
        var response = await client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, status, null, null, null, completedAt, hoursPlayed),
            Json,
            Ct);

        response.EnsureSuccessStatusCode();
    }

    /// <summary>
    /// Announces a day it comes out on, after the clock's today, so the title is on the calendar
    /// rather than in the column. Built through <see cref="ReleaseWindow.For"/>, as
    /// ComingSoonTests builds its windows, so the check constraint is never in question.
    /// </summary>
    private Task GivenReleaseDayAsync(int mediaId, DateOnly day) => WithDbAsync(async db =>
    {
        var window = ReleaseWindow.For(day, ReleasePrecision.Day);

        var media = await db.Media.SingleAsync(candidate => candidate.Id == mediaId, Ct);
        media.ReleaseDate = window.Start;
        media.ReleaseEnd = window.End;
        media.ReleasePrecision = window.Precision;

        await db.SaveChangesAsync(Ct);
    });

    private async Task<LibraryPage> ColumnAsync(
        LogStatus status, string hobby = "games", int? year = null, int? pageSize = null)
    {
        var url = $"/api/library?hobby={hobby}&status={status}";
        if (year is { } wanted) url += $"&year={wanted}";
        if (pageSize is { } size) url += $"&pageSize={size}";

        return await ReadAsync<LibraryPage>(await Client.GetAsync(url, Ct));
    }
}
